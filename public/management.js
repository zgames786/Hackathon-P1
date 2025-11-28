// ======= TEACHER & STUDENT MANAGEMENT SYSTEM =======

// Render management interface
function renderManagementInterface() {
    const adminTab = document.getElementById("adminTab");
    if (!adminTab) return;
    
    adminTab.innerHTML = `
        <div class="management-container">
            <div class="management-header">
                <h2 style="text-align: center; color: #667eea; margin-bottom: 20px;">Teacher & Student Management</h2>
            </div>
            
            <div class="management-tabs">
                <button class="management-tab-btn active" onclick="switchManagementTab('students', this)">Students</button>
                <button class="management-tab-btn" onclick="switchManagementTab('teachers', this)">Teachers</button>
                <button class="management-tab-btn" onclick="switchManagementTab('classes', this)">All Classes</button>
            </div>
            
            <div id="studentsManagementTab" class="management-content-tab">
                ${renderStudentsManagement()}
            </div>
            
            <div id="teachersManagementTab" class="management-content-tab" style="display:none;">
                ${renderTeachersManagement()}
            </div>
            
            <div id="classesManagementTab" class="management-content-tab" style="display:none;">
                ${renderClassesManagement()}
            </div>
        </div>
    `;
}

// Switch management tabs
function switchManagementTab(tab, eventElement = null) {
    // Update tab buttons
    document.querySelectorAll(".management-tab-btn").forEach(btn => btn.classList.remove("active"));
    if (eventElement) {
        eventElement.classList.add("active");
    } else {
        // Find button by tab name
        const buttons = document.querySelectorAll(".management-tab-btn");
        buttons.forEach(btn => {
            if (btn.textContent.toLowerCase().includes(tab.toLowerCase())) {
                btn.classList.add("active");
            }
        });
    }
    
    // Hide all content tabs
    document.querySelectorAll(".management-content-tab").forEach(t => t.style.display = "none");
    
    // Show selected tab
    const targetTab = document.getElementById(`${tab}ManagementTab`);
    if (targetTab) {
        targetTab.style.display = "block";
    }
}

