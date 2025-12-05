// ======= DATA STORAGE =======
let userType = "";
let loggedInUser = null;
let adminUIDs = []; // Array of admin UIDs - should be set from Firestore or config
// Hardcoded master UID - must match the one in admin-create.js
const MASTER_UID = "zW3LsKJr1IZiLt149F25ObvYcX32";
// Initialize with empty structure - will be loaded from localStorage
let usersDB = {student: {}, teacher: {}, admin: {}};
let classesDB = {}; // classCode: {name, teacher, assignments: [{id, name, due}]}
let studentAssignmentsDB = {}; // studentUsername_classCode_assignmentId: status
let suggestionsDB = []; // Array of {id, studentUsername, suggestion, timestamp}
let currentTab = "dashboard";
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let currentAssignmentTab = "active";
let pieChart = null;
let statisticsChart = null;

// Load data from localStorage with error handling and data preservation
function loadData() {
    // Load usersDB with error handling - prioritize localStorage data
    try {
        const savedUsers = localStorage.getItem("usersDB");
        if (savedUsers) {
            const parsed = JSON.parse(savedUsers);
            // Validate structure - only use if it's a valid object with student/teacher properties
            if (parsed && typeof parsed === 'object') {
                // If localStorage has data, use it (prioritize saved data over defaults)
                if (parsed.student && typeof parsed.student === 'object') {
                    usersDB.student = {...parsed.student, ...usersDB.student}; // Saved data first, then defaults
                }
                if (parsed.teacher && typeof parsed.teacher === 'object') {
                    usersDB.teacher = {...parsed.teacher, ...usersDB.teacher}; // Saved data first, then defaults
                }
            }
        }
    } catch (e) {
        console.error("Error loading usersDB, keeping defaults:", e);
        // Keep default empty structure if loading fails
    }
    
    // Load classesDB with error handling - prioritize localStorage data
    try {
        const savedClasses = localStorage.getItem("classesDB");
        if (savedClasses) {
            const parsed = JSON.parse(savedClasses);
            // Validate structure - only use if it's a valid object
            if (parsed && typeof parsed === 'object') {
                // If localStorage has data, use it (prioritize saved data over defaults)
                classesDB = {...parsed, ...classesDB}; // Saved data first, then defaults
            }
        }
    } catch (e) {
        console.error("Error loading classesDB, keeping defaults:", e);
        // Keep default empty structure if loading fails
    }
    
    // Load studentAssignmentsDB with error handling - prioritize localStorage data
    try {
        const savedStudentAssignments = localStorage.getItem("studentAssignmentsDB");
        if (savedStudentAssignments) {
            const parsed = JSON.parse(savedStudentAssignments);
            // Validate structure - only use if it's a valid object
            if (parsed && typeof parsed === 'object') {
                // If localStorage has data, use it (prioritize saved data over defaults)
                studentAssignmentsDB = {...parsed, ...studentAssignmentsDB}; // Saved data first, then defaults
            }
        }
    } catch (e) {
        console.error("Error loading studentAssignmentsDB, keeping defaults:", e);
        // Keep default empty structure if loading fails
    }
    
    // Load suggestionsDB with error handling
    try {
        const savedSuggestions = localStorage.getItem("suggestionsDB");
        if (savedSuggestions) {
            const parsed = JSON.parse(savedSuggestions);
            // Validate structure - should be an array
            if (Array.isArray(parsed)) {
                suggestionsDB = parsed;
            }
        }
    } catch (e) {
        console.error("Error loading suggestionsDB, keeping defaults:", e);
        // Keep default empty array if loading fails
    }
}

// Save data to localStorage (always saves to ensure data persistence)
function saveData() {
    try {
        localStorage.setItem("usersDB", JSON.stringify(usersDB));
        localStorage.setItem("classesDB", JSON.stringify(classesDB));
        localStorage.setItem("studentAssignmentsDB", JSON.stringify(studentAssignmentsDB));
        localStorage.setItem("suggestionsDB", JSON.stringify(suggestionsDB));
    } catch (e) {
        console.error("Error saving data to localStorage:", e);
        // If storage is full or there's an error, try to clear old data or notify user
        alert("Warning: Could not save data. Your browser storage may be full.");
    }
}

// Initialize
loadData();

// Load admin UIDs (can be from Firestore or hardcoded)
async function loadAdminUIDs() {
    // Try to load from Firestore if available
    // Create an "admins" collection in Firestore with documents like: {uid: "admin-uid-here"}
    if (window.db && window.getFirestoreDocs) {
        try {
            const admins = await window.getFirestoreDocs("admins");
            adminUIDs = admins.map(admin => admin.uid || admin.id);
            if (adminUIDs.length > 0) {
                return;
            }
        } catch (error) {
            console.log("Could not load admins from Firestore, using default list");
        }
    }
    // Default admin UIDs - add UIDs here for hardcoded admin access
    // Format: adminUIDs = ["admin-uid-1", "admin-uid-2", ...];
    // OR create an "admins" collection in Firestore with documents containing {uid: "admin-uid"}
    if (adminUIDs.length === 0) {
        // Add your admin UIDs here, or set up Firestore "admins" collection
        adminUIDs = [];
    }
}

// ======= LOGIN & ACCOUNT =======
let selectedRole = null; // Store selected role globally

// Helper function to get current user data from localStorage (unified structure)
function getCurrentUserData() {
    try {
        const userSessionStr = localStorage.getItem("userSession");
        if (!userSessionStr) return null;
        return JSON.parse(userSessionStr);
    } catch (e) {
        console.error("Error parsing userSession:", e);
        return null;
    }
}

// Helper function to get user classes from unified structure
function getUserClasses() {
    try {
        // Always read fresh data from localStorage
        const userSessionStr = localStorage.getItem("userSession");
        if (!userSessionStr) {
            return [];
        }
        
        const userData = JSON.parse(userSessionStr);
        if (!userData || !userData.role) {
            return [];
        }
        
        if (userData.role === "teacher") {
            if (!userData.teacherInfo) {
                return [];
            }
            const classes = Array.isArray(userData.teacherInfo.classes) 
                ? userData.teacherInfo.classes 
                : [];
            // Filter out any null/undefined/invalid class IDs
            return classes.filter(classId => classId && typeof classId === 'string' && classId.trim() !== '');
        } else if (userData.role === "student") {
            if (!userData.studentInfo) {
                return [];
            }
            const classes = Array.isArray(userData.studentInfo.enrolledClasses) 
                ? userData.studentInfo.enrolledClasses 
                : [];
            // Filter out any null/undefined/invalid class IDs
            return classes.filter(classId => classId && typeof classId === 'string' && classId.trim() !== '');
        }
        return [];
    } catch (error) {
        console.error("Error getting user classes:", error);
        return [];
    }
}

