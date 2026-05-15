
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// استخدام المتغيرات البيئية مع قيم افتراضية قوية لضمان العمل في بيئة Studio
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDMHvdmpCQ6etdCfIrZKvreL8pmgaL8r2s",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "studio-5183488057-eae49.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "studio-5183488057-eae49",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "studio-5183488057-eae49.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "852098675911",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:852098675911:web:11bbf4b54fae5ae5e1fae2"
};

// منع إعادة تهيئة التطبيق إذا كان موجوداً بالفعل
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db_firestore = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// جعل اللغة تلقائية بناءً على المتصفح
auth.useDeviceLanguage();

export { auth, db_firestore, googleProvider };
