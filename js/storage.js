/* =========================================================
   CAPA DE PERSISTENCIA Y SINCRONIZACIÓN EN VIVO — STORAGE.JS
   Sin cuentas de usuario, sin contraseñas, sin correos.
   - Si la partida es local: se guarda en LocalStorage.
   - Si la partida es compartida (tiene código de sala): se sincroniza
     automáticamente en tiempo real con todas las personas que tengan el código.
   ========================================================= */

const STORAGE_KEYS = {
  partidas:         'nutriplan_partidas_v2',
  partidaActivaId:  'nutriplan_partida_activa_id',
  version:          'nutriplan_version',
  // Claves heredadas para migración de datos previos
  dietasLegacy:     'nutriplan_dietas',
  comidasLegacy:    'nutriplan_comidas',
  compraLegacy:     'nutriplan_compra',
  ejemplosCargados: 'nutriplan_ejemplos_cargados'
};

const VERSION_APP = '2.1.0';

let timerSyncDebounce = null;
let timerPollingSync = null;

/* -------------------------------------------------------
   Inicialización y migración automática
------------------------------------------------------- */
function inicializarStorage() {
  let partidas = getPartidas();

  // Si no hay partidas creadas aún, creamos la primera ("Partida Principal")
  // y rescatamos cualquier dato que el usuario ya tuviera guardado
  if (!partidas || partidas.length === 0) {
    let dietasIniciales = [];
    let comidasIniciales = [];
    let compraInicial = [];

    try {
      dietasIniciales = JSON.parse(localStorage.getItem(STORAGE_KEYS.dietasLegacy)) || [];
      comidasIniciales = JSON.parse(localStorage.getItem(STORAGE_KEYS.comidasLegacy)) || [];
      compraInicial = JSON.parse(localStorage.getItem(STORAGE_KEYS.compraLegacy)) || [];
    } catch (e) {
      console.warn('No se encontraron datos previos para migrar');
    }

    const partidaPorDefecto = {
      id: 'partida_principal',
      codigo: '',
      nombre: 'Mi Dieta Principal',
      descripcion: 'Mi espacio de dietas y lista de la compra',
      creadaEn: Date.now(),
      versionRemota: 1,
      dietas: dietasIniciales,
      comidas: comidasIniciales,
      compra: compraInicial,
      ejemplosCargados: localStorage.getItem(STORAGE_KEYS.ejemplosCargados) === 'true'
    };

    partidas = [partidaPorDefecto];
    setPartidas(partidas);
    setPartidaActivaId(partidaPorDefecto.id);
  } else {
    // Verificar que la partida activa siga existiendo
    let activaId = getPartidaActivaId();
    if (!activaId || !partidas.some(p => p.id === activaId)) {
      setPartidaActivaId(partidas[0].id);
    }
  }

  localStorage.setItem(STORAGE_KEYS.version, VERSION_APP);

  // Iniciar sincronización en vivo de la partida activa si es compartida
  comprobarPollingPartidaActiva();
}

/* -------------------------------------------------------
   Gestión de Partidas (Colección completa)
------------------------------------------------------- */
function getPartidas() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.partidas)) || [];
  } catch (e) {
    console.error('Error leyendo partidas:', e);
    return [];
  }
}

function setPartidas(lista) {
  try {
    localStorage.setItem(STORAGE_KEYS.partidas, JSON.stringify(lista));
  } catch (e) {
    console.error('Error guardando partidas en localStorage:', e);
  }
}

function getPartidaActivaId() {
  return localStorage.getItem(STORAGE_KEYS.partidaActivaId) || '';
}

function setPartidaActivaId(id) {
  localStorage.setItem(STORAGE_KEYS.partidaActivaId, id);
  comprobarPollingPartidaActiva();
}

function getPartidaActiva() {
  const partidas = getPartidas();
  const activaId = getPartidaActivaId();
  return partidas.find(p => p.id === activaId) || partidas[0] || null;
}

function actualizarPartidaActiva(datosActualizados, sincronizarRemoto = true) {
  const partidas = getPartidas();
  const activaId = getPartidaActivaId();
  const idx = partidas.findIndex(p => p.id === activaId);

  if (idx >= 0) {
    partidas[idx] = { ...partidas[idx], ...datosActualizados };
    setPartidas(partidas);

    if (sincronizarRemoto && partidas[idx].codigo) {
      programarSincronizacionRemota(partidas[idx].codigo);
    }
  }
}

