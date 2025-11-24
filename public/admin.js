// ======= ADMIN FUNCTIONALITY =======
let adminUID = null;
let adminData = {
    students: [],
    teachers: [],
    classes: []
};

// Check if user is admin
function checkAdminAccess() {
    const storedUID = localStorage.getItem("adminUID");
    const storedUserType = localStorage.getItem("userType");
    
    if (storedUserType !== "admin" || !storedUID) {
        // Not an admin, redirect to login
        window.location.href = "index.html";
        return false;
    }
    
    adminUID = storedUID;
    return true;
}

// Load admin data from Firestore
async function loadAdminData() {
    if (!window.db) {
        console.error("Firestore not initialized");
        document.getElementById("totalStudents").textContent = "Error";
        document.getElementById("totalTeachers").textContent = "Error";
        document.getElementById("classesList").innerHTML = "<p>Firestore not initialized. Please configure Firebase.</p>";
        return;
    }
    
    try {
        // Load students
        const studentsSnapshot = await window.getFirestoreDocs("students");
        adminData.students = studentsSnapshot;
        
        // Load teachers
        const teachersSnapshot = await window.getFirestoreDocs("teachers");
        adminData.teachers = teachersSnapshot;
        
        // Load classes
        const classesSnapshot = await window.getFirestoreDocs("classes");
        adminData.classes = classesSnapshot;
        
        // Update dashboard
        updateAdminDashboard();
    } catch (error) {
        console.error("Error loading admin data:", error);
        alert("Error loading data from Firestore. Please check your connection.");
    }
}

// Update admin dashboard with data
function updateAdminDashboard() {
    // Update total students
    const totalStudents = adminData.students.length;
    document.getElementById("totalStudents").textContent = totalStudents;
    
    // Update total teachers
    const totalTeachers = adminData.teachers.length;
    document.getElementById("totalTeachers").textContent = totalTeachers;
    
    // Update classes list
    const classesList = document.getElementById("classesList");
    if (adminData.classes.length === 0) {
        classesList.innerHTML = "<p style='text-align: center; color: #666; padding: 20px;'>No classes found.</p>";
        return;
    }
    
    let html = "";
    adminData.classes.forEach(classDoc => {
        const className = classDoc.className || classDoc.name || "Unnamed Class";
        const teacherUID = classDoc.teacherUID || classDoc.teacher || "";
        
        // Find teacher name
        const teacher = adminData.teachers.find(t => t.uid === teacherUID || t.id === teacherUID);
        const teacherName = teacher ? (teacher.name || teacher.email || teacherUID) : "No Teacher";
        
        // Count students in this class
        // Check if class has studentUIDs array or studentCount
        let studentCount = 0;
        if (classDoc.studentUIDs && Array.isArray(classDoc.studentUIDs)) {
            studentCount = classDoc.studentUIDs.length;
        } else if (classDoc.studentCount !== undefined) {
            studentCount = classDoc.studentCount;
        } else {
            // Count students that have this class in their classes array
            studentCount = adminData.students.filter(student => {
                const studentClasses = student.classes || [];
                return studentClasses.includes(classDoc.id) || studentClasses.includes(className);
            }).length;
        }
        
        html += `
            <div class="admin-class-item">
                <h4>${className}</h4>
                <div class="class-stats">
                    <p><strong>Teacher:</strong> ${teacherName}</p>
                    <p><strong>Students:</strong> ${studentCount}</p>
                </div>
            </div>
        `;
    });
    
    classesList.innerHTML = html;
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
            
            // Reload dashboard data if dashboard tab is selected
            if (tab === "dashboard") {
                loadAdminData();
            }
        }
    } catch (error) {
        console.error("Error in showAdminTab:", error);
    }
};

// Setup sidebar buttons
function setupAdminSidebarButtons() {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;
    
    const buttons = sidebar.querySelectorAll("button");
    buttons.forEach(button => {
        const onclick = button.getAttribute("onclick");
        if (onclick && onclick.includes("showTab")) {
            const match = onclick.match(/showTab\(['"]([^'"]+)['"]\)/);
            if (match && match[1]) {
                const tabName = match[1];
                button.addEventListener("click", function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.showAdminTab(tabName);
                });
            }
        }
    });
}

// Initialize admin page
window.onload = function() {
    if (window.location.pathname.includes("admin.html")) {
        if (!checkAdminAccess()) {
            return;
        }
        
        // Display admin UID
        if (document.getElementById("userNameDisplay")) {
            document.getElementById("userNameDisplay").innerText = adminUID;
        }
        
        // Setup sidebar
        setupAdminSidebarButtons();
        
        // Load admin data
        loadAdminData();
        
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

