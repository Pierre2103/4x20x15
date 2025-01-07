import React, { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig.js";
import { update as jdenticonUpdate } from "jdenticon";
import { onAuthStateChanged } from "firebase/auth";
import "../styles/ProfilePage.scss";

const ProfilePage = () => {
  const [username, setUsername] = useState(""); // État pour le pseudo
  const [avatar, setAvatar] = useState(""); // État pour l'avatar
  const [isLoading, setIsLoading] = useState(true); // État pour le chargement

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const fetchUserData = async () => {
          try {
            const userDoc = doc(db, "users", user.uid);
            const userSnapshot = await getDoc(userDoc);

            if (userSnapshot.exists()) {
              const userData = userSnapshot.data();
            //   console.log("Données utilisateur récupérées :", userData);
              setUsername(userData.username || ""); // Définit le pseudo
              setAvatar(userData.avatar || "default"); // Définit l'avatar
            } else {
              console.error("Aucune donnée utilisateur trouvée dans Firestore");
            }
          } catch (error) {
            console.error("Erreur lors du chargement des données utilisateur :", error.message);
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

  useEffect(() => {
    if (avatar && typeof avatar === "string" && avatar.trim() !== "") {
      setTimeout(() => {
        jdenticonUpdate(".avatar");
      }, 1); // obligatoire pour que Jdenticon fonctionne correctement
    }
  }, [avatar]);

  const updateUsername = async () => {
    if (!auth.currentUser || !username.trim()) return;
    const userDoc = doc(db, "users", auth.currentUser.uid);

    try {
      await updateDoc(userDoc, { username });
    //   alert("Pseudo mis à jour !");
    } catch (error) {
      console.error("Erreur de mise à jour du pseudo :", error.message);
    }
  };

  const generateRandomAvatar = async () => {
    try {
      const randomString = Math.random().toString(36).substring(2, 10);
      setAvatar(randomString);

      const userDoc = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userDoc, { avatar: randomString });
    //   alert("Avatar mis à jour !");
    } catch (error) {
      console.error("Erreur lors de la génération de l'avatar :", error.message);
    }
  };

  if (isLoading) return <p>Chargement...</p>;
  if (!auth.currentUser) return <p>Veuillez vous connecter pour accéder à cette page.</p>;

  return (
    <div className="profile-page">
      <h1>Profil</h1>
      <div className="avatar-section">
        <svg
          className="avatar"
          data-jdenticon-value={avatar || "default"}
          width="200"
          height="200"
        />
        <button onClick={generateRandomAvatar}>Générer un avatar</button>
      </div>
      <div className="username-section">
        <label htmlFor="username">Pseudo :</label>
        <input
          type="text"
          id="username"
          value={username} // État local
          onChange={(e) => setUsername(e.target.value)} // Mise à jour en temps réel
        />
        <button onClick={updateUsername}>Mettre à jour le pseudo</button>
      </div>
    </div>
  );
};

export default ProfilePage;
