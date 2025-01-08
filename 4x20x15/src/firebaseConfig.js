import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

// Configuration de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyArMCsutRol8mHHpZPl6LP9cYGMlGuANTU",
  authDomain: "x4x20x15x.firebaseapp.com",
  projectId: "x4x20x15x",
  storageBucket: "x4x20x15x.firebasestorage.app",
  messagingSenderId: "189364940134",
  appId: "1:189364940134:web:1962d7039b8c8098382ca7",
  measurementId: "G-F12CKVZ849",
};

// Initialisation de Firebase, Firebase Auth, Google Auth Provider et Firestore
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

export { collection, doc, getDoc, setDoc, updateDoc, deleteDoc };
