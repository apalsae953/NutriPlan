/* =========================================================
   CAPA DE PERSISTENCIA Y SINCRONIZACIÓN — STORAGE.JS
   Sin cuentas de usuario, sin contraseñas, sin correos.
   Cada familia tiene sus listas de la compra, recetas, dietas
   y miembros.
   - Si la familia es local: se guarda en LocalStorage.
   - Si tiene código y hay servidor (server.py): se sincroniza en
     vivo con todas las personas que tengan el código.
   - Si tiene código pero la web no tiene servidor (p. ej. en
     Vercel): el código lo genera el navegador y la familia viaja
     dentro del enlace de invitación. Al abrir un enlace de una
     familia que ya tienes, se juntan los cambios de los dos.

   Cómo se evitan pérdidas cuando dos personas editan a la vez:
   cada familia guarda una "base" (lo último que se sabe que hay en el
   servidor). Al recibir cambios remotos se hace una fusión a tres
   bandas elemento a elemento: lo que cambiaste tú se respeta, lo que
   cambiaron los demás también.
   ========================================================= */

const STORAGE_KEYS = {
  familias:         'nutriplan_partidas_v2',
  familiaActivaId:  'nutriplan_partida_activa_id',
  version:          'nutriplan_version',
  prefs:            'nutriplan_prefs',
  // Claves heredadas para migración de datos previos
  dietasLegacy:     'nutriplan_dietas',
  comidasLegacy:    'nutriplan_comidas',
  compraLegacy:     'nutriplan_compra'
};

const VERSION_APP = '3.4.0';

// Colecciones de cada familia que se sincronizan
const COLECCIONES = ['dietas', 'comidas', 'compra', 'rapida', 'historial', 'miembros'];

let cacheFamilias = null;

/* -------------------------------------------------------
   Inicialización y migración automática
   Devuelve true si es la primera vez que se abre la app
------------------------------------------------------- */
function inicializarStorage() {
  let familias = getFamilias();
  const primeraVez = !familias.length && !localStorage.getItem(STORAGE_KEYS.dietasLegacy);

  // Primera vez: crear la familia principal rescatando datos antiguos
  if (!familias.length) {
    const leer = (clave) => {
      try { return JSON.parse(localStorage.getItem(clave)) || []; } catch (e) { return []; }
    };

    familias = [{
      id: 'familia_principal',
      codigo: '',
      nombre: 'Mi familia',
      descripcion: '',
      creadaEn: Date.now(),
      versionRemota: 1,
      dietas: leer(STORAGE_KEYS.dietasLegacy),
      comidas: leer(STORAGE_KEYS.comidasLegacy),
      compra: leer(STORAGE_KEYS.compraLegacy),
      rapida: [],
      historial: [],
      miembros: []
    }];
  }

  familias.forEach(normalizarFamilia);
  setFamilias(familias);

  const activaId = getFamiliaActivaId();
  if (!activaId || !familias.some(p => p.id === activaId)) {
    localStorage.setItem(STORAGE_KEYS.familiaActivaId, familias[0].id);
  }

  localStorage.setItem(STORAGE_KEYS.version, VERSION_APP);
  familias.forEach(f => asegurarMiembro(f.id));
  return primeraVez;
}

function normalizarFamilia(p) {
  COLECCIONES.forEach(col => {
    if (!Array.isArray(p[col])) p[col] = [];
  });
  if (typeof p.cambios !== 'number') p.cambios = 0;
  if (p.descripcion === undefined) p.descripcion = '';
  // Familias compartidas de versiones anteriores: su estado actual es la base
  if (p.codigo && !p.base) {
    p.base = instantanea(p);
    p.pendiente = false;
  }
  delete p.ejemplosCargados;
  return p;
}

// Copia de lo que se sincroniza (nombre, descripción y colecciones)
function instantanea(p) {
  const s = { nombre: p.nombre || '', descripcion: p.descripcion || '' };
  COLECCIONES.forEach(col => { s[col] = clonar(p[col] || []); });
  return s;
}

/* -------------------------------------------------------
   Gestión de Familias (colección completa)
------------------------------------------------------- */
function getFamilias() {
  if (!cacheFamilias) {
    try {
      cacheFamilias = JSON.parse(localStorage.getItem(STORAGE_KEYS.familias)) || [];
    } catch (e) {
      console.error('Error leyendo familias:', e);
      cacheFamilias = [];
    }
  }
  return cacheFamilias;
}

function setFamilias(lista) {
  cacheFamilias = lista;
  try {
    localStorage.setItem(STORAGE_KEYS.familias, JSON.stringify(lista));
  } catch (e) {
    console.error('Error guardando familias:', e);
    aviso('No se ha podido guardar: el almacenamiento del navegador está lleno', { tipo: 'error' });
  }
}

function guardarFamilias() {
  setFamilias(getFamilias());
}

function getFamiliaPorId(id) {
  return getFamilias().find(p => p.id === id) || null;
}

function getFamiliaActivaId() {
  return localStorage.getItem(STORAGE_KEYS.familiaActivaId) || '';
}

function setFamiliaActivaId(id) {
  localStorage.setItem(STORAGE_KEYS.familiaActivaId, id);
  estadoSyncSegunFamilia();
  sondearRemoto();
}

function getFamiliaActiva() {
  const familias = getFamilias();
  return familias.find(p => p.id === getFamiliaActivaId()) || familias[0] || null;
}

/*
  Aplica cambios a una familia (por defecto, la activa).
  sincronizar=false se usa para metadatos locales que no deben subirse.
*/
function actualizarFamilia(id, datos, sincronizar = true) {
  const p = getFamiliaPorId(id);
  if (!p) return;
  if (p.registrada === false) anotarBorrados(p, datos);
  Object.assign(p, datos);
  if (sincronizar) {
    p.cambios = (p.cambios || 0) + 1;
    if (sincronizable(p)) p.pendiente = true;
  }
  guardarFamilias();
  if (sincronizar && sincronizable(p)) programarSincronizacion(450, id);
}

