//? src/pages/RoomPage.js
import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { update as jdenticonUpdate } from "jdenticon";
import "../styles/RoomPage.scss";
import arrow_back from "../img/icons/arrow-back.svg";
import cancel from "../img/icons/cancel.svg";

const socket = io("http://192.168.1.19:3001");
// const socket = io("https://5158-176-128-221-167.ngrok-free.app", {
//   transports: ["websocket"],
// });

const RoomPage = () => {
  const [roomId, setRoomId] = useState("");
  const [currentRoom, setCurrentRoom] = useState(null);

  // Crée une room
  const createRoom = () => {
    const storedUser = JSON.parse(localStorage.getItem("user"));

    if (!storedUser || !storedUser.userId) {
      alert("Vous devez être connecté pour créer une room.");
      return;
    }

    socket.emit("createRoom", {
      hostId: storedUser.userId,
    });
  };

  // Rejoint une room
  const joinRoom = () => {
    const storedUser = JSON.parse(localStorage.getItem("user"));

    if (!storedUser || !storedUser.userId) {
      alert("Vous devez être connecté pour rejoindre une room.");
      return;
    }

    socket.emit("joinRoom", {
      roomId,
      userId: storedUser.userId,
    });
  };

  // Supprime un joueur de la room
  const removePlayer = (playerId) => {
    const storedUser = JSON.parse(localStorage.getItem("user"));

    if (!currentRoom || currentRoom.hostId !== storedUser.userId) {
      alert("Seul l'hôte peut supprimer un joueur.");
      return;
    }

    socket.emit("removePlayer", { roomId: currentRoom.id, playerId });
  };

  // Démarre la partie
  const startGame = () => {
    const storedUser = JSON.parse(localStorage.getItem("user"));

    if (!currentRoom || currentRoom.hostId !== storedUser.userId) {
      alert("Seul l'hôte peut commencer la partie.");
      return;
    }

    socket.emit("startGame", { roomId: currentRoom.id });
  };

  // Gestion des événements socket
  useEffect(() => {
    socket.on("roomCreated", (data) => {
      setRoomId(data.roomId);

      setCurrentRoom((prevRoom) => ({
        ...prevRoom,
        id: data.roomId,
      }));

      jdenticonUpdate(".avatar");
    });

    socket.on("roomUpdated", (data) => {
      setCurrentRoom(data);
      jdenticonUpdate(".avatar");
    });

    socket.on("gameStarted", (data) => {
      if (data && data.roomId) {
        window.location.href = "/game/" + data.roomId; // Redirige vers la page du jeu avec l'ID de la room
      } else {
        console.error("Données manquantes dans l'événement gameStarted");
      }
    });

    socket.on("removedFromRoom", (data) => {
      if (!data || !data.playerId) {
        console.error("Erreur : Données manquantes dans l'événement removedFromRoom", data);
        return;
      }
    
      const { playerId } = data;
      const storedUser = JSON.parse(localStorage.getItem("user"));
    
      console.log(`Joueur supprimé : ${playerId}`);
      console.log(`Utilisateur actuel : ${storedUser.userId}`);
    
      if (storedUser && storedUser.userId === playerId) {
        console.log(`Utilisateur actuel supprimé : ${storedUser.userId}`);
        setCurrentRoom(null);
        window.location.href = "/room";
      }
    });

    socket.on("connect_error", (err) => {
      console.error("Connection error:", err);
    });

    return () => socket.off(); // Nettoyer les listeners pour éviter les fuites
  }, [currentRoom]);

  // Enregistre l'utilisateur connecté
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser && storedUser.userId) {
      socket.emit("registerUser", storedUser.userId);
    } else {
      console.error("Aucun utilisateur connecté pour registerUser");
    }
  }, []);

  // Supprime le joueur de la room avant de quitter la page
  useEffect(() => {
    const handleBeforeUnload = () => {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (currentRoom && currentRoom.status !== "playing" && storedUser) {
        socket.emit("removePlayer", {
          roomId: currentRoom.id,
          playerId: storedUser.userId,
        });
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [currentRoom]);

  const renderRoomInput = () => (
    <div>
      <button
        className="back-button"
        onClick={() => {
          const storedUser = JSON.parse(localStorage.getItem("user"));
          if (currentRoom && storedUser) {
            socket.emit("removePlayer", {
              roomId: currentRoom.id,
              playerId: storedUser.userId,
            });
          }
          window.location.href = "/home";
        }}
      >
        <img src={arrow_back} alt="Retour" />
      </button>
      <h1>Gestion des Rooms</h1>
      <div className="room-input">
        <input
          type="text"
          placeholder="Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value.toUpperCase())}
        />
        <button onClick={joinRoom}>OK</button>
      </div>
      <div className="button-group">
        <button onClick={createRoom}>Créer une Room</button>
      </div>
    </div>
  );

  const renderRoomDetails = () => (
    <div className="room-details">
      <button
        className="back-button"
        onClick={() => window.location.reload()}
      >
        <img src={arrow_back} alt="Retour" />
      </button>
      <div className="room-title">
        <h3>Room ID :</h3>
        <h1>{currentRoom.id || "En attente de création..."}</h1>
      </div>
      <div className="room-players">
        <h2>Joueurs :</h2>
        <ul>
          {currentRoom.players?.map((player) => (
            <li key={player.id} className="player-item">
              <svg
                className="avatar"
                data-jdenticon-value={player.avatar || "default"}
                width="50"
                height="50"
              ></svg>
              <span>
                {player.username}{" "}
                {player.id === currentRoom.hostId ? "(Host)" : ""}
              </span>
              {JSON.parse(localStorage.getItem("user"))?.userId === currentRoom.hostId &&
                player.id !== currentRoom.hostId && (
                  <button
                    className="remove-button"
                    onClick={() => removePlayer(player.id)}
                  >
                    <img src={cancel} alt="Supprimer" />
                  </button>
                )}
            </li>
          ))}
        </ul>
      </div>
      {JSON.parse(localStorage.getItem("user"))?.userId === currentRoom.hostId && (
        <button className="start-button" onClick={startGame}>
          Commencer le jeu
        </button>
      )}
    </div>
  );

  return <div className="room-page">{currentRoom ? renderRoomDetails() : renderRoomInput()}</div>;
};

export default RoomPage;
