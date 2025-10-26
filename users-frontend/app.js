const STORAGE_KEY = "users_frontend_api_base";

function getApiBase() {
  return localStorage.getItem(STORAGE_KEY) || "http://localhost:4001";
}

function setApiBase(value) {
  localStorage.setItem(STORAGE_KEY, value);
}

function $(sel) { return document.querySelector(sel); }

const apiBaseInput = $("#apiBase");
const saveBaseBtn = $("#saveBase");
const baseStatus = $("#baseStatus");
const createForm = $("#createForm");
const createStatus = $("#createStatus");
const refreshBtn = $("#refresh");
const listStatus = $("#listStatus");
const usersBody = $("#usersBody");

apiBaseInput.value = getApiBase();
saveBaseBtn.addEventListener("click", () => {
  const value = apiBaseInput.value.trim();
  try {
    const url = new URL(value);
    if (!url.protocol.startsWith("http")) throw new Error("invalid");
    setApiBase(value);
    baseStatus.textContent = "Guardado.";
    setTimeout(() => baseStatus.textContent = "", 1500);
  } catch {
    baseStatus.textContent = "URL inválida";
  }
});

async function api(path, options = {}) {
  const url = `${getApiBase()}${path}`;
  const resp = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const contentType = resp.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await resp.json() : await resp.text();
  if (!resp.ok) {
    const detail = typeof data === "string" ? data : (data?.detail || data?.error || JSON.stringify(data));
    throw new Error(`HTTP ${resp.status}: ${detail}`);
  }
  return data;
}

async function loadUsers() {
  listStatus.textContent = "Cargando...";
  usersBody.innerHTML = "";
  try {
    const users = await api("/users");
    if (!Array.isArray(users) || users.length === 0) {
      usersBody.innerHTML = `<tr><td colspan="4">Sin usuarios</td></tr>`;
    } else {
      for (const u of users) {
        usersBody.appendChild(renderRow(u));
      }
    }
    listStatus.textContent = "";
  } catch (e) {
    listStatus.textContent = `Error al cargar: ${e.message}`;
  }
}

function renderRow(user) {
  const tr = document.createElement("tr");
  tr.dataset.id = user.id;

  const tdId = document.createElement("td");
  tdId.textContent = user.id;

  const tdName = document.createElement("td");
  const tdEmail = document.createElement("td");

  const tdActions = document.createElement("td");
  tdActions.className = "row-actions";

  const nameSpan = document.createElement("span");
  nameSpan.textContent = user.name;
  const emailSpan = document.createElement("span");
  emailSpan.textContent = user.email;

  tdName.appendChild(nameSpan);
  tdEmail.appendChild(emailSpan);

  const editBtn = document.createElement("button");
  editBtn.className = "secondary";
  editBtn.textContent = "Editar";
  const delBtn = document.createElement("button");
  delBtn.className = "danger";
  delBtn.textContent = "Eliminar";

  tdActions.append(editBtn, delBtn);

  tr.append(tdId, tdName, tdEmail, tdActions);

  // Edit mode controls
  let editing = false;
  let nameInput, emailInput, saveBtn, cancelBtn;

  function enterEdit() {
    editing = true;
    nameInput = document.createElement("input");
    nameInput.className = "row-edit-input";
    nameInput.value = user.name;
    emailInput = document.createElement("input");
    emailInput.className = "row-edit-input";
    emailInput.value = user.email;

    tdName.replaceChildren(nameInput);
    tdEmail.replaceChildren(emailInput);

    saveBtn = document.createElement("button");
    saveBtn.textContent = "Guardar";
    cancelBtn = document.createElement("button");
    cancelBtn.className = "secondary";
    cancelBtn.textContent = "Cancelar";

    tdActions.replaceChildren(saveBtn, cancelBtn);
  }

  function exitEdit(reset = false) {
    editing = false;
    if (reset) {
      nameSpan.textContent = user.name;
      emailSpan.textContent = user.email;
    }
    tdName.replaceChildren(nameSpan);
    tdEmail.replaceChildren(emailSpan);
    tdActions.replaceChildren(editBtn, delBtn);
  }

  editBtn.addEventListener("click", () => {
    if (!editing) enterEdit();
  });

  delBtn.addEventListener("click", async () => {
    if (!confirm(`Eliminar usuario #${user.id}?`)) return;
    delBtn.disabled = true;
    try {
      await api(`/users/${user.id}`, { method: "DELETE" });
      tr.remove();
    } catch (e) {
      alert(`Error eliminando: ${e.message}`);
    } finally {
      delBtn.disabled = false;
    }
  });

  function validateEmail(v) {
    return /.+@.+\..+/.test(v);
  }

  function attachEditHandlers() {
    saveBtn.addEventListener("click", async () => {
      const newName = nameInput.value.trim();
      const newEmail = emailInput.value.trim();
      if (!newName || !newEmail) return alert("Nombre y email son requeridos");
      if (!validateEmail(newEmail)) return alert("Email inválido");

      saveBtn.disabled = true; cancelBtn.disabled = true;
      try {
        const updated = await api(`/users/${user.id}`, {
          method: "PUT",
          body: JSON.stringify({ name: newName, email: newEmail })
        });
        user = updated; // update local ref
        nameSpan.textContent = updated.name;
        emailSpan.textContent = updated.email;
        exitEdit();
      } catch (e) {
        alert(`Error guardando: ${e.message}`);
      } finally {
        saveBtn.disabled = false; cancelBtn.disabled = false;
      }
    });

    cancelBtn.addEventListener("click", () => exitEdit(true));
  }

  // Observe tdActions replacement to bind listeners when entering edit mode
  const obs = new MutationObserver(() => {
    if (editing && saveBtn && cancelBtn) {
      attachEditHandlers();
    }
  });
  obs.observe(tdActions, { childList: true });

  return tr;
}

createForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(createForm);
  const name = String(fd.get("name") || "").trim();
  const email = String(fd.get("email") || "").trim();
  if (!name || !email) return;

  createStatus.textContent = "Creando...";
  try {
    const created = await api("/users", {
      method: "POST",
      body: JSON.stringify({ name, email })
    });
    usersBody.appendChild(renderRow(created));
    createForm.reset();
    createStatus.textContent = "Creado ✅";
    setTimeout(() => createStatus.textContent = "", 1200);
  } catch (e) {
    createStatus.textContent = `Error: ${e.message}`;
  }
});

refreshBtn.addEventListener("click", loadUsers);

// initial load
loadUsers();