// Los miembros no se apuntan: quien vuelve a entrar tiene que poder aparecer
const COLECCIONES_CON_BORRADOS = ['dietas', 'comidas', 'compra', 'rapida'];

// Familia que se sincroniza en vivo con el servidor
function sincronizable(p) {
  return !!(p && p.codigo && p.registrada !== false);
}

/*
  En las familias que se comparten por enlace se apunta qué se
  borra, para que al juntar dos copias no vuelva a aparecer.
  Si se deshace el borrado, deja de estar apuntado.
*/
function anotarBorrados(p, datos) {
  COLECCIONES_CON_BORRADOS.forEach(col => {
    if (!Array.isArray(datos[col])) return;
    const ahora = new Set(datos[col].map(x => x && x.id));
    const antes = (p.borrados && p.borrados[col]) || [];
    const quitados = (p[col] || []).map(x => x && x.id).filter(x => x != null && !ahora.has(x));
    const recuperados = antes.some(x => ahora.has(x));
    if (!quitados.length && !recuperados) return;
    p.borrados = { ...(p.borrados || {}), [col]: [...antes.filter(x => !ahora.has(x)), ...quitados].slice(-400) };
  });
}

function actualizarFamiliaActiva(datos, sincronizar = true) {
  const p = getFamiliaActiva();
  if (p) actualizarFamilia(p.id, datos, sincronizar);
}

// Otra pestaña del mismo navegador cambió los datos
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEYS.familias || e.key === STORAGE_KEYS.familiaActivaId) {
    cacheFamilias = null;
    if (typeof refrescarApp === 'function') refrescarApp();
  }
});

/* -------------------------------------------------------
   Preferencias del dispositivo (no se sincronizan)
------------------------------------------------------- */
function getPrefs() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.prefs)) || {};
  } catch (e) {
    return {};
  }
}

function getPref(clave, porDefecto = null) {
  const v = getPrefs()[clave];
  return v === undefined ? porDefecto : v;
}

function setPref(clave, valor) {
  const prefs = getPrefs();
  prefs[clave] = valor;
  try {
    localStorage.setItem(STORAGE_KEYS.prefs, JSON.stringify(prefs));
  } catch (e) { /* sin espacio: no es crítico */ }
}

/* =========================================================
   QUIÉN USA ESTE DISPOSITIVO Y MIEMBROS DE LA FAMILIA
   Sin cuentas: cada dispositivo tiene un identificador y el
   nombre que pone su dueño. Al entrar en una familia se añade
   a su lista de miembros.
   ========================================================= */
function getYo() {
  let yo = getPref('yo', null);
  if (!yo || !yo.id) {
    yo = { id: generarId('miembro'), nombre: '' };
    setPref('yo', yo);
  }
  return yo;
}

function setMiNombre(nombre) {
  setPref('yo', { ...getYo(), nombre: String(nombre || '').trim().slice(0, 40) });
  getFamilias().forEach(f => asegurarMiembro(f.id));
}

// Me añade a la familia (o actualiza mi nombre) si hace falta
function asegurarMiembro(id = getFamiliaActivaId()) {
  const yo = getYo();
  const f = getFamiliaPorId(id);
  if (!yo.nombre || !f) return;
  const miembros = f.miembros || [];
  const yoAhi = miembros.find(m => m.id === yo.id);
  if (yoAhi && yoAhi.nombre === yo.nombre) return;

  actualizarFamilia(id, {
    miembros: yoAhi
      ? miembros.map(m => (m.id === yo.id ? { ...m, nombre: yo.nombre } : m))
      : [...miembros, { id: yo.id, nombre: yo.nombre, unidoEn: Date.now() }]
  });
}

const getMiembros = () => getColeccion('miembros');

function nombreMiembro(id) {
  if (!id) return '';
  const m = getMiembros().find(x => x.id === id);
  return m ? m.nombre : '';
}

// Nombre de quien hizo algo; vacío si fui yo o si no hay más gente
function autorVisible(id) {
  if (!id || id === getYo().id || getMiembros().length < 2) return '';
  return nombreMiembro(id);
}

/* =========================================================
   SINCRONIZACIÓN
   ========================================================= */
const Sync = {
  estado: 'local',      // local | ok | guardando | sin-conexion | perdida
  enCurso: false,
  repetir: false,
  tGuardar: null,
  tReintento: null,
  tSondeo: null,
  porSubir: new Set()
};

function fijarEstadoSync(estado) {
  if (Sync.estado === estado) return;
  Sync.estado = estado;
  document.dispatchEvent(new CustomEvent('sync-estado', { detail: estado }));
}

function estadoSyncSegunFamilia() {
  const p = getFamiliaActiva();
  if (!p || !p.codigo) return fijarEstadoSync('local');
  if (!sincronizable(p)) return fijarEstadoSync('enlace');
  if (p.pendiente) return fijarEstadoSync(navigator.onLine === false ? 'sin-conexion' : 'guardando');
  fijarEstadoSync('ok');
}

function programarSincronizacion(retraso = 450, id = getFamiliaActivaId()) {
  Sync.porSubir.add(id);
  clearTimeout(Sync.tGuardar);
  if (Sync.estado !== 'sin-conexion' && id === getFamiliaActivaId()) fijarEstadoSync('guardando');
  Sync.tGuardar = setTimeout(async () => {
    const ids = [...Sync.porSubir];
    Sync.porSubir.clear();
    for (const x of ids) await empujarCambios(x);
  }, retraso);
}

