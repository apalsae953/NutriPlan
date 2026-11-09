/* =========================================================
   CATEGORÍAS DE LA COMPRA
   - Orden pensado para el recorrido habitual del súper
   - Clasificación automática por palabras clave
   - Interpretación de cantidades ("2 kg naranjas", "leche x6")
   - Agregado de ingredientes de dietas y recetas
   ========================================================= */

// El "id" coincide con las categorías guardadas por versiones anteriores
const CATEGORIAS = [
  { id: 'Verduras y hortalizas', nombre: 'Fruta y verdura',          color: '#6f9a45' },
  { id: 'Carnes y pescados',     nombre: 'Carne y pescado',          color: '#b4553f' },
  { id: 'Lácteos y huevos',      nombre: 'Lácteos y huevos',         color: '#c9a24a' },
  { id: 'Panadería',             nombre: 'Pan y bollería',           color: '#a87a4a' },
  { id: 'Legumbres y cereales',  nombre: 'Pasta, arroz y legumbres', color: '#b88d3c' },
  { id: 'Conservas',             nombre: 'Conservas',                color: '#8c6f5a' },
  { id: 'Condimentos y aceites', nombre: 'Aceites, salsas y especias', color: '#9a8a3a' },
  { id: 'Congelados',            nombre: 'Congelados',               color: '#5b84a8' },
  { id: 'Bebidas',               nombre: 'Bebidas',                  color: '#6f7fb0' },
  { id: 'Limpieza e higiene',    nombre: 'Limpieza e higiene',       color: '#7b9a9a' },
  { id: 'Otros',                 nombre: 'Otros',                    color: '#8f877b' }
];

const CATEGORIA_POR_ID = Object.fromEntries(CATEGORIAS.map(c => [c.id, c]));

function infoCategoria(id) {
  return CATEGORIA_POR_ID[id] || CATEGORIA_POR_ID['Otros'];
}

