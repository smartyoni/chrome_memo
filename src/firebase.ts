import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyB8XHkT_DedTncHBUSu8d5AwjJLXqDFP2g",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "smartrealapp.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "smartrealapp",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "smartrealapp.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "651193312612",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:651193312612:web:cfa6bea236c71c14a94671"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export default app;