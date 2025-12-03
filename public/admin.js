// ======= ADMIN FUNCTIONALITY =======
let adminUID = null;
let adminData = {
    students: [],
    teachers: [],
    classes: []
};

// Make adminData globally accessible
window.adminData = adminData;

// Check if user is admin by verifying their UID exists in admins collection
async function checkAdminAccess() {
    const storedUID = localStorage.getItem("adminUID");
    const storedUserType = localStorage.getItem("userType");
    
    if (storedUserType !== "admin" || !storedUID) {
        // Not an admin, redirect to login
        window.location.href = "index.html";
        return false;
    }
    
    // Verify user's UID exists in admins collection
    try {
        if (window.db) {
            const admins = await getFirestoreDocs("admins");
            const admin = admins.find(a => a.uid === storedUID);
            
            if (!admin) {
                // User's UID not in admins collection, redirect to login
                localStorage.removeItem("loggedInUser");
                localStorage.removeItem("userType");
                localStorage.removeItem("adminUID");
                window.location.href = "index.html";
                return false;
            }
        }
    } catch (error) {
        console.error("Error checking admin access:", error);
        // On error, still allow access if userType is admin (graceful degradation)
    }
    
    adminUID = storedUID;
    return true;
}

// Helper function to get Firestore docs using compat SDK
async function getFirestoreDocs(collectionName) {
    if (!window.db) {
        console.error("Firestore not initialized");
        return [];
    }
    try {
        const snapshot = await window.db.collection(collectionName).get();
        const docs = [];
        snapshot.forEach((doc) => {
            docs.push({ id: doc.id, ...doc.data() });
        });
        return docs;
    } catch (error) {
        console.error("Error reading from Firestore:", error);
        return [];
    }
}

// Make getFirestoreDocs globally accessible
window.getFirestoreDocs = getFirestoreDocs;

// Load admin data from Firestore
async function loadAdminData() {
    // Wait for Firestore to be ready
    let attempts = 0;
    while (!window.db && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (!window.db) {
        console.error("Firestore not initialized after waiting");
        const totalStudentsEl = document.getElementById("totalStudents");
        const totalTeachersEl = document.getElementById("totalTeachers");
        const classesListEl = document.getElementById("classesList");
        if (totalStudentsEl) totalStudentsEl.textContent = "Error";
        if (totalTeachersEl) totalTeachersEl.textContent = "Error";
        if (classesListEl) classesListEl.innerHTML = "<p>Firestore not initialized. Please configure Firebase.</p>";
        return;
    }
    
    try {
        // Query students and teachers directly from Firestore using where clauses
        // This is more efficient and ensures we get the correct counts
        const studentsSnapshot = await window.db.collection("users")
            .where("role", "==", "student")
            .get();
        
        const teachersSnapshot = await window.db.collection("users")
            .where("role", "==", "teacher")
            .get();
        
        // Convert snapshots to arrays
        adminData.students = [];
        studentsSnapshot.forEach((doc) => {
            const data = doc.data();
            adminData.students.push({ id: doc.id, ...data });
        });
        
        adminData.teachers = [];
        teachersSnapshot.forEach((doc) => {
            const data = doc.data();
            adminData.teachers.push({ id: doc.id, ...data });
        });
        
        // Load classes
        adminData.classes = await getFirestoreDocs("classes");
        
        // Update dashboard - ensure arrays are populated before updating
        console.log("Before updateDashboard - students:", adminData.students.length, "teachers:", adminData.teachers.length);
        await updateAdminDashboard();
        console.log("After updateDashboard - students:", adminData.students.length, "teachers:", adminData.teachers.length);
    } catch (error) {
        console.error("Error loading admin data:", error);
        console.error("Error details:", error.code, error.message);
        const totalStudentsEl = document.getElementById("totalStudents");
        const totalTeachersEl = document.getElementById("totalTeachers");
        if (totalStudentsEl) totalStudentsEl.textContent = "Error";
        if (totalTeachersEl) totalTeachersEl.textContent = "Error";
    }
}

// Update admin dashboard with data
async function updateAdminDashboard() {
    // Update total students - query directly from Firestore users collection
    try {
        const studentsSnapshot = await window.db.collection("users")
            .where("role", "==", "student")
            .get();
        const totalStudents = studentsSnapshot.size;
        const totalStudentsEl = document.getElementById("totalStudents");
        if (totalStudentsEl) {
            totalStudentsEl.textContent = totalStudents.toString();
        }
    } catch (error) {
        console.error("Error counting students:", error);
        const totalStudentsEl = document.getElementById("totalStudents");
        if (totalStudentsEl) {
            totalStudentsEl.textContent = "Error";
        }
    }
    
    // Update total teachers - query directly from Firestore users collection
    try {
        const teachersSnapshot = await window.db.collection("users")
            .where("role", "==", "teacher")
            .get();
        const totalTeachers = teachersSnapshot.size;
        const totalTeachersEl = document.getElementById("totalTeachers");
        if (totalTeachersEl) {
            totalTeachersEl.textContent = totalTeachers.toString();
        }
    } catch (error) {
        console.error("Error counting teachers:", error);
        const totalTeachersEl = document.getElementById("totalTeachers");
        if (totalTeachersEl) {
            totalTeachersEl.textContent = "Error";
        }
    }
    
    // Load and update fees data
    await updateDashboardFees();
    
    // Load and update attendance data
    await updateDashboardAttendance();
    
    // Update recent activity
    updateRecentActivity();
    
    // Render charts
    renderDashboardCharts();
    
    // Update classes list with data from Firestore
    const classesList = document.getElementById("classesList");
    if (classesList) {
        try {
            // Load all classes from Firestore
            const classesSnapshot = await window.db.collection("classes").get();
            
            if (classesSnapshot.empty) {
                classesList.innerHTML = "<p style='text-align: center; color: #666; padding: 20px;'>No classes found.</p>";
                return;
            }
            
            let html = "";
            
            // Process each class document
            classesSnapshot.forEach((doc) => {
                const classData = doc.data();
                
                // Extract data from the new Firestore schema
                const className = classData.className || "Unnamed Class";
                const teacherName = classData.teacherName || "No Teacher";
                const students = Array.isArray(classData.students) ? classData.students : [];
                const studentCount = students.length;
                
                // Extract student names from students array
                const studentNames = students.map(student => {
                    if (student && typeof student === 'object') {
                        return student.name || "Unknown";
                    }
                    return "Unknown";
                }).filter(name => name !== "Unknown");
                
                html += `
                    <div class="admin-class-item">
                        <h4>${className}</h4>
                        <div class="class-stats">
                            <p><strong>Teacher:</strong> ${teacherName}</p>
                            <p><strong>Students:</strong> ${studentCount} enrolled</p>
                            <p><strong>Student Names:</strong> ${studentNames.length > 0 ? studentNames.join(", ") : "No students enrolled"}</p>
                        </div>
                    </div>
                `;
            });
            
            classesList.innerHTML = html;
        } catch (error) {
            console.error("Error loading classes:", error);
            classesList.innerHTML = "<p style='text-align: center; color: #dc3545; padding: 20px;'>Error loading classes. Please refresh the page.</p>";
        }
    }
}

// Update dashboard fees
async function updateDashboardFees() {
    if (!window.db) return;
    
    try {
        const studentFees = await getFirestoreDocs("studentFees");
        const payments = await getFirestoreDocs("payments");
        
        const totalPending = studentFees
            .filter(f => f.status === "pending")
            .reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
        
        const totalCollected = payments
            .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        
        const pendingFeesEl = document.getElementById("totalPendingFees");
        const collectedFeesEl = document.getElementById("totalCollectedFees");
        if (pendingFeesEl) pendingFeesEl.textContent = `$${totalPending.toFixed(2)}`;
        if (collectedFeesEl) collectedFeesEl.textContent = `$${totalCollected.toFixed(2)}`;
    } catch (error) {
        console.error("Error updating dashboard fees:", error);
    }
}

// Update dashboard attendance
async function updateDashboardAttendance() {
    if (!window.db) return;
    
    try {
        const attendanceRecords = await getFirestoreDocs("attendance");
        const today = new Date().toISOString().split('T')[0];
        const todayRecords = attendanceRecords.filter(r => r.date === today);
        
        const presentCount = todayRecords.filter(r => r.status === "present").length;
        const absentCount = todayRecords.filter(r => r.status === "absent").length;
        const totalToday = presentCount + absentCount;
        
        const attendanceSummaryEl = document.getElementById("attendanceSummary");
        if (attendanceSummaryEl) {
            attendanceSummaryEl.innerHTML = `
                <div class="attendance-summary-item">
                    <span>Today's Attendance:</span>
                    <span><strong>${totalToday} students</strong></span>
                </div>
                <div class="attendance-summary-item present">
                    <span>Present:</span>
                    <span><strong>${presentCount}</strong></span>
                </div>
                <div class="attendance-summary-item absent">
                    <span>Absent:</span>
                    <span><strong>${absentCount}</strong></span>
                </div>
            `;
        }
    } catch (error) {
        console.error("Error updating dashboard attendance:", error);
    }
}

// Update recent activity
function updateRecentActivity() {
    const recentActivityEl = document.getElementById("recentActivity");
    if (!recentActivityEl) return;
    
    // Get recent payments and attendance
    const activities = [];
    
    // This would be populated from recent payments and attendance records
    // For now, show placeholder
    recentActivityEl.innerHTML = `
        <div class="activity-item">
            <span class="activity-time">Today</span>
            <span class="activity-text">System initialized</span>
        </div>
    `;
}

// Render dashboard charts
function renderDashboardCharts() {
    // Fees chart
    const feesCtx = document.getElementById("dashboardFeesChart");
    if (feesCtx && window.Chart) {
        // This will be updated with actual data when fees are loaded
        new Chart(feesCtx, {
            type: 'doughnut',
            data: {
                labels: ['Pending', 'Collected'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: ['#ffc107', '#28a745']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true
            }
        });
    }
    
    // Attendance chart
    const attendanceCtx = document.getElementById("dashboardAttendanceChart");
    if (attendanceCtx && window.Chart) {
        new Chart(attendanceCtx, {
            type: 'bar',
            data: {
                labels: ['Present', 'Absent'],
                datasets: [{
                    label: 'Today',
                    data: [0, 0],
                    backgroundColor: ['#28a745', '#dc3545']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

// Admin tab switching
window.showAdminTab = function(tab) {
    try {
        // Close sidebar on mobile after clicking
        const sidebar = document.getElementById("sidebar");
        if (sidebar) {
            sidebar.classList.remove("show");
        }
        
        // Hide all tabs
        const tabIds = ["dashboardTab", "communicationTab", "feesTab", "expensesTab", "transportTab", "reportsTab", "attendanceTab", "adminTab", "suggestionsTab", "helpTab"];
        tabIds.forEach(t => {
            const element = document.getElementById(t);
            if (element) {
                element.style.display = "none";
            }
        });
        
        // Show the selected tab
        const targetTab = document.getElementById(tab + "Tab");
        if (targetTab) {
            targetTab.style.display = "block";
            
            // Load appropriate data based on tab
            if (tab === "dashboard") {
                loadAdminData();
            } else if (tab === "fees" && window.loadFeesData) {
                window.loadFeesData();
            } else if (tab === "attendance" && window.loadAttendanceData) {
                window.loadAttendanceData();
            } else if (tab === "admin" && window.renderManagementInterface) {
                window.renderManagementInterface();
            } else if (tab === "suggestions") {
                loadSuggestions();
            }
        }
    } catch (error) {
        console.error("Error in showAdminTab:", error);
    }
};

// Load and display suggestions from Firestore
async function loadSuggestions() {
    // Create suggestions tab container if it doesn't exist
    let suggestionsTab = document.getElementById("suggestionsTab");
    if (!suggestionsTab) {
        // Find the help tab to insert before it
        const helpTab = document.getElementById("helpTab");
        if (helpTab && helpTab.parentNode) {
            suggestionsTab = document.createElement("div");
            suggestionsTab.id = "suggestionsTab";
            suggestionsTab.style.display = "none";
            helpTab.parentNode.insertBefore(suggestionsTab, helpTab);
        }
    }
    
    // Ensure the container exists
    let suggestionsContainer = document.getElementById("suggestionsContainer");
    if (!suggestionsContainer && suggestionsTab) {
        suggestionsTab.innerHTML = `
            <h2 style="text-align: center; color: #667eea; margin-bottom: 20px;">Suggestions</h2>
            <div id="suggestionsContainer"></div>
        `;
        suggestionsContainer = document.getElementById("suggestionsContainer");
    }
    
    if (!suggestionsContainer) {
        console.error("Could not create suggestions container");
        return;
    }
    
    if (!window.db) {
        suggestionsContainer.innerHTML = "<p style='text-align: center; color: #666; padding: 20px;'>Firestore not initialized. Please refresh the page.</p>";
        return;
    }
    
    try {
        // Load all suggestions from Firestore
        const suggestionsSnapshot = await window.db.collection("suggestions").get();
        
        if (suggestionsSnapshot.empty) {
            suggestionsContainer.innerHTML = "<p style='text-align: center; color: #666; padding: 40px;'>No suggestions submitted yet.</p>";
            return;
        }
        
        let html = '<div class="suggestions-list">';
        
        suggestionsSnapshot.forEach((doc) => {
            const suggestionData = doc.data();
            const suggestionId = doc.id;
            
            // Extract fields
            const studentName = suggestionData.studentName || suggestionData.studentUsername || "Unknown Student";
            const message = suggestionData.message || suggestionData.suggestion || "";
            const timestamp = suggestionData.timestamp || suggestionData.createdAt || "";
            
            // Format timestamp
            let formattedDate = "Unknown date";
            if (timestamp) {
                try {
                    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
                    formattedDate = date.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                    });
                } catch (e) {
                    console.error("Error formatting date:", e);
                }
            }
            
            html += `
                <div class="suggestion-item" style="background: white; padding: 20px; margin-bottom: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div class="suggestion-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <strong style="font-size: 16px; color: #333;">${studentName}</strong>
                        <span style="color: #666; font-size: 14px;">${formattedDate}</span>
                    </div>
                    <p class="suggestion-text" style="color: #555; line-height: 1.6; margin-bottom: 10px;">${message}</p>
                    <div style="text-align: right;">
                        <button onclick="deleteSuggestion('${suggestionId}')" style="background: #dc3545; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
                            Delete
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        suggestionsContainer.innerHTML = html;
    } catch (error) {
        console.error("Error loading suggestions:", error);
        suggestionsContainer.innerHTML = "<p style='text-align: center; color: #dc3545; padding: 20px;'>Error loading suggestions. Please refresh the page.</p>";
    }
}

// Delete a suggestion from Firestore
async function deleteSuggestion(suggestionId) {
    if (!confirm("Are you sure you want to delete this suggestion?")) {
        return;
    }
    
    if (!window.db) {
        showError("Firestore not initialized. Please refresh the page.");
        return;
    }
    
    try {
        await window.db.collection("suggestions").doc(suggestionId).delete();
        
        // Reload suggestions after deletion
        await loadSuggestions();
        
        // Show success message (using alert since showSuccess might not be defined)
        alert("Suggestion deleted successfully.");
    } catch (error) {
        console.error("Error deleting suggestion:", error);
        alert("Error deleting suggestion. Please try again.");
    }
}

// Make deleteSuggestion globally accessible
window.deleteSuggestion = deleteSuggestion;

// Initialize admin page
window.onload = async function() {
    if (window.location.pathname.includes("admin.html")) {
        const hasAccess = await checkAdminAccess();
        if (!hasAccess) {
            return;
        }
        
        // Create Suggestions sidebar button if it doesn't exist
        const sidebar = document.getElementById("sidebar");
        if (sidebar) {
            let suggestionsBtn = sidebar.querySelector('button[onclick*="suggestions"]');
            if (!suggestionsBtn) {
                // Find the Accounts button to insert after it
                const accountsBtn = sidebar.querySelector('button[onclick*="accounts"]');
                if (accountsBtn && accountsBtn.parentNode) {
                    suggestionsBtn = document.createElement("button");
                    suggestionsBtn.textContent = "💡 Suggestions";
                    suggestionsBtn.setAttribute("onclick", "navigateToAdminTab('suggestions')");
                    accountsBtn.parentNode.insertBefore(suggestionsBtn, accountsBtn.nextSibling);
                }
            }
        }
        
        // Display admin username or UID
        const storedUsername = localStorage.getItem("loggedInUser");
        const displayName = storedUsername ? storedUsername.replace("admin_", "") : adminUID;
        if (document.getElementById("userNameDisplay")) {
            document.getElementById("userNameDisplay").innerText = displayName;
        }
        
        // Check for tab parameter in URL
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab');
        if (tabParam) {
            // Show the specified tab
            showAdminTab(tabParam);
        } else {
            // Default to dashboard
            loadAdminData();
        }
        
        // Set up auto-refresh every 30 seconds
        setInterval(loadAdminData, 30000);
    }
};

// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    if (sidebar) {
        sidebar.classList.toggle("show");
    }
}

// Logout function
function logout() {
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("userType");
    localStorage.removeItem("adminUID");
    window.location.href = "index.html";
}

