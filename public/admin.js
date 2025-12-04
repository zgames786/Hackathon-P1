// ======= ADMIN FUNCTIONALITY =======
let adminUID = null;
let adminData = {
    students: [],
    teachers: [],
    classes: []
};

// Chart instances - global variables to track chart instances
let dashboardFeesChart = null;
let dashboardAttendanceChart = null;
let isRenderingCharts = false;

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
                
                const classId = doc.id;
                html += `
                    <div class="admin-class-item" onclick="showClassDetails('${classId}')" style="cursor: pointer;">
                        <h4>${className}</h4>
                        <div class="class-stats">
                            <p><strong>Teacher:</strong> ${teacherName}</p>
                            <p><strong>Students:</strong> ${studentCount} enrolled</p>
                            <p><strong>Student Names:</strong> ${studentNames.length > 0 ? studentNames.join(", ") : "No students enrolled"}</p>
                        </div>
                    </div>
                `;
            });
            
            // Add class detail panel container after the classes list
            html += `
                <div id="classDetailPanel" style="display: none; margin-top: 20px; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h3 id="classDetailTitle" style="color: #667eea; margin: 0;"></h3>
                        <button onclick="closeClassDetails()" style="background: #666; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">Close</button>
                    </div>
                    <div id="classDetailContent"></div>
                </div>
            `;
            
            classesList.innerHTML = html;
        } catch (error) {
            console.error("Error loading classes:", error);
            classesList.innerHTML = "<p style='text-align: center; color: #dc3545; padding: 20px;'>Error loading classes. Please refresh the page.</p>";
        }
    }
}

// Show class details when a class is clicked
async function showClassDetails(classId) {
    if (!window.db) {
        alert("Firestore not initialized. Please refresh the page.");
        return;
    }
    
    try {
        const classDoc = await window.db.collection("classes").doc(classId).get();
        
        if (!classDoc.exists) {
            alert("Class not found.");
            return;
        }
        
        const classData = classDoc.data();
        const className = classData.className || "Unnamed Class";
        const section = classData.section || "N/A";
        const teacherName = classData.teacherName || "No Teacher";
        const students = Array.isArray(classData.students) ? classData.students : [];
        const studentCount = students.length;
        
        // Get the detail panel
        const detailPanel = document.getElementById("classDetailPanel");
        const detailTitle = document.getElementById("classDetailTitle");
        const detailContent = document.getElementById("classDetailContent");
        
        if (!detailPanel || !detailTitle || !detailContent) {
            console.error("Class detail panel elements not found");
            return;
        }
        
        // Update title
        detailTitle.textContent = className;
        
        // Build detail content
        let contentHtml = `
            <div style="margin-bottom: 20px;">
                <p><strong>Section:</strong> ${section}</p>
                <p><strong>Teacher:</strong> ${teacherName}</p>
                <p><strong>Total Students:</strong> ${studentCount}</p>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4 style="color: #333; margin-bottom: 10px;">Enrolled Students:</h4>
        `;
        
        if (students.length === 0) {
            contentHtml += `<p style="color: #666; font-style: italic;">No students enrolled in this class.</p>`;
        } else {
            contentHtml += `<ul style="list-style: none; padding: 0;">`;
            students.forEach((student, index) => {
                const studentName = (student && typeof student === 'object' && student.name) ? student.name : "Unknown";
                const studentUid = (student && typeof student === 'object' && student.uid) ? student.uid : "";
                contentHtml += `
                    <li style="padding: 10px; margin-bottom: 8px; background: #f5f5f5; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
                        <span>${studentName}</span>
                        <button onclick="removeStudentFromClass('${classId}', '${studentUid}', '${studentName.replace(/'/g, "\\'")}')" style="background: #dc3545; color: white; padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Remove</button>
                    </li>
                `;
            });
            contentHtml += `</ul>`;
        }
        
        contentHtml += `
            </div>
            
            <div style="border-top: 2px solid #e0e0e0; padding-top: 20px; text-align: center;">
                <button onclick="deleteClass('${classId}', '${className.replace(/'/g, "\\'")}')" style="background: #dc3545; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; font-weight: 600;">
                    Delete Class
                </button>
            </div>
        `;
        
        detailContent.innerHTML = contentHtml;
        detailPanel.style.display = "block";
        
        // Scroll to the detail panel
        detailPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
        console.error("Error loading class details:", error);
        alert("Error loading class details. Please try again.");
    }
}

