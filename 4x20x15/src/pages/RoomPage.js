import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { auth } from "../firebaseConfig.js";
import "../styles/RoomPage.scss";

const socket = io("http://localhost:3001"); // Remplacez par votre backend

const RoomPage = () => {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("MonPseudo");
  const [avatar, setAvatar] = useState("defaultAvatar");
  const [currentRoom, setCurrentRoom] = useState(null);



  const createRoom = () => {
    const user = auth.currentUser; // Récupère l'utilisateur connecté
    console.log(user);

    if (!user) {
      alert("Vous devez être connecté pour créer une room.");
      return;
    }

    socket.emit("createRoom", {
      hostId: user.uid, // Utilise l'ID utilisateur réel
      hostUsername: user.displayName || "Utilisateur", // Utilise le pseudo ou une valeur par défaut
      hostAvatar: user.photoURL || "defaultAvatar", // Utilise l'avatar ou une valeur par défaut
    });
  };

  const joinRoom = () => {
    const user = auth.currentUser; // Récupère l'utilisateur connecté

    if (!user) {
      alert("Vous devez être connecté pour rejoindre une room.");
      return;
    }

    socket.emit("joinRoom", {
      roomId, // Utilise l'ID de la room saisi par l'utilisateur
      userId: user.uid, // Utilise l'ID utilisateur réel
      username: user.displayName || "Utilisateur", // Utilise le pseudo ou une valeur par défaut
      avatar: user.photoURL || "defaultAvatar", // Utilise l'avatar ou une valeur par défaut
    });
  };

  useEffect(() => {
    socket.on("roomCreated", (data) => {
      alert(`Room créée : ${data.roomId}`);
      setRoomId(data.roomId);
    });

    socket.on("roomUpdated", (data) => {
      console.log("Room mise à jour :", data);
      setCurrentRoom(data);
    });

    return () => socket.off(); // Nettoyage des listeners
  }, []);

  return (
    <div className="room-page">
      <h1>Gestion des Rooms</h1>
      <div className="button-group">
        <button onClick={createRoom}>Créer une Room</button>
      </div>
      <div className="room-input">
        <input
          type="text"
          placeholder="Entrer l'ID de la Room"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
        <button onClick={joinRoom}>Rejoindre une Room</button>
      </div>
      {currentRoom && (
        <div className="room-details">
          <h2>Room ID : {currentRoom.id}</h2>
          <h3>Joueurs :</h3>
          <ul>
            {currentRoom.players.map((player) => (
              <li key={player.id}>
                <div className="avatar"></div>
                <span className="username">{player.username}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );  
};

export default RoomPage;