/* -------------------------------------------------------
   Subir cambios locales (con control de versión)
------------------------------------------------------- */
async function empujarCambios(id = getFamiliaActivaId()) {
  const p = getFamiliaPorId(id);
  if (!sincronizable(p) || !p.pendiente) {
    estadoSyncSegunFamilia();
    return;
  }
  if (Sync.enCurso) {
    Sync.repetir = true;
    return;
  }

  Sync.enCurso = true;
  clearTimeout(Sync.tReintento);
  const cambiosEnviados = p.cambios;
  const enviado = instantanea(p);

  try {
    const r = await API.guardar(p.codigo, p.versionRemota || 1, enviado);
    const actual = getFamiliaPorId(id);
    if (!actual) return;

    if (r.estado === 'conflicto') {
      // Otra persona guardó antes: fusionar y volver a intentar
      fusionarConRemoto(actual, r.sala);
      guardarFamilias();
      if (id === getFamiliaActivaId()) refrescarDesdeSync();
      Sync.repetir = actual.pendiente;
    } else if (r.estado === 'ok') {
      actual.base = enviado;
      actual.versionRemota = r.version;
      if (actual.cambios === cambiosEnviados) actual.pendiente = false;
      else Sync.repetir = true;
      guardarFamilias();
      if (id === getFamiliaActivaId()) estadoSyncSegunFamilia();
    } else if (id === getFamiliaActivaId()) {
      fijarEstadoSync('perdida');
    }
  } catch (e) {
    if (id === getFamiliaActivaId()) fijarEstadoSync('sin-conexion');
    Sync.tReintento = setTimeout(() => empujarCambios(id), 6000);
  } finally {
    Sync.enCurso = false;
    if (Sync.repetir) {
      Sync.repetir = false;
      setTimeout(() => empujarCambios(id), 0);
    }
  }
}

// Al recuperar conexión o al cerrar la app, subir lo que quede pendiente
function empujarPendientes() {
  getFamilias()
    .filter(p => sincronizable(p) && p.pendiente)
    .forEach(p => empujarCambios(p.id));
}

/* -------------------------------------------------------
   Sondeo ligero de cambios remotos
------------------------------------------------------- */
async function sondearRemoto() {
  if (document.hidden || Sync.enCurso) return;
  const p = getFamiliaActiva();
  if (!sincronizable(p)) return;

  try {
    const version = await API.version(p.codigo);
    if (version === null) {
      fijarEstadoSync('perdida');
      return;
    }
    if (version > (p.versionRemota || 0)) {
      await traerRemoto(p.id);
    } else if (p.pendiente) {
      if (Sync.estado === 'sin-conexion') empujarCambios(p.id);
    } else {
      fijarEstadoSync('ok');
    }
  } catch (e) {
    fijarEstadoSync('sin-conexion');
  }
}

async function traerRemoto(id) {
  const p = getFamiliaPorId(id);
  if (!sincronizable(p)) return;

  const sala = await API.obtener(p.codigo).catch(() => null);
  if (!sala) return;
  if (Sync.enCurso) return; // Hay una subida en marcha; el próximo sondeo lo resolverá

  const actual = getFamiliaPorId(id);
  if (!actual) return;
  fusionarConRemoto(actual, sala);
  guardarFamilias();

  if (id === getFamiliaActivaId()) refrescarDesdeSync();
  if (actual.pendiente) programarSincronizacion(50);
  else estadoSyncSegunFamilia();
}

function refrescarDesdeSync() {
  if (typeof refrescarApp === 'function') refrescarApp({ remoto: true });
}

function iniciarSincronizacion() {
  clearInterval(Sync.tSondeo);
  Sync.tSondeo = setInterval(sondearRemoto, 2500);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Intentar dejar subido lo pendiente antes de que el sistema congele la app
      getFamilias().filter(p => sincronizable(p) && p.pendiente).forEach(p => {
        API.guardarAlCerrar(p.codigo, p.versionRemota || 1, instantanea(p));
      });
    } else {
      sondearRemoto();
    }
  });

  window.addEventListener('online', empujarPendientes);
  window.addEventListener('offline', () => {
    if (sincronizable(getFamiliaActiva())) fijarEstadoSync('sin-conexion');
  });

  window.addEventListener('online', subirFamiliasPorEnlace);

  estadoSyncSegunFamilia();
  empujarPendientes();
  sondearRemoto();
  subirFamiliasPorEnlace();
}

/* -------------------------------------------------------
   Fusión a tres bandas
------------------------------------------------------- */
function fusionarConRemoto(p, sala) {
  const base = p.base || {};
  COLECCIONES.forEach(col => {
    const remoto = Array.isArray(sala[col]) ? sala[col] : [];
    p[col] = fusionarListas(base[col] || [], p[col] || [], remoto);
  });

  // Nombre y descripción: si no los cambiaste tú, manda el remoto
  if (!p.base || p.nombre === base.nombre) p.nombre = sala.nombre || p.nombre;
  if (!p.base || p.descripcion === base.descripcion) p.descripcion = sala.descripcion || '';

  p.base = instantanea({ ...sala, nombre: sala.nombre || '', descripcion: sala.descripcion || '' });
  p.versionRemota = sala.version;
  p.pendiente = !iguales(instantanea(p), p.base);
}