// Helper function to update user classes in localStorage and Firestore
async function updateUserClasses(classes) {
    const userData = getCurrentUserData();
    if (!userData) return false;
    
    try {
        if (userData.role === "teacher") {
            userData.teacherInfo = userData.teacherInfo || {};
            userData.teacherInfo.classes = classes;
        } else if (userData.role === "student") {
            userData.studentInfo = userData.studentInfo || {};
            userData.studentInfo.enrolledClasses = classes;
        }
        
        // Update localStorage
        localStorage.setItem("userSession", JSON.stringify(userData));
        
        // Update Firestore if db is available
        if (window.db && userData.uid) {
            const updateData = {};
            if (userData.role === "teacher") {
                updateData.teacherInfo = userData.teacherInfo;
            } else if (userData.role === "student") {
                updateData.studentInfo = userData.studentInfo;
            }
            await window.db.collection("users").doc(userData.uid).update(updateData);
        }
        return true;
    } catch (e) {
        console.error("Error updating user classes:", e);
        return false;
    }
}

function selectRole(role) {
    selectedRole = role;
    userType = role;
    
    // Update button styles
    document.querySelectorAll(".role-btn").forEach(btn => {
        btn.classList.remove("role-btn-active");
    });
    
    const activeBtn = document.getElementById("roleBtn" + role.charAt(0).toUpperCase() + role.slice(1));
    if (activeBtn) {
        activeBtn.classList.add("role-btn-active");
    }
    
    // Show login form when role is selected
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.style.display = "block";
    }
    
    // Show/hide "Create Admin Account" link
    const createAdminLink = document.getElementById("createAdminLink");
    if (createAdminLink) {
        createAdminLink.style.display = (role === "admin") ? "block" : "none";
    }
}

function selectType(type) {
    // Legacy function - redirect to selectRole
    selectRole(type);
}

// ======= LOGIN ATTEMPT TRACKING =======
function checkLoginBlocked() {
    const blockData = localStorage.getItem("loginBlock");
    if (!blockData) return false;
    
    try {
        const block = JSON.parse(blockData);
        const blockTime = block.timestamp;
        const now = Date.now();
        const fifteenMinutes = 15 * 60 * 1000; // 15 minutes in milliseconds
        
        if (now - blockTime < fifteenMinutes) {
            const remainingMinutes = Math.ceil((fifteenMinutes - (now - blockTime)) / 60000);
            showError(`Login blocked. Too many failed attempts. Please try again in ${remainingMinutes} minute(s).`);
            return true;
        } else {
            // Block expired, clear it
            localStorage.removeItem("loginBlock");
            localStorage.removeItem("loginAttempts");
            return false;
        }
    } catch (e) {
        localStorage.removeItem("loginBlock");
        localStorage.removeItem("loginAttempts");
        return false;
    }
}

function recordFailedAttempt() {
    let attempts = parseInt(localStorage.getItem("loginAttempts") || "0");
    attempts++;
    localStorage.setItem("loginAttempts", attempts.toString());
    
    if (attempts >= 3) {
        // Block for 15 minutes
        const blockData = {
            timestamp: Date.now()
        };
        localStorage.setItem("loginBlock", JSON.stringify(blockData));
        showError("Too many failed login attempts. Login blocked for 15 minutes.");
    } else {
        showError(`Invalid credentials. ${3 - attempts} attempt(s) remaining.`);
    }
}

function clearLoginAttempts() {
    localStorage.removeItem("loginAttempts");
    localStorage.removeItem("loginBlock");
}

async function login() {
    // Check if login is blocked
    if (checkLoginBlocked()) {
        return;
    }
    
    // Check if role is selected
    if (!selectedRole) {
        showError("Please select a role first");
        return;
    }
    
    userType = selectedRole;
    
    let u = document.getElementById("username").value.trim();
    let p = document.getElementById("password").value;
    if (!u || !p) {
        showError("Please enter both username and password");
        return;
    }
    
    // Admin login - use Firebase Auth
    if (userType === "admin") {
        try {
            const isValid = await checkAdminAccess(u, p);
            if (isValid) {
                clearLoginAttempts();
                loggedInUser = u;
                localStorage.setItem("loggedInUser", userType + "_" + u);
                localStorage.setItem("userType", userType);
                window.location.href = "admin.html";
            } else {
                recordFailedAttempt();
            }
        } catch (error) {
            console.error("Admin login error:", error);
            recordFailedAttempt();
        }
        return;
    }
    
    // Teacher/Student login - use Firestore accounts with plain password
    try {
        if (!window.db) {
            showError("Database not initialized. Please refresh the page.");
            return;
        }
        
        // Query users collection for matching username and role
        const usersSnapshot = await window.db.collection("users")
            .where("username", "==", u)
            .where("role", "==", userType)
            .limit(1)
            .get();
        
        if (usersSnapshot.empty) {
            showError("Invalid username or password");
            recordFailedAttempt();
            return;
        }
        
        // Get the user document
        const userDoc = usersSnapshot.docs[0];
        const userData = userDoc.data();
        
        // Verify password (plain text comparison)
        if (!userData.password) {
            showError("Invalid username or password");
            recordFailedAttempt();
            return;
        }
        
        if (userData.password === p) {
            clearLoginAttempts();
            loggedInUser = u;
            
            // Store entire user document in localStorage (with uid as document ID)
            const userDocument = {
                uid: userDoc.id,
                ...userData
            };
            
            localStorage.setItem("userSession", JSON.stringify(userDocument));
            localStorage.setItem("loggedInUser", userType + "_" + u);
            localStorage.setItem("userType", userType);
            
            // Redirect based on role
            if (userType === "teacher") {
                window.location.href = "home.html";
            } else if (userType === "student") {
                window.location.href = "home.html";
            }
        } else {
            showError("Invalid username or password");
            recordFailedAttempt();
        }
    } catch (error) {
        console.error("Login error:", error);
        showError("An error occurred during login. Please try again.");
    }
}

// Check admin access using Firebase Auth and admins collection
async function checkAdminAccess(username, password) {
    try {
        console.log("Step 1: username:", username);
        
        // Create fake email: username@admins.local
        const fakeEmail = `${username}@admins.local`;
        console.log("Step 2: fakeEmail:", fakeEmail);
        
        // Sign in with Firebase Auth
        if (window.auth && window.auth.signInWithEmailAndPassword) {
            console.log("Step 3: attempting Firebase Auth");
            try {
                const userCredential = await window.auth.signInWithEmailAndPassword(fakeEmail, password);
                const user = userCredential.user;
                console.log("Step 4: Auth success, uid:", user.uid);
                
                // After successful auth, verify admin document exists in Firestore
                if (window.db) {
                    console.log("Step 5: checking admins collection");
                    const adminDoc = await window.db.collection("admins").doc(username).get();
                    
                    if (adminDoc.exists) {
                        // Admin document exists, login succeeds
                        localStorage.setItem("adminUID", user.uid);
                        return true;
                    } else {
                        // Admin document does not exist
                        console.log("Admin document not found for username:", username);
                        return false;
                    }
                }
                
                // If Firestore not available but auth succeeded, allow access
                localStorage.setItem("adminUID", user.uid);
                return true;
            } catch (authError) {
                // Auth failed
                console.error("Auth error:", authError);
                return false;
            }
        }
        
        return false;
    } catch (error) {
        console.error("Error checking admin access:", error);
        return false;
    }
}

