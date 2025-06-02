import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage.js";
import HomePage from "./pages/HomePage.js";
import ProfilePage from "./pages/ProfilePage.js";
import RoomPage from "./pages/RoomPage.js";
import GamePage from "./pages/GamePage.js";

const App = () => {
  const isAuthenticated = !!localStorage.getItem("user"); // Vérifie si un utilisateur est connecté

  // Définition des routes:
  // - Si l'utilisateur est connecté, redirige vers la page d'accueil
  // - Sinon, redirige vers la page de connexion
  // - Les autres routes nécessitent une connexion
  return (
    <Routes>
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/home" /> : <AuthPage />}
      />
      <Route
        path="/home"
        element={isAuthenticated ? <HomePage /> : <Navigate to="/" />}
      />
      <Route
        path="/profile"
        element={isAuthenticated ? <ProfilePage /> : <Navigate to="/" />}
      />
      <Route
        path="/room"
        element={isAuthenticated ? <RoomPage /> : <Navigate to="/" />}
      />
      <Route 
        path="/room/:roomId"
        element={isAuthenticated ? <RoomPage /> : <Navigate to="/" />}
      />
      <Route
        path="/game/:id"
        element={isAuthenticated ? <GamePage /> : <Navigate to="/" />}
      />
    </Routes>
  );
};

export default App;
