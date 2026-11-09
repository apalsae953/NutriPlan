/* =========================================================
   APP.JS — Arranque, navegación y piezas globales
   ========================================================= */

const VISTAS = {
  plan:   { titulo: 'Plan',   render: () => renderizarPlan() },
  recetas: { titulo: 'Recetas', render: () => renderizarRecetas() },
  compra: { titulo: 'Compra', render: () => renderizarCompra() }
};

let vistaActual = 'plan';

/* -------------------------------------------------------
   Arranque de la aplicación
------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', async () => {
  pintarIconosEstaticos();
  const primeraVez = inicializarStorage();
  aplicarTema(getPref('tema', 'sistema'));

  configurarRecetas();
  configurarCompra();
  configurarBarra();
  configurarDeslizar();

  // Accesos directos del icono instalado (?vista=compra) o la última vista usada
  const params = new URLSearchParams(location.search);
  const pedida = params.get('vista');
  if (pedida) {
    params.delete('vista');
    history.replaceState(null, '', `${location.pathname}${params.toString() ? `?${params}` : ''}`);
  }
  const guardada = getPref('vista', 'plan') === 'platos' ? 'recetas' : getPref('vista', 'plan');
  const inicial = VISTAS[pedida] ? pedida : guardada;
  irAVista(VISTAS[inicial] ? inicial : 'plan', { sinScroll: true });

  document.addEventListener('sync-estado', actualizarChipFamilia);
  iniciarSincronizacion();

  registrarServiceWorker();

  // Una invitación por enlace tiene prioridad sobre la bienvenida
  const invitado = await verificarParametroFamiliaURL();
  if (!invitado) mostrarBienvenidaSiHaceFalta(primeraVez);
});

/* -------------------------------------------------------
   Refrescar lo visible tras cualquier cambio de datos
------------------------------------------------------- */
function refrescarApp() {
  actualizarChipFamilia();
  actualizarInsigniaCompra();
  actualizarFab();
  VISTAS[vistaActual].render();
}

/* -------------------------------------------------------
   Navegación entre vistas
------------------------------------------------------- */
function irAVista(vista, { sinScroll = false } = {}) {
  if (!VISTAS[vista]) return;
  const cambia = vista !== vistaActual;
  vistaActual = vista;
  setPref('vista', vista);

  Object.keys(VISTAS).forEach(v => {
    document.getElementById(`vista-${v}`).hidden = v !== vista;
  });
  document.querySelectorAll('.nav-item').forEach(b => {
    if (b.dataset.vista === vista) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  document.getElementById('barraTitulo').textContent = VISTAS[vista].titulo;
  document.title = `${VISTAS[vista].titulo} · NutriPlan`;

  refrescarApp();
  if (cambia && !sinScroll) window.scrollTo({ top: 0 });
}

registrarAcciones({
  ir: (el) => {
    if (el.dataset.vista === vistaActual) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    irAVista(el.dataset.vista);
  },
  fab: () => accionFab()
});

/* -------------------------------------------------------
   Botón flotante: su función cambia según la vista
------------------------------------------------------- */
function configFab() {
  if (vistaActual === 'plan') {
    return getDietas().length
      ? { texto: 'Comida', fn: () => abrirAnadirComidaDia() }
      : { texto: 'Dieta', fn: () => abrirFormDieta() };
  }
  if (vistaActual === 'recetas') return { texto: 'Receta', fn: () => abrirFormReceta() };
  if (vistaActual === 'compra' && segmentoCompra === 'fija') return { texto: 'Producto', fn: () => abrirFormFija() };
  return null; // La lista rápida ya tiene su propio campo para añadir
}

function actualizarFab() {
  const fab = document.getElementById('fab');
  const conf = configFab();
  fab.classList.toggle('oculto', !conf);
  fab.setAttribute('aria-hidden', !conf);
  fab.tabIndex = conf ? 0 : -1;
  if (conf) {
    document.getElementById('fabTexto').textContent = conf.texto;
    fab.setAttribute('aria-label', `Añadir ${conf.texto.toLowerCase()}`);
  }
}

function accionFab() {
  const conf = configFab();
  if (conf) conf.fn();
}

/* -------------------------------------------------------
   Barra superior: fondo y título compacto al hacer scroll
------------------------------------------------------- */
function configurarBarra() {
  const barra = document.getElementById('barra');
  let pendiente = false;
  const actualizar = () => {
    pendiente = false;
    barra.classList.toggle('con-fondo', window.scrollY > 44);
  };
  window.addEventListener('scroll', () => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(actualizar);
  }, { passive: true });
  actualizar();
}

/* -------------------------------------------------------
   Deslizar a los lados para cambiar de sección (móvil).
   Se ignora si el gesto empieza en algo que ya se desplaza
   en horizontal, en un campo o cerca del borde (gesto de volver).
------------------------------------------------------- */
function configurarDeslizar() {
  let inicio = null;
  const orden = Object.keys(VISTAS);

  document.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    const ancho = window.innerWidth;
    if (e.touches.length > 1 || Hoja.hayAbiertas() || t.clientX < 24 || t.clientX > ancho - 24 ||
        e.target.closest('.scroll-x, input, textarea, select')) {
      inicio = null;
      return;
    }
    inicio = { x: t.clientX, y: t.clientY, t: Date.now() };
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (!inicio) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - inicio.x;
    const dy = t.clientY - inicio.y;
    const rapido = Date.now() - inicio.t < 450;
    inicio = null;
    if (!rapido || Math.abs(dx) < 80 || Math.abs(dy) > Math.abs(dx) * 0.4) return;

    const i = orden.indexOf(vistaActual);
    const destino = orden[dx < 0 ? i + 1 : i - 1];
    if (destino) irAVista(destino);
  }, { passive: true });
}

/* -------------------------------------------------------
   Tema claro / oscuro
------------------------------------------------------- */
function aplicarTema(tema) {
  const raiz = document.documentElement;
  if (tema === 'claro' || tema === 'oscuro') raiz.dataset.tema = tema;
  else delete raiz.dataset.tema;

  // Color de la barra de estado del móvil
  const metas = document.querySelectorAll('meta[name="theme-color"]');
  metas.forEach(m => {
    const porDefecto = m.media.includes('dark') ? '#151412' : '#f4f1ea';
    m.content = tema === 'oscuro' ? '#151412' : tema === 'claro' ? '#f4f1ea' : porDefecto;
  });
}

/* -------------------------------------------------------
   Funcionamiento sin conexión (service worker)
------------------------------------------------------- */
function registrarServiceWorker() {
  if (!('serviceWorker' in navigator) || !location.protocol.startsWith('http')) return;
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
