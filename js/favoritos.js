/**
 * favoritos.js
 * Gestión de favoritos (materias, unidades, archivos, videos) y página /favoritos.html
 */

async function isFavorite(itemType, itemId, userId) {
  const { data } = await sb
    .from("favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("item_type", itemType)
    .eq("item_id", itemId)
    .maybeSingle();
  return !!data;
}

async function toggleFavorite(itemType, itemId, userId, btnEl) {
  const already = await isFavorite(itemType, itemId, userId);
  if (already) {
    await sb.from("favorites").delete()
      .eq("user_id", userId).eq("item_type", itemType).eq("item_id", itemId);
    if (btnEl) { btnEl.classList.remove("active"); btnEl.textContent = "☆"; }
  } else {
    await sb.from("favorites").insert({ user_id: userId, item_type: itemType, item_id: itemId });
    if (btnEl) { btnEl.classList.add("active"); btnEl.textContent = "★"; }
  }
}

async function loadFavoritosPage(profile, session) {
  const content = document.getElementById("page-content");
  content.innerHTML = `<div class="loading">Cargando favoritos...</div>`;

  const { data: favs, error } = await sb
    .from("favorites")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    content.innerHTML = `<p class="error-text">Error cargando favoritos.</p>`;
    return;
  }

  if (!favs.length) {
    content.innerHTML = `
      <h1 class="page-title">Favoritos</h1>
      <p class="empty-text">Aún no has marcado elementos como favoritos. Usa el ícono ⭐ en materias, unidades, archivos o videos.</p>
    `;
    return;
  }

  const grouped = { subject: [], unit: [], file: [], video: [] };
  favs.forEach(f => grouped[f.item_type] && grouped[f.item_type].push(f));

  const [subjects, units, files, videos] = await Promise.all([
    grouped.subject.length ? sb.from("subjects").select("id,name").in("id", grouped.subject.map(f => f.item_id)) : { data: [] },
    grouped.unit.length ? sb.from("units").select("id,title,subject_id").in("id", grouped.unit.map(f => f.item_id)) : { data: [] },
    grouped.file.length ? sb.from("files").select("id,name,unit_id").in("id", grouped.file.map(f => f.item_id)) : { data: [] },
    grouped.video.length ? sb.from("videos").select("id,title,unit_id").in("id", grouped.video.map(f => f.item_id)) : { data: [] }
  ]);

  content.innerHTML = `
    <h1 class="page-title">Favoritos</h1>
    ${subjects.data.length ? `<h2 class="section-title">Materias</h2><div class="cards-grid">${
      subjects.data.map(s => `<a href="materia.html?id=${s.id}" class="subject-card">${s.name}</a>`).join("")
    }</div>` : ""}
    ${units.data.length ? `<h2 class="section-title">Unidades</h2><div class="cards-grid">${
      units.data.map(u => `<a href="unidad.html?id=${u.id}" class="unit-card">${u.title}</a>`).join("")
    }</div>` : ""}
    ${files.data.length ? `<h2 class="section-title">Archivos</h2><ul class="recent-list">${
      files.data.map(f => `<li>📄 ${f.name}</li>`).join("")
    }</ul>` : ""}
    ${videos.data.length ? `<h2 class="section-title">Videos</h2><ul class="recent-list">${
      videos.data.map(v => `<li>▶️ ${v.title}</li>`).join("")
    }</ul>` : ""}
  `;
}