function logout() {
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("userType");
    localStorage.removeItem("adminUID");
    window.location.href = "index.html";
}

function showError(message) {
    alert(message);
}

function showSuccess(message) {
    alert(message);
}

// ======= DASHBOARD =======
window.onload = function() {
    // Protect admin pages - redirect non-admins
    if (window.location.pathname.includes("admin.html")) {
        const userType = localStorage.getItem("userType");
        const adminUID = localStorage.getItem("adminUID");
        if (userType !== "admin" || !adminUID) {
            window.location.href = "index.html";
            return;
        }
    }
    
    // Redirect admins away from regular pages
    if (window.location.pathname.includes("home.html")) {
        const userType = localStorage.getItem("userType");
        if (userType === "admin") {
            window.location.href = "admin.html";
            return;
        }
    }
    
    if (window.location.pathname.includes("home.html")) {
        if (localStorage.getItem("loggedInUser")) {
            const userInfo = localStorage.getItem("loggedInUser").split("_");
            userType = userInfo[0];
            loggedInUser = userInfo[1];
            if (document.getElementById("userNameDisplay"))
                document.getElementById("userNameDisplay").innerText = loggedInUser;
            if (userType === "teacher") {
                document.getElementById("addAssignmentBtn").style.display = "block";
                document.getElementById("createClassBtn").style.display = "block";
                document.getElementById("joinClassBtn").style.display = "none";
                // Show Statistics tab for teachers
                const sidebar = document.getElementById("sidebar");
                if (sidebar) {
                    const statsBtn = sidebar.querySelector('button[onclick*="statistics"]');
                    if (statsBtn) statsBtn.style.display = "block";
                    // Show Suggestions tab for teachers
                    const suggestionsBtn = sidebar.querySelector('button[onclick*="suggestions"]');
                    if (suggestionsBtn) suggestionsBtn.style.display = "block";
                }
            } else {
                document.getElementById("addAssignmentBtn").style.display = "none";
                document.getElementById("createClassBtn").style.display = "none";
                document.getElementById("joinClassBtn").style.display = "block";
                // Hide Statistics tab for students
                const sidebar = document.getElementById("sidebar");
                if (sidebar) {
                    const statsBtn = sidebar.querySelector('button[onclick*="statistics"]');
                    if (statsBtn) statsBtn.style.display = "none";
                }
            }
            
            // Set up sidebar button event listeners as backup
            setupSidebarButtons();
            
            renderPieChart();
            renderClasses();
            renderAssignments();
            renderCalendar();
        } else {
            window.location.href = "index.html";
        }
    }
}

function setupSidebarButtons() {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;
    
    const buttons = sidebar.querySelectorAll("button");
    buttons.forEach(button => {
        const onclick = button.getAttribute("onclick");
        if (onclick && onclick.includes("showTab")) {
            // Extract the tab name from onclick attribute
            const match = onclick.match(/showTab\(['"]([^'"]+)['"]\)/);
            if (match && match[1]) {
                const tabName = match[1];
                // Remove the onclick attribute to prevent double-calling
                button.removeAttribute("onclick");
                // Add click event listener instead
                button.addEventListener("click", function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.showTab(tabName);
                });
            }
        }
    });
}

function toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("show");
}

// Make sure showTab is accessible globally
// Prevent double-calling by tracking if tab switch is in progress
let isTabSwitching = false;

window.showTab = async function(tab) {
    // Prevent double-calling
    if (isTabSwitching) {
        return;
    }
    
    // Prevent switching to the same tab
    if (currentTab === tab) {
        return;
    }
    
    isTabSwitching = true;
    
    try {
        // Close sidebar on mobile after clicking
        const sidebar = document.getElementById("sidebar");
        if (sidebar) {
            sidebar.classList.remove("show");
        }
        
        // Hide all tabs
        const tabIds = ["dashboardTab", "assignmentsTab", "calendarTab", "statisticsTab", "suggestionsTab"];
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
            currentTab = tab;
            
            // Render content based on tab - wrap each in try-catch to prevent errors from stopping the tab switch
            // Make tab switching async and await all async render functions
            try {
                if (tab === "assignments") {
                    await renderAssignments();
                } else if (tab === "calendar") {
                    await renderCalendar();
                } else if (tab === "dashboard") {
                    await renderPieChart();
                    await renderClasses();
                } else if (tab === "statistics") {
                    await renderStatistics();
                } else if (tab === "suggestions") {
                    // Render suggestions for students only
                    if (userType === "student") {
                        renderSuggestions();
                    }
                }
            } catch (renderError) {
                // Log render errors but don't show alert - tab should still switch
                console.error("Error rendering tab content:", renderError);
            }
        } else {
            console.error("Tab not found:", tab + "Tab");
        }
    } catch (error) {
        // Only log errors, don't show alert to user - errors are already handled in render functions
        console.error("Error in showTab:", error);
    } finally {
        // Always reset the flag, even if there was an error
        setTimeout(() => {
            isTabSwitching = false;
        }, 100);
    }
};

// ======= CLASSES =======
async function joinClass() {
    if (userType !== "student") {
        showError("Only students can join classes");
        return;
    }
    
    if (!window.db) {
        showError("Firestore not initialized. Please refresh the page.");
        return;
    }
    
    let classId = prompt("Enter class code:").trim().toUpperCase();
    if (!classId) return;
    
    try {
        const userData = getCurrentUserData();
        if (!userData || !userData.uid) {
            showError("User data not found. Please log in again.");
            return;
        }
        
        // Get class from Firestore
        const classDoc = await window.db.collection("classes").doc(classId).get();
        
        if (!classDoc.exists) {
            showError("Class code not found");
            return;
        }
        
        const classData = classDoc.data();
        
        // Check if student is already in the class
        const existingStudent = classData.students?.find(s => s.uid === userData.uid);
        if (existingStudent) {
            showError("You are already in this class");
            return;
        }
        
        // Get student name
        const studentName = userData.studentInfo?.fullName || userData.username || "";
        
        // Add student to class's students array in Firestore
        const students = classData.students || [];
        students.push({
            uid: userData.uid,
            name: studentName
        });
        
        await window.db.collection("classes").doc(classId).update({
            students: students
        });
        
        // Update student's enrolledClasses in Firestore user document
        const userClasses = getUserClasses();
        if (!userClasses.includes(classId)) {
            userClasses.push(classId);
            await updateUserClasses(userClasses);
        }
        
        showSuccess("Joined class: " + classData.className);
        
        // Refresh display
        await renderClasses();
        renderPieChart();
    } catch (error) {
        console.error("Error joining class:", error);
        showError("Error joining class. Please try again.");
    }
}

