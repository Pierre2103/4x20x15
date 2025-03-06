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

const ALERT_THRESHOLDS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const LOOSE_THRESHOLD = 95;              // À 95 ou plus, le joueur a perdu



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
  
  
//? CREER UNE PARTIE
socket.on("startGame", async ({ roomId }) => {
  const room = activeRooms[roomId];
  if (!room) {
    socket.emit("error", { message: "Room introuvable" });
    return;
  }

  if (room.players.length < 2) {
    socket.emit("error", {
      message: "Pas assez de joueurs pour commencer la partie.",
    });
    return;
  }

  const deck = shuffleDeck(generateDeck());

  const players = {};
  room.players.forEach((player, idx) => {
    players[player.id] = {
      username: player.username,
      avatar: player.avatar,
      penalties: 0,
      isPlaying: idx === 0, // Le premier de la liste commence
      hasLost: false,       // Personne n'a encore perdu
      cards: drawCards(deck, 3),
    };
  });

  // Première carte
  const firstCard = deck.shift();
  const playedCards = [firstCard];
  const initialTotal = baseCardValue(firstCard);

  const game = {
    roomId,
    deck,
    playedCards,
    total: initialTotal,
    direction: 1,  // sens normal
    players,
  };

  await setDoc(doc(collection(db, "games"), roomId), game);
  io.to(roomId).emit("gameStarted", game);

  console.log(`Game started pour room ${roomId}`);
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
  
    // S’il manque direction, on le met à 1 (si la partie a pas encore commencé)
    if (typeof game.direction !== "number") {
      game.direction = 1;
      await setDoc(gameRef, game);
    }
  
    socket.emit("gameStarted", game);
  });
  
  



  //? Jouer une carte
// La fonction socket.on("playCard", ...) réécrite :
socket.on("playCard", async ({ roomId, userId, card }) => {
  try {
    const gameRef = doc(db, "games", roomId);
    const gameSnapshot = await getDoc(gameRef);

    if (!gameSnapshot.exists()) {
      socket.emit("error", { message: "Partie introuvable" });
      return;
    }

    const game = gameSnapshot.data();

    // Vérifie que le joueur est bien dans la partie
    if (!game.players[userId]) {
      socket.emit("error", { message: "Vous n'êtes pas dans cette partie." });
      return;
    }

    // Vérifie que c'est bien son tour
    if (!game.players[userId].isPlaying) {
      socket.emit("error", { message: "Ce n'est pas votre tour !" });
      return;
    }

    // Retrouver la carte dans la main du joueur
    const playerCards = game.players[userId].cards;
    const cardIndex = playerCards.findIndex(
      (c) => c.suit === card.suit && c.value === card.value
    );
    if (cardIndex === -1) {
      socket.emit("error", { message: "Carte introuvable dans votre main." });
      return;
    }

    // Retirer la carte de la main et l'ajouter à playedCards
    const [played] = playerCards.splice(cardIndex, 1);
    game.playedCards.push(played);

    // Appliquer l'effet spécial
    const effect = parseCardValue(played);
    switch (effect.type) {
      case "ADD":
        game.total += effect.amount;
        break;
      case "MINUS":
        game.total -= effect.amount;
        break;
      case "SET":
        game.total = effect.amount;
        break;
      case "REVERSE":
        game.direction *= -1;
        break;
      default:
        // rien
        break;
    }

    // Piocher une carte si le deck n'est pas vide
    if (game.deck.length > 0) {
      const newCard = game.deck.shift();
      game.players[userId].cards.push(newCard);
    }

    // Vérifier l’alerte
    const alertMsg = checkAlert(game.total, ALERT_THRESHOLDS);
    if (alertMsg) {
      io.to(roomId).emit("alertMessage", { message: alertMsg });
    }

    // Vérifier la lose condition (≥ 95)
    if (game.total >= LOOSE_THRESHOLD) {
      // => Ce joueur perd, tous les autres gagnent, la partie s'arrête

      // Marquer ce joueur comme perdant
      game.players[userId].hasLost = true;
      game.players[userId].isPlaying = false;

      // Tous les autres joueurs "gagnent"
      Object.keys(game.players).forEach((pid) => {
        if (pid !== userId) {
          game.players[pid].hasWon = true;
          game.players[pid].isPlaying = false; 
        }
      });

      // Optionnel : on peut marquer le jeu comme terminé
      game.gameOver = true;

      // Émettre un message global
      io.to(roomId).emit("alertMessage", {
        message: `Le total est ${game.total} ! ${game.players[userId].username} a perdu, les autres joueurs ont gagné !`
      });

      // Sauvegarder et diffuser
      await setDoc(gameRef, game);
      io.to(roomId).emit("gameUpdated", game);
      return; // On s'arrête là
    }

    // ************
    // Si on n'a PAS atteint 95 => on continue normalement
    // ************

    // Passe la main au joueur suivant
    const userIds = Object.keys(game.players);
    const currentIndex = userIds.findIndex((id) => id === userId);
    game.players[userId].isPlaying = false;

    let nextIndex = currentIndex + game.direction;
    if (nextIndex < 0) {
      nextIndex = userIds.length - 1;
    } else if (nextIndex >= userIds.length) {
      nextIndex = 0;
    }

    // Sauter ceux qui ont perdu ou gagné (hasLost / hasWon)
    let nextPlayerId = userIds[nextIndex];
    while (game.players[nextPlayerId].hasLost || game.players[nextPlayerId].hasWon) {
      nextIndex += game.direction;
      if (nextIndex < 0) {
        nextIndex = userIds.length - 1;
      } else if (nextIndex >= userIds.length) {
        nextIndex = 0;
      }
      nextPlayerId = userIds[nextIndex];
    }

    // On donne la main
    game.players[nextPlayerId].isPlaying = true;

    // Sauvegarde finale
    await setDoc(gameRef, game);
    io.to(roomId).emit("gameUpdated", game);

  } catch (err) {
    console.error("Erreur lors du playCard:", err);
    socket.emit("error", { message: "Erreur lors du playCard." });
  }
});
  
  

  function drawCards(deck, count) {
    return deck.splice(0, count
    );
  }
  

  function baseCardValue(card) {
    // Utilisé pour la toute première carte sur la table (pas d'effet spécial)
    switch (card.value) {
      case "A":
        return 1;
      case "J":
      case "Q":
      case "K":
        return 10;
      default:
        return parseInt(card.value, 10);
    }
  }
  
  function parseCardValue(card) {
    // Retourne un objet décrivant l'effet à appliquer
    switch (card.value) {
      case "A":
        // A = +1
        return { type: "ADD", amount: 1 };
  
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
      case "7":
      case "8":
      case "9":
      case "10":
        return { type: "ADD", amount: parseInt(card.value, 10) };
  
      case "J":
        // Change le sens du jeu
        return { type: "REVERSE" };
  
      case "Q":
        // Fais -10 au total
        return { type: "MINUS", amount: 10 };
  
      case "K":
        // Met le total à 70
        return { type: "SET", amount: 70 };
  
      default:
        // Sécurité
        return { type: "ADD", amount: 0 };
    }
  }

  function checkAlert(total, thresholds) {
    // Vérifie si le total fait partie de la liste
    if (thresholds.includes(total)) {
      return `Alerte: le total est maintenant à ${total}!`;
    }
    return null;
  }
  
  

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
