import express from "express";
import http from "http";
import { Server } from "socket.io";
import { serverConfig } from "./config/serverConfig.js";
import setupSocket from "./socket/index.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, serverConfig);

app.use(express.json());

// Configuration des sockets
setupSocket(io);

// Démarrage du serveur
const PORT = 3001;
server.listen(PORT, () =>
  console.log(`Serveur lancé sur http://localhost:${PORT}`)
);