async function createClass() {
    if (userType !== "teacher") {
        showError("Only teachers can create classes");
        return;
    }
    
    if (!window.db) {
        showError("Firestore not initialized. Please refresh the page.");
        return;
    }
    
    let name = prompt("Enter class name:").trim();
    if (!name) return;
    
    let section = prompt("Enter section (optional):").trim() || "";
    
    try {
        const userData = getCurrentUserData();
        if (!userData || !userData.uid) {
            showError("User data not found. Please log in again.");
            return;
        }
        
        // Generate unique class code
        const classId = await generateClassCode();
        
        // Get teacher name
        const teacherName = userData.teacherInfo?.fullName || userData.username || "";
        
        // Create class document in Firestore
        const classData = {
            classId: classId,
            className: name,
            section: section,
            teacherId: userData.uid,
            teacherName: teacherName,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            students: [],
            assignments: []
        };
        
        await window.db.collection("classes").doc(classId).set(classData);
        
        // Update teacher's classes list in Firestore
        const userClasses = getUserClasses();
        if (!userClasses.includes(classId)) {
            userClasses.push(classId);
            await updateUserClasses(userClasses);
        }
        
        showSuccess("Class created! Code: " + classId);
        await renderClasses();
    } catch (error) {
        console.error("Error creating class:", error);
        showError("Error creating class. Please try again.");
    }
}

// Helper function to generate a unique class code
async function generateClassCode() {
    if (!window.db) {
        // Fallback if Firestore not available
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    
    let code;
    let exists = true;
    let attempts = 0;
    const maxAttempts = 10;
    
    // Generate unique code by checking Firestore
    while (exists && attempts < maxAttempts) {
        code = Math.random().toString(36).substring(2, 8).toUpperCase();
        try {
            const classDoc = await window.db.collection("classes").doc(code).get();
            exists = classDoc.exists;
        } catch (error) {
            console.error("Error checking class code:", error);
            // If error, assume code is unique to avoid infinite loop
            exists = false;
        }
        attempts++;
    }
    
    return code;
}

// Helper function to get class from Firestore
async function getClassFromFirestore(classId) {
    if (!window.db) return null;
    
    try {
        const classDoc = await window.db.collection("classes").doc(classId).get();
        if (classDoc.exists) {
            return { id: classDoc.id, ...classDoc.data() };
        }
        return null;
    } catch (error) {
        console.error("Error getting class from Firestore:", error);
        return null;
    }
}

// Helper function to get all classes for current user from Firestore

async function renderClasses() {
    const container = document.getElementById("classesContainer");
    if (!container) return;
    
    try {
        if (!window.db) {
            container.innerHTML = "<p>Error: Firestore not initialized. Please refresh the page.</p>";
            return;
        }
        
        // Get class IDs from user's enrolled classes
        const userClassIds = getUserClasses();
        
        if (!Array.isArray(userClassIds) || userClassIds.length === 0) {
            container.innerHTML = "<p>No classes yet. " + (userType === "teacher" ? "Create" : "Join") + " a class to get started!</p>";
            return;
        }
        
        container.innerHTML = "<h3>Your Classes</h3>";
        
        // Load classes from Firestore
        for (const classId of userClassIds) {
            if (!classId) continue; // Skip undefined/null class IDs
            
            try {
                const classDoc = await window.db.collection("classes").doc(classId).get();
                
                if (classDoc.exists) {
                    const classData = classDoc.data();
                    if (!classData) {
                        console.error("Class data is null for classId:", classId);
                        continue;
                    }
                    
                    const assignments = Array.isArray(classData.assignments) ? classData.assignments : [];
                    
                    const classDiv = document.createElement("div");
                    classDiv.className = "class-card";
                    classDiv.innerHTML = `
                        <h4>${classData.className || "Unnamed Class"}</h4>
                        <p>Code: <strong>${classId}</strong></p>
                        ${classData.section ? `<p>Section: ${classData.section}</p>` : ""}
                        <p>Assignments: ${assignments.length}</p>
                    `;
                    container.appendChild(classDiv);
                } else {
                    // Show placeholder if class not found
                    const classDiv = document.createElement("div");
                    classDiv.className = "class-card";
                    classDiv.innerHTML = `
                        <h4>Class Code: ${classId}</h4>
                        <p>Code: <strong>${classId}</strong></p>
                        <p style="color: #666; font-style: italic;">Class not found</p>
                    `;
                    container.appendChild(classDiv);
                }
            } catch (firestoreError) {
                console.error("Error loading class from Firestore for classId:", classId, firestoreError);
                // Show placeholder on error
                const classDiv = document.createElement("div");
                classDiv.className = "class-card";
                classDiv.innerHTML = `
                    <h4>Class Code: ${classId}</h4>
                    <p>Code: <strong>${classId}</strong></p>
                    <p style="color: #666; font-style: italic;">Error loading class</p>
                `;
                container.appendChild(classDiv);
            }
        }
    } catch (error) {
        console.error("Error rendering classes:", error);
        container.innerHTML = "<p>Error loading classes. Please refresh the page.</p>";
    }
}

// ======= ASSIGNMENTS =======
function showAssignmentTab(tab) {
    currentAssignmentTab = tab;
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("tab-selected"));
    if (event && event.target) {
        event.target.classList.add("tab-selected");
    }
    renderAssignments();
}

