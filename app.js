// ==================== SESSION CHECK ====================
let currentUser = sessionStorage.getItem("currentUser") || localStorage.getItem("lastUser");
let currentType = sessionStorage.getItem("currentType") || localStorage.getItem("lastType");
if(!currentUser || !currentType){ alert("Login first"); window.location.href="index.html"; }

// ==================== SIDEBAR ====================
function toggleSidebar(){
  let sb=document.getElementById("sidebar");
  sb.style.display=sb.style.display==="block"?"none":"block";
}
function showTab(tab){
  document.getElementById("homeTab").style.display="none";
  document.getElementById("assignmentsTab").style.display="none";
  document.getElementById("calendarTab").style.display="none";
  document.getElementById(tab+"Tab").style.display="block";
  document.getElementById("sidebar").style.display="none";
}

// ==================== CLASS MANAGEMENT ====================
let classes = JSON.parse(localStorage.getItem(currentUser+"_"+currentType+"_classes")||"[]");

function renderClasses(){
  let container=document.getElementById("classesContainer");
  container.innerHTML="";
  classes.forEach(c=>{
    let div=document.createElement("div");
    div.className="class-box";
    div.innerText=c.name+" - Code: "+c.code;
    container.appendChild(div);
  });
}
renderClasses();

function joinClass(){
  let code=prompt("Enter class code");
  if(!code) return;
  let all=JSON.parse(localStorage.getItem("all_classes")||"[]");
  let cls=all.find(c=>c.code===code);
  if(!cls){ alert("Class not found"); return; }
  if(classes.find(c=>c.code===code)){ alert("Already joined"); return; }
  classes.push(cls);
  localStorage.setItem(currentUser+"_"+currentType+"_classes",JSON.stringify(classes));
  renderClasses();
  renderPie();
  alert("Class joined!");
}

function createClass(){
  if(currentType!=="teacher"){ alert("Only teachers can create classes"); return; }
  let name=prompt("Class Name");
  if(!name) return;
  let code=Math.random().toString(36).substring(2,9).toUpperCase();
  let cls={name:name,code:code,assignments:[]};
  classes.push(cls);
  localStorage.setItem(currentUser+"_"+currentType+"_classes",JSON.stringify(classes));
  let all=JSON.parse(localStorage.getItem("all_classes")||"[]");
  all.push(cls);
  localStorage.setItem("all_classes",JSON.stringify(all));
  renderClasses();
  alert("Class created! Code: "+code);
}

// ==================== PIE CHART ====================
function renderPie(){
  if(currentType!=="student") return;
  let active=0,done=0,missing=0;
  classes.forEach(c=>{
    (c.assignments||[]).forEach(a=>{
      if(!a.statuses) a.statuses={};
      let status = a.statuses[currentUser] || "active";
      if(status==="active") active++;
      else if(status==="done") done++;
      else if(status==="missing") missing++;
    });
  });
  let ctx=document.getElementById("piechart").getContext("2d");
  new Chart(ctx,{
    type:"doughnut",
    data:{
      labels:["Active","Done","Missing"],
      datasets:[{data:[active,done,missing],backgroundColor:["#007bff","#28a745","#dc3545"]}]
    },
    options:{plugins:{legend:{position:"bottom"}}}
  });
}
renderPie();

// ==================== ASSIGNMENTS ====================
let currentAssignmentTab="active";
function showAssignmentTab(tab){
  currentAssignmentTab=tab;
  document.querySelectorAll(".tab-btn").forEach(btn=>btn.classList.remove("tab-selected"));
  event.target.classList.add("tab-selected");
  renderAssignments();
}

