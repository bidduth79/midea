/* ================================================= */
/* [ADM-JS] ADMIN PANEL SCRIPT */
/* ================================================= */

/* [ADM-0] Default users */
const DEFAULT_USERS = [
  { username: "admin", password: "1234", role: "admin" },
  { username: "editor", password: "2222", role: "editor" },
  { username: "user", password: "1111", role: "viewer" }
];

/* ================================================= */
/* [ADM-1] Users Storage */
/* ================================================= */
function getUsers() {
  try {
    return JSON.parse(localStorage.getItem("mediahub_users")) || [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem("mediahub_users", JSON.stringify(users));
}

/* ✅ init users once */
if (getUsers().length === 0) saveUsers(DEFAULT_USERS);

/* ================================================= */
/* [ADM-2] Sidebar Panel Switch */
/* ================================================= */
function showPanel(panel) {
  document.querySelectorAll(".admin-panel").forEach(p => p.classList.remove("show"));
  document.querySelectorAll(".admin-menu-btn").forEach(b => b.classList.remove("active"));

  const el = document.getElementById("panel-" + panel);
  if (el) el.classList.add("show");

  const btns = document.querySelectorAll(".admin-menu-btn");
  btns.forEach(btn => {
    if (btn.getAttribute("onclick")?.includes(panel)) btn.classList.add("active");
  });
}

/* ================================================= */
/* [ADM-3] Render Users */
/* ================================================= */
function renderUsers() {
  const users = getUsers();
  const table = document.getElementById("usersTable");
  if (!table) return;

  table.innerHTML = "";

  users.forEach((u, index) => {
    table.innerHTML += `
      <tr>
        <td>${u.username}</td>

        <td>
          <select onchange="changeRole(${index}, this.value)">
            <option value="admin" ${u.role === "admin" ? "selected" : ""}>admin</option>
            <option value="editor" ${u.role === "editor" ? "selected" : ""}>editor</option>
            <option value="viewer" ${u.role === "viewer" ? "selected" : ""}>viewer</option>
          </select>
        </td>

        <td>
          <button onclick="deleteUser(${index})"
            style="padding:8px 12px;border-radius:10px;border:none;cursor:pointer;
            background:rgba(121,5,5,0.18);color:#fff;font-weight:800;">
            🗑 Delete
          </button>
        </td>
      </tr>
    `;
  });

  // Dashboard count update
  const total = document.getElementById("totalUsers");
  if (total) total.innerText = users.length;
}

/* ================================================= */
/* [ADM-4] Add User */
/* ================================================= */
function addUser() {
  const user = document.getElementById("newUser").value.trim();
  const pass = document.getElementById("newPass").value.trim();
  const role = document.getElementById("newRole").value;

  if (!user || !pass) return alert("❌ Username ও Password দিতে হবে!");

  const users = getUsers();
  if (users.find(x => x.username === user)) return alert("❌ এই Username আগেই আছে!");

  users.push({ username: user, password: pass, role });
  saveUsers(users);

  document.getElementById("newUser").value = "";
  document.getElementById("newPass").value = "";

  alert("✅ User Added!");
  renderUsers();
}

/* ================================================= */
/* [ADM-5] Delete User */
/* ================================================= */
function deleteUser(index) {
  const users = getUsers();
  if (!users[index]) return;

  if (users[index].username === "admin") {
    alert("❌ Default admin delete করা যাবে না!");
    return;
  }

  if (!confirm("আপনি কি নিশ্চিত Delete করবেন?")) return;

  users.splice(index, 1);
  saveUsers(users);
  renderUsers();
}

/* ================================================= */
/* [ADM-6] Change Role */
/* ================================================= */
function changeRole(index, role) {
  const users = getUsers();
  if (!users[index]) return;
  users[index].role = role;
  saveUsers(users);
}

/* ================================================= */
/* [ADM-7] Notice Board */
/* ================================================= */
function saveAdminNote() {
  const note = document.getElementById("adminNote").value.trim();
  localStorage.setItem("mediahub_admin_note", note);
  alert("✅ Admin Note Saved!");

  const status = document.getElementById("noteStatus");
  if (status) status.innerText = note ? "Yes ✅" : "No";
}

/* Load note */
(function loadNote() {
  const note = localStorage.getItem("mediahub_admin_note") || "";
  const box = document.getElementById("adminNote");
  if (box) box.value = note;

  const status = document.getElementById("noteStatus");
  if (status) status.innerText = note ? "Yes ✅" : "No";
})();

/* ================================================= */
/* [ADM-8] Logout */
/* ================================================= */
function logout() {
  if (confirm("আপনি কি সত্যিই Logout করতে চান?")) {
    localStorage.removeItem("mediahub_logged_in");
    localStorage.removeItem("mediahub_user");
    localStorage.removeItem("mediahub_role");
    localStorage.removeItem("mediahub_remember");
    window.location.href = "login.html";
  }
}

/* ================================================= */
/* [ADM-9] Init */
/* ================================================= */
document.addEventListener("DOMContentLoaded", () => {
  // admin username show
  const user = localStorage.getItem("mediahub_user") || "admin";
  const host = document.getElementById("adminUser");
  if (host) host.innerText = user;

  renderUsers();
});
