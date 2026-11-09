/* =========================================================
   MÓDULO FAMILIA — FAMILIA.JS
   Sin cuentas de usuario • Sin correos • Sin contraseñas
   Una familia reúne a varias personas que comparten las
   listas de la compra, las recetas y las dietas de la semana.
   - Bienvenida: tu nombre y crear o unirte a una familia
   - Miembros: quién está, invitar, cambiar tu nombre
   - Varias familias si hace falta (casa, piso, padres…)
   - Ajustes del dispositivo (tema, copias de seguridad)
   ========================================================= */

const COLORES_AVATAR = ['#2d6a46', '#b4613f', '#4f5c86', '#9a7b2f', '#7a5a8c', '#3f7f86', '#8c4f5e'];

function colorAvatar(texto) {
  let h = 0;
  for (const ch of String(texto || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORES_AVATAR[h % COLORES_AVATAR.length];
}

function inicial(nombre) {
  return (String(nombre || '?').trim()[0] || '?').toUpperCase();
}

function htmlAvatarFamilia(f, clase = '') {
  return `<span class="avatar ${clase}" style="--color-avatar:${colorAvatar(f.codigo || f.id)}">${esc(inicial(f.nombre))}</span>`;
}

function htmlAvatarMiembro(m, clase = '') {
  return `<span class="avatar avatar-miembro ${clase}" style="--color-avatar:${colorAvatar(m.id)}" title="${esc(m.nombre)}">${esc(inicial(m.nombre))}</span>`;
}

const TEXTOS_SYNC = {
  local: 'Solo en este dispositivo',
  ok: 'Compartida y al día',
  guardando: 'Guardando cambios…',
  'sin-conexion': 'Sin conexión: se subirá al volver',
  perdida: 'Ya no existe en el servidor'
};

function textoEstadoFamilia(f) {
  if (!f.codigo) return TEXTOS_SYNC.local;
  const estado = f.id === getFamiliaActivaId() ? Sync.estado : 'ok';
  return `${TEXTOS_SYNC[estado] || TEXTOS_SYNC.ok} · código ${f.codigo}`;
}

/* -------------------------------------------------------
   Barra superior: familia activa y sus miembros
------------------------------------------------------- */
function actualizarChipFamilia() {
  const f = getFamiliaActiva();
  const cont = document.getElementById('chipFamilia');
  if (!f || !cont) return;

  cont.innerHTML = `
    <button class="chip-familia" data-accion="abrirFamilia" aria-label="Familia ${esc(f.nombre)}. ${esc(TEXTOS_SYNC[Sync.estado] || '')}. Ver miembros y ajustes">
      <span class="avatar" style="--color-avatar:${colorAvatar(f.codigo || f.id)}">
        ${esc(inicial(f.nombre))}<span class="punto-sync" data-estado="${f.codigo ? Sync.estado : 'local'}"></span>
      </span>
      <span class="chip-familia-nombre">${esc(f.nombre)}</span>
      ${ico('chevron_abajo')}
    </button>
  `;

  // Caras de la familia a la derecha (si hay más gente aparte de ti)
  const miembros = f.miembros || [];
  const derecha = document.getElementById('barraDerecha');
  derecha.innerHTML = miembros.length > 1 ? `
    <button class="pila-avatares" data-accion="abrirFamilia" aria-label="${plural(miembros.length, 'miembro')} en la familia">
      ${miembros.slice(0, 3).map(m => htmlAvatarMiembro(m)).join('')}
      ${miembros.length > 3 ? `<span class="avatar avatar-mas">+${miembros.length - 3}</span>` : ''}
    </button>` : '';
}

/* -------------------------------------------------------
   Hoja de la familia: miembros, otras familias y ajustes
------------------------------------------------------- */
function abrirFamilia() {
  const activa = getFamiliaActiva();
  const familias = getFamilias();
  const yo = getYo();
  const miembros = (activa.miembros || []).slice()
    .sort((a, b) => (a.id === yo.id ? -1 : b.id === yo.id ? 1 : (a.unidoEn || 0) - (b.unidoEn || 0)));
  const tema = getPref('tema', 'sistema');
  const otras = familias.filter(f => f.id !== activa.id);

  const d = Hoja.abrir({
    titulo: activa.nombre,
    subtitulo: textoEstadoFamilia(activa),
    cuerpo: `
      <div class="grupo-botones">
        <button class="boton boton-primario boton-pequeno" data-x="invitar">${ico('personas')}Invitar a alguien</button>
        <button class="boton boton-secundario boton-pequeno" data-x="renombrar">${ico('editar')}Renombrar</button>
      </div>

      <h3 class="titulo-seccion">Miembros <small>${miembros.length || ''}</small></h3>
      <div class="lista">
        ${miembros.map(m => `
          <div class="fila miembro-fila">
            ${htmlAvatarMiembro(m)}
            <span class="fila-texto">
              <span class="fila-titulo">${esc(m.nombre)}${m.id === yo.id ? ' <span class="etiqueta-tu">tú</span>' : ''}</span>
              ${m.unidoEn ? `<span class="fila-detalle">Desde el ${esc(new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' }).format(m.unidoEn))}</span>` : ''}
            </span>
            ${m.id === yo.id
              ? `<button class="boton-icono pequeno" data-minombre aria-label="Cambiar mi nombre" title="Cambiar mi nombre">${ico('editar')}</button>`
              : `<button class="boton-icono pequeno" data-miembro="${esc(m.id)}" aria-label="Opciones de ${esc(m.nombre)}">${ico('mas_h')}</button>`}
          </div>
        `).join('')}
        ${!yo.nombre ? `
          <button class="fila fila-anadir" data-minombre>${ico('mas')}Pon tu nombre para aparecer aquí</button>` : ''}
      </div>
      ${miembros.length < 2 ? `<p class="campo-ayuda" style="margin-top:10px">${activa.codigo
        ? 'Todavía no ha entrado nadie más. Pásales el código o el enlace de invitación.'
        : 'Ahora mismo solo estás tú. Invita a tu familia y compartiréis listas, recetas y dietas al momento.'}</p>` : ''}

      <h3 class="titulo-seccion">${otras.length ? 'Tus otras familias' : 'Otras familias'} ${otras.length ? `<small>${otras.length}</small>` : ''}</h3>
      ${otras.length ? `
        <div class="lista">
          ${otras.map(f => `
            <div class="fila familia-fila">
              <button class="familia-fila-principal" data-cambiar="${esc(f.id)}">
                ${htmlAvatarFamilia(f)}
                <span class="fila-texto">
                  <span class="fila-titulo">${esc(f.nombre)}</span>
                  <span class="fila-detalle">${f.codigo ? plural((f.miembros || []).length || 1, 'miembro') : 'Solo en este dispositivo'}</span>
                </span>
              </button>
              <button class="boton-icono pequeno" data-menu="${esc(f.id)}" aria-label="Opciones de ${esc(f.nombre)}">${ico('mas_h')}</button>
            </div>
          `).join('')}
        </div>` : '<p class="campo-ayuda" style="margin-bottom:10px">Por si también organizas otra casa: el piso, la de tus padres…</p>'}
      <div class="grupo-botones" style="margin-top:12px">
        <button class="boton boton-borde boton-pequeno" data-x="nueva">${ico('mas')}Nueva familia</button>
        <button class="boton boton-borde boton-pequeno" data-x="unirme">${ico('enlace')}Unirme con código</button>
      </div>

      <section class="ajustes-bloque">
        <h3>Apariencia</h3>
        ${htmlSegmentado('tema', [
          { valor: 'sistema', texto: 'Automático' },
          { valor: 'claro', texto: 'Claro' },
          { valor: 'oscuro', texto: 'Oscuro' }
        ], tema)}
      </section>

      <section class="ajustes-bloque">
        <h3>Datos de «${esc(activa.nombre)}»</h3>
        <div class="lista">
          <button class="fila" data-x="exportar">${ico('descargar')}<span class="fila-texto"><span class="fila-titulo">Descargar copia de seguridad</span><span class="fila-detalle">Un archivo con todo lo de esta familia</span></span></button>
          <label class="fila tocable" style="cursor:pointer">${ico('subir')}<span class="fila-texto"><span class="fila-titulo">Importar una copia</span><span class="fila-detalle">Se crea como familia nueva, sin tocar esta</span></span>
            <input type="file" accept=".json,.nutriplan,application/json" hidden data-x="importar" />
          </label>
          ${tieneEjemplos()
            ? `<button class="fila" data-x="quitarEjemplos">${ico('vaciar')}<span class="fila-texto"><span class="fila-titulo">Quitar los datos de ejemplo</span><span class="fila-detalle">Lo que hayáis creado se queda</span></span></button>`
            : `<button class="fila" data-x="ejemplos">${ico('hoja')}<span class="fila-texto"><span class="fila-titulo">Cargar datos de ejemplo</span><span class="fila-detalle">Una semana de dieta, recetas y lista fija</span></span></button>`}
          ${otras.length ? `<button class="fila peligro" data-x="salir">${ico('salir')}<span class="fila-texto"><span class="fila-titulo">${activa.codigo ? 'Salir de esta familia' : 'Borrar esta familia'}</span><span class="fila-detalle">${activa.codigo ? 'Los demás la seguirán teniendo' : 'Se borra de este dispositivo'}</span></span></button>` : ''}
        </div>
      </section>

      <p class="version-app">NutriPlan ${VERSION_APP}</p>
    `
  });

  const en = (sel, fn) => d.querySelectorAll(sel).forEach(el => el.addEventListener('click', async () => {
    await Hoja.cerrar(d);
    fn(el);
  }));

  en('[data-x="invitar"]', () => abrirInvitar(activa.id));
  en('[data-x="renombrar"]', () => abrirRenombrar());
  en('[data-x="nueva"]', () => abrirNuevaFamilia());
  en('[data-x="unirme"]', () => abrirUnirme());
  en('[data-x="exportar"]', () => descargarCopia(activa.id));
  en('[data-x="ejemplos"]', () => ACCIONES.cargarEjemplos());
  en('[data-x="quitarEjemplos"]', () => ACCIONES.quitarEjemplos());
  en('[data-x="salir"]', () => salirDeFamilia(activa.id));
  en('[data-minombre]', () => abrirMiNombre());
  en('[data-miembro]', (el) => menuMiembro(el.dataset.miembro));
  en('[data-cambiar]', (el) => cambiarAFamilia(el.dataset.cambiar));
  en('[data-menu]', (el) => menuFamilia(el.dataset.menu));

  d.querySelectorAll('input[name="tema"]').forEach(r => r.addEventListener('change', () => {
    setPref('tema', r.value);
    aplicarTema(r.value);
  }));
  d.querySelector('[data-x="importar"]').addEventListener('change', async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;
    await Hoja.cerrar(d);
    importarCopia(archivo);
  });
}

function cambiarAFamilia(id) {
  if (id === getFamiliaActivaId()) return;
  setFamiliaActivaId(id);
  asegurarMiembro(id);
  diaPlan = indiceHoy();
  refrescarApp();
  aviso(`Estás en «${getFamiliaActiva().nombre}»`);
}

function menuFamilia(id) {
  const f = getFamiliaPorId(id);
  if (!f) return;

  menuAcciones({
    titulo: f.nombre,
    subtitulo: textoEstadoFamilia(f),
    acciones: [
      { icono: 'check', texto: 'Cambiar a esta familia', fn: () => cambiarAFamilia(id) },
      { icono: 'personas', texto: 'Invitar a alguien', fn: () => abrirInvitar(id) },
      {
        icono: 'duplicar', texto: 'Duplicar', detalle: 'La copia empieza solo en este dispositivo',
        fn: () => {
          const copia = duplicarFamilia(id);
          if (copia) aviso(`Creada «${copia.nombre}»`);
        }
      },
      { icono: 'descargar', texto: 'Descargar copia de seguridad', fn: () => descargarCopia(id) },
      {
        icono: 'salir', texto: f.codigo ? 'Salir de esta familia' : 'Borrar esta familia', peligro: true,
        fn: () => salirDeFamilia(id)
      }
    ]
  });
}

async function salirDeFamilia(id) {
  const f = getFamiliaPorId(id);
  if (!f) return;
  if (getFamilias().length <= 1) {
    aviso('Es tu única familia: crea o únete a otra antes de salir', { tipo: 'error' });
    return;
  }

  const ok = await confirmar({
    titulo: f.codigo ? `¿Salir de «${f.nombre}»?` : `¿Borrar «${f.nombre}»?`,
    texto: f.codigo
      ? 'Dejarás de verla en este dispositivo y desaparecerás de sus miembros. Los demás la seguirán teniendo y podrás volver con el código.'
      : 'Se borrarán sus listas, recetas y dietas de este dispositivo. Si quieres conservarla, descarga antes una copia.',
    boton: f.codigo ? 'Salir' : 'Borrar'
  });
  if (!ok) return;

  if (f.codigo) {
    // Quitarme de los miembros y subirlo antes de borrarla aquí
    actualizarFamilia(id, { miembros: (f.miembros || []).filter(m => m.id !== getYo().id) });
    await empujarCambios(id);
  }
  eliminarFamilia(id);
  diaPlan = indiceHoy();
  refrescarApp();
  aviso(f.codigo ? `Has salido de «${f.nombre}»` : `«${f.nombre}» borrada`);
}

/* -------------------------------------------------------
   Miembros
------------------------------------------------------- */
function menuMiembro(id) {
  const m = getMiembros().find(x => x.id === id);
  if (!m) return;
  menuAcciones({
    titulo: m.nombre,
    acciones: [{
      icono: 'salir', texto: 'Quitar de la familia', peligro: true,
      detalle: 'Por si ya no la usa',
      fn: async () => {
        const ok = await confirmar({
          titulo: `¿Quitar a ${m.nombre}?`,
          texto: 'Dejará de aparecer entre los miembros. Si sigue usando la familia en su móvil, volverá a aparecer.',
          boton: 'Quitar'
        });
        if (!ok) return;
        setColeccion('miembros', getMiembros().filter(x => x.id !== id));
        refrescarApp();
        aviso(`${m.nombre} ya no aparece en la familia`);
      }
    }]
  });
}

function htmlCampoNombre(autofocus = false) {
  return `
    <label class="campo">
      <span class="campo-etiqueta">Tu nombre</span>
      <input class="entrada" name="minombre" required maxlength="40" value="${esc(getYo().nombre)}" placeholder="Así te verán los demás" autocomplete="given-name" autocapitalize="words" ${autofocus ? 'autofocus' : ''} />
    </label>
  `;
}

function abrirMiNombre() {
  Hoja.abrir({
    titulo: 'Tu nombre',
    subtitulo: 'Es como te verán en todas tus familias',
    cuerpo: `<form id="formMiNombre" novalidate>${htmlCampoNombre(true)}</form>`,
    pie: `
      <button type="button" class="boton boton-secundario" data-cerrar-hoja>Cancelar</button>
      <button type="submit" form="formMiNombre" class="boton boton-primario">Guardar</button>
    `,
    alAbrir: (d) => {
      const form = d.querySelector('form');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const nombre = form.minombre.value.trim();
        if (!nombre) return form.minombre.focus();
        setMiNombre(nombre);
        Hoja.cerrar(d);
        refrescarApp();
        aviso(`Hola, ${nombre}`);
      });
    }
  });
}

