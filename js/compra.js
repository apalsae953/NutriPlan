/* =========================================================
   MÓDULO DE LISTA DE LA COMPRA
   Gestiona la vista de compra: renderizado por categorías,
   checkboxes, notas expandibles, añadir y editar ingredientes.
   ========================================================= */

// Configuración de categorías: icono (emoji o texto) y clase CSS
const CATEGORIAS_CONFIG = {
  'Carnes y pescados':    { emoji: '🥩', clase: 'cat-carnes',      icono: 'beef' },
  'Lácteos y huevos':     { emoji: '🥚', clase: 'cat-lacteos',     icono: 'egg' },
  'Verduras y hortalizas':{ emoji: '🥦', clase: 'cat-verduras',    icono: 'salad' },
  'Legumbres y cereales': { emoji: '🌾', clase: 'cat-legumbres',   icono: 'wheat' },
  'Conservas':            { emoji: '🥫', clase: 'cat-conservas',   icono: 'package' },
  'Condimentos y aceites':{ emoji: '🫙', clase: 'cat-condimentos', icono: 'flask-conical' },
  'Congelados':           { emoji: '❄️', clase: 'cat-congelados',  icono: 'thermometer-snowflake' },
  'Otros':                { emoji: '🛒', clase: 'cat-otros',       icono: 'shopping-bag' }
};

// Orden de presentación de las categorías
const ORDEN_CATEGORIAS = [
  'Carnes y pescados',
  'Lácteos y huevos',
  'Verduras y hortalizas',
  'Legumbres y cereales',
  'Conservas',
  'Condimentos y aceites',
  'Congelados',
  'Otros'
];

// Estado local
let ingEditando       = null; // null = nuevo
let textoBusquedaIng  = '';
let ordenAscendente   = true;

/* -------------------------------------------------------
   Renderizado principal de la lista de la compra
------------------------------------------------------- */
function renderizarCompra() {
  renderizarResumen();
  renderizarListaCompra();
}

/* -------------------------------------------------------
   Chips de resumen estadístico
------------------------------------------------------- */
function renderizarResumen() {
  const lista       = getCompra();
  const total       = lista.length;
  const comprados   = lista.filter(i => i.comprado).length;
  const pendientes  = total - comprados;
  const categorias  = new Set(lista.map(i => i.categoria)).size;

  document.getElementById('compraResumen').innerHTML = `
    <div class="resumen-stat">
      <div class="resumen-stat-icon verde">
        <i data-lucide="shopping-basket"></i>
      </div>
      <div class="resumen-stat-info">
        <span class="resumen-stat-valor">${total}</span>
        <span class="resumen-stat-label">Total ingredientes</span>
      </div>
    </div>
    <div class="resumen-stat">
      <div class="resumen-stat-icon naranja">
        <i data-lucide="circle-dot"></i>
      </div>
      <div class="resumen-stat-info">
        <span class="resumen-stat-valor">${pendientes}</span>
        <span class="resumen-stat-label">Pendientes</span>
      </div>
    </div>
    <div class="resumen-stat">
      <div class="resumen-stat-icon verde">
        <i data-lucide="check-circle-2"></i>
      </div>
      <div class="resumen-stat-info">
        <span class="resumen-stat-valor">${comprados}</span>
        <span class="resumen-stat-label">Comprados</span>
      </div>
    </div>
    <div class="resumen-stat">
      <div class="resumen-stat-icon morado">
        <i data-lucide="layers"></i>
      </div>
      <div class="resumen-stat-info">
        <span class="resumen-stat-valor">${categorias}</span>
        <span class="resumen-stat-label">Categorías</span>
      </div>
    </div>
  `;
  lucide.createIcons();
}

