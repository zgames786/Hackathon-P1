// ======= ATTENDANCE MANAGEMENT SYSTEM =======

let attendanceData = {
    records: [],
    classes: []
};

// Load attendance data
async function loadAttendanceData() {
    if (!window.db) {
        console.error("Firestore not initialized");
        return;
    }
    
    try {
        // Load attendance records
        attendanceData.records = await getFirestoreDocs("attendance");
        
        // Load classes
        attendanceData.classes = adminData.classes || [];
        
        // Render attendance interface
        renderAttendanceInterface();
    } catch (error) {
        console.error("Error loading attendance data:", error);
        alert("Error loading attendance data. Please check your connection.");
    }
}

// Render attendance interface
function renderAttendanceInterface() {
    const attendanceTab = document.getElementById("attendanceTab");
    if (!attendanceTab) return;
    
    attendanceTab.innerHTML = `
        <div class="attendance-container">
            <div class="attendance-header">
                <h2 style="text-align: center; color: #667eea; margin-bottom: 20px;">Attendance Management</h2>
            </div>
            
            <div class="attendance-controls">
                <div class="control-group">
                    <label>Select Class:</label>
                    <select id="attendanceClassSelect" onchange="loadClassStudents()" required>
                        <option value="">Select Class</option>
                        ${attendanceData.classes.map(c => `
                            <option value="${c.id}">${c.className || c.name || "Unnamed Class"}</option>
                        `).join("")}
                    </select>
                </div>
                <div class="control-group">
                    <label>Select Date:</label>
                    <input type="date" id="attendanceDate" value="${new Date().toISOString().split('T')[0]}" onchange="loadClassStudents()" required>
                </div>
                <button class="btn-primary" onclick="markAllPresent()">Mark All Present</button>
                <button class="btn-secondary" onclick="markAllAbsent()">Mark All Absent</button>
            </div>
            
            <div id="attendanceStudentsList" class="attendance-students-list">
                <p style="text-align: center; color: #666; padding: 40px;">Please select a class and date to view students.</p>
            </div>
            
            <div class="attendance-trends">
                <h3>Attendance Trends</h3>
                <div class="trends-controls">
                    <select id="trendsClassSelect" onchange="renderAttendanceTrends()">
                        <option value="">All Classes</option>
                        ${attendanceData.classes.map(c => `
                            <option value="${c.id}">${c.className || c.name || "Unnamed Class"}</option>
                        `).join("")}
                    </select>
                    <input type="month" id="trendsMonth" value="${new Date().toISOString().slice(0, 7)}" onchange="renderAttendanceTrends()">
                </div>
                <canvas id="attendanceTrendsChart"></canvas>
            </div>
        </div>
    `;
}

// Load class students for attendance
async function loadClassStudents() {
    const classId = document.getElementById("attendanceClassSelect").value;
    const date = document.getElementById("attendanceDate").value;
    
    if (!classId || !date) {
        document.getElementById("attendanceStudentsList").innerHTML = 
            "<p style='text-align: center; color: #666; padding: 40px;'>Please select a class and date.</p>";
        return;
    }
    
    const selectedClass = attendanceData.classes.find(c => c.id === classId);
    if (!selectedClass) {
        alert("Class not found.");
        return;
    }
    
    // Get students in this class
    const studentUIDs = selectedClass.studentUIDs || [];
    const classStudents = adminData.students.filter(s => 
        studentUIDs.includes(s.uid || s.id) || 
        (s.classes && s.classes.includes(classId))
    );
    
    // Load existing attendance for this date
    const existingAttendance = attendanceData.records.filter(r => 
        r.classId === classId && r.date === date
    );
    
    const attendanceMap = {};
    existingAttendance.forEach(record => {
        attendanceMap[record.studentUID] = record.status;
    });
    
    // Render student list
    document.getElementById("attendanceStudentsList").innerHTML = `
        <div class="attendance-students-grid">
            ${classStudents.map(student => {
                const studentUID = student.uid || student.id;
                const currentStatus = attendanceMap[studentUID] || "present";
                return `
                    <div class="attendance-student-card">
                        <div class="student-info">
                            <strong>${student.name || student.email || studentUID}</strong>
                        </div>
                        <div class="attendance-buttons">
                            <button class="attendance-btn ${currentStatus === 'present' ? 'active present' : ''}" 
                                    onclick="markAttendance('${studentUID}', 'present')">
                                ✓ Present
                            </button>
                            <button class="attendance-btn ${currentStatus === 'absent' ? 'active absent' : ''}" 
                                    onclick="markAttendance('${studentUID}', 'absent')">
                                ✗ Absent
                            </button>
                        </div>
                    </div>
                `;
            }).join("")}
        </div>
        <div class="attendance-actions">
            <button class="btn-primary" onclick="saveAttendance()">Save Attendance</button>
        </div>
    `;
}

// Mark attendance for a student
function markAttendance(studentUID, status) {
    const classId = document.getElementById("attendanceClassSelect").value;
    const date = document.getElementById("attendanceDate").value;
    
    if (!classId || !date) {
        alert("Please select a class and date first.");
        return;
    }
    
    // Update button states
    const cards = document.querySelectorAll(".attendance-student-card");
    cards.forEach(card => {
        const buttons = card.querySelectorAll(".attendance-btn");
        buttons.forEach(btn => {
            if (btn.onclick && btn.onclick.toString().includes(studentUID)) {
                if (btn.textContent.includes(status === 'present' ? 'Present' : 'Absent')) {
                    btn.classList.add("active", status);
                    btn.classList.remove(status === 'present' ? 'absent' : 'present');
                } else {
                    btn.classList.remove("active", "present", "absent");
                }
            }
        });
    });
    
    // Store in temporary state (will be saved when Save is clicked)
    if (!window.tempAttendance) {
        window.tempAttendance = {};
    }
    const key = `${classId}_${date}_${studentUID}`;
    window.tempAttendance[key] = status;
}

