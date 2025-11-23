// ======= LOGIN & ACCOUNT =======
let userType = "";
let loggedInUser = null;
let usersDB = {student:{}, teacher:{}};
let classesDB = {}; // classCode: {name, assignments: []}
let currentTab = "home";
let assignmentsDB = {}; // userType_user: {classCode: [{name,due,status}]}

function selectType(type){
    userType = type;
    document.getElementById("loginForm").style.display = "block";
    alert("Selected: "+type);
}

function createAccount(){
    let u = document.getElementById("username").value;
    let p = document.getElementById("password").value;
    if(!u||!p){alert("Enter username and password");return;}
    if(!usersDB[userType][u]){ usersDB[userType][u]={password:p,classes:[]}; alert("Account created!"); }
    else{alert("User exists!");}
}

function login(){
    let u = document.getElementById("username").value;
    let p = document.getElementById("password").value;
    if(usersDB[userType][u] && usersDB[userType][u].password===p){
        loggedInUser = u;
        localStorage.setItem("loggedInUser",userType+"_"+u);
        localStorage.setItem("userType",userType);
        window.location.href = "home.html";
    } else { alert("Invalid credentials"); }
}

// ======= DASHBOARD =======
window.onload = function(){
    if(localStorage.getItem("loggedInUser")){
        loggedInUser = localStorage.getItem("loggedInUser").split("_")[1];
        userType = localStorage.getItem("userType");
        if(document.getElementById("userNameDisplay"))
            document.getElementById("userNameDisplay").innerText = loggedInUser;
        renderPieChart();
    }
}

function toggleSidebar(){ document.getElementById("sidebar").classList.toggle("show"); }
function showTab(tab){
    ["homeTab","assignmentsTab","calendarTab"].forEach(t=>document.getElementById(t).style.display="none");
    document.getElementById(tab+"Tab").style.display="block";
    currentTab = tab;
}

// ======= CLASSES =======
function joinClass(){
    let code = prompt("Enter class code");
    if(classesDB[code]){
        usersDB[userType][loggedInUser].classes.push(code);
        alert("Joined class: "+classesDB[code].name);
        renderPieChart();
    } else { alert("Class code not found"); }
}
function createClass(){
    if(userType!=="teacher"){alert("Only teachers can create class"); return;}
    let name = prompt("Enter class name");
    let code = Math.random().toString(36).substring(2,9).toUpperCase();
    classesDB[code] = {name:name, assignments:[]};
    usersDB[userType][loggedInUser].classes.push(code);
    alert("Class created! Code: "+code);
}

// ======= ASSIGNMENTS =======
function showAssignmentTab(tab){ alert("Tab switched to "+tab); }
function addAssignment(){
    let classCode = prompt("Enter class code");
    let name = prompt("Assignment name");
    let due = prompt("Due date (any format)");
    if(!Date.parse(due)){ alert("Invalid date"); return; }
    classesDB[classCode].assignments.push({name:name,due:new Date(due),status:"active"});
    alert("Assignment added!");
    renderPieChart();
}

// ======= PIE CHART =======
function renderPieChart(){
    let done=0,active=0,missing=0;
    if(!classesDB){return;}
    Object.values(classesDB).forEach(c=>{
        c.assignments.forEach(a=>{
            if(a.status==="done") done++;
            else if(a.status==="active") active++;
            else missing++;
        });
    });
    let ctx = document.getElementById("piechart");
    if(!ctx) return;
    new Chart(ctx,{
        type:"doughnut",
        data:{
            labels:["Done","Active","Missing"],
            datasets:[{data:[done,active,missing],backgroundColor:["#28a745","#007bff","#dc3545"]}]
        }
    });
}

// ======= CALENDAR =======
function prevMonth(){ alert("Prev month (demo)"); }
function nextMonth(){ alert("Next month (demo)"); }