function fusionarListas(base, local, remoto) {
  const porId = (lista) => new Map(lista.filter(x => x && x.id != null).map(x => [x.id, x]));
  const mBase = porId(base);
  const mLocal = porId(local);
  const mRemoto = porId(remoto);
  const resultado = [];

  remoto.forEach(r => {
    if (!r || r.id == null) return;
    const b = mBase.get(r.id);
    const l = mLocal.get(r.id);
    if (l) {
      // Existe en los dos lados: si lo cambiaste tú, gana tu versión
      resultado.push(!b || !iguales(b, l) ? l : r);
    } else if (!b || !iguales(b, r)) {
      // Nuevo en remoto, o editado allí aunque aquí se borrase
      resultado.push(r);
    }
    // Si lo borraste tú y nadie lo tocó: fuera
  });

  local.forEach((l, i) => {
    if (!l || l.id == null || mRemoto.has(l.id)) return;
    const b = mBase.get(l.id);
    if (b && iguales(b, l)) return; // Borrado por otra persona y sin cambios aquí

    // Insertarlo detrás del elemento que tenía delante en tu lista
    let pos = 0;
    for (let j = i - 1; j >= 0; j--) {
      const k = resultado.findIndex(x => x.id === local[j].id);
      if (k >= 0) {
        pos = k + 1;
        break;
      }
    }
    resultado.splice(pos, 0, l);
  });

  return resultado;
}

/* =========================================================
   OPERACIONES DE FAMILIAS
   ========================================================= */
function datosVacios() {
  return { dietas: [], comidas: [], compra: [], rapida: [], historial: [], miembros: [] };
}

// Miembros con solo esta persona (familias nuevas, copias e importadas)
function soloYo() {
  const yo = getYo();
  return yo.nombre ? [{ id: yo.id, nombre: yo.nombre, unidoEn: Date.now() }] : [];
}

/* -------------------------------------------------------
   Llamadas al servidor con errores que se puedan explicar:
   - sin-conexion: el móvil no tiene internet
   - sin-servidor: la app se ha abierto sin su servidor
     (por ejemplo, abriendo index.html directamente)
   - sin-respuesta: el servidor no contesta o falla
------------------------------------------------------- */
function errorServidor(motivo, mensaje) {
  const e = new Error(mensaje || textoErrorServidor(motivo));
  e.motivo = motivo;
  return e;
}

function textoErrorServidor(motivo) {
  if (motivo === 'sin-conexion') return 'Ahora mismo no tienes conexión a internet.';
  if (motivo === 'sin-servidor') return 'Esta copia de NutriPlan está abierta sin su servidor, así que no puede compartir nada.';
  return 'El servidor de NutriPlan no responde ahora mismo.';
}

async function llamarServidor(ruta, opciones = {}) {
  // Una ruta relativa (/api/...) necesita que la página la sirva el propio servidor
  if (!/^https?:/.test(ruta) && !location.protocol.startsWith('http')) throw errorServidor('sin-servidor');
  if (navigator.onLine === false) throw errorServidor('sin-conexion');

  const control = new AbortController();
  const limite = setTimeout(() => control.abort(), 12000);
  let res;
  try {
    res = await fetch(ruta, { cache: 'no-store', ...opciones, signal: control.signal });
  } catch (e) {
    throw errorServidor(navigator.onLine === false ? 'sin-conexion' : 'sin-respuesta');
  } finally {
    clearTimeout(limite);
  }

  // Si no contesta con JSON, quien responde no es el servidor de NutriPlan
  const esJson = (res.headers.get('content-type') || '').includes('application/json');
  if (!esJson) throw errorServidor(res.status >= 500 && res.status !== 501 ? 'sin-respuesta' : 'sin-servidor');

  const datos = await res.json().catch(() => ({}));
  return { res, datos };
}

/* -------------------------------------------------------
   Dónde se guardan las familias compartidas
   - Supabase (js/nube.js): lo normal; la web llama directamente
     a sus funciones con la clave pública. No hay servidor propio.
   - server.py: solo si no hay nube configurada (uso en local).
   Las dos opciones responden igual para el resto de la app.
------------------------------------------------------- */
const usaNube = () => !!(typeof NUBE !== 'undefined' && NUBE.url && NUBE.clave);

function llamarNube(funcion, args, opciones = {}) {
  return llamarServidor(`${NUBE.url}/rest/v1/rpc/${funcion}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: NUBE.clave },
    body: JSON.stringify(args),
    ...opciones
  });
}

const API = {
  // → { existia: false, codigo, version } o { existia: true, sala } si ese código ya estaba
  async crear(datos, codigoDeseado = null) {
    if (usaNube()) {
      const { res, datos: r } = await llamarNube('crear_sala', { p_datos: datos, p_codigo: codigoDeseado });
      if (!res.ok || !r) throw errorServidor('sin-respuesta');
      return r;
    }
    const { res, datos: r } = await llamarServidor('/api/sala/crear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });
    if (!res.ok) throw errorServidor('sin-respuesta');
    return { existia: false, codigo: r.codigo, version: r.version || 1 };
  },

  // → la familia, o null si no existe
  async obtener(codigo) {
    if (usaNube()) {
      const { res, datos } = await llamarNube('obtener_sala', { p_codigo: codigo });
      if (!res.ok) throw errorServidor('sin-respuesta');
      return datos || null;
    }
    const { res, datos } = await llamarServidor(`/api/sala/${encodeURIComponent(codigo)}`);
    if (res.status === 404) return null;
    if (!res.ok || !datos.sala) throw errorServidor('sin-respuesta');
    return datos.sala;
  },

  // → número de versión, o null si no existe
  async version(codigo) {
    if (usaNube()) {
      const { res, datos } = await llamarNube('version_sala', { p_codigo: codigo });
      if (!res.ok) throw errorServidor('sin-respuesta');
      return typeof datos === 'number' ? datos : null;
    }
    const { res, datos } = await llamarServidor(`/api/sala/${encodeURIComponent(codigo)}/version`);
    if (res.status === 404) return null;
    if (!res.ok) throw errorServidor('sin-respuesta');
    return datos.version;
  },

  // → { estado: 'ok', version } | { estado: 'conflicto', sala } | { estado: 'no-existe' }
  async guardar(codigo, baseVersion, datos) {
    if (usaNube()) {
      const { res, datos: r } = await llamarNube('guardar_sala', { p_codigo: codigo, p_base_version: baseVersion, p_datos: datos });
      if (!res.ok || !r) throw errorServidor('sin-respuesta');
      if (r.ok) return { estado: 'ok', version: r.version };
      if (r.conflicto) return { estado: 'conflicto', sala: r.sala };
      return { estado: 'no-existe' };
    }
    const { res, datos: r } = await llamarServidor(`/api/sala/${encodeURIComponent(codigo)}/guardar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseVersion, ...datos })
    });
    if (res.status === 409) return { estado: 'conflicto', sala: r.sala };
    if (res.status === 404) return { estado: 'no-existe' };
    if (!res.ok) throw errorServidor('sin-respuesta');
    return { estado: 'ok', version: r.version };
  },

  // Al cerrar o esconder la app: se intenta subir sin esperar respuesta
  guardarAlCerrar(codigo, baseVersion, datos) {
    try {
      const peticion = usaNube()
        ? llamarNube('guardar_sala', { p_codigo: codigo, p_base_version: baseVersion, p_datos: datos }, { keepalive: true })
        : llamarServidor(`/api/sala/${encodeURIComponent(codigo)}/guardar`, {
          method: 'POST', keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ baseVersion, ...datos })
        });
      peticion.catch(() => {});
    } catch (e) { /* el siguiente arranque lo reintentará */ }
  }
};

