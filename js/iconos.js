/* =========================================================
   ICONOS — Set propio en SVG (trazo 1.8, 24×24)
   Sin dependencias externas: funcionan sin conexión y no
   hace falta recorrer el DOM para pintarlos.
   ========================================================= */

const ICONOS = {
  // Navegación
  plan:        '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M8 14h3"/><path d="M8 17h6"/>',
  platos:      '<path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0Z"/><path d="M9 20.5h6"/><path d="M9 4.5c-.8.9-.8 2.1 0 3"/><path d="M13 3.5c-.8.9-.8 2.1 0 3"/>',
  compra:      '<path d="M5.5 8h13l-1 12.5h-11Z"/><path d="M9 11V6.5a3 3 0 0 1 6 0V11"/>',

  // Acciones
  mas:         '<path d="M12 5v14"/><path d="M5 12h14"/>',
  cerrar:      '<path d="M6 6l12 12"/><path d="M18 6 6 18"/>',
  check:       '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  papelera:    '<path d="M4 6.5h16"/><path d="M9.5 6.5V4.5h5v2"/><path d="M6.5 6.5l.9 12.6a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-12.6"/><path d="M10 10.5v6"/><path d="M14 10.5v6"/>',
  editar:      '<path d="M14.5 5.5l4 4"/><path d="M4 20l1-4.5L15.8 4.7a1.8 1.8 0 0 1 2.5 0l1 1a1.8 1.8 0 0 1 0 2.5L8.5 19Z"/>',
  buscar:      '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.8-4.8"/>',
  mas_h:       '<circle cx="5.5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18.5" cy="12" r="1.3"/>',
  compartir:   '<path d="M12 15V3.5"/><path d="m7.5 8 4.5-4.5L16.5 8"/><path d="M5 12.5v6A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5v-6"/>',
  copiar:      '<rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 8.5V6A2.5 2.5 0 0 0 13 3.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5"/>',
  duplicar:    '<rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 8.5V6A2.5 2.5 0 0 0 13 3.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5"/><path d="M14.5 12v5"/><path d="M12 14.5h5"/>',
  deshacer:    '<path d="M9 14 4.5 9.5 9 5"/><path d="M4.5 9.5H14a5.5 5.5 0 0 1 0 11h-3"/>',
  descargar:   '<path d="M12 3.5V15"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M4.5 19.5h15"/>',
  subir:       '<path d="M12 15V3.5"/><path d="m7.5 8 4.5-4.5L16.5 8"/><path d="M4.5 19.5h15"/>',
  orden:       '<path d="M7 4v16"/><path d="m3.5 7.5 3.5-3.5 3.5 3.5"/><path d="M17 20V4"/><path d="m13.5 16.5 3.5 3.5 3.5-3.5"/>',
  flecha_der:  '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  chevron_abajo: '<path d="m6 9.5 6 6 6-6"/>',
  chevron_der: '<path d="m9.5 6 6 6-6 6"/>',
  chevron_izq: '<path d="m14.5 6-6 6 6 6"/>',
  enviar:      '<path d="M5 12h13"/><path d="m12.5 6 6 6-6 6"/>',

  // Conceptos
  personas:    '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M15.5 4.8a3.5 3.5 0 0 1 0 6.4"/><path d="M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
  enlace:      '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  nube:        '<path d="M7 18.5a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.5 1.6A3.8 3.8 0 0 1 17.5 18.5Z"/>',
  sin_conexion:'<path d="M7 18.5a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.5 1.6A3.8 3.8 0 0 1 17.5 18.5Z"/><path d="m4 4 16 16"/>',
  llama:       '<path d="M12 21a6.5 6.5 0 0 0 6.5-6.5c0-3.5-2.5-5.5-3.5-8.5-1.5 1.5-2 3-2 4.5-1-1-1.5-3-1-6C8.5 6 5.5 9.5 5.5 14.5A6.5 6.5 0 0 0 12 21Z"/>',
  rayo:        '<path d="M13 3 5 13.5h6L10.5 21 19 10.5h-6Z"/>',
  fija:        '<path d="M7 3.5h10a1.5 1.5 0 0 1 1.5 1.5v15.5L12 16.5l-6.5 4V5A1.5 1.5 0 0 1 7 3.5Z"/>',
  lista:       '<path d="M9 6.5h11"/><path d="M9 12h11"/><path d="M9 17.5h11"/><path d="m3.5 6.5 1 1 2-2"/><path d="m3.5 12 1 1 2-2"/><path d="m3.5 17.5 1 1 2-2"/>',
  cesta_mas:   '<path d="M5.5 8h13l-1 12.5h-11Z"/><path d="M9 11V6.5a3 3 0 0 1 6 0V11"/><path d="M12 12.5v5"/><path d="M9.5 15h5"/>',
  calendario_mas: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M12 12.5v5"/><path d="M9.5 15h5"/>',
  info:        '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><path d="M12 7.6v.2"/>',
  nota:        '<path d="M5 4.5h14v10l-5 5H5Z"/><path d="M14 19.5v-5h5"/><path d="M8.5 9h7"/><path d="M8.5 12.5h4"/>',
  reloj:       '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  repetir:     '<path d="M4 11V9.5A3.5 3.5 0 0 1 7.5 6H19"/><path d="m16 3 3 3-3 3"/><path d="M20 13v1.5a3.5 3.5 0 0 1-3.5 3.5H5"/><path d="m8 21-3-3 3-3"/>',
  sol:         '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2"/><path d="M12 19.5v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2.5 12h2"/><path d="M19.5 12h2"/><path d="m4.9 19.1 1.4-1.4"/><path d="m17.7 6.3 1.4-1.4"/>',
  luna:        '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z"/>',
  pantalla:    '<rect x="3" y="4.5" width="18" height="12" rx="2"/><path d="M8.5 20h7"/><path d="M12 16.5V20"/>',
  salir:       '<path d="M14 4.5h3.5A2.5 2.5 0 0 1 20 7v10a2.5 2.5 0 0 1-2.5 2.5H14"/><path d="M10 16.5 5.5 12 10 7.5"/><path d="M5.5 12H15"/>',
  hoja:        '<path d="M5 19c0-8 5.5-13.5 15-14-.2 9.5-6 15-14 15"/><path d="M5 19c3-3.5 6-6 9.5-8"/>',
  vaciar:      '<path d="M4 6.5h16"/><path d="M6.5 6.5l.9 12.6a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-12.6"/><path d="M9.5 6.5V4.5h5v2"/>',
  desmarcar:   '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4.5v4h4"/>',
  hecho:       '<circle cx="12" cy="12" r="8.5"/><path d="m8 12.3 2.8 2.7L16 9.5"/>',
  ajustes:     '<path d="M4 7h8.5"/><path d="M16.5 7H20"/><circle cx="14.5" cy="7" r="2"/><path d="M4 17h3.5"/><path d="M11.5 17H20"/><circle cx="9.5" cy="17" r="2"/>'
};

/* -------------------------------------------------------
   Devuelve el HTML de un icono listo para insertar
------------------------------------------------------- */
function ico(nombre, clase = '') {
  const trazo = ICONOS[nombre] || ICONOS.info;
  return `<svg class="ico ${clase}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${trazo}</svg>`;
}

/* -------------------------------------------------------
   Sustituye los <i data-ico="..."> del HTML estático
------------------------------------------------------- */
function pintarIconosEstaticos(raiz = document) {
  raiz.querySelectorAll('i[data-ico]').forEach(el => {
    el.outerHTML = ico(el.dataset.ico, el.className);
  });
}
