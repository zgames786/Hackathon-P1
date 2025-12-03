// ======= ACCOUNTS MANAGEMENT =======
let allAccounts = [];
let currentEditAccountId = "";

// Check admin access on page load
window.onload = async function() {
    const userType = localStorage.getItem("userType");
    const adminUID = localStorage.getItem("adminUID");
    
    if (userType !== "admin" || !adminUID) {
        window.location.href = "index.html";
        return;
    }
    
    loadAccounts();
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

async function loadAccounts() {
    try {
        if (!window.db) {
            console.error("Database not initialized");
            return;
        }
        
        const usersSnapshot = await window.db.collection("users").get();
        allAccounts = [];
        
        usersSnapshot.forEach(doc => {
            allAccounts.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        displayAccounts(allAccounts);
    } catch (error) {
        console.error("Error loading accounts:", error);
        alert("Error loading accounts. Please refresh the page.");
    }
}

function displayAccounts(accounts) {
    const container = document.getElementById("accountsContainer");
    if (!container) return;
    
    if (accounts.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666; font-size: 18px;">
                <p>No accounts found.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = "";
    
    accounts.forEach(account => {
        const card = document.createElement("div");
        card.className = "account-card";
        
        const roleIcon = account.role === "teacher" ? "✏️" : "📚";
        const roleBadge = account.role === "teacher" ? "teacher-badge" : "student-badge";
        
        // Format created date
        let createdDate = "N/A";
        if (account.createdAt) {
            try {
                const date = account.createdAt.toDate ? account.createdAt.toDate() : new Date(account.createdAt);
                createdDate = date.toLocaleDateString("en-US", {year: "numeric", month: "short", day: "numeric"});
            } catch (e) {
                createdDate = "N/A";
            }
        }
        
        // Extract data from nested info objects (new unified schema)
        const teacherInfo = account.teacherInfo || {};
        const studentInfo = account.studentInfo || {};
        
        // Show password (plain text)
        const passwordDisplay = account.password ? `<p><strong>Password:</strong> ${account.password}</p>` : "";
        
        // Show student-specific fields from studentInfo
        let studentFields = "";
        if (account.role === "student") {
            if (studentInfo.class) studentFields += `<p><strong>Class:</strong> ${studentInfo.class}</p>`;
            if (studentInfo.section) studentFields += `<p><strong>Section:</strong> ${studentInfo.section}</p>`;
            if (studentInfo.parentPhone) studentFields += `<p><strong>Parent Phone:</strong> ${studentInfo.parentPhone}</p>`;
        }
        
        // Show teacher-specific fields from teacherInfo
        let teacherFields = "";
        if (account.role === "teacher") {
            // No employeeId in new schema, only fullName, phone, and classes
        }
        
        const fullName = account.role === "teacher" ? (teacherInfo.fullName || "") : (studentInfo.fullName || "");
        const phone = account.role === "teacher" ? (teacherInfo.phone || "") : "";
        
        card.innerHTML = `
            <div class="account-card-header">
                <div>
                    <h3>${roleIcon} ${account.username}</h3>
                    <span class="role-badge ${roleBadge}">${account.role}</span>
                </div>
            </div>
            <div class="account-card-body">
                ${fullName ? `<p><strong>Full Name:</strong> ${fullName}</p>` : ""}
                ${studentFields}
                ${teacherFields}
                ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ""}
                ${passwordDisplay}
                <p><strong>Created:</strong> ${createdDate}</p>
            </div>
            <div class="account-card-footer">
                <button onclick="openEditForm('${account.id}')" class="btn-small btn-primary">Edit</button>
            </div>
        `;
        
        container.appendChild(card);
    });
}

function applyFilters() {
    const searchInput = document.getElementById("searchInput").value.trim().toLowerCase();
    const roleFilter = document.getElementById("roleFilter").value;
    
    let filteredAccounts = allAccounts;
    
    // Apply role filter
    if (roleFilter !== "all") {
        filteredAccounts = filteredAccounts.filter(acc => acc.role === roleFilter);
    }
    
    // Apply search filter (check nested info objects)
    if (searchInput) {
        filteredAccounts = filteredAccounts.filter(acc => {
            const username = (acc.username || "").toLowerCase();
            const teacherInfo = acc.teacherInfo || {};
            const studentInfo = acc.studentInfo || {};
            const fullName = (acc.role === "teacher" ? (teacherInfo.fullName || "") : (studentInfo.fullName || "")).toLowerCase();
            return username.includes(searchInput) || fullName.includes(searchInput);
        });
    }
    
    displayAccounts(filteredAccounts);
}

function clearFilters() {
    document.getElementById("searchInput").value = "";
    document.getElementById("roleFilter").value = "all";
    displayAccounts(allAccounts);
}

async function openEditForm(accountId) {
    currentEditAccountId = accountId;
    
    const account = allAccounts.find(acc => acc.id === accountId);
    if (!account) {
        alert("Account not found");
        return;
    }
    
    const modal = document.getElementById("editAccountModal");
    const modalTitle = document.getElementById("editModalTitle");
    
    // Update title
    modalTitle.textContent = `Edit ${account.role.charAt(0).toUpperCase() + account.role.slice(1)} Account`;
    
    // Extract data from nested info objects (new unified schema)
    const teacherInfo = account.teacherInfo || {};
    const studentInfo = account.studentInfo || {};
    
    // Populate form
    document.getElementById("editAccountId").value = accountId;
    document.getElementById("editUsername").value = account.username || "";
    document.getElementById("editRole").value = account.role || "";
    document.getElementById("editFullName").value = account.role === "teacher" ? (teacherInfo.fullName || "") : (studentInfo.fullName || "");
    document.getElementById("editPhone").value = account.role === "teacher" ? (teacherInfo.phone || "") : "";
    
    // Hide all role-specific fields first
    document.getElementById("editClassNameGroup").style.display = "none";
    document.getElementById("editSectionGroup").style.display = "none";
    document.getElementById("editAdmissionNumberGroup").style.display = "none";
    document.getElementById("editParentPhoneGroup").style.display = "none";
    document.getElementById("editEmployeeIdGroup").style.display = "none";
    
    // Show role-specific fields and populate from nested structure
    if (account.role === "student") {
        document.getElementById("editClassNameGroup").style.display = "block";
        document.getElementById("editSectionGroup").style.display = "block";
        document.getElementById("editParentPhoneGroup").style.display = "block";
        
        document.getElementById("editClassName").value = studentInfo.class || "";
        document.getElementById("editSection").value = studentInfo.section || "";
        document.getElementById("editParentPhone").value = studentInfo.parentPhone || "";
    } else if (account.role === "teacher") {
        // No employeeId or other fields in new schema - teacherInfo only has fullName, phone, classes
    }
    
    // Clear password fields (for security, don't show current password)
    document.getElementById("editPassword").value = "";
    document.getElementById("editConfirmPassword").value = "";
    document.getElementById("editPasswordMatchError").style.display = "none";
    
    // Reset messages
    document.getElementById("editAccountError").style.display = "none";
    document.getElementById("editAccountSuccess").style.display = "none";
    
    // Show modal
    modal.style.display = "flex";
}

function closeEditForm() {
    const modal = document.getElementById("editAccountModal");
    modal.style.display = "none";
    currentEditAccountId = "";
}

function showEditError(message) {
    const errorDiv = document.getElementById("editAccountError");
    const successDiv = document.getElementById("editAccountSuccess");
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = "block";
    }
    if (successDiv) {
        successDiv.style.display = "none";
    }
}

function showEditSuccess(message) {
    const errorDiv = document.getElementById("editAccountError");
    const successDiv = document.getElementById("editAccountSuccess");
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = "block";
    }
    if (errorDiv) {
        errorDiv.style.display = "none";
    }
}

async function updateUserAccount() {
    const accountId = currentEditAccountId;
    if (!accountId) return;
    
    const account = allAccounts.find(acc => acc.id === accountId);
    if (!account) return;
    
    // Get form values
    const fullName = document.getElementById("editFullName").value.trim();
    const phone = document.getElementById("editPhone").value.trim();
    const password = document.getElementById("editPassword").value;
    const confirmPassword = document.getElementById("editConfirmPassword").value;
    
    // Hide previous messages
    document.getElementById("editAccountError").style.display = "none";
    document.getElementById("editAccountSuccess").style.display = "none";
    document.getElementById("editPasswordMatchError").style.display = "none";
    
    // Check password if provided
    if (password || confirmPassword) {
        if (password !== confirmPassword) {
            document.getElementById("editPasswordMatchError").style.display = "block";
            showEditError("Passwords do not match.");
            return;
        }
    }
    
    try {
        if (!window.db) {
            showEditError("Database not initialized. Please refresh the page.");
            return;
        }
        
        // Build update data with nested info objects (new unified schema)
        const updateData = {};
        
        // Update password if provided
        if (password) {
            updateData.password = password;
        }
        
        // Update nested info objects
        if (account.role === "student") {
            const className = document.getElementById("editClassName").value.trim();
            const section = document.getElementById("editSection").value.trim();
            const parentPhone = document.getElementById("editParentPhone").value.trim();
            
            // Get existing studentInfo or create new
            const existingStudentInfo = account.studentInfo || {};
            updateData.studentInfo = {
                fullName: fullName || existingStudentInfo.fullName || "",
                class: className || existingStudentInfo.class || "",
                section: section || existingStudentInfo.section || "",
                parentPhone: parentPhone || existingStudentInfo.parentPhone || "",
                enrolledClasses: existingStudentInfo.enrolledClasses || []
            };
        } else if (account.role === "teacher") {
            // Get existing teacherInfo or create new
            const existingTeacherInfo = account.teacherInfo || {};
            updateData.teacherInfo = {
                fullName: fullName || existingTeacherInfo.fullName || "",
                phone: phone || existingTeacherInfo.phone || "",
                classes: existingTeacherInfo.classes || []
            };
        }
        
        // Update in Firestore
        await window.db.collection("users").doc(accountId).update(updateData);
        
        showEditSuccess("Account updated successfully!");
        
        // Reload accounts after 1 second
        setTimeout(() => {
            closeEditForm();
            loadAccounts();
        }, 1000);
        
    } catch (error) {
        console.error("Error updating account:", error);
        showEditError("Error updating account: " + error.message);
    }
}

function openResetPassword() {
    const resetModal = document.getElementById("resetPasswordModal");
    
    // Reset form
    document.getElementById("resetPasswordForm").reset();
    document.getElementById("resetPasswordError").style.display = "none";
    document.getElementById("resetPasswordSuccess").style.display = "none";
    document.getElementById("resetPasswordMatchError").style.display = "none";
    
    // Show modal
    resetModal.style.display = "flex";
}

function closeResetPassword() {
    const resetModal = document.getElementById("resetPasswordModal");
    resetModal.style.display = "none";
}

// Validate password match in real-time
document.addEventListener("DOMContentLoaded", function() {
    const resetConfirm = document.getElementById("resetConfirmPassword");
    const resetNew = document.getElementById("resetNewPassword");
    const resetMatchError = document.getElementById("resetPasswordMatchError");
    
    if (resetConfirm && resetNew && resetMatchError) {
        resetConfirm.addEventListener("input", function() {
            if (resetConfirm.value && resetNew.value !== resetConfirm.value) {
                resetMatchError.style.display = "block";
            } else {
                resetMatchError.style.display = "none";
            }
        });
        
        resetNew.addEventListener("input", function() {
            if (resetConfirm.value && resetNew.value !== resetConfirm.value) {
                resetMatchError.style.display = "block";
            } else {
                resetMatchError.style.display = "none";
            }
        });
    }
});

function showResetError(message) {
    const errorDiv = document.getElementById("resetPasswordError");
    const successDiv = document.getElementById("resetPasswordSuccess");
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = "block";
    }
    if (successDiv) {
        successDiv.style.display = "none";
    }
}

function showResetSuccess(message) {
    const errorDiv = document.getElementById("resetPasswordError");
    const successDiv = document.getElementById("resetPasswordSuccess");
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = "block";
    }
    if (errorDiv) {
        errorDiv.style.display = "none";
    }
}

