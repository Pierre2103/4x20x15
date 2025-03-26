//? src/pages/AuthPage.js
import React, { useState, useEffect } from "react"; // Add useEffect
import { doc, setDoc, getDoc } from "firebase/firestore"; // Import Firestore functions
import { db } from "../firebaseConfig.js"; // Import Firestore
import "../styles/AuthPage.scss";
import { v4 as uuidv4 } from 'uuid'; // Import UUID library
import { update as jdenticonUpdate } from "jdenticon"; // Import Jdenticon

const AuthPage = () => {
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("");

  // Génère un avatar aléatoire
  const generateRandomAvatar = () => {
    const randomString = Math.random().toString(36).substring(2, 10);
    setAvatar(randomString);
    if (avatar && typeof avatar === "string" && avatar.trim() !== "") {
      setTimeout(() => {
        jdenticonUpdate(".avatar");
      }, 0); // obligatoire pour que Jdenticon fonctionne correctement
    }  };

  useEffect(() => {
    generateRandomAvatar(); // Call the function on component mount
  }, []);

  useEffect(() => {
    if (avatar && typeof avatar === "string" && avatar.trim() !== "") {
      jdenticonUpdate(".avatar"); // Update the avatar whenever it changes
    }
  }, [avatar]);

  // Crée un utilisateur dans Firestore s'il n'existe pas
  const createUserInFirestore = async (userId, username) => {
    const userDoc = doc(db, "users", userId);
    const userSnapshot = await getDoc(userDoc);

    if (!userSnapshot.exists()) {
      await setDoc(userDoc, {
        userId: userId,
        username: username,
        avatar: avatar,
      });
    }
  };

  // Connexion avec le nom d'utilisateur
  const handleLoginWithUsername = async () => {
    try {
      let userId = localStorage.getItem("userId");
      if (!userId) {
        userId = uuidv4(); // Génère un nouvel ID unique
        localStorage.setItem("userId", userId);
      }

      await createUserInFirestore(userId, username);

      localStorage.setItem("user", JSON.stringify({ userId, username })); // Stocke l'utilisateur
      window.location.href = "/home";
    } catch (error) {
      console.error("Erreur de connexion :", error.message);
      alert("Erreur de connexion : " + error.message);
    }
  };

  return (
    <div className="auth-page">
      <h1>Connexion</h1>
      <div className="avatar-section">
        <div className="avatar-body">
          <svg
            className="avatar"
            data-jdenticon-value={avatar || "default"}
            width="120"
            height="120"
            onClick={generateRandomAvatar}
          />
        </div>
      </div>
      <input
        type="text"
        placeholder="Nom d'utilisateur"
        onChange={(e) => setUsername(e.target.value)}
        id="username"
      />
      <br />
      <button
        onClick={handleLoginWithUsername}
      >
        Se connecter
      </button>
      <br />
    </div>
  );
};

export default AuthPage;
