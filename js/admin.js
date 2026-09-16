/**
 * admin.js
 * Layout del panel administrativo + dashboard con estadísticas +
 * helpers reutilizables (selects en cascada ciclo→materia→unidad) +
 * CRUD de ciclos, materias y unidades.
 */

function renderAdminShell(profile, activeKey) {
  const appName = window.__ENV__.APP_NAME;
  const items = [
    { key: "dashboard", href: "admin.html", label: "Dashboard" },
    { key: "ciclos", href: "admin-ciclos.html", label: "Ciclos" },
    { key: "materias", href: "admin-materias.html", label: "Materias" },
    { key: "unidades", href: "admin-unidades.html", label: "Unidades" },
    { key: "archivos", href: "admin-archivos.html", label: "Archivos" },
    { key: "videos", href: "admin-videos.html", label: "Videos" },
    { key: "usuarios", href: "admin-usuarios.html", label: "Usuarios" }
  ];

  document.getElementById("app-shell").innerHTML = `
    <aside class="sidebar admin-sidebar">
      <div class="brand">
        <img src="assets/logo.svg" alt="${appName}" class="brand-logo" />
        <span class="brand-name">${appName} <small>Admin</small></span>
      </div>
      <nav class="sidebar-nav">
        ${items.map(i => `<a href="${i.href}" class="nav-link ${activeKey === i.key ? "active" : ""}">${i.label}</a>`).join("")}
        <a href="dashboard.html" class="nav-link">Volver a la app</a>
      </nav>
      <button id="theme-toggle" class="nav-link theme-toggle-btn">🌙 <span>Modo oscuro</span></button>
      <button id="logout-btn" class="nav-link logout-btn">↩ <span>Cerrar sesión</span></button>
    </aside>
    <div class="main-area">
      <header class="topbar"><h2 class="admin-topbar-title">Panel administrativo</h2></header>
      <main class="page-content" id="page-content"></main>
    </div>
  `;
  document.getElementById("logout-btn").addEventListener("click", () => window.AppAuth.signOut());
  document.getElementById("theme-toggle").addEventListener("click", () => {
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", document.documentElement.classList.contains("dark") ? "dark" : "light");
  });
  if (localStorage.getItem("theme") === "dark") document.documentElement.classList.add("dark");
}

async function loadAdminDashboard() {
  const content = document.getElementById("page-content");
  content.innerHTML = `<div class="loading">Cargando estadísticas...</div>`;

  const counts = await Promise.all([
    sb.from("cycles").select("*", { count: "exact", head: true }),
    sb.from("subjects").select("*", { count: "exact", head: true }),
    sb.from("units").select("*", { count: "exact", head: true }),
    sb.from("files").select("*", { count: "exact", head: true }),
    sb.from("videos").select("*", { count: "exact", head: true }),
    sb.from("profiles").select("*", { count: "exact", head: true })
  ]);

  const [ciclos, materias, unidades, archivos, videos, usuarios] = counts.map(c => c.count || 0);

  content.innerHTML = `
    <h1 class="page-title">Dashboard</h1>
    <div class="stats-grid">
      ${statCard("Ciclos", ciclos)}
      ${statCard("Materias", materias)}
      ${statCard("Unidades", unidades)}
      ${statCard("Archivos", archivos)}
      ${statCard("Videos", videos)}
      ${statCard("Usuarios", usuarios)}
    </div>
    <p class="page-subtitle" style="margin-top:24px;">
      Administra el contenido desde el menú lateral: Ciclos → Materias → Unidades → Archivos/Videos.
    </p>
  `;
}
function statCard(label, value) {
  return `<div class="stat-card"><p class="stat-value">${value}</p><p class="stat-label">${label}</p></div>`;
}

/* ---------- Selects en cascada ---------- */

async function populateCicloSelect(selectEl) {
  const { data } = await sb.from("cycles").select("id,name,order_index").order("order_index");
  selectEl.innerHTML = `<option value="">Selecciona un ciclo</option>` +
    data.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
}

async function populateMateriaSelect(selectEl, cicloId) {
  if (!cicloId) { selectEl.innerHTML = `<option value="">Selecciona un ciclo primero</option>`; return; }
  const { data } = await sb.from("subjects").select("id,name").eq("cycle_id", cicloId).order("order_index");
  selectEl.innerHTML = `<option value="">Selecciona una materia</option>` +
    data.map(m => `<option value="${m.id}">${m.name}</option>`).join("");
}

async function populateUnidadSelect(selectEl, materiaId) {
  if (!materiaId) { selectEl.innerHTML = `<option value="">Selecciona una materia primero</option>`; return; }
  const { data } = await sb.from("units").select("id,title,order_index").eq("subject_id", materiaId).order("order_index");
  selectEl.innerHTML = `<option value="">Selecciona una unidad</option>` +
    data.map(u => `<option value="${u.id}">Unidad ${u.order_index} — ${u.title}</option>`).join("");
}

/* ---------- CRUD: Ciclos ---------- */

