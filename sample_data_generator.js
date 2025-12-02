// ======= SAMPLE DATA GENERATOR FOR TESTING =======
// This script helps you create sample data in Firestore for testing
// Run this in the browser console while logged in as admin

async function generateSampleData() {
    if (!window.db) {
        console.error("Firestore not initialized");
        return;
    }
    
    console.log("Starting sample data generation...");
    
    try {
        // Sample teacher accounts (you'll need to hash passwords first)
        const sampleTeachers = [
            {
                username: "teacher_john",
                role: "teacher",
                fullName: "John Smith",
                employeeId: "EMP001",
                phone: "1234567890"
            },
            {
                username: "teacher_mary",
                role: "teacher",
                fullName: "Mary Johnson",
                employeeId: "EMP002",
                phone: "2345678901"
            }
        ];
        
        // Sample student accounts
        const sampleStudents = [
            {
                username: "student_alice",
                role: "student",
                fullName: "Alice Brown",
                className: "Grade 10",
                section: "A",
                admissionNumber: "2024001",
                parentPhone: "3456789012",
                phone: "4567890123"
            },
            {
                username: "student_bob",
                role: "student",
                fullName: "Bob Wilson",
                className: "Grade 10",
                section: "A",
                admissionNumber: "2024002",
                parentPhone: "5678901234",
                phone: "6789012345"
            },
            {
                username: "student_carol",
                role: "student",
                fullName: "Carol Davis",
                className: "Grade 10",
                section: "B",
                admissionNumber: "2024003",
                parentPhone: "7890123456",
                phone: "8901234567"
            }
        ];
        
        console.log("⚠️ Note: This script creates users with a default password: 'password123'");
        console.log("You should change passwords after account creation for security.");
        
        // Hash the default password
        const defaultPasswordHash = await window.hashPassword("password123");
        
        // Create teachers
        console.log("Creating sample teachers...");
        for (const teacher of sampleTeachers) {
            const userData = {
                ...teacher,
                passwordHash: defaultPasswordHash,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Check if user exists
            const existing = await window.db.collection("users")
                .where("username", "==", teacher.username)
                .limit(1)
                .get();
            
            if (existing.empty) {
                await window.db.collection("users").add(userData);
                console.log(`✅ Created teacher: ${teacher.username}`);
            } else {
                console.log(`⚠️ Teacher already exists: ${teacher.username}`);
            }
        }
        
        // Create students
        console.log("Creating sample students...");
        for (const student of sampleStudents) {
            const userData = {
                ...student,
                passwordHash: defaultPasswordHash,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Check if user exists
            const existing = await window.db.collection("users")
                .where("username", "==", student.username)
                .limit(1)
                .get();
            
            if (existing.empty) {
                await window.db.collection("users").add(userData);
                console.log(`✅ Created student: ${student.username}`);
            } else {
                console.log(`⚠️ Student already exists: ${student.username}`);
            }
        }
        
        // Create sample classes
        console.log("Creating sample classes...");
        
        // Get teacher UIDs
        const teacherJohnSnapshot = await window.db.collection("users")
            .where("username", "==", "teacher_john")
            .limit(1)
            .get();
        
        const teacherMarySnapshot = await window.db.collection("users")
            .where("username", "==", "teacher_mary")
            .limit(1)
            .get();
        
        // Get student UIDs
        const studentsSnapshot = await window.db.collection("users")
            .where("role", "==", "student")
            .get();
        
        const studentUids = studentsSnapshot.docs.map(doc => doc.id);
        
        if (!teacherJohnSnapshot.empty) {
            const teacherJohnUid = teacherJohnSnapshot.docs[0].id;
            
            // Check if class exists
            const existingClass = await window.db.collection("classes")
                .where("className", "==", "Grade 10 A")
                .limit(1)
                .get();
            
            if (existingClass.empty) {
                await window.db.collection("classes").add({
                    className: "Grade 10 A",
                    teacherUid: teacherJohnUid,
                    studentUids: studentUids.slice(0, 2), // First 2 students
                    doneCount: 5,
                    assignedCount: 8,
                    missingCount: 2,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log("✅ Created class: Grade 10 A");
            } else {
                console.log("⚠️ Class already exists: Grade 10 A");
            }
        }
        
        if (!teacherMarySnapshot.empty) {
            const teacherMaryUid = teacherMarySnapshot.docs[0].id;
            
            // Check if class exists
            const existingClass = await window.db.collection("classes")
                .where("className", "==", "Grade 10 B")
                .limit(1)
                .get();
            
            if (existingClass.empty) {
                await window.db.collection("classes").add({
                    className: "Grade 10 B",
                    teacherUid: teacherMaryUid,
                    studentUids: studentUids.slice(2), // Remaining students
                    doneCount: 3,
                    assignedCount: 10,
                    missingCount: 4,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log("✅ Created class: Grade 10 B");
            } else {
                console.log("⚠️ Class already exists: Grade 10 B");
            }
        }
        
        console.log("\n✅ Sample data generation complete!");
        console.log("\n📝 Test Accounts Created:");
        console.log("Teachers:");
        console.log("  - username: teacher_john, password: password123");
        console.log("  - username: teacher_mary, password: password123");
        console.log("\nStudents:");
        console.log("  - username: student_alice, password: password123");
        console.log("  - username: student_bob, password: password123");
        console.log("  - username: student_carol, password: password123");
        console.log("\n⚠️ Remember to change these passwords in production!");
        
    } catch (error) {
        console.error("Error generating sample data:", error);
    }
}

// To run this script:
// 1. Log in as admin
// 2. Open browser console (F12)
// 3. Copy and paste this entire file
// 4. Run: generateSampleData()

console.log("Sample data generator loaded!");
console.log("To generate sample data, run: generateSampleData()");

