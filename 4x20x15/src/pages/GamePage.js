import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";

const socket = io(process.env.REACT_APP_SERVER_URL || "http://localhost:3001");

const GamePage = () => {
  const { id } = useParams(); // Room ID
  const [gameState, setGameState] = useState(null); // État de la partie
  const [currentPlayer, setCurrentPlayer] = useState(null); // Joueur actif
  const [user, setUser] = useState(null); // Joueur local

  // Charger les données initiales
  useEffect(() => {
    socket.emit("joinGame", { roomId: id });

    socket.on("gameStateUpdated", (state) => {
      setGameState(state);
      setCurrentPlayer(state.currentPlayer);
    });

    // Charger l'utilisateur local
    socket.emit("getUser", (userData) => setUser(userData));

    return () => socket.off(); // Nettoyer les listeners
  }, [id]);

  // Jouer une carte
  const playCard = (card) => {
    if (!gameState || currentPlayer.id !== user.id) {
      alert("Ce n'est pas votre tour !");
      return;
    }

    socket.emit("playCard", { roomId: id, card });
  };

  return (
    <div>
      <h1>Partie en cours - Room ID : {id}</h1>
      {gameState && (
        <>
          <h2>Joueur actif : {currentPlayer.username}</h2>
          <h3>Total au centre : {gameState.total}</h3>
          <h4>Vos cartes :</h4>
          <ul>
            {user?.hand?.map((card, index) => (
              <li key={index} onClick={() => playCard(card)}>
                {card.value} de {card.suit}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default GamePage;
