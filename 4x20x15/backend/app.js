import express from "express";
import http from "http";
import { Server } from "socket.io";
import { db, doc, setDoc, updateDoc, collection } from "../src/firebaseConfig.js";
import { v4 as uuidv4 } from "uuid";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // À remplacer par votre domaine en production
    methods: ["GET", "POST"],
  },
});

const PORT = 3001;

// Middleware pour parser le JSON
app.use(express.json());

// Cache des rooms actives (pour limiter les requêtes Firestore)
let activeRooms = {};

// Gestion des connexions Socket.IO
io.on("connection", (socket) => {
  console.log(`Utilisateur connecté : ${socket.id}`);

  /**
   * Création d'une room
   */
  socket.on("createRoom", async ({ hostId, hostUsername, hostAvatar }) => {
    try {
      const roomId = uuidv4();
      const newRoom = {
        id: roomId,
        hostId,
        players: [
          {
            id: hostId,
            username: hostUsername,
            avatar: hostAvatar,
          },
        ],
        settings: {
          maxPlayers: 6,
          specialRules: false,
        },
        status: "waiting", // Status initial
      };

      // Sauvegarde dans Firestore
      const roomDoc = doc(collection(db, "rooms"), roomId);
      await setDoc(roomDoc, newRoom);

      // Ajoute la room aux rooms actives
      activeRooms[roomId] = newRoom;

      // Ajoute l'utilisateur à la room Socket.IO
      socket.join(roomId);

      // Notifie l'utilisateur que la room a été créée
      socket.emit("roomCreated", { roomId });
      console.log(`Room créée : ${roomId}`);
    } catch (error) {
      console.error("Erreur lors de la création de la room :", error.message);
      socket.emit("error", { message: "Erreur lors de la création de la room." });
    }
  });

  /**
   * Rejoindre une room
   */
  socket.on("joinRoom", async ({ roomId, userId, username, avatar }) => {
    try {
      let room = activeRooms[roomId];

      if (!room) {
        // Charger la room depuis Firestore si elle n'est pas en cache
        const roomDoc = doc(db, "rooms", roomId);
        const roomSnapshot = await getDoc(roomDoc);

        if (!roomSnapshot.exists()) {
          socket.emit("error", { message: "Room introuvable" });
          return;
        }

        room = roomSnapshot.data();
        activeRooms[roomId] = room;
      }

      // Vérifie si la room est pleine
      if (room.players.length >= room.settings.maxPlayers) {
        socket.emit("error", { message: "La room est pleine." });
        return;
      }

      // Ajoute le joueur à la room
      const newPlayer = { id: userId, username, avatar };
      room.players.push(newPlayer);

      // Met à jour Firestore
      const roomDoc = doc(db, "rooms", roomId);
      await updateDoc(roomDoc, { players: room.players });

      // Met à jour la room dans le cache
      activeRooms[roomId] = room;

      // Rejoindre la room via Socket.IO
      socket.join(roomId);

      // Notifie tous les joueurs de la mise à jour
      io.to(roomId).emit("roomUpdated", room);

      console.log(`${username} a rejoint la room ${roomId}`);
    } catch (error) {
      console.error("Erreur lors de la jonction de la room :", error.message);
      socket.emit("error", { message: "Erreur lors de la jonction de la room." });
    }
  });

  /**
   * Déconnexion d'un utilisateur
   */
  socket.on("disconnect", () => {
    console.log(`Utilisateur déconnecté : ${socket.id}`);
    // Logique de déconnexion si nécessaire (par ex. nettoyage du cache)
  });
});

server.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
