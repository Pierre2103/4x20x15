//? backend/socket/user.js
const setupUserHandlers = (io, socket) => {
    socket.on("registerUser", (userId) => {
      socket.userId = userId;
      console.log(`Socket ${socket.id} associé à l'utilisateur ${userId}`);
    });
  };
  
  export default setupUserHandlers;
  