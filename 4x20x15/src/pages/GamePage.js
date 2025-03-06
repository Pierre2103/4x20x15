// src/pages/GamePage.js
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { auth } from "../firebaseConfig.js"; // Import auth
import "../styles/GamePage.scss";

// Initialise le socket une seule fois, en dehors du composant
const socket = io(process.env.REACT_APP_SERVER_URL || "http://localhost:3001");

const GamePage = () => {
  const { id: roomId } = useParams();
  const [currentUser, setCurrentUser] = useState(null);
  const [game, setGame] = useState(null);
  const [playerCards, setPlayerCards] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(false);
  const [playersInfo, setPlayersInfo] = useState({});

  // 1) Écouter l’authentification Firebase
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // 2) Quand on a l’utilisateur, on rejoint la partie + écoute les événements socket
  useEffect(() => {
    if (!currentUser) return; // on attend le user

    socket.emit("joinGame", { roomId, userId: currentUser.uid });

    socket.on("gameStarted", (data) => {
      console.log("Partie commencée :", data);
      setGame(data);
      setPlayerCards(data.playerCards?.[currentUser.uid] || []);
      setPlayersInfo(data.players || {});
      setCurrentPlayer(data.currentPlayerId === currentUser.uid);
    });

    socket.on("gameUpdated", (data) => {
      console.log("Mise à jour du jeu :", data);
      setGame(data);
      setPlayerCards(data.playerCards?.[currentUser.uid] || []);
      setCurrentPlayer(data.currentPlayerId === currentUser.uid);
    });

    socket.on("penalty", (data) => {
      alert(data.message);
    });

    // Nettoyage quand le composant se démonte
    return () => {
      socket.off("gameStarted");
      socket.off("gameUpdated");
      socket.off("penalty");
    };
  }, [currentUser, roomId]);

  // Jouer une carte
  const playCard = (card) => {
    // On émet simplement la carte jouée (sans estimation)
    socket.emit("playCard", {
      roomId,
      userId: currentUser.uid,
      card,
    });
  };

  // Récupération d'info sur un joueur donné (pour l'affichage avatar/username)
  const getPlayerInfo = (playerId) => {
    return playersInfo[playerId] || { username: "Inconnu", avatar: "default" };
  };

  return (
    <div className="game-page">
      {/* Section des joueurs */}
      <div className="game-players">
        {game &&
          Object.keys(game.players).map((playerId) => {
            const player = game.players[playerId];
            return (
              <div key={playerId} className="player-info">
                {/* <div className="player-avatar">{player.avatar}</div> */}
                <div className="player-name">[{player.penalties}] {player.username}</div>
                {/* <div className="player-penalties">
                  Pénalités : {game.penalties?.[playerId] || 0}
                </div> */}
              </div>
            );
          })}
      </div>

      {/* Section centrale : pioche et cartes jouées */}
      <div className="game-center">
        <div className="played-cards">
          <div className="played-title">Last Card</div>
          <div className="played-cards">
            {game?.playedCards?.length > 0 && (
              <div
                className={`played-card ${
                  game.playedCards[game.playedCards.length - 1].suit === "♠" ||
                  game.playedCards[game.playedCards.length - 1].suit === "♣"
                    ? "black"
                    : "red"
                }`}
              >
                <div className="card-value">
                  {game.playedCards[game.playedCards.length - 1].value}
                </div>
                <div className="card-suit">
                  {game.playedCards[game.playedCards.length - 1].suit}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="deck">
          <div className="deck-title">Deck</div>
          <div className="deck-count"><p>{game?.deck?.length}</p></div>
        </div>
      </div>

      {/* Section basse : cartes du joueur et informations */}
      <div className="game-bottom">
        <div className="player-cards">
          {playerCards.map((card, index) => (
            <div
              key={index}
              className={`player-card ${
                card.suit === "♠" || card.suit === "♣" ? "black" : "red"
              }`}
              onClick={() => currentPlayer && playCard(card)}
            >
              <div className="card-value">{card.value}</div>
              <div className="card-suit">{card.suit}</div>
            </div>
          ))}
        </div>
        <div className="player-info-bottom">
          {game && (
            <>
              <div className="player-name-bottom">
                {getPlayerInfo(game.currentPlayerId).username}
              </div>
              <div className="player-avatar-bottom">
                {getPlayerInfo(game.currentPlayerId).avatar}
              </div>
              <div className="player-penalties-bottom">
                Pénalités : {game?.penalties?.[currentUser?.uid] || 0}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GamePage;
