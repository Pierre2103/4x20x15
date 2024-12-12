const { createDeck, shuffleDeck, dealCards, calculateNewTotal, getNextPlayerWithCards } = require("./utils");

/**
 * Handles Socket.IO events for the game.
 * @param {object} socket - The current player's socket connection
 * @param {object} io - The Socket.IO server instance
 */
function socketHandlers(socket, io) {
    const rooms = {}; // In-memory room storage

    // Set player pseudo
    socket.on("setPseudo", (pseudo) => {
        const isPseudoTaken = Object.values(rooms).some((room) =>
            Object.values(room.players).some((player) => player.pseudo === pseudo)
        );

        if (isPseudoTaken) {
            socket.emit("pseudoError", "This pseudo is already taken. Please choose another one.");
            return;
        }

        socket.pseudo = pseudo || "Anonymous";
        socket.emit("pseudoSuccess", pseudo);
    });

    // Create a new lobby
    socket.on("createLobby", () => {
        const roomKey = Math.random().toString(36).substr(2, 6).toUpperCase();
        rooms[roomKey] = {
            players: {},
            turnOrder: [],
            currentTurn: 0,
            total: 0,
            gameActive: false,
            host: socket.id,
        };

        rooms[roomKey].players[socket.id] = {
            pseudo: socket.pseudo || "Host",
            hand: [],
        };
        rooms[roomKey].turnOrder.push(socket.id);

        socket.roomKey = roomKey;
        socket.join(roomKey);

        socket.emit("lobbyCreated", { roomKey, host: socket.id });
        io.to(roomKey).emit("playerJoined", rooms[roomKey].players);
    });

    // Join an existing lobby
    socket.on("joinLobby", (roomKey) => {
        const room = rooms[roomKey];

        if (!room) {
            socket.emit("error", "Lobby does not exist.");
            return;
        }

        const isPseudoTaken = Object.values(room.players).some((player) => player.pseudo === socket.pseudo);

        if (isPseudoTaken) {
            socket.emit("pseudoError", "This pseudo is already used in the lobby. Please choose another one.");
            return;
        }

        room.players[socket.id] = {
            pseudo: socket.pseudo || "Anonymous",
            hand: [],
        };
        room.turnOrder.push(socket.id);

        socket.roomKey = roomKey;
        socket.join(roomKey);

        socket.emit("joinSuccess", { players: room.players, host: room.host });
        io.to(roomKey).emit("playerJoined", room.players);
    });

    // Start the game
    socket.on("startGame", () => {
        const roomKey = socket.roomKey;
        const room = rooms[roomKey];

        if (!room || room.host !== socket.id || room.gameActive) {
            socket.emit("error", "Unable to start game.");
            return;
        }

        const deck = createDeck();
        shuffleDeck(deck);
        room.deck = deck;

        for (const playerId in room.players) {
            room.players[playerId].hand = dealCards(deck, 3);
        }

        room.gameActive = true;
        io.to(roomKey).emit("gameStarted", room.players);
        updateTurn(roomKey);
    });

    // Handle playing a card
    socket.on("playCard", (card) => {
        const roomKey = socket.roomKey;
        const room = rooms[roomKey];

        if (!room || room.turnOrder[room.currentTurn] !== socket.id) {
            socket.emit("error", "It's not your turn!");
            return;
        }

        const player = room.players[socket.id];
        const cardIndex = player.hand.findIndex(
            (c) => c.suit === card.suit && c.value === card.value
        );

        if (cardIndex === -1) {
            socket.emit("error", "You do not have this card.");
            return;
        }

        player.hand.splice(cardIndex, 1);
        const isDeckEmpty = room.deck.length === 0;
        const newTotal = calculateNewTotal(room.total, card, isDeckEmpty);

        if (newTotal > 99) {
            io.to(roomKey).emit("gameOver", { loser: player.pseudo });
            room.gameActive = false;
            return;
        }

        room.total = newTotal;
        io.to(roomKey).emit("cardPlayed", { player: player.pseudo, card, total: room.total });

        const nextTurn = getNextPlayerWithCards(room);
        if (nextTurn === -1) {
            io.to(roomKey).emit("gameOver", { loser: "No one!" });
            room.gameActive = false;
            return;
        }

        room.currentTurn = nextTurn;
        updateTurn(roomKey);
    });

    // Handle disconnection
    socket.on("disconnect", () => {
        const roomKey = socket.roomKey;
        if (roomKey && rooms[roomKey]) {
            const room = rooms[roomKey];
            delete room.players[socket.id];
            room.turnOrder = room.turnOrder.filter((id) => id !== socket.id);

            if (Object.keys(room.players).length === 0) {
                delete rooms[roomKey];
            } else {
                io.to(roomKey).emit("playerJoined", room.players);
            }
        }
    });

    function updateTurn(roomKey) {
        const room = rooms[roomKey];
        const currentPlayerId = room.turnOrder[room.currentTurn];
        const currentPlayer = room.players[currentPlayerId];

        io.to(roomKey).emit("updateTurn", currentPlayer.pseudo);
        io.to(currentPlayerId).emit("yourTurn", room.total);
    }
}

module.exports = socketHandlers;