/* -------------------------------------------------------
   Reglas de clasificación (el orden importa: la primera gana)
   Cada palabra se busca al inicio de una palabra del nombre
------------------------------------------------------- */
const REGLAS_CATEGORIA = [
  ['Congelados', ['congelad', 'ultracongelad', 'helado', 'pizza', 'nuggets', 'varitas', 'croquetas', 'hielo']],
  ['Limpieza e higiene', [
    'detergente', 'suavizante', 'lejia', 'friegasuelos', 'lavavajillas', 'fairy', 'jabon', 'champu', 'gel\\b',
    'papel', 'servilleta', 'basura', 'estropajo', 'bayeta', 'pasta de dientes', 'dentifrico', 'cepillo',
    'desodorante', 'compresa', 'tampon', 'panal', 'toallita', 'limpia', 'amoniaco', 'ambientador', 'insecticida',
    'film', 'aluminio', 'quitagrasa', 'maquinilla', 'cuchilla', 'algodon', 'panuelo', 'colonia', 'crema de manos',
    'protector solar', 'bastoncillo', 'mascarilla', 'pilas?\\b', 'bombilla', 'vela'
  ]],
  ['Condimentos y aceites', [
    'aceite', 'vinagre', 'sal\\b', 'pimienta', 'pimenton', 'oregano', 'comino', 'curry', 'especia', 'en polvo',
    'canela', 'mostaza', 'ketchup', 'mayonesa', 'salsa', 'soja', 'tomillo', 'romero', 'laurel', 'azucar',
    'edulcorante', 'miel', 'caldo', 'avecrem', 'levadura', 'nuez moscada', 'vainilla', 'cacao', 'guindilla',
    'sazonador', 'hierbas', 'ali oli', 'alioli', 'pesto', 'colorante', 'cayena'
  ]],
  ['Bebidas', [
    'agua', 'refresco', 'coca', 'cola\\b', 'fanta', 'cerveza', 'vino', 'zumo', 'cafe', 'te\\b', 'infusion',
    'bebida', 'tonica', 'gaseosa', 'isotonic', 'aquarius', 'nestea', 'sidra', 'cava\\b', 'licor', 'ron\\b',
    'ginebra', 'whisky', 'vermut', 'manzanilla\\b', 'poleo'
  ]],
  ['Conservas', [
    'lata', 'bote', 'conserva', 'atun', 'berberecho', 'aceituna', 'pepinillo', 'maiz', 'piquillo', 'triturado',
    'tomate frito', 'pisto', 'cocid', 'alcaparra', 'anchoa', 'almibar', 'mermelada', 'pate\\b', 'esparragos? blanco',
    'sardinillas', 'garbanzos? de bote', 'mejillones en'
  ]],
  ['Panadería', [
    'pan\\b', 'panes', 'barra', 'baguette', 'chapata', 'molde', 'tostada', 'picos', 'regana', 'colines',
    'croissant', 'cruasan', 'magdalena', 'bolleria', 'bollo', 'napolitana', 'donut', 'bizcocho', 'tortillas? de trigo',
    'wrap', 'rallado', 'hogaza', 'brioche', 'galleta'
  ]],
  ['Lácteos y huevos', [
    'leche', 'huevo', 'yogur', 'queso', 'mantequilla', 'nata', 'kefir', 'requeson', 'cuajada', 'batido',
    'natillas', 'flan', 'margarina', 'skyr', 'petit', 'quark', 'mozzarella', 'burrata', 'claras'
  ]],
  ['Carnes y pescados', [
    'pollo', 'pavo', 'ternera', 'cerdo', 'lomo', 'solomillo', 'carne', 'picada', 'hamburguesa', 'salchicha',
    'chorizo', 'jamon', 'bacon', 'beicon', 'panceta', 'costilla', 'cordero', 'conejo', 'pechuga', 'muslo',
    'contramuslo', 'alita', 'filete', 'entrecot', 'chuleta', 'secreto', 'presa\\b', 'merluza', 'salmon', 'bacalao',
    'dorada', 'lubina', 'gamba', 'langostino', 'calamar', 'sepia', 'pulpo', 'mejillon', 'almeja', 'pescado',
    'sardina', 'boqueron', 'caballa', 'emperador', 'rape', 'trucha', 'embutido', 'fiambre', 'lonchas', 'chistorra',
    'morcilla', 'fuet', 'salchichon', 'mortadela', 'albondiga', 'surimi', 'gulas', 'pavo'
  ]],
  ['Legumbres y cereales', [
    'arroz', 'pasta', 'macarron', 'espagueti', 'spaghetti', 'fideo', 'tallarin', 'lasana', 'canelon', 'lenteja',
    'garbanzo', 'alubia', 'judias blancas', 'judion', 'quinoa', 'avena', 'copos', 'cereales', 'harina', 'cuscus',
    'legumbre', 'muesli', 'granola', 'tortita', 'maicena', 'gnocchi', 'noodles', 'frutos secos', 'almendra',
    'nuez', 'nueces', 'cacahuete', 'pistacho', 'anacardo', 'pipas', 'soja texturizada'
  ]],
  ['Verduras y hortalizas', [
    'tomate', 'lechuga', 'cebolla', 'cebolleta', 'ajo', 'patata', 'zanahoria', 'calabacin', 'pimiento', 'pepino',
    'berenjena', 'brocoli', 'espinaca', 'acelga', 'champinon', 'seta', 'puerro', 'apio', 'col\\b', 'coliflor',
    'repollo', 'lombarda', 'judias? verdes?', 'aguacate', 'limon', 'lima\\b', 'naranja', 'manzana', 'platano',
    'pera\\b', 'peras\\b', 'fresa', 'uva', 'kiwi', 'melon', 'sandia', 'pina\\b', 'mango', 'melocoton', 'nectarina',
    'mandarina', 'fruta', 'verdura', 'hortaliza', 'ensalada', 'rucula', 'canonigo', 'cilantro', 'perejil',
    'albahaca', 'hierbabuena', 'menta', 'calabaza', 'boniato', 'alcachofa', 'esparrago', 'remolacha', 'jengibre',
    'arandano', 'frambuesa', 'cereza', 'ciruela', 'higo', 'granada', 'caqui', 'papaya', 'coco', 'rabano',
    'endibia', 'escarola', 'brote', 'guisante', 'habas', 'chalota'
  ]]
];

