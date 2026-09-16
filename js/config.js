/**
 * config.js
 * Configuración central de la plataforma.
 *
 * IMPORTANTE — VARIABLES DE ENTORNO
 * ----------------------------------
 * Este archivo lee las claves públicas de Supabase desde variables de entorno
 * inyectadas en tiempo de build por Vercel (ver vercel.json y README.md).
 *
 * En Vercel, ve a: Project → Settings → Environment Variables y crea:
 *
 *   SUPABASE_URL              -> URL de tu proyecto Supabase (pública)
 *   SUPABASE_ANON_KEY         -> anon/public key de Supabase (pública, protegida por RLS)
 *   ADMIN_EMAIL                -> adolfo57chavez8@gmail.com
 *
 * NUNCA coloques SUPABASE_SERVICE_ROLE_KEY en ningún archivo de /js o /css.
 * Esa clave NUNCA debe llegar al navegador.
 *
 * Como este proyecto es HTML/CSS/JS estático (sin backend Node), Vercel no
 * puede "inyectar" variables de entorno dentro de un .js estático en build
 * time por sí solo. Por eso este archivo expone un objeto __ENV__ con
 * valores por defecto de DESARROLLO que DEBES reemplazar antes de
 * desplegar, o (recomendado) generar este archivo automáticamente en el
 * build de Vercel. El README explica ambas opciones paso a paso.
 */

window.__ENV__ = {
  // Reemplaza estos 2 valores con los de tu proyecto Supabase
  // (Project Settings → API → Project URL / anon public key).
  SUPABASE_URL: "https://eggsjegogqdrwhsuhlbu.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZ3NqZWdvZ3Fkcndoc3VobGJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1MTg0NDQsImV4cCI6MjEwNTA5NDQ0NH0.7nvhCElSbTBHQOEStwkg-wzuR8sA_wsg-OBKZHq9hsk",

  // Correo del único administrador de la plataforma.
  ADMIN_EMAIL: "adolfo57chavez8@gmail.com",

  // Nombre de la plataforma (puedes cambiarlo libremente).
  APP_NAME: "NexoAcadémico",

  // Bucket de Supabase Storage donde se guardan los archivos académicos.
  STORAGE_BUCKET: "academic-files",

  // Cantidad fija de ciclos y materias por ciclo (regla de negocio fija).
  TOTAL_CICLOS: 6,
  MATERIAS_POR_CICLO: 6,
  UNIDADES_MAX_POR_MATERIA: 10
};
