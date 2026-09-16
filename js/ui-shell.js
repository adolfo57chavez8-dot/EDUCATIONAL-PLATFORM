/**
 * ui-shell.js
 * Genera el layout compartido (sidebar de escritorio + menú inferior móvil
 * + barra superior con buscador y perfil) para todas las páginas del área
 * de estudio. También gestiona el modo oscuro.
 */

function renderShell({ profile, activeLink = "" } = {}) {
  const appName = window.__ENV__.APP_NAME;
  const isAdmin = profile && profile.role === "admin";

  const links = [
    { href: "dashboard.html", label: "Inicio", icon: "home", key: "dashboard" },
    { href: "favoritos.html", label: "Favoritos", icon: "star", key: "favoritos" },
    { href: "perfil.html", label: "Perfil", icon: "user", key: "perfil" }
  ];
  if (isAdmin) links.push({ href: "admin.html", label: "Panel admin", icon: "shield", key: "admin" });

  const icons = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    star: '<polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
    shield: '<path d="M12 2 4 5v6c0 5 3.4 8.7 8 11 4.6-2.3 8-6 8-11V5l-8-3z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>'
  };

  const svg = (name, cls = "icon") =>
    `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;

  const sidebarLinks = links.map(l => `
    <a href="${l.href}" class="nav-link ${activeLink === l.key ? "active" : ""}">
      ${svg(l.icon)}<span>${l.label}</span>
    </a>`).join("");

  const mobileLinks = links.map(l => `
    <a href="${l.href}" class="mobile-link ${activeLink === l.key ? "active" : ""}">
      ${svg(l.icon)}<span>${l.label}</span>
    </a>`).join("");

  document.getElementById("app-shell").innerHTML = `
    <aside class="sidebar">
      <div class="brand">
        <img src="assets/logo.svg" alt="${appName}" class="brand-logo" />
        <span class="brand-name">${appName}</span>
      </div>
      <nav class="sidebar-nav">${sidebarLinks}</nav>
      <button id="theme-toggle" class="nav-link theme-toggle-btn">${svg("moon")}<span>Modo oscuro</span></button>
      <button id="logout-btn" class="nav-link logout-btn">${svg("logout")}<span>Cerrar sesión</span></button>
    </aside>

    <div class="main-area">
      <header class="topbar">
        <div class="search-box">
          ${svg("search")}
          <input id="global-search" type="text" placeholder="Buscar ciclos, materias, unidades, archivos..." />
        </div>
        <div id="search-results" class="search-results hidden"></div>
        <div class="topbar-profile">
          <span class="profile-email">${profile ? profile.email : ""}</span>
          <div class="avatar">${profile ? profile.email.charAt(0).toUpperCase() : "?"}</div>
        </div>
      </header>
      <main class="page-content" id="page-content"></main>
    </div>

    <nav class="mobile-nav">${mobileLinks}</nav>
  `;

  document.getElementById("logout-btn").addEventListener("click", () => window.AppAuth.signOut());
  document.getElementById("theme-toggle").addEventListener("click", toggleDarkMode);
  initDarkMode();

  if (window.initGlobalSearch) window.initGlobalSearch();
}

function initDarkMode() {
  const saved = localStorage.getItem("theme");
  if (saved === "dark") document.documentElement.classList.add("dark");
}
function toggleDarkMode() {
  document.documentElement.classList.toggle("dark");
  localStorage.setItem("theme", document.documentElement.classList.contains("dark") ? "dark" : "light");
}

window.renderShell = renderShell;
