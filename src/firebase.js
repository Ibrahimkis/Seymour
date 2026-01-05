// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Detect if running in Electron
const isElectron = () => {
  return window.electronAPI !== undefined;
};

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

// Only initialize Firebase if NOT running in Electron
let app = null;
let auth = null;
let googleProvider = null;
let db = null;

if (!isElectron()) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  db = getFirestore(app);
}

export { auth, googleProvider, db, isElectron };