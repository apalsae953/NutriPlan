/* =========================================================
   UI.JS — Componentes de interfaz reutilizables
   - Acciones delegadas (data-accion) en lugar de onclick en línea
   - Hojas inferiores (bottom sheets) con <dialog>, que se cierran
     con el botón "atrás" del móvil, con Esc o arrastrando
   - Confirmaciones, menús de acciones y avisos con "Deshacer"
   ========================================================= */

/* -------------------------------------------------------
   Acciones delegadas
   <button data-accion="nombre" data-id="...">
------------------------------------------------------- */
const ACCIONES = {};

function registrarAcciones(mapa) {
  Object.assign(ACCIONES, mapa);
}

document.addEventListener('click', (e) => {
  if (pulsacionLargaReciente) {
    pulsacionLargaReciente = false;
    e.preventDefault();
    return;
  }
  const el = e.target.closest('[data-accion]');
  if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
  const fn = ACCIONES[el.dataset.accion];
  if (!fn) return;
  if (el.tagName === 'A') e.preventDefault();
  fn(el, e);
});

/* -------------------------------------------------------
   Pulsación larga (data-pulsacion-larga="accion")
   También responde al clic derecho en escritorio
------------------------------------------------------- */
let pulsacionLargaReciente = false;

(function configurarPulsacionLarga() {
  let temporizador = null;
  let origen = null;
  let inicio = { x: 0, y: 0 };

  const cancelar = () => {
    clearTimeout(temporizador);
    temporizador = null;
    if (origen) origen.classList.remove('pulsando');
    origen = null;
  };

  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    const el = e.target.closest('[data-pulsacion-larga]');
    if (!el) return;
    origen = el;
    inicio = { x: e.clientX, y: e.clientY };
    el.classList.add('pulsando');
    temporizador = setTimeout(() => {
      const fn = ACCIONES[el.dataset.pulsacionLarga];
      el.classList.remove('pulsando');
      temporizador = null;
      if (fn) {
        pulsacionLargaReciente = true;
        setTimeout(() => { pulsacionLargaReciente = false; }, 600);
        vibrar(12);
        fn(el, e);
      }
    }, 480);
  });

  document.addEventListener('pointermove', (e) => {
    if (!temporizador) return;
    if (Math.abs(e.clientX - inicio.x) > 8 || Math.abs(e.clientY - inicio.y) > 8) cancelar();
  });
  ['pointerup', 'pointercancel', 'scroll'].forEach(ev =>
    document.addEventListener(ev, cancelar, { passive: true, capture: ev === 'scroll' }));

  document.addEventListener('contextmenu', (e) => {
    const el = e.target.closest('[data-pulsacion-larga]');
    if (!el) return;
    e.preventDefault();
    if (pulsacionLargaReciente) return;
    const eraTactil = !!temporizador;
    cancelar();
    const fn = ACCIONES[el.dataset.pulsacionLarga];
    if (!fn) return;
    if (eraTactil) {
      pulsacionLargaReciente = true;
      setTimeout(() => { pulsacionLargaReciente = false; }, 600);
      vibrar(12);
    }
    fn(el, e);
  });
})();

