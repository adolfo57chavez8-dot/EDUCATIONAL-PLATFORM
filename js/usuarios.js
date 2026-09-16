/**
 * usuarios.js
 * Panel admin: lista de usuarios registrados (tabla profiles) y su rol.
 */

async function loadAdminUsuarios() {
  const content = document.getElementById("page-content");
  content.innerHTML = `<div class="loading">Cargando usuarios...</div>`;

  const { data: usuarios, error } = await sb
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    content.innerHTML = `<p class="error-text">Error cargando usuarios: ${error.message}</p>`;
    return;
  }

  content.innerHTML = `
    <h1 class="page-title">Usuarios</h1>
    <p class="page-subtitle">${usuarios.length} usuario(s) registrado(s)</p>
    <div class="admin-table">
      ${renderAdminTable(
        ["Correo", "Rol", "Registrado"],
        usuarios.map(u => [
          u.email,
          `<span class="badge ${u.role === "admin" ? "badge-admin" : "badge-student"}">${u.role === "admin" ? "Administrador" : "Estudiante"}</span>`,
          new Date(u.created_at).toLocaleDateString()
        ])
      )}
    </div>
  `;
}
