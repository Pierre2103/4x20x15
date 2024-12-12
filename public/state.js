// state.js: Manages the client-side game state

const state = {
    pseudo: "",
    roomKey: "",
    players: {},
    hand: [],
    total: 0,
    isMyTurn: false,
    gameActive: false,
};

/**
 * Initializes the state with default values.
 */
function initializeState() {
    state.pseudo = "";
    state.roomKey = "";
    state.players = {};
    state.hand = [];
    state.total = 0;
    state.isMyTurn = false;
    state.gameActive = false;
}

/**
 * Updates the state with new values.
 * @param {Object} updates - An object containing the keys to update and their new values.
 */
function updateState(updates) {
    Object.keys(updates).forEach((key) => {
        if (key in state) {
            state[key] = updates[key];
        } else {
            console.warn(`Invalid state key: ${key}`);
        }
    });
}

/**
 * Retrieves the current state.
 * @returns {Object} The current state object.
 */
function getCurrentState() {
    return { ...state };
}

export { initializeState, updateState, getCurrentState };
