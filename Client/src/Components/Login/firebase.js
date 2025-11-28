// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {
  apiKey: "AIzaSyDBqILk-KtRKszWW4jdHd2eOgq7TSEVJNM",
  authDomain: "classroom-management-sys-406b3.firebaseapp.com",
  projectId: "classroom-management-sys-406b3",
  storageBucket: "classroom-management-sys-406b3.firebasestorage.app",
  messagingSenderId: "173729672792",
  appId: "1:173729672792:web:287d8393e09bd629d2642d",
  measurementId: "G-Y6C15BQ2W4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();