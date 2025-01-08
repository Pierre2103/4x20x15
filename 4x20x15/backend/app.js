import express from "express";
import http from "http";
import { Server } from "socket.io";
import { serverConfig } from "./config/serverConfig.js";
import setupSocket from "./socket/index.js";
import dotenv from "dotenv";

// Configuration de dotenv
dotenv.config({ path: '../.env' });

const app = express();
const server = http.createServer(app);
const io = new Server(server, serverConfig);

app.use(express.json());

// Configuration des sockets
setupSocket(io);

// Démarrage du serveur
const PORT = process.env.SERVER_PORT || 3001; // Port du serveur
server.listen(PORT, () =>
  console.log(`Serveur lancé sur http://localhost:${PORT}`)
);