import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId) 
  : getFirestore(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
}

export async function checkConnection() {
  try {
    // Warm up session with anonymous auth to acquire valid client token & establish warm socket
    if (!auth.currentUser) {
      try {
        await signInAnonymously(auth);
        console.log("Firebase anonymous sign-in established successfully for session!");
      } catch (authErr: any) {
        console.warn("Silent startup anonymous authentication warning:", authErr?.message);
      }
    }
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connection verified successfully!");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    } else {
      console.log("Firebase connection response received:", error);
    }
  }
}

// Call connection check automatically on application boot
if (typeof window !== 'undefined') {
  checkConnection();
}
