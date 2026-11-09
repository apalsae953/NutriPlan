/* =========================================================
   CAPA DE PERSISTENCIA Y SINCRONIZACIÓN EN VIVO — STORAGE.JS
   Sin cuentas de usuario, sin contraseñas, sin correos.
   Cada familia tiene sus listas de la compra, recetas, dietas
   y miembros.
   - Si la familia es local: se guarda en LocalStorage.
   - Si la familia es compartida (tiene código de sala): se sincroniza
     con todas las personas que tengan el código.

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

const VERSION_APP = '3.1.0';

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
  Object.assign(p, datos);
  if (sincronizar) {
    p.cambios = (p.cambios || 0) + 1;
    if (p.codigo) p.pendiente = true;
  }
  guardarFamilias();
  if (sincronizar && p.codigo) programarSincronizacion(450, id);
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
  if (!p || !p.codigo || !p.pendiente) {
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
    const res = await fetch(`/api/sala/${encodeURIComponent(p.codigo)}/guardar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseVersion: p.versionRemota || 1, ...enviado })
    });

    const actual = getFamiliaPorId(id);
    if (!actual) return;

    if (res.status === 409) {
      // Otra persona guardó antes: fusionar y volver a intentar
      const { sala } = await res.json();
      fusionarConRemoto(actual, sala);
      guardarFamilias();
      if (id === getFamiliaActivaId()) refrescarDesdeSync();
      Sync.repetir = actual.pendiente;
    } else if (res.ok) {
      const data = await res.json();
      actual.base = enviado;
      actual.versionRemota = data.version;
      if (actual.cambios === cambiosEnviados) actual.pendiente = false;
      else Sync.repetir = true;
      guardarFamilias();
      if (id === getFamiliaActivaId()) estadoSyncSegunFamilia();
    } else if (res.status === 404) {
      if (id === getFamiliaActivaId()) fijarEstadoSync('perdida');
    } else {
      throw new Error(`HTTP ${res.status}`);
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
    .filter(p => p.codigo && p.pendiente)
    .forEach(p => empujarCambios(p.id));
}

/* -------------------------------------------------------
   Sondeo ligero de cambios remotos
------------------------------------------------------- */
async function sondearRemoto() {
  if (document.hidden || Sync.enCurso) return;
  const p = getFamiliaActiva();
  if (!p || !p.codigo) return;

  try {
    const res = await fetch(`/api/sala/${encodeURIComponent(p.codigo)}/version`, { cache: 'no-store' });
    if (res.status === 404) {
      fijarEstadoSync('perdida');
      return;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const { version } = await res.json();
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
  if (!p || !p.codigo) return;

  const res = await fetch(`/api/sala/${encodeURIComponent(p.codigo)}`, { cache: 'no-store' });
  if (!res.ok) return;
  const { sala } = await res.json();
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
      getFamilias().filter(p => p.codigo && p.pendiente).forEach(p => {
        try {
          fetch(`/api/sala/${encodeURIComponent(p.codigo)}/guardar`, {
            method: 'POST',
            keepalive: true,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ baseVersion: p.versionRemota || 1, ...instantanea(p) })
          }).catch(() => {});
        } catch (e) { /* el siguiente arranque lo reintentará */ }
      });
    } else {
      sondearRemoto();
    }
  });

  window.addEventListener('online', empujarPendientes);
  window.addEventListener('offline', () => {
    if (getFamiliaActiva()?.codigo) fijarEstadoSync('sin-conexion');
  });

  estadoSyncSegunFamilia();
  empujarPendientes();
  sondearRemoto();
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

async function crearSalaEnServidor(datos) {
  const res = await fetch('/api/sala/crear', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  });
  if (!res.ok) throw new Error('No se pudo crear la sala');
  return res.json();
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
      sinServidor = true;
    }
  }

  const familias = getFamilias();
  familias.unshift(nueva);
  setFamilias(familias);
  setFamiliaActivaId(nueva.id);

  return { familia: nueva, sinServidor };
}

async function convertirEnCompartida(id) {
  asegurarMiembro(id);
  const p = getFamiliaPorId(id);
  if (!p) return null;
  const data = await crearSalaEnServidor(instantanea(p));
  p.codigo = data.codigo;
  p.versionRemota = data.version || 1;
  p.base = instantanea(p);
  p.pendiente = false;
  guardarFamilias();
  if (id === getFamiliaActivaId()) estadoSyncSegunFamilia();
  return p;
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
  const res = await fetch(`/api/sala/${encodeURIComponent(codigo)}`, { cache: 'no-store' });
  if (res.status === 404) throw new Error('No hay ninguna familia con ese código');
  if (!res.ok) throw new Error('No se ha podido conectar. Comprueba la conexión.');
  const data = await res.json();
  return data.sala;
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
   pueden quitar después sin perder nada propio
------------------------------------------------------- */
const IDS_EJEMPLO = {
  dietas: new Set(DATOS_INICIALES.dietas.map(x => x.id)),
  comidas: new Set(DATOS_INICIALES.comidas.map(x => x.id)),
  compra: new Set(DATOS_INICIALES.compra.map(x => x.id))
};

function tieneEjemplos() {
  const p = getFamiliaActiva();
  if (!p) return false;
  return Object.keys(IDS_EJEMPLO).some(col => (p[col] || []).some(x => IDS_EJEMPLO[col].has(x.id)));
}

function cargarEjemplos() {
  const p = getFamiliaActiva();
  const cambios = {};
  Object.keys(IDS_EJEMPLO).forEach(col => {
    const actuales = new Set((p[col] || []).map(x => x.id));
    const nuevos = clonar(DATOS_INICIALES[col]).filter(x => !actuales.has(x.id));
    cambios[col] = [...(p[col] || []), ...nuevos];
  });
  actualizarFamiliaActiva(cambios);
}

function quitarEjemplos() {
  const p = getFamiliaActiva();
  const cambios = {};
  Object.keys(IDS_EJEMPLO).forEach(col => {
    cambios[col] = (p[col] || []).filter(x => !IDS_EJEMPLO[col].has(x.id));
  });
  actualizarFamiliaActiva(cambios);
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
