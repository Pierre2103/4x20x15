import React from "react";
import { useParams } from "react-router-dom";

const GamePage = () => {
  const { id } = useParams();

  return (
    <div>
      <h1>Bienvenue dans la partie</h1>
      <h2>Room ID : {id}</h2>
      {/* Logique du jeu ici */}
    </div>
  );
};

export default GamePage;