async function renderAssignments() {
    const container = document.getElementById("assignmentsContainer");
    if (!container) return;
    
    // For students, show tab buttons
    if (userType === "student") {
        container.innerHTML = `
            <div class="tab-buttons">
                <button class="tab-btn ${currentAssignmentTab === 'active' ? 'tab-selected' : ''}" onclick="showAssignmentTab('active')">Active</button>
                <button class="tab-btn ${currentAssignmentTab === 'done' ? 'tab-selected' : ''}" onclick="showAssignmentTab('done')">Done</button>
                <button class="tab-btn ${currentAssignmentTab === 'missing' ? 'tab-selected' : ''}" onclick="showAssignmentTab('missing')">Missing</button>
            </div>
        `;
    } else {
        container.innerHTML = "";
    }
    
    const assignmentsList = document.createElement("div");
    assignmentsList.id = "assignmentsList";
    container.appendChild(assignmentsList);
    
    try {
        if (!window.db) {
            const listContainer = document.getElementById("assignmentsList");
            if (listContainer) {
                listContainer.innerHTML = "<p style='text-align: center; color: #666; padding: 20px;'>Firestore not initialized. Please refresh the page.</p>";
            }
            return;
        }
        
        const userClassIds = getUserClasses();
        if (!Array.isArray(userClassIds)) {
            const listContainer = document.getElementById("assignmentsList");
            if (listContainer) {
                listContainer.innerHTML = "<p style='text-align: center; color: #666; padding: 20px;'>Error loading classes. Please refresh the page.</p>";
            }
            return;
        }
        
        let allAssignments = [];
    
        // Load assignments from Firestore classes
        for (const classId of userClassIds) {
            if (!classId) continue; // Skip undefined/null class IDs
            try {
                const classDoc = await window.db.collection("classes").doc(classId).get();
                
                if (classDoc.exists) {
                    const classData = classDoc.data();
                    if (!classData) {
                        console.error("Class data is null for classId:", classId);
                        continue;
                    }
                    
                    const assignments = Array.isArray(classData.assignments) ? classData.assignments : [];
                    const className = classData.className || "Unnamed Class";
                    
                    assignments.forEach(assignment => {
                        if (!assignment || !assignment.id || !assignment.due) {
                            console.warn("Invalid assignment data:", assignment);
                            return; // Skip invalid assignments
                        }
                        
                        const dueDate = new Date(assignment.due);
                        if (isNaN(dueDate.getTime())) {
                            console.warn("Invalid due date for assignment:", assignment);
                            return; // Skip assignments with invalid dates
                        }
                        
                        const now = new Date();
                        now.setHours(0, 0, 0, 0);
                        dueDate.setHours(0, 0, 0, 0);
                        
                        let status;
                        if (userType === "student") {
                            // Get student's status for this assignment
                            const statusKey = `${loggedInUser}_${classId}_${assignment.id}`;
                            status = studentAssignmentsDB[statusKey] || "active";
                            // Auto-update to missing if past due
                            if (status === "active" && dueDate < now) {
                                status = "missing";
                                studentAssignmentsDB[statusKey] = "missing";
                                saveData();
                            }
                        } else {
                            // Teachers see all assignments (they manage them)
                            status = "active";
                        }
                        
                        // For students, filter by status; for teachers, show all
                        if (userType === "student" && status === currentAssignmentTab) {
                            allAssignments.push({
                                ...assignment,
                                classCode: classId,
                                className: className,
                                status: status
                            });
                        } else if (userType === "teacher") {
                            // Teachers see all assignments
                            allAssignments.push({
                                ...assignment,
                                classCode: classId,
                                className: className,
                                status: status
                            });
                        }
                    });
                }
            } catch (error) {
                console.error("Error loading class assignments for classId:", classId, error);
                // Continue processing other classes even if one fails
            }
        }
    
    const listContainer = document.getElementById("assignmentsList");
    if (!listContainer) return;
    
    if (allAssignments.length === 0) {
        listContainer.innerHTML = `<p style="text-align: center; color: #666; padding: 20px;">No ${userType === "student" ? currentAssignmentTab : ""} assignments${userType === "teacher" ? " yet. Create a class and add assignments!" : "."}</p>`;
        return;
    }
    
        allAssignments.sort((a, b) => new Date(a.due) - new Date(b.due));
        
        allAssignments.forEach(assignment => {
            // Validate assignment data before rendering
            if (!assignment || !assignment.id || !assignment.name || !assignment.due || !assignment.classCode || !assignment.className) {
                console.warn("Skipping invalid assignment:", assignment);
                return;
            }
            
            const assignmentDiv = document.createElement("div");
            assignmentDiv.className = "assignment-card";
            const dueDate = new Date(assignment.due);
            
            // Validate date before formatting
            if (isNaN(dueDate.getTime())) {
                console.warn("Skipping assignment with invalid date:", assignment);
                return;
            }
            
            const formattedDate = `${String(dueDate.getMonth() + 1).padStart(2, '0')}/${String(dueDate.getDate()).padStart(2, '0')}/${dueDate.getFullYear()}`;
            assignmentDiv.innerHTML = `
                <div class="assignment-header">
                    <h4>${assignment.name || "Unnamed Assignment"}</h4>
                    ${userType === "teacher" ? `<button onclick="editAssignment('${assignment.classCode}', '${assignment.id}')" class="edit-btn">✏️</button>
                    <button onclick="deleteAssignment('${assignment.classCode}', '${assignment.id}')" class="delete-btn">🗑️</button>` : ""}
                </div>
                <p><strong>Class:</strong> ${assignment.className || "Unknown Class"}</p>
                <p><strong>Due:</strong> ${formattedDate}</p>
                ${userType === "student" && assignment.status !== "done" ? `<button onclick="updateAssignmentStatus('${assignment.classCode}', '${assignment.id}', 'done')" class="status-btn">Mark as Done</button>` : ""}
            `;
            listContainer.appendChild(assignmentDiv);
        });
    } catch (error) {
        console.error("Error rendering assignments:", error);
        const listContainer = document.getElementById("assignmentsList");
        if (listContainer) {
            listContainer.innerHTML = "<p style='text-align: center; color: #666; padding: 20px;'>Error loading assignments. Please refresh the page.</p>";
        }
    }
}

async function addAssignment() {
    if (userType !== "teacher") {
        showError("Only teachers can add assignments");
        return;
    }
    
    if (!window.db) {
        showError("Firestore not initialized. Please refresh the page.");
        return;
    }
    
    try {
        const userClasses = getUserClasses();
        if (userClasses.length === 0) {
            showError("You need to create a class first");
            return;
        }
        
        let classId = prompt("Enter class code:").trim().toUpperCase();
        if (!classId) {
            showError("Invalid class code");
            return;
        }
        
        // Get class from Firestore
        const classDoc = await window.db.collection("classes").doc(classId).get();
        if (!classDoc.exists) {
            showError("Invalid class code");
            return;
        }
        
        const classData = classDoc.data();
        if (!classData) {
            showError("Invalid class data");
            return;
        }
        
        const userData = getCurrentUserData();
        if (!userData || !userData.uid) {
            showError("User data not found. Please log in again.");
            return;
        }
        
        // Verify teacher owns this class
        if (classData.teacherId !== userData.uid) {
            showError("You can only add assignments to your own classes");
            return;
        }
        
        let name = prompt("Assignment name:").trim();
        if (!name) return;
        
        let dueStr = prompt("Due date (MM/DD/YYYY format, e.g., 12/25/2024):").trim();
        if (!dueStr) return;
        
        let dueDate = parseDate(dueStr);
        if (!dueDate || isNaN(dueDate.getTime())) {
            showError("Invalid date format. Please use MM/DD/YYYY format (e.g., 12/25/2024)");
            return;
        }
        
        // Check if date is in the past
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        if (dueDate < now) {
            showError("Due date cannot be in the past");
            return;
        }
        
        // Check if date is more than 3 years in the future
        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() + 3);
        if (dueDate > maxDate) {
            showError("Due date cannot be more than 3 years in the future");
            return;
        }
        
        const assignmentId = Date.now().toString();
        const newAssignment = {
            id: assignmentId,
            name: name,
            due: dueDate.toISOString()
        };
        
        // Update assignments array in Firestore
        const assignments = classData.assignments || [];
        assignments.push(newAssignment);
        
        await window.db.collection("classes").doc(classId).update({
            assignments: assignments
        });
        
        showSuccess("Assignment added!");
        renderAssignments();
        renderPieChart();
        renderCalendar();
    } catch (error) {
        console.error("Error adding assignment:", error);
        showError("Error adding assignment. Please try again.");
    }
}

