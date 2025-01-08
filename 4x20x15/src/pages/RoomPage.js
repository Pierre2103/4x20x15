import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { auth } from "../firebaseConfig.js";
import { update as jdenticonUpdate } from "jdenticon";
import "../styles/RoomPage.scss";
import arrow_back from "../img/icons/arrow-back.svg";
import cancel from "../img/icons/cancel.svg";

const socket = io("http://192.168.1.29:3001"); // Remplacez par votre backend

const RoomPage = () => {
  const [roomId, setRoomId] = useState("");
  const [currentRoom, setCurrentRoom] = useState(null);

  const createRoom = () => {
    const user = auth.currentUser;

    if (!user) {
      alert("Vous devez être connecté pour créer une room.");
      return;
    }

    socket.emit("createRoom", {
      hostId: user.uid,
    });
  };

  const joinRoom = () => {
    const user = auth.currentUser;

    if (!user) {
      alert("Vous devez être connecté pour rejoindre une room.");
      return;
    }

    socket.emit("joinRoom", {
      roomId,
      userId: user.uid,
    });
  };

  const removePlayer = (playerId) => {
    if (!currentRoom || currentRoom.hostId !== auth.currentUser.uid) {
      alert("Seul l'hôte peut supprimer un joueur.");
      return;
    }

    console.log(
      `Demande de suppression pour le joueur ${playerId} dans la room ${currentRoom.id}`
    );
    socket.emit("removePlayer", { roomId: currentRoom.id, playerId });
  };

  const startGame = () => {
    if (!currentRoom || currentRoom.hostId !== auth.currentUser.uid) {
      alert("Seul l'hôte peut commencer la partie.");
      return;
    }

    socket.emit("startGame", { roomId: currentRoom.id });
  };

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
    

    socket.on("removedFromRoom", () => {
      window.location.href = "/room"; // Redirige vers la page d'accueil ou une autre page
    });

    return () => socket.off();
  }, []);

useEffect(() => {
  const unsubscribe = auth.onAuthStateChanged((user) => {
    if (user) {
      socket.emit("registerUser", user.uid);
      console.log(`Émission de registerUser avec userId=${user.uid}`);
    } else {
      console.error("Aucun utilisateur connecté pour registerUser");
    }
  });
  return () => unsubscribe(); // Nettoyer le listener pour éviter les fuites
}, []);


useEffect(() => {
  const handleBeforeUnload = () => {
    if (currentRoom && currentRoom.status !== "playing" && auth.currentUser) {
      socket.emit("removePlayer", { roomId: currentRoom.id, playerId: auth.currentUser.uid });
    }
  };

  // Ajoute l'événement lors de la fermeture ou du rechargement
  window.addEventListener("beforeunload", handleBeforeUnload);

  return () => {
    window.removeEventListener("beforeunload", handleBeforeUnload);
  };
}, [currentRoom]);


  return (
    <div className="room-page">
      {!currentRoom && (
        <div>
          <button
            className="back-button"
            onClick={() => {
              if (currentRoom && auth.currentUser) {
                socket.emit("removePlayer", { roomId: currentRoom.id, playerId: auth.currentUser.uid });
              }
              window.location.reload();
            }}
          >
            <img src={arrow_back} alt="Retour" />
          </button>
          <h1>Gestion des Rooms</h1>
          <div className="room-input">
            <input
              type="text"
              placeholder="Entrer l'ID de la Room"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            />
            <button onClick={joinRoom}>OK</button>
          </div>
          <div className="button-group">
            <button onClick={createRoom}>Créer une Room</button>
          </div>
        </div>
      )}
      {currentRoom && (
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
      )}
    </div>
  );
};

export default RoomPage;
