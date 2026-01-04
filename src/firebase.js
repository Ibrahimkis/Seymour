// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// PASTE YOUR CONFIG FROM FIREBASE CONSOLE HERE
const firebaseConfig = {
  apiKey: "AIzaSyD5BH-AIehT136mJz90wp3QZ1xAgA8ToIQ",
  authDomain: "seymour-feedmelore.firebaseapp.com",
  projectId: "seymour-feedmelore",
  storageBucket: "seymour-feedmelore.firebasestorage.app",
  messagingSenderId: "928135531898",
  appId: "1:928135531898:web:56838880af98518e1e1ac3",
  measurementId: "G-DES465RL3Y"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);