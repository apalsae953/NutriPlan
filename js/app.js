/* =========================================================
   APP.JS — Inicialización y utilidades globales
   Controla la navegación, modales, toasts, FAB y funciones
   de ayuda compartidas entre módulos.
   ========================================================= */

// Vista activa en este momento
let vistaActual = 'dietas';

/* -------------------------------------------------------
   Arranque de la aplicación
------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar almacenamiento (carga datos del Excel si es la primera vez)
  inicializarStorage();

  // Renderizar la vista inicial
  renderizarDietas();

  // Inicializar iconos de Lucide
  lucide.createIcons();

  // Configurar swipe para cambiar de vista en móvil
  configurarSwipe();
});

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
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  // Activar el botón del sidebar correspondiente a la vista
  const sidebarBtn = document.querySelector(`.nav-item[data-view="${vista}"]`);
  if (sidebarBtn) sidebarBtn.classList.add('active');

  // Actualizar BOTTOM NAV (móvil)
  document.querySelectorAll('.bottom-nav-item').forEach(b => b.classList.remove('active'));
  const bottomBtn = document.querySelector(`.bottom-nav-item[data-view="${vista}"]`);
  if (bottomBtn) bottomBtn.classList.add('active');

  // Si el clic viene del sidebar, no duplicar la activación
  if (btn) btn.classList.add('active');

  // Actualizar título del topbar móvil
  const titulos = {
    dietas: 'Mis Dietas',
    compra: 'Lista de la Compra'
  };
  const topbarTitle = document.getElementById('topbarTitle');
  if (topbarTitle) topbarTitle.textContent = titulos[vista] || '';

  // Renderizar la vista correspondiente
  if (vista === 'dietas') {
    renderizarDietas();
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
   Desliza izquierda/derecha para ir de Dietas a Compra
------------------------------------------------------- */
function configurarSwipe() {
  let touchStartX = 0;
  let touchStartY = 0;

  document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    // No procesar si hay modal abierto
    if (document.querySelector('.modal-overlay.active')) return;

    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;

    // Solo activar si el gesto es más horizontal que vertical
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.5) return;

    if (dx < 0 && vistaActual === 'dietas') {
      // Deslizar izquierda: ir a Compra
      cambiarVista('compra', null);
    } else if (dx > 0 && vistaActual === 'compra') {
      // Deslizar derecha: ir a Dietas
      cambiarVista('dietas', null);
    }
  }, { passive: true });
}

/* -------------------------------------------------------
   Toast de notificaciones
------------------------------------------------------- */
function mostrarToast(mensaje, tipo = 'success') {
  const container = document.getElementById('toastContainer');
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
