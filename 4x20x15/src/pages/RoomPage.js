//? src/pages/RoomPage.js
import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { auth } from "../firebaseConfig.js";
import { update as jdenticonUpdate } from "jdenticon";
import "../styles/RoomPage.scss";
import arrow_back from "../img/icons/arrow-back.svg";
import cancel from "../img/icons/cancel.svg";

const socket = io(process.env.REACT_APP_SERVER_URL || "http://localhost:3001");

const RoomPage = () => {
  const [roomId, setRoomId] = useState("");
  const [currentRoom, setCurrentRoom] = useState(null);
  const [loading, setLoading] = useState(false);

  // Crée une room
  const createRoom = () => {
    const user = auth.currentUser;

    if (!user) {
      alert("Vous devez être connecté pour créer une room.");
      return;
    }

    setLoading(true);
    console.log("Client : Tentative de création d'une room");
    socket.emit("createRoom", { hostId: user.uid });
  };

  // Rejoint une room
  const joinRoom = () => {
    const user = auth.currentUser;

    if (!user) {
      alert("Vous devez être connecté pour rejoindre une room.");
      return;
    }

    if (!roomId) {
      alert("Veuillez entrer un ID de room valide.");
      return;
    }

    setLoading(true);
    console.log("Client : Tentative de joindre la room avec ID :", roomId);
    socket.emit("joinRoom", { roomId, userId: user.uid });
    setRoomId("");
  };

  // Supprime un joueur de la room
  const removePlayer = (playerId) => {
    if (!currentRoom || currentRoom.hostId !== auth.currentUser.uid) {
      alert("Seul l'hôte peut supprimer un joueur.");
      return;
    }

    console.log("Client : Suppression du joueur avec ID :", playerId);
    socket.emit("removePlayer", { roomId: currentRoom.id, playerId });
  };

  // Démarre la partie
  const startGame = () => {
    if (!currentRoom || currentRoom.hostId !== auth.currentUser.uid) {
      alert("Seul l'hôte peut commencer la partie.");
      return;
    }

    console.log("Client : Tentative de démarrage de la partie pour la room :", currentRoom.id);
    socket.emit("startGame", { roomId: currentRoom.id });
  };

  // Gérer les événements Socket.IO
  useEffect(() => {
    socket.on("roomCreated", (data) => {
      console.log("Client : Événement roomCreated reçu", data);
      setCurrentRoom(data);
      setLoading(false);
      jdenticonUpdate(".avatar");
    });

    socket.on("roomUpdated", (data) => {
      console.log("Client : Événement roomUpdated reçu", data);
      setCurrentRoom(data);
      setLoading(false);
      jdenticonUpdate(".avatar");
    });

    socket.on("gameStarted", (data) => {
      console.log("Client : Événement gameStarted reçu", data);
      if (data && data.roomId) {
        window.location.href = "/game/" + data.roomId;
      } else {
        console.error("Données manquantes dans l'événement gameStarted");
      }
    });

    socket.on("removedFromRoom", () => {
      console.log("Client : Événement removedFromRoom reçu");
      setCurrentRoom(null);
      window.location.href = "/room";
    });

    return () => socket.off(); // Nettoyer les listeners pour éviter les fuites
  }, []);

  // Enregistrer l'utilisateur connecté
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log("Client : Enregistrement de l'utilisateur connecté", user.uid);
        socket.emit("registerUser", user.uid);
      } else {
        console.error("Aucun utilisateur connecté pour registerUser");
      }
    });
    return () => unsubscribe();
  }, []);

  // Supprime le joueur de la room avant de quitter la page
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentRoom && currentRoom.status !== "playing" && auth.currentUser) {
        console.log("Client : Suppression de l'utilisateur avant de quitter la page");
        socket.emit("removePlayer", {
          roomId: currentRoom.id,
          playerId: auth.currentUser.uid,
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
        <button onClick={joinRoom}>{loading ? "Chargement..." : "OK"}</button>
      </div>
      <div className="button-group">
        <button onClick={createRoom}>{loading ? "Chargement..." : "Créer une Room"}</button>
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
        <h1>{currentRoom?.id || "En attente de création..."}</h1>
      </div>
      <div className="room-players">
        <h2>Joueurs :</h2>
        <ul>
          {currentRoom?.players?.map((player) => (
            <li key={player.id} className="player-item">
              <svg
                className="avatar"
                data-jdenticon-value={player.avatar || "default"}
                width="50"
                height="50"
              ></svg>
              <span>
                {player.username} {player.id === currentRoom.hostId ? "(Host)" : ""}
              </span>
              {auth.currentUser?.uid === currentRoom.hostId &&
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
      {auth.currentUser?.uid === currentRoom.hostId && (
        <button className="start-button" onClick={startGame}>
          Commencer le jeu
        </button>
      )}
    </div>
  );

  return <div className="room-page">{currentRoom ? renderRoomDetails() : renderRoomInput()}</div>;
};

export default RoomPage;