/* -------------------------------------------------------
   Hojas (bottom sheets en móvil, ventanas en escritorio)
------------------------------------------------------- */
const Hoja = (() => {
  const pila = [];
  let popsPendientes = [];

  function superior() {
    return pila[pila.length - 1] || null;
  }

  // bloqueada: no se cierra tocando fuera, con Esc, arrastrando ni con "atrás" (p. ej. la bienvenida)
  function abrir({ titulo = '', subtitulo = '', cuerpo = '', pie = '', clase = '', etiqueta = '', alAbrir = null, alCerrar = null, bloqueada = false } = {}) {
    const d = document.createElement('dialog');
    if (bloqueada) d.dataset.bloqueada = '1';
    d.className = `hoja ${clase}`.trim();
    d.setAttribute('aria-label', etiqueta || titulo || 'Panel');
    d.innerHTML = `
      <div class="hoja-caja">
        <div class="hoja-asa" aria-hidden="true"><span></span></div>
        ${titulo ? `
          <header class="hoja-cabecera">
            <div class="hoja-titulos">
              <h2 class="hoja-titulo">${esc(titulo)}</h2>
              ${subtitulo ? `<p class="hoja-subtitulo">${esc(subtitulo)}</p>` : ''}
            </div>
            <button type="button" class="boton-icono hoja-cerrar" data-cerrar-hoja aria-label="Cerrar">${ico('cerrar')}</button>
          </header>` : ''}
        <div class="hoja-cuerpo">${cuerpo}</div>
        ${pie ? `<footer class="hoja-pie">${pie}</footer>` : ''}
      </div>
    `;
    d._alCerrar = alCerrar;

    d.addEventListener('click', (e) => {
      if ((e.target === d && !bloqueada) || e.target.closest('[data-cerrar-hoja]')) cerrar(d);
    });
    d.addEventListener('cancel', (e) => {
      e.preventDefault();
      if (!bloqueada) cerrar(d);
    });
    // Si el navegador la cierra por su cuenta (Esc repetido), limpiar igualmente
    d.addEventListener('close', () => {
      if (!d.dataset.cerrando) cerrar(d);
    });

    document.body.appendChild(d);
    pila.push(d);
    d.showModal();
    document.documentElement.classList.add('con-hoja');
    history.pushState({ hoja: true }, '');

    if (!bloqueada) configurarArrastre(d);
    void d.offsetHeight;
    d.classList.add('abierta');

    if (alAbrir) alAbrir(d);
    return d;
  }

  // Devuelve una promesa que se resuelve cuando la hoja ya no está en el historial
  function cerrar(d, { desdeHistorial = false } = {}) {
    d = d || superior();
    if (!d || d.dataset.cerrando) return Promise.resolve();
    d.dataset.cerrando = '1';
    d.classList.remove('abierta');
    d.classList.add('cerrando');

    const retirar = () => {
      if (d.open) d.close();
      d.remove();
      const i = pila.indexOf(d);
      if (i >= 0) pila.splice(i, 1);
      if (!pila.length) document.documentElement.classList.remove('con-hoja');
      if (d._alCerrar) d._alCerrar();
    };
    setTimeout(retirar, reduceMovimiento.matches ? 0 : 210);

    if (desdeHistorial) return Promise.resolve();
    return new Promise(resolve => {
      const t = setTimeout(resolve, 400);
      popsPendientes.push(() => { clearTimeout(t); resolve(); });
      history.back();
    });
  }

  function cerrarTodas() {
    return Promise.all(pila.slice().reverse().map(d => cerrar(d)));
  }

  // Botón "atrás" de Android / gesto de volver: cierra la hoja superior
  window.addEventListener('popstate', (e) => {
    if (popsPendientes.length) {
      popsPendientes.shift()();
      return;
    }
    const d = superior();
    if (d && d.dataset.bloqueada) {
      history.pushState({ hoja: true }, '');
    } else if (d) {
      cerrar(d, { desdeHistorial: true });
    } else if (e.state && e.state.hoja) {
      // Entrada huérfana (p. ej. tras recargar): seguir hacia atrás
      history.back();
    }
  });

  // Arrastrar la cabecera hacia abajo para cerrar (solo en móvil)
  function configurarArrastre(d) {
    const caja = d.querySelector('.hoja-caja');
    const zonas = d.querySelectorAll('.hoja-asa, .hoja-cabecera');
    const esMovil = () => window.matchMedia('(max-width: 719px)').matches;

    zonas.forEach(zona => {
      let y0 = 0, t0 = 0, dy = 0, activo = false;

      zona.addEventListener('pointerdown', (e) => {
        if (!esMovil() || e.target.closest('button, input, select, textarea, a')) return;
        activo = true;
        y0 = e.clientY;
        t0 = performance.now();
        dy = 0;
        zona.setPointerCapture(e.pointerId);
        caja.style.transition = 'none';
      });

      zona.addEventListener('pointermove', (e) => {
        if (!activo) return;
        dy = Math.max(0, e.clientY - y0);
        // Resistencia suave pasado cierto punto
        caja.style.transform = `translateY(${dy < 200 ? dy : 200 + (dy - 200) * 0.4}px)`;
      });

      const soltar = () => {
        if (!activo) return;
        activo = false;
        const velocidad = dy / Math.max(1, performance.now() - t0);
        caja.style.transition = '';
        if (dy > 110 || (dy > 30 && velocidad > 0.6)) {
          caja.style.transform = '';
          cerrar(d);
        } else {
          caja.style.transform = '';
        }
      };
      zona.addEventListener('pointerup', soltar);
      zona.addEventListener('pointercancel', soltar);
    });
  }

  return { abrir, cerrar, cerrarTodas, superior, hayAbiertas: () => pila.length > 0 };
})();

