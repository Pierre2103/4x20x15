//? backend/__tests__/room.test.js
import { Server } from "socket.io";
import { createServer } from "http";
import Client from "socket.io-client";
import setupRoomHandlers from "../socket/room.js";

let io, serverSocket, clientSocket, httpServer;

beforeAll((done) => {
  // Create a new HTTP server and initialize Socket.IO
  httpServer = createServer();
  io = new Server(httpServer);

  httpServer.listen(() => {
    const port = httpServer.address().port;
    console.log(`Test server running on http://localhost:${port}`);
    clientSocket = new Client(`http://localhost:${port}`);
    
    io.on("connection", (socket) => {
      serverSocket = socket;
      console.log("Server: Client connected");
      setupRoomHandlers(io, socket, {}); // Simulated activeRooms injection
    });

    clientSocket.on("connect", () => {
      console.log("Client: Connected to the server");
      done();
    });

    clientSocket.on("connect_error", (err) => {
      console.error("Client: Connection error", err);
      done(err);
    });
  });
});

afterAll(() => {
  io.close();
  clientSocket.close();
  httpServer.close();
});

test(
  "devrait créer une room et émettre roomCreated",
  (done) => {
    clientSocket.emit("createRoom", { hostId: "C1uiiDcNIRgdPI0wUvNw1ssMOxw1" });

    clientSocket.on("roomCreated", (data) => {
      console.log("Client: Received roomCreated event", data);
      expect(data).toHaveProperty("roomId");
      expect(data.roomId).toBeTruthy();
      done();
    });

    clientSocket.on("error", (err) => {
      console.error("Client: Received error event", err);
      done(err);
    });

    serverSocket.on("error", (err) => {
      console.error("Server: Received error event", err);
      done(err);
    });

    clientSocket.on("error", (err) => {
        console.log("Client: Received error event", err);
        expect(err).toHaveProperty("message", "Utilisateur introuvable");
        done();
      });
  },
  10000 // Timeout of 10 seconds
);