async function crearSalaEnServidor(datos) {
  return API.crear(datos);
}

// Crea una familia nueva. Si compartida=true intenta registrarla en el servidor.
async function crearNuevaFamilia(nombre, descripcion = '', compartida = true, datos = null) {
  const contenido = datos ? { ...datosVacios(), ...clonar(datos) } : datosVacios();
  const nueva = normalizarFamilia({
    id: generarId('familia'),
    codigo: '',
    nombre: (nombre || '').trim() || 'Nueva familia',
    descripcion: (descripcion || '').trim(),
    creadaEn: Date.now(),
    versionRemota: 1,
    ...contenido,
    miembros: soloYo()
  });

  let sinServidor = false;
  if (compartida) {
    try {
      const data = await crearSalaEnServidor(instantanea(nueva));
      nueva.codigo = data.codigo;
      nueva.versionRemota = data.version || 1;
      nueva.base = instantanea(nueva);
      nueva.pendiente = false;
    } catch (e) {
      // Sin servidor: el código lo pone el navegador y se comparte por enlace
      if (e.motivo === 'sin-servidor') darCodigoLocal(nueva);
      else sinServidor = true;
    }
  }

  const familias = getFamilias();
  familias.unshift(nueva);
  setFamilias(familias);
  setFamiliaActivaId(nueva.id);

  return { familia: nueva, sinServidor };
}

/*
  Da código a una familia de este dispositivo para poder invitar.
  Con servidor queda sincronizada en vivo; si la web no tiene
  servidor, el código se genera aquí y se comparte por enlace.
  Solo falla si hay servidor pero ahora no responde.
*/
async function convertirEnCompartida(id) {
  asegurarMiembro(id);
  const p = getFamiliaPorId(id);
  if (!p) return null;
  try {
    const data = await crearSalaEnServidor(instantanea(p));
    p.codigo = data.codigo;
    p.versionRemota = data.version || 1;
    p.base = instantanea(p);
    p.pendiente = false;
  } catch (e) {
    if (e.motivo !== 'sin-servidor') throw e;
    darCodigoLocal(p);
  }
  guardarFamilias();
  if (id === getFamiliaActivaId()) estadoSyncSegunFamilia();
  return p;
}

const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sin 0/O ni 1/I, como el servidor

function generarCodigoFamilia() {
  const azar = crypto.getRandomValues(new Uint32Array(6));
  return Array.from(azar, n => ALFABETO_CODIGO[n % ALFABETO_CODIGO.length]).join('');
}

function darCodigoLocal(p) {
  p.codigo = generarCodigoFamilia();
  p.registrada = false;
  p.borrados = {};
  p.base = instantanea(p);
  p.pendiente = false;
}