// Close class details panel
function closeClassDetails() {
    const detailPanel = document.getElementById("classDetailPanel");
    if (detailPanel) {
        detailPanel.style.display = "none";
    }
}

// Remove a student from a class
async function removeStudentFromClass(classId, studentUid, studentName) {
    if (!confirm(`Are you sure you want to remove ${studentName} from this class?`)) {
        return;
    }
    
    if (!window.db) {
        alert("Firestore not initialized. Please refresh the page.");
        return;
    }
    
    try {
        const classDoc = await window.db.collection("classes").doc(classId).get();
        
        if (!classDoc.exists) {
            alert("Class not found.");
            return;
        }
        
        const classData = classDoc.data();
        const students = Array.isArray(classData.students) ? classData.students : [];
        
        // Remove the student from the array
        const updatedStudents = students.filter(student => {
            if (student && typeof student === 'object') {
                return student.uid !== studentUid;
            }
            return true;
        });
        
        // Update the class document
        await window.db.collection("classes").doc(classId).update({
            students: updatedStudents
        });
        
        // Also update the student's enrolledClasses in their user document
        try {
            const studentDoc = await window.db.collection("users").doc(studentUid).get();
            if (studentDoc.exists) {
                const studentData = studentDoc.data();
                const enrolledClasses = Array.isArray(studentData.studentInfo?.enrolledClasses) 
                    ? studentData.studentInfo.enrolledClasses 
                    : [];
                
                const updatedEnrolledClasses = enrolledClasses.filter(id => id !== classId);
                
                await window.db.collection("users").doc(studentUid).update({
                    "studentInfo.enrolledClasses": updatedEnrolledClasses
                });
            }
        } catch (studentUpdateError) {
            console.error("Error updating student's enrolled classes:", studentUpdateError);
            // Continue even if student update fails
        }
        
        alert(`${studentName} has been removed from the class.`);
        
        // Refresh class details and classes list
        await showClassDetails(classId);
        await updateAdminDashboard();
    } catch (error) {
        console.error("Error removing student from class:", error);
        alert("Error removing student. Please try again.");
    }
}

// Delete an entire class
async function deleteClass(classId, className) {
    if (!confirm(`Are you sure you want to delete the class "${className}"? This action cannot be undone.`)) {
        return;
    }
    
    if (!window.db) {
        alert("Firestore not initialized. Please refresh the page.");
        return;
    }
    
    try {
        // Get class data first to remove students from their enrolledClasses
        const classDoc = await window.db.collection("classes").doc(classId).get();
        
        if (classDoc.exists) {
            const classData = classDoc.data();
            const students = Array.isArray(classData.students) ? classData.students : [];
            
            // Remove classId from each student's enrolledClasses
            for (const student of students) {
                if (student && typeof student === 'object' && student.uid) {
                    try {
                        const studentDoc = await window.db.collection("users").doc(student.uid).get();
                        if (studentDoc.exists) {
                            const studentData = studentDoc.data();
                            const enrolledClasses = Array.isArray(studentData.studentInfo?.enrolledClasses) 
                                ? studentData.studentInfo.enrolledClasses 
                                : [];
                            
                            const updatedEnrolledClasses = enrolledClasses.filter(id => id !== classId);
                            
                            await window.db.collection("users").doc(student.uid).update({
                                "studentInfo.enrolledClasses": updatedEnrolledClasses
                            });
                        }
                    } catch (studentUpdateError) {
                        console.error(`Error updating student ${student.uid}:`, studentUpdateError);
                        // Continue with other students even if one fails
                    }
                }
            }
        }
        
        // Delete the class document
        await window.db.collection("classes").doc(classId).delete();
        
        alert(`Class "${className}" has been deleted.`);
        
        // Close detail panel and refresh classes list
        closeClassDetails();
        await updateAdminDashboard();
    } catch (error) {
        console.error("Error deleting class:", error);
        alert("Error deleting class. Please try again.");
    }
}