async function loadAdminCiclos() {
  const content = document.getElementById("page-content");
  content.innerHTML = `
    <h1 class="page-title">Ciclos</h1>
    <form id="ciclo-form" class="admin-form">
      <input type="hidden" id="ciclo-id" />
      <label>Nombre</label>
      <input id="ciclo-name" required placeholder="Ciclo I" />
      <label>Descripción</label>
      <input id="ciclo-desc" placeholder="Opcional" />
      <label>Orden</label>
      <input id="ciclo-order" type="number" min="1" required />
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">Guardar ciclo</button>
        <button type="button" id="ciclo-cancel" class="btn btn-secondary hidden">Cancelar edición</button>
      </div>
    </form>
    <div class="admin-table" id="ciclos-table"></div>
  `;

  const form = document.getElementById("ciclo-form");
  const cancelBtn = document.getElementById("ciclo-cancel");

  async function refresh() {
    const { data } = await sb.from("cycles").select("*").order("order_index");
    document.getElementById("ciclos-table").innerHTML = renderAdminTable(
      ["Orden", "Nombre", "Descripción", "Acciones"],
      data.map(c => [c.order_index, c.name, c.description || "-", adminRowActions("ciclo", c.id)])
    );
    data.forEach(c => {
      const editBtn = document.getElementById(`edit-ciclo-${c.id}`);
      const delBtn = document.getElementById(`del-ciclo-${c.id}`);
      if (editBtn) editBtn.addEventListener("click", () => {
        document.getElementById("ciclo-id").value = c.id;
        document.getElementById("ciclo-name").value = c.name;
        document.getElementById("ciclo-desc").value = c.description || "";
        document.getElementById("ciclo-order").value = c.order_index;
        cancelBtn.classList.remove("hidden");
      });
      if (delBtn) delBtn.addEventListener("click", async () => {
        if (!confirm(`¿Eliminar el ciclo "${c.name}"? Esto también eliminará sus materias.`)) return;
        const { error } = await sb.from("cycles").delete().eq("id", c.id);
        if (error) { alert("No se pudo eliminar: " + error.message); return; }
        refresh();
      });
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("ciclo-id").value;
    const payload = {
      name: document.getElementById("ciclo-name").value.trim(),
      description: document.getElementById("ciclo-desc").value.trim() || null,
      order_index: Number(document.getElementById("ciclo-order").value)
    };
    const { error } = id
      ? await sb.from("cycles").update(payload).eq("id", id)
      : await sb.from("cycles").insert(payload);
    if (error) {
      alert("No se pudo guardar el ciclo: " + error.message);
      return;
    }
    form.reset();
    document.getElementById("ciclo-id").value = "";
    cancelBtn.classList.add("hidden");
    refresh();
  });
  cancelBtn.addEventListener("click", () => {
    form.reset();
    document.getElementById("ciclo-id").value = "";
    cancelBtn.classList.add("hidden");
  });

  await refresh();
}

/* ---------- CRUD: Materias ---------- */

async function loadAdminMaterias() {
  const content = document.getElementById("page-content");
  content.innerHTML = `
    <h1 class="page-title">Materias</h1>
    <form id="materia-form" class="admin-form">
      <input type="hidden" id="materia-id" />
      <label>Ciclo</label>
      <select id="materia-ciclo" required></select>
      <label>Nombre</label>
      <input id="materia-name" required placeholder="Bases de Datos" />
      <label>Descripción</label>
      <input id="materia-desc" placeholder="Opcional" />
      <label>Orden (1-6)</label>
      <input id="materia-order" type="number" min="1" max="6" required />
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">Guardar materia</button>
        <button type="button" id="materia-cancel" class="btn btn-secondary hidden">Cancelar edición</button>
      </div>
    </form>
    <div class="admin-table" id="materias-table"></div>
  `;
  await populateCicloSelect(document.getElementById("materia-ciclo"));

  const form = document.getElementById("materia-form");
  const cancelBtn = document.getElementById("materia-cancel");

  async function refresh() {
    const { data } = await sb.from("subjects").select("*, cycles(name)").order("order_index");
    document.getElementById("materias-table").innerHTML = renderAdminTable(
      ["Ciclo", "Orden", "Nombre", "Acciones"],
      data.map(m => [m.cycles.name, m.order_index, m.name, adminRowActions("materia", m.id)])
    );
    data.forEach(m => {
      const editBtn = document.getElementById(`edit-materia-${m.id}`);
      const delBtn = document.getElementById(`del-materia-${m.id}`);
      if (editBtn) editBtn.addEventListener("click", () => {
        document.getElementById("materia-id").value = m.id;
        document.getElementById("materia-ciclo").value = m.cycle_id;
        document.getElementById("materia-name").value = m.name;
        document.getElementById("materia-desc").value = m.description || "";
        document.getElementById("materia-order").value = m.order_index;
        cancelBtn.classList.remove("hidden");
      });
      if (delBtn) delBtn.addEventListener("click", async () => {
        if (!confirm(`¿Eliminar la materia "${m.name}"? Esto también eliminará sus unidades.`)) return;
        const { error } = await sb.from("subjects").delete().eq("id", m.id);
        if (error) { alert("No se pudo eliminar: " + error.message); return; }
        refresh();
      });
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("materia-id").value;
    const payload = {
      cycle_id: document.getElementById("materia-ciclo").value,
      name: document.getElementById("materia-name").value.trim(),
      description: document.getElementById("materia-desc").value.trim() || null,
      order_index: Number(document.getElementById("materia-order").value)
    };
    const { error } = id
      ? await sb.from("subjects").update(payload).eq("id", id)
      : await sb.from("subjects").insert(payload);
    if (error) {
      alert("No se pudo guardar la materia: " + error.message);
      return;
    }
    form.reset();
    document.getElementById("materia-id").value = "";
    cancelBtn.classList.add("hidden");
    refresh();
  });
  cancelBtn.addEventListener("click", () => {
    form.reset();
    document.getElementById("materia-id").value = "";
    cancelBtn.classList.add("hidden");
  });

  await refresh();
}

/* ---------- CRUD: Unidades ---------- */

async function loadAdminUnidades() {
  const content = document.getElementById("page-content");
  content.innerHTML = `
    <h1 class="page-title">Unidades</h1>
    <form id="unidad-form" class="admin-form">
      <input type="hidden" id="unidad-id" />
      <label>Ciclo</label>
      <select id="unidad-ciclo" required></select>
      <label>Materia</label>
      <select id="unidad-materia" required></select>
      <label>Título</label>
      <input id="unidad-title" required placeholder="Unidad 1: Introducción" />
      <label>Descripción</label>
      <textarea id="unidad-desc" placeholder="Opcional"></textarea>
      <label>Orden (1-10)</label>
      <input id="unidad-order" type="number" min="1" max="10" required />
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">Guardar unidad</button>
        <button type="button" id="unidad-cancel" class="btn btn-secondary hidden">Cancelar edición</button>
      </div>
    </form>
    <div class="admin-table" id="unidades-table"></div>
  `;
  const cicloSel = document.getElementById("unidad-ciclo");
  const materiaSel = document.getElementById("unidad-materia");
  await populateCicloSelect(cicloSel);
  cicloSel.addEventListener("change", () => populateMateriaSelect(materiaSel, cicloSel.value));

  const form = document.getElementById("unidad-form");
  const cancelBtn = document.getElementById("unidad-cancel");

  async function refresh() {
    const { data } = await sb.from("units").select("*, subjects(name, cycles(name))").order("order_index");
    document.getElementById("unidades-table").innerHTML = renderAdminTable(
      ["Ciclo", "Materia", "Orden", "Título", "Acciones"],
      data.map(u => [u.subjects.cycles.name, u.subjects.name, u.order_index, u.title, adminRowActions("unidad", u.id)])
    );
    data.forEach(u => {
      const editBtn = document.getElementById(`edit-unidad-${u.id}`);
      const delBtn = document.getElementById(`del-unidad-${u.id}`);
      if (editBtn) editBtn.addEventListener("click", async () => {
        document.getElementById("unidad-id").value = u.id;
        cicloSel.value = u.subjects.cycle_id || "";
        await populateMateriaSelect(materiaSel, u.subject_id ? cicloSel.value : "");
        materiaSel.value = u.subject_id;
        document.getElementById("unidad-title").value = u.title;
        document.getElementById("unidad-desc").value = u.description || "";
        document.getElementById("unidad-order").value = u.order_index;
        cancelBtn.classList.remove("hidden");
      });
      if (delBtn) delBtn.addEventListener("click", async () => {
        if (!confirm(`¿Eliminar la unidad "${u.title}"? Esto también eliminará sus archivos y videos.`)) return;
        const { error } = await sb.from("units").delete().eq("id", u.id);
        if (error) { alert("No se pudo eliminar: " + error.message); return; }
        refresh();
      });
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("unidad-id").value;
    const payload = {
      subject_id: materiaSel.value,
      title: document.getElementById("unidad-title").value.trim(),
      description: document.getElementById("unidad-desc").value.trim() || null,
      order_index: Number(document.getElementById("unidad-order").value)
    };
    const { error } = id
      ? await sb.from("units").update(payload).eq("id", id)
      : await sb.from("units").insert(payload);
    if (error) {
      alert("No se pudo guardar la unidad: " + error.message);
      return;
    }
    form.reset();
    document.getElementById("unidad-id").value = "";
    cancelBtn.classList.add("hidden");
    refresh();
  });
  cancelBtn.addEventListener("click", () => {
    form.reset();
    document.getElementById("unidad-id").value = "";
    cancelBtn.classList.add("hidden");
  });

  await refresh();
}

/* ---------- Helpers de tabla ---------- */

function renderAdminTable(headers, rows) {
  if (!rows.length) return `<p class="empty-text">Sin registros todavía.</p>`;
  return `
    <table class="data-table">
      <thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>
  `;
}
function adminRowActions(entity, id) {
  return `
    <button id="edit-${entity}-${id}" class="btn btn-small">Editar</button>
    <button id="del-${entity}-${id}" class="btn btn-small btn-danger">Eliminar</button>
  `;
}
