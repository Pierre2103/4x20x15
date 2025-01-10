import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import "../styles/GamePage.scss";

const socket = io(process.env.REACT_APP_SERVER_URL || "http://localhost:3001");

const GamePage = () => {
  const { id: roomId } = useParams();
  const [game, setGame] = useState(null);
  const [playerCards, setPlayerCards] = useState([]);
  const [guess, setGuess] = useState("");
  const [currentPlayer, setCurrentPlayer] = useState(null);

  useEffect(() => {
    // Joindre la partie
    socket.emit("joinGame", { roomId });

    socket.on("gameStarted", (data) => {
      console.log("Partie commencée :", data);
      setGame(data);
      setPlayerCards(data.playerCards || []);
    });

    socket.on("gameUpdated", (data) => {
      console.log("Mise à jour du jeu :", data);
      setGame(data);
      if (data.currentPlayerId === socket.id) {
        setCurrentPlayer(true);
      } else {
        setCurrentPlayer(false);
      }
    });

    socket.on("penalty", (data) => {
      alert(data.message);
    });

    return () => socket.off();
  }, [roomId]);

  const playCard = (card) => {
    if (!guess) {
      alert("Veuillez entrer une estimation !");
      return;
    }
    socket.emit("playCard", { roomId, card, guess });
    setGuess("");
  };

  return (
    <div className="game-page">
      {/* Section des joueurs */}
      <div className="game-players">
        {game?.players?.map((player) => (
          <div key={player.id} className="player-info">
            <div className="player-avatar">{player.avatar}</div>
            <div className="player-name">{player.username}</div>
            <div className="player-penalties">
              Pénalités : {game.penalties?.[player.id] || 0}
            </div>
          </div>
        ))}
      </div>

      {/* Section centrale : pioche et cartes jouées */}
      <div className="game-center">
        <div className="deck">
          <div className="deck-title">Pioche</div>
          <div className="deck-cards">🂠</div>
        </div>
        <div className="played-cards">
          <div className="played-title">Cartes jouées</div>
          <div className="played-cards-display">
            {game?.playedCards?.map((card, index) => (
              <div key={index} className="played-card">
                {card.value} {card.suit}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section basse : cartes du joueur et informations */}
      <div className="game-bottom">
        <div className="player-cards">
          {playerCards.map((card, index) => (
            <button
              key={index}
              className="card"
              onClick={() => playCard(card)}
              disabled={!currentPlayer}
            >
              {card.value} {card.suit}
            </button>
          ))}
        </div>
        <div className="player-info-bottom">
          <div className="player-avatar-bottom">{game?.currentPlayer?.avatar}</div>
          <div className="player-name-bottom">{game?.currentPlayer?.username}</div>
          <div className="player-penalties-bottom">
            Pénalités : {game?.penalties?.[socket.id] || 0}
          </div>
          <input
            type="number"
            placeholder="Estimation du total"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            disabled={!currentPlayer}
          />
        </div>
      </div>
    </div>
  );
};

export default GamePage;