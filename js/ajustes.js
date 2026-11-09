/* =========================================================
   AJUSTES — Preferencias de este dispositivo
   No se comparten con la familia: cada móvil tiene los suyos.
   - Vibración, pantalla encendida en la compra
   - Cómo se ordena la lista rápida
   - Tema, letra más grande y pantalla de inicio
   - Datos de ejemplo y actualizar la app
   ========================================================= */

const PUEDE_VIBRAR = typeof navigator.vibrate === 'function';
const PUEDE_PANTALLA = 'wakeLock' in navigator;

function abrirAjustes() {
  const yo = getYo();
  const familia = getFamiliaActiva();
  const hayEjemplos = tieneEjemplos();

  const d = Hoja.abrir({
    titulo: 'Ajustes',
    subtitulo: 'Se guardan solo en este dispositivo',
    cuerpo: `
      <div class="lista">
        <button class="fila" data-x="nombre">
          ${yo.nombre ? htmlAvatarMiembro(yo) : `<span class="avatar avatar-vacio">${ico('personas')}</span>`}
          <span class="fila-texto">
            <span class="fila-titulo">${yo.nombre ? esc(yo.nombre) : 'Pon tu nombre'}</span>
            <span class="fila-detalle">Tu nombre de siempre. En cada familia puedes usar otro</span>
          </span>
          ${ico('chevron_der', 'ico-final')}
        </button>
      </div>

      <section class="ajustes-bloque">
        <h3>En la compra</h3>
        <div class="lista">
          ${htmlInterruptor({
            nombre: 'vibracion',
            titulo: 'Vibración',
            detalle: PUEDE_VIBRAR ? 'Al marcar productos y al mantener pulsado' : 'Este móvil no deja vibrar a las aplicaciones web',
            activo: PUEDE_VIBRAR && getPref('vibracion', true),
            desactivado: !PUEDE_VIBRAR
          })}
          ${htmlInterruptor({
            nombre: 'pantallaEncendida',
            titulo: 'Pantalla siempre encendida',
            detalle: PUEDE_PANTALLA ? 'Mientras estás en la compra, para que no se bloquee en el súper' : 'Este navegador no lo permite',
            activo: PUEDE_PANTALLA && getPref('pantallaEncendida', false),
            desactivado: !PUEDE_PANTALLA
          })}
          ${htmlInterruptor({
            nombre: 'agruparRapida',
            titulo: 'Agrupar por secciones del súper',
            detalle: 'La lista rápida, ordenada por fruta, carne, lácteos…',
            activo: getPref('agruparRapida', true)
          })}
          ${htmlInterruptor({
            nombre: 'marcadosAlFinal',
            titulo: 'Lo cogido, al final',
            detalle: 'Lo que marcas baja a «En el carro»',
            activo: getPref('marcadosAlFinal', true)
          })}
        </div>
      </section>

      <section class="ajustes-bloque">
        <h3>Apariencia</h3>
        ${htmlSegmentado('tema', [
          { valor: 'sistema', texto: 'Automático' },
          { valor: 'claro', texto: 'Claro' },
          { valor: 'oscuro', texto: 'Oscuro' }
        ], getPref('tema', 'sistema'))}
        <div class="lista" style="margin-top:10px">
          ${htmlInterruptor({
            nombre: 'letraGrande',
            titulo: 'Letra más grande',
            detalle: 'Listas, recetas y dietas se leen mejor',
            activo: getPref('letraGrande', false)
          })}
        </div>
      </section>

      <section class="ajustes-bloque">
        <h3>Al abrir la app, ir a</h3>
        ${htmlSegmentado('inicio', [
          { valor: 'ultima', texto: 'Donde lo dejé' },
          { valor: 'plan', texto: 'Plan' },
          { valor: 'compra', texto: 'Compra' }
        ], getPref('inicio', 'ultima'))}
      </section>

      <section class="ajustes-bloque">
        <h3>Datos de ejemplo en «${esc(familia.nombre)}»</h3>
        <div class="lista">
          ${hayEjemplos
            ? `<button class="fila" data-x="quitarEjemplos">${ico('vaciar')}<span class="fila-texto"><span class="fila-titulo">Quitar los datos de ejemplo</span><span class="fila-detalle">Lo que habéis creado o cambiado se queda</span></span></button>`
            : `<button class="fila" data-x="cargarEjemplos">${ico('hoja')}<span class="fila-texto"><span class="fila-titulo">Cargar datos de ejemplo</span><span class="fila-detalle">Una dieta, recetas y una lista fija para probar</span></span></button>`}
        </div>
      </section>

      <section class="ajustes-bloque">
        <h3>La app</h3>
        <div class="lista">
          ${htmlFilaInstalar()}
          <button class="fila" data-x="actualizar">${ico('repetir')}<span class="fila-texto"><span class="fila-titulo">Actualizar la app</span><span class="fila-detalle ajuste-detalle">Tienes la ${VERSION_APP}. Úsalo si en otro móvil algo se ve distinto</span></span></button>
        </div>
      </section>
    `
  });

  // Interruptores: se aplican al momento
  d.querySelectorAll('.interruptor').forEach(input => input.addEventListener('change', () => {
    setPref(input.name, input.checked);
    aplicarAjuste(input.name, input.checked);
  }));

  d.querySelectorAll('input[name="tema"]').forEach(r => r.addEventListener('change', () => {
    setPref('tema', r.value);
    aplicarTema(r.value);
  }));

  d.querySelectorAll('input[name="inicio"]').forEach(r => r.addEventListener('change', () => {
    setPref('inicio', r.value);
  }));

  const en = (x, fn) => d.querySelector(`[data-x="${x}"]`)?.addEventListener('click', async () => {
    await Hoja.cerrar(d);
    fn();
  });
  en('nombre', () => abrirMiNombre());
  en('cargarEjemplos', () => ACCIONES.cargarEjemplos());
  en('quitarEjemplos', () => ACCIONES.quitarEjemplos());
  en('actualizar', () => actualizarApp());
  // El aviso de instalar necesita el toque del usuario: se pide antes de cerrar la hoja
  d.querySelector('[data-x="instalar"]')?.addEventListener('click', () => {
    instalarApp();
    Hoja.cerrar(d);
  });
}

