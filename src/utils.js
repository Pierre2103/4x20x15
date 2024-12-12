// Utility functions for game logic

/**
 * Creates a full deck of cards with suits and values.
 * @returns {Array} Deck of cards
 */
function createDeck() {
    const suits = ["♥", "♦", "♣", "♠"];
    const values = [2, 3, 4, 5, 6, 7, 8, 9, 10, "J", "Q", "K", "A"];
    const deck = [];
    suits.forEach((suit) => {
        values.forEach((value) => {
            deck.push({ suit, value });
        });
    });
    return deck;
}

/**
 * Shuffles a given deck of cards.
 * @param {Array} deck - Deck of cards to shuffle
 */
function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

/**
 * Deals a specified number of cards from the deck.
 * @param {Array} deck - The deck of cards
 * @param {number} count - Number of cards to deal
 * @returns {Array} Cards dealt from the deck
 */
function dealCards(deck, count) {
    return deck.splice(0, count);
}

/**
 * Calculates the new total based on a card and game rules.
 * @param {number} total - The current total
 * @param {Object} card - The card played
 * @param {boolean} isDeckEmpty - Whether the deck is empty
 * @returns {number} The updated total
 */
function calculateNewTotal(total, card, isDeckEmpty) {
    const value = card.value;

    // Special logic when the deck is empty
    if (isDeckEmpty) {
        if (value === "Q" || value === "K") {
            return total + 1; // Queen and King are worth 1 point when the deck is empty
        }
        if (value === "J") {
            return total; // Jack remains 0
        }
    }

    // Default logic for a full deck
    if (typeof value === "number") {
        return total + value;
    }

    switch (value) {
        case "Q": return total - 10; // Queen subtracts 10
        case "K": return 70; // King sets the total to 70
        case "J": return total; // Jack is 0
        case "A": return total + 1; // Ace adds 1
        default: return total;
    }
}

/**
 * Finds the next player with cards in their hand.
 * @param {Object} room - The game room object
 * @returns {number} Index of the next player with cards, or -1 if none
 */
function getNextPlayerWithCards(room) {
    const maxPlayers = room.turnOrder.length;
    let nextTurn = (room.currentTurn + 1) % maxPlayers;

    while (nextTurn !== room.currentTurn) {
        const nextPlayerId = room.turnOrder[nextTurn];
        if (room.players[nextPlayerId].hand.length > 0) {
            return nextTurn; // Found a player with cards
        }
        nextTurn = (nextTurn + 1) % maxPlayers;
    }

    return -1; // No players with cards
}

module.exports = {
    createDeck,
    shuffleDeck,
    dealCards,
    calculateNewTotal,
    getNextPlayerWithCards
};
