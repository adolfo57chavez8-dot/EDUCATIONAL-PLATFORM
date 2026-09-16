/**
 * supabase.js
 * Inicializa el cliente de Supabase y expone utilidades comunes
 * usadas por el resto de módulos (auth, dashboard, admin, etc).
 *
 * Requiere que config.js se cargue ANTES que este archivo (window.__ENV__)
 * y que la librería supabase-js (CDN) se cargue antes que este archivo.
 */

const { SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_EMAIL, STORAGE_BUCKET } = window.__ENV__;

// Cliente único de Supabase para toda la app.
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

const sb = window.supabaseClient;

/**
 * Devuelve la sesión actual (o null) y el perfil (profiles) asociado.
 * El perfil contiene el campo `role` ('admin' | 'student').
 */
async function getCurrentUser() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return { session: null, profile: null };

  const { data: profile, error } = await sb
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (error) {
    console.error("Error cargando perfil:", error.message);
    return { session, profile: null };
  }
  return { session, profile };
}

/**
 * Protege una página: si no hay sesión, redirige a login.
 * Si requireAdmin=true y el usuario no es admin, redirige a dashboard.
 */
async function requireAuth({ requireAdmin = false } = {}) {
  const { session, profile } = await getCurrentUser();
  if (!session || !profile) {
    window.location.href = "login.html";
    return null;
  }
  if (requireAdmin && profile.role !== "admin") {
    window.location.href = "dashboard.html";
    return null;
  }
  return { session, profile };
}

/** Cierra sesión y vuelve a login. */
async function signOut() {
  await sb.auth.signOut();
  window.location.href = "login.html";
}

/** Construye la ruta de storage: ciclo-X/materiaId/unidad-Y/archivo */
function buildStoragePath(cicloOrden, materiaId, unidadOrden, fileName) {
  const safeName = fileName.replace(/[^\w.\-]+/g, "_");
  return `ciclo-${cicloOrden}/${materiaId}/unidad-${unidadOrden}/${Date.now()}_${safeName}`;
}

/** Devuelve una URL pública/firmada para descargar/mostrar un archivo. */
function getPublicFileUrl(path) {
  const { data } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Extrae el ID de un video de YouTube desde cualquier formato de URL común. */
function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

window.AppAuth = { getCurrentUser, requireAuth, signOut };
window.AppStorage = { buildStoragePath, getPublicFileUrl, STORAGE_BUCKET };
window.AppUtils = { extractYouTubeId };
