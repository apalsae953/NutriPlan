/* =========================================================
   MÓDULO DE COMIDAS (PLATOS)
   Gestión de platos independientes: nombre, tipo/toma,
   ingredientes clasificados (congelados, frescos, especias...),
   pesos opcionales, preparación y macros nutricionales.
   ========================================================= */

// Estado del módulo de comidas
let comidaEditandoId = null;
let textoBusquedaComidas = '';
let filtroCategoriaComidas = 'todas'; // todas, Almuerzo, Cena, Desayuno, Merienda
let ordenComidas = 'reciente';

// Tipos de ingredientes disponibles
const TIPOS_INGREDIENTE = [
  'Verdura / Hortaliza fresca',
  'Carne fresca',
  'Pescado / Marisco fresco',
  'Congelados',
  'Legumbres / Cereales',
  'Huevos / Lácteos',
  'Conservas',
  'Especias y condimentos',
  'Aceites y grasas',
  'Otros'
];

/* -------------------------------------------------------
   Renderizado principal de la vista de comidas
------------------------------------------------------- */
function renderizarComidas() {
  const container = document.getElementById('comidasContainer');
  if (!container) return;

  let comidas = getComidas();

  // Filtrar por búsqueda
  if (textoBusquedaComidas.trim()) {
    const t = textoBusquedaComidas.toLowerCase();
    comidas = comidas.filter(c => {
      const nombre = (c.nombre || '').toLowerCase();
      const prep = (c.preparacion || '').toLowerCase();
      const ings = (c.ingredientesDetallados || []).some(i => 
        (i.nombre || '').toLowerCase().includes(t) ||
        (i.tipo || '').toLowerCase().includes(t)
      );
      return nombre.includes(t) || prep.includes(t) || ings;
    });
  }

  // Filtrar por toma / categoría
  if (filtroCategoriaComidas !== 'todas') {
    comidas = comidas.filter(c => c.toma === filtroCategoriaComidas);
  }

  // Ordenar comidas
  if (ordenComidas === 'nombre') {
    comidas = comidas.slice().sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));
  } else if (ordenComidas === 'kcal') {
    comidas = comidas.slice().sort((a, b) => (b.kcal || 0) - (a.kcal || 0));
  }

  // Renderizar resumen rápido
  renderizarResumenComidas();

  if (comidas.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <i data-lucide="cooking-pot"></i>
        </div>
        <h3>No hay platos guardados</h3>
        <p>Crea tus platos con sus ingredientes, pesos y preparación, o carga los ejemplos con el botón superior.</p>
        <div class="header-btn-group" style="margin-top: 14px; justify-content: center;">
          <button class="btn btn-outline btn-sm" onclick="cargarEjemplosCompletos()">
            <i data-lucide="sparkles"></i>
            Cargar platos de ejemplo
          </button>
        </div>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  container.innerHTML = `
    <div class="comidas-grid">
      ${comidas.map(c => renderizarTarjetaComida(c)).join('')}
    </div>
  `;

  lucide.createIcons();
}

/* -------------------------------------------------------
   Resumen estadístico de comidas
------------------------------------------------------- */
function renderizarResumenComidas() {
  const el = document.getElementById('comidasResumen');
  if (!el) return;

  const todas = getComidas();
  const total = todas.length;
  const almuerzos = todas.filter(c => c.toma === 'Almuerzo').length;
  const cenas = todas.filter(c => c.toma === 'Cena').length;
  const avgKcal = total > 0 ? Math.round(todas.reduce((acc, c) => acc + (c.kcal || 0), 0) / total) : 0;

  el.innerHTML = `
    <div class="resumen-stat">
      <div class="resumen-stat-icon verde">
        <i data-lucide="chef-hat"></i>
      </div>
      <div class="resumen-stat-info">
        <span class="resumen-stat-valor">${total}</span>
        <span class="resumen-stat-label">Platos creados</span>
      </div>
    </div>
    <div class="resumen-stat">
      <div class="resumen-stat-icon naranja">
        <i data-lucide="sun"></i>
      </div>
      <div class="resumen-stat-info">
        <span class="resumen-stat-valor">${almuerzos}</span>
        <span class="resumen-stat-label">Almuerzos</span>
      </div>
    </div>
    <div class="resumen-stat">
      <div class="resumen-stat-icon morado">
        <i data-lucide="moon"></i>
      </div>
      <div class="resumen-stat-info">
        <span class="resumen-stat-valor">${cenas}</span>
        <span class="resumen-stat-label">Cenas</span>
      </div>
    </div>
    <div class="resumen-stat">
      <div class="resumen-stat-icon verde">
        <i data-lucide="flame"></i>
      </div>
      <div class="resumen-stat-info">
        <span class="resumen-stat-valor">${avgKcal}</span>
        <span class="resumen-stat-label">Kcal medias</span>
      </div>
    </div>
  `;
  lucide.createIcons();
}

