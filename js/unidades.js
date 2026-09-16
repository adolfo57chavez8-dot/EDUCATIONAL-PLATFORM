/**
 * unidades.js
 * Lógica para unidad.html: muestra archivos (con visor PDF embebido),
 * videos de YouTube (reproductor real) y otros archivos descargables.
 */

const FILE_ICONS = {
  pdf: "📕", doc: "📘", docx: "📘", xls: "📗", xlsx: "📗",
  ppt: "📙", pptx: "📙", zip: "🗜️", rar: "🗜️", txt: "📄",
  jpg: "🖼️", jpeg: "🖼️", png: "🖼️", webp: "🖼️",
  mp4: "🎬", webm: "🎬", mov: "🎬", mkv: "🎬",
  mp3: "🎵", wav: "🎵"
};

function fileExt(name) {
  return (name.split(".").pop() || "").toLowerCase();
}
function fileIcon(name) {
  return FILE_ICONS[fileExt(name)] || "📎";
}
function isPdf(name) {
  return fileExt(name) === "pdf";
}
function formatBytes(bytes) {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0, n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(1)} ${units[i]}`;
}

async function loadUnidadPage(profile, session) {
  const params = new URLSearchParams(window.location.search);
  const unidadId = params.get("id");
  const content = document.getElementById("page-content");

  if (!unidadId) {
    content.innerHTML = `<p class="error-text">Unidad no especificada.</p>`;
    return;
  }

  const { data: unidad, error: uErr } = await sb
    .from("units")
    .select("*, subjects(id,name,cycle_id,cycles(id,name))")
    .eq("id", unidadId)
    .single();

  if (uErr) {
    content.innerHTML = `<p class="error-text">Error cargando la unidad.</p>`;
    return;
  }

  const [{ data: archivos }, { data: videos }] = await Promise.all([
    sb.from("files").select("*").eq("unit_id", unidadId).order("created_at"),
    sb.from("videos").select("*").eq("unit_id", unidadId).order("created_at")
  ]);

  const materia = unidad.subjects;
  const ciclo = materia.cycles;

  content.innerHTML = `
    <nav class="breadcrumb">
      <a href="dashboard.html">Inicio</a> /
      <a href="ciclo.html?id=${ciclo.id}">${ciclo.name}</a> /
      <a href="materia.html?id=${materia.id}">${materia.name}</a> /
      ${unidad.title}
    </nav>
    <div class="unit-header">
      <h1 class="page-title">${unidad.title}</h1>
      <button id="fav-unit-btn" class="fav-btn">☆</button>
    </div>
    <p class="page-subtitle">${unidad.description || ""}</p>

    ${videos && videos.length ? `
      <h2 class="section-title">Videos</h2>
      <div class="video-grid">
        ${videos.map(v => renderYouTubePlayer(v)).join("")}
      </div>` : ""}

    <h2 class="section-title">Archivos</h2>
    <div class="files-list" id="files-list">
      ${archivos && archivos.length ? archivos.map(f => renderFileEntry(f)).join("") : `<p class="empty-text">Esta unidad aún no tiene archivos.</p>`}
    </div>
  `;

  const favBtn = document.getElementById("fav-unit-btn");
  isFavorite("unit", unidadId, session.user.id).then(fav => {
    if (fav) { favBtn.classList.add("active"); favBtn.textContent = "★"; }
  });
  favBtn.addEventListener("click", () => toggleFavorite("unit", unidadId, session.user.id, favBtn));
}

function renderFileEntry(file) {
  const url = window.AppStorage.getPublicFileUrl(file.storage_path);
  if (isPdf(file.name)) {
    return `<div class="file-entry file-entry-pdf">${renderPdfViewer(url, file.name)}</div>`;
  }
  return `
    <div class="file-entry">
      <div class="file-info">
        <span class="file-icon">${fileIcon(file.name)}</span>
        <div>
          <p class="file-name">${file.name}</p>
          <p class="file-meta">${formatBytes(file.size)} · ${new Date(file.created_at).toLocaleDateString()}</p>
        </div>
      </div>
      <a class="btn btn-small btn-primary" href="${url}" download="${file.name}">Descargar</a>
    </div>
  `;
}

/* =====================================================================
 * ADMIN: gestión de archivos (subida, edición, eliminación)
 * Se añade aquí (en lugar de archivos.js) para reutilizar fileIcon(),
 * formatBytes() e isPdf() ya definidos arriba.
 * ===================================================================== */

async function loadAdminArchivos() {
  const content = document.getElementById("page-content");
  content.innerHTML = `
    <h1 class="page-title">Archivos</h1>
    <form id="archivo-form" class="admin-form">
      <label>Ciclo</label>
      <select id="archivo-ciclo" required></select>
      <label>Materia</label>
      <select id="archivo-materia" required></select>
      <label>Unidad</label>
      <select id="archivo-unidad" required></select>
      <label>Nombre para mostrar (opcional)</label>
      <input id="archivo-nombre" placeholder="Se usará el nombre del archivo si se deja vacío" />
      <label>Descripción</label>
      <input id="archivo-desc" placeholder="Opcional" />
      <label>Archivo</label>
      <input id="archivo-file" type="file" required />
      <div class="progress-bar hidden" id="upload-progress"><div class="progress-fill" id="upload-progress-fill"></div></div>
      <p id="upload-status" class="auth-error"></p>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">Subir archivo</button>
      </div>
    </form>
    <div class="admin-table" id="archivos-table"></div>
  `;

  const cicloSel = document.getElementById("archivo-ciclo");
  const materiaSel = document.getElementById("archivo-materia");
  const unidadSel = document.getElementById("archivo-unidad");
  await populateCicloSelect(cicloSel);
  cicloSel.addEventListener("change", () => populateMateriaSelect(materiaSel, cicloSel.value));
  materiaSel.addEventListener("change", () => populateUnidadSelect(unidadSel, materiaSel.value));

  async function refresh() {
    const { data } = await sb.from("files")
      .select("*, units(title, subjects(name, cycles(name)))")
      .order("created_at", { ascending: false });
    document.getElementById("archivos-table").innerHTML = renderAdminTable(
      ["Ciclo", "Materia", "Unidad", "Archivo", "Tamaño", "Acciones"],
      data.map(f => [
        f.units.subjects.cycles.name, f.units.subjects.name, f.units.title,
        `${fileIcon(f.name)} ${f.name}`, formatBytes(f.size), adminRowActions("archivo", f.id)
      ])
    );
    data.forEach(f => {
      const delBtn = document.getElementById(`del-archivo-${f.id}`);
      const editBtn = document.getElementById(`edit-archivo-${f.id}`);
      if (editBtn) editBtn.style.display = "none"; // renombrar rápido vía prompt
      if (delBtn) delBtn.addEventListener("click", async () => {
        if (!confirm(`¿Eliminar "${f.name}"? Esta acción no se puede deshacer.`)) return;
        await sb.storage.from(window.AppStorage.STORAGE_BUCKET).remove([f.storage_path]);
        await sb.from("files").delete().eq("id", f.id);
        refresh();
      });
    });
  }

  document.getElementById("archivo-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const unidadId = unidadSel.value;
    const cicloOrdenOpt = cicloSel.options[cicloSel.selectedIndex];
    const fileInput = document.getElementById("archivo-file");
    const file = fileInput.files[0];
    const statusEl = document.getElementById("upload-status");
    const progressWrap = document.getElementById("upload-progress");
    const progressFill = document.getElementById("upload-progress-fill");

    if (!unidadId || !file) { statusEl.textContent = "Completa ciclo, materia, unidad y archivo."; return; }

    statusEl.textContent = "";
    progressWrap.classList.remove("hidden");
    progressFill.style.width = "10%";

    const { data: unidadRow } = await sb.from("units").select("order_index").eq("id", unidadId).single();
    const path = window.AppStorage.buildStoragePath(cicloOrdenOpt.text, materiaSel.value, unidadRow.order_index, file.name);

    progressFill.style.width = "40%";
    const { error: upErr } = await sb.storage.from(window.AppStorage.STORAGE_BUCKET).upload(path, file);
    if (upErr) {
      statusEl.textContent = "Error al subir: " + upErr.message;
      progressWrap.classList.add("hidden");
      return;
    }
    progressFill.style.width = "80%";

    const displayName = document.getElementById("archivo-nombre").value.trim() || file.name;
    const { error: dbErr } = await sb.from("files").insert({
      unit_id: unidadId,
      name: displayName,
      description: document.getElementById("archivo-desc").value.trim() || null,
      storage_path: path,
      type: file.type || fileExt(file.name),
      size: file.size
    });

    progressFill.style.width = "100%";
    if (dbErr) {
      statusEl.textContent = "Archivo subido, pero hubo un error al guardarlo en la base de datos: " + dbErr.message;
    } else {
      statusEl.style.color = "var(--success)";
      statusEl.textContent = "Archivo subido correctamente ✓";
      document.getElementById("archivo-form").reset();
    }
    setTimeout(() => progressWrap.classList.add("hidden"), 800);
    refresh();
  });

  await refresh();
}
