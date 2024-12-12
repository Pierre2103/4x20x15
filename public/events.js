// events.js: Manages Socket.IO event handling on the client side
import { updateState, getCurrentState } from "./state.js";
import { renderLobby, renderHand, renderTurnInfo, renderLastCardPlayed, showHigherLowerGame, hideHigherLowerGame } from "./ui.js";

/**
 * Sets up Socket.IO event handlers.
 * @param {Object} socket - The Socket.IO client instance
 */
function setupSocketEventHandlers(socket) {
    // Handle lobby creation
    socket.on("lobbyCreated", ({ roomKey, host }) => {
        updateState({ roomKey });
        console.log(`🎉 Lobby created with key: ${roomKey}`);
        renderLobby();
    });

    // Handle a new player joining the lobby
    socket.on("playerJoined", (players) => {
        updateState({ players });
        console.log("👥 Player list updated:", players);
        renderLobby();
    });

    // Handle successful pseudo setup
    socket.on("pseudoSuccess", (pseudo) => {
        updateState({ pseudo });
        console.log(`✅ Pseudo successfully set to: ${pseudo}`);
    });

    // Handle pseudo error
    socket.on("pseudoError", (errorMessage) => {
        console.error(`❌ Pseudo error: ${errorMessage}`);
        alert(errorMessage);
    });

    // Handle game start
    socket.on("gameStarted", (players) => {
        updateState({ players, gameActive: true });
        console.log("🎮 Game started with players:", players);
        renderHand();
    });

    // Handle turn updates
    socket.on("updateTurn", (currentPlayer) => {
        console.log(`🔄 Turn updated. Current player: ${currentPlayer}`);
        renderTurnInfo(currentPlayer);
    });

    // Handle card played
    socket.on("cardPlayed", ({ player, card, total, newCard }) => {
        const state = getCurrentState();
        console.log(`🃏 ${player} played card: ${card.value} ${card.suit}`);
        updateState({ total });

        if (player === state.pseudo) {
            // Remove the played card from the hand
            const updatedHand = state.hand.filter(
                (c) => !(c.value === card.value && c.suit === card.suit)
            );
            updateState({ hand: updatedHand });
            renderHand();
        }

        renderLastCardPlayed(card);

        if (newCard && newCard.pseudo === state.pseudo) {
            // Add the new card to the hand
            const updatedHand = [...state.hand, newCard.card];
            updateState({ hand: updatedHand });
            renderHand();
        }
    });

    // Handle game over
    socket.on("gameOver", ({ loser }) => {
        console.log(`💀 Game over. Loser: ${loser}`);
        alert(`Game over! Loser: ${loser}`);
    });

    // Handle Higher or Lower mini-game
    socket.on("startHigherLower", () => {
        console.log("🎲 Starting Higher or Lower mini-game.");
        showHigherLowerGame();
    });

    socket.on("higherLowerComplete", () => {
        console.log("✅ Higher or Lower mini-game complete.");
        hideHigherLowerGame();
    });
}

export { setupSocketEventHandlers };
