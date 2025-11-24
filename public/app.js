// ======= DATA STORAGE =======
let userType = "";
let loggedInUser = null;
let usersDB = {student: {}, teacher: {}};
let classesDB = {}; // classCode: {name, teacher, assignments: [{id, name, due}]}
let studentAssignmentsDB = {}; // studentUsername_classCode_assignmentId: status
let currentTab = "home";
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let currentAssignmentTab = "active";
let pieChart = null;

// Load data from localStorage
function loadData() {
    const savedUsers = localStorage.getItem("usersDB");
    const savedClasses = localStorage.getItem("classesDB");
    const savedStudentAssignments = localStorage.getItem("studentAssignmentsDB");
    if (savedUsers) usersDB = JSON.parse(savedUsers);
    if (savedClasses) classesDB = JSON.parse(savedClasses);
    if (savedStudentAssignments) studentAssignmentsDB = JSON.parse(savedStudentAssignments);
}

// Save data to localStorage
function saveData() {
    localStorage.setItem("usersDB", JSON.stringify(usersDB));
    localStorage.setItem("classesDB", JSON.stringify(classesDB));
    localStorage.setItem("studentAssignmentsDB", JSON.stringify(studentAssignmentsDB));
}

// Initialize
loadData();

// ======= LOGIN & ACCOUNT =======
function selectType(type) {
    userType = type;
    document.getElementById("loginForm").style.display = "block";
    document.querySelectorAll(".account-choice button").forEach(btn => {
        btn.style.opacity = btn.textContent.toLowerCase().includes(type) ? "1" : "0.5";
    });
}

function createAccount() {
    let u = document.getElementById("username").value.trim();
    let p = document.getElementById("password").value;
    if (!u || !p) {
        showError("Please enter both username and password");
        return;
    }
    if (u.length < 3) {
        showError("Username must be at least 3 characters");
        return;
    }
    if (p.length < 4) {
        showError("Password must be at least 4 characters");
        return;
    }
    if (!usersDB[userType][u]) {
        usersDB[userType][u] = {password: p, classes: []};
        saveData();
        showSuccess("Account created successfully! Please login.");
        document.getElementById("username").value = "";
        document.getElementById("password").value = "";
    } else {
        showError("Username already exists!");
    }
}

function login() {
    let u = document.getElementById("username").value.trim();
    let p = document.getElementById("password").value;
    if (!u || !p) {
        showError("Please enter both username and password");
        return;
    }
    if (usersDB[userType][u] && usersDB[userType][u].password === p) {
        loggedInUser = u;
        localStorage.setItem("loggedInUser", userType + "_" + u);
        localStorage.setItem("userType", userType);
        window.location.href = "home.html";
    } else {
        showError("Invalid username or password");
    }
}

function logout() {
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("userType");
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
            } else {
                document.getElementById("addAssignmentBtn").style.display = "none";
                document.getElementById("createClassBtn").style.display = "none";
                document.getElementById("joinClassBtn").style.display = "block";
            }
            renderPieChart();
            renderClasses();
            renderAssignments();
            renderCalendar();
        } else {
            window.location.href = "index.html";
        }
    }
}

function toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("show");
}

function showTab(tab) {
    ["homeTab", "assignmentsTab", "calendarTab"].forEach(t => {
        document.getElementById(t).style.display = "none";
    });
    document.getElementById(tab + "Tab").style.display = "block";
    currentTab = tab;
    if (tab === "assignments") {
        renderAssignments();
    } else if (tab === "calendar") {
        renderCalendar();
    } else if (tab === "home") {
        renderPieChart();
        renderClasses();
    }
}

// ======= CLASSES =======
function joinClass() {
    if (userType !== "student") {
        showError("Only students can join classes");
        return;
    }
    let code = prompt("Enter class code:").trim().toUpperCase();
    if (!code) return;
    if (classesDB[code]) {
        if (!usersDB[userType][loggedInUser].classes.includes(code)) {
            usersDB[userType][loggedInUser].classes.push(code);
            saveData();
            showSuccess("Joined class: " + classesDB[code].name);
            renderClasses();
            renderPieChart();
        } else {
            showError("You are already in this class");
        }
    } else {
        showError("Class code not found");
    }
}

function createClass() {
    if (userType !== "teacher") {
        showError("Only teachers can create classes");
        return;
    }
    let name = prompt("Enter class name:").trim();
    if (!name) return;
    let code = generateClassCode();
    classesDB[code] = {name: name, teacher: loggedInUser, assignments: []};
    if (!usersDB[userType][loggedInUser].classes.includes(code)) {
        usersDB[userType][loggedInUser].classes.push(code);
    }
    saveData();
    showSuccess("Class created! Code: " + code);
    renderClasses();
}

