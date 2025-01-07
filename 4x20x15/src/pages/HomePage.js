import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig.js";
import "../styles/HomePage.scss";

const HomePage = () => {
  const [userData, setUserData] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  // Charger les données utilisateur depuis Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const userDoc = doc(db, "users", uid);
      const userSnapshot = await getDoc(userDoc);

      if (userSnapshot.exists()) {
        setUserData(userSnapshot.data());
      }
    };

    fetchUserData();
  }, []);

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
      <button className="play-button" onClick={() => (window.location.href = "/room")}>
        Jouer
      </button>
      <button className="profile-button" onClick={() => (window.location.href = "/profile")}>
        Profil
      </button>
      <button className="logout-button" onClick={handleLogout}>
        Déconnexion
      </button>
    </div>
  );
};

export default HomePage;
