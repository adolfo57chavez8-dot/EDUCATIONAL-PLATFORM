/**
 * videos.js
 * Renderiza un reproductor real embebido de YouTube (iframe), no solo un enlace.
 */
function renderYouTubePlayer(video) {
  const id = video.youtube_id;
  return `
    <div class="video-card">
      <div class="video-embed-wrapper">
        <iframe
          src="https://www.youtube.com/embed/${id}"
          title="${video.title}"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          loading="lazy">
        </iframe>
      </div>
      <div class="video-meta">
        <h4>${video.title}</h4>
        ${video.description ? `<p>${video.description}</p>` : ""}
      </div>
    </div>
  `;
}

/* =====================================================================
 * ADMIN: gestión de videos de YouTube (crear, previsualizar, eliminar)
 * ===================================================================== */

async function loadAdminVideos() {
  const content = document.getElementById("page-content");
  content.innerHTML = `
    <h1 class="page-title">Videos</h1>
    <form id="video-form" class="admin-form">
      <label>Ciclo</label>
      <select id="video-ciclo" required></select>
      <label>Materia</label>
      <select id="video-materia" required></select>
      <label>Unidad</label>
      <select id="video-unidad" required></select>
      <label>Título</label>
      <input id="video-title" required placeholder="Introducción al tema" />
      <label>URL de YouTube</label>
      <input id="video-url" required placeholder="https://www.youtube.com/watch?v=..." />
      <label>Descripción</label>
      <input id="video-desc" placeholder="Opcional" />
      <div id="video-preview"></div>
      <p id="video-status" class="auth-error"></p>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">Guardar video</button>
      </div>
    </form>
    <div class="admin-table" id="videos-table"></div>
  `;

  const cicloSel = document.getElementById("video-ciclo");
  const materiaSel = document.getElementById("video-materia");
  const unidadSel = document.getElementById("video-unidad");
  await populateCicloSelect(cicloSel);
  cicloSel.addEventListener("change", () => populateMateriaSelect(materiaSel, cicloSel.value));
  materiaSel.addEventListener("change", () => populateUnidadSelect(unidadSel, materiaSel.value));

  const urlInput = document.getElementById("video-url");
  const previewBox = document.getElementById("video-preview");
  urlInput.addEventListener("input", () => {
    const id = window.AppUtils.extractYouTubeId(urlInput.value.trim());
    previewBox.innerHTML = id
      ? `<div class="video-embed-wrapper"><iframe src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe></div>`
      : "";
  });

  async function refresh() {
    const { data } = await sb.from("videos")
      .select("*, units(title, subjects(name, cycles(name)))")
      .order("created_at", { ascending: false });
    document.getElementById("videos-table").innerHTML = renderAdminTable(
      ["Ciclo", "Materia", "Unidad", "Título", "Acciones"],
      data.map(v => [v.units.subjects.cycles.name, v.units.subjects.name, v.units.title, v.title, adminRowActions("video", v.id)])
    );
    data.forEach(v => {
      const editBtn = document.getElementById(`edit-video-${v.id}`);
      if (editBtn) editBtn.style.display = "none";
      const delBtn = document.getElementById(`del-video-${v.id}`);
      if (delBtn) delBtn.addEventListener("click", async () => {
        if (!confirm(`¿Eliminar el video "${v.title}"?`)) return;
        await sb.from("videos").delete().eq("id", v.id);
        refresh();
      });
    });
  }

  document.getElementById("video-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const statusEl = document.getElementById("video-status");
    const youtubeId = window.AppUtils.extractYouTubeId(urlInput.value.trim());
    if (!youtubeId) { statusEl.textContent = "La URL de YouTube no es válida."; return; }
    if (!unidadSel.value) { statusEl.textContent = "Selecciona ciclo, materia y unidad."; return; }

    const { error } = await sb.from("videos").insert({
      unit_id: unidadSel.value,
      title: document.getElementById("video-title").value.trim(),
      youtube_id: youtubeId,
      url: urlInput.value.trim(),
      description: document.getElementById("video-desc").value.trim() || null
    });
    if (error) { statusEl.textContent = "Error: " + error.message; return; }
    statusEl.style.color = "var(--success)";
    statusEl.textContent = "Video guardado ✓";
    document.getElementById("video-form").reset();
    previewBox.innerHTML = "";
    refresh();
  });

  await refresh();
}
