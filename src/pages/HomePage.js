import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig.js";
import { update as jdenticonUpdate } from "jdenticon";
import "../styles/HomePage.scss";

const HomePage = () => {
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Charge les données utilisateur
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser && storedUser.userId) {
      const fetchUserData = async () => {
        try {
          const userDoc = doc(db, "users", storedUser.userId);
          const userSnapshot = await getDoc(userDoc);

          if (userSnapshot.exists()) {
            setUserData(userSnapshot.data());
          } else {
            console.error("Aucune donnée utilisateur trouvée dans Firestore.");
          }
        } catch (error) {
          console.error(
            "Erreur lors de la récupération des données utilisateur :",
            error.message
          );
        }
        setIsLoading(false); // Marquer comme chargé
      };

      fetchUserData();
    } else {
      console.error("Utilisateur non connecté.");
      setIsLoading(false); // Marquer comme chargé
    }
  }, []);

  // Met à jour l'avatar avec Jdenticon
  useEffect(() => {
    if (userData) {
      setTimeout(() => jdenticonUpdate(".avatar"), 0);
    }
  }, [userData]);

  if (isLoading) {
    return <p>Chargement...</p>;
  }

  return (
    <div className="home-page">
      {userData && (
        <div className="user-info">
          <svg
            className="avatar"
            data-jdenticon-value={userData.avatar}
            width="100"
            height="100"
          ></svg>
          <h2>{userData.username}</h2>
        </div>
      )}
      <h1>Bienvenue sur 4x20+15</h1>
      <div className="button-group">
        <button
          className="play-button"
          onClick={() => (window.location.href = "/room")}
        >
          Jouer
        </button>
        <button
          className="profile-button"
          onClick={() => (window.location.href = "/profile")}
        >
          Profil
        </button>
      </div>
    </div>
  );
};

export default HomePage;
