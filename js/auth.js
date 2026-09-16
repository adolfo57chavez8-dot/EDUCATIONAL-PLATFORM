/**
 * auth.js
 * Autenticación mediante Supabase Auth con OTP (código) por correo.
 * No se guardan contraseñas ni códigos en tablas propias: todo lo maneja
 * Supabase Auth de forma segura.
 */

const sbc = () => window.supabaseClient;

/** Paso 1: solicitar código de acceso al correo (login y registro usan el mismo flujo). */
async function requestAccessCode(email) {
  const { error } = await sbc().auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true }
  });
  if (error) throw error;
  sessionStorage.setItem("pending_email", email);
}

/** Paso 2: verificar el código de 6 dígitos que llegó al correo. */
async function verifyAccessCode(email, token) {
  const { data, error } = await sbc().auth.verifyOtp({
    email,
    token,
    type: "email"
  });
  if (error) throw error;

  // Asegura que exista un profile para este usuario (rol student por defecto,
  // admin si el correo coincide con ADMIN_EMAIL). El trigger SQL también lo
  // hace automáticamente; esto es una salvaguarda adicional en cliente.
  const userId = data.user.id;
  const role = email.toLowerCase() === window.__ENV__.ADMIN_EMAIL.toLowerCase() ? "admin" : "student";

  await sbc().from("profiles").upsert({
    id: userId,
    email,
    role
  }, { onConflict: "id" });

  return data;
}

function bindAuthForms() {
  const requestForm = document.getElementById("request-code-form");
  if (requestForm) {
    requestForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email-input").value.trim();
      const btn = requestForm.querySelector("button[type=submit]");
      const errorEl = document.getElementById("auth-error");
      errorEl.textContent = "";
      btn.disabled = true;
      btn.textContent = "Enviando código...";
      try {
        await requestAccessCode(email);
        window.location.href = "verify.html";
      } catch (err) {
        errorEl.textContent = "No se pudo enviar el código: " + err.message;
        btn.disabled = false;
        btn.textContent = "Enviar código";
      }
    });
  }

  const verifyForm = document.getElementById("verify-code-form");
  if (verifyForm) {
    const email = sessionStorage.getItem("pending_email");
    const emailLabel = document.getElementById("pending-email-label");
    if (!email) {
      window.location.href = "login.html";
      return;
    }
    if (emailLabel) emailLabel.textContent = email;

    verifyForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const token = document.getElementById("code-input").value.trim();
      const btn = verifyForm.querySelector("button[type=submit]");
      const errorEl = document.getElementById("auth-error");
      errorEl.textContent = "";
      btn.disabled = true;
      btn.textContent = "Verificando...";
      try {
        await verifyAccessCode(email, token);
        sessionStorage.removeItem("pending_email");
        window.location.href = "dashboard.html";
      } catch (err) {
        errorEl.textContent = "Código incorrecto o expirado: " + err.message;
        btn.disabled = false;
        btn.textContent = "Verificar código";
      }
    });

    const resendBtn = document.getElementById("resend-code-btn");
    if (resendBtn) {
      resendBtn.addEventListener("click", async () => {
        try {
          await requestAccessCode(email);
          resendBtn.textContent = "Código reenviado ✓";
          setTimeout(() => (resendBtn.textContent = "Reenviar código"), 3000);
        } catch (err) {
          alert("No se pudo reenviar: " + err.message);
        }
      });
    }
  }
}

document.addEventListener("DOMContentLoaded", bindAuthForms);
