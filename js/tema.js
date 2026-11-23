/* =========================================================
   TEMA — Se carga en el <head>, antes de pintar nada, para
   aplicar el tema y el tamaño de letra guardados sin parpadeo.
   Va en archivo aparte (y no dentro del HTML) para que la
   política de seguridad pueda prohibir el código en línea.
   ========================================================= */
(function () {
  try {
    var prefs = JSON.parse(localStorage.getItem('nutriplan_prefs')) || {};
    if (prefs.tema === 'claro' || prefs.tema === 'oscuro') document.documentElement.dataset.tema = prefs.tema;
    if (prefs.letraGrande) document.documentElement.setAttribute('data-letra-grande', '');
  } catch (e) { /* sin almacenamiento: tema del sistema */ }
})();