async function editAssignment(classId, assignmentId) {
    if (userType !== "teacher") return;
    
    if (!window.db) {
        showError("Firestore not initialized. Please refresh the page.");
        return;
    }
    
    try {
        // Get class from Firestore
        const classDoc = await window.db.collection("classes").doc(classId).get();
        if (!classDoc.exists) {
            showError("Class not found");
            return;
        }
        
        const classData = classDoc.data();
        const assignments = classData.assignments || [];
        const assignment = assignments.find(a => a.id === assignmentId);
        
        if (!assignment) {
            showError("Assignment not found");
            return;
        }
        
        let name = prompt("Assignment name:", assignment.name).trim();
        if (!name) return;
        
        // Convert existing date to MM/DD/YYYY format for prompt
        const existingDate = new Date(assignment.due);
        const formattedExisting = `${String(existingDate.getMonth() + 1).padStart(2, '0')}/${String(existingDate.getDate()).padStart(2, '0')}/${existingDate.getFullYear()}`;
        let dueStr = prompt("Due date (MM/DD/YYYY format, e.g., 12/25/2024):", formattedExisting).trim();
        if (!dueStr) return;
        
        let dueDate = parseDate(dueStr);
        if (!dueDate || isNaN(dueDate.getTime())) {
            showError("Invalid date format. Please use MM/DD/YYYY format (e.g., 12/25/2024)");
            return;
        }
        
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        if (dueDate < now) {
            showError("Due date cannot be in the past");
            return;
        }
        
        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() + 3);
        if (dueDate > maxDate) {
            showError("Due date cannot be more than 3 years in the future");
            return;
        }
        
        // Update assignment in array
        const assignmentIndex = assignments.findIndex(a => a.id === assignmentId);
        if (assignmentIndex !== -1) {
            assignments[assignmentIndex] = {
                ...assignments[assignmentIndex],
                name: name,
                due: dueDate.toISOString()
            };
            
            // Update in Firestore
            await window.db.collection("classes").doc(classId).update({
                assignments: assignments
            });
            
            showSuccess("Assignment updated!");
            renderAssignments();
            renderPieChart();
            renderCalendar();
        }
    } catch (error) {
        console.error("Error editing assignment:", error);
        showError("Error updating assignment. Please try again.");
    }
}

async function deleteAssignment(classId, assignmentId) {
    if (userType !== "teacher") return;
    
    if (!confirm("Are you sure you want to delete this assignment?")) return;
    
    if (!window.db) {
        showError("Firestore not initialized. Please refresh the page.");
        return;
    }
    
    try {
        // Get class from Firestore
        const classDoc = await window.db.collection("classes").doc(classId).get();
        if (!classDoc.exists) {
            showError("Class not found");
            return;
        }
        
        const classData = classDoc.data();
        const assignments = (classData.assignments || []).filter(a => a.id !== assignmentId);
        
        // Update in Firestore
        await window.db.collection("classes").doc(classId).update({
            assignments: assignments
        });
        
        showSuccess("Assignment deleted!");
        renderAssignments();
        renderPieChart();
        renderCalendar();
    } catch (error) {
        console.error("Error deleting assignment:", error);
        showError("Error deleting assignment. Please try again.");
    }
}

async function updateAssignmentStatus(classId, assignmentId, status) {
    if (userType !== "student") return;
    
    if (!window.db) {
        showError("Firestore not initialized. Please refresh the page.");
        return;
    }
    
    try {
        // Verify assignment exists in Firestore
        const classDoc = await window.db.collection("classes").doc(classId).get();
        if (!classDoc.exists) {
            showError("Class not found");
            return;
        }
        
        const classData = classDoc.data();
        const assignments = classData.assignments || [];
        const assignment = assignments.find(a => a.id === assignmentId);
        
        if (!assignment) {
            showError("Assignment not found");
            return;
        }
        
        // Update status in localStorage (student assignments tracking)
        const statusKey = `${loggedInUser}_${classId}_${assignmentId}`;
        studentAssignmentsDB[statusKey] = status;
        saveData();
        
        renderAssignments();
        renderPieChart();
        renderCalendar();
    } catch (error) {
        console.error("Error updating assignment status:", error);
        showError("Error updating assignment status. Please try again.");
    }
}

function parseDate(dateStr) {
    // Only accept MM/DD/YYYY format
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        const parts = dateStr.split("/");
        const month = parseInt(parts[0], 10);
        const day = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        
        // Validate month (1-12)
        if (month < 1 || month > 12) {
            return null;
        }
        
        // Validate day (1-31, basic check)
        if (day < 1 || day > 31) {
            return null;
        }
        
        // Validate year (reasonable range)
        if (year < 2000 || year > 2100) {
            return null;
        }
        
        const date = new Date(year, month - 1, day);
        // Check if date is valid (handles invalid dates like 02/30/2024)
        if (date.getMonth() !== month - 1 || date.getDate() !== day || date.getFullYear() !== year) {
            return null;
        }
        
        return date;
    }
    // If format doesn't match MM/DD/YYYY, return null
    return null;
}

