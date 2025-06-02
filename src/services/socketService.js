import { io } from "socket.io-client";

let socket = null;

export const getSocket = () => {
    if (!socket) {
        socket = io(process.env.REACT_APP_SOCKET_URL || "http://localhost:3001");

        // Set up reconnection handler
        socket.on("connect", () => {
            const storedUser = JSON.parse(localStorage.getItem("user"));
            if (storedUser && storedUser.userId) {
                socket.emit("registerUser", storedUser.userId);
            }
        });
    }
    return socket;
};

export const joinSocketRoom = (roomId) => {
    if (!socket) getSocket();
    if (roomId) {
        socket.emit("joinSocketRoom", { roomId });
    }
};