// Make functions globally accessible
window.showClassDetails = showClassDetails;
window.closeClassDetails = closeClassDetails;
window.removeStudentFromClass = removeStudentFromClass;
window.deleteClass = deleteClass;

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
    // Prevent concurrent chart rendering
    if (isRenderingCharts) {
        console.warn("Chart rendering already in progress. Skipping duplicate call.");
        return;
    }
    
    if (!window.Chart) {
        console.warn("Chart.js not loaded. Skipping chart rendering.");
        return;
    }
    
    isRenderingCharts = true;
    
    try {
        // Fees chart
        const feesCtx = document.getElementById("dashboardFeesChart");
        if (feesCtx) {
            // Destroy existing chart instance if it exists
            if (dashboardFeesChart) {
                dashboardFeesChart.destroy();
                dashboardFeesChart = null;
            }
            
            // Create new chart instance
            dashboardFeesChart = new Chart(feesCtx, {
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
        if (attendanceCtx) {
            // Destroy existing chart instance if it exists
            if (dashboardAttendanceChart) {
                dashboardAttendanceChart.destroy();
                dashboardAttendanceChart = null;
            }
            
            // Create new chart instance
            dashboardAttendanceChart = new Chart(attendanceCtx, {
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
    } finally {
        isRenderingCharts = false;
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
    // Get or create suggestionsList element
    let suggestionsList = document.getElementById("suggestionsList");
    if (!suggestionsList) {
        const suggestionsTab = document.getElementById("suggestionsTab");
        if (suggestionsTab) {
            suggestionsList = document.createElement("div");
            suggestionsList.id = "suggestionsList";
            suggestionsTab.appendChild(suggestionsList);
        } else {
            console.error("Could not find suggestionsTab");
            return;
        }
    }
    
    if (!window.db) {
        suggestionsList.innerHTML = "<p style='text-align: center; color: #666; padding: 20px;'>Firestore not initialized. Please refresh the page.</p>";
        return;
    }
    
    try {
        suggestionsList.innerHTML = "<p style='text-align: center; color: #666; padding: 20px;'>Loading suggestions...</p>";
        
        const suggestionsSnapshot = await window.db.collection("suggestions").get();
        
        if (suggestionsSnapshot.empty) {
            suggestionsList.innerHTML = "<p style='text-align: center; color: #666; padding: 40px;'>No suggestions submitted yet.</p>";
            return;
        }
        
        const suggestionsArray = [];
        suggestionsSnapshot.forEach((doc) => {
            const data = doc.data();
            suggestionsArray.push({ id: doc.id, ...data });
        });
        
        // Sort by timestamp (newest first)
        suggestionsArray.sort((a, b) => {
            const aTime = a.timestamp ? (a.timestamp.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime()) : 0;
            const bTime = b.timestamp ? (b.timestamp.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime()) : 0;
            return bTime - aTime;
        });
        
        let html = "";
        suggestionsArray.forEach((suggestion) => {
            const name = suggestion.fromName || suggestion.studentName || suggestion.studentUsername || "Unknown";
            const message = suggestion.text || suggestion.message || suggestion.suggestion || "";
            const timestamp = suggestion.timestamp || suggestion.createdAt || null;
            
            let date = "Unknown date";
            if (timestamp) {
                try {
                    const dateObj = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
                    date = dateObj.toLocaleDateString("en-US", {
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
                <div style="background: white; padding: 20px; margin-bottom: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <strong style="font-size: 16px; color: #333;">${name}</strong>
                        <span style="color: #666; font-size: 14px;">${date}</span>
                    </div>
                    <p style="color: #555; line-height: 1.6; margin-bottom: 10px; white-space: pre-wrap;">${message}</p>
                    <div style="text-align: right;">
                        <button onclick="deleteSuggestion('${suggestion.id}')" style="background: #dc3545; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Delete</button>
                    </div>
                </div>
            `;
        });
        
        suggestionsList.innerHTML = html;
    } catch (error) {
        console.error("Error loading suggestions:", error);
        suggestionsList.innerHTML = "<p style='text-align: center; color: #dc3545; padding: 20px;'>Error loading suggestions. Please refresh the page.</p>";
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