async function resetUserPassword() {
    const accountId = currentEditAccountId;
    if (!accountId) return;
    
    const newPassword = document.getElementById("resetNewPassword").value;
    const confirmPassword = document.getElementById("resetConfirmPassword").value;
    
    // Hide previous messages
    document.getElementById("resetPasswordError").style.display = "none";
    document.getElementById("resetPasswordSuccess").style.display = "none";
    document.getElementById("resetPasswordMatchError").style.display = "none";
    
    // Validate
    if (!newPassword || !confirmPassword) {
        showResetError("Please fill in both password fields.");
        return;
    }
    
    if (newPassword.length < 6) {
        showResetError("Password must be at least 6 characters.");
        return;
    }
    
    if (newPassword !== confirmPassword) {
        document.getElementById("resetPasswordMatchError").style.display = "block";
        showResetError("Passwords do not match.");
        return;
    }
    
    try {
        if (!window.db) {
            showResetError("Database not initialized. Please refresh the page.");
            return;
        }
        
        // Hash the new password
        const passwordHash = await window.hashPassword(newPassword);
        
        // Update in Firestore
        await window.db.collection("users").doc(accountId).update({
            passwordHash: passwordHash,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showResetSuccess("Password reset successfully!");
        
        // Close modal after 1.5 seconds
        setTimeout(() => {
            closeResetPassword();
        }, 1500);
        
    } catch (error) {
        console.error("Error resetting password:", error);
        showResetError("Error resetting password: " + error.message);
    }
}

// Add password validation event listeners for edit form
document.addEventListener("DOMContentLoaded", function() {
    const editPassword = document.getElementById("editPassword");
    const editConfirmPassword = document.getElementById("editConfirmPassword");
    const editPasswordMatchError = document.getElementById("editPasswordMatchError");
    
    if (editPassword && editConfirmPassword && editPasswordMatchError) {
        editPassword.addEventListener("input", function() {
            if (editPassword.value && editConfirmPassword.value && editPassword.value !== editConfirmPassword.value) {
                editPasswordMatchError.style.display = "block";
            } else {
                editPasswordMatchError.style.display = "none";
            }
        });
        
        editConfirmPassword.addEventListener("input", function() {
            if (editPassword.value && editConfirmPassword.value && editPassword.value !== editConfirmPassword.value) {
                editPasswordMatchError.style.display = "block";
            } else {
                editPasswordMatchError.style.display = "none";
            }
        });
    }
});

