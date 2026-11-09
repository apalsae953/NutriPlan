/* =========================================================
   UTILIDADES — Funciones puras compartidas por todos los módulos
   ========================================================= */

/* -------------------------------------------------------
   Escapar HTML (todo texto de usuario pasa por aquí)
------------------------------------------------------- */
function esc(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Alias para el código antiguo
const escapeHtml = esc;

function generarId(prefijo = 'id') {
  return `${prefijo}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/* -------------------------------------------------------
   Texto: minúsculas, sin tildes y sin espacios repetidos
------------------------------------------------------- */
function normalizar(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function capitalizar(texto) {
  const t = String(texto || '').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
}

function coincideBusqueda(textos, consulta) {
  const q = normalizar(consulta);
  if (!q) return true;
  return textos.some(t => normalizar(t).includes(q));
}

/* -------------------------------------------------------
   Objetos: copia profunda y comparación estable
------------------------------------------------------- */
function clonar(valor) {
  if (valor === undefined) return undefined;
  return JSON.parse(JSON.stringify(valor));
}

function serializarEstable(valor) {
  if (Array.isArray(valor)) return `[${valor.map(serializarEstable).join(',')}]`;
  if (valor && typeof valor === 'object') {
    return `{${Object.keys(valor).sort()
      .filter(k => valor[k] !== undefined)
      .map(k => `${JSON.stringify(k)}:${serializarEstable(valor[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(valor);
}

function iguales(a, b) {
  return serializarEstable(a) === serializarEstable(b);
}

/* -------------------------------------------------------
   Números y formatos
------------------------------------------------------- */
function numero(valor) {
  if (typeof valor === 'number') return isFinite(valor) ? valor : 0;
  let s = String(valor || '').trim();
  // "1.200" o "1.200,5" → separador de miles a la española
  if (/^\d{1,3}(\.\d{3})+(,\d+)?(\D|$)/.test(s)) s = s.replace(/\./g, '');
  const n = parseFloat(s.replace(',', '.'));
  return isFinite(n) ? n : 0;
}

const formatoEntero = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
const formatoDecimal = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

function fmt(n) {
  return formatoEntero.format(Math.round(numero(n)));
}

function fmtDecimal(n) {
  return formatoDecimal.format(numero(n));
}

// "48" | "48 g" | 48 → "48 g"; vacío si no hay dato
function fmtGramos(valor) {
  if (valor === '' || valor === null || valor === undefined) return '';
  const n = numero(valor);
  if (!n && !/\d/.test(String(valor))) return String(valor);
  return `${fmt(n)} g`;
}

function plural(n, singular, pluralForma = `${singular}s`) {
  return `${fmt(n)} ${Math.round(n) === 1 ? singular : pluralForma}`;
}

/* -------------------------------------------------------
   Fechas
------------------------------------------------------- */
const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DIAS_CORTOS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function indiceHoy() {
  return (new Date().getDay() + 6) % 7;
}

function fechaLarga(fecha = new Date()) {
  return new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(fecha);
}

/* -------------------------------------------------------
   Varios
------------------------------------------------------- */
function debounce(fn, ms = 200) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// Pequeña vibración de confirmación (solo Android la soporta)
function vibrar(ms = 8) {
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch (e) { /* sin soporte */ }
}

const reduceMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)');
