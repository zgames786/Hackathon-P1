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
    const fullName = document.getElementById("adminFullName").value.trim();
    const email = document.getElementById("adminEmail").value.trim();
    const password = document.getElementById("adminPassword").value;
    
    // Clear previous messages
    showMessage("");
    
    // Validation
    if (!fullName || !email || !password) {
        showMessage("Please fill in all fields.", true);
        return;
    }
    
    if (fullName.length < 2) {
        showMessage("Full name must be at least 2 characters.", true);
        return;
    }
    
    if (password.length < 6) {
        showMessage("Password must be at least 6 characters.", true);
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showMessage("Please enter a valid email address.", true);
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
        
        // Create user with email and password
        const userCredential = await authInstance.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        const uid = user.uid;
        
        // Write to Firestore at admins/{uid}
        const adminData = {
            uid: uid,
            email: email,
            name: fullName,
            role: "admin",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await dbInstance.collection("admins").doc(uid).set(adminData);
        
        showMessage("Admin account created successfully!");
        
        // Clear form
        document.getElementById("adminFullName").value = "";
        document.getElementById("adminEmail").value = "";
        document.getElementById("adminPassword").value = "";
        
    } catch (error) {
        console.error("Error creating admin:", error);
        
        // Show readable error messages
        let errorMessage = "An error occurred while creating the admin account.";
        
        if (error.code === "auth/email-already-in-use") {
            errorMessage = "This email is already in use. Please use a different email.";
        } else if (error.code === "auth/weak-password") {
            errorMessage = "Password is too weak. Please use a stronger password (at least 6 characters).";
        } else if (error.code === "auth/invalid-email") {
            errorMessage = "Invalid email format. Please enter a valid email address.";
        } else if (error.code === "auth/operation-not-allowed") {
            errorMessage = "Email/password accounts are not enabled. Please contact the administrator.";
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showMessage(errorMessage, true);
    }
}