function generateClassCode() {
    let code;
    do {
        code = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (classesDB[code]);
    return code;
}

function renderClasses() {
    const container = document.getElementById("classesContainer");
    if (!container) return;
    const userClasses = usersDB[userType][loggedInUser].classes || [];
    if (userClasses.length === 0) {
        container.innerHTML = "<p>No classes yet. " + (userType === "teacher" ? "Create" : "Join") + " a class to get started!</p>";
        return;
    }
    container.innerHTML = "<h3>Your Classes</h3>";
    userClasses.forEach(code => {
        if (classesDB[code]) {
            const classDiv = document.createElement("div");
            classDiv.className = "class-card";
            classDiv.innerHTML = `
                <h4>${classesDB[code].name}</h4>
                <p>Code: <strong>${code}</strong></p>
                <p>Assignments: ${classesDB[code].assignments.length}</p>
            `;
            container.appendChild(classDiv);
        }
    });
}

// ======= ASSIGNMENTS =======
function showAssignmentTab(tab) {
    currentAssignmentTab = tab;
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("tab-selected"));
    event.target.classList.add("tab-selected");
    renderAssignments();
}

function renderAssignments() {
    const container = document.getElementById("assignmentsContainer");
    if (!container) return;
    container.innerHTML = "";
    
    const userClasses = usersDB[userType][loggedInUser].classes || [];
    let allAssignments = [];
    
    userClasses.forEach(code => {
        if (classesDB[code]) {
            classesDB[code].assignments.forEach(assignment => {
                const dueDate = new Date(assignment.due);
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                dueDate.setHours(0, 0, 0, 0);
                
                let status;
                if (userType === "student") {
                    // Get student's status for this assignment
                    const statusKey = `${loggedInUser}_${code}_${assignment.id}`;
                    status = studentAssignmentsDB[statusKey] || "active";
                    // Auto-update to missing if past due
                    if (status === "active" && dueDate < now) {
                        status = "missing";
                        studentAssignmentsDB[statusKey] = "missing";
                        saveData();
                    }
                } else {
                    // Teachers see all assignments as active (they manage them)
                    status = "active";
                }
                
                if (status === currentAssignmentTab) {
                    allAssignments.push({
                        ...assignment,
                        classCode: code,
                        className: classesDB[code].name,
                        status: status
                    });
                }
            });
        }
    });
    
    if (allAssignments.length === 0) {
        container.innerHTML = `<p>No ${currentAssignmentTab} assignments.</p>`;
        return;
    }
    
    allAssignments.sort((a, b) => new Date(a.due) - new Date(b.due));
    
    allAssignments.forEach(assignment => {
        const assignmentDiv = document.createElement("div");
        assignmentDiv.className = "assignment-card";
        const dueDate = new Date(assignment.due);
        const formattedDate = dueDate.toLocaleDateString("en-US", {year: "numeric", month: "short", day: "numeric"});
        assignmentDiv.innerHTML = `
            <div class="assignment-header">
                <h4>${assignment.name}</h4>
                ${userType === "teacher" ? `<button onclick="editAssignment('${assignment.classCode}', '${assignment.id}')" class="edit-btn">✏️</button>
                <button onclick="deleteAssignment('${assignment.classCode}', '${assignment.id}')" class="delete-btn">🗑️</button>` : ""}
            </div>
            <p><strong>Class:</strong> ${assignment.className}</p>
            <p><strong>Due:</strong> ${formattedDate}</p>
            ${userType === "student" && assignment.status !== "done" ? `<button onclick="updateAssignmentStatus('${assignment.classCode}', '${assignment.id}', 'done')" class="status-btn">Mark as Done</button>` : ""}
        `;
        container.appendChild(assignmentDiv);
    });
}

