// src/pages/GamePage.js
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { auth } from "../firebaseConfig.js";
import "../styles/GamePage.scss";

// Socket global
const socket = io("http://192.168.1.29:3001");
// const socket = io("https://5158-176-128-221-167.ngrok-free.app", {
//   transports: ["websocket"],
// });

const GamePage = () => {
  const { id: roomId } = useParams();
  const [currentUser, setCurrentUser] = useState(null);
  const [game, setGame] = useState(null);

  // Écouter l’état de connexion Firebase
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Rejoindre la partie côté socket
  useEffect(() => {
    if (!currentUser) return;

    socket.emit("joinGame", { roomId, userId: currentUser.uid });

    socket.on("gameStarted", (data) => {
      console.log("Game démarrée ou chargée:", data);
      setGame(data);
    });

    socket.on("gameUpdated", (data) => {
      console.log("Game mise à jour:", data);
      setGame(data);
    });

    socket.on("alertMessage", (data) => {
      alert(data.message);
    });

    return () => {
      socket.off("gameStarted");
      socket.off("gameUpdated");
      socket.off("alertMessage");
    };
  }, [currentUser, roomId]);

  // Jouer une carte
  const playCard = (card) => {
    if (!currentUser) return;

    socket.emit("playCard", {
      roomId,
      userId: currentUser.uid,
      card,
    });
  };

  if (!game) {
    return <div>Chargement de la partie...</div>;
  }

  // Récupérer MES infos
  const myPlayer = game.players[currentUser.uid] || {};

  // Dernière carte jouée
  const lastCard = game.playedCards?.[game.playedCards.length - 1];

  // Savoir si la partie est finie
  const isGameOver = !!game.gameOver;

  // Vérifier si c'est MON tour
  const myTurn = game.turnQueue?.[0] === currentUser.uid;

  return (
    <div className="game-page">
      <h1>Partie: {roomId}</h1>

      {isGameOver && (
        <div className="game-over-message">
          <h2>La partie est terminée !</h2>
          {myPlayer.hasLost && <p>Vous avez perdu !</p>}
          {myPlayer.hasWon && <p>Vous avez gagné !</p>}
        </div>
      )}

      {/* Liste des joueurs */}
      <div className="game-players">
        {Object.keys(game.players).map((pid) => {
          const player = game.players[pid];
          const isTurn = game.turnQueue?.[0] === pid; // Compare pid et premier de la file
          return (
            <div
              key={pid}
              className={`player-info
                ${isTurn ? "itsTurn" : ""}
                ${player.hasLost ? "lost" : ""}
                ${player.hasWon ? "won" : ""}
              `}
            >
              <div className="player-name">{player.username}</div>
              {player.hasLost && <div className="lost-message">Perdu</div>}
              {player.hasWon && <div className="won-message">Gagné</div>}
            </div>
          );
        })}
      </div>

      {/* Zone de jeu */}
      <div className="game-center">
        <div className="played-cards">
          <h3>Dernière carte jouée</h3>
          {lastCard ? (
            <div
              className={`played-card ${
                lastCard.suit === "♠" || lastCard.suit === "♣" ? "black" : "red"
              }`}
            >
              <div className="card-value">{lastCard.value}</div>
              <div className="card-suit">{lastCard.suit}</div>
            </div>
          ) : (
            <div>Aucune carte encore jouée</div>
          )}
          <div className="total">Total: {game.total}</div>
        </div>
        <div className="deck">
          <h3>Pioche</h3>
          <div className="deck-count">
            <p>{game.deck.length}</p>
          </div>
        </div>
      </div>

      {/* Mes cartes (si je n'ai pas perdu/gagné) */}
      {!myPlayer.hasLost && !myPlayer.hasWon && (
        <div className="game-bottom">
          <h3>Vos cartes</h3>
          <div className="cards-list">
            {myPlayer.cards?.map((card, idx) => (
              <div
                key={idx}
                className={`player-card ${
                  card.suit === "♠" || card.suit === "♣" ? "black" : "red"
                }`}
                onClick={() => {
                  if (myTurn && !isGameOver) {
                    playCard(card);
                  } else {
                    alert("Ce n'est pas votre tour !");
                    // alert("J'aime les grosses bites")
                  }
                }}
              >
                <div className="card-value">{card.value}</div>
                <div className="card-suit">{card.suit}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GamePage;
