// ======= ACCOUNT CREATION =======
let currentAccountType = "";

// Check admin access on page load
window.onload = async function() {
    const userType = localStorage.getItem("userType");
    const adminUID = localStorage.getItem("adminUID");
    
    if (userType !== "admin" || !adminUID) {
        window.location.href = "index.html";
        return;
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
        return;
    }
    
    if (username.length < 3) {
        showCreateError("Username must be at least 3 characters.");
        return;
    }
    
    if (password.length < 6) {
        showCreateError("Password must be at least 6 characters.");
        return;
    }
    
    // Check password match
    if (password !== confirmPassword) {
        document.getElementById("passwordMatchError").style.display = "block";
        showCreateError("Passwords do not match.");
        return;
    }
    
    try {
        if (!window.db) {
            showCreateError("Database not initialized. Please refresh the page.");
            return;
        }
        
        // Check if username already exists
        const existingUsersSnapshot = await window.db.collection("users")
            .where("username", "==", username)
            .limit(1)
            .get();
        
        if (!existingUsersSnapshot.empty) {
            showCreateError("Username already taken");
            return;
        }
        
        // Create user document with plain password
        const userData = {
            username: username,
            role: currentAccountType,
            password: password, // Store plain password
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Add optional fields
        if (fullName) userData.fullName = fullName;
        if (phone) userData.phone = phone;
        
        // Add role-specific fields
        if (currentAccountType === "student") {
            if (className) userData.className = className;
            if (section) userData.section = section;
            if (admissionNumber) userData.admissionNumber = admissionNumber;
            if (parentPhone) userData.parentPhone = parentPhone;
        } else if (currentAccountType === "teacher") {
            if (employeeId) userData.employeeId = employeeId;
        }
        
        // Add to Firestore
        const docRef = await window.db.collection("users").add(userData);
        
        showCreateSuccess(`${currentAccountType.charAt(0).toUpperCase() + currentAccountType.slice(1)} account created successfully! Username: ${username}`);
        
        // Reset form after 2 seconds
        setTimeout(() => {
            document.getElementById("createAccountForm").reset();
            document.getElementById("createAccountSuccess").style.display = "none";
        }, 2000);
        
    } catch (error) {
        console.error("Error creating user", error);
        showCreateError("Error creating account. Please try again.");
    }
}

