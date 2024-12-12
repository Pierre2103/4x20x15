const path = require("path");

/**
 * Configures application routes.
 * @param {object} app - The Express application instance
 * @param {object} io - The Socket.IO server instance
 */
function routes(app, io) {
    // Step 1: Set pseudo
    app.get("/pseudo", (req, res) => {
        res.render("pseudo", { title: "Set Your Pseudo" });
    });

    // Step 2: Join or create a lobby
    app.get("/join", (req, res) => {
        res.render("join", { title: "Join or Create a Lobby" });
    });

    // Step 3: Lobby view
    app.get("/lobby", (req, res) => {
        res.render("lobby", { title: "Lobby", players: {}, roomKey: "" });
    });

    // Step 4: Game view
    app.get("/game", (req, res) => {
        res.render("game", { title: "Game" });
    });

    // Step 5: Higher or Lower mini-game
    app.get("/river", (req, res) => {
        res.render("river", { title: "Higher or Lower Game" });
    });
}

module.exports = routes;
