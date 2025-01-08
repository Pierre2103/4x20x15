import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig.js";
import { update as jdenticonUpdate } from "jdenticon";
import "../styles/HomePage.scss";

const HomePage = () => {
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        console.log("UID utilisateur :", user.uid);
        try {
          const userDoc = doc(db, "users", user.uid);
          const userSnapshot = await getDoc(userDoc);

          if (userSnapshot.exists()) {
            console.log("Snapshot Firestore :", userSnapshot.exists(), userSnapshot.data());
            setUserData(userSnapshot.data());
          } else {
            console.error("Aucune donnée utilisateur trouvée dans Firestore.");
          }
        } catch (error) {
          console.error("Erreur lors de la récupération des données utilisateur :", error.message);
        }
      } else {
        console.error("Utilisateur non connecté.");
      }
      setIsLoading(false); // Marquer comme chargé
    });

    return () => unsubscribe(); // Nettoyer le listener
  }, []);

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
        <button className="play-button" onClick={() => (window.location.href = "/room")}>
          Jouer
        </button>
        <button className="profile-button" onClick={() => (window.location.href = "/profile")}>
          Profil
        </button>
        {/* <button className="logout-button" onClick={handleLogout}>
          Déconnexion
        </button> */}
      </div>
    </div>
  );
};

export default HomePage;