/* -------------------------------------------------------
   Confirmación (devuelve una promesa con true/false)
------------------------------------------------------- */
function confirmar({ titulo, texto = '', boton = 'Eliminar', peligro = true, cancelar = 'Cancelar' }) {
  return new Promise(resolve => {
    let resuelto = false;
    const terminar = (valor) => {
      if (resuelto) return;
      resuelto = true;
      resolve(valor);
    };

    const d = Hoja.abrir({
      clase: 'hoja-alerta',
      etiqueta: titulo,
      cuerpo: `
        <h2 class="alerta-titulo">${esc(titulo)}</h2>
        ${texto ? `<p class="alerta-texto">${esc(texto)}</p>` : ''}
      `,
      pie: `
        <button type="button" class="boton boton-secundario" data-cerrar-hoja>${esc(cancelar)}</button>
        <button type="button" class="boton ${peligro ? 'boton-peligro' : 'boton-primario'}" data-confirmar>${esc(boton)}</button>
      `,
      alCerrar: () => terminar(false)
    });

    d.querySelector('[data-confirmar]').addEventListener('click', async () => {
      await Hoja.cerrar(d);
      terminar(true);
    });
  });
}

/* -------------------------------------------------------
   Menú de acciones (lista de opciones en una hoja)
   acciones: [{ icono, texto, detalle, peligro, fn }]
------------------------------------------------------- */
function menuAcciones({ titulo = '', subtitulo = '', acciones = [] }) {
  const visibles = acciones.filter(Boolean);
  const d = Hoja.abrir({
    clase: 'hoja-menu',
    titulo,
    subtitulo,
    etiqueta: titulo || 'Opciones',
    cuerpo: `
      <div class="menu-lista">
        ${visibles.map((a, i) => `
          <button type="button" class="menu-opcion ${a.peligro ? 'peligro' : ''}" data-opcion="${i}">
            ${ico(a.icono || 'chevron_der')}
            <span class="menu-opcion-texto">
              <span>${esc(a.texto)}</span>
              ${a.detalle ? `<small>${esc(a.detalle)}</small>` : ''}
            </span>
          </button>
        `).join('')}
      </div>
    `
  });

  d.querySelectorAll('[data-opcion]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const accion = visibles[Number(btn.dataset.opcion)];
      await Hoja.cerrar(d);
      if (accion && accion.fn) accion.fn();
    });
  });
  return d;
}

