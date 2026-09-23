import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBgKWL9RTnaT-yUCZnfZpxpKj3ayzfP7fg",
  authDomain: "casa-gracias-id.firebaseapp.com",
  projectId: "casa-gracias-id",
  storageBucket: "casa-gracias-id.firebasestorage.app",
  messagingSenderId: "1089553780994",
  appId: "1:1089553780994:web:760e384b3352418dc9321b",
  measurementId: "G-JS7555NDWE"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});