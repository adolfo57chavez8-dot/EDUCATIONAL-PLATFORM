# NexoAcadémico

Plataforma privada de estudio académico organizada en **6 ciclos → 6 materias → hasta 10 unidades**, con archivos (PDF, Word, Excel, PowerPoint, imágenes, ZIP, etc.), videos de YouTube embebidos, buscador global, favoritos, modo oscuro y un panel administrativo completo.

- **Frontend:** HTML5 + CSS3 + JavaScript (sin frameworks, sin build step).
- **Backend:** Supabase (PostgreSQL + Auth + Storage).
- **Hosting:** Vercel (sitio estático).

No usa Firebase, no usa Node.js para servir archivos, no usa Firebase Storage.

---

## 0. Si vienes de una versión anterior: qué corregir en Supabase

Si ya tenías el proyecto desplegado y no podías **editar ciclos/materias/unidades**
ni **subir archivos** desde `/admin`, casi siempre es por las políticas RLS.
Vuelve a correr el `database.sql` que viene con esta entrega (Supabase → SQL Editor
→ pega el archivo completo → Run). Es seguro volver a correrlo, no duplica datos.
Soluciona:

- Políticas de escritura (`insert/update/delete`) para admin en `cycles`,
  `subjects`, `units`, `files`, `videos` — si faltaban o estaban mal escritas,
  Supabase simplemente rechazaba el guardado sin que el panel te avisara.
- El bucket `academic-files` y sus políticas de Storage (lectura pública,
  escritura solo admin) — sin esto, la subida de archivos falla siempre.
- Los formularios de Ciclos/Materias/Unidades ahora sí muestran una alerta
  con el mensaje de error real de Supabase si algo falla al guardar (antes
  fallaban en silencio).

### Los códigos de acceso no llegan al correo

Esto casi siempre es una de estas dos causas, no un error del código:

1. **La plantilla de correo de Supabase envía un enlace, no un código.**
   Ve a Supabase → **Authentication → Email Templates → Magic Link** y
   asegúrate de que el cuerpo del correo use `{{ .Token }}` (el código de
   6 dígitos) en vez de solo `{{ .ConfirmationURL }}`. Puedes usar algo así:
   ```
   Tu código de acceso a NexoAcadémico es: {{ .Token }}
   ```
2. **El correo del proveedor gratuito de Supabase cae en spam o se agota
   el límite de envíos** (el SMTP incluido de Supabase es solo para pruebas
   y limita a pocos correos por hora). Para producción, configura tu propio
   SMTP en **Authentication → Settings → SMTP Settings** (por ejemplo Resend,
   Brevo o SendGrid, todos tienen plan gratuito). Revisa también la carpeta
   de spam mientras tanto.

Cada vez que un usuario pide iniciar sesión, Supabase invalida el código
anterior y genera uno nuevo automáticamente — eso ya funciona así en el
código (`requestAccessCode` en `js/auth.js`), no requiere ningún cambio.

### Sobre quién es administrador

Solo `adolfo57chavez8@gmail.com` recibe el rol `admin` (lo asigna un trigger
en `database.sql` al momento de registrarse, y además hay un backfill para
usuarios ya existentes). Con esa cuenta entras tanto al panel `/admin` como
al área normal de estudio — puedes navegar, marcar favoritos y también subir
archivos, exactamente igual que cualquier estudiante, además de administrar.
Cualquier otro correo que se registre queda como `student` automáticamente
y nunca ve el enlace "Panel admin" ni puede escribir en la base de datos
(las políticas RLS lo bloquean aunque intente llamar a la API directamente).

---

## 1. Estructura del proyecto

```
/
├── index.html, login.html, register.html, verify.html
├── dashboard.html, ciclo.html, materia.html, unidad.html
├── favoritos.html, perfil.html, 404.html
├── admin.html, admin-ciclos.html, admin-materias.html,
│   admin-unidades.html, admin-archivos.html, admin-videos.html,
│   admin-usuarios.html
├── css/    (global, auth, dashboard, admin, responsive, dark-mode)
├── js/     (config, supabase, auth, ui-shell, ciclos, materias,
│            unidades, favoritos, videos, admin, usuarios, buscador,
│            pdf-viewer)
├── assets/ (logo.svg, logo-dark.svg, favicon.svg)
├── vercel.json
└── .gitignore
```

`database.sql` se entrega **por separado** (no va dentro del ZIP del sitio).

---

## 2. Crear el proyecto en Supabase

1. Ve a https://supabase.com → **New project**.
2. Elige nombre, contraseña de base de datos y región. Espera a que se aprovisione.
3. Ve a **Project Settings → API** y copia:
   - `Project URL` → será tu `SUPABASE_URL`
   - `anon public key` → será tu `SUPABASE_ANON_KEY`

   ⚠️ **Nunca copies ni uses la `service_role key` en el frontend.** Esa clave se queda solo en el backend/administración de Supabase.

---

## 3. Ejecutar `database.sql`

1. En el panel de Supabase ve a **SQL Editor → New query**.
2. Pega el contenido completo de `database.sql` (el archivo que se entrega aparte).
3. Ejecuta (`Run`). Esto crea las tablas, RLS, triggers, el bucket `academic-files` y los 6 ciclos con sus materias iniciales.

---

## 4. Storage

El script ya crea el bucket `academic-files` como público (los archivos quedan detrás del login de la aplicación; el bucket público solo permite lectura directa del archivo mediante su URL, no lista el contenido). Verifícalo en **Storage** → debe aparecer el bucket `academic-files`.

---

## 5. Configurar autenticación por código (OTP)

