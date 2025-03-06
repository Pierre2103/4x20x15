//? src/pages/ProfilePage.js
import React, { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig.js";
import { update as jdenticonUpdate } from "jdenticon";
import { onAuthStateChanged } from "firebase/auth";
import "../styles/ProfilePage.scss";
import arrow_back from "../img/icons/arrow-back.svg";

const ProfilePage = () => {
  const [username, setUsername] = useState(""); // État pour le pseudo
  const [avatar, setAvatar] = useState(""); // État pour l'avatar
  const [isLoading, setIsLoading] = useState(true); // État pour le chargement

  // Génère un avatar aléatoire
  const generateRandomAvatar = async () => {
    try {
      const randomString = Math.random().toString(36).substring(2, 10);
      setAvatar(randomString);

      const userDoc = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userDoc, { avatar: randomString });
    } catch (error) {
      console.error(
        "Erreur lors de la génération de l'avatar :",
        error.message
      );
    }
  };

  // Met à jour le pseudo dans Firestore
  const updateUsername = async () => {
    if (!auth.currentUser || !username.trim()) return;
    const userDoc = doc(db, "users", auth.currentUser.uid);

    try {
      await updateDoc(userDoc, { username });
    } catch (error) {
      console.error("Erreur de mise à jour du pseudo :", error.message);
    }
  };

  // TODO: Pouvoir changer le thème de couleur et switcher entre dark et light mode
  // TODO: Enregistrer le thème de couleur dans Firestore pour chaque utilisateur
  const changeColorTheme = () => {
    var r = document.querySelector(':root');
    var rootStyles = getComputedStyle(r);
    var colorRed = rootStyles.getPropertyValue('--primary-red');
    var colorGreen = rootStyles.getPropertyValue('--primary-green');
    var colorBlue = rootStyles.getPropertyValue('--primary-blue');
    var colorYellow = rootStyles.getPropertyValue('--primary-yellow');
    var currentColor = rootStyles.getPropertyValue('--primary');
  };


  // Déconnexion de l'utilisateur
  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  // Charge les données utilisateur
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const fetchUserData = async () => {
          try {
            const userDoc = doc(db, "users", user.uid);
            const userSnapshot = await getDoc(userDoc);

            if (userSnapshot.exists()) {
              const userData = userSnapshot.data();
              setUsername(userData.username || ""); // Définit le pseudo
              setAvatar(userData.avatar || "default"); // Définit l'avatar
            } else {
              console.error("Aucune donnée utilisateur trouvée dans Firestore");
            }
          } catch (error) {
            console.error(
              "Erreur lors du chargement des données utilisateur :",
              error.message
            );
          } finally {
            setIsLoading(false);
          }
        };

        fetchUserData();
      } else {
        console.error("Utilisateur non connecté");
        setIsLoading(false);
      }
    });

    return () => unsubscribe(); // Nettoyage du listener
  }, []);

  // Met à jour l'avatar avec Jdenticon
  useEffect(() => {
    if (avatar && typeof avatar === "string" && avatar.trim() !== "") {
      setTimeout(() => {
        jdenticonUpdate(".avatar");
      }, 0); // obligatoire pour que Jdenticon fonctionne correctement
    }
  }, [avatar]);

  if (isLoading) return <p>Chargement...</p>;
  if (!auth.currentUser)
    return <p>Veuillez vous connecter pour accéder à cette page.</p>;

  return (
    <div>
      <button
        className="back-button"
        onClick={() => (window.location.href = "/home")}
      >
        <img src={arrow_back} alt="Retour" />
      </button>
      <div className="profile-page">
        <h1>Profil</h1>
        <div className="avatar-section">
          <label>Avatar :</label>
          <div className="avatar-body">
            <button onClick={generateRandomAvatar}>
              Générer un autre avatar
            </button>
            <svg
              className="avatar"
              data-jdenticon-value={avatar || "default"}
              width="60"
              height="60"
            />
          </div>
        </div>
        <div className="username-section">
          <label htmlFor="username">Pseudo :</label>
          <div className="username-body">
            <input
              type="text"
              id="username"
              value={username} // État local
              onChange={(e) => setUsername(e.target.value)} // Mise à jour en temps réel
            />
            <button onClick={updateUsername}>OK</button>
          </div>
        </div>

        <button className="logout-button" onClick={handleLogout}>
          Déconnexion
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
