/**
 * ciclos.js
 * Lógica para dashboard.html (lista de 6 ciclos) y ciclo.html (materias de un ciclo).
 */

async function loadDashboard(profile) {
  const content = document.getElementById("page-content");
  content.innerHTML = `<div class="loading">Cargando ciclos...</div>`;

  const { data: ciclos, error } = await sb.from("cycles").select("*").order("order_index");
  if (error) {
    content.innerHTML = `<p class="error-text">Error cargando ciclos: ${error.message}</p>`;
    return;
  }

  const { data: recientes } = await sb
    .from("files")
    .select("id,name,unit_id,created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  content.innerHTML = `
    <h1 class="page-title">Hola, ${profile.email.split("@")[0]} 👋</h1>
    <p class="page-subtitle">Elige un ciclo para comenzar a estudiar.</p>

    <div class="cards-grid">
      ${ciclos.map(c => `
        <a href="ciclo.html?id=${c.id}" class="cycle-card">
          <div class="cycle-icon">${c.order_index}</div>
          <div class="cycle-info">
            <h3>${c.name}</h3>
            <p>${c.description || "6 materias"}</p>
          </div>
        </a>
      `).join("")}
    </div>

    ${recientes && recientes.length ? `
      <h2 class="section-title">Recientes</h2>
      <ul class="recent-list">
        ${recientes.map(f => `<li>📄 ${f.name}</li>`).join("")}
      </ul>` : ""}
  `;
}

async function loadCicloPage(profile) {
  const params = new URLSearchParams(window.location.search);
  const cicloId = params.get("id");
  const content = document.getElementById("page-content");

  if (!cicloId) {
    content.innerHTML = `<p class="error-text">Ciclo no especificado.</p>`;
    return;
  }

  const { data: ciclo, error: cicloErr } = await sb.from("cycles").select("*").eq("id", cicloId).single();
  const { data: materias, error: matErr } = await sb
    .from("subjects")
    .select("*")
    .eq("cycle_id", cicloId)
    .order("order_index");

  if (cicloErr || matErr) {
    content.innerHTML = `<p class="error-text">Error cargando el ciclo.</p>`;
    return;
  }

  content.innerHTML = `
    <nav class="breadcrumb"><a href="dashboard.html">Inicio</a> / ${ciclo.name}</nav>
    <h1 class="page-title">${ciclo.name}</h1>
    <p class="page-subtitle">${ciclo.description || ""}</p>

    <div class="cards-grid">
      ${materias.map(m => `
        <a href="materia.html?id=${m.id}" class="subject-card">
          <h3>${m.name}</h3>
          <p>${m.description || "Ver unidades"}</p>
        </a>
      `).join("") || `<p class="empty-text">Este ciclo aún no tiene materias configuradas.</p>`}
    </div>
  `;
}
