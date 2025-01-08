# Documentation du projet "4x20+15"
---

## Introduction

**"4x20+15"** est un jeu multijoueur en temps réel où les joueurs s'affrontent pour ne pas atteindre un total de 95 ou plus sur les cartes au centre. Le projet utilise Node.js pour le backend, React pour le frontend, Socket.IO pour la communication en temps réel, Firebase pour la base de données et devra être déployé sur un Raspberry Pi avec une approche CI/CD.

---

## Comment jouer

1. Les joueurs créent un compte et peuvent ajouter des amis.
2. Un joueur peut créer une room et inviter des amis ou partager un code d'invitation.
3. Les paramètres de la room (nombre de joueurs, nombre de decks, regles speciales, etc...) peuvent être configurés.
4. Le jeu commence avec une carte au centre et chaque joueur reçoit 3 cartes.
5. Les joueurs jouent une carte et doivent annoncer le total des cartes par tour et en tirent une nouvelle.
6. Le total des cartes au centre est calculé et les règles spéciales sont appliquées.
7. Si un joueur atteint 95 ou plus, il perd.
8. Des règles spéciales influencent la stratégie (cartes spéciales comme le Roi, la Dame, et le Valet).

---

## Structure du projet

```plaintext
.github/
   └── workflows/
       └── tests.yml
4x20x15/
├── backend/
│   ├── app.js
│   ├── __tests__/
│   │   ├── game.test.js
│   │   ├── helpers.test.js
│   │   └── room.test.js
│   ├── config/
│   │   └── serverConfig.js
│   ├── socket/
│   │   ├── game.js
│   │   ├── index.js
│   │   ├── room.js
│   │   └── user.js
│   ├── utils/
│   │   ├── firebaseUtils.js
│   │   └── helpers.js
│   └── app.js
├── public/
│   └── index.html
├── src/
│   ├── img/
│   │   ├── cards/
│   │   │   ├── 2C.svg
│   │   │   ├── AD.svg
│   │   │   ├── JH.svg
│   │   │   ├── QS.svg
│   │   │   └── ...
│   │   └── icons/
│   │       ├── arrow-back.svg
│   │       ├── cancel.svg
│   │       └── google.png
│   ├── pages/
│   │   ├── AuthPage.js
│   │   ├── GamePage.js
│   │   ├── HomePage.js
│   │   ├── ProfilePage.js
│   │   └── RoomPage.js
│   ├── styles/
│   │   ├── AuthPage.scss
│   │   ├── GamePage.scss
│   │   ├── HomePage.scss
│   │   ├── ProfilePage.scss
│   │   └── RoomPage.scss
│   ├── App.js
│   ├── firebaseConfig.js
│   └── index.js
├── .env
├── babel.config.json
├── jest.config.js
└── package.json
```

---

## Routes Frontend

```javascript
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage.js";
import HomePage from "./pages/HomePage.js";
import ProfilePage from "./pages/ProfilePage.js";
import RoomPage from "./pages/RoomPage.js";
import GamePage from "./pages/GamePage.js";

const App = () => {
  const isAuthenticated = !!localStorage.getItem("user");

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
        path="/game/:id"
        element={isAuthenticated ? <GamePage /> : <Navigate to="/" />}
      />
    </Routes>
  );
};

export default App;
```

---

## Logique du jeu

### Cartes spéciales
- **Roi (K)** : Fixe le total à 70.
- **Dame (Q)** : Retire 10 au total.
- **Valet (J)** : Change la direction du jeu.

### Simulation d'une partie entre 3 joueurs

#### Configuration initiale :
- **Player1** : `[2, 5, 10]`, **Player2** : `[7, 8, 9]`, **Player3** : `[3, 4, 6]`
- **Carte au centre** : `7`, **Sens** : Horaire

---

#### Déroulement :

1. **Player1** joue `5` → Total = `12`, pioche `3`. (main : `[2, 10, 3]`)
   **Player2** joue `9` → Total = `21`, pioche `6`. (main : `[7, 8, 6]`)
   **Player3** joue `6` → Total = `27`, pioche `2`. (main : `[3, 4, 2]`)

2. **Player1** joue `10` → Total = `37`, pioche `8`. (main : `[2, 3, 8]`)
   **Player2** joue `8` → Total = `45`, pioche `4`. (main : `[7, 6, 4]`)
   **Player3** joue `4` → Total = `49`, pioche `10`. (main : `[3, 2, 10]`)

3. **Player1** joue `2` → Total = `51`, pioche `5`. (main : `[3, 8, 5]`)
   **Player2** joue `7` → Total = `58`, pioche `9`. (main : `[6, 4, 9]`)
   **Player3** joue `3` → Total = `61`, pioche `K` (Roi). (main : `[2, 10, K]`)

4. **Player1** joue `3` → Total = `64`, pioche `J` (Valet). (main : `[8, 5, J]`)
   **Player2** joue `6` → Total = `70`, pioche `Q` (Dame), pénalité à **Player3**. (main : `[4, 9, Q]`) 
   **Player3** joue `K` (Roi) → Total = `70`, pioche `7`, pénalité à **Player1**. (main : `[10, K, 7]`)

5. **Player1** joue `J` (Valet) → Total = `70`, sens change (Anti-horaire), pioche `9`. (main : `[5, J, 9]`)
   **Player3** joue `Q` (Dame) → Total = `60`, pioche `6`, pénalité à **Player2**. (main : `[K, 7, 6]`)
   **Player2** joue `4` → Total = `64`, pioche `8`. (main : `[9, Q, 8]`)

6. **Player1** joue `5` → Total = `69`, pioche `7`. (main : `[J, 9, 7]`)
   **Player3** joue `6` → Total = `75`, pioche `4`. (main : `[7, 6, 4]`)
   **Player2** joue `8` → Total = `83`, pioche `10`. (main : `[Q, 8, 10]`)

7. **Player1** joue `7` → Total = `90`, pioche `5`, pénalité à **Player3**. (main : `[9, 7, 5]`)
   **Player3** joue `4` → Total = `94`, pioche `9`. (main : `[6, 4, 9]`)
   **Player2** joue `10` → Total = `104`. (Player2 perd)

### Avancement du projet:

- [-] Authentification
  - [x] Création de compte
  - [x] Connexion
  - [x] Déconnexion
  - [x] Mot de passe oublié
  - [ ] Profil
    - [ ] Modifier le mot de passe 
    - [ ] Supprimer le compte
    - [x] Modifier le pseudo
    - [x] Modifier l'avatar
    - [ ] Historique des parties
    - [ ] Statistiques
- [ ] Amis
    - [ ] Ajouter un ami
    - [ ] Supprimer un ami
    - [ ] Inviter un ami dans une room
    - [ ] Rejoindre une room d'un ami
- [-] Rooms
    - [x] Créer une room
    - [x] Rejoindre une room
    - [ ] Paramètres de la room
    - [ ] Inviter des amis
    - [ ] Partager un code d'invitation
    - [x] Quitter une room
    - [x] Exclure un joueur de la room
- [ ] Jeu
    - [ ] Distribution des cartes
    - [ ] Jouer une carte
    - [ ] Piocher une carte
    - [ ] Calcul du total
    - [ ] Gestion des cartes spéciales
    - [ ] Gestion du sens du jeu
    - [ ] Fin de partie
    - [ ] Gestion des scores
    - [ ] Historique des tours
    - [ ] Compteur de pénalités
    - [ ] Limite de temps par tour
- [-] Design
    - [x] Authentification Page
    - [x] Home Page
    - [x] Profile Page
    - [x] Room Page 
    - [ ] Game Page