// ======= CREATE ADMIN =======

function showMessage(message, isError = false) {
    const messageDiv = document.getElementById("adminCreateMessage");
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.style.color = isError ? "#dc3545" : "#28a745";
        messageDiv.style.display = message ? "block" : "none";
    }
}

async function createAdmin() {
    const username = document.getElementById("adminUsername").value.trim();
    const password = document.getElementById("adminPassword").value;
    
    // Clear previous messages
    showMessage("");
    
    // Validation
    if (!username || !password) {
        showMessage("Please fill in all fields.", true);
        return;
    }
    
    if (username.length < 3) {
        showMessage("Username must be at least 3 characters.", true);
        return;
    }
    
    if (password.length < 6) {
        showMessage("Password must be at least 6 characters.", true);
        return;
    }
    
    try {
        // Check if Firebase is loaded
        if (typeof firebase === 'undefined') {
            showMessage("Firebase SDK not loaded. Please check your internet connection and refresh the page.", true);
            return;
        }
        
        // Use window.auth and window.db from firebase-init.js
        const authInstance = window.auth || firebase.auth();
        const dbInstance = window.db || firebase.firestore();
        
        if (!authInstance) {
            showMessage("Firebase Auth not initialized. Please check firebase-init.js configuration.", true);
            return;
        }
        
        if (!dbInstance) {
            showMessage("Firestore not initialized. Please check firebase-init.js configuration.", true);
            return;
        }
        
        // Create fake email from username (Firebase Auth requires email)
        const fakeEmail = username + "@admins.local";
        
        // Create user with fakeEmail and password
        const userCredential = await authInstance.createUserWithEmailAndPassword(fakeEmail, password);
        const user = userCredential.user;
        const uid = user.uid;
        
        // Write to Firestore at admins/{username}
        try {
            const adminData = {
                uid: uid,
                username: username,
                email: fakeEmail,
                role: "admin",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            await dbInstance.collection("admins").doc(username).set(adminData);
        } catch (firestoreError) {
            alert("Failed to create admin document: " + firestoreError.message);
            return;
        }
        
        // Redirect to login page
        window.location.href = "index.html";
        
    } catch (error) {
        console.error("Error creating admin:", error);
        
        // Show readable error messages
        let errorMessage = "An error occurred while creating the admin account.";
        
        if (error.code === "auth/email-already-in-use") {
            errorMessage = "This username is already in use. Please use a different username.";
        } else if (error.code === "auth/weak-password") {
            errorMessage = "Password is too weak. Please use a stronger password (at least 6 characters).";
        } else if (error.code === "auth/invalid-email") {
            errorMessage = "Invalid email format.";
        } else if (error.code === "auth/operation-not-allowed") {
            errorMessage = "Email/password accounts are not enabled. Please contact the administrator.";
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showMessage(errorMessage, true);
    }
}