/* -------------------------------------------------------
   Compartir por enlace (sin servidor)
   La familia viaja comprimida en el enlace, detrás de la #
   (esa parte no llega a ningún servidor). Se queda fuera el
   historial de sugerencias, que es de cada móvil.
------------------------------------------------------- */
function aBase64Url(bytes) {
  let binario = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deBase64Url(texto) {
  const b64 = texto.replace(/-/g, '+').replace(/_/g, '/');
  const binario = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(binario, c => c.charCodeAt(0));
}

// "1…" = comprimido; "0…" = sin comprimir (navegadores sin CompressionStream)
async function comprimirTexto(texto) {
  const bytes = new TextEncoder().encode(texto);
  if (typeof CompressionStream === 'undefined') return `0${aBase64Url(bytes)}`;
  const flujo = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return `1${aBase64Url(new Uint8Array(await new Response(flujo).arrayBuffer()))}`;
}

async function descomprimirTexto(dato) {
  const bytes = deBase64Url(dato.slice(1));
  if (dato[0] === '0') return new TextDecoder().decode(bytes);
  if (dato[0] !== '1' || typeof DecompressionStream === 'undefined') throw new Error('Formato desconocido');
  const flujo = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Response(flujo).text();
}

async function paqueteFamilia(id) {
  const p = getFamiliaPorId(id);
  const s = instantanea(p);
  delete s.historial;
  return comprimirTexto(JSON.stringify({ v: 1, codigo: p.codigo, de: getYo().id, borrados: p.borrados || {}, ...s }));
}

// Lee y limpia lo que llega en un enlace (viene de fuera: no se da nada por bueno)
async function leerPaqueteFamilia(dato) {
  if (!/^[01][A-Za-z0-9_-]+$/.test(dato || '') || dato.length > 3000000) throw new Error('Enlace no válido');
  const texto = await descomprimirTexto(dato);
  if (texto.length > 8000000) throw new Error('Enlace demasiado grande');
  const d = JSON.parse(texto);
  const codigo = String((d && d.codigo) || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 12);
  if (!d || d.v !== 1 || codigo.length < 4) throw new Error('Enlace no válido');

  const limpio = {
    codigo,
    nombre: String(d.nombre || 'Familia').slice(0, 80),
    descripcion: String(d.descripcion || '').slice(0, 500),
    de: String(d.de || ''),
    borrados: {}
  };
  COLECCIONES.forEach(col => {
    if (col === 'historial') return;
    limpio[col] = (Array.isArray(d[col]) ? d[col] : [])
      .filter(x => x && typeof x === 'object' && !Array.isArray(x) && (typeof x.id === 'string' || typeof x.id === 'number'))
      .slice(0, 3000);
    const b = d.borrados && Array.isArray(d.borrados[col]) ? d.borrados[col] : [];
    limpio.borrados[col] = b.filter(x => typeof x === 'string' || typeof x === 'number').slice(-400);
  });
  return limpio;
}

// Lo enviado pasa a ser la referencia para juntar lo que vuelva
function marcarComoEnviada(id) {
  const p = getFamiliaPorId(id);
  if (!p || sincronizable(p)) return;
  p.base = instantanea(p);
  guardarFamilias();
}

/*
  Junta dos copias de la misma lista sin perder nada:
  - lo borrado por cualquiera de los dos (apuntado) desaparece
  - si solo la otra persona cambió algo, gana su versión
  - si lo cambiasteis los dos, se queda el tuyo
  - lo nuevo de cada lado se conserva
*/
function unirListas(base, local, remoto, borrados) {
  const porId = (lista) => new Map(lista.filter(x => x && x.id != null).map(x => [x.id, x]));
  const mBase = porId(base);
  const mLocal = porId(local);
  const mRemoto = porId(remoto);
  const resultado = [];

  local.forEach(l => {
    if (!l || l.id == null || borrados.has(l.id)) return;
    const r = mRemoto.get(l.id);
    const b = mBase.get(l.id);
    resultado.push(r && b && iguales(b, l) && !iguales(b, r) ? r : l);
  });

  remoto.forEach((r, i) => {
    if (!r || r.id == null || mLocal.has(r.id) || borrados.has(r.id)) return;
    // Detrás del elemento que tenía delante en la otra copia
    let pos = resultado.length;
    for (let j = i - 1; j >= 0; j--) {
      const k = resultado.findIndex(x => x.id === remoto[j].id);
      if (k >= 0) {
        pos = k + 1;
        break;
      }
    }
    resultado.splice(pos, 0, r);
  });
  return resultado;
}

/*
  Entra en una familia recibida por enlace o, si ya la tienes,
  la pone al día juntando las dos copias.
  Devuelve { familia, nueva }.
*/
function incorporarDesdeEnlace(datos) {
  const familias = getFamilias();
  let p = familias.find(x => x.codigo === datos.codigo);
  const nueva = !p;

  if (p && sincronizable(p)) {
    // Ya se sincroniza en vivo con el servidor: no hace falta juntar nada
  } else if (p) {
    juntarCopias(p, datos);
    p.base = instantanea({ ...datos, historial: [] });
    p.cambios = (p.cambios || 0) + 1;
  } else {
    p = normalizarFamilia({
      id: generarId('familia'),
      codigo: datos.codigo,
      registrada: false,
      nombre: datos.nombre,
      descripcion: datos.descripcion,
      creadaEn: Date.now(),
      versionRemota: 1,
      ...datosVacios(),
      borrados: datos.borrados
    });
    COLECCIONES.forEach(col => { if (col !== 'historial') p[col] = clonar(datos[col] || []); });
    p.base = instantanea({ ...datos, historial: [] });
    p.pendiente = false;
    familias.unshift(p);
  }

  setFamilias(familias);
  setFamiliaActivaId(p.id);
  asegurarMiembro(p.id);
  // Si hay nube, desde ahora se sincroniza en vivo
  subirFamiliasPorEnlace();
  return { familia: p, nueva };
}

// Junta en p otra copia de la misma familia sin perder lo de ninguno
function juntarCopias(p, datos) {
  const base = p.base || {};
  const borrados = {};
  COLECCIONES.forEach(col => {
    if (col === 'historial') return;
    const juntos = COLECCIONES_CON_BORRADOS.includes(col)
      ? new Set([...((p.borrados || {})[col] || []), ...(((datos.borrados || {})[col]) || [])])
      : new Set();
    if (juntos.size) borrados[col] = [...juntos].slice(-400);
    p[col] = unirListas(base[col] || [], p[col] || [], Array.isArray(datos[col]) ? datos[col] : [], juntos);
  });
  p.borrados = borrados;
  if (!p.base || p.nombre === base.nombre) p.nombre = datos.nombre || p.nombre;
  if (!p.base || p.descripcion === base.descripcion) p.descripcion = datos.descripcion || '';
}

/*
  Familias que se compartían por enlace (sin servidor): en cuanto
  hay nube se suben con su mismo código y pasan a ir en vivo. Si
  otro miembro la subió antes, se juntan las dos copias.
*/
let subiendoEnlaces = false;

async function subirFamiliasPorEnlace() {
  if (!usaNube() || subiendoEnlaces) return;
  const pendientes = getFamilias().filter(f => f.codigo && f.registrada === false);
  if (!pendientes.length) return;

  subiendoEnlaces = true;
  try {
    for (const f of pendientes) {
      try {
        const r = await API.crear(instantanea(f), f.codigo);
        const p = getFamiliaPorId(f.id);
        if (!p || p.registrada !== false) continue;

        if (r.existia) {
          juntarCopias(p, r.sala);
          p.versionRemota = r.sala.version;
          p.base = instantanea(r.sala);
          p.pendiente = !iguales(instantanea(p), p.base);
        } else {
          p.versionRemota = r.version;
          p.base = instantanea(p);
          p.pendiente = false;
        }
        delete p.registrada;
        delete p.borrados;
        guardarFamilias();
        if (p.pendiente) programarSincronizacion(50, p.id);
        if (p.id === getFamiliaActivaId()) refrescarDesdeSync();
      } catch (e) {
        // Sin conexión: se intentará otra vez al volver a tenerla
      }
    }
  } finally {
    subiendoEnlaces = false;
    estadoSyncSegunFamilia();
  }
}

function duplicarFamilia(id) {
  const origen = getFamiliaPorId(id);
  if (!origen) return null;

  const copia = normalizarFamilia({
    ...clonar(instantanea(origen)),
    id: generarId('familia'),
    codigo: '',
    nombre: `${origen.nombre} (copia)`,
    creadaEn: Date.now(),
    versionRemota: 1,
    miembros: soloYo()
  });

  const familias = getFamilias();
  familias.unshift(copia);
  setFamilias(familias);
  return copia;
}

function eliminarFamilia(id) {
  const familias = getFamilias();
  if (familias.length <= 1) return false;

  setFamilias(familias.filter(p => p.id !== id));
  if (getFamiliaActivaId() === id) setFamiliaActivaId(getFamilias()[0].id);
  return true;
}

function renombrarFamiliaActiva(nombre, descripcion) {
  actualizarFamiliaActiva({ nombre: nombre.trim() || 'Sin nombre', descripcion: (descripcion || '').trim() });
}

async function obtenerSala(codigo) {
  const sala = await API.obtener(codigo);
  if (!sala) throw errorServidor('no-existe', 'No hay ninguna familia con ese código. Revisa que esté bien escrito.');
  return sala;
}

// Añade (o actualiza) la sala en la lista local y la activa
function incorporarSala(sala) {
  const familias = getFamilias();
  let p = familias.find(x => x.codigo === sala.codigo);

  if (p) {
    fusionarConRemoto(p, sala);
  } else {
    p = normalizarFamilia({
      id: generarId('familia'),
      codigo: sala.codigo,
      nombre: sala.nombre,
      descripcion: sala.descripcion || '',
      creadaEn: Date.now(),
      versionRemota: sala.version,
      ...datosVacios()
    });
    COLECCIONES.forEach(col => { p[col] = clonar(sala[col] || []); });
    p.base = instantanea(p);
    p.pendiente = false;
    familias.unshift(p);
  }

  setFamilias(familias);
  setFamiliaActivaId(p.id);
  asegurarMiembro(p.id);
  return p;
}

// Quita la familia vacía que se crea al abrir la app por primera vez
function quitarFamiliaInicialVacia() {
  const f = getFamiliaPorId('familia_principal');
  const vacia = f && !f.codigo && ['dietas', 'comidas', 'compra', 'rapida'].every(c => !(f[c] || []).length);
  if (vacia && getFamilias().length > 1) eliminarFamilia(f.id);
}

/* -------------------------------------------------------
   Copias de seguridad (archivo .json)
------------------------------------------------------- */
function exportarFamilia(id = getFamiliaActivaId()) {
  const p = getFamiliaPorId(id);
  if (!p) return null;
  return {
    formato: 'nutriplan',
    version: 3,
    exportadoEn: new Date().toISOString(),
    familia: instantanea(p)
  };
}

function leerCopiaSeguridad(json) {
  const datos = typeof json === 'string' ? JSON.parse(json) : json;
  // Formato nuevo
  if (datos && datos.formato === 'nutriplan' && (datos.familia || datos.partida)) return datos.familia || datos.partida;
  // Formatos antiguos: un objeto con las colecciones directamente
  if (datos && (Array.isArray(datos.dietas) || Array.isArray(datos.comidas) || Array.isArray(datos.compra))) return datos;
  throw new Error('El archivo no es una copia de NutriPlan');
}

/* -------------------------------------------------------
   Datos de ejemplo: se añaden sin tocar lo tuyo y se
   pueden quitar después sin perder nada propio.
   Un ejemplo solo cuenta como tal mientras siga igual que
   el original: si alguien lo edita, pasa a ser vuestro y ya
   no se borra al quitar los ejemplos.
------------------------------------------------------- */
const COLECCIONES_EJEMPLO = ['dietas', 'comidas', 'compra'];

// Lo que cambia con el uso normal (marcar en el súper) no lo convierte en vuestro
const CAMPOS_DE_USO = new Set(['comprado', 'marcadoPor', 'autor']);

function firmaEjemplo(item) {
  const limpio = {};
  Object.keys(item || {}).forEach(k => {
    const v = item[k];
    const vacio = v === '' || v === null || v === undefined || (Array.isArray(v) && !v.length);
    if (!vacio && !CAMPOS_DE_USO.has(k)) limpio[k] = v;
  });
  return serializarEstable(limpio);
}

const FIRMAS_EJEMPLO = Object.fromEntries(COLECCIONES_EJEMPLO.map(col =>
  [col, new Map(DATOS_INICIALES[col].map(x => [x.id, firmaEjemplo(x)]))]));

function esEjemplo(col, item) {
  const firma = FIRMAS_EJEMPLO[col]?.get(item?.id);
  return !!firma && firma === firmaEjemplo(item);
}

function ejemplosEn(col) {
  return getColeccion(col).filter(x => esEjemplo(col, x));
}

function tieneEjemplos(col = null) {
  return (col ? [col] : COLECCIONES_EJEMPLO).some(c => ejemplosEn(c).length > 0);
}

function cargarEjemplos() {
  const p = getFamiliaActiva();
  const cambios = {};
  COLECCIONES_EJEMPLO.forEach(col => {
    const actuales = new Set((p[col] || []).map(x => x.id));
    const nuevos = clonar(DATOS_INICIALES[col]).filter(x => !actuales.has(x.id));
    cambios[col] = [...(p[col] || []), ...nuevos];
  });
  actualizarFamiliaActiva(cambios);
}

/*
  Quita solo los ejemplos que siguen intactos de las colecciones
  indicadas. Devuelve cuántos quitó y una función para deshacerlo.
*/
function quitarEjemplos(cols = COLECCIONES_EJEMPLO) {
  const p = getFamiliaActiva();
  const cambios = {};
  const quitados = {};
  let total = 0;

  cols.forEach(col => {
    const lista = p[col] || [];
    quitados[col] = lista.map((item, idx) => ({ item, idx })).filter(({ item }) => esEjemplo(col, item));
    if (!quitados[col].length) return;
    total += quitados[col].length;
    cambios[col] = lista.filter(x => !esEjemplo(col, x));
  });
  if (total) actualizarFamiliaActiva(cambios);

  const deshacer = () => {
    const actual = getFamiliaActiva();
    if (!actual || actual.id !== p.id) return;
    const restaurado = {};
    Object.entries(quitados).forEach(([col, entradas]) => {
      if (!entradas.length) return;
      const lista = (actual[col] || []).slice();
      entradas.forEach(({ item, idx }) => {
        if (!lista.some(x => x.id === item.id)) lista.splice(Math.min(idx, lista.length), 0, item);
      });
      restaurado[col] = lista;
    });
    actualizarFamiliaActiva(restaurado);
  };
  return { total, deshacer };
}

/* =========================================================
   COLECCIONES DE LA FAMILIA ACTIVA
   ========================================================= */
function getColeccion(nombre) {
  const p = getFamiliaActiva();
  return p ? (p[nombre] || []) : [];
}

function setColeccion(nombre, lista) {
  actualizarFamiliaActiva({ [nombre]: lista });
}

function guardarEnColeccion(nombre, item, alPrincipio = false) {
  const lista = getColeccion(nombre).slice();
  const idx = lista.findIndex(x => x.id === item.id);
  if (idx >= 0) lista[idx] = item;
  else if (alPrincipio) lista.unshift(item);
  else lista.push(item);
  setColeccion(nombre, lista);
}

// Elimina y devuelve una función para deshacerlo
function quitarDeColeccion(nombre, id) {
  const lista = getColeccion(nombre);
  const idx = lista.findIndex(x => x.id === id);
  if (idx < 0) return () => {};
  const item = lista[idx];
  setColeccion(nombre, lista.filter(x => x.id !== id));
  return () => restaurarEnColeccion(nombre, [{ item, idx }]);
}

// Vuelve a meter elementos borrados en su posición original
function restaurarEnColeccion(nombre, entradas) {
  const lista = getColeccion(nombre).slice();
  entradas
    .slice()
    .sort((a, b) => a.idx - b.idx)
    .forEach(({ item, idx }) => {
      if (!lista.some(x => x.id === item.id)) lista.splice(Math.min(idx, lista.length), 0, item);
    });
  setColeccion(nombre, lista);
}

/* Dietas */
const getDietas = () => getColeccion('dietas');
const getDietaPorId = (id) => getDietas().find(d => d.id === id) || null;
const guardarDietaStorage = (dieta) => guardarEnColeccion('dietas', dieta, true);

/* Recetas (se guardan como "comidas" por compatibilidad) */
const getComidas = () => getColeccion('comidas');
const getComidaPorId = (id) => getComidas().find(c => c.id === id) || null;
const guardarComidaStorage = (comida) => guardarEnColeccion('comidas', comida, true);

/* Lista fija */
const getCompra = () => getColeccion('compra');
const getIngredientePorId = (id) => getCompra().find(i => i.id === id) || null;
const guardarIngredienteStorage = (ing) => guardarEnColeccion('compra', ing);

/* Lista rápida */
const getRapida = () => getColeccion('rapida');

/* Historial de productos (sugerencias de la lista rápida) */
const getHistorial = () => getColeccion('historial');

function anotarEnHistorial(productos) {
  const historial = getHistorial().slice();
  const ahora = Date.now();
  productos.forEach(({ nombre, categoria }) => {
    const id = claveProducto(nombre);
    if (!id) return;
    const idx = historial.findIndex(h => h.id === id);
    if (idx >= 0) {
      historial[idx] = { ...historial[idx], nombre, categoria: categoria || historial[idx].categoria, veces: (historial[idx].veces || 0) + 1, ultima: ahora };
    } else {
      historial.push({ id, nombre, categoria, veces: 1, ultima: ahora });
    }
  });
  // Conservar los 200 más relevantes
  historial.sort((a, b) => puntuacionHistorial(b) - puntuacionHistorial(a));
  return historial.slice(0, 200);
}

function puntuacionHistorial(h) {
  const dias = (Date.now() - (h.ultima || 0)) / 86400000;
  return (h.veces || 1) / (1 + dias / 14);
}