// Mark all present
function markAllPresent() {
    const classId = document.getElementById("attendanceClassSelect").value;
    const date = document.getElementById("attendanceDate").value;
    
    if (!classId || !date) {
        alert("Please select a class and date first.");
        return;
    }
    
    const cards = document.querySelectorAll(".attendance-student-card");
    cards.forEach(card => {
        const presentBtn = card.querySelector(".attendance-btn:first-child");
        const absentBtn = card.querySelector(".attendance-btn:last-child");
        if (presentBtn && absentBtn) {
            presentBtn.classList.add("active", "present");
            absentBtn.classList.remove("active", "absent");
            
            // Extract studentUID from onclick
            const onclick = presentBtn.getAttribute("onclick");
            const match = onclick.match(/'([^']+)'/);
            if (match) {
                const studentUID = match[1];
                const key = `${classId}_${date}_${studentUID}`;
                if (!window.tempAttendance) window.tempAttendance = {};
                window.tempAttendance[key] = "present";
            }
        }
    });
}

// Mark all absent
function markAllAbsent() {
    const classId = document.getElementById("attendanceClassSelect").value;
    const date = document.getElementById("attendanceDate").value;
    
    if (!classId || !date) {
        alert("Please select a class and date first.");
        return;
    }
    
    const cards = document.querySelectorAll(".attendance-student-card");
    cards.forEach(card => {
        const presentBtn = card.querySelector(".attendance-btn:first-child");
        const absentBtn = card.querySelector(".attendance-btn:last-child");
        if (presentBtn && absentBtn) {
            absentBtn.classList.add("active", "absent");
            presentBtn.classList.remove("active", "present");
            
            // Extract studentUID from onclick
            const onclick = absentBtn.getAttribute("onclick");
            const match = onclick.match(/'([^']+)'/);
            if (match) {
                const studentUID = match[1];
                const key = `${classId}_${date}_${studentUID}`;
                if (!window.tempAttendance) window.tempAttendance = {};
                window.tempAttendance[key] = "absent";
            }
        }
    });
}

// Save attendance
async function saveAttendance() {
    const classId = document.getElementById("attendanceClassSelect").value;
    const date = document.getElementById("attendanceDate").value;
    
    if (!classId || !date) {
        alert("Please select a class and date first.");
        return;
    }
    
    if (!window.db) {
        alert("Firestore not initialized.");
        return;
    }
    
    try {
        const selectedClass = attendanceData.classes.find(c => c.id === classId);
        const studentUIDs = selectedClass.studentUIDs || [];
        const classStudents = adminData.students.filter(s => 
            studentUIDs.includes(s.uid || s.id) || 
            (s.classes && s.classes.includes(classId))
        );
        
        // Save attendance for each student
        for (const student of classStudents) {
            const studentUID = student.uid || student.id;
            const key = `${classId}_${date}_${studentUID}`;
            const status = window.tempAttendance?.[key] || "present";
            
            // Check if record already exists
            const existingRecord = attendanceData.records.find(r => 
                r.classId === classId && r.date === date && r.studentUID === studentUID
            );
            
            if (existingRecord) {
                // Update existing record
                await window.db.collection("attendance").doc(existingRecord.id).update({
                    status: status,
                    updatedAt: new Date().toISOString()
                });
            } else {
                // Create new record
                await window.db.collection("attendance").add({
                    classId: classId,
                    studentUID: studentUID,
                    date: date,
                    status: status,
                    createdAt: new Date().toISOString()
                });
            }
        }
        
        // Clear temp attendance
        window.tempAttendance = {};
        
        alert("Attendance saved successfully!");
        loadAttendanceData();
    } catch (error) {
        console.error("Error saving attendance:", error);
        alert("Error saving attendance. Please try again.");
    }
}

// Render attendance trends
function renderAttendanceTrends() {
    const classId = document.getElementById("trendsClassSelect")?.value || "";
    const month = document.getElementById("trendsMonth")?.value || "";
    
    // Filter records
    let filteredRecords = attendanceData.records;
    if (classId) {
        filteredRecords = filteredRecords.filter(r => r.classId === classId);
    }
    if (month) {
        filteredRecords = filteredRecords.filter(r => r.date.startsWith(month));
    }
    
    // Calculate daily attendance
    const dailyStats = {};
    filteredRecords.forEach(record => {
        if (!dailyStats[record.date]) {
            dailyStats[record.date] = { present: 0, absent: 0 };
        }
        if (record.status === "present") {
            dailyStats[record.date].present++;
        } else {
            dailyStats[record.date].absent++;
        }
    });
    
    const sortedDates = Object.keys(dailyStats).sort();
    const presentData = sortedDates.map(d => dailyStats[d].present);
    const absentData = sortedDates.map(d => dailyStats[d].absent);
    
    const ctx = document.getElementById("attendanceTrendsChart");
    if (ctx) {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedDates.map(d => formatDate(d)),
                datasets: [
                    {
                        label: 'Present',
                        data: presentData,
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Absent',
                        data: absentData,
                        borderColor: '#dc3545',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        tension: 0.4
                    }
                ]
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

// Helper function
function formatDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Make functions globally accessible
window.loadAttendanceData = loadAttendanceData;
window.loadClassStudents = loadClassStudents;
window.markAttendance = markAttendance;
window.markAllPresent = markAllPresent;
window.markAllAbsent = markAllAbsent;
window.saveAttendance = saveAttendance;
window.renderAttendanceTrends = renderAttendanceTrends;