/* -------------------------------------------------------
   Invitar
------------------------------------------------------- */
function enlaceInvitacion(codigo) {
  return `${location.origin}${location.pathname}?familia=${encodeURIComponent(codigo)}`;
}

async function abrirInvitar(id) {
  let f = getFamiliaPorId(id);
  if (!f) return;

  // Una familia local se registra en el servidor la primera vez que se invita
  if (!f.codigo) {
    try {
      f = await convertirEnCompartida(id);
      refrescarApp();
    } catch (e) {
      aviso('No se ha podido conectar con el servidor. Inténtalo con conexión.', { tipo: 'error' });
      return;
    }
  }
  const enlace = enlaceInvitacion(f.codigo);

  const d = Hoja.abrir({
    titulo: 'Invitar a la familia',
    subtitulo: f.nombre,
    cuerpo: `
      <p class="campo-ayuda" style="font-size:14.5px">Quien abra el enlace o escriba el código entrará en «${esc(f.nombre)}»: veréis la misma compra, las recetas y las dietas, y los cambios de cada uno al momento. No hace falta cuenta.</p>
      <span class="codigo-grande" aria-label="Código ${esc(f.codigo.split('').join(' '))}">${esc(f.codigo)}</span>
      <div class="grupo-botones">
        <button class="boton boton-primario" style="flex:1" data-x="enlace">${ico('compartir')}Enviar invitación</button>
        <button class="boton boton-secundario" style="flex:1" data-x="codigo">${ico('copiar')}Copiar código</button>
      </div>
    `
  });

  d.querySelector('[data-x="enlace"]').addEventListener('click', () => {
    const quien = getYo().nombre;
    compartirTexto(`NutriPlan · ${f.nombre}`,
      `${quien ? `${quien} te invita` : 'Te invitan'} a «${f.nombre}» en NutriPlan para compartir la compra, las recetas y las dietas de la semana:\n${enlace}\n\nO entra con el código ${f.codigo}`);
  });
  d.querySelector('[data-x="codigo"]').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(f.codigo);
      aviso(`Código ${f.codigo} copiado`);
    } catch (e) {
      aviso(`El código es ${f.codigo}`);
    }
  });
}