/* -------------------------------------------------------
   Tarjeta de plato individual
------------------------------------------------------- */
function renderizarTarjetaComida(comida) {
  const tomaKey = comida.toma || 'Almuerzo';
  const tomaConf = TOMAS_CONFIG[tomaKey] || TOMAS_CONFIG['Almuerzo'];
  const ings = comida.ingredientesDetallados || [];
  const previewIngs = ings.slice(0, 3).map(i => {
    return i.peso ? `${i.peso} ${i.nombre}` : i.nombre;
  }).join(', ');

  return `
    <div class="comida-card card" onclick="abrirDetalleComidaIndividual('${comida.id}')">
      <div class="comida-card-header">
        <span class="comida-toma ${tomaConf.clase}">
          <i data-lucide="${tomaConf.icono}"></i>
          ${tomaKey}
        </span>
        <div class="comida-card-acciones" onclick="event.stopPropagation()">
          <button class="btn-icon" title="Editar plato" onclick="abrirModalEditarComida('${comida.id}')">
            <i data-lucide="pencil"></i>
          </button>
          <button class="btn-icon danger" title="Eliminar plato" onclick="confirmarEliminarComidaIndividual('${comida.id}', '${escapeHtml(comida.nombre)}')">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>

      <h3 class="comida-card-titulo">${escapeHtml(comida.nombre)}</h3>

      <div class="comida-card-preview-ings">
        <i data-lucide="shopping-basket"></i>
        <span>${escapeHtml(previewIngs || 'Sin ingredientes especificados')}${ings.length > 3 ? ` (+${ings.length - 3})` : ''}</span>
      </div>

      ${comida.preparacion ? `
        <p class="comida-card-prep">${escapeHtml(comida.preparacion)}</p>
      ` : ''}

      <div class="comida-card-footer">
        <div class="comida-card-macros">
          <span class="macro-pill kcal"><i data-lucide="flame"></i> ${comida.kcal || 0} kcal</span>
          ${comida.proteina ? `<span class="macro-pill">P: ${escapeHtml(comida.proteina)}</span>` : ''}
          ${comida.carbos ? `<span class="macro-pill">C: ${escapeHtml(comida.carbos)}</span>` : ''}
          ${comida.grasa ? `<span class="macro-pill">G: ${escapeHtml(comida.grasa)}</span>` : ''}
        </div>
      </div>
    </div>
  `;
}