/* -------------------------------------------------------
   Instalar en el móvil: con su icono y sin la barra del
   navegador. Chrome avisa (beforeinstallprompt) cuando se
   puede; en iPhone solo se puede desde Safari a mano.
------------------------------------------------------- */
let peticionInstalar = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // Se ofrece desde Ajustes, sin banners
  peticionInstalar = e;
});

window.addEventListener('appinstalled', () => {
  peticionInstalar = null;
  aviso('NutriPlan ya está en tu pantalla de inicio');
});

function estaInstalada() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

function htmlFilaInstalar() {
  if (estaInstalada()) return '';
  const fila = (detalle, accion) => `
    <${accion ? 'button data-x="instalar"' : 'div'} class="fila">
      ${ico('descargar')}
      <span class="fila-texto">
        <span class="fila-titulo">Instalar en el móvil</span>
        <span class="fila-detalle ajuste-detalle">${detalle}</span>
      </span>
    </${accion ? 'button' : 'div'}>`;

  if (peticionInstalar) return fila('Con su icono en la pantalla de inicio y sin la barra del navegador', true);
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return fila('En Safari, toca Compartir y luego «Añadir a pantalla de inicio»');
  return fila('En el menú ⋮ del navegador, elige «Instalar aplicación» o «Añadir a pantalla de inicio» y después «Instalar»');
}

async function instalarApp() {
  if (!peticionInstalar) return;
  const peticion = peticionInstalar;
  peticionInstalar = null; // Solo se puede usar una vez
  try {
    await peticion.prompt();
    await peticion.userChoice;
  } catch (e) { /* el usuario lo cerró */ }
}

function aplicarAjuste(nombre, activo) {
  if (nombre === 'vibracion' && activo) vibrar(20);
  if (nombre === 'pantallaEncendida') {
    actualizarPantallaEncendida().then(() => {
      if (activo && Pantalla.fallo && vistaActual === 'compra') {
        aviso('Este navegador no deja mantener la pantalla encendida', { tipo: 'error' });
      }
    });
  }
  if (nombre === 'letraGrande') aplicarLetra();
  if ((nombre === 'agruparRapida' || nombre === 'marcadosAlFinal') && vistaActual === 'compra') renderizarCompra();
}

function aplicarLetra() {
  document.documentElement.toggleAttribute('data-letra-grande', !!getPref('letraGrande', false));
}

/* -------------------------------------------------------
   Pantalla encendida mientras se está en la compra
------------------------------------------------------- */
const Pantalla = { bloqueo: null, pidiendo: false, fallo: false };

function quierePantallaEncendida() {
  return PUEDE_PANTALLA && getPref('pantallaEncendida', false) &&
    vistaActual === 'compra' && document.visibilityState === 'visible';
}

async function actualizarPantallaEncendida() {
  if (!PUEDE_PANTALLA || Pantalla.pidiendo) return;

  if (quierePantallaEncendida() && !Pantalla.bloqueo) {
    Pantalla.pidiendo = true;
    try {
      const bloqueo = await navigator.wakeLock.request('screen');
      bloqueo.addEventListener('release', () => {
        if (Pantalla.bloqueo === bloqueo) Pantalla.bloqueo = null;
      });
      Pantalla.bloqueo = bloqueo;
      Pantalla.fallo = false;
    } catch (e) {
      // Sin batería suficiente o sin permiso: la app sigue igual
      Pantalla.bloqueo = null;
      Pantalla.fallo = true;
    }
    Pantalla.pidiendo = false;
  }

  // También si mientras se pedía se ha salido de la compra
  if (!quierePantallaEncendida() && Pantalla.bloqueo) {
    const bloqueo = Pantalla.bloqueo;
    Pantalla.bloqueo = null;
    bloqueo.release().catch(() => {});
  }
}

// El sistema suelta el bloqueo al cambiar de app: se pide otra vez al volver
document.addEventListener('visibilitychange', actualizarPantallaEncendida);

/* -------------------------------------------------------
   Actualizar: lo pendiente ya está guardado en el móvil y
   se sube al volver a abrir, así que recargar es seguro
------------------------------------------------------- */
async function actualizarApp() {
  aviso('Buscando la última versión…');
  try {
    const registro = await navigator.serviceWorker?.getRegistration();
    await registro?.update();
  } catch (e) { /* sin service worker: basta con recargar */ }
  setTimeout(() => location.reload(), 300);
}

registrarAcciones({
  abrirAjustes: () => abrirAjustes()
});
