import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC6mle9eLLnSp-NtdJY1zpbidG2AXrzGug",
  authDomain: "budget-tracker-35c4f.firebaseapp.com",
  projectId: "budget-tracker-35c4f",
  storageBucket: "budget-tracker-35c4f.firebasestorage.app",
  messagingSenderId: "548136277782",
  appId: "1:548136277782:web:279ad889ac0baa7f7e6237",
  measurementId: "G-59KXBXFCT6",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
export const db = getFirestore(app);
