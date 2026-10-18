/* =========================================================
   CAPA DE PERSISTENCIA — localStorage
   Gestiona la lectura y escritura de datos en el navegador.
   Los datos sobreviven al cierre de la pestaña.
   ========================================================= */

const STORAGE_KEYS = {
  dietas:  'nutriplan_dietas',
  compra:  'nutriplan_compra',
  version: 'nutriplan_version'
};

const VERSION_APP = '1.0.0';

/* -------------------------------------------------------
   Inicialización: carga datos o usa los iniciales del Excel
------------------------------------------------------- */
function inicializarStorage() {
  const versionGuardada = localStorage.getItem(STORAGE_KEYS.version);

  // Primera vez que se abre la app: cargar datos del Excel
  if (!versionGuardada) {
    localStorage.setItem(STORAGE_KEYS.dietas,  JSON.stringify(DATOS_INICIALES.dietas));
    localStorage.setItem(STORAGE_KEYS.compra,  JSON.stringify(DATOS_INICIALES.compra));
    localStorage.setItem(STORAGE_KEYS.version, VERSION_APP);
  }
}

/* -------------------------------------------------------
   Dietas
------------------------------------------------------- */
function getDietas() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.dietas)) || [];
  } catch {
    return [];
  }
}

function setDietas(dietas) {
  localStorage.setItem(STORAGE_KEYS.dietas, JSON.stringify(dietas));
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
   Lista de la compra
------------------------------------------------------- */
function getCompra() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.compra)) || [];
  } catch {
    return [];
  }
}

function setCompra(lista) {
  localStorage.setItem(STORAGE_KEYS.compra, JSON.stringify(lista));
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
