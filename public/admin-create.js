// ======= ADMIN CREATION =======
// Hardcoded master UID - change this to your desired master UID
const MASTER_UID = "zW3LsKJr1IZiLt149F25ObvYcX32";

// Verify MASTER_UID is set correctly on load
console.log("MASTER_UID constant:", MASTER_UID);
console.log("MASTER_UID length:", MASTER_UID.length);

function showAdminError(message) {
    const errorDiv = document.getElementById("adminCreateError");
    const successDiv = document.getElementById("adminCreateSuccess");
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = "block";
    }
    if (successDiv) {
        successDiv.style.display = "none";
    }
}

function showAdminSuccess(message) {
    const errorDiv = document.getElementById("adminCreateError");
    const successDiv = document.getElementById("adminCreateSuccess");
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = "block";
    }
    if (errorDiv) {
        errorDiv.style.display = "none";
    }
}

async function createAdmin() {
    const username = document.getElementById("adminUsername").value.trim();
    const password = document.getElementById("adminPassword").value;
    
    // Hide previous messages
    showAdminError("");
    showAdminSuccess("");
    
    // Validation (master UID temporarily disabled)
    if (!username || !password) {
        showAdminError("Please fill in username and password.");
        return;
    }
    
    if (username.length < 3) {
        showAdminError("Username must be at least 3 characters.");
        return;
    }
    
    if (password.length < 6) {
        showAdminError("Password must be at least 6 characters.");
        return;
    }
    
    // Master UID check temporarily disabled - can create admin with just username and password
    
    // Create fake email from username (Firebase Auth requires email)
    // Format: username@admins.local (e.g., "principal" becomes "principal@admins.local")
    const fakeEmail = `${username}@admins.local`;
    
    try {
        // Check if Firebase is loaded
        if (typeof firebase === 'undefined') {
            showAdminError("Firebase SDK not loaded. Please check your internet connection and refresh the page.");
            return;
        }
        
        // Use window.auth and window.db from firebase-init.js, or fallback to firebase directly
        const authInstance = window.auth || (firebase && firebase.auth ? firebase.auth() : null);
        const dbInstance = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
        
        if (!authInstance) {
            showAdminError("Firebase Auth not initialized. Please check firebase-init.js configuration.");
            console.error("Auth instance:", authInstance);
            console.error("Window.auth:", window.auth);
            console.error("Firebase:", firebase);
            return;
        }
        
        const userCredential = await authInstance.createUserWithEmailAndPassword(fakeEmail, password);
        const user = userCredential.user;
        
        // Add to admins collection with uid and username
        if (!dbInstance) {
            showAdminError("Firestore not initialized. Admin user created but not added to collection.");
            return;
        }
        
        const adminData = {
            uid: user.uid,
            username: username,
            createdAt: new Date().toISOString()
        };
        await dbInstance.collection("admins").doc(username).set(adminData);
        
        // Redirect to login
        window.location.href = "index.html";
        
    } catch (error) {
        console.error("Error creating admin:", error);
        if (error.code === "auth/email-already-in-use") {
            showAdminError("This username/email is already in use.");
        } else if (error.code === "auth/weak-password") {
            showAdminError("Password is too weak. Please use a stronger password.");
        } else if (error.code === "auth/invalid-email") {
            showAdminError("Invalid email format.");
        } else {
            showAdminError("Error creating admin account: " + error.message);
        }
    }
}

