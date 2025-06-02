// src/pages/GamePage.js
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { toast, Toaster } from "react-hot-toast"; // Import react-hot-toast
import "../styles/GamePage.scss";
import confetti from "canvas-confetti"; // Import canvas-confetti

// Socket global
const socket = io(process.env.REACT_APP_SOCKET_URL || "http://localhost:3001");

const GamePage = () => {
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [game, setGame] = useState(null);
  const [orderedUsernames, setOrderedUsernames] = useState([]);

  // Autoroute states
  const [autorouteState, setAutorouteState] = useState({
    active: false,
    aceSelection: false,
    directionSelection: false,
    guessing: false,
    river: [],
    aceValue: null,
    direction: null,
    currentPosition: null,
    guessHistory: [],
    drawnCard: null,         // Store the drawn card
    showRestartOverlay: false, // Flag for showing the restart overlay
    isCompleted: false, // Flag for showing the completed message
    roomId: null // Store roomId for navigation
  });
  const [dragState, setDragState] = useState({
    isDragging: false,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    direction: null // 'left' or 'right'
  });
  const cardRef = useRef(null);

  // Écouter l'état de connexion Firebase
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    setCurrentUser(storedUser);
  }, []);

  // Rejoindre la partie côté socket
  useEffect(() => {
    if (!currentUser) return;

    socket.emit("joinGame", { roomId, userId: currentUser.userId });

    socket.on("gameStarted", (data) => {
      console.log("Game démarrée ou chargée:", data);
      setGame(data);
    });

    socket.on("gameUpdated", (data) => {
      console.log("Game mise à jour:", data);
      setGame(data);
      socket.emit("getOrderedPlayerUsernames", { roomId }); // Refresh player list
    });

    socket.on("alertMessage", (data) => {
      toast((t) => (
        <span onClick={() => toast.dismiss(t.id)}>
          {data.message}
        </span>
      ),
        {
          icon: data.type == 'ended' ? "🏆" : "🍻",
          duration: data.type == 'ended' ? Infinity : 3000,
        });
    });

    socket.emit("getOrderedPlayerUsernames", { roomId });

    socket.on("orderedPlayerUsernames", (usernames) => {
      setOrderedUsernames(usernames);
    });

    // Autoroute socket events
    socket.on("autorouteStarted", (data) => {
      setAutorouteState(prev => ({
        ...prev,
        active: true,
        aceSelection: true,
        river: data.river
      }));
      toast((t) => (
        <span onClick={() => toast.dismiss(t.id)}>
          "L'autoroute commence! Choisissez la valeur de l'As (1 ou 14)"
        </span>
      ),
        {
          icon: "🛣️",
          duration: 3000,
        });
    });

    socket.on("aceValueChosen", (data) => {
      setAutorouteState(prev => ({
        ...prev,
        aceSelection: false,
        directionSelection: true,
        aceValue: data.aceValue
      }));
      toast((t) => (
        <span onClick={() => toast.dismiss(t.id)}>
          "Choisissez la direction (gauche vers droite ou droite vers gauche)"
        </span>
      ),
        {
          icon: "🛣️",
          duration: 3000,
        });
    });

    socket.on("directionChosen", (data) => {
      setAutorouteState(prev => ({
        ...prev,
        directionSelection: false,
        guessing: true,
        direction: data.direction,
        currentPosition: data.currentPosition
      }));
      toast((t) => (
        <span onClick={() => toast.dismiss(t.id)}>
          "Commencez à deviner! Faites glisser à gauche pour 'plus petit', à droite pour 'plus grand'"        
        </span>
      ),
        {
          icon: "🛣️",
          duration: 3000,
        });
    });

    socket.on("guessResult", (data) => {
      if (data.correct) {
        // If correct, update position, history, and river
        setAutorouteState(prev => ({
          ...prev,
          currentPosition: data.nextPosition,
          guessHistory: data.guessHistory,
          drawnCard: null,
          showRestartOverlay: false,
          river: data.updatedRiver || prev.river // Use updated river from server
        }));
      } else {
        // If incorrect, show the drawn card and the restart overlay
        setAutorouteState(prev => ({
          ...prev,
          guessHistory: data.guessHistory,
          drawnCard: data.drawnCard,
          showRestartOverlay: true,
          river: data.updatedRiver || prev.river // Use updated river from server
        }));
      }

      // Reset drag position
      setDragState({
        isDragging: false,
        startX: 0,
        startY: 0,
        offsetX: 0,
        offsetY: 0,
        direction: null
      });
    });

    socket.on("autorouteCompleted", (data) => {
      toast.success(data.message);

      // Trigger confetti
      confetti({
        particleCount: 500,
        spread: 120,
        origin: { y: 0.6 }, // Adjust the origin to make it look better
      });

      if (data.roomId) {
        setAutorouteState({
          active: false,
          aceSelection: false,
          directionSelection: false,
          guessing: false,
          river: [],
          aceValue: null,
          direction: null,
          currentPosition: null,
          guessHistory: [],
          drawnCard: null,
          showRestartOverlay: false,
          isCompleted: true,
          roomId: data.roomId // Store roomId for navigation
        });
      } else {
        setAutorouteState({
          active: false,
          aceSelection: false,
          directionSelection: false,
          guessing: false,
          river: [],
          aceValue: null,
          direction: null,
          currentPosition: null,
          guessHistory: [],
          drawnCard: null,
          showRestartOverlay: false,
          isCompleted: true
        });
      }
    });

    socket.on("everyoneDrinks", (data) => {
      toast((t) => (
        <span onClick={() => toast.dismiss(t.id)}>
          {data.message}
        </span>
      ),
        {
          icon: "🍻",
          duration: 3000,
        });
    });

    socket.on("gameDeleted", (data) => {
      toast.success(data.message);
      // Force navigation using window.location.href instead of navigate()
      if (data.roomId) {
        window.location.href = `/room/${data.roomId}`;
      } else {
        window.location.href = "/room";
      }
    });

    // Add this new listener for autoroute restart
    socket.on("autorouteRestarted", (data) => {
      setAutorouteState(prev => ({
        ...prev,
        currentPosition: data.nextPosition,
        guessHistory: [], // Clear the history
        river: data.updatedRiver, // Use the updated river
        drawnCard: null,
        showRestartOverlay: false
      }));
    });

    return () => {
      socket.off("gameStarted");
      socket.off("gameUpdated");
      socket.off("alertMessage");
      socket.off("orderedPlayerUsernames");
      socket.off("autorouteStarted");
      socket.off("aceValueChosen");
      socket.off("directionChosen");
      socket.off("guessResult");
      socket.off("autorouteCompleted");
      socket.off("everyoneDrinks");
      socket.off("gameDeleted");
      socket.off("autorouteRestarted"); // Don't forget to remove this listener
    };
  }, [currentUser, roomId, navigate]);

  // Jouer une carte
  const playCard = (card) => {
    if (!currentUser) return;

    socket.emit("playCard", {
      roomId,
      userId: currentUser.userId,
      card,
    });
  };

  // Start autoroute (for losing player)
  const startAutoroute = () => {
    socket.emit("startAutoroute", {
      roomId,
      userId: currentUser.userId
    });
  };

  // Choose ace value
  const selectAceValue = (value) => {
    socket.emit("chooseAceValue", {
      roomId,
      userId: currentUser.userId,
      aceValue: value
    });
  };

  // Choose direction
  const selectDirection = (direction) => {
    socket.emit("chooseDirection", {
      roomId,
      userId: currentUser.userId,
      direction
    });
  };

  // Drag handlers for the card guessing
  const handleMouseDown = (e) => {
    if (!autorouteState.guessing) return;

    setDragState({
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: 0,
      offsetY: 0,
      direction: null
    });
  };

  const handleMouseMove = (e) => {
    if (!dragState.isDragging) return;

    const offsetX = e.clientX - dragState.startX;
    const direction = offsetX < 0 ? 'left' : 'right';

    setDragState(prev => ({
      ...prev,
      offsetX,
      direction: Math.abs(offsetX) > 20 ? direction : null // Only set direction if moved enough
    }));
  };

  const handleMouseUp = () => {
    if (!dragState.isDragging) return;

    // Determine if it's a left or right swipe
    if (Math.abs(dragState.offsetX) > 50) { // Minimum swipe distance
      const guess = dragState.offsetX < 0 ? "lower" : "higher";

      socket.emit("guessHigherLower", {
        roomId,
        userId: currentUser.userId,
        guess
      });
    }

    // Reset drag state
    setDragState({
      isDragging: false,
      startX: 0,
      startY: 0,
      offsetX: 0,
      offsetY: 0,
      direction: null
    });
  };

  // Touch handlers for mobile
  const handleTouchStart = (e) => {
    if (!autorouteState.guessing) return;

    setDragState({
      isDragging: true,
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      offsetX: 0,
      offsetY: 0,
      direction: null
    });
  };

  const handleTouchMove = (e) => {
    if (!dragState.isDragging) return;

    const offsetX = e.touches[0].clientX - dragState.startX;
    const direction = offsetX < 0 ? 'left' : 'right';

    setDragState(prev => ({
      ...prev,
      offsetX,
      direction: Math.abs(offsetX) > 20 ? direction : null
    }));
  };

  const handleTouchEnd = () => {
    handleMouseUp(); // Reuse the same logic as mouse up
  };

  // Handle restart for incorrect guess - clear guessHistory AND tell the backend to do the same
  const handleRestart = () => {
    // Update the position based on the original direction
    const newPosition = autorouteState.direction === "leftToRight" ? 0 : 4;

    // Clear guessHistory locally
    setAutorouteState(prev => ({
      ...prev,
      currentPosition: newPosition,
      drawnCard: null,
      showRestartOverlay: false,
      guessHistory: [] // Clear guess history to remove guessed cards display
    }));

    // Tell the server to clear the guessHistory as well
    socket.emit("restartAutoroute", {
      roomId,
      userId: currentUser.userId
    });
  };

  // Modify the function to return to room - use direct window.location instead of navigate
  const returnToRoom = () => {
    socket.emit("deleteGame", { roomId });
    window.location.href = "/room"; // Force redirect to main room page
  };

  if (!game) {
    return <div>Chargement de la partie...</div>;
  }

  // Récupérer MES infos
  const myPlayer = game.players[currentUser.userId] || {};

  // Dernière carte jouée
  const lastCard = game.playedCards?.[game.playedCards.length - 1];

  // Savoir si la partie est finie
  const isGameOver = !!game.gameOver;

  // Vérifier si c'est MON tour
  const myTurn = game.turnQueue?.[0] === currentUser.userId;

  if (myTurn && !isGameOver) {
    if (navigator.vibrate) {
      navigator.vibrate(300); // Vibrate for 200ms
    }
  }

  // Check if I'm the loser
  const isLoser = myPlayer.hasLost;

  return (
    <div className="game-page">
      <h1>Partie: {roomId}</h1>

      <div>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "var(--background)",
              color: "var(--font)",
              border: "1px solid var(--primary)",
              fontSize: "1.2rem",
            },
          }}
        />
      </div>

      {isGameOver && !autorouteState.active && !autorouteState.isCompleted && (
        <div className="game-over-message">
          <h2>La partie est terminée !</h2>
          {isLoser && (
            <button
              className="start-autoroute-btn"
              onClick={startAutoroute}
            >
              Commencer l'Autoroute
            </button>
          )}
        </div>
      )}

      {/* Liste des joueurs */}
      {!autorouteState.active && (
        <div className="game-players">
          {orderedUsernames.map((username, index) => {
            const player = Object.values(game.players).find(p => p.username === username);
            return (
              <div
                key={player.userId}
                className={`player-info
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
      )}

      {/* Autoroute UI */}
      {autorouteState.active && (
        <div className="autoroute-container">
          <h2>Autoroute</h2>

          {/* Ace Selection */}
          {autorouteState.aceSelection && (
            <div className="ace-selection">
              <h3>Choisissez la valeur de l'As:</h3>
              <div className="ace-options">
                <div
                  className="ace-card"
                  onClick={() => selectAceValue(1)}
                >
                  <div className="card-value">1</div>
                  <div className="card-suit">A</div>
                </div>
                <div
                  className="ace-card"
                  onClick={() => selectAceValue(14)}
                >
                  <div className="card-value">14</div>
                  <div className="card-suit">A</div>
                </div>
              </div>
            </div>
          )}

          {/* Direction Selection */}
          {autorouteState.directionSelection && (
            <div className="direction-selection">
              <h3>Choisissez la direction:</h3>
              
              {/* Show the river during direction selection */}
              <div className="autoroute-river direction-river horizontal">
                {autorouteState.river.map((card, index) => (
                  <div key={index} className="river-card-container">
                    <div className={`river-card ${card.suit === "♠" || card.suit === "♣" ? "black" : "red"}`}>
                      <div className="card-value">{card.value}</div>
                      <div className="card-suit">{card.suit}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="direction-options">
                <button 
                  className="direction-btn"
                  onClick={() => selectDirection("leftToRight")}
                >
                  <div className="direction-arrow">←</div>
                  <div className="direction-label">Gauche vers Droite</div>
                  <div className="direction-start-indicator">Démarrer ici</div>
                </button>
                <button 
                  className="direction-btn"
                  onClick={() => selectDirection("rightToLeft")}
                >
                  <div className="direction-arrow">→</div>
                  <div className="direction-label">Droite vers Gauche</div>
                  <div className="direction-start-indicator">Démarrer ici</div>
                </button>
              </div>
            </div>
          )}

          {/* Guessing Game */}
          {autorouteState.guessing && (
            <div className="guessing-game">
              <h3>Devinez: plus petit ou plus grand?</h3>

              {/* Deck on top */}
              <div className="autoroute-deck"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div className="indications-align" >
                  <div className="swipe-instruction">
                    Plus petit
                  </div>
                  <div
                    ref={cardRef}
                    className="deck-card"
                    style={{
                      transform: `translateX(${dragState.offsetX}px)`
                    }}
                  >
                    {/* Show drawn card if available, otherwise show card back */}
                    {autorouteState.drawnCard ? (
                      <div className={`drawn-card ${autorouteState.drawnCard.suit === "♠" || autorouteState.drawnCard.suit === "♣" ? "black" : "red"
                        }`}>
                        <div className="card-value">{autorouteState.drawnCard.value}</div>
                        <div className="card-suit">{autorouteState.drawnCard.suit}</div>
                      </div>
                    ) : (
                      <div className="card-back"></div>
                    )}
                  </div>
                  <div className="swipe-instruction">
                    Plus grand
                  </div>
                </div>
                <div className="swipe-instruction">
                  Faites glisser
                </div>
              </div>

              {/* River displayed vertically with dragged card preview */}
              <div className="autoroute-river vertical">
                {autorouteState.river.map((card, index) => {
                  // Find any correct guess for this position
                  const correctGuess = autorouteState.guessHistory.find(
                    g => g.position === index && g.correct
                  );

                  return (
                    <div key={index} className="river-card-container">
                      {/* Show lower guess on the left */}
                      {correctGuess && correctGuess.guess === "lower" && (
                        <div className="guessed-card-left">
                          <div className={`drawn-card-face ${correctGuess.drawnCard.suit === "♠" || correctGuess.drawnCard.suit === "♣" ? "black" : "red"
                            }`}>
                            <div className="card-value">{correctGuess.drawnCard.value}</div>
                            <div className="card-suit">{correctGuess.drawnCard.suit}</div>
                          </div>
                        </div>
                      )}

                      {/* Preview card on the left while dragging */}
                      {index === autorouteState.currentPosition && dragState.direction === 'left' && !autorouteState.drawnCard && (
                        <div className="preview-card preview-left">
                          <div className="card-back"></div>
                        </div>
                      )}

                      {/* The actual river card */}
                      <div
                        className={`river-card ${index === autorouteState.currentPosition ? 'current' : ''
                          } ${card.suit === "♠" || card.suit === "♣" ? "black" : "red"}`}
                      >
                        <div className="card-value">{card.value}</div>
                        <div className="card-suit">{card.suit}</div>
                      </div>

                      {/* Preview card on the right while dragging */}
                      {index === autorouteState.currentPosition && dragState.direction === 'right' && !autorouteState.drawnCard && (
                        <div className="preview-card preview-right">
                          <div className="card-back"></div>
                        </div>
                      )}

                      {/* Show higher guess on the right */}
                      {correctGuess && correctGuess.guess === "higher" && (
                        <div className="guessed-card-right">
                          <div className={`drawn-card-face ${correctGuess.drawnCard.suit === "♠" || correctGuess.drawnCard.suit === "♣" ? "black" : "red"
                            }`}>
                            <div className="card-value">{correctGuess.drawnCard.value}</div>
                            <div className="card-suit">{correctGuess.drawnCard.suit}</div>
                          </div>
                        </div>
                      )}

                      {/* Drawn card preview during guess */}
                      {index === autorouteState.currentPosition && autorouteState.drawnCard && (
                        <div className={`drawn-preview-card ${dragState.direction === 'left' ? 'preview-left' : 'preview-right'} ${autorouteState.drawnCard.suit === "♠" || autorouteState.drawnCard.suit === "♣" ? "black" : "red"
                          }`}>
                          <div className="card-value">{autorouteState.drawnCard.value}</div>
                          <div className="card-suit">{autorouteState.drawnCard.suit}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Restart overlay */}
              {autorouteState.showRestartOverlay && (
                <div className="restart-overlay" onClick={handleRestart}>
                  <p className="restart-info">Vous devez boire {autorouteState.guessHistory.length} à cause de votre échec</p>
                  <div className="restart-message">
                    Recommencer
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Zone de jeu - only show if not in autoroute */}
      {!autorouteState.active && (
        <div className="game-center">
          <div className="played-cards">
            <h3>Dernière carte jouée</h3>
            {lastCard ? (
              <div
                className={`played-card ${lastCard.suit === "♠" || lastCard.suit === "♣" ? "black" : "red"
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
      )}

      {/* Mes cartes (si je n'ai pas perdu/gagné et pas dans autoroute) */}
      {!myPlayer.hasLost && !myPlayer.hasWon && !autorouteState.active && (
        <div className="game-bottom">
          <h3>Vos cartes</h3>
          <div className="cards-list">
            {myPlayer.cards?.map((card, idx) => (
              <div
                key={idx}
                className={`player-card ${card.suit === "♠" || card.suit === "♣" ? "black" : "red"
                  }`}
                onClick={() => {
                  if (myTurn && !isGameOver) {
                    playCard(card);
                  } else {
                    toast((t) => (
                      <span onClick={() => toast.dismiss(t.id)}>
                        Ce n'est pas votre tour !
                      </span>
                    ),
                      {
                        icon: "🚫",
                        duration: 3000,
                      });
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