/* -------------------------------------------------------
   Detalle modal de una comida guardada
------------------------------------------------------- */
function abrirDetalleComidaIndividual(id) {
  const comida = getComidaPorId(id);
  if (!comida) return;

  const tomaKey = comida.toma || 'Almuerzo';
  const ings = comida.ingredientesDetallados || [];

  document.getElementById('detalleBadgeDia').textContent = 'Plato guardado';
  document.getElementById('detalleBadgeToma').textContent = tomaKey;

  document.getElementById('modalDetalleBody').innerHTML = `
    <h2 class="detalle-plato">${escapeHtml(comida.nombre)}</h2>

    <div class="detalle-macros">
      <div class="macro-card kcal">
        <span class="macro-valor">${comida.kcal || '0'}</span>
        <span class="macro-label">Calorías</span>
      </div>
      <div class="macro-card">
        <span class="macro-valor">${escapeHtml(comida.proteina || '—')}</span>
        <span class="macro-label">Proteína</span>
      </div>
      <div class="macro-card">
        <span class="macro-valor">${escapeHtml(comida.carbos || '—')}</span>
        <span class="macro-label">Carbos</span>
      </div>
      <div class="macro-card">
        <span class="macro-valor">${escapeHtml(comida.grasa || '—')}</span>
        <span class="macro-label">Grasa</span>
      </div>
    </div>

    <div class="detalle-seccion">
      <div class="detalle-seccion-titulo">
        <i data-lucide="package"></i>
        Ingredientes (${ings.length})
      </div>
      <ul class="ingrediente-lista">
        ${ings.map(i => `
          <li class="ingrediente-item ingrediente-item-clasificado">
            <div class="ing-item-main">
              <strong>${escapeHtml(i.nombre)}</strong>
              ${i.peso ? `<span class="ing-peso-badge">${escapeHtml(i.peso)}</span>` : '<span class="ing-peso-badge opcional">Peso a gusto / no fijado</span>'}
            </div>
            ${i.tipo ? `<span class="ing-tipo-tag"><i data-lucide="tag"></i>${escapeHtml(i.tipo)}</span>` : ''}
          </li>
        `).join('')}
      </ul>
    </div>

    ${comida.preparacion ? `
      <div class="detalle-seccion">
        <div class="detalle-seccion-titulo">
          <i data-lucide="chef-hat"></i>
          Preparación paso a paso
        </div>
        <div class="detalle-preparacion">${escapeHtml(comida.preparacion)}</div>
      </div>
    ` : ''}
  `;

  lucide.createIcons();
  abrirModal('modalDetalle');
}

/* -------------------------------------------------------
   Modal: Nueva / Editar Comida
------------------------------------------------------- */
function abrirModalNuevaComida() {
  comidaEditandoId = null;
  document.getElementById('modalComidaTitulo').textContent = 'Crear nueva comida';
  document.getElementById('comidaFormNombre').value = '';
  document.getElementById('comidaFormToma').value = 'Almuerzo';
  document.getElementById('comidaFormKcal').value = '';
  document.getElementById('comidaFormProteina').value = '';
  document.getElementById('comidaFormCarbos').value = '';
  document.getElementById('comidaFormGrasa').value = '';
  document.getElementById('comidaFormPreparacion').value = '';

  // Limpiar lista de ingredientes dinámicos y añadir 2 filas vacías por defecto
  const contenedor = document.getElementById('comidaFormIngredientesLista');
  contenedor.innerHTML = '';
  agregarFilaIngredienteComida();
  agregarFilaIngredienteComida();

  abrirModal('modalComida');
}

function abrirModalEditarComida(id) {
  const comida = getComidaPorId(id);
  if (!comida) return;

  comidaEditandoId = id;
  document.getElementById('modalComidaTitulo').textContent = 'Editar comida';
  document.getElementById('comidaFormNombre').value = comida.nombre || '';
  document.getElementById('comidaFormToma').value = comida.toma || 'Almuerzo';
  document.getElementById('comidaFormKcal').value = comida.kcal || '';
  document.getElementById('comidaFormProteina').value = comida.proteina || '';
  document.getElementById('comidaFormCarbos').value = comida.carbos || '';
  document.getElementById('comidaFormGrasa').value = comida.grasa || '';
  document.getElementById('comidaFormPreparacion').value = comida.preparacion || '';

  const contenedor = document.getElementById('comidaFormIngredientesLista');
  contenedor.innerHTML = '';

  const ings = comida.ingredientesDetallados || [];
  if (ings.length > 0) {
    ings.forEach(i => agregarFilaIngredienteComida(i));
  } else {
    agregarFilaIngredienteComida();
  }

  abrirModal('modalComida');
}

/* -------------------------------------------------------
   Filas dinámicas de ingredientes en el formulario
------------------------------------------------------- */
function agregarFilaIngredienteComida(dato = null) {
  const contenedor = document.getElementById('comidaFormIngredientesLista');
  if (!contenedor) return;

  const filaId = generarId('ing_fila');
  const fila = document.createElement('div');
  fila.className = 'ingrediente-form-fila';
  fila.id = filaId;

  const nombreVal = dato ? escapeHtml(dato.nombre || '') : '';
  const pesoVal = dato ? escapeHtml(dato.peso || '') : '';
  const tipoVal = dato ? dato.tipo : 'Verdura / Hortaliza fresca';

  fila.innerHTML = `
    <div class="ing-form-col-nombre">
      <input type="text" class="form-input form-input-sm ing-input-nombre" placeholder="Nombre (ej: Pechuga de pollo)" value="${nombreVal}" required />
    </div>
    <div class="ing-form-col-peso">
      <input type="text" class="form-input form-input-sm ing-input-peso" placeholder="Peso opcional (ej: 150 g)" value="${pesoVal}" />
    </div>
    <div class="ing-form-col-tipo">
      <select class="form-input form-select form-input-sm ing-select-tipo">
        ${TIPOS_INGREDIENTE.map(t => `<option value="${t}" ${t === tipoVal ? 'selected' : ''}>${t}</option>`).join('')}
      </select>
    </div>
    <button type="button" class="btn-icon danger ing-btn-borrar" title="Quitar ingrediente" onclick="document.getElementById('${filaId}').remove()">
      <i data-lucide="trash-2"></i>
    </button>
  `;

  contenedor.appendChild(fila);
  lucide.createIcons();
}

