// game.js: Entry point for the frontend application
import { initializeState } from "./state.js";
import { setupSocketEventHandlers } from "./events.js";
import { renderLobby, renderHand } from "./ui.js";

const socket = io(); // Initialize Socket.IO connection

/**
 * Initializes the game application.
 */
function initGame() {
    console.log("🎮 Initializing game...");

    // Reset state
    initializeState();

    // Setup Socket.IO event handlers
    setupSocketEventHandlers(socket);

    // Attach event listeners for UI interactions
    setupUIEventListeners();

    console.log("✅ Game initialized successfully.");
}

/**
 * Sets up event listeners for UI interactions.
 */
function setupUIEventListeners() {
    // Pseudo input
    document.getElementById("setPseudo").addEventListener("click", () => {
        const pseudo = document.getElementById("pseudo").value.trim();
        if (pseudo) {
            socket.emit("setPseudo", pseudo);
        } else {
            alert("Please enter a valid pseudo!");
        }
    });

    // Create lobby button
    document.getElementById("createLobby").addEventListener("click", () => {
        socket.emit("createLobby");
    });

    // Join lobby button
    document.getElementById("joinLobby").addEventListener("click", () => {
        const roomKey = document.getElementById("joinKey").value.trim();
        if (roomKey) {
            socket.emit("joinLobby", roomKey);
        } else {
            alert("Please enter a valid lobby key!");
        }
    });

    // Start game button
    document.getElementById("startGame").addEventListener("click", () => {
        socket.emit("startGame");
    });

    // Play card action
    document.getElementById("hand").addEventListener("click", (event) => {
        if (event.target.tagName === "IMG" && event.target.classList.contains("card")) {
            const [value, suit] = event.target.alt.split(" of ");
            socket.emit("playCard", { value, suit });
        }
    });
}

// Start the game application
initGame();