/* -------------------------------------------------------
   Crear, renombrar y unirse
------------------------------------------------------- */
function abrirNuevaFamilia() {
  const sinNombre = !getYo().nombre;
  Hoja.abrir({
    titulo: 'Nueva familia',
    subtitulo: 'Con sus propias listas, recetas y dietas',
    cuerpo: `
      <form id="formNuevaFamilia" novalidate>
        ${sinNombre ? htmlCampoNombre(true) : ''}
        <label class="campo">
          <span class="campo-etiqueta">Nombre de la familia</span>
          <input class="entrada" name="nombre" required maxlength="60" placeholder="Ej.: Los García, El piso, Casa de mis padres" ${sinNombre ? '' : 'autofocus'} autocapitalize="sentences" />
        </label>
        <div class="campo">
          <span class="campo-etiqueta">¿La vas a compartir?</span>
          ${htmlSegmentado('modo', [
            { valor: 'compartida', texto: 'Sí, con más gente' },
            { valor: 'local', texto: 'De momento, no' }
          ], 'compartida')}
        </div>
      </form>
    `,
    pie: `
      <button type="button" class="boton boton-secundario" data-cerrar-hoja>Cancelar</button>
      <button type="submit" form="formNuevaFamilia" class="boton boton-primario">Crear</button>
    `,
    alAbrir: (d) => {
      const form = d.querySelector('form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const v = valoresFormulario(form);
        if (sinNombre && !v.minombre) return form.minombre.focus();
        if (!v.nombre) return form.nombre.focus();
        if (sinNombre) setMiNombre(v.minombre);

        const boton = d.querySelector('button[type="submit"]');
        boton.disabled = true;
        boton.textContent = 'Creando…';
        const { familia, sinServidor } = await crearNuevaFamilia(v.nombre, '', v.modo === 'compartida');
        await Hoja.cerrar(d);
        diaPlan = indiceHoy();
        refrescarApp();

        if (familia.codigo) abrirInvitar(familia.id);
        else if (sinServidor) aviso('Creada solo en este dispositivo: no hay conexión con el servidor. Podrás invitar después.');
        else aviso(`Familia «${familia.nombre}» creada`);
      });
    }
  });
}

