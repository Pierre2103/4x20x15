import { db, doc, getDoc, setDoc, updateDoc, deleteDoc, collection } from "../../src/firebaseConfig.js";

// Récupère un document Firestore
export const getDocument = async (collectionName, docId) => {
  const docRef = doc(db, collectionName, docId);
  const snapshot = await getDoc(docRef);
  return snapshot.exists() ? snapshot.data() : null;
};

// Met à jour un document Firestore
export const updateDocument = async (collectionName, docId, data) => {
  const docRef = doc(db, collectionName, docId);
  await updateDoc(docRef, data);
};

// Supprime un document Firestore
export const deleteDocument = async (collectionName, docId) => {
  const docRef = doc(db, collectionName, docId);
  await deleteDoc(docRef);
};

// Ajoute un document Firestore
export const addDocument = async (collectionName, docId, data) => {
  const docRef = doc(collection(db, collectionName), docId);
  await setDoc(docRef, data);
};
