import firebaseConfigData from '../firebase-applet-config.json';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigData.apiKey || 'AIzaSyAQ2o9RYXRe_YoxXm7k6d19rgjSS40k2D4',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigData.authDomain || 'ai-studio-applet-webapp-c2a5e.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigData.projectId || 'ai-studio-applet-webapp-c2a5e',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigData.storageBucket || 'ai-studio-applet-webapp-c2a5e.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigData.messagingSenderId || '939141099534',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigData.appId || '1:939141099534:web:7cb4cccf2c06e8c5e6cc5f',
};

export const firestoreDatabaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || firebaseConfigData.firestoreDatabaseId || 'ai-studio-d3f20231-78b7-4799-8c00-7379225df8b2';
