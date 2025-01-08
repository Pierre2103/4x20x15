import { getDocument, addDocument, updateDocument, deleteDocument } from "../utils/firebaseUtils.js";
import { generateRoomId } from "../utils/helpers.js";

const setupRoomHandlers = (io, socket, activeRooms) => {
  socket.on("createRoom", async ({ hostId }) => {
    try {
      const userData = await getDocument("users", hostId);
      if (!userData) {
        socket.emit("error", { message: "Utilisateur introuvable" });
        return;
      }

      const roomId = generateRoomId();
      const newRoom = {
        id: roomId,
        hostId,
        players: [{ id: hostId, username: userData.username, avatar: userData.avatar }],
        settings: { maxPlayers: 6, specialRules: false },
        status: "waiting",
      };

      activeRooms[roomId] = newRoom;
      await addDocument("rooms", roomId, newRoom);

      socket.join(roomId);
      socket.emit("roomCreated", { roomId });
      io.to(roomId).emit("roomUpdated", newRoom);
    } catch (error) {
      socket.emit("error", { message: "Erreur lors de la création de la room" });
    }
  });

  socket.on("joinRoom", async ({ roomId, userId }) => {
    try {
      let room = activeRooms[roomId];
      if (!room) {
        room = await getDocument("rooms", roomId);
        if (!room) {
          socket.emit("error", { message: "Room introuvable" });
          return;
        }
        activeRooms[roomId] = room;
      }

      const userData = await getDocument("users", userId);
      if (!userData) {
        socket.emit("error", { message: "Utilisateur introuvable" });
        return;
      }

      room.players.push({ id: userId, username: userData.username, avatar: userData.avatar });
      await updateDocument("rooms", roomId, { players: room.players });

      io.to(roomId).emit("roomUpdated", room);
      socket.join(roomId);
    } catch (error) {
      socket.emit("error", { message: "Erreur lors de la jonction de la room" });
    }
  });
};

export default setupRoomHandlers;