/* -------------------------------------------------------
   Avisos (toasts). Usan la API Popover cuando existe para
   quedar por encima de las hojas abiertas.
------------------------------------------------------- */
function aviso(mensaje, { tipo = 'info', accion = null, duracion = null } = {}) {
  const cont = document.getElementById('avisos');
  if (!cont) return;

  const el = document.createElement('div');
  el.className = `aviso aviso-${tipo}`;
  el.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
  el.innerHTML = `
    <span class="aviso-texto">${esc(mensaje)}</span>
    ${accion ? `<button type="button" class="aviso-accion">${esc(accion.texto)}</button>` : ''}
  `;

  const quitar = () => {
    if (!el.isConnected) return;
    el.classList.add('saliendo');
    setTimeout(() => {
      el.remove();
      if (!cont.children.length && cont.hidePopover && cont.matches(':popover-open')) cont.hidePopover();
    }, 180);
  };

  if (accion) {
    el.querySelector('.aviso-accion').addEventListener('click', () => {
      accion.fn();
      quitar();
    });
  }

  // Máximo dos avisos a la vez
  while (cont.children.length >= 2) cont.firstElementChild.remove();
  cont.appendChild(el);

  if (cont.showPopover) {
    try {
      if (cont.matches(':popover-open')) cont.hidePopover();
      cont.showPopover();
    } catch (e) { /* sin soporte */ }
  }

  setTimeout(quitar, duracion || (accion ? 5000 : 2600));
}

// Alias para el código antiguo
function mostrarToast(mensaje, tipo = 'info') {
  aviso(mensaje, { tipo });
}

/* -------------------------------------------------------
   Aviso de datos de ejemplo dentro de cada apartado.
   El botón quita solo los ejemplos de ese apartado.
------------------------------------------------------- */
function htmlAvisoEjemplos(col) {
  const n = ejemplosEn(col).length;
  if (!n) return '';
  const textos = {
    dietas:  [n === 1 ? 'Esta dieta es un ejemplo para que veas cómo funciona.' : `Hay ${n} dietas de ejemplo.`, n === 1 ? 'Quitarla' : 'Quitarlas'],
    comidas: [n === 1 ? 'Hay una receta de ejemplo.' : `Hay ${n} recetas de ejemplo.`, n === 1 ? 'Quitarla' : 'Quitarlas'],
    compra:  [n === 1 ? 'Hay un producto de ejemplo en la fija.' : `Hay ${n} productos de ejemplo en la fija.`, n === 1 ? 'Quitarlo' : 'Quitarlos']
  };
  const [texto, boton] = textos[col];
  return `
    <div class="nota-linea nota-ejemplos">
      ${ico('info')}<span>${esc(texto)}</span>
      <button class="boton-texto" data-accion="quitarEjemplos" data-col="${esc(col)}">${esc(boton)}</button>
    </div>
  `;
}

/* -------------------------------------------------------
   Interruptor (sí / no) para los ajustes
------------------------------------------------------- */
function htmlInterruptor({ nombre, titulo, detalle = '', activo = false, desactivado = false }) {
  return `
    <label class="fila ajuste-fila ${desactivado ? 'desactivado' : ''}">
      <span class="fila-texto">
        <span class="fila-titulo">${esc(titulo)}</span>
        ${detalle ? `<span class="fila-detalle ajuste-detalle">${esc(detalle)}</span>` : ''}
      </span>
      <input type="checkbox" class="interruptor" name="${esc(nombre)}" role="switch" ${activo ? 'checked' : ''} ${desactivado ? 'disabled' : ''} />
    </label>
  `;
}

/* -------------------------------------------------------
   Formularios: leer valores con nombre
------------------------------------------------------- */
function valoresFormulario(form) {
  const datos = {};
  new FormData(form).forEach((v, k) => { datos[k] = typeof v === 'string' ? v.trim() : v; });
  return datos;
}

/* -------------------------------------------------------
   Control segmentado reutilizable
   opciones: [{ valor, texto }]
------------------------------------------------------- */
function htmlSegmentado(nombre, opciones, seleccionado, clase = '') {
  return `
    <div class="segmentado ${clase}" role="radiogroup">
      ${opciones.map(o => `
        <label class="segmento">
          <input type="radio" name="${esc(nombre)}" value="${esc(o.valor)}" ${o.valor === seleccionado ? 'checked' : ''} />
          <span>${esc(o.texto)}</span>
        </label>
      `).join('')}
    </div>
  `;
}
