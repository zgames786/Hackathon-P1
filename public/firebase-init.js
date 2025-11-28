// Wait for Firebase SDK to load, then initialize
let firebaseInitAttempts = 0;
const maxInitAttempts = 50; // 5 seconds max wait time (50 * 100ms)

function initializeFirebase() {
    if (typeof firebase === 'undefined') {
        firebaseInitAttempts++;
        if (firebaseInitAttempts >= maxInitAttempts) {
            console.error("Firebase SDK failed to load after multiple attempts. Please check your internet connection and refresh the page.");
            return;
        }
        // Firebase not loaded yet, wait a bit and try again
        setTimeout(initializeFirebase, 100);
        return;
    }
    
    const firebaseConfig = {
        apiKey: "YOUR_KEY",
        authDomain: "YOUR_DOMAIN",
        projectId: "YOUR_PROJECT",
        storageBucket: "YOUR_BUCKET",
        messagingSenderId: "YOUR_SENDER_ID",
        appId: "YOUR_APP_ID"
    };

    try {
        // Check if Firebase app is already initialized
        let app;
        try {
            app = firebase.app();
            // App already exists, use it
            console.log("Using existing Firebase app");
        } catch (e) {
            // App doesn't exist, initialize it
            app = firebase.initializeApp(firebaseConfig);
            console.log("Firebase app initialized");
        }
        
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
        try {
            window.auth = firebase.auth();
            window.db = firebase.firestore();
            window.firebaseApp = firebase.app();
        } catch (e) {
            console.error("Failed to get Firebase services:", e);
        }
    }
}

// Start initialization
initializeFirebase();