const REGLAS_COMPILADAS = REGLAS_CATEGORIA.map(([cat, palabras]) => [
  cat,
  new RegExp(`(?:^|[^a-z])(?:${palabras.join('|')})`)
]);

/* -------------------------------------------------------
   Adivinar la categoría de un producto
   1. Lo que ya se usó antes (historial compartido)
   2. Reglas por palabras clave
------------------------------------------------------- */
function adivinarCategoria(nombre) {
  const clave = claveProducto(nombre);
  const previo = (typeof getHistorial === 'function' ? getHistorial() : []).find(h => h.id === clave);
  if (previo && previo.categoria) return previo.categoria;

  const n = normalizar(nombre);
  for (const [cat, re] of REGLAS_COMPILADAS) {
    if (re.test(n)) return cat;
  }
  return 'Otros';
}

// Tipos de ingrediente de las recetas → categoría de la compra
const TIPO_A_CATEGORIA = {
  'Verdura / Hortaliza fresca': 'Verduras y hortalizas',
  'Carne fresca': 'Carnes y pescados',
  'Pescado / Marisco fresco': 'Carnes y pescados',
  'Congelados': 'Congelados',
  'Legumbres / Cereales': 'Legumbres y cereales',
  'Huevos / Lácteos': 'Lácteos y huevos',
  'Conservas': 'Conservas',
  'Especias y condimentos': 'Condimentos y aceites',
  'Aceites y grasas': 'Condimentos y aceites'
};

/* -------------------------------------------------------
   Clave de producto: sin tildes, sin paréntesis y en singular
   aproximado, para detectar duplicados ("Huevos" = "huevo")
------------------------------------------------------- */
function claveProducto(nombre) {
  return normalizar(String(nombre || '').replace(/\([^)]*\)/g, ' '))
    .replace(/[^a-z0-9ñ ]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(p => {
      // "tomates"/"tomate" → "tomat", "limones"/"limón" → "limon", "huevos" → "huevo"
      if (p.length > 3 && p.endsWith('s')) p = p.slice(0, -1);
      if (p.length > 3 && /[^aeiou]e$/.test(p)) p = p.slice(0, -1);
      return p;
    })
    .join(' ');
}