function renderAssignments(){
  let container=document.getElementById("assignmentsContainer");
  container.innerHTML="";
  classes.forEach(c=>{
    (c.assignments||[]).forEach(a=>{
      if(!a.statuses) a.statuses={};
      let status = a.statuses[currentUser] || "active";
      if(currentType==="teacher" || status===currentAssignmentTab){
        let div=document.createElement("div");
        div.className="assign-box";
        div.innerText=a.name+" | Due: "+a.due;
        if(currentType==="teacher"){
          let del=document.createElement("button");
          del.innerText="Delete";
          del.onclick=()=>{ 
            if(confirm("Delete assignment?")){ 
              // Remove from all_classes as well
              let all=JSON.parse(localStorage.getItem("all_classes")||"[]");
              let classIdx = all.findIndex(x=>x.code===c.code);
              if(classIdx>=0){
                all[classIdx].assignments = all[classIdx].assignments.filter(x=>x!==a);
                localStorage.setItem("all_classes",JSON.stringify(all));
              }
              c.assignments = c.assignments.filter(x=>x!==a);
              saveClasses();
              renderAssignments();
              renderCalendar();
              renderPie();
            } 
          };
          div.appendChild(del);
        }
        container.appendChild(div);
      }
    });
  });
  if(currentType==="teacher") document.getElementById("addAssignmentBtn").style.display="inline-block";
}
renderAssignments();

function addAssignment(){
  let classCode=prompt("Enter class code for this assignment");
  let cls=classes.find(c=>c.code===classCode);
  if(!cls){ alert("Class not found"); return; }
  let name=prompt("Assignment Name");
  let due=prompt("Due Date (ex: 11/23/2025 12PM)");
  if(!name || !due) return;
  let assignment={name:name,due:due,statuses:{}};
  cls.assignments.push(assignment);
  
  // Save to all_classes
  let all=JSON.parse(localStorage.getItem("all_classes")||"[]");
  let idx = all.findIndex(x=>x.code===cls.code);
  if(idx>=0) all[idx]=cls;
  localStorage.setItem("all_classes",JSON.stringify(all));

  saveClasses();
  renderAssignments();
  renderPie();
  renderCalendar();
}

function saveClasses(){
  localStorage.setItem(currentUser+"_"+currentType+"_classes",JSON.stringify(classes));
}

// ==================== CALENDAR ====================
let today = new Date();
let calendarMonth = today.getMonth();
let calendarYear = today.getFullYear();

function renderCalendar(){
  let container=document.getElementById("calendarContainer");
  if(!container) return;
  container.innerHTML="";
  document.getElementById("monthYear").innerText = new Date(calendarYear,calendarMonth).toLocaleString('default',{month:'long',year:'numeric'});

  let firstDay = new Date(calendarYear, calendarMonth,1).getDay();
  let lastDate = new Date(calendarYear,calendarMonth+1,0).getDate();

  for(let i=0;i<firstDay;i++){ let empty=document.createElement("div"); container.appendChild(empty); }

  for(let d=1;d<=lastDate;d++){
    let dayDiv=document.createElement("div");
    dayDiv.className="day-box";
    let dayNum=document.createElement("div");
    dayNum.className="day-number";
    dayNum.innerText=d;
    dayDiv.appendChild(dayNum);

    classes.forEach(c=>{
      (c.assignments||[]).forEach(a=>{
        let adate=new Date(a.due);
        if(adate.getFullYear()===calendarYear && adate.getMonth()===calendarMonth && adate.getDate()===d){
          let lbl=document.createElement("div");
          lbl.className="assignment-label";
          lbl.title=a.name;
          lbl.innerText=a.name.length>15 ? a.name.substring(0,15)+"..." : a.name;
          dayDiv.appendChild(lbl);
        }
      });
    });

    container.appendChild(dayDiv);
  }
}
renderCalendar();

function prevMonth(){ calendarMonth--; if(calendarMonth<0){ calendarMonth=11; calendarYear--; } renderCalendar(); }
function nextMonth(){ calendarMonth++; if(calendarMonth>11){ calendarMonth=0; calendarYear++; } renderCalendar(); }