// ======= PIE CHART =======
async function renderPieChart() {
    const canvas = document.getElementById("piechart");
    if (!canvas) return;
    
    try {
        if (!window.db) {
            console.error("Firestore not initialized for pie chart");
            return;
        }
        
        const userClassIds = getUserClasses();
        if (!Array.isArray(userClassIds)) {
            console.error("getUserClasses() did not return an array");
            return;
        }
        
        let done = 0, active = 0, missing = 0;
    
        // Load assignments from Firestore classes
        for (const classId of userClassIds) {
            if (!classId) continue; // Skip undefined/null class IDs
            
            try {
                const classDoc = await window.db.collection("classes").doc(classId).get();
                
                if (classDoc.exists) {
                    const classData = classDoc.data();
                    if (!classData) {
                        console.error("Class data is null for classId:", classId);
                        continue;
                    }
                    
                    const assignments = Array.isArray(classData.assignments) ? classData.assignments : [];
                    
                    assignments.forEach(assignment => {
                        if (!assignment || !assignment.id || !assignment.due) {
                            return; // Skip invalid assignments
                        }
                        
                        const dueDate = new Date(assignment.due);
                        if (isNaN(dueDate.getTime())) {
                            return; // Skip assignments with invalid dates
                        }
                        
                        const now = new Date();
                        now.setHours(0, 0, 0, 0);
                        dueDate.setHours(0, 0, 0, 0);
                        
                        let status;
                        if (userType === "student") {
                            const statusKey = `${loggedInUser}_${classId}_${assignment.id}`;
                            status = studentAssignmentsDB[statusKey] || "active";
                            if (status === "active" && dueDate < now) {
                                status = "missing";
                                studentAssignmentsDB[statusKey] = "missing";
                            }
                        } else {
                            status = "active"; // Teachers see all as active for management
                        }
                        
                        if (status === "done") done++;
                        else if (status === "active") active++;
                        else if (status === "missing") missing++;
                    });
                }
            } catch (error) {
                console.error("Error loading class for pie chart, classId:", classId, error);
                // Continue processing other classes even if one fails
            }
        }
    
        if (userType === "student") {
            saveData(); // Save any auto-updated missing statuses
        }
    
    const total = done + active + missing;
    const donePercent = total > 0 ? ((done / total) * 100).toFixed(1) : 0;
    const activePercent = total > 0 ? ((active / total) * 100).toFixed(1) : 0;
    const missingPercent = total > 0 ? ((missing / total) * 100).toFixed(1) : 0;
    
    if (pieChart) {
        pieChart.destroy();
    }
    
    pieChart = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels: [`Done (${done})`, `Active (${active})`, `Missing (${missing})`],
            datasets: [{
                data: [done, active, missing],
                backgroundColor: ["#28a745", "#007bff", "#dc3545"]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: "bottom"
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || "";
                            const value = context.parsed || 0;
                            const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value} (${percent}%)`;
                        }
                    }
                }
            }
        }
    });
    
    // Update stats display
    const statsDiv = document.getElementById("pieChartStats");
    if (statsDiv) {
        statsDiv.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Done:</span>
                <span class="stat-value">${done} (${donePercent}%)</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Active:</span>
                <span class="stat-value">${active} (${activePercent}%)</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Missing:</span>
                <span class="stat-value">${missing} (${missingPercent}%)</span>
            </div>
        `;
    }
    } catch (error) {
        console.error("Error rendering pie chart:", error);
        // Silently handle error - don't show alert
    }
}

// ======= CALENDAR =======
function prevMonth() {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar();
}

function nextMonth() {
    const maxYear = new Date().getFullYear() + 3;
    if (currentYear >= maxYear && currentMonth >= 11) {
        showError("Cannot navigate beyond 3 years in the future");
        return;
    }
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendar();
}

async function renderCalendar() {
    const container = document.getElementById("calendarContainer");
    const monthYear = document.getElementById("monthYear");
    if (!container || !monthYear) return;
    
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
    
    monthYear.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = new Date();
    
    container.innerHTML = "";
    
    // Day headers
    const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    dayHeaders.forEach(day => {
        const header = document.createElement("div");
        header.className = "calendar-day-header";
        header.textContent = day;
        container.appendChild(header);
    });
    
    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement("div");
        empty.className = "calendar-day empty";
        container.appendChild(empty);
    }
    
    // Get all assignments from Firestore
    try {
        if (!window.db) {
            console.error("Firestore not initialized for calendar");
            return;
        }
        
        const userClassIds = getUserClasses();
        if (!Array.isArray(userClassIds)) {
            console.error("getUserClasses() did not return an array for calendar");
            return;
        }
        
        let assignmentsByDate = {};
    
        // Load assignments from Firestore classes
        for (const classId of userClassIds) {
            if (!classId) continue; // Skip undefined/null class IDs
            
            try {
                const classDoc = await window.db.collection("classes").doc(classId).get();
                
                if (classDoc.exists) {
                    const classData = classDoc.data();
                    if (!classData) {
                        console.error("Class data is null for classId:", classId);
                        continue;
                    }
                    
                    const assignments = Array.isArray(classData.assignments) ? classData.assignments : [];
                    const className = classData.className || "Unnamed Class";
                    
                    assignments.forEach(assignment => {
                        if (!assignment || !assignment.id || !assignment.due || !assignment.name) {
                            return; // Skip invalid assignments
                        }
                        
                        const dueDate = new Date(assignment.due);
                        if (isNaN(dueDate.getTime())) {
                            return; // Skip assignments with invalid dates
                        }
                        
                        const dateKey = `${dueDate.getFullYear()}-${dueDate.getMonth()}-${dueDate.getDate()}`;
                        if (!assignmentsByDate[dateKey]) {
                            assignmentsByDate[dateKey] = [];
                        }
                        let status = "active";
                        if (userType === "student") {
                            const statusKey = `${loggedInUser}_${classId}_${assignment.id}`;
                            status = studentAssignmentsDB[statusKey] || "active";
                        }
                        assignmentsByDate[dateKey].push({
                            name: assignment.name,
                            className: className,
                            status: status
                        });
                    });
                }
            } catch (error) {
                console.error("Error loading class for calendar, classId:", classId, error);
                // Continue processing other classes even if one fails
            }
        }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayDiv = document.createElement("div");
        dayDiv.className = "calendar-day";
        
        const dateKey = `${currentYear}-${currentMonth}-${day}`;
        const isToday = currentYear === today.getFullYear() && 
                       currentMonth === today.getMonth() && 
                       day === today.getDate();
        
        if (isToday) {
            dayDiv.classList.add("today");
        }
        
        dayDiv.innerHTML = `<div class="day-number">${day}</div>`;
        
        // Check for assignments on this date
        const checkKey = `${currentYear}-${currentMonth}-${day}`;
        
        if (assignmentsByDate[checkKey] && assignmentsByDate[checkKey].length > 0) {
            const assignmentsDiv = document.createElement("div");
            assignmentsDiv.className = "day-assignments";
            assignmentsByDate[checkKey].forEach((assignment, idx) => {
                if (idx < 2) {
                    // Show first 2 assignments with names
                    const assignmentItem = document.createElement("div");
                    assignmentItem.className = `assignment-item ${assignment.status}`;
                    assignmentItem.textContent = assignment.name;
                    assignmentItem.title = `${assignment.name} - ${assignment.className}`;
                    assignmentsDiv.appendChild(assignmentItem);
                }
            });
            if (assignmentsByDate[checkKey].length > 2) {
                const moreDiv = document.createElement("div");
                moreDiv.className = "assignment-more";
                moreDiv.textContent = `+${assignmentsByDate[checkKey].length - 2} more`;
                assignmentsDiv.appendChild(moreDiv);
            }
            dayDiv.appendChild(assignmentsDiv);
        }
        
        container.appendChild(dayDiv);
    }
    } catch (error) {
        console.error("Error rendering calendar:", error);
        // Silently handle error - don't show alert
    }
}