/* -------------------------------------------------------
   Lista de ingredientes agrupada por categoría
------------------------------------------------------- */
function renderizarListaCompra() {
  const container = document.getElementById('compraContainer');
  let lista = getCompra();

  // Aplicar filtro de texto
  if (textoBusquedaIng.trim()) {
    const t = textoBusquedaIng.toLowerCase();
    lista = lista.filter(i =>
      i.nombre.toLowerCase().includes(t) ||
      (i.cantidad || '').toLowerCase().includes(t) ||
      (i.notas || '').toLowerCase().includes(t)
    );
  }

  // Aplicar orden
  lista = lista.slice().sort((a, b) => {
    const cmp = a.nombre.localeCompare(b.nombre, 'es');
    return ordenAscendente ? cmp : -cmp;
  });

  if (lista.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <i data-lucide="shopping-cart"></i>
        </div>
        <h3>Lista vacía</h3>
        <p>Añade ingredientes con el botón "Añadir" o importa los de tu dieta.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  // Agrupar por categoría
  const porCategoria = {};
  lista.forEach(i => {
    const cat = i.categoria || 'Otros';
    if (!porCategoria[cat]) porCategoria[cat] = [];
    porCategoria[cat].push(i);
  });

  const html = ORDEN_CATEGORIAS
    .filter(cat => porCategoria[cat] && porCategoria[cat].length > 0)
    .map(cat => renderizarCategoriaGrupo(cat, porCategoria[cat]))
    .join('');

  container.innerHTML = html;
  lucide.createIcons();
}

/* -------------------------------------------------------
   HTML de un grupo de categoría
------------------------------------------------------- */
function renderizarCategoriaGrupo(categoria, ingredientes) {
  const conf       = CATEGORIAS_CONFIG[categoria] || CATEGORIAS_CONFIG['Otros'];
  const comprados  = ingredientes.filter(i => i.comprado).length;
  const total      = ingredientes.length;
  const pct        = total > 0 ? Math.round((comprados / total) * 100) : 0;
  const catId      = categoria.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');

  return `
    <div class="categoria-grupo abierta" id="catGrupo_${catId}">
      <div class="categoria-header" onclick="toggleCategoria('${catId}')">
        <div class="categoria-icono ${conf.clase}">
          <i data-lucide="${conf.icono}"></i>
        </div>
        <span class="categoria-nombre">${categoria}</span>
        <div class="categoria-contador">
          <span>${comprados}/${total}</span>
          <div class="categoria-progreso-bar">
            <div class="categoria-progreso-fill" style="width:${pct}%"></div>
          </div>
        </div>
        <i data-lucide="chevron-down" class="categoria-chevron"></i>
      </div>
      <div class="categoria-lista">
        ${ingredientes.map(i => renderizarIngFila(i)).join('')}
      </div>
    </div>
  `;
}

/* -------------------------------------------------------
   HTML de una fila de ingrediente
------------------------------------------------------- */
function renderizarIngFila(ing) {
  const tieneNotas = ing.notas && ing.notas.trim().length > 0;

  return `
    <div class="ing-fila ${ing.comprado ? 'comprado' : ''}" id="ingFila_${ing.id}">
      <label class="ing-checkbox">
        <input type="checkbox"
          ${ing.comprado ? 'checked' : ''}
          onchange="marcarComprado('${ing.id}', this)" />
        <div class="ing-checkbox-custom">
          <i data-lucide="check"></i>
        </div>
      </label>
      <div class="ing-info">
        <div class="ing-nombre">${escapeHtml(ing.nombre)}</div>
        ${ing.cantidad ? `<div class="ing-cantidad">${escapeHtml(ing.cantidad)}</div>` : ''}
      </div>
      ${tieneNotas ? `
        <button class="ing-nota-toggle" title="Ver notas" onclick="toggleNotasIng('${ing.id}')">
          <i data-lucide="info"></i>
        </button>
      ` : '<div style="width:30px"></div>'}
      <div class="ing-acciones">
        <button class="btn-icon" title="Editar" onclick="abrirModalEditarIngrediente('${ing.id}')">
          <i data-lucide="pencil"></i>
        </button>
        <button class="btn-icon danger" title="Eliminar" onclick="confirmarEliminarIngrediente('${ing.id}', '${escapeHtml(ing.nombre)}')">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    </div>
    ${tieneNotas ? `
      <div class="ing-notas-panel" id="notas_${ing.id}">
        <i data-lucide="info" style="width:14px;height:14px;flex-shrink:0;display:inline-block;vertical-align:middle;margin-right:6px;color:var(--color-primary)"></i>
        ${escapeHtml(ing.notas)}
      </div>
    ` : ''}
  `;
}

/* -------------------------------------------------------
   Toggle categoría
------------------------------------------------------- */
function toggleCategoria(catId) {
  const el = document.getElementById(`catGrupo_${catId}`);
  if (el) el.classList.toggle('abierta');
}

/* -------------------------------------------------------
   Toggle notas de un ingrediente
------------------------------------------------------- */
function toggleNotasIng(id) {
  const panel = document.getElementById(`notas_${id}`);
  if (panel) panel.classList.toggle('visible');
}

/* -------------------------------------------------------
   Marcar/desmarcar ingrediente como comprado
------------------------------------------------------- */
function marcarComprado(id, checkbox) {
  const comprado = toggleCompradoStorage(id);
  const fila = document.getElementById(`ingFila_${id}`);
  if (fila) {
    fila.classList.toggle('comprado', comprado);
  }
  // Actualizar resumen sin re-renderizar toda la lista
  renderizarResumen();
  // Re-renderizar categoría para actualizar barra de progreso
  renderizarListaCompra();
}

/* -------------------------------------------------------
   Limpiar todos los marcados
------------------------------------------------------- */
function limpiarComprados() {
  limpiarCompradosStorage();
  renderizarCompra();
  mostrarToast('Lista reiniciada', 'success');
}

/* -------------------------------------------------------
   Ordenar lista
------------------------------------------------------- */
function ordenarCompra() {
  ordenAscendente = !ordenAscendente;
  renderizarListaCompra();
}

/* -------------------------------------------------------
   Filtrar ingredientes por texto
------------------------------------------------------- */
function filtrarIngredientes() {
  textoBusquedaIng = document.getElementById('buscarIngrediente').value;
  renderizarListaCompra();
}

/* -------------------------------------------------------
   Modal: nuevo ingrediente
------------------------------------------------------- */
function abrirModalNuevoIngrediente() {
  ingEditando = null;
  document.getElementById('modalIngTitulo').textContent = 'Añadir ingrediente';
  document.getElementById('ingNombre').value    = '';
  document.getElementById('ingCantidad').value  = '';
  document.getElementById('ingCategoria').value = 'Carnes y pescados';
  document.getElementById('ingNotas').value     = '';
  abrirModal('modalIngrediente');
}

/* -------------------------------------------------------
   Modal: editar ingrediente existente
------------------------------------------------------- */
function abrirModalEditarIngrediente(id) {
  const ing = getIngredientePorId(id);
  if (!ing) return;

  ingEditando = id;
  document.getElementById('modalIngTitulo').textContent = 'Editar ingrediente';
  document.getElementById('ingNombre').value    = ing.nombre;
  document.getElementById('ingCantidad').value  = ing.cantidad || '';
  document.getElementById('ingCategoria').value = ing.categoria || 'Otros';
  document.getElementById('ingNotas').value     = ing.notas || '';
  abrirModal('modalIngrediente');
}

/* -------------------------------------------------------
   Guardar ingrediente (nuevo o editado)
------------------------------------------------------- */
function guardarIngrediente(e) {
  e.preventDefault();

  const nombre    = document.getElementById('ingNombre').value.trim();
  const cantidad  = document.getElementById('ingCantidad').value.trim();
  const categoria = document.getElementById('ingCategoria').value;
  const notas     = document.getElementById('ingNotas').value.trim();

  if (!nombre) {
    mostrarToast('El nombre es obligatorio', 'error');
    return;
  }

  const ing = {
    id:        ingEditando || generarId('ing'),
    nombre,
    cantidad,
    categoria,
    notas,
    comprado:  ingEditando ? (getIngredientePorId(ingEditando)?.comprado || false) : false
  };

  guardarIngredienteStorage(ing);
  cerrarModal('modalIngrediente');
  renderizarCompra();
  mostrarToast(ingEditando ? 'Ingrediente actualizado' : 'Ingrediente añadido', 'success');
}

/* -------------------------------------------------------
   Confirmar y eliminar ingrediente
------------------------------------------------------- */
function confirmarEliminarIngrediente(id, nombre) {
  document.getElementById('confirmarTexto').textContent =
    `¿Seguro que quieres eliminar "${nombre}" de la lista?`;

  document.getElementById('confirmarBtn').onclick = () => {
    eliminarIngredienteStorage(id);
    cerrarModal('modalConfirmar');
    renderizarCompra();
    mostrarToast('Ingrediente eliminado', 'success');
  };

  abrirModal('modalConfirmar');
}
