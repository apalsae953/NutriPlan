/* =========================================================
   APP.JS — Inicialización y utilidades globales
   Controla la navegación, modales, toasts, FAB y funciones
   de ayuda compartidas entre módulos (Dietas, Comidas, Compra).
   ========================================================= */

// Vista activa en este momento (dietas | comidas | compra)
let vistaActual = 'dietas';

/* -------------------------------------------------------
   Arranque de la aplicación
------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', async () => {
  // Inicializar almacenamiento y partidas locales
  inicializarStorage();

  // Actualizar indicadores de interfaz de partida activa (sidebar y topbar)
  if (typeof actualizarUIPartidas === 'function') {
    actualizarUIPartidas();
  }

  // Comprobar si se ha accedido mediante enlace con código de partida (?partida=CASA24)
  if (typeof verificarParametroPartidaURL === 'function') {
    await verificarParametroPartidaURL();
  }

  // Actualizar banner superior de ejemplos si procede
  actualizarBannerEjemplos();

  // Renderizar la vista inicial
  renderizarDietas();

  // Inicializar iconos de Lucide
  lucide.createIcons();

  // Configurar swipe para cambiar de vista en móvil
  configurarSwipe();
});

/* -------------------------------------------------------
   Banner / Control de datos de ejemplo opcionales
------------------------------------------------------- */
function actualizarBannerEjemplos() {
  const banner = document.getElementById('bannerEjemplos');
  if (!banner) return;

  const hayEjemplos = localStorage.getItem(STORAGE_KEYS.ejemplosCargados) === 'true';
  const dietasCount = getDietas().length;
  const comidasCount = getComidas().length;
  const compraCount = getCompra().length;

  if (hayEjemplos) {
    banner.innerHTML = `
      <div class="banner-ejemplo activo">
        <div class="banner-ejemplo-texto">
          <i data-lucide="sparkles"></i>
          <span>Estás viendo los <strong>datos de ejemplo</strong> del sistema. Puedes limpiarlos en cualquier momento para empezar de cero.</span>
        </div>
        <button class="btn btn-sm btn-ghost-danger" onclick="limpiarDatosEjemplo()">
          <i data-lucide="trash-2"></i>
          Limpiar ejemplos
        </button>
      </div>
    `;
    banner.style.display = 'block';
  } else if (dietasCount === 0 && comidasCount === 0 && compraCount === 0) {
    banner.innerHTML = `
      <div class="banner-ejemplo aviso">
        <div class="banner-ejemplo-texto">
          <i data-lucide="info"></i>
          <span>Tu aplicación está vacía y lista para usar. Si quieres ver un menú semanal y lista de compra de prueba, pulsa cargar.</span>
        </div>
        <button class="btn btn-sm btn-primary" onclick="cargarEjemplosCompletos()">
          <i data-lucide="sparkles"></i>
          Cargar ejemplos
        </button>
      </div>
    `;
    banner.style.display = 'block';
  } else {
    banner.style.display = 'none';
  }

  lucide.createIcons();
}