// Render students management
function renderStudentsManagement() {
    return `
        <div class="management-section">
            <div class="section-header">
                <h3>Students</h3>
                <button class="btn-primary" onclick="showAddStudentForm()">+ Add Student</button>
            </div>
            
            <div id="addStudentForm" style="display:none;" class="form-card">
                <h4>Add New Student</h4>
                <input type="text" id="studentName" placeholder="Student Name" required>
                <input type="email" id="studentEmail" placeholder="Email" required>
                <input type="text" id="studentUID" placeholder="Student UID (optional)">
                <select id="studentClasses" multiple>
                    <option value="">Select Classes (hold Ctrl/Cmd for multiple)</option>
                    ${(adminData.classes || []).map(c => `
                        <option value="${c.id}">${c.className || c.name}</option>
                    `).join("")}
                </select>
                <div class="form-actions">
                    <button class="btn-primary" onclick="addStudent()">Add Student</button>
                    <button class="btn-secondary" onclick="hideAddStudentForm()">Cancel</button>
                </div>
            </div>
            
            <div class="students-table">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Classes</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(adminData.students || []).map(student => `
                            <tr>
                                <td>${student.name || "N/A"}</td>
                                <td>${student.email || "N/A"}</td>
                                <td>${getStudentClasses(student)}</td>
                                <td>
                                    <button class="btn-small" onclick="editStudent('${student.uid || student.id}')">Edit</button>
                                    <button class="btn-small btn-danger" onclick="deleteStudent('${student.uid || student.id}')">Delete</button>
                                    <button class="btn-small" onclick="viewStudentFees('${student.uid || student.id}')">View Fees</button>
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
                ${(adminData.students || []).length === 0 ? "<p style='text-align: center; color: #666; padding: 40px;'>No students yet.</p>" : ""}
            </div>
        </div>
    `;
}

// Render teachers management
function renderTeachersManagement() {
    return `
        <div class="management-section">
            <div class="section-header">
                <h3>Teachers</h3>
                <button class="btn-primary" onclick="showAddTeacherForm()">+ Add Teacher</button>
            </div>
            
            <div id="addTeacherForm" style="display:none;" class="form-card">
                <h4>Add New Teacher</h4>
                <input type="text" id="teacherName" placeholder="Teacher Name" required>
                <input type="email" id="teacherEmail" placeholder="Email" required>
                <input type="text" id="teacherUID" placeholder="Teacher UID (optional)">
                <div class="form-actions">
                    <button class="btn-primary" onclick="addTeacher()">Add Teacher</button>
                    <button class="btn-secondary" onclick="hideAddTeacherForm()">Cancel</button>
                </div>
            </div>
            
            <div class="teachers-table">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Classes</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(adminData.teachers || []).map(teacher => `
                            <tr>
                                <td>${teacher.name || "N/A"}</td>
                                <td>${teacher.email || "N/A"}</td>
                                <td>${getTeacherClasses(teacher)}</td>
                                <td>
                                    <button class="btn-small" onclick="editTeacher('${teacher.uid || teacher.id}')">Edit</button>
                                    <button class="btn-small btn-danger" onclick="deleteTeacher('${teacher.uid || teacher.id}')">Delete</button>
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
                ${(adminData.teachers || []).length === 0 ? "<p style='text-align: center; color: #666; padding: 40px;'>No teachers yet.</p>" : ""}
            </div>
        </div>
    `;
}

// Render classes management
function renderClassesManagement() {
    return `
        <div class="management-section">
            <h3>All Classes</h3>
            <div class="classes-grid">
                ${(adminData.classes || []).map(classDoc => {
                    const className = classDoc.className || classDoc.name || "Unnamed Class";
                    const teacherUID = classDoc.teacherUID || classDoc.teacher || "";
                    const teacher = adminData.teachers.find(t => (t.uid || t.id) === teacherUID);
                    const teacherName = teacher ? (teacher.name || teacher.email || teacherUID) : "No Teacher";
                    const studentCount = classDoc.studentUIDs ? classDoc.studentUIDs.length : 0;
                    
                    return `
                        <div class="class-card">
                            <h4>${className}</h4>
                            <p><strong>Teacher:</strong> ${teacherName}</p>
                            <p><strong>Students:</strong> ${studentCount}</p>
                            <div class="class-actions">
                                <button class="btn-small" onclick="viewClassDetails('${classDoc.id}')">View Details</button>
                            </div>
                        </div>
                    `;
                }).join("")}
                ${(adminData.classes || []).length === 0 ? "<p style='text-align: center; color: #666; padding: 40px;'>No classes yet.</p>" : ""}
            </div>
        </div>
    `;
}

// Add student
async function addStudent() {
    const name = document.getElementById("studentName").value.trim();
    const email = document.getElementById("studentEmail").value.trim();
    const uid = document.getElementById("studentUID").value.trim();
    const selectedClasses = Array.from(document.getElementById("studentClasses").selectedOptions).map(o => o.value);
    
    if (!name || !email) {
        alert("Please fill in name and email.");
        return;
    }
    
    if (!window.db) {
        alert("Firestore not initialized.");
        return;
    }
    
    try {
        const studentData = {
            name: name,
            email: email,
            classes: selectedClasses.filter(c => c),
            createdAt: new Date().toISOString()
        };
        
        if (uid) {
            studentData.uid = uid;
        }
        
        await window.db.collection("students").add(studentData);
        
        alert("Student added successfully!");
        document.getElementById("studentName").value = "";
        document.getElementById("studentEmail").value = "";
        document.getElementById("studentUID").value = "";
        document.getElementById("studentClasses").selectedIndex = 0;
        hideAddStudentForm();
        loadAdminData();
        renderManagementInterface();
    } catch (error) {
        console.error("Error adding student:", error);
        alert("Error adding student. Please try again.");
    }
}

// Add teacher
async function addTeacher() {
    const name = document.getElementById("teacherName").value.trim();
    const email = document.getElementById("teacherEmail").value.trim();
    const uid = document.getElementById("teacherUID").value.trim();
    
    if (!name || !email) {
        alert("Please fill in name and email.");
        return;
    }
    
    if (!window.db) {
        alert("Firestore not initialized.");
        return;
    }
    
    try {
        const teacherData = {
            name: name,
            email: email,
            createdAt: new Date().toISOString()
        };
        
        if (uid) {
            teacherData.uid = uid;
        }
        
        await window.db.collection("teachers").add(teacherData);
        
        alert("Teacher added successfully!");
        document.getElementById("teacherName").value = "";
        document.getElementById("teacherEmail").value = "";
        document.getElementById("teacherUID").value = "";
        hideAddTeacherForm();
        loadAdminData();
        renderManagementInterface();
    } catch (error) {
        console.error("Error adding teacher:", error);
        alert("Error adding teacher. Please try again.");
    }
}

// Edit student
async function editStudent(studentId) {
    const student = adminData.students.find(s => (s.uid || s.id) === studentId);
    if (!student) {
        alert("Student not found.");
        return;
    }
    
    const newName = prompt("Enter new name:", student.name || "");
    if (newName === null) return;
    
    const newEmail = prompt("Enter new email:", student.email || "");
    if (newEmail === null) return;
    
    if (!window.db) {
        alert("Firestore not initialized.");
        return;
    }
    
    try {
        await window.db.collection("students").doc(studentId).update({
            name: newName,
            email: newEmail,
            updatedAt: new Date().toISOString()
        });
        
        alert("Student updated successfully!");
        loadAdminData();
        renderManagementInterface();
    } catch (error) {
        console.error("Error updating student:", error);
        alert("Error updating student. Please try again.");
    }
}

// Edit teacher
async function editTeacher(teacherId) {
    const teacher = adminData.teachers.find(t => (t.uid || t.id) === teacherId);
    if (!teacher) {
        alert("Teacher not found.");
        return;
    }
    
    const newName = prompt("Enter new name:", teacher.name || "");
    if (newName === null) return;
    
    const newEmail = prompt("Enter new email:", teacher.email || "");
    if (newEmail === null) return;
    
    if (!window.db) {
        alert("Firestore not initialized.");
        return;
    }
    
    try {
        await window.db.collection("teachers").doc(teacherId).update({
            name: newName,
            email: newEmail,
            updatedAt: new Date().toISOString()
        });
        
        alert("Teacher updated successfully!");
        loadAdminData();
        renderManagementInterface();
    } catch (error) {
        console.error("Error updating teacher:", error);
        alert("Error updating teacher. Please try again.");
    }
}

// Delete student
async function deleteStudent(studentId) {
    if (!confirm("Are you sure you want to delete this student? This action cannot be undone.")) {
        return;
    }
    
    if (!window.db) {
        alert("Firestore not initialized.");
        return;
    }
    
    try {
        await window.db.collection("students").doc(studentId).delete();
        alert("Student deleted successfully!");
        loadAdminData();
        renderManagementInterface();
    } catch (error) {
        console.error("Error deleting student:", error);
        alert("Error deleting student. Please try again.");
    }
}

// Delete teacher
async function deleteTeacher(teacherId) {
    if (!confirm("Are you sure you want to delete this teacher? This action cannot be undone.")) {
        return;
    }
    
    if (!window.db) {
        alert("Firestore not initialized.");
        return;
    }
    
    try {
        await window.db.collection("teachers").doc(teacherId).delete();
        alert("Teacher deleted successfully!");
        loadAdminData();
        renderManagementInterface();
    } catch (error) {
        console.error("Error deleting teacher:", error);
        alert("Error deleting teacher. Please try again.");
    }
}

// View student fees
function viewStudentFees(studentUID) {
    // Switch to fees tab and filter by student
    window.showAdminTab("fees");
    setTimeout(() => {
        // This will be handled in fees.js
        alert("Student fees view - feature coming soon");
    }, 100);
}

// View class details
function viewClassDetails(classId) {
    const classDoc = adminData.classes.find(c => c.id === classId);
    if (!classDoc) {
        alert("Class not found.");
        return;
    }
    
    const className = classDoc.className || classDoc.name || "Unnamed Class";
    const studentUIDs = classDoc.studentUIDs || [];
    const students = adminData.students.filter(s => studentUIDs.includes(s.uid || s.id));
    
    alert(`Class: ${className}\nStudents: ${students.length}\n\nStudent List:\n${students.map(s => `- ${s.name || s.email || s.uid}`).join("\n")}`);
}

// Helper functions
function getStudentClasses(student) {
    const classIds = student.classes || [];
    const classNames = classIds.map(id => {
        const classDoc = adminData.classes.find(c => c.id === id);
        return classDoc ? (classDoc.className || classDoc.name) : id;
    });
    return classNames.length > 0 ? classNames.join(", ") : "No classes";
}

function getTeacherClasses(teacher) {
    const teacherUID = teacher.uid || teacher.id;
    const classes = adminData.classes.filter(c => 
        (c.teacherUID || c.teacher) === teacherUID
    );
    return classes.length > 0 ? classes.map(c => c.className || c.name).join(", ") : "No classes";
}

function showAddStudentForm() {
    document.getElementById("addStudentForm").style.display = "block";
}

function hideAddStudentForm() {
    document.getElementById("addStudentForm").style.display = "none";
}

function showAddTeacherForm() {
    document.getElementById("addTeacherForm").style.display = "block";
}

function hideAddTeacherForm() {
    document.getElementById("addTeacherForm").style.display = "none";
}

// Make functions globally accessible
window.renderManagementInterface = renderManagementInterface;
window.switchManagementTab = switchManagementTab;
window.addStudent = addStudent;
window.addTeacher = addTeacher;
window.editStudent = editStudent;
window.editTeacher = editTeacher;
window.deleteStudent = deleteStudent;
window.deleteTeacher = deleteTeacher;
window.viewStudentFees = viewStudentFees;
window.viewClassDetails = viewClassDetails;
window.showAddStudentForm = showAddStudentForm;
window.hideAddStudentForm = hideAddStudentForm;
window.showAddTeacherForm = showAddTeacherForm;
window.hideAddTeacherForm = hideAddTeacherForm;

