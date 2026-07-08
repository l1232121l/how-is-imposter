import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase configuration from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyDOlgyWI7VrV-wJuSFEJxF5GyVqGPQzgYc",
  authDomain: "clear-tune-55xj8.firebaseapp.com",
  projectId: "clear-tune-55xj8",
  storageBucket: "clear-tune-55xj8.firebasestorage.app",
  messagingSenderId: "472052075417",
  appId: "1:472052075417:web:8bf2a81063ad83d6966108"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with the specific database ID if provided, otherwise default
// Our firebase-applet-config.json has firestoreDatabaseId: "ai-studio-ffb783e5-898c-4cc7-8933-eafa58e060d1"
export const db = getFirestore(app, "ai-studio-ffb783e5-898c-4cc7-8933-eafa58e060d1");
