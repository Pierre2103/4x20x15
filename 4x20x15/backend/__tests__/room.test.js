import { Server } from "socket.io";
import { createServer } from "http";
import Client from "socket.io-client";
import setupRoomHandlers from "../socket/room.js";

let io, serverSocket, clientSocket, httpServer;

beforeAll((done) => {
  // Initialisation du serveur HTTP et Socket.IO
  httpServer = createServer();
  io = new Server(httpServer);

  httpServer.listen(() => {
    const port = httpServer.address().port;
    console.log(`Test server running on http://localhost:${port}`);
    clientSocket = new Client(`http://localhost:${port}`);
    
    io.on("connection", (socket) => {
      serverSocket = socket;
      console.log("Server: Client connected");
      setupRoomHandlers(io, socket, {}); // Injection des handlers de rooms
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

describe("Tests de gestion des rooms", () => {
  test("Connexion au serveur", (done) => {
    clientSocket.on("connect", () => {
      console.log("Client: Connected to the server");
      expect(clientSocket.connected).toBe(true);
      done();
    });
  });

  test("Créer une room valide", (done) => {
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
  });

  test("Créer une room avec un UID invalide", (done) => {
    clientSocket.emit("createRoom", { hostId: "invalid-uid" });

    clientSocket.on("error", (err) => {
      console.log("Client: Received error event", err);
      expect(err).toHaveProperty("message", "Utilisateur introuvable");
      done();
    });
  });
});