function abrirRenombrar() {
  const f = getFamiliaActiva();
  Hoja.abrir({
    titulo: 'Renombrar familia',
    cuerpo: `
      <form id="formRenombrar" novalidate>
        <label class="campo">
          <span class="campo-etiqueta">Nombre</span>
          <input class="entrada" name="nombre" required maxlength="60" value="${esc(f.nombre)}" autocapitalize="sentences" />
        </label>
        ${f.codigo ? '<p class="campo-ayuda">El nuevo nombre lo verá toda la familia.</p>' : ''}
      </form>
    `,
    pie: `
      <button type="button" class="boton boton-secundario" data-cerrar-hoja>Cancelar</button>
      <button type="submit" form="formRenombrar" class="boton boton-primario">Guardar</button>
    `,
    alAbrir: (d) => {
      const form = d.querySelector('form');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const nombre = form.nombre.value.trim();
        if (!nombre) return form.nombre.focus();
        renombrarFamiliaActiva(nombre, f.descripcion);
        Hoja.cerrar(d);
        refrescarApp();
      });
    }
  });
}

// Saca el código de un texto que puede ser el código o un enlace completo
function extraerCodigo(texto) {
  const t = String(texto || '').trim();
  const m = t.match(/[?&#](?:familia|partida|unirse)=([A-Za-z0-9]+)/);
  return (m ? m[1] : t).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

function htmlCampoCodigo(autofocus = true) {
  return `
    <label class="campo">
      <span class="campo-etiqueta">Código o enlace</span>
      <input class="entrada entrada-codigo" name="codigo" required placeholder="Ej.: CASA24" ${autofocus ? 'autofocus' : ''} autocapitalize="characters" autocorrect="off" spellcheck="false" />
      <span class="campo-ayuda">Te lo pasa alguien que ya está en la familia.</span>
    </label>
  `;
}

// Busca la sala y entra; devuelve true si lo consigue
async function unirseConCodigo(texto, boton) {
  const codigo = extraerCodigo(texto);
  if (codigo.length < 4) {
    aviso('Ese código no parece correcto', { tipo: 'error' });
    return false;
  }
  const original = boton.textContent;
  boton.disabled = true;
  boton.textContent = 'Conectando…';
  try {
    entrarEnSala(await obtenerSala(codigo));
    return true;
  } catch (err) {
    aviso(err.message, { tipo: 'error' });
    boton.disabled = false;
    boton.textContent = original;
    return false;
  }
}

function abrirUnirme() {
  const sinNombre = !getYo().nombre;
  Hoja.abrir({
    titulo: 'Unirme a una familia',
    cuerpo: `
      <form id="formUnirme" novalidate>
        ${sinNombre ? htmlCampoNombre(true) : ''}
        ${htmlCampoCodigo(!sinNombre)}
      </form>
    `,
    pie: `
      <button type="button" class="boton boton-secundario" data-cerrar-hoja>Cancelar</button>
      <button type="submit" form="formUnirme" class="boton boton-primario">Entrar</button>
    `,
    alAbrir: (d) => {
      const form = d.querySelector('form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (sinNombre && !form.minombre.value.trim()) return form.minombre.focus();
        if (sinNombre) setMiNombre(form.minombre.value);
        const ok = await unirseConCodigo(form.codigo.value, d.querySelector('button[type="submit"]'));
        if (ok) Hoja.cerrar(d);
      });
    }
  });
}

function entrarEnSala(sala) {
  const f = incorporarSala(sala);
  quitarFamiliaInicialVacia();
  diaPlan = indiceHoy();
  refrescarApp();
  aviso(`Ya estás en «${f.nombre}». Lo que hagáis se verá en todos los móviles.`);
}

/* -------------------------------------------------------
   Bienvenida (primera vez) y aviso del cambio a familias
------------------------------------------------------- */
function mostrarBienvenidaSiHaceFalta(primeraVez) {
  // Se recuerda por si se recarga la página a mitad de la bienvenida
  if (primeraVez) {
    setPref('bienvenidaPendiente', true);
    setPref('avisoFamilias', true);
  }
  if (getYo().nombre && !getPref('bienvenidaPendiente')) return;
  if (getPref('bienvenidaPendiente')) abrirBienvenida();
  else if (!getPref('avisoFamilias')) abrirAvisoFamilias();
}

function abrirBienvenida() {
  const pasos = {
    nombre: () => `
      <div class="bienvenida">
        <img class="bienvenida-icono" src="iconos/icono.svg" alt="" width="64" height="64" />
        <h2 class="bienvenida-titulo">Las comidas de casa, organizadas entre todos</h2>
        <p class="bienvenida-texto">La compra, las recetas y las dietas de la semana, compartidas con tu familia y al día en todos los móviles.</p>
        <form data-paso="nombre" novalidate>
          ${htmlCampoNombre(true).replace('Tu nombre', '¿Cómo te llamas?')}
          <button type="submit" class="boton boton-primario boton-bloque">Continuar</button>
        </form>
      </div>
    `,
    modo: () => `
      <div class="bienvenida">
        <h2 class="bienvenida-titulo">Hola, ${esc(getYo().nombre)}. ¿Cómo empezamos?</h2>
        <div class="opciones-inicio">
          <button class="opcion-inicio" data-ir="crear">
            ${ico('personas')}
            <span><strong>Crear nuestra familia</strong><small>Después invitas a los tuyos con un enlace.</small></span>
            ${ico('chevron_der', 'ico-final')}
          </button>
          <button class="opcion-inicio" data-ir="unirme">
            ${ico('enlace')}
            <span><strong>Unirme a una familia</strong><small>Alguien de casa ya la ha creado y te ha pasado el código.</small></span>
            ${ico('chevron_der', 'ico-final')}
          </button>
          <button class="opcion-inicio" data-ir="solo">
            ${ico('hoja')}
            <span><strong>Probarla yo solo</strong><small>Podrás invitar a tu familia cuando quieras.</small></span>
            ${ico('chevron_der', 'ico-final')}
          </button>
        </div>
      </div>
    `,
    crear: () => `
      <div class="bienvenida">
        <button type="button" class="boton boton-texto bienvenida-atras" data-ir="modo">${ico('chevron_izq')}Atrás</button>
        <h2 class="bienvenida-titulo">¿Cómo se llama vuestra familia?</h2>
        <form data-paso="crear" novalidate>
          <label class="campo">
            <span class="campo-etiqueta">Nombre</span>
            <input class="entrada" name="familia" required maxlength="60" placeholder="Ej.: Los García, El piso" autofocus autocapitalize="sentences" />
          </label>
          <button type="submit" class="boton boton-primario boton-bloque">Crear familia</button>
        </form>
      </div>
    `,
    invitar: () => {
      const f = getFamiliaActiva();
      return `
        <div class="bienvenida">
          <h2 class="bienvenida-titulo">Listo. Ahora, que entren los demás</h2>
          <p class="bienvenida-texto">Mándales la invitación o diles este código.</p>
          <span class="codigo-grande">${esc(f.codigo)}</span>
          <div class="grupo-botones">
            <button type="button" class="boton boton-primario" style="flex:1" data-x="enviar">${ico('compartir')}Enviar invitación</button>
            <button type="button" class="boton boton-secundario" style="flex:1" data-x="empezar">Empezar</button>
          </div>
        </div>
      `;
    },
    unirme: () => `
      <div class="bienvenida">
        <button type="button" class="boton boton-texto bienvenida-atras" data-ir="modo">${ico('chevron_izq')}Atrás</button>
        <h2 class="bienvenida-titulo">Unirme a una familia</h2>
        <form data-paso="unirme" novalidate>
          ${htmlCampoCodigo(true)}
          <button type="submit" class="boton boton-primario boton-bloque">Entrar</button>
        </form>
      </div>
    `
  };

  const d = Hoja.abrir({
    clase: 'hoja-bienvenida',
    etiqueta: 'Bienvenida',
    bloqueada: true,
    cuerpo: '',
    alCerrar: () => setPref('bienvenidaPendiente', false)
  });
  const cuerpo = d.querySelector('.hoja-cuerpo');

  const ir = (paso) => {
    cuerpo.innerHTML = pasos[paso]();
    cuerpo.scrollTop = 0;
    const foco = cuerpo.querySelector('[autofocus]');
    if (foco) setTimeout(() => foco.focus(), 60);
  };
  const pasoInicial = getYo().nombre ? 'modo' : 'nombre';

  cuerpo.addEventListener('click', async (e) => {
    const destino = e.target.closest('[data-ir]');
    if (destino) {
      if (destino.dataset.ir === 'solo') {
        await Hoja.cerrar(d, { forzar: true });
        refrescarApp();
        aviso('Cuando quieras compartirla, toca el nombre de la familia arriba');
        return;
      }
      ir(destino.dataset.ir);
      return;
    }
    if (e.target.closest('[data-x="enviar"]')) ACCIONES.invitarActiva();
    if (e.target.closest('[data-x="empezar"]')) {
      await Hoja.cerrar(d, { forzar: true });
      refrescarApp();
    }
  });

  cuerpo.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const boton = form.querySelector('button[type="submit"]');

    if (form.dataset.paso === 'nombre') {
      if (!form.minombre.value.trim()) return form.minombre.focus();
      setMiNombre(form.minombre.value);
      ir('modo');
    }

    if (form.dataset.paso === 'crear') {
      const nombre = form.familia.value.trim();
      if (!nombre) return form.familia.focus();
      boton.disabled = true;
      boton.textContent = 'Creando…';
      // La familia vacía del primer arranque pasa a ser la vuestra
      renombrarFamiliaActiva(nombre, '');
      try {
        await convertirEnCompartida(getFamiliaActivaId());
        refrescarApp();
        ir('invitar');
      } catch (err) {
        await Hoja.cerrar(d, { forzar: true });
        refrescarApp();
        aviso('Familia creada solo en este dispositivo: no hay conexión. Podrás invitar después.');
      }
    }

    if (form.dataset.paso === 'unirme') {
      const ok = await unirseConCodigo(form.codigo.value, boton);
      if (ok) await Hoja.cerrar(d, { forzar: true });
    }
  });

  ir(pasoInicial);
}

