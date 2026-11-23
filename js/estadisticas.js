/* =========================================================
   ESTADÍSTICAS — Vercel Web Analytics
   Sin cookies ni nada guardado en el dispositivo: cuenta
   visitas, país, dispositivo y navegador de forma anónima.
   Las invitaciones llevan el código de la familia en la
   dirección (?familia=… y #d=…): se quita antes de enviarla.
   En local no se carga (allí no existe el script de Vercel).
   ========================================================= */
(function () {
  var local = !/^https?:$/.test(location.protocol) ||
    ['localhost', '127.0.0.1', '[::1]'].indexOf(location.hostname) !== -1;
  if (local) return;

  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  window.va('beforeSend', function (evento) {
    try {
      var url = new URL(evento.url);
      url.search = '';
      url.hash = '';
      evento.url = url.toString();
    } catch (e) { /* si no se entiende la dirección, se manda tal cual sin cambios */ }
    return evento;
  });

  var script = document.createElement('script');
  script.defer = true;
  script.src = '/_vercel/insights/script.js';
  document.head.appendChild(script);
})();
