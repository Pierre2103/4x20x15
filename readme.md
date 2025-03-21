# Projet de Jeu de Cartes - TODO List

## 🚀 Quick Start

1. **Cloner le dépôt** :

   ```sh
   git clone https://github.com/Pierre2103/4x20x15
   cd 4x20x15
   ```

2. **Installer les dépendances** :

   ```sh
   npm install
   ```

3. **Lancer le backend** :

   ```sh
   node backend/app.js
   ```

4. **Lancer le frontend (dans un autre terminal)** :

   ```sh
   npm start
   ```

## ✅ TODO List

### 🎮 Améliorations des Règles du Jeu

*Toutes les règles doivent pouvoir être activer/désactiver dans le jeu.*

- L'As peut valoir **1 ou 11** (au choix du joueur qui le pose).
- Si un joueur a **deux ou trois cartes identiques**, il doit pouvoir **les poser en même temps**.
- Un joueur peut **échanger une ou plusieurs cartes** avec un autre joueur (si ce dernier accepte).
- Cliquer sur la pioche pose directement la carte sur le deck.
- Si un joueur **tombe sur une dizaine** (10, 20, 30, etc.), il doit pouvoir **distribuer les pénalités** correspondantes à un ou plusieurs joueurs.
  - Exemple : Si J1 tombe sur 40, il peut donner 3 pénalités à J2 et 1 pénalité à J3.
- Si la pioche est vide, la **Dame et le Roi valent 1**.

**Ajouter l'autoroute en fin de partie**

### 🛠 Problèmes à Corriger

- **Problème des valets** :
  - Le valet saute toujours un joueur, ce qui pose problème en 1vs1 (le joueur rejoue en boucle).
  - Il faut adapter la mécanique pour les duels.

### 🎨 Améliorations de l'Interface Utilisateur

- Afficher la liste des joueurs **dans un ordre fixe** et permettre le **scroll**.
  - Exemple d'affichage de la file d'attente : **D, A, C, B, E** (A étant le joueur en train de jouer).
- Ajouter un **compteur de pénalités** pour chaque joueur.
- Supprimer le cumul des cartes.

### ⚙️ Améliorations Techniques

- Trouver une alternative à Firebase qui démarre et Sauvegarde la base de données sur le serveur.
- Faire en sorte que le programme **exécute le backend et le frontend en une seule commande**.
  - Éviter d'avoir à **lancer le backend et le frontend séparément**.
  - Éviter d'utiliser **deux ports différents** pour le backend et le frontend.
