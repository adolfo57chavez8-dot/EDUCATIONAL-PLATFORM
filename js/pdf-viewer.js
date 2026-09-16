/**
 * pdf-viewer.js
 * Visor de PDF embebido (usa el visor nativo del navegador vía <iframe>,
 * que soporta zoom, navegación de páginas y pantalla completa sin
 * dependencias externas).
 */
function renderPdfViewer(url, fileName) {
  return `
    <div class="pdf-viewer">
      <div class="pdf-toolbar">
        <span class="pdf-filename">📄 ${fileName}</span>
        <div class="pdf-actions">
          <button class="btn btn-small" onclick="document.getElementById('pdf-frame-${cssSafe(fileName)}').requestFullscreen()">Pantalla completa</button>
          <a class="btn btn-small btn-primary" href="${url}" download="${fileName}">Descargar</a>
        </div>
      </div>
      <iframe id="pdf-frame-${cssSafe(fileName)}" class="pdf-frame" src="${url}#toolbar=1&navpanes=1" title="${fileName}"></iframe>
    </div>
  `;
}
function cssSafe(str) {
  return str.replace(/[^\w]+/g, "_");
}