/* -------------------------------------------------------
   Navegación entre vistas
   Sincroniza sidebar (escritorio) y bottom nav (móvil)
------------------------------------------------------- */
function cambiarVista(vista, btn) {
  vistaActual = vista;

  // Ocultar todas las vistas
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

  // Mostrar la vista seleccionada
  const viewEl = document.getElementById(`view-${vista}`);
  if (viewEl) viewEl.classList.add('active');

  // Actualizar nav activo en SIDEBAR (escritorio)
  document.querySelectorAll('.sidebar .nav-item').forEach(b => b.classList.remove('active'));
  const sidebarBtn = document.querySelector(`.sidebar .nav-item[data-view="${vista}"]`);
  if (sidebarBtn) sidebarBtn.classList.add('active');

  // Actualizar BOTTOM NAV (móvil)
  document.querySelectorAll('.bottom-nav-item').forEach(b => b.classList.remove('active'));
  const bottomBtn = document.querySelector(`.bottom-nav-item[data-view="${vista}"]`);
  if (bottomBtn) bottomBtn.classList.add('active');

  if (btn) btn.classList.add('active');

  // Actualizar título del topbar móvil
  const titulos = {
    dietas: 'Mis Dietas',
    comidas: 'Mis Comidas',
    compra: 'Lista de la Compra'
  };
  const topbarTitle = document.getElementById('topbarTitle');
  if (topbarTitle) topbarTitle.textContent = titulos[vista] || 'NutriPlan';

  // Renderizar la vista correspondiente
  if (vista === 'dietas') {
    renderizarDietas();
  } else if (vista === 'comidas') {
    renderizarComidas();
  } else if (vista === 'compra') {
    renderizarCompra();
  }

  // Cerrar menú móvil lateral si está abierto
  cerrarMenuMovil();

  // Scroll al inicio de la vista
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* -------------------------------------------------------
   Botón flotante de acción (FAB)
   Su función cambia según la vista activa
------------------------------------------------------- */
function accionFab() {
  if (vistaActual === 'dietas') {
    abrirModalNuevaDieta();
  } else if (vistaActual === 'comidas') {
    abrirModalNuevaComida();
  } else if (vistaActual === 'compra') {
    abrirModalNuevoIngrediente();
  }

  // Animación de pulsación
  const fab = document.getElementById('fabBtn');
  if (fab) {
    fab.classList.add('rotado');
    setTimeout(() => fab.classList.remove('rotado'), 300);
  }
}

/* -------------------------------------------------------
   Menú móvil lateral
------------------------------------------------------- */
function abrirMenuMovil() {
  document.getElementById('sidebar').classList.add('mobile-open');
  document.getElementById('overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function cerrarMenuMovil() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('overlay').classList.remove('active');
  document.body.style.overflow = '';
}

/* -------------------------------------------------------
   Modales
------------------------------------------------------- */
function abrirModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function cerrarModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;

  // En móvil: animación de salida hacia abajo antes de ocultar
  const esMovil = window.innerWidth <= 768;
  const esSmall = modal.querySelector('.modal-sm');

  if (esMovil && !esSmall) {
    const contenido = modal.querySelector('.modal');
    if (contenido) {
      contenido.style.animation = 'sheetOut .2s ease forwards';
      setTimeout(() => {
        modal.classList.remove('active');
        contenido.style.animation = '';
        document.body.style.overflow = '';
      }, 200);
      return;
    }
  }

  modal.classList.remove('active');
  document.body.style.overflow = '';
}

// Cerrar modal al pulsar en el overlay (fuera del contenido)
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  });
});

// Cerrar modales con la tecla Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(m => {
      m.classList.remove('active');
      document.body.style.overflow = '';
    });
  }
});

/* -------------------------------------------------------
   Swipe horizontal para cambiar entre vistas (móvil)
------------------------------------------------------- */
function configurarSwipe() {
  let touchStartX = 0;
  let touchStartY = 0;

  document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (document.querySelector('.modal-overlay.active')) return;

    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;

    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.5) return;

    const vistasOrden = ['dietas', 'comidas', 'compra'];
    const idx = vistasOrden.indexOf(vistaActual);

    if (dx < 0 && idx < vistasOrden.length - 1) {
      // Hacia la izquierda -> siguiente vista
      cambiarVista(vistasOrden[idx + 1], null);
    } else if (dx > 0 && idx > 0) {
      // Hacia la derecha -> vista anterior
      cambiarVista(vistasOrden[idx - 1], null);
    }
  }, { passive: true });
}

/* -------------------------------------------------------
   Toast de notificaciones
------------------------------------------------------- */
function mostrarToast(mensaje, tipo = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const iconos = {
    success: 'check-circle',
    error:   'x-circle',
    info:    'info'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  toast.innerHTML = `
    <i data-lucide="${iconos[tipo] || 'info'}"></i>
    <span>${escapeHtml(mensaje)}</span>
  `;

  container.appendChild(toast);
  lucide.createIcons({ nodes: [toast] });

  // Auto-eliminar tras 3 segundos
  setTimeout(() => {
    toast.classList.add('saliendo');
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}

/* -------------------------------------------------------
   Utilidad: escapar HTML para evitar XSS
------------------------------------------------------- */
function escapeHtml(str) {
  if (typeof str !== 'string') return str || '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
