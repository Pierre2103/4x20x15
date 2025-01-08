import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, updateDoc,  deleteDoc, collection } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyArMCsutRol8mHHpZPl6LP9cYGMlGuANTU",
  authDomain: "x4x20x15x.firebaseapp.com",
  projectId: "x4x20x15x",
  storageBucket: "x4x20x15x.firebasestorage.app",
  messagingSenderId: "189364940134",
  appId: "1:189364940134:web:1962d7039b8c8098382ca7",
  measurementId: "G-F12CKVZ849",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and Google Provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore
export const db = getFirestore(app); // Export de Firestore


export { doc, setDoc, updateDoc, getDoc, collection, deleteDoc};