/* -------------------------------------------------------
   Cantidades
------------------------------------------------------- */
const UNIDADES = 'kg|kilos?|g|gr|grs|gramos?|l|litros?|ml|cl|ud|uds|unidad(?:es)?|paq(?:uetes?)?|latas?|botes?|bricks?|botellas?|docenas?|bolsas?|cajas?|tarros?|mallas?|bandejas?|barras?|piezas?|sobres?|rollos?|manojos?';
const RE_CANTIDAD_INICIO = new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*(${UNIDADES})?\\.?\\s+(?:de\\s+)?(.+)$`, 'i');
const RE_CANTIDAD_FINAL = new RegExp(`^(.+?)\\s+(?:x\\s*)?(\\d+(?:[.,]\\d+)?)\\s*(${UNIDADES})?\\.?$`, 'i');
const RE_POR_X = /^(.+?)\s*x\s*(\d+)$/i;

// "2 kg naranjas" → { nombre: 'Naranjas', cantidad: '2 kg' }
function interpretarEntrada(texto) {
  const t = String(texto || '').trim().replace(/\s+/g, ' ');
  if (!t) return null;

  let m = t.match(RE_CANTIDAD_INICIO);
  if (m) return { nombre: capitalizar(m[3]), cantidad: [m[1], m[2]].filter(Boolean).join(' ') };

  m = t.match(RE_POR_X);
  if (m) return { nombre: capitalizar(m[1]), cantidad: `x${m[2]}` };

  m = t.match(RE_CANTIDAD_FINAL);
  if (m && m[3]) return { nombre: capitalizar(m[1]), cantidad: `${m[2]} ${m[3]}` };

  return { nombre: capitalizar(t), cantidad: '' };
}

// Divide "pan, leche; huevos" en entradas sueltas
function dividirEntradas(texto) {
  return String(texto || '')
    .split(/[,;\n]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

/* -------------------------------------------------------
   Agregado de ingredientes (dietas y recetas → compra)
------------------------------------------------------- */
const RE_MEDIDA = /^(\d+(?:[.,]\d+)?)\s*(kg|kilos?|g|gr|grs|gramos?|l|litros?|ml|cl|uds?|unidad(?:es)?)?\b\.?/i;

function medida(texto) {
  const m = String(texto || '').trim().match(RE_MEDIDA);
  if (!m) return null;
  let valor = numero(m[1]);
  const u = (m[2] || 'ud').toLowerCase();
  if (/^(kg|kilo)/.test(u)) return { valor: valor * 1000, unidad: 'g' };
  if (/^(g|gr|gramo)/.test(u)) return { valor, unidad: 'g' };
  if (/^(l|litro)/.test(u)) return { valor: valor * 1000, unidad: 'ml' };
  if (u === 'cl') return { valor: valor * 10, unidad: 'ml' };
  if (u === 'ml') return { valor, unidad: 'ml' };
  return { valor, unidad: 'ud' };
}

function textoMedida({ valor, unidad }) {
  if (unidad === 'g' && valor >= 1000) return `${fmtDecimal(valor / 1000)} kg`;
  if (unidad === 'ml' && valor >= 1000) return `${fmtDecimal(valor / 1000)} l`;
  if (unidad === 'ud') return `${fmtDecimal(valor)} ${valor === 1 ? 'ud' : 'uds'}`;
  return `${fmtDecimal(valor)} ${unidad}`;
}

// Separa por "+" y por comas que no estén dentro de paréntesis
function trocearLineaIngrediente(linea) {
  const partes = [];
  let actual = '', nivel = 0;
  for (const ch of String(linea || '')) {
    if (ch === '(') nivel++;
    if (ch === ')') nivel = Math.max(0, nivel - 1);
    if ((ch === ',' || ch === '+') && nivel === 0) {
      partes.push(actual);
      actual = '';
    } else {
      actual += ch;
    }
  }
  partes.push(actual);
  return partes.map(p => p.trim()).filter(Boolean);
}

/*
  entradas: [{ texto }] (línea libre de una dieta)
         o  [{ nombre, peso, tipo }] (ingrediente de un plato)
  devuelve: [{ clave, nombre, cantidad, categoria }]
*/
function agregarIngredientes(entradas) {
  const mapa = new Map();

  const sumar = (nombre, med, categoria) => {
    const limpio = capitalizar(String(nombre).replace(/\s*\([^)]*\)\s*/g, ' ').trim());
    if (!limpio) return;
    const clave = claveProducto(limpio);
    if (!clave) return;
    if (!mapa.has(clave)) {
      mapa.set(clave, { clave, nombre: limpio, medidas: {}, categoria: categoria || adivinarCategoria(limpio) });
    }
    const item = mapa.get(clave);
    if (med) item.medidas[med.unidad] = (item.medidas[med.unidad] || 0) + med.valor;
  };

  entradas.forEach(e => {
    if (e.texto !== undefined) {
      trocearLineaIngrediente(e.texto).forEach(trozo => {
        const m = trozo.match(RE_MEDIDA);
        if (m) {
          const resto = trozo.slice(m[0].length).replace(/^\s*(de\s+)?/i, '');
          sumar(resto || trozo, medida(trozo));
        } else {
          sumar(trozo, null);
        }
      });
    } else if (e.nombre) {
      sumar(e.nombre, medida(e.peso), TIPO_A_CATEGORIA[e.tipo]);
    }
  });

  return [...mapa.values()].map(i => ({
    clave: i.clave,
    nombre: i.nombre,
    categoria: i.categoria,
    cantidad: Object.entries(i.medidas)
      .map(([unidad, valor]) => textoMedida({ valor, unidad }))
      .join(' + ')
  }));
}
