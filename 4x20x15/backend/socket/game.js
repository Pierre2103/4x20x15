//? backend/socket/game.js

// CODE ON THE CLIENT SIDE:
  // const startGame = () => {
  //   if (!currentRoom || currentRoom.hostId !== auth.currentUser.uid) {
  //     alert("Seul l'hôte peut commencer la partie.");
  //     return;
  //   }

  //   socket.emit("startGame", { roomId: currentRoom.id });
  // };

  // socket.on("gameStarted", (data) => {
  //   if (data && data.roomId) {
  //     window.location.href = "/game/" + data.roomId; // Redirige vers la page du jeu avec l'ID de la room
  //   } else {
  //     console.error("Données manquantes dans l'événement gameStarted");
  //   }
  // });

const setupGameHandlers = (io, socket, activeRooms) => {
  socket.on("startGame", async ({ roomId }) => {
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

      if (room.hostId !== socket.userId) {
        socket.emit("error", { message: "Seul l'hôte peut démarrer la partie" });
        return;
      }

      room.status = "playing";
      await updateDocument("rooms", roomId, { status: "playing" });

      io.to(roomId).emit("gameStarted", { roomId });
    } catch (error) {
      socket.emit("error", { message: "Erreur lors du démarrage de la partie" });
    }
  });
}

export default setupGameHandlers;