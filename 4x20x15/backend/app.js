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

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // À changer en production pour autoriser seulement votre domaine
    methods: ["GET", "POST"],
  },
});

const PORT = 3001;
const ROOM_LIFETIME = 1000 * 60 * 90; // Durée de vie d'une room en millisecondes (1h30)

// Middleware pour parser le JSON
app.use(express.json());

// Liste des rooms actives (en mémoire pour éviter les lectures répétées dans Firestore)
let activeRooms = {};

// Génère un ID de room aléatoire de 5 caractères (A-Z)
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

  //? ENREGISTRER UN UTILISATEUR
  socket.on("registerUser", (userId) => {
    socket.userId = userId; // Associe l'ID utilisateur à la socket
    console.log(`Socket ${socket.id} associé à l'utilisateur ${userId}`);
    console.log(
      "Liste des sockets après enregistrement :",
      Array.from(io.sockets.sockets.values()).map((s) => ({
        id: s.id,
        userId: s.userId,
      }))
    );
  });


  //? CRÉER UNE ROOM ET LA REJOINDRE
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


  //? REJOINDRE UNE ROOM
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
      const isAlreadyInRoom = room.players.some(
        (player) => player.id === userId
      );
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
      socket.emit("error", {
        message: "Erreur lors de la jonction de la room",
      });
    }
  });


  //? GESTION DES DÉCONNEXIONS UTILISATEURS
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


  //? SUPPRIMER UN JOUEUR DE LA ROOM SI LA PARTIE N'A PAS COMMENCÉ
  socket.on("removePlayer", async ({ roomId, playerId }) => {
    try {
      const room = activeRooms[roomId];
  
      if (!room) {
        socket.emit("error", { message: "Room introuvable" });
        return;
      }
  
      if (room.status === "playing") {
        console.log(`Tentative de suppression refusée : Room ${roomId} en cours de jeu`);
        return;
      }
  
      // Supprimer le joueur de la room
      room.players = room.players.filter((player) => player.id !== playerId);
  
      // Mettre à jour Firestore
      const roomDoc = doc(db, "rooms", roomId);
      await updateDoc(roomDoc, { players: room.players });
  
      // Notifier uniquement le joueur supprimé
      const targetSocket = Array.from(io.sockets.sockets.values()).find((s) => s.userId === playerId);
      if (targetSocket) {
        targetSocket.emit("removedFromRoom", { playerId });
        console.log(`Émission de removedFromRoom pour le joueur supprimé : ${playerId}`);
      } else {
        console.warn(`Socket introuvable pour le joueur : ${playerId}`);
      }
  
      // Notifier tous les autres joueurs de la room
      io.to(roomId).emit("roomUpdated", room);
  
      console.log(`Utilisateur ${playerId} supprimé de la room ${roomId}`);
    } catch (error) {
      console.error("Erreur lors de la suppression du joueur :", error.message);
      socket.emit("error", { message: "Erreur lors de la suppression du joueur" });
    }
  });
  
  
  //? Commencer une partie
  socket.on("startGame", async ({ roomId }) => {
    const room = activeRooms[roomId];
    if (!room) {
      socket.emit("error", { message: "Room introuvable" });
      return;
    }

    // Check if there are enough players to start the game
    if (room.players.length < 2) {
      socket.emit("error", { message: "Pas assez de joueurs pour commencer la partie." });
      return;
    }

    // Créer un nouveau deck mélangé
    const deck = shuffleDeck(generateDeck());

    // Distribuer les cartes aux joueurs
    const playerCards = {};
    const playersInfo = {};
    room.players.forEach(player => {
      playerCards[player.id] = drawCards(deck, 3); // Give each player 3 cards
      playersInfo[player.id] = {
        username: player.username,
        avatar: player.avatar,
        penalties: 10
        // isCurrentPlayer: false,
        // cards: drawCards(deck, 3)
      };
    });


    // Placer une carte sur la table (deplacer la première carte du deck dans les playedCards)
    const firstCard = deck.shift();
    const playedCards = [firstCard];

    // Initialiser l'index du joueur actuel (le premier joueur de la room)
    const currentPlayerId = room.players[0].id;


    const game = {
      roomId,
      deck,
      playedCards: playedCards,
      currentPlayerId: currentPlayerId,
      playerCards: playerCards,
      players: playersInfo
    };

    await setDoc(doc(collection(db, "games"), roomId), game);
    io.to(roomId).emit("gameStarted", game); // Emit the whole game object

    // Optionally, emit playerCards individually to each player
    room.players.forEach(player => {
      socket.to(player.id).emit("playerCards", playerCards[player.id]);
    });

  });




  //? REJOINDRE UNE PARTIE
  socket.on("joinGame", async ({ roomId, userId }) => {
    const gameRef = doc(db, "games", roomId);
    const gameSnapshot = await getDoc(gameRef);

    if (!gameSnapshot.exists()) {
      socket.emit("error", { message: "Partie introuvable" });
      return;
    }

    const game = gameSnapshot.data();
    socket.join(roomId);

    // Send the complete game state to the joining player
    socket.emit("gameStarted", game);

    // Optionally, send playerCards individually to the joining player
    socket.emit("playerCards", game.playerCards[userId]);
  });


  const drawCards = (deck, count) => {
    const cards = deck.splice(0, count);
    return cards;
  };



  //? Jouer une carte
  socket.on("playCard", async ({ roomId, userId, card }) => {
    // ECRIRE LE CODE ICI POUR JOUER UNE CARTE
  });

  const generateDeck = () => {
    const suits = ["♠", "♥", "♦", "♣"];
    const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    return suits.flatMap((suit) => values.map((value) => ({ suit, value })));
  };

  const shuffleDeck = (deck) => deck.sort(() => Math.random() - 0.5);

  const calculateTotal = (playedCards, card) => {
    const total = playedCards.reduce((sum, c) => sum + parseInt(c.value || 10), 0);
    return total + parseInt(card.value || 10);
  };



});

// Lancement du serveur
server.listen(PORT, () =>
  console.log(`Serveur lancé sur http://localhost:${PORT}`)
);