function abrirAvisoFamilias() {
  setPref('avisoFamilias', true);
  const d = Hoja.abrir({
    clase: 'hoja-alerta',
    etiqueta: 'Novedad',
    cuerpo: `
      <p class="antetitulo">Novedad</p>
      <h2 class="alerta-titulo">Ahora NutriPlan va por familias</h2>
      <p class="alerta-texto">Tus partidas se han convertido en familias con todo lo que tenían. Cada familia reúne la compra, las recetas y las dietas, y ves quién está dentro y quién añade cada cosa.</p>
      <form id="formAvisoFamilias" novalidate style="margin-top:16px">${htmlCampoNombre(false)}</form>
    `,
    pie: `
      <button type="button" class="boton boton-secundario" data-cerrar-hoja>Ahora no</button>
      <button type="submit" form="formAvisoFamilias" class="boton boton-primario">Guardar</button>
    `
  });
  d.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = e.target.minombre.value.trim();
    if (!nombre) return e.target.minombre.focus();
    setMiNombre(nombre);
    Hoja.cerrar(d);
    refrescarApp();
    aviso(`Hola, ${nombre}`);
  });
}

/* -------------------------------------------------------
   Invitación por enlace (?familia=CASA24)
   Devuelve true si se ha entrado (o ya se estaba) en la familia
------------------------------------------------------- */
async function verificarParametroFamiliaURL() {
  const params = new URLSearchParams(location.search);
  let codigo = params.get('familia') || params.get('partida') || params.get('unirse') || '';
  if (!codigo && /(familia|partida)=/.test(location.hash)) codigo = location.hash.split('=')[1];
  codigo = extraerCodigo(codigo);
  if (!codigo) return false;

  // Limpiar la URL para no repetirlo al recargar
  history.replaceState(null, document.title, location.pathname);

  const yaLaTengo = getFamilias().find(f => f.codigo === codigo);
  if (yaLaTengo) {
    cambiarAFamilia(yaLaTengo.id);
    return true;
  }

  let sala;
  try {
    sala = await obtenerSala(codigo);
  } catch (err) {
    aviso(err.message, { tipo: 'error' });
    return false;
  }

  const miembros = sala.miembros || [];
  const sinNombre = !getYo().nombre;
  const nombresDentro = miembros.slice(0, 2).map(m => m.nombre);
  const textoMiembros = !miembros.length ? ''
    : miembros.length <= 2 ? `${nombresDentro.join(' y ')} ${miembros.length === 1 ? 'ya está' : 'ya están'} dentro.`
      : `${nombresDentro.join(', ')} y ${plural(miembros.length - 2, 'persona')} más ya están dentro.`;

  return new Promise(resolve => {
    let unido = false;
    const d = Hoja.abrir({
      clase: 'hoja-alerta',
      etiqueta: 'Invitación',
      cuerpo: `
        <div class="invitacion">
          <p class="antetitulo">Te han invitado a</p>
          <h2 class="alerta-titulo">${esc(sala.nombre)}</h2>
          ${miembros.length ? `
            <div class="invitacion-miembros">
              <span class="pila-avatares">${miembros.slice(0, 4).map(m => htmlAvatarMiembro(m)).join('')}</span>
              <span>${esc(textoMiembros)}</span>
            </div>` : ''}
          <div class="invitacion-cifras">
            <span>${plural((sala.dietas || []).length, 'dieta')}</span>
            <span>${plural((sala.comidas || []).length, 'receta')}</span>
            <span>${plural((sala.rapida || []).length + (sala.compra || []).length, 'producto')} en la compra</span>
          </div>
          <form id="formInvitacion" novalidate>${sinNombre ? htmlCampoNombre(false) : ''}</form>
        </div>
      `,
      pie: `
        <button type="button" class="boton boton-secundario" data-cerrar-hoja>Ahora no</button>
        <button type="submit" form="formInvitacion" class="boton boton-primario">Unirme</button>
      `,
      alCerrar: () => resolve(unido)
    });

    d.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (sinNombre) {
        if (!e.target.minombre.value.trim()) return e.target.minombre.focus();
        setMiNombre(e.target.minombre.value);
      }
      unido = true;
      await Hoja.cerrar(d);
      entrarEnSala(sala);
    });
  });
}

