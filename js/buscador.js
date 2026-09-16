/**
 * buscador.js
 * Buscador global: ciclos, materias, unidades, archivos y videos.
 * Se activa desde la barra superior (ver ui-shell.js).
 */

function initGlobalSearch() {
  const input = document.getElementById("global-search");
  const resultsBox = document.getElementById("search-results");
  if (!input) return;

  let debounceTimer;
  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    const term = input.value.trim();
    if (term.length < 2) {
      resultsBox.classList.add("hidden");
      return;
    }
    debounceTimer = setTimeout(() => runGlobalSearch(term, resultsBox), 300);
  });

  document.addEventListener("click", (e) => {
    if (!resultsBox.contains(e.target) && e.target !== input) {
      resultsBox.classList.add("hidden");
    }
  });
}

async function runGlobalSearch(term, resultsBox) {
  const like = `%${term}%`;

  const [cycles, subjects, units, files, videos] = await Promise.all([
    sb.from("cycles").select("id,name").ilike("name", like).limit(5),
    sb.from("subjects").select("id,name").ilike("name", like).limit(5),
    sb.from("units").select("id,title").or(`title.ilike.${like},description.ilike.${like}`).limit(5),
    sb.from("files").select("id,name,unit_id").ilike("name", like).limit(5),
    sb.from("videos").select("id,title,unit_id").ilike("title", like).limit(5)
  ]);

  const sections = [
    { label: "Materias", items: subjects.data, link: id => `materia.html?id=${id}` },
    { label: "Unidades", items: units.data, link: id => `unidad.html?id=${id}`, textKey: "title" },
    { label: "Archivos", items: files.data, link: (id, r) => `unidad.html?id=${r.unit_id}` },
    { label: "Videos", items: videos.data, link: (id, r) => `unidad.html?id=${r.unit_id}`, textKey: "title" }
  ];

  const cycleHtml = cycles.data && cycles.data.length ? `
    <div class="search-section">
      <p class="search-section-title">Ciclos</p>
      ${cycles.data.map(c => `<a href="ciclo.html?id=${c.id}" class="search-result-item">${c.name}</a>`).join("")}
    </div>` : "";

  const otherHtml = sections.map(s => {
    if (!s.items || !s.items.length) return "";
    return `
      <div class="search-section">
        <p class="search-section-title">${s.label}</p>
        ${s.items.map(r => `<a href="${s.link(r.id, r)}" class="search-result-item">${r[s.textKey || "name"]}</a>`).join("")}
      </div>`;
  }).join("");

  const hasResults = cycleHtml || otherHtml;
  resultsBox.innerHTML = hasResults ? (cycleHtml + otherHtml) : `<p class="empty-text">Sin resultados para "${term}"</p>`;
  resultsBox.classList.remove("hidden");
}

window.initGlobalSearch = initGlobalSearch;