/* -------------------------------------------------------
   Sincronización en tiempo real con la sala compartida
------------------------------------------------------- */
function programarSincronizacionRemota(codigo) {
  if (!codigo) return;

  clearTimeout(timerSyncDebounce);
  timerSyncDebounce = setTimeout(async () => {
    const activa = getPartidaActiva();
    if (!activa || activa.codigo !== codigo) return;

    try {
      const payload = {
        dietas: activa.dietas || [],
        comidas: activa.comidas || [],
        compra: activa.compra || []
      };

      const res = await fetch(`/api/sala/${codigo}/guardar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        // Actualizar versionRemota local
        actualizarPartidaActiva({ versionRemota: data.version }, false);

        // Feedback visual discreto en el banner
        const syncBadge = document.getElementById('syncIndicator');
        if (syncBadge) {
          syncBadge.classList.add('sincronizado');
          setTimeout(() => syncBadge.classList.remove('sincronizado'), 1200);
        }
      }
    } catch (e) {
      console.warn('Sincronización remota pendiente de conexión:', e.message);
    }
  }, 400);
}

function comprobarPollingPartidaActiva() {
  detenerPollingPartida();

  const activa = getPartidaActiva();
  if (activa && activa.codigo) {
    iniciarPollingSala(activa.codigo);
  }
}

function iniciarPollingSala(codigo) {
  detenerPollingPartida();

  timerPollingSync = setInterval(async () => {
    const activa = getPartidaActiva();
    if (!activa || activa.codigo !== codigo) {
      detenerPollingPartida();
      return;
    }

    try {
      // 1. Comprobación ultra-ligera de versión (solo unos bytes)
      const res = await fetch(`/api/sala/${codigo}/version`);
      if (!res.ok) return;

      const data = await res.json();
      const versionServidor = data.version || 1;
      const versionLocal = activa.versionRemota || 1;

      // 2. Si otro usuario ha hecho cambios en la sala, descargar datos actualizados
      if (versionServidor > versionLocal) {
        const resFull = await fetch(`/api/sala/${codigo}`);
        if (!resFull.ok) return;

        const fullData = await resFull.json();
        const sala = fullData.sala;

        // Actualizar datos en memoria y localStorage sin disparar re-guardado
        actualizarPartidaActiva({
          nombre: sala.nombre || activa.nombre,
          descripcion: sala.descripcion || activa.descripcion,
          dietas: sala.dietas || [],
          comidas: sala.comidas || [],
          compra: sala.compra || [],
          versionRemota: sala.version
        }, false);

        // Refrescar vistas en pantalla
        if (typeof renderizarDietas === 'function') renderizarDietas();
        if (typeof renderizarComidas === 'function') renderizarComidas();
        if (typeof renderizarCompra === 'function') renderizarCompra();
        if (typeof actualizarBannerPartidaActiva === 'function') actualizarBannerPartidaActiva();
      }
    } catch (err) {
      // Servidor no disponible temporalmente
    }
  }, 2500);
}

function detenerPollingPartida() {
  if (timerPollingSync) {
    clearInterval(timerPollingSync);
    timerPollingSync = null;
  }
}

/* -------------------------------------------------------
   Operaciones de Partidas (Crear, Duplicar, Eliminar)
------------------------------------------------------- */
async function crearNuevaPartidaCompartida(nombre, descripcion = '') {
  let codigo = '';
  let version = 1;

  // Intentar crear la sala en el servidor para permitir sincronización en vivo
  try {
    const res = await fetch('/api/sala/crear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombre.trim(), descripcion: descripcion.trim() })
    });
    if (res.ok) {
      const data = await res.json();
      codigo = data.codigo;
    }
  } catch (e) {
    console.warn('Servidor no disponible para sala en vivo, creando local');
  }

  const nueva = {
    id: generarId('partida'),
    codigo: codigo, // Código alfanumérico para compartir (ej: CASA24)
    nombre: nombre.trim() || 'Nueva Partida',
    descripcion: descripcion.trim(),
    creadaEn: Date.now(),
    versionRemota: version,
    dietas: [],
    comidas: [],
    compra: [],
    ejemplosCargados: false
  };

  const partidas = getPartidas();
  partidas.unshift(nueva);
  setPartidas(partidas);
  setPartidaActivaId(nueva.id);

  return nueva;
}

function duplicarPartida(id) {
  const partidas = getPartidas();
  const origen = partidas.find(p => p.id === id);
  if (!origen) return null;

  const copia = JSON.parse(JSON.stringify(origen));
  copia.id = generarId('partida');
  copia.codigo = ''; // La copia empieza como local independiente
  copia.nombre = `${origen.nombre} (Copia)`;
  copia.creadaEn = Date.now();

  partidas.unshift(copia);
  setPartidas(partidas);
  setPartidaActivaId(copia.id);

  return copia;
}

function eliminarPartida(id) {
  const partidas = getPartidas();
  if (partidas.length <= 1) {
    return false; // Debe quedar al menos 1 partida
  }

  const filtradas = partidas.filter(p => p.id !== id);
  setPartidas(filtradas);

  if (getPartidaActivaId() === id) {
    setPartidaActivaId(filtradas[0].id);
  }

  return true;
}

/* -------------------------------------------------------
   Carga o reinicio de datos de ejemplo en la partida activa
------------------------------------------------------- */
function cargarEjemplosCompletos() {
  actualizarPartidaActiva({
    dietas: JSON.parse(JSON.stringify(DATOS_INICIALES.dietas)),
    compra: JSON.parse(JSON.stringify(DATOS_INICIALES.compra)),
    comidas: JSON.parse(JSON.stringify(DATOS_INICIALES.comidas)),
    ejemplosCargados: true
  });

  if (typeof renderizarDietas === 'function') renderizarDietas();
  if (typeof renderizarCompra === 'function') renderizarCompra();
  if (typeof renderizarComidas === 'function') renderizarComidas();
  if (typeof actualizarBannerEjemplos === 'function') actualizarBannerEjemplos();
  if (typeof actualizarUIPartidas === 'function') actualizarUIPartidas();

  mostrarToast('Datos de ejemplo cargados en esta partida', 'success');
}

function limpiarDatosEjemplo() {
  actualizarPartidaActiva({
    dietas: [],
    compra: [],
    comidas: [],
    ejemplosCargados: false
  });

  if (typeof renderizarDietas === 'function') renderizarDietas();
  if (typeof renderizarCompra === 'function') renderizarCompra();
  if (typeof renderizarComidas === 'function') renderizarComidas();
  if (typeof actualizarBannerEjemplos === 'function') actualizarBannerEjemplos();
  if (typeof actualizarUIPartidas === 'function') actualizarUIPartidas();

  mostrarToast('Partida limpiada correctamente', 'info');
}

/* -------------------------------------------------------
   Colección: Comidas / Platos (de la partida activa)
------------------------------------------------------- */
function getComidas() {
  const activa = getPartidaActiva();
  return activa ? (activa.comidas || []) : [];
}

function setComidas(comidas) {
  actualizarPartidaActiva({ comidas });
}

function getComidaPorId(id) {
  return getComidas().find(c => c.id === id) || null;
}

function guardarComidaStorage(comida) {
  const lista = getComidas();
  const idx = lista.findIndex(c => c.id === comida.id);
  if (idx >= 0) {
    lista[idx] = comida;
  } else {
    lista.unshift(comida);
  }
  setComidas(lista);
}

function eliminarComidaStorage(id) {
  const lista = getComidas().filter(c => c.id !== id);
  setComidas(lista);
}

/* -------------------------------------------------------
   Colección: Dietas (de la partida activa)
------------------------------------------------------- */
function getDietas() {
  const activa = getPartidaActiva();
  return activa ? (activa.dietas || []) : [];
}

function setDietas(dietas) {
  actualizarPartidaActiva({ dietas });
}

function getDietaPorId(id) {
  return getDietas().find(d => d.id === id) || null;
}

function guardarDietaStorage(dieta) {
  const dietas = getDietas();
  const idx = dietas.findIndex(d => d.id === dieta.id);
  if (idx >= 0) {
    dietas[idx] = dieta;
  } else {
    dietas.unshift(dieta);
  }
  setDietas(dietas);
}

function eliminarDietaStorage(id) {
  const dietas = getDietas().filter(d => d.id !== id);
  setDietas(dietas);
}

/* -------------------------------------------------------
   Colección: Lista de la compra (de la partida activa)
------------------------------------------------------- */
function getCompra() {
  const activa = getPartidaActiva();
  return activa ? (activa.compra || []) : [];
}

function setCompra(lista) {
  actualizarPartidaActiva({ compra: lista });
}

function getIngredientePorId(id) {
  return getCompra().find(i => i.id === id) || null;
}

function guardarIngredienteStorage(ing) {
  const lista = getCompra();
  const idx = lista.findIndex(i => i.id === ing.id);
  if (idx >= 0) {
    lista[idx] = ing;
  } else {
    lista.push(ing);
  }
  setCompra(lista);
}

function eliminarIngredienteStorage(id) {
  const lista = getCompra().filter(i => i.id !== id);
  setCompra(lista);
}

function toggleCompradoStorage(id) {
  const lista = getCompra();
  const ing = lista.find(i => i.id === id);
  if (ing) {
    ing.comprado = !ing.comprado;
    setCompra(lista);
    return ing.comprado;
  }
  return false;
}

function limpiarCompradosStorage() {
  const lista = getCompra().map(i => ({ ...i, comprado: false }));
  setCompra(lista);
}

/* -------------------------------------------------------
   Utilidades de ID
------------------------------------------------------- */
function generarId(prefijo = 'id') {
  return `${prefijo}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
