// ======= ADMIN CREATION =======
// Hardcoded master UID - change this to your desired master UID
const MASTER_UID = "zW3LsKJr1IZiLt149F25ObvYcX32";

// Verify MASTER_UID is set correctly on load
console.log("MASTER_UID constant:", MASTER_UID);
console.log("MASTER_UID length:", MASTER_UID.length);

function showAdminError(message) {
    const errorDiv = document.getElementById("adminCreateError");
    const successDiv = document.getElementById("adminCreateSuccess");
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = "block";
    }
    if (successDiv) {
        successDiv.style.display = "none";
    }
}

function showAdminSuccess(message) {
    const errorDiv = document.getElementById("adminCreateError");
    const successDiv = document.getElementById("adminCreateSuccess");
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = "block";
    }
    if (errorDiv) {
        errorDiv.style.display = "none";
    }
}

async function createAdmin() {
  const username = document.getElementById("adminUsername").value.trim();
  const password = document.getElementById("adminPassword").value;

  const fakeEmail = `${username}@admins.local`;

  const userCred = await auth.createUserWithEmailAndPassword(fakeEmail, password);
  const user = userCred.user;

  await db.collection("admins").doc(username).set({
    uid: user.uid,
    role: "admin",
    createdAt: new Date().toISOString()
  });

  window.location.href = "index.html";
}

