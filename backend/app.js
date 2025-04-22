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

//? Retourne la liste des joueurs d'une room dans le bonne ordre 
const getOrderedPlayerUsernames = async (roomId) => {
  const gameRef = doc(db, `games/${roomId}`);
  const gameSnapshot = await getDoc(gameRef);

  if (!gameSnapshot.exists()) {
    throw new Error("Game not found");
  }

  const game = gameSnapshot.data();
  const { turnQueue, players } = game;

  const orderedUsernames = turnQueue.map(pid => players[pid]?.username).filter(Boolean);
  
  // Put the last items at the first position
  const reorderedUsernames = orderedUsernames.slice(-1).concat(orderedUsernames.slice(0, -1));
  
  console.log(`Ordered usernames for room ${roomId}:`, reorderedUsernames);
  return reorderedUsernames;
};

// Gestion des connexions Socket.IO
io.on("connection", (socket) => {
  console.log(`Utilisateur connecté : ${socket.id}`);

  socket.on("getOrderedPlayerUsernames", async ({ roomId }) => {
    try {
      const orderedUsernames = await getOrderedPlayerUsernames(roomId);
      socket.emit("orderedPlayerUsernames", orderedUsernames);
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });

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
      if (!roomId || !userId) {
        socket.emit("error", { message: "Room ID ou User ID manquant" });
        return;
      }
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
      if (!roomId || !playerId) {
        socket.emit("error", { message: "Room ID ou Player ID manquant" });
        return;
      }
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
  try {
    if (!roomId) {
      socket.emit("error", { message: "Room ID manquant" });
      return;
    }
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
  
    // On mélange le deck
    const deck = shuffleDeck(generateDeck());
  
    // On construit l'objet "players" comme avant
    const players = {};
    room.players.forEach((player) => {
      players[player.id] = {
        username: player.username,
        avatar: player.avatar,
        penalties: 0,
        hasLost: false,
        hasWon: false,
        cards: drawCards(deck, 3),
      };
    });
  
    // On crée turnQueue avec tous les userIds, dans l'ordre
    // tel que room.players est stocké (ou on peut mélanger pour un ordre aléatoire)
    const turnQueue = room.players.map((p) => p.id);
  
    // La première carte
    const firstCard = deck.shift();
    const playedCards = [firstCard];
    const initialTotal = baseCardValue(firstCard);
  
    const game = {
      roomId,
      deck,
      playedCards,
      total: initialTotal,
      direction: 1,       // si vous voulez garder l'info du sens
      turnQueue,          // VOICI la file d'ordre
      players,
      gameOver: false,
    };
  
    await setDoc(doc(collection(db, "games"), roomId), game);
    io.to(roomId).emit("gameStarted", game);
  
    console.log(`Game started pour room ${roomId}`);
  } catch (error) {
    console.error("Erreur lors de la création de la partie :", error.message);
    socket.emit("error", { message: "Erreur lors de la création de la partie" });
  }
});








  //? REJOINDRE UNE PARTIE
  socket.on("joinGame", async ({ roomId, userId }) => {
    try {
      if (!roomId || !userId) {
        socket.emit("error", { message: "Room ID ou User ID manquant" });
        return;
      }
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
    } catch (error) {
      console.error("Erreur lors de la jonction de la partie :", error.message);
      socket.emit("error", { message: "Erreur lors de la jonction de la partie" });
    }
  });
  
  



  //? Jouer une carte
  socket.on("playCard", async ({ roomId, userId, card }) => {
    try {
      if (!roomId || !userId || !card) {
        socket.emit("error", { message: "Room ID, User ID ou carte manquant" });
        return;
      }
      const gameRef = doc(db, "games", roomId);
      const gameSnapshot = await getDoc(gameRef);
  
      if (!gameSnapshot.exists()) {
        socket.emit("error", { message: "Partie introuvable" });
        return;
      }
  
      const game = gameSnapshot.data();
  
      // Vérifier que le joueur existe
      if (!game.players[userId]) {
        socket.emit("error", { message: "Vous n'êtes pas dans cette partie." });
        return;
      }
  
      // Vérifier que la partie n'est pas finie
      if (game.gameOver) {
        socket.emit("error", { message: "La partie est terminée !" });
        return;
      }
  
      // Vérifier que c'est au tour de userId
      if (game.turnQueue[0] !== userId) {
        socket.emit("error", { message: "Ce n'est pas votre tour !" });
        return;
      }
  
      // Retrouver la carte
      const playerCards = game.players[userId].cards || [];
      const cardIndex = playerCards.findIndex(
        (c) => c.suit === card.suit && c.value === card.value
      );
      if (cardIndex === -1) {
        socket.emit("error", { message: "Carte introuvable dans votre main." });
        return;
      }
  
      // Retirer la carte et la poser
      const [played] = playerCards.splice(cardIndex, 1);
      game.playedCards.push(played);
  
      // Appliquer l'effet
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
          // On inverse la file
          if (game.turnQueue.length < 3) {
            // Si pas assez de joueurs, on ne fait rien
            break;
          }
          game.turnQueue.reverse();
          // On peut aussi inverser `game.direction` si on garde cette info
          // game.direction *= -1;
          break;
        default:
          // rien
          break;
      }
  
      // Piocher
      if (game.deck.length > 0) {
        const newCard = game.deck.shift();
        game.players[userId].cards.push(newCard);
      }
  
      // Vérifier alert
      const alertMsg = checkAlert(game.total, ALERT_THRESHOLDS);
      if (alertMsg) {
        io.to(roomId).emit("alertMessage", { message: alertMsg });
      }
  
      // Vérifier lose condition (≥ 95)
      if (game.total >= LOOSE_THRESHOLD) {
        // Le joueur qui a provoqué ça perd
        game.players[userId].hasLost = true;
        // On le retire de la file
        game.turnQueue = game.turnQueue.filter((id) => id !== userId);
  
        // Tous les autres gagnent => on peut marquer hasWon = true
        Object.keys(game.players).forEach((pid) => {
          if (pid !== userId) {
            game.players[pid].hasWon = true;
          }
        });
  
        // Fin de partie
        game.gameOver = true;
  
        io.to(roomId).emit("alertMessage", {
          type: "ended",
          message: `Le total est ${game.total} ! ${game.players[userId].username} a perdu, les autres ont gagné !`,
        });
  
        await setDoc(gameRef, game);
        io.to(roomId).emit("gameUpdated", game);
        return;
      }
  
      // ***********
      // PAS DE PERTE => on continue
      // ***********
  
      // On défile le premier joueur, et on le remet en fin de file
      
      const current = game.turnQueue.shift(); // c'est userId
      game.turnQueue.push(current);
  
      // S'il ne reste qu'un joueur dans la file, on peut aussi gérer un
      // cas de "fin de partie" différent, etc.
  
      // Sauvegarder
      await setDoc(gameRef, game);
      io.to(roomId).emit("gameUpdated", game);
  
    } catch (err) {
      console.error("Erreur lors du playCard:", err);
      socket.emit("error", { message: "Erreur lors du playCard." });
    }
  });
  
  // AUTOROUTE
  socket.on("startAutoroute", async ({ roomId, userId }) => {
    try {
      const gameRef = doc(db, "games", roomId);
      const gameSnapshot = await getDoc(gameRef);
      
      if (!gameSnapshot.exists()) {
        socket.emit("error", { message: "Partie introuvable" });
        return;
      }
      
      const game = gameSnapshot.data();
      
      // Vérifier que le joueur a perdu (normalement celui qui démarre l'autoroute)
      if (!game.players[userId].hasLost) {
        socket.emit("error", { message: "Seul le perdant peut démarrer l'autoroute" });
        return;
      }
      
      // Initialiser l'autoroute
      if (!game.deck || game.deck.length < 5) {
        socket.emit("error", { message: "Pas assez de cartes pour l'autoroute" });
        return;
      }
      
      // Tirer 5 cartes pour la rivière
      const river = game.deck.splice(0, 5);
      
      // Initialiser l'état de l'autoroute
      game.autoroute = {
        inProgress: true,
        aceValue: null, // Sera défini par le joueur
        river: river,
        currentPosition: null, // Sera défini après le choix de direction
        direction: null, // "leftToRight" ou "rightToLeft"
        guesses: [],
        currentPlayerId: userId
      };
      
      // Sauvegarder l'état
      await setDoc(gameRef, game);
      
      // Notifier tous les joueurs
      io.to(roomId).emit("autorouteStarted", {
        river: river,
        playerId: userId
      });
      
    } catch (error) {
      console.error("Erreur lors du démarrage de l'autoroute:", error);
      socket.emit("error", { message: "Erreur lors du démarrage de l'autoroute" });
    }
  });
  
  socket.on("chooseAceValue", async ({ roomId, userId, aceValue }) => {
    try {
      if (aceValue !== 1 && aceValue !== 14) {
        socket.emit("error", { message: "La valeur de l'As doit être 1 ou 14" });
        return;
      }
      
      const gameRef = doc(db, "games", roomId);
      const gameSnapshot = await getDoc(gameRef);
      
      if (!gameSnapshot.exists()) {
        socket.emit("error", { message: "Partie introuvable" });
        return;
      }
      
      const game = gameSnapshot.data();
      
      // Vérifier que l'autoroute est en cours
      if (!game.autoroute || !game.autoroute.inProgress) {
        socket.emit("error", { message: "Aucune autoroute en cours" });
        return;
      }
      
      // Vérifier que c'est bien le même joueur
      if (game.autoroute.currentPlayerId !== userId) {
        socket.emit("error", { message: "Ce n'est pas à vous de choisir" });
        return;
      }
      
      // Mettre à jour la valeur de l'As
      game.autoroute.aceValue = aceValue;
      
      // Sauvegarder
      await setDoc(gameRef, game);
      
      // Notifier tous les joueurs
      io.to(roomId).emit("aceValueChosen", {
        aceValue: aceValue,
        playerId: userId
      });
      
    } catch (error) {
      console.error("Erreur lors du choix de la valeur de l'As:", error);
      socket.emit("error", { message: "Erreur lors du choix de la valeur de l'As" });
    }
  });
  
  socket.on("chooseDirection", async ({ roomId, userId, direction }) => {
    try {
      if (direction !== "leftToRight" && direction !== "rightToLeft") {
        socket.emit("error", { message: "Direction invalide" });
        return;
      }
      
      const gameRef = doc(db, "games", roomId);
      const gameSnapshot = await getDoc(gameRef);
      
      if (!gameSnapshot.exists()) {
        socket.emit("error", { message: "Partie introuvable" });
        return;
      }
      
      const game = gameSnapshot.data();
      
      // Vérifier que l'autoroute est en cours et que l'As a été choisi
      if (!game.autoroute || !game.autoroute.inProgress || game.autoroute.aceValue === null) {
        socket.emit("error", { message: "Autoroute non initialisée correctement" });
        return;
      }
      
      // Vérifier que c'est bien le même joueur
      if (game.autoroute.currentPlayerId !== userId) {
        socket.emit("error", { message: "Ce n'est pas à vous de choisir" });
        return;
      }
      
      // Mettre à jour la direction et la position de départ
      game.autoroute.direction = direction;
      game.autoroute.currentPosition = direction === "leftToRight" ? 0 : 4;
      
      // Sauvegarder
      await setDoc(gameRef, game);
      
      // Notifier tous les joueurs
      io.to(roomId).emit("directionChosen", {
        direction: direction,
        currentPosition: game.autoroute.currentPosition,
        playerId: userId
      });
      
    } catch (error) {
      console.error("Erreur lors du choix de la direction:", error);
      socket.emit("error", { message: "Erreur lors du choix de la direction" });
    }
  });
  
  socket.on("guessHigherLower", async ({ roomId, userId, guess }) => {
    try {
      if (guess !== "higher" && guess !== "lower") {
        socket.emit("error", { message: "Choix invalide" });
        return;
      }
      
      const gameRef = doc(db, "games", roomId);
      const gameSnapshot = await getDoc(gameRef);
      
      if (!gameSnapshot.exists()) {
        socket.emit("error", { message: "Partie introuvable" });
        return;
      }
      
      const game = gameSnapshot.data();
      
      // Vérifier que l'autoroute est bien configurée
      if (!game.autoroute || !game.autoroute.inProgress || 
          game.autoroute.aceValue === null || game.autoroute.direction === null) {
        socket.emit("error", { message: "Autoroute non initialisée correctement" });
        return;
      }
      
      // Vérifier que c'est bien le même joueur
      if (game.autoroute.currentPlayerId !== userId) {
        socket.emit("error", { message: "Ce n'est pas à vous de jouer" });
        return;
      }
      
      // Tirer une carte du deck
      if (!game.deck || game.deck.length === 0) {
        socket.emit("error", { message: "Plus de cartes dans le deck" });
        return;
      }
      
      const drawnCard = game.deck.shift();
      const riverCard = game.autoroute.river[game.autoroute.currentPosition];
      
      // Comparer les valeurs (en tenant compte de la valeur de l'As)
      const riverCardValue = getCardNumericValue(riverCard, game.autoroute.aceValue);
      const drawnCardValue = getCardNumericValue(drawnCard, game.autoroute.aceValue);
      
      // Déterminer si la prédiction est correcte
      let correct = false;
      if (drawnCardValue === riverCardValue) {
        // Égalité: continue et tout le monde boit
        correct = true;
        io.to(roomId).emit("everyoneDrinks", {
          message: "Les cartes sont égales! Tout le monde boit sauf " + game.players[userId].username
        });
      } else if (guess === "higher" && drawnCardValue > riverCardValue) {
        correct = true;
      } else if (guess === "lower" && drawnCardValue < riverCardValue) {
        correct = true;
      }
      
      // Stocker l'historique du tour
      game.autoroute.guesses.push({
        position: game.autoroute.currentPosition,
        riverCard: riverCard,
        drawnCard: drawnCard,
        guess: guess,
        correct: correct
      });
      
      // Si prédiction correcte, remplacer la carte de la rivière par la carte tirée
      if (correct) {
        // IMPORTANT: Remplacer la carte dans la rivière par celle qui a été tirée

        // Mettre à jour la position
        if (game.autoroute.direction === "leftToRight") {
          game.autoroute.currentPosition++;
        } else {
          game.autoroute.currentPosition--;
        }
        
        // Vérifier si l'autoroute est terminée
        const finished = game.autoroute.direction === "leftToRight" 
          ? game.autoroute.currentPosition >= 5 
          : game.autoroute.currentPosition < 0;
          
        if (finished) {
          game.autoroute.inProgress = false;
          io.to(roomId).emit("autorouteCompleted", {
            message: game.players[userId].username + " a réussi l'autoroute!",
            guesses: game.autoroute.guesses
          });
        } else {
          io.to(roomId).emit("guessResult", {
            correct: true,
            drawnCard: drawnCard,
            nextPosition: game.autoroute.currentPosition,
            playerId: userId,
            guessHistory: game.autoroute.guesses,
            updatedRiver: game.autoroute.river  // Send the updated river array
          });
        }
      } else {
        // Pas correct, on recommence du début
        if (game.autoroute.direction === "leftToRight") {
          game.autoroute.currentPosition = 0;
        } else {
          game.autoroute.currentPosition = 4;
        }
        
        io.to(roomId).emit("guessResult", {
          correct: false,
          drawnCard: drawnCard,
          nextPosition: game.autoroute.currentPosition,
          playerId: userId,
          message: game.players[userId].username + " s'est trompé et doit boire!",
          guessHistory: game.autoroute.guesses,
          updatedRiver: game.autoroute.river  // Also send river here for consistency
        });
      }
      
      // Sauvegarder
      await setDoc(gameRef, game);
      
    } catch (error) {
      console.error("Erreur lors de la prédiction:", error);
      socket.emit("error", { message: "Erreur lors de la prédiction" });
    }
  });

  // Add a new socket event to draw a card from the deck
  socket.on("drawCard", async ({ roomId, userId }) => {
    try {
      const gameRef = doc(db, "games", roomId);
      const gameSnapshot = await getDoc(gameRef);
      
      if (!gameSnapshot.exists()) {
        socket.emit("error", { message: "Partie introuvable" });
        return;
      }
      
      const game = gameSnapshot.data();
      
      // Verify autoroute is in progress
      if (!game.autoroute || !game.autoroute.inProgress) {
        socket.emit("error", { message: "Aucune autoroute en cours" });
        return;
      }
      
      // Verify it's this player's turn
      if (game.autoroute.currentPlayerId !== userId) {
        socket.emit("error", { message: "Ce n'est pas à vous de jouer" });
        return;
      }
      
      // Draw a card (don't remove it from the deck yet - that happens with guessHigherLower)
      if (!game.deck || game.deck.length === 0) {
        socket.emit("error", { message: "Plus de cartes dans le deck" });
        return;
      }
      
      // Send only to the requesting player
      socket.emit("cardDrawn", { 
        card: game.deck[0] // Send first card in deck but don't remove it yet
      });
      
    } catch (error) {
      console.error("Erreur lors du tirage de carte:", error);
      socket.emit("error", { message: "Erreur lors du tirage de carte" });
    }
  });

  // Add a new socket event to handle restarting the autoroute
  socket.on("restartAutoroute", async ({ roomId, userId }) => {
    try {
      const gameRef = doc(db, "games", roomId);
      const gameSnapshot = await getDoc(gameRef);
      
      if (!gameSnapshot.exists()) {
        socket.emit("error", { message: "Partie introuvable" });
        return;
      }
      
      const game = gameSnapshot.data();
      
      // Verify autoroute is in progress
      if (!game.autoroute || !game.autoroute.inProgress) {
        socket.emit("error", { message: "Aucune autoroute en cours" });
        return;
      }
      
      // Verify it's this player's turn
      if (game.autoroute.currentPlayerId !== userId) {
        socket.emit("error", { message: "Ce n'est pas à vous de jouer" });
        return;
      }

      for (let i = 0; i < game.autoroute.guesses.length; i++) {
        game.autoroute.river[game.autoroute.guesses[i].position] = game.autoroute.guesses[i].drawnCard;
      }
      
      // Clear guess history but keep the river state
      game.autoroute.guesses = [];
      
      // Reset position based on direction
      game.autoroute.currentPosition = game.autoroute.direction === "leftToRight" ? 0 : 4;
      
      // Save the updated game state
      await setDoc(gameRef, game);
      
      // Send the updated state to all clients
      io.to(roomId).emit("autorouteRestarted", {
        nextPosition: game.autoroute.currentPosition,
        updatedRiver: game.autoroute.river
      });
      
    } catch (error) {
      console.error("Erreur lors du redémarrage de l'autoroute:", error);
      socket.emit("error", { message: "Erreur lors du redémarrage de l'autoroute" });
    }
  });

  // Fonction utilitaire pour obtenir la valeur numérique d'une carte
  function getCardNumericValue(card, aceValue) {
    switch (card.value) {
      case "A":
        return aceValue; // 1 ou 14 selon le choix du joueur
      case "J":
        return 11;
      case "Q":
        return 12;
      case "K":
        return 13;
      default:
        return parseInt(card.value, 10);
    }
  }

  function drawCards(deck, count) {
    return deck.splice(0, count);
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
      return `Le total est maintenant à ${total}!`;
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