// ======= STATISTICS (Teachers Only) =======
async function renderStatistics() {
    if (userType !== "teacher") return;
    
    const container = document.getElementById("statisticsContainer");
    if (!container) return;
    
    try {
        if (!window.db) {
            container.innerHTML = "<p>Firestore not initialized. Please refresh the page.</p>";
            return;
        }
        
        const userClassIds = getUserClasses();
        if (!Array.isArray(userClassIds)) {
            container.innerHTML = "<p>Error loading classes. Please refresh the page.</p>";
            return;
        }
        
        let html = '<div class="statistics-content">';
        
        // Class participation stats
        html += '<div class="class-stats-box">';
        html += '<h3>Class Participation</h3>';
        
        if (userClassIds.length === 0) {
            html += '<p>No classes created yet.</p>';
        } else {
            // Load classes from Firestore
            for (const classId of userClassIds) {
                if (!classId) continue; // Skip undefined/null class IDs
                
                try {
                    const classDoc = await window.db.collection("classes").doc(classId).get();
                    
                    if (classDoc.exists) {
                        const classData = classDoc.data();
                        if (!classData) {
                            console.error("Class data is null for classId:", classId);
                            continue;
                        }
                        
                        const assignments = Array.isArray(classData.assignments) ? classData.assignments : [];
                        const students = Array.isArray(classData.students) ? classData.students : [];
                        const className = classData.className || "Unnamed Class";
                        
                        html += `<div class="class-stat-item">`;
                        html += `<h4>${className}</h4>`;
                        html += `<p><strong>Code:</strong> ${classId}</p>`;
                        html += `<p><strong>Students:</strong> ${students.length}</p>`;
                        html += `<p><strong>Assignments:</strong> ${assignments.length}</p>`;
                        html += `</div>`;
                    }
                } catch (error) {
                    console.error("Error loading class for statistics, classId:", classId, error);
                    // Continue processing other classes even if one fails
                }
            }
        }
        html += '</div>';
        
        // Assignment status bar chart
        html += '<div class="assignment-stats-box">';
        html += '<h3>Assignment Status Overview</h3>';
        html += '<canvas id="statisticsChart"></canvas>';
        html += '</div>';
        
        html += '</div>';
        container.innerHTML = html;
        
        // Render bar chart
        const canvas = document.getElementById("statisticsChart");
        if (canvas) {
            let done = 0, active = 0, missing = 0;
            
            // Load assignments from Firestore for chart
            for (const classId of userClassIds) {
                if (!classId) continue; // Skip undefined/null class IDs
                
                try {
                    const classDoc = await window.db.collection("classes").doc(classId).get();
                    
                    if (classDoc.exists) {
                        const classData = classDoc.data();
                        if (!classData) {
                            console.error("Class data is null for classId:", classId);
                            continue;
                        }
                        
                        const assignments = Array.isArray(classData.assignments) ? classData.assignments : [];
                        
                        assignments.forEach(assignment => {
                            if (!assignment || !assignment.id || !assignment.due) {
                                return; // Skip invalid assignments
                            }
                            
                            // For current user only (simplified for new structure)
                            if (userType === "student") {
                                const statusKey = `${loggedInUser}_${classId}_${assignment.id}`;
                                const status = studentAssignmentsDB[statusKey] || "active";
                                
                                const dueDate = new Date(assignment.due);
                                if (isNaN(dueDate.getTime())) {
                                    return; // Skip assignments with invalid dates
                                }
                                
                                const now = new Date();
                                now.setHours(0, 0, 0, 0);
                                dueDate.setHours(0, 0, 0, 0);
                                
                                let finalStatus = status;
                                if (status === "active" && dueDate < now) {
                                    finalStatus = "missing";
                                }
                                
                                if (finalStatus === "done") done++;
                                else if (finalStatus === "active") active++;
                                else if (finalStatus === "missing") missing++;
                            } else {
                                // Teachers see all assignments
                                active++;
                            }
                        });
                    }
                } catch (error) {
                    console.error("Error loading class for statistics chart, classId:", classId, error);
                    // Continue processing other classes even if one fails
                }
            }
        
        if (statisticsChart) {
            statisticsChart.destroy();
        }
        
        statisticsChart = new Chart(canvas, {
            type: "bar",
            data: {
                labels: ["Done", "Active", "Missing"],
                datasets: [{
                    label: "Number of Assignments",
                    data: [done, active, missing],
                    backgroundColor: ["#28a745", "#007bff", "#dc3545"]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
    } catch (error) {
        console.error("Error rendering statistics:", error);
        if (container) {
            container.innerHTML = "<p style='text-align: center; color: #666; padding: 20px;'>Error loading statistics. Please refresh the page.</p>";
        }
    }
}

// ======= SUGGESTIONS =======
function renderSuggestions() {
    try {
        const container = document.getElementById("suggestionsContainer");
        if (!container) return;
        
        // Show submission form for students only
        if (userType === "student") {
            container.innerHTML = `
                <div class="suggestions-form">
                    <p style="text-align: center; color: #666; font-size: 18px; margin-bottom: 20px;">
                        Leave a suggestion below for our school application, we will try our best to take your ideas into consideration!
                    </p>
                    <textarea id="suggestionText" placeholder="Enter your suggestion here..." rows="6" style="width: 100%; padding: 15px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 16px; font-family: inherit; box-sizing: border-box; resize: vertical;"></textarea>
                    <div style="text-align: center; margin-top: 20px;">
                        <button onclick="submitSuggestion()" style="background: #667eea; color: white; padding: 15px 40px; font-size: 18px; border-radius: 8px; border: none; cursor: pointer; font-weight: 600;">
                            Submit
                        </button>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error("Error rendering suggestions:", error);
        const container = document.getElementById("suggestionsContainer");
        if (container) {
            container.innerHTML = "<p style='text-align: center; color: #666; padding: 20px;'>Error loading suggestions. Please refresh the page.</p>";
        }
    }
}

async function submitSuggestion() {
    if (userType !== "student") {
        showError("Only students can submit suggestions.");
        return;
    }
    
    if (!window.db) {
        showError("Firestore not initialized. Please refresh the page.");
        return;
    }
    
    const textarea = document.getElementById("suggestionText");
    if (!textarea) return;
    
    const suggestionText = textarea.value.trim();
    if (!suggestionText) {
        showError("Please enter a suggestion before submitting.");
        return;
    }
    
    try {
        const userData = getCurrentUserData();
        if (!userData || !userData.uid) {
            showError("User data not found. Please log in again.");
            return;
        }
        
        // Get student name if available
        const studentName = userData.studentInfo?.fullName || userData.username || null;
        
        // Create suggestion document with required schema
        const suggestionData = {
            text: suggestionText,
            studentUid: userData.uid,
            studentName: studentName,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Save to Firestore
        await window.db.collection("suggestions").add(suggestionData);
        
        showSuccess("Thank you for your suggestion!");
        textarea.value = "";
    } catch (error) {
        console.error("Error submitting suggestion:", error);
        showError("Error submitting suggestion. Please try again.");
    }
}
