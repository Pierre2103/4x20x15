Pour créer une version MVP (Minimum Viable Product) fonctionnant en local, voici les étapes détaillées pour démarrer le projet **"4x20+15"**. L'objectif est de se concentrer sur les fonctionnalités de base en utilisant les cartes SVG que tu as déjà.

---

## **Étape 1 : Préparer l'environnement**
1. **Installer les outils nécessaires :**
   - **Node.js** : Installe la dernière version de Node.js.
   - **MariaDB** : Installe MariaDB pour la base de données.
   - **Git** : Utilise Git pour le suivi de version en local.

2. **Initialiser le projet :**
   - Crée un dossier pour le projet : `mkdir 4x20+15 && cd 4x20+15`
   - Initialise un projet Node.js : `npm init -y`
   - Installe les dépendances nécessaires :
     ```bash
     npm install express sequelize mariadb dotenv socket.io
     npm install --save-dev nodemon
     ```
   - Initialise un projet React pour le frontend :
     ```bash
     npx create-react-app frontend
     ```

3. **Créer la structure de fichiers :**
   Organise ton projet comme suit :
   ```plaintext
   4x20+15/
   ├── backend/
   │   ├── models/
   │   ├── routes/
   │   ├── socket/
   │   ├── services/
   │   ├── app.js
   │   └── config.js
   ├── frontend/
   ├── cards/ (contient les fichiers SVG des cartes)
   ├── database/
   │   ├── migrations/
   │   └── seeders/
   ├── .env
   ├── package.json
   └── README.md
   ```

---

## **Étape 2 : Backend**
1. **Configurer la base de données :**
   - Crée une base de données MariaDB nommée `game_db`, en utilisant DBeaver ou une commande SQL :
     ```sh
      mysql -u root -prootroot
      ```
      ```sql
      CREATE DATABASE game_db;
      ```
   - Dans le fichier `.env`, ajoute les variables suivantes :
     ```env
     DB_HOST=localhost
     DB_USER=root
     DB_PASSWORD=ton_mot_de_passe
     DB_NAME=game_db
     PORT=3000
     ```

2. **Configurer Sequelize :**
   - Crée un fichier `backend/config.js` pour connecter Sequelize à la base de données :
     ```javascript
     const { Sequelize } = require('sequelize');
     require('dotenv').config();

     const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
       host: process.env.DB_HOST,
       dialect: 'mariadb',
     });

     module.exports = sequelize;
     ```

3. **Créer les modèles :**
   - Modèle `User` dans `backend/models/User.js` :
     ```javascript
     const { DataTypes } = require('sequelize');
     const sequelize = require('../config');

     const User = sequelize.define('User', {
       username: { type: DataTypes.STRING, unique: true, allowNull: false },
       email: { type: DataTypes.STRING, unique: true, allowNull: false },
       password: { type: DataTypes.STRING, allowNull: false },
     });

     module.exports = User;
     ```

   - Modèle `Room` et `Game` dans des fichiers similaires.

4. **Créer l’API de base :**
   - Dans `backend/app.js`, configure un serveur Express :
     ```javascript
     const express = require('express');
     const sequelize = require('./config');
     const app = express();
     const PORT = process.env.PORT || 3000;

     app.use(express.json());

     app.get('/', (req, res) => res.send('4x20+15 API Running'));

     sequelize.sync().then(() => {
       app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
     });
     ```

5. **Ajouter les routes pour les utilisateurs et les salles :**
   - Crée `backend/routes/userRoutes.js` :
     ```javascript
     const express = require('express');
     const router = express.Router();

     // Exemple : Endpoint de création d'utilisateur
     router.post('/register', async (req, res) => {
       // Logique de création d'utilisateur
       res.send('Utilisateur créé');
     });

     module.exports = router;
     ```

   - Ajoute ces routes à `app.js` :
     ```javascript
     const userRoutes = require('./routes/userRoutes');
     app.use('/api/users', userRoutes);
     ```

6. **Configurer Socket.IO pour les mises à jour en temps réel :**
   - Dans `backend/socket/gameSocket.js` :
     ```javascript
     module.exports = (io) => {
       io.on('connection', (socket) => {
         console.log('Nouveau joueur connecté');

         socket.on('play-card', (data) => {
           io.emit('update-game', data);
         });
       });
     };
     ```
   - Modifie `app.js` pour inclure Socket.IO :
     ```javascript
     const http = require('http');
     const { Server } = require('socket.io');
     const gameSocket = require('./socket/gameSocket');

     const server = http.createServer(app);
     const io = new Server(server);

     gameSocket(io);

     server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
     ```

---

## **Étape 3 : Frontend**
1. **Configurer les écrans principaux :**
   - Crée les fichiers suivants dans `frontend/src/screens/` :
     - `HomeScreen.js` : Formulaire de connexion.
     - `GameScreen.js` : Affiche les cartes et le plateau de jeu.

2. **Afficher les cartes SVG :**
   - Dans `GameScreen.js` :
     ```javascript
     import React from 'react';
     import '../styles/GameScreen.css';

     const GameScreen = () => {
       return (
         <div className="game-container">
           <img src="/cards/2C.svg" alt="2 of Clubs" />
           <img src="/cards/3H.svg" alt="3 of Hearts" />
         </div>
       );
     };

     export default GameScreen;
     ```

3. **Ajouter les styles :**
   - Crée `frontend/src/styles/GameScreen.css` :
     ```css
     .game-container {
       display: flex;
       justify-content: center;
       align-items: center;
       gap: 10px;
     }

     .game-container img {
       width: 100px;
       height: auto;
     }
     ```

4. **Configurer la navigation :**
   - Utilise React Router pour naviguer entre les écrans :
     ```javascript
     import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
     import HomeScreen from './screens/HomeScreen';
     import GameScreen from './screens/GameScreen';

     const App = () => (
       <Router>
         <Routes>
           <Route path="/" element={<HomeScreen />} />
           <Route path="/game" element={<GameScreen />} />
         </Routes>
       </Router>
     );

     export default App;
     ```

---

## **Étape 4 : Tester le MVP**
1. **Lancer le backend :**
   - Depuis le dossier `backend` :
     ```bash
     nodemon app.js
     ```

2. **Lancer le frontend :**
   - Depuis le dossier `frontend` :
     ```bash
     npm start
     ```

3. **Tester les fonctionnalités :**
   - Vérifie que l’API fonctionne (ex. : `http://localhost:3000`).
   - Vérifie que le frontend affiche les cartes correctement.

---

## **Étape 5 : Ajouter la logique du jeu**
1. Crée une logique de base dans le backend pour gérer :
   - Les salles (création, rejoindre).
   - Les états des parties (valeur totale des cartes).
   - Les règles de base (jouer une carte, piocher une carte).

2. Connecte le frontend au backend via des WebSockets pour mettre à jour l’interface en temps réel.

---

## Prochaines Étapes
Une fois le MVP terminé, tu pourras :
- Améliorer l’interface utilisateur.
- Ajouter des fonctionnalités avancées comme les pénalités et les règles spéciales.
- Tester avec plusieurs joueurs.