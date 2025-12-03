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
    if (!window.db) {
        console.error("Firestore not initialized");
        const totalStudentsEl = document.getElementById("totalStudents");
        const totalTeachersEl = document.getElementById("totalTeachers");
        const classesListEl = document.getElementById("classesList");
        if (totalStudentsEl) totalStudentsEl.textContent = "Error";
        if (totalTeachersEl) totalTeachersEl.textContent = "Error";
        if (classesListEl) classesListEl.innerHTML = "<p>Firestore not initialized. Please configure Firebase.</p>";
        return;
    }
    
    try {
        // Load all users from unified users collection
        const allUsers = await getFirestoreDocs("users");
        
        // Filter students and teachers by role
        adminData.students = allUsers.filter(user => user.role === "student");
        adminData.teachers = allUsers.filter(user => user.role === "teacher");
        
        // Load classes
        adminData.classes = await getFirestoreDocs("classes");
        
        // Update dashboard
        await updateAdminDashboard();
    } catch (error) {
        console.error("Error loading admin data:", error);
        alert("Error loading data from Firestore. Please check your connection.");
    }
}

// Update admin dashboard with data
async function updateAdminDashboard() {
    // Update total students - count from filtered array
    const totalStudents = adminData.students ? adminData.students.length : 0;
    const totalStudentsEl = document.getElementById("totalStudents");
    if (totalStudentsEl) totalStudentsEl.textContent = totalStudents;
    
    // Update total teachers - count from filtered array
    const totalTeachers = adminData.teachers ? adminData.teachers.length : 0;
    const totalTeachersEl = document.getElementById("totalTeachers");
    if (totalTeachersEl) totalTeachersEl.textContent = totalTeachers;
    
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
        if (adminData.classes.length === 0) {
            classesList.innerHTML = "<p style='text-align: center; color: #666; padding: 20px;'>No classes found.</p>";
        } else {
            let html = "";
            
            for (const classDoc of adminData.classes) {
                const className = classDoc.className || classDoc.name || "Unnamed Class";
                const teacherUid = classDoc.teacherUid || classDoc.teacherUID || classDoc.teacher || "";
                const studentUids = classDoc.studentUids || classDoc.studentUIDs || [];
                const doneCount = classDoc.doneCount || 0;
                const assignedCount = classDoc.assignedCount || 0;
                const missingCount = classDoc.missingCount || 0;
                
                // Find teacher name from users collection
                let teacherName = "No Teacher";
                if (teacherUid) {
                    try {
                        const teacherDoc = await window.db.collection("users")
                            .where("role", "==", "teacher")
                            .where(firebase.firestore.FieldPath.documentId(), "==", teacherUid)
                            .limit(1)
                            .get();
                        
                        if (!teacherDoc.empty) {
                            const teacherData = teacherDoc.docs[0].data();
                            const teacherInfo = teacherData.teacherInfo || {};
                            teacherName = teacherInfo.fullName || teacherData.username || "Unknown";
                        }
                    } catch (e) {
                        console.error("Error fetching teacher:", e);
                    }
                }
                
                // Get student names
                let studentNames = [];
                if (studentUids && studentUids.length > 0) {
                    try {
                        const studentsSnapshot = await window.db.collection("users")
                            .where("role", "==", "student")
                            .get();
                        
                        studentsSnapshot.forEach(doc => {
                            if (studentUids.includes(doc.id)) {
                                const studentData = doc.data();
                                const studentInfo = studentData.studentInfo || {};
                                studentNames.push(studentInfo.fullName || studentData.username || "Unknown");
                            }
                        });
                    } catch (e) {
                        console.error("Error fetching students:", e);
                    }
                }
                
                const totalTasks = assignedCount + missingCount;
                const progressPercent = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;
                
                html += `
                    <div class="admin-class-item">
                        <h4>${className}</h4>
                        <div class="class-stats">
                            <p><strong>Teacher:</strong> ${teacherName}</p>
                            <p><strong>Students:</strong> ${studentNames.length > 0 ? studentNames.join(", ") : "No students enrolled"}</p>
                            <p><strong>Progress:</strong> ${doneCount} of ${totalTasks} completed (${progressPercent}%)</p>
                            ${totalTasks > 0 ? `<div class="progress-bar"><div class="progress-fill" style="width: ${progressPercent}%; background: #667eea; height: 8px; border-radius: 4px;"></div></div>` : ""}
                        </div>
                    </div>
                `;
            }
            classesList.innerHTML = html;
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
        const tabIds = ["dashboardTab", "communicationTab", "feesTab", "expensesTab", "transportTab", "reportsTab", "attendanceTab", "adminTab", "helpTab"];
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
            }
        }
    } catch (error) {
        console.error("Error in showAdminTab:", error);
    }
};

// Initialize admin page
window.onload = async function() {
    if (window.location.pathname.includes("admin.html")) {
        const hasAccess = await checkAdminAccess();
        if (!hasAccess) {
            return;
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

