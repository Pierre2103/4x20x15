// ui.js: Manages UI updates and interactions
import { getCurrentState } from "./state.js";

/**
 * Renders the lobby UI with players and room key information.
 */
function renderLobby() {
    const state = getCurrentState();
    const lobbyInfo = document.getElementById("lobbyInfo");
    const playerList = document.getElementById("playerList");

    if (state.roomKey) {
        lobbyInfo.textContent = `Room Key: ${state.roomKey}`;
    }

    const playersHtml = Object.values(state.players)
        .map((player) => `<p>${player.pseudo}</p>`)
        .join("");
    playerList.innerHTML = `<h3>Players:</h3>${playersHtml}`;
}

/**
 * Renders the player's hand using SVG images for cards.
 */
function renderHand() {
    const state = getCurrentState();
    const handContainer = document.getElementById("hand");

    const handHtml = state.hand
        .map((card) => {
            const cardCode = `${card.value}${card.suit[0]}`.toUpperCase();
            return `<img class="card" src="./assets/cards/${cardCode}.svg" alt="${card.value} of ${card.suit}" style="aspect-ratio: 2 / 3; width: auto; height: 100%;" />`;
        })
        .join("");

    handContainer.innerHTML = handHtml;
}

/**
 * Updates the turn information displayed to the player.
 * @param {string} currentPlayer - The pseudo of the current player.
 */
function renderTurnInfo(currentPlayer) {
    const waitingPlayer = document.getElementById("waitingPlayer");
    waitingPlayer.textContent = currentPlayer === getCurrentState().pseudo
        ? "It's your turn!"
        : `Waiting for: ${currentPlayer}`;

    if (currentPlayer === getCurrentState().pseudo) {
        waitingPlayer.classList.add("active");
    } else {
        waitingPlayer.classList.remove("active");
    }
}

/**
 * Updates the last card played on the board using an SVG image.
 * @param {Object} card - The card played.
 */
function renderLastCardPlayed(card) {
    const lastCardPlayed = document.getElementById("lastCardPlayed");
    const cardCode = `${card.value}${card.suit[0]}`.toUpperCase();
    lastCardPlayed.innerHTML = `<img class="card" src="/path/to/cards/${cardCode}.svg" alt="${card.value} of ${card.suit}" style="aspect-ratio: 2 / 3; width: auto; height: 100%;" />`;
}

/**
 * Displays the Higher or Lower mini-game UI.
 */
function showHigherLowerGame() {
    const higherLowerGame = document.getElementById("higherLowerGame");
    const mainGame = document.getElementById("game");

    mainGame.style.display = "none";
    higherLowerGame.style.display = "block";
}

/**
 * Hides the Higher or Lower mini-game UI and returns to the main game.
 */
function hideHigherLowerGame() {
    const higherLowerGame = document.getElementById("higherLowerGame");
    const mainGame = document.getElementById("game");

    higherLowerGame.style.display = "none";
    mainGame.style.display = "block";
}

export { renderLobby, renderHand, renderTurnInfo, renderLastCardPlayed, showHigherLowerGame, hideHigherLowerGame };