/* -------------------------------------------------------
   Guardar comida desde formulario
------------------------------------------------------- */
function guardarComidaForm(e) {
  e.preventDefault();

  const nombre = document.getElementById('comidaFormNombre').value.trim();
  const toma = document.getElementById('comidaFormToma').value;
  const preparacion = document.getElementById('comidaFormPreparacion').value.trim();
  const kcal = parseFloat(document.getElementById('comidaFormKcal').value) || 0;
  const proteina = document.getElementById('comidaFormProteina').value.trim();
  const carbos = document.getElementById('comidaFormCarbos').value.trim();
  const grasa = document.getElementById('comidaFormGrasa').value.trim();

  if (!nombre) {
    mostrarToast('Por favor, indica un nombre para el plato', 'error');
    return;
  }

  // Recoger filas de ingredientes
  const filas = document.querySelectorAll('#comidaFormIngredientesLista .ingrediente-form-fila');
  const ingredientesDetallados = [];

  filas.forEach(f => {
    const n = f.querySelector('.ing-input-nombre').value.trim();
    const p = f.querySelector('.ing-input-peso').value.trim();
    const t = f.querySelector('.ing-select-tipo').value;
    if (n) {
      ingredientesDetallados.push({
        nombre: n,
        peso: p || '', // Opcional
        tipo: t || 'Otros'
      });
    }
  });

  const nuevaComida = {
    id: comidaEditandoId || generarId('comida'),
    nombre,
    toma,
    preparacion,
    ingredientesDetallados,
    kcal,
    proteina,
    carbos,
    grasa,
    fechaCreacion: new Date().toISOString()
  };

  guardarComidaStorage(nuevaComida);
  cerrarModal('modalComida');
  renderizarComidas();
  mostrarToast(comidaEditandoId ? 'Plato actualizado con éxito' : 'Nuevo plato guardado con éxito', 'success');
}

/* -------------------------------------------------------
   Confirmar y eliminar comida
------------------------------------------------------- */
function confirmarEliminarComidaIndividual(id, nombre) {
  document.getElementById('confirmarTexto').textContent =
    `¿Deseas eliminar el plato "${nombre}" de tu colección de comidas?`;

  document.getElementById('confirmarBtn').onclick = () => {
    eliminarComidaStorage(id);
    cerrarModal('modalConfirmar');
    renderizarComidas();
    mostrarToast('Plato eliminado de la colección', 'success');
  };

  abrirModal('modalConfirmar');
}

/* -------------------------------------------------------
   Filtros y búsquedas en comidas
------------------------------------------------------- */
function filtrarComidasTexto() {
  const input = document.getElementById('buscarComidasInput');
  if (input) {
    textoBusquedaComidas = input.value;
    renderizarComidas();
  }
}

function filtrarComidasCategoria(cat, btn) {
  filtroCategoriaComidas = cat;
  document.querySelectorAll('#filtrosComidaCategoria .filter-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderizarComidas();
}

function cambiarOrdenComidas() {
  if (ordenComidas === 'reciente') {
    ordenComidas = 'nombre';
    mostrarToast('Ordenando por nombre (A-Z)', 'info');
  } else if (ordenComidas === 'nombre') {
    ordenComidas = 'kcal';
    mostrarToast('Ordenando por calorías (mayor a menor)', 'info');
  } else {
    ordenComidas = 'reciente';
    mostrarToast('Ordenando por orden original', 'info');
  }
  renderizarComidas();
}