1. Ve a **Authentication → Providers → Email**.
2. Activa **Email OTP** (o dependiendo de la versión del dashboard, la opción "Enable email provider" con "Confirm email" y el flujo OTP ya viene integrado con `signInWithOtp`).
3. En **Authentication → Email Templates → Magic Link / OTP**, puedes personalizar el correo que reciben los usuarios con su código de 6 dígitos.
4. En **Authentication → Settings**, configura el **Site URL** con el dominio que usarás en Vercel (por ejemplo `https://tu-proyecto.vercel.app`).

---

## 6. Crear el usuario administrador

1. Despliega o corre el proyecto localmente (paso 8-9).
2. Entra a `register.html` y regístrate con el correo: `adolfo57chavez8@gmail.com`.
3. Revisa el correo, copia el código de 6 dígitos y verifícalo en `verify.html`.
4. El trigger `handle_new_user` de `database.sql` le asignará automáticamente el rol `admin` porque coincide con el correo configurado en el propio script SQL.
5. Verifica en **Table Editor → profiles** que ese usuario tenga `role = admin`.

Los demás usuarios que se registren quedarán automáticamente como `role = student`.

---

## 7. Variables de entorno / configuración de claves

Este proyecto es un sitio **estático** (sin servidor Node), por lo que las variables de entorno de Vercel no se inyectan automáticamente dentro de un archivo `.js` estático. Tienes dos opciones:

### Opción A (rápida): editar `js/config.js` directamente
Abre `js/config.js` y reemplaza:

```js
SUPABASE_URL: "REPLACE_WITH_SUPABASE_URL",
SUPABASE_ANON_KEY: "REPLACE_WITH_SUPABASE_ANON_KEY",
```

con los valores reales del paso 2. La `anon key` es pública por diseño (está protegida por RLS), por lo que es seguro incluirla en el frontend.

### Opción B (recomendada): generar `config.js` en el build de Vercel
1. En Vercel, ve a **Project → Settings → Environment Variables** y crea:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `ADMIN_EMAIL` (opcional, ya viene fijo como `adolfo57chavez8@gmail.com`)
2. Cambia el **Build Command** del proyecto en Vercel a un pequeño script que genere `js/config.js` a partir de esas variables antes de servir el sitio, por ejemplo:
   ```
   echo "window.__ENV__={SUPABASE_URL:'$SUPABASE_URL',SUPABASE_ANON_KEY:'$SUPABASE_ANON_KEY',ADMIN_EMAIL:'$ADMIN_EMAIL',APP_NAME:'NexoAcadémico',STORAGE_BUCKET:'academic-files',TOTAL_CICLOS:6,MATERIAS_POR_CICLO:6,UNIDADES_MAX_POR_MATERIA:10};" > js/config.js
   ```
3. Deja el **Output Directory** como la raíz del proyecto.

Nunca coloques `SUPABASE_SERVICE_ROLE_KEY` en ninguna de las dos opciones: esa clave no la necesita el frontend.

Sobre `USER_ACCESS_PASSWORD` / `ADMIN_ACCESS_PASSWORD`: este proyecto usa **Supabase Auth con roles** (columna `role` en `profiles`) en lugar de contraseñas fijas embebidas en el código, que es la opción segura recomendada. El acceso es por código enviado al correo (OTP), y el panel `/admin` se protege verificando `role = 'admin'` tanto en el cliente (`requireAuth({ requireAdmin: true })`) como en la base de datos (políticas RLS), que es lo que de verdad impide el acceso no autorizado.

---

## 8. Subir el proyecto a GitHub

```bash
git init
git add .
git commit -m "Plataforma NexoAcadémico"
git branch -M main
git remote add origin https://github.com/tu-usuario/tu-repo.git
git push -u origin main
```

---

## 9. Conectar GitHub con Vercel

1. En https://vercel.com → **Add New → Project**.
2. Importa el repositorio de GitHub.
3. Framework Preset: **Other** (sitio estático). No hace falta build command si usaste la Opción A del paso 7.
4. Si usaste la Opción B, configura el Build Command indicado ahí y agrega las variables de entorno.
5. **Deploy**.

---

## 10. Probar el login

1. Abre la URL de Vercel.
2. Ve a **Iniciar sesión**, escribe tu correo, revisa el código y verifícalo.
3. Deberías caer en `dashboard.html` con los 6 ciclos visibles.

## 11. Probar el administrador

1. Inicia sesión con `adolfo57chavez8@gmail.com`.
2. En el sidebar aparecerá el enlace **Panel admin**.
3. Entra a `/admin.html` y revisa el dashboard con las estadísticas.

## 12. Subir el primer PDF

1. En el panel admin ve a **Archivos**.
2. Selecciona Ciclo → Materia → Unidad (créala primero en **Unidades** si no existe).
3. Sube el PDF y confirma que aparece en `unidad.html` con el visor embebido.

## 13. Agregar el primer video de YouTube

1. En el panel admin ve a **Videos**.
2. Selecciona Ciclo → Materia → Unidad, pega la URL de YouTube (se mostrará una vista previa automática) y guarda.
3. Verifica que se reproduce dentro de la unidad correspondiente.

---

## Notas de seguridad

- Las políticas RLS impiden que un estudiante cree, edite o elimine ciclos, materias, unidades, archivos o videos — solo puede leer y gestionar sus propios favoritos.
- El bucket de Storage solo permite subir/editar/eliminar archivos a usuarios con `role = admin` (validado en la base de datos, no solo en el frontend).
- Nunca se guardan contraseñas: el acceso es 100% por código temporal enviado al correo (Supabase Auth OTP).
