// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDhJEvTPnukWKcwUi2-exLQg2USvPa3zPg",
  authDomain: "support-assistant-99757.firebaseapp.com",
  projectId: "support-assistant-99757",
  storageBucket: "support-assistant-99757.appspot.com",
  messagingSenderId: "489453061505",
  appId: "1:489453061505:web:cecd5b268538709e561480"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
