const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const routes = require("./src/routes");
const socketHandlers = require("./src/socketHandlers");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware setup
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "public/views"));

// Setup routes
routes(app, io);

// Socket.IO setup
io.on("connection", (socket) => {
    console.log(`🟢 Player connected: ${socket.id}`);
    socketHandlers(socket, io); // Utiliser socketHandlers ici
});

// Start server
const PORT = 9500;
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
