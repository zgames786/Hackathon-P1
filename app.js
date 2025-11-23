let userType = "";
let loggedInUser = null;
let usersDB = {student:{}, teacher:{}};
let classesDB = {};
let currentTab = "home";
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let assignmentsDB = {};

function selectType(type) {
    userType = type;
    document.getElementById("loginForm").style.display = "block";
}

function createAccount() {
    let username = document.getElementById("username").value;
    let password = document.getElementById("password").value;
    if (!username || !password) { alert("Enter valid username/password"); return; }
    if (!usersDB[userType][username]) { 
        usersDB[userType][username] = {password: password, classes: []};
        alert("Account created!"); 
    } else { alert("User exists!"); }
}

function login() {
    let username = document.getElementById("username").value;
    let password = document.getElementById("password").value;
    if (usersDB[userType][username] && usersDB[userType][username].password === password) {
        loggedInUser = username;
        window.location.href = "home.html";
    } else { alert("Invalid credentials"); }
}

function toggleSidebar() { document.getElementById("sidebar").classList.toggle("show"); }

function showTab(tab) {
    ["homeTab","assignmentsTab","calendarTab"].forEach(t=>document.getElementById(t).style.display="none");
    document.getElementById(tab+"Tab").style.display="block";
    currentTab = tab;
}

function joinClass() { let code=prompt("Enter class code"); alert("Class joined (demo)"); }
function createClass() { let name=prompt("Enter class name"); alert("Class created (demo)"); }
function showAssignmentTab(tab) { alert("Switching assignments tab: "+tab); }
function addAssignment() { alert("Add assignment clicked"); }