function addAssignment() {
    if (userType !== "teacher") {
        showError("Only teachers can add assignments");
        return;
    }
    const userClasses = usersDB[userType][loggedInUser].classes || [];
    if (userClasses.length === 0) {
        showError("You need to create a class first");
        return;
    }
    
    let classCode = prompt("Enter class code:").trim().toUpperCase();
    if (!classCode || !classesDB[classCode]) {
        showError("Invalid class code");
        return;
    }
    if (classesDB[classCode].teacher !== loggedInUser) {
        showError("You can only add assignments to your own classes");
        return;
    }
    
    let name = prompt("Assignment name:").trim();
    if (!name) return;
    
    let dueStr = prompt("Due date (YYYY-MM-DD or MM/DD/YYYY):").trim();
    if (!dueStr) return;
    
    let dueDate = parseDate(dueStr);
    if (!dueDate || isNaN(dueDate.getTime())) {
        showError("Invalid date format. Please use YYYY-MM-DD or MM/DD/YYYY");
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
    classesDB[classCode].assignments.push({
        id: assignmentId,
        name: name,
        due: dueDate.toISOString()
    });
    saveData();
    showSuccess("Assignment added!");
    renderAssignments();
    renderPieChart();
    renderCalendar();
}

function editAssignment(classCode, assignmentId) {
    if (userType !== "teacher") return;
    const assignment = classesDB[classCode].assignments.find(a => a.id === assignmentId);
    if (!assignment) return;
    
    let name = prompt("Assignment name:", assignment.name).trim();
    if (!name) return;
    
    let dueStr = prompt("Due date (YYYY-MM-DD or MM/DD/YYYY):", new Date(assignment.due).toISOString().split("T")[0]).trim();
    if (!dueStr) return;
    
    let dueDate = parseDate(dueStr);
    if (!dueDate || isNaN(dueDate.getTime())) {
        showError("Invalid date format. Please use YYYY-MM-DD or MM/DD/YYYY");
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
    
    assignment.name = name;
    assignment.due = dueDate.toISOString();
    saveData();
    showSuccess("Assignment updated!");
    renderAssignments();
    renderPieChart();
    renderCalendar();
}

function deleteAssignment(classCode, assignmentId) {
    if (userType !== "teacher") return;
    if (!confirm("Are you sure you want to delete this assignment?")) return;
    
    classesDB[classCode].assignments = classesDB[classCode].assignments.filter(a => a.id !== assignmentId);
    saveData();
    showSuccess("Assignment deleted!");
    renderAssignments();
    renderPieChart();
    renderCalendar();
}

function updateAssignmentStatus(classCode, assignmentId, status) {
    if (userType !== "student") return;
    const assignment = classesDB[classCode].assignments.find(a => a.id === assignmentId);
    if (!assignment) return;
    
    const statusKey = `${loggedInUser}_${classCode}_${assignmentId}`;
    studentAssignmentsDB[statusKey] = status;
    saveData();
    renderAssignments();
    renderPieChart();
}

function parseDate(dateStr) {
    // Try YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return new Date(dateStr + "T00:00:00");
    }
    // Try MM/DD/YYYY format
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        const parts = dateStr.split("/");
        return new Date(parts[2], parts[0] - 1, parts[1]);
    }
    // Try other common formats
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
}

// ======= PIE CHART =======
function renderPieChart() {
    const canvas = document.getElementById("piechart");
    if (!canvas) return;
    
    const userClasses = usersDB[userType][loggedInUser].classes || [];
    let done = 0, active = 0, missing = 0;
    
    userClasses.forEach(code => {
        if (classesDB[code]) {
            classesDB[code].assignments.forEach(assignment => {
                const dueDate = new Date(assignment.due);
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                dueDate.setHours(0, 0, 0, 0);
                
                let status;
                if (userType === "student") {
                    const statusKey = `${loggedInUser}_${code}_${assignment.id}`;
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
    });
    
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

function renderCalendar() {
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
    
    // Get all assignments
    const userClasses = usersDB[userType][loggedInUser].classes || [];
    let assignmentsByDate = {};
    
    userClasses.forEach(code => {
        if (classesDB[code]) {
            classesDB[code].assignments.forEach(assignment => {
                const dueDate = new Date(assignment.due);
                const dateKey = `${dueDate.getFullYear()}-${dueDate.getMonth()}-${dueDate.getDate()}`;
                if (!assignmentsByDate[dateKey]) {
                    assignmentsByDate[dateKey] = [];
                }
                let status = "active";
                if (userType === "student") {
                    const statusKey = `${loggedInUser}_${code}_${assignment.id}`;
                    status = studentAssignmentsDB[statusKey] || "active";
                }
                assignmentsByDate[dateKey].push({
                    name: assignment.name,
                    className: classesDB[code].name,
                    status: status
                });
            });
        }
    });
    
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
            assignmentsByDate[checkKey].slice(0, 3).forEach(assignment => {
                const assignmentDiv = document.createElement("div");
                assignmentDiv.className = `assignment-dot ${assignment.status}`;
                assignmentDiv.title = `${assignment.name} - ${assignment.className}`;
                assignmentsDiv.appendChild(assignmentDiv);
            });
            if (assignmentsByDate[checkKey].length > 3) {
                const moreDiv = document.createElement("div");
                moreDiv.className = "assignment-more";
                moreDiv.textContent = `+${assignmentsByDate[checkKey].length - 3}`;
                assignmentsDiv.appendChild(moreDiv);
            }
            dayDiv.appendChild(assignmentsDiv);
        }
        
        container.appendChild(dayDiv);
    }
}
