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
        // Create user in Firebase Auth with fake email
        if (!window.createAdminUser) {
            showAdminError("Firebase Auth not initialized. Please configure Firebase.");
            return;
        }
        
        const user = await window.createAdminUser(fakeEmail, password);
        
        // Add to admins collection with uid and username
        if (!window.addAdminToCollection) {
            showAdminError("Firestore not initialized. Admin user created but not added to collection.");
            return;
        }
        
        await window.addAdminToCollection(user.uid, username);
        
        showAdminSuccess("Admin account created successfully! You can now login.");
        
        // Clear form
        document.getElementById("adminUsername").value = "";
        document.getElementById("adminPassword").value = "";
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
            window.location.href = "index.html";
        }, 2000);
        
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