/* -------------------------------------------------------
   Copias de seguridad
------------------------------------------------------- */
function descargarCopia(id) {
  const datos = exportarFamilia(id);
  if (!datos) return;
  const nombre = normalizar(datos.familia.nombre).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'familia';
  const fecha = new Date().toISOString().split('T')[0];
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nutriplan-${nombre}-${fecha}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  aviso('Copia descargada');
}

async function importarCopia(archivo) {
  try {
    const datos = leerCopiaSeguridad(await archivo.text());
    const { familia } = await crearNuevaFamilia(
      `${datos.nombre || 'Familia'} (importada)`,
      datos.descripcion || '',
      false,
      {
        dietas: datos.dietas || [],
        comidas: datos.comidas || [],
        compra: datos.compra || [],
        rapida: datos.rapida || [],
        historial: datos.historial || []
      }
    );
    diaPlan = indiceHoy();
    refrescarApp();
    aviso(`Importada como «${familia.nombre}»`);
  } catch (e) {
    aviso(e instanceof SyntaxError ? 'El archivo está dañado o no es JSON' : e.message, { tipo: 'error' });
  }
}

/* -------------------------------------------------------
   Acciones registradas
------------------------------------------------------- */
registrarAcciones({
  abrirFamilia: () => abrirFamilia(),
  invitarActiva: () => {
    const f = getFamiliaActiva();
    compartirTexto(`NutriPlan · ${f.nombre}`,
      `${getYo().nombre || 'Te invitan'}${getYo().nombre ? ' te invita' : ''} a «${f.nombre}» en NutriPlan para compartir la compra, las recetas y las dietas de la semana:\n${enlaceInvitacion(f.codigo)}\n\nO entra con el código ${f.codigo}`);
  }
});
