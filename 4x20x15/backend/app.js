import express from "express";
import http from "http";
import { Server } from "socket.io";
import {
  db,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  deleteDoc,
  collection,
} from "../src/firebaseConfig.js";

const ROOM_LIFETIME = 1000 * 60 * 90; // Durée de vie d'une room en millisecondes (1h30)

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // À changer en production pour autoriser seulement votre domaine
    methods: ["GET", "POST"],
  },
});

const PORT = 3001;

// Middleware pour parser le JSON
app.use(express.json());

// Liste des rooms actives (en mémoire pour éviter les lectures répétées dans Firestore)
let activeRooms = {};

// Fonction pour générer un ID de room de 5 caractères
const generateRoomId = () => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return Array(5)
    .fill("")
    .map(() => characters.charAt(Math.floor(Math.random() * characters.length)))
    .join("");
};

// Gestion des connexions Socket.IO
io.on("connection", (socket) => {
  console.log(`Utilisateur connecté : ${socket.id}`);

    // Associe l'utilisateur à sa socket
    socket.on("registerUser", (userId) => {
      socket.userId = userId; // Associe l'ID utilisateur à la socket
      console.log(`Socket ${socket.id} associé à l'utilisateur ${userId}`);
      console.log("Liste des sockets après enregistrement :", Array.from(io.sockets.sockets.values()).map(s => ({ id: s.id, userId: s.userId })));
    });
  
    socket.on("disconnect", async () => {
      const userId = socket.userId;
    
      if (!userId) {
        console.log(`Utilisateur déconnecté : ${socket.id} (sans userId)`);
        return;
      }
    
      // Trouve la room dans laquelle le joueur se trouve
      const roomId = Object.keys(activeRooms).find((id) =>
        activeRooms[id].players.some((player) => player.id === userId)
      );
    
      if (roomId) {
        const room = activeRooms[roomId];
    
        // Vérifie si la partie est en cours
        if (room.status === "playing") {
          console.log(
            `Déconnexion de l'utilisateur ${userId} ignorée : Room ${roomId} en cours de jeu`
          );
          return;
        }
    
        // Supprime le joueur de la liste
        room.players = room.players.filter((player) => player.id !== userId);
    
        // Met à jour Firestore
        const roomDoc = doc(db, "rooms", roomId);
        await updateDoc(roomDoc, { players: room.players });
    
        // Met à jour la room en mémoire
        activeRooms[roomId] = room;
    
        // Notifie tous les joueurs de la mise à jour
        io.to(roomId).emit("roomUpdated", room);
    
        console.log(`Utilisateur ${userId} supprimé de la room ${roomId}`);
      }
    });
    
    
    socket.on("startGame", async ({ roomId }) => {
      try {
        const room = activeRooms[roomId];
    
        if (!room) {
          socket.emit("error", { message: "Room introuvable" });
          return;
        }
    
        // Vérifie que seul l'hôte peut démarrer la partie
        if (room.hostId !== socket.userId) {
          socket.emit("error", { message: "Seul l'hôte peut démarrer la partie." });
          return;
        }
    
        // Met à jour le statut de la room en mémoire
        room.status = "playing";
    
        // Met à jour uniquement le statut dans Firestore
        const roomDoc = doc(db, "rooms", roomId);
        await updateDoc(roomDoc, { status: "playing" });
    
        // Notifie tous les joueurs que la partie commence
        io.to(roomId).emit("gameStarted", { roomId });
    
        console.log(`Partie démarrée pour la room : ${roomId}`);
      } catch (error) {
        console.error("Erreur lors du démarrage de la partie :", error.message);
        socket.emit("error", { message: "Erreur lors du démarrage de la partie" });
      }
    });
    
    

    
    
    

  /**
   * Création d'une room
   */
  socket.on("createRoom", async ({ hostId }) => {
    try {
      // Récupère les informations de l'utilisateur depuis Firestore
      const userDoc = doc(db, "users", hostId);
      const userSnapshot = await getDoc(userDoc);

      if (!userSnapshot.exists()) {
        socket.emit("error", { message: "Utilisateur introuvable" });
        return;
      }

      const userData = userSnapshot.data();
      const roomId = generateRoomId();

      // Crée une nouvelle room
      const newRoom = {
        id: roomId,
        hostId,
        players: [
          {
            id: hostId,
            username: userData.username,
            avatar: userData.avatar,
          },
        ],
        settings: {
          maxPlayers: 6,
          specialRules: false,
        },
        status: "waiting",
      };

      // Sauvegarde la room dans Firestore
      const roomDoc = doc(collection(db, "rooms"), roomId);
      await setDoc(roomDoc, newRoom);

      // Ajoute la room à la liste des rooms actives
      activeRooms[roomId] = newRoom;

      // L'utilisateur rejoint la room Socket.IO
      socket.join(roomId);

      // Notifie l'utilisateur que la room a été créée
      socket.emit("roomCreated", { roomId });

      socket.emit("roomUpdated", newRoom);

      console.log(`Room créée : ${roomId}`);

      // Planifie la suppression de la room après un certain temps
      setTimeout(async () => {
        delete activeRooms[roomId]; // Supprimer de la mémoire
        await deleteDoc(roomDoc); // Supprimer de Firestore
        console.log(`Room supprimée : ${roomId}`);
      }, ROOM_LIFETIME);
    } catch (error) {
      console.error("Erreur lors de la création de la room :", error.message);
      socket.emit("error", {
        message: "Erreur lors de la création de la room",
      });
    }
  });

  /**
   * Rejoindre une room
   */
  socket.on("joinRoom", async ({ roomId, userId }) => {
    try {
      let room = activeRooms[roomId];
  
      // Si la room n'est pas en mémoire, la charger depuis Firestore
      if (!room) {
        const roomDoc = doc(db, "rooms", roomId);
        const roomSnapshot = await getDoc(roomDoc);
  
        if (!roomSnapshot.exists()) {
          socket.emit("error", { message: "Room introuvable" });
          return;
        }
  
        room = roomSnapshot.data();
        activeRooms[roomId] = room;
      }
  
      // Vérifie si l'utilisateur est déjà dans la room
      const isAlreadyInRoom = room.players.some((player) => player.id === userId);
      if (isAlreadyInRoom) {
        console.log(`Utilisateur ${userId} est déjà dans la room ${roomId}`);
        return;
      }
  
      // Récupère les informations de l'utilisateur depuis Firestore
      const userDoc = doc(db, "users", userId);
      const userSnapshot = await getDoc(userDoc);
  
      if (!userSnapshot.exists()) {
        socket.emit("error", { message: "Utilisateur introuvable" });
        return;
      }
  
      const userData = userSnapshot.data();
  
      // Ajoute le joueur à la room
      room.players.push({
        id: userId,
        username: userData.username,
        avatar: userData.avatar,
      });
  
      // Met à jour Firestore
      const roomDoc = doc(db, "rooms", roomId);
      await updateDoc(roomDoc, { players: room.players });
  
      // Met à jour la room en mémoire
      activeRooms[roomId] = room;
  
      // L'utilisateur rejoint la room Socket.IO
      socket.join(roomId);
  
      // Notifie tous les joueurs de la mise à jour
      io.to(roomId).emit("roomUpdated", room);
  
      console.log(`${userData.username} a rejoint la room ${roomId}`);
    } catch (error) {
      console.error("Erreur lors de la jonction de la room :", error.message);
      socket.emit("error", { message: "Erreur lors de la jonction de la room" });
    }
  });
  


  /**
   * Supprimer un joueur d'une room
   */
  socket.on("removePlayer", async ({ roomId, playerId }) => {
    try {
      const room = activeRooms[roomId];
  
      if (!room) {
        socket.emit("error", { message: "Room introuvable" });
        return;
      }
  
      // Empêche la suppression si la partie est déjà en cours
      if (room.status === "playing") {
        console.log(`Tentative de suppression refusée : Room ${roomId} en cours de jeu`);
        return;
      }
  
      // Supprime le joueur de la liste
      room.players = room.players.filter((player) => player.id !== playerId);
  
      // Met à jour Firestore
      const roomDoc = doc(db, "rooms", roomId);
      await updateDoc(roomDoc, { players: room.players });
  
      // Notifie tous les joueurs de la mise à jour
      io.to(roomId).emit("roomUpdated", room);
  
      console.log(`Utilisateur ${playerId} supprimé de la room ${roomId}`);
    } catch (error) {
      console.error("Erreur lors de la suppression du joueur :", error.message);
      socket.emit("error", { message: "Erreur lors de la suppression du joueur" });
    }
  });
  
  
});

// Lancement du serveur
server.listen(PORT, () =>
  console.log(`Serveur lancé sur http://localhost:${PORT}`)
);
