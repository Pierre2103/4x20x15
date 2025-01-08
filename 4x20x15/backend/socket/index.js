//? backend/socket/index.js
import setupUserHandlers from "./user.js";
import setupRoomHandlers from "./room.js";
import setupGameHandlers from "./game.js";

const activeRooms = {}; // Gestion des rooms en mémoire

const setupSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`Utilisateur connecté : ${socket.id}`);

    // Ajout des gestionnaires de sockets
    setupUserHandlers(io, socket);
    setupRoomHandlers(io, socket, activeRooms);
    setupGameHandlers(io, socket, activeRooms);

    socket.on("disconnect", () => {
      console.log(`Utilisateur déconnecté : ${socket.id}`);
    });
  });
};

export default setupSocket;
