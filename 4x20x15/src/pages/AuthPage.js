import React, { useState } from "react";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore"; // Import Firestore functions
import { auth, googleProvider, db } from "../firebaseConfig"; // Import Firestore
import "../styles/AuthPage.scss";

const AuthPage = () => {
  const [isRegistering, setIsRegistering] = useState(false);

  // Fonction pour ajouter un utilisateur dans Firestore
  const createUserInFirestore = async (user, isGoogle = false) => {
    const userDoc = doc(db, "users", user.uid);

    // Vérifie si l'utilisateur existe déjà
    const userSnapshot = await getDoc(userDoc);
    if (!userSnapshot.exists()) {
      const avatar = Math.random().toString(36).substring(2, 10); // Chaîne aléatoire pour l'avatar
      await setDoc(userDoc, {
        uid: user.uid,
        username: isGoogle ? user.displayName || "Utilisateur" : "Nouvel utilisateur",
        email: user.email,
        avatar: avatar,
      });
    }
  };

  // Connexion avec email et mot de passe
  const handleLoginWithEmail = async () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
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
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;

      // Ajout dans Firestore
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

      // Ajout dans Firestore
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
      <input type="email" placeholder="Email" id="email" />
      <br />
      <input type="password" placeholder="Mot de passe" id="password" />
      <br />
      <button onClick={isRegistering ? handleRegisterWithEmail : handleLoginWithEmail}>
        {isRegistering ? "S'inscrire" : "Se connecter"}
      </button>
      <br />
      <button onClick={handleLoginWithGoogle}>
        {isRegistering ? "S'inscrire avec Google" : "Se connecter avec Google"}
      </button>
      <br />
      <p
        style={{ cursor: "pointer", color: "blue", textDecoration: "underline" }}
        onClick={() => setIsRegistering(!isRegistering)}
      >
        {isRegistering ? "Déjà un compte ? Connectez-vous ici" : "Pas encore de compte ? Inscrivez-vous ici"}
      </p>
    </div>
  );
};

export default AuthPage;
