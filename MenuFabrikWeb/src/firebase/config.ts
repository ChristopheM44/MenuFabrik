import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAnj8_mmCCyeq4L_C9VKj6l5Ep-GZXzHzE",
    authDomain: "menufabrik.firebaseapp.com",
    projectId: "menufabrik",
    storageBucket: "menufabrik.firebasestorage.app",
    messagingSenderId: "427770132784",
    appId: "1:427770132784:web:6aafc7a563520e0b89b0f5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

export { db };
