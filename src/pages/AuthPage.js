//? src/pages/AuthPage.js
import React, { useState } from "react";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore"; // Import Firestore functions
import { auth, googleProvider, db } from "../firebaseConfig.js"; // Import Firestore
import "../styles/AuthPage.scss";
import google_logo from "../img/icons/google.png";

const AuthPage = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Crée un utilisateur dans Firestore s'il n'existe pas
  const createUserInFirestore = async (user, isGoogle = false) => {
    const userDoc = doc(db, "users", user.uid);
    const userSnapshot = await getDoc(userDoc);

    if (!userSnapshot.exists()) {
      const avatar = Math.random().toString(36).substring(2, 10); // Chaîne aléatoire pour l'avatar
      await setDoc(userDoc, {
        uid: user.uid,
        username: isGoogle
          ? user.displayName || "Utilisateur"
          : "Nouvel utilisateur",
        email: user.email,
        avatar: avatar,
      });
    }
  };

  // Connexion avec email et mot de passe
  const handleLoginWithEmail = async () => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;
      localStorage.setItem("user", JSON.stringify(user)); // Stocke l'utilisateur
      window.location.href = "/home";
    } catch (error) {
      console.error("Erreur de connexion :", error.message);
      alert("Erreur de connexion : " + error.message);
    }
  };

  // Inscription avec email et mot de passe
  const handleRegisterWithEmail = async () => {
    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = result.user;

      await createUserInFirestore(user);

      localStorage.setItem("user", JSON.stringify(user)); // Stocke l'utilisateur
      window.location.href = "/home";
    } catch (error) {
      console.error("Erreur d'inscription :", error.message);
      alert("Erreur d'inscription : " + error.message);
    }
  };

  // Connexion avec Google
  const handleLoginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      await createUserInFirestore(user, true);

      localStorage.setItem("user", JSON.stringify(user)); // Stocke l'utilisateur
      window.location.href = "/home";
    } catch (error) {
      console.error("Erreur de connexion avec Google :", error.message);
      alert("Erreur de connexion avec Google : " + error.message);
    }
  };

  return (
    <div className="auth-page">
      <h1>{isRegistering ? "Inscription" : "Connexion"}</h1>
      <input
        type="email"
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
        id="email"
      />
      <br />
      <input
        type="password"
        placeholder="Mot de passe"
        onChange={(e) => setPassword(e.target.value)}
        id="password"
      />
      <br />
      <button
        onClick={isRegistering ? handleRegisterWithEmail : handleLoginWithEmail}
      >
        {isRegistering ? "S'inscrire" : "Se connecter"}
      </button>
      <br />
      <button onClick={handleLoginWithGoogle} className="google-button">
        <img src={google_logo} alt="Google" />
      </button>
      <br />
      <p onClick={() => setIsRegistering(!isRegistering)}>
        {isRegistering
          ? "Déjà un compte ? Connectez-vous ici"
          : "Pas encore de compte ? Inscrivez-vous ici"}
      </p>
    </div>
  );
};

export default AuthPage;
