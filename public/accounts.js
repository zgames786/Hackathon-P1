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
        
        let additionalInfo = "";
        if (account.role === "student") {
            if (account.className || account.section) {
                additionalInfo += `<p><strong>Class:</strong> ${account.className || "N/A"} ${account.section ? `(${account.section})` : ""}</p>`;
            }
            if (account.admissionNumber) {
                additionalInfo += `<p><strong>Admission #:</strong> ${account.admissionNumber}</p>`;
            }
        } else if (account.role === "teacher") {
            if (account.employeeId) {
                additionalInfo += `<p><strong>Employee ID:</strong> ${account.employeeId}</p>`;
            }
        }
        
        // Show password (plain text)
        const passwordDisplay = account.password ? `<p><strong>Password:</strong> ${account.password}</p>` : "";
        
        // Show student-specific fields
        let studentFields = "";
        if (account.role === "student") {
            if (account.className) studentFields += `<p><strong>Class:</strong> ${account.className}</p>`;
            if (account.section) studentFields += `<p><strong>Section:</strong> ${account.section}</p>`;
            if (account.admissionNumber) studentFields += `<p><strong>Admission Number:</strong> ${account.admissionNumber}</p>`;
            if (account.parentPhone) studentFields += `<p><strong>Parent Phone:</strong> ${account.parentPhone}</p>`;
        }
        
        // Show teacher-specific fields
        let teacherFields = "";
        if (account.role === "teacher") {
            if (account.employeeId) teacherFields += `<p><strong>Employee ID:</strong> ${account.employeeId}</p>`;
        }
        
        card.innerHTML = `
            <div class="account-card-header">
                <div>
                    <h3>${roleIcon} ${account.username}</h3>
                    <span class="role-badge ${roleBadge}">${account.role}</span>
                </div>
            </div>
            <div class="account-card-body">
                ${account.fullName ? `<p><strong>Full Name:</strong> ${account.fullName}</p>` : ""}
                ${studentFields}
                ${teacherFields}
                ${account.phone ? `<p><strong>Phone:</strong> ${account.phone}</p>` : ""}
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
    
    // Apply search filter
    if (searchInput) {
        filteredAccounts = filteredAccounts.filter(acc => {
            const username = (acc.username || "").toLowerCase();
            const fullName = (acc.fullName || "").toLowerCase();
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
    
    // Populate form
    document.getElementById("editAccountId").value = accountId;
    document.getElementById("editUsername").value = account.username || "";
    document.getElementById("editRole").value = account.role || "";
    document.getElementById("editFullName").value = account.fullName || "";
    document.getElementById("editPhone").value = account.phone || "";
    
    // Hide all role-specific fields first
    document.getElementById("editClassNameGroup").style.display = "none";
    document.getElementById("editSectionGroup").style.display = "none";
    document.getElementById("editAdmissionNumberGroup").style.display = "none";
    document.getElementById("editParentPhoneGroup").style.display = "none";
    document.getElementById("editEmployeeIdGroup").style.display = "none";
    
    // Show role-specific fields and populate
    if (account.role === "student") {
        document.getElementById("editClassNameGroup").style.display = "block";
        document.getElementById("editSectionGroup").style.display = "block";
        document.getElementById("editAdmissionNumberGroup").style.display = "block";
        document.getElementById("editParentPhoneGroup").style.display = "block";
        
        document.getElementById("editClassName").value = account.className || "";
        document.getElementById("editSection").value = account.section || "";
        document.getElementById("editAdmissionNumber").value = account.admissionNumber || "";
        document.getElementById("editParentPhone").value = account.parentPhone || "";
    } else if (account.role === "teacher") {
        document.getElementById("editEmployeeIdGroup").style.display = "block";
        document.getElementById("editEmployeeId").value = account.employeeId || "";
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
        
        // Build update data (do not overwrite createdAt)
        const updateData = {};
        
        if (fullName) updateData.fullName = fullName;
        if (phone) updateData.phone = phone;
        
        // Update password if provided
        if (password) {
            updateData.password = password;
        }
        
        // Add role-specific fields
        if (account.role === "student") {
            const className = document.getElementById("editClassName").value.trim();
            const section = document.getElementById("editSection").value.trim();
            const admissionNumber = document.getElementById("editAdmissionNumber").value.trim();
            const parentPhone = document.getElementById("editParentPhone").value.trim();
            
            if (className !== undefined) updateData.className = className || null;
            if (section !== undefined) updateData.section = section || null;
            if (admissionNumber !== undefined) updateData.admissionNumber = admissionNumber || null;
            if (parentPhone !== undefined) updateData.parentPhone = parentPhone || null;
        } else if (account.role === "teacher") {
            const employeeId = document.getElementById("editEmployeeId").value.trim();
            if (employeeId !== undefined) updateData.employeeId = employeeId || null;
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

