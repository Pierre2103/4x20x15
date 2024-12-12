const ioClient = require("socket.io-client");
const { createServer } = require("http");
const express = require("express");
const socketHandlers = require("../src/socketHandlers");
const routes = require("../src/routes");

// Create test server setup
const app = express();
const server = createServer(app);
const io = require("socket.io")(server);

// Middleware and routes
app.use(express.static("public"));
routes(app);

// Socket.IO integration
io.on("connection", (socket) => {
    console.log(`🟢 Test client connected: ${socket.id}`);
    socketHandlers(socket, io);
});

// Start test server
const TEST_PORT = 9501;
server.listen(TEST_PORT, () => {
    console.log(`🚀 Test server running on http://localhost:${TEST_PORT}`);
});

const PORT = 9500;
// Test client setup
const testClient = ioClient(`http://localhost:${PORT}`);

testClient.on("connect", () => {
    console.log("✅ Test client connected successfully.");

    // Example: Test setPseudo event
    console.log("📝 Testing setPseudo...");
    testClient.emit("setPseudo", "TestPlayer");

    testClient.on("pseudoSuccess", (pseudo) => {
        console.log(`🎉 Pseudo set successfully: ${pseudo}`);
    });

    testClient.on("pseudoError", (error) => {
        console.error(`❌ Pseudo error: ${error}`);
    });

    // Example: Test createLobby event
    console.log("📝 Testing createLobby...");
    testClient.emit("createLobby");

    testClient.on("lobbyCreated", ({ roomKey }) => {
        console.log(`🎉 Lobby created with room key: ${roomKey}`);

        // Example: Test joinLobby event
        console.log("📝 Testing joinLobby...");
        testClient.emit("joinLobby", roomKey);
    });

    testClient.on("error", (errorMessage) => {
        console.error(`❌ Error received: ${errorMessage}`);
    });
});