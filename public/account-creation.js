// ======= ACCOUNT CREATION =======
let currentAccountType = "";
let isSubmitting = false; // Prevent double submission

// Check admin access on page load
window.onload = async function() {
    const userType = localStorage.getItem("userType");
    const adminUID = localStorage.getItem("adminUID");
    
    if (userType !== "admin" || !adminUID) {
        window.location.href = "index.html";
        return;
    }
    
    // Wait for Firebase to be ready
    let firebaseReady = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!firebaseReady && attempts < maxAttempts) {
        if (window.db && typeof window.db.collection === 'function') {
            firebaseReady = true;
            console.log("Firestore is ready");
        } else {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    if (!firebaseReady) {
        console.error("Firestore not ready after waiting");
        alert("Firebase initialization failed. Please refresh the page.");
    }
};

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    if (sidebar) {
        sidebar.classList.toggle("show");
    }
}

function logout() {
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("userType");
    localStorage.removeItem("adminUID");
    localStorage.removeItem("userSession");
    window.location.href = "index.html";
}

function openCreateForm(accountType) {
    currentAccountType = accountType;
    
    const modal = document.getElementById("createAccountModal");
    const modalTitle = document.getElementById("modalTitle");
    
    // Update title
    modalTitle.textContent = `Create ${accountType.charAt(0).toUpperCase() + accountType.slice(1)} Account`;
    
    // Reset form
    document.getElementById("createAccountForm").reset();
    document.getElementById("createAccountError").style.display = "none";
    document.getElementById("createAccountSuccess").style.display = "none";
    document.getElementById("passwordMatchError").style.display = "none";
    
    // Show/hide role-specific fields
    if (accountType === "student") {
        document.getElementById("classNameGroup").style.display = "block";
        document.getElementById("sectionGroup").style.display = "block";
        document.getElementById("admissionNumberGroup").style.display = "block";
        document.getElementById("parentPhoneGroup").style.display = "block";
        document.getElementById("employeeIdGroup").style.display = "none";
    } else if (accountType === "teacher") {
        document.getElementById("classNameGroup").style.display = "none";
        document.getElementById("sectionGroup").style.display = "none";
        document.getElementById("admissionNumberGroup").style.display = "none";
        document.getElementById("parentPhoneGroup").style.display = "none";
        document.getElementById("employeeIdGroup").style.display = "block";
    }
    
    // Show modal
    modal.style.display = "flex";
}

function closeCreateForm() {
    const modal = document.getElementById("createAccountModal");
    modal.style.display = "none";
    currentAccountType = "";
}

// Validate password match in real-time
document.addEventListener("DOMContentLoaded", function() {
    const confirmPassword = document.getElementById("confirmPassword");
    const newPassword = document.getElementById("newPassword");
    const passwordMatchError = document.getElementById("passwordMatchError");
    
    if (confirmPassword && newPassword && passwordMatchError) {
        confirmPassword.addEventListener("input", function() {
            if (confirmPassword.value && newPassword.value !== confirmPassword.value) {
                passwordMatchError.style.display = "block";
            } else {
                passwordMatchError.style.display = "none";
            }
        });
        
        newPassword.addEventListener("input", function() {
            if (confirmPassword.value && newPassword.value !== confirmPassword.value) {
                passwordMatchError.style.display = "block";
            } else {
                passwordMatchError.style.display = "none";
            }
        });
    }
});

function showCreateError(message) {
    const errorDiv = document.getElementById("createAccountError");
    const successDiv = document.getElementById("createAccountSuccess");
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = "block";
    }
    if (successDiv) {
        successDiv.style.display = "none";
    }
}

function showCreateSuccess(message) {
    const errorDiv = document.getElementById("createAccountError");
    const successDiv = document.getElementById("createAccountSuccess");
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = "block";
    }
    if (errorDiv) {
        errorDiv.style.display = "none";
    }
}

async function createUserAccount() {
    // Prevent double submission
    if (isSubmitting) {
        console.log("Already submitting, ignoring duplicate request");
        return;
    }
    
    isSubmitting = true;
    
    // Get form values
    const username = document.getElementById("newUsername").value.trim();
    const password = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const fullName = document.getElementById("fullName").value.trim();
    const className = document.getElementById("className").value.trim();
    const section = document.getElementById("section").value.trim();
    const admissionNumber = document.getElementById("admissionNumber").value.trim();
    const parentPhone = document.getElementById("parentPhone").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const employeeId = document.getElementById("employeeId").value.trim();
    
    // Hide previous messages
    document.getElementById("createAccountError").style.display = "none";
    document.getElementById("createAccountSuccess").style.display = "none";
    document.getElementById("passwordMatchError").style.display = "none";
    
    // Validate required fields
    if (!username || !password || !confirmPassword) {
        showCreateError("Please fill in all required fields.");
        isSubmitting = false;
        return;
    }
    
    if (username.length < 3) {
        showCreateError("Username must be at least 3 characters.");
        isSubmitting = false;
        return;
    }
    
    if (password.length < 6) {
        showCreateError("Password must be at least 6 characters.");
        isSubmitting = false;
        return;
    }
    
    // Check password match
    if (password !== confirmPassword) {
        document.getElementById("passwordMatchError").style.display = "block";
        showCreateError("Passwords do not match.");
        isSubmitting = false;
        return;
    }
    
    try {
        if (!window.db) {
            console.error("Firestore db not available:", window.db);
            showCreateError("Database not initialized. Please refresh the page.");
            isSubmitting = false;
            return;
        }
        
        // Verify admin is authenticated
        const adminUID = localStorage.getItem("adminUID");
        if (!adminUID) {
            console.error("Admin UID not found in localStorage");
            showCreateError("Admin session expired. Please log in again.");
            isSubmitting = false;
            setTimeout(() => window.location.href = "index.html", 2000);
            return;
        }
        
        // Check if Firebase Auth user exists
        if (window.auth && window.auth.currentUser) {
            console.log("Current Firebase Auth user:", window.auth.currentUser.uid);
        } else {
            console.warn("No Firebase Auth user found. Firestore rules may block writes.");
        }
        
        console.log("Checking username uniqueness for:", username);
        
        // Check if username already exists
        const existingUsersSnapshot = await window.db.collection("users")
            .where("username", "==", username)
            .limit(1)
            .get();
        
        if (!existingUsersSnapshot.empty) {
            showCreateError("Username already taken");
            isSubmitting = false;
            return;
        }
        
        console.log("Username is available. Creating user document...");
        
        // Create user document with plain password
        const userData = {
            username: username,
            role: currentAccountType,
            password: password, // Store plain password
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Add optional fields (only if not empty)
        if (fullName && fullName.trim()) userData.fullName = fullName.trim();
        if (phone && phone.trim()) userData.phone = phone.trim();
        
        // Add role-specific fields
        if (currentAccountType === "student") {
            if (className && className.trim()) userData.className = className.trim();
            if (section && section.trim()) userData.section = section.trim();
            if (admissionNumber && admissionNumber.trim()) userData.admissionNumber = admissionNumber.trim();
            if (parentPhone && parentPhone.trim()) userData.parentPhone = parentPhone.trim();
        } else if (currentAccountType === "teacher") {
            if (employeeId && employeeId.trim()) userData.employeeId = employeeId.trim();
        }
        
        console.log("User data to save:", { ...userData, password: "***" }); // Don't log password
        
        // Add to Firestore
        const docRef = await window.db.collection("users").add(userData);
        
        console.log("User created successfully with ID:", docRef.id);
        
        showCreateSuccess(`${currentAccountType.charAt(0).toUpperCase() + currentAccountType.slice(1)} account created successfully! Username: ${username}`);
        
        // Reset form after 2 seconds
        setTimeout(() => {
            document.getElementById("createAccountForm").reset();
            document.getElementById("createAccountSuccess").style.display = "none";
            isSubmitting = false; // Reset flag after success
        }, 2000);
        
    } catch (error) {
        console.error("Error creating user - Full error details:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        
        // Show more specific error message if available
        let errorMessage = "Error creating account. Please try again.";
        if (error.code === "permission-denied") {
            errorMessage = "Permission denied. Make sure you're logged in as admin and Firestore rules allow writes.";
        } else if (error.code === "unavailable") {
            errorMessage = "Firestore is unavailable. Please check your internet connection and try again.";
        } else if (error.message) {
            errorMessage = `Error: ${error.message}`;
        }
        
        showCreateError(errorMessage);
        isSubmitting = false; // Reset flag on error
    }
}

