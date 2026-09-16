/**
 * materias.js
 * Lógica para materia.html: lista las unidades (hasta 10) de una materia.
 */

async function loadMateriaPage(profile) {
  const params = new URLSearchParams(window.location.search);
  const materiaId = params.get("id");
  const content = document.getElementById("page-content");

  if (!materiaId) {
    content.innerHTML = `<p class="error-text">Materia no especificada.</p>`;
    return;
  }

  const { data: materia, error: mErr } = await sb
    .from("subjects")
    .select("*, cycles(id,name)")
    .eq("id", materiaId)
    .single();

  const { data: unidades, error: uErr } = await sb
    .from("units")
    .select("*")
    .eq("subject_id", materiaId)
    .order("order_index");

  if (mErr || uErr) {
    content.innerHTML = `<p class="error-text">Error cargando la materia.</p>`;
    return;
  }

  content.innerHTML = `
    <nav class="breadcrumb">
      <a href="dashboard.html">Inicio</a> /
      <a href="ciclo.html?id=${materia.cycles.id}">${materia.cycles.name}</a> /
      ${materia.name}
    </nav>
    <h1 class="page-title">${materia.name}</h1>
    <p class="page-subtitle">${materia.description || ""}</p>

    <div class="cards-grid">
      ${unidades.map(u => `
        <a href="unidad.html?id=${u.id}" class="unit-card">
          <div class="unit-badge">U${u.order_index}</div>
          <h3>${u.title}</h3>
          <p>${u.description || ""}</p>
        </a>
      `).join("") || `<p class="empty-text">Esta materia aún no tiene unidades.</p>`}
    </div>
  `;
}
