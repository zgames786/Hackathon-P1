// Check if Firebase is loaded
if (typeof firebase === 'undefined') {
    console.error("Firebase SDK not loaded. Make sure firebase-app.js, firebase-auth.js, and firebase-firestore.js are loaded before this script.");
} else {
    const firebaseConfig = {
        apiKey: "YOUR_KEY",
        authDomain: "YOUR_DOMAIN",
        projectId: "YOUR_PROJECT",
        storageBucket: "YOUR_BUCKET",
        messagingSenderId: "YOUR_SENDER_ID",
        appId: "YOUR_APP_ID"
    };

    try {
        // Initialize Firebase app
        const app = firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const db = firebase.firestore();

        // Make auth and db globally accessible
        window.auth = auth;
        window.db = db;
        window.firebaseApp = app;
        
        console.log("Firebase initialized successfully");
    } catch (error) {
        console.error("Error initializing Firebase:", error);
        // Still try to set auth and db even if initialization fails
        // (in case app was already initialized)
        try {
            window.auth = firebase.auth();
            window.db = firebase.firestore();
            window.firebaseApp = firebase.app();
        } catch (e) {
            console.error("Failed to get Firebase services:", e);
        }
    }
}

