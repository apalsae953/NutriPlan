/* =========================================================
   MÓDULO DE DIETAS
   Gestiona la vista de dietas: renderizado, filtros,
   modales de creación/edición y detalle de comidas.
   ========================================================= */

// Estado local del módulo
let dietasFiltradas  = [];
let diaSeleccionado  = 'todos';
let textoBusqueda    = '';
let dietaEditando    = null; // ID de la dieta en edición (null = nueva)

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const TOMAS_CONFIG = {
  'Desayuno':  { clase: 'desayuno',  icono: 'sunrise' },
  'Almuerzo':  { clase: 'almuerzo',  icono: 'sun' },
  'Merienda':  { clase: 'merienda',  icono: 'coffee' },
  'Cena':      { clase: 'cena',      icono: 'moon' }
};

/* -------------------------------------------------------
   Renderizado principal de dietas
------------------------------------------------------- */
function renderizarDietas() {
  const container = document.getElementById('dietasContainer');
  let dietas = getDietas();

  // Aplicar filtro de texto
  if (textoBusqueda.trim()) {
    const t = textoBusqueda.toLowerCase();
    dietas = dietas.filter(d =>
      d.nombre.toLowerCase().includes(t) ||
      (d.descripcion || '').toLowerCase().includes(t) ||
      d.comidas.some(c =>
        c.plato.toLowerCase().includes(t) ||
        (c.ingredientes || []).some(i => i.toLowerCase().includes(t))
      )
    );
  }

  // Aplicar filtro de día
  if (diaSeleccionado !== 'todos') {
    dietas = dietas.map(d => ({
      ...d,
      comidas: d.comidas.filter(c => c.dia === diaSeleccionado)
    })).filter(d => d.comidas.length > 0);
  }

  dietasFiltradas = dietas;

  if (dietas.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <i data-lucide="utensils"></i>
        </div>
        <h3>Sin dietas guardadas</h3>
        <p>Crea tu primera dieta con el botón "Nueva dieta" o usa los datos importados del Excel.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  container.innerHTML = dietas.map(d => renderizarGrupoDieta(d)).join('');
  lucide.createIcons();
}

/* -------------------------------------------------------
   HTML de un grupo completo (una dieta)
------------------------------------------------------- */
function renderizarGrupoDieta(dieta) {
  const totalComidas = dieta.comidas.length;
  const totalKcal    = dieta.comidas.reduce((s, c) => s + (c.kcal || 0), 0);
  const dias         = [...new Set(dieta.comidas.map(c => c.dia))];

  return `
    <div class="dieta-grupo" id="grupo_${dieta.id}">
      <div class="dieta-grupo-header" onclick="toggleGrupo('${dieta.id}')">
        <div class="dieta-grupo-header-left">
          <div class="dieta-grupo-icono">
            <i data-lucide="book-open"></i>
          </div>
          <div class="dieta-grupo-info">
            <div class="dieta-grupo-titulo">${escapeHtml(dieta.nombre)}</div>
            <div class="dieta-grupo-meta">
              <span class="dieta-grupo-meta-item">
                <i data-lucide="calendar-days"></i>
                ${dias.length} ${dias.length === 1 ? 'día' : 'días'}
              </span>
              <span class="dieta-grupo-meta-item">
                <i data-lucide="utensils"></i>
                ${totalComidas} ${totalComidas === 1 ? 'comida' : 'comidas'}
              </span>
              <span class="dieta-grupo-meta-item">
                <i data-lucide="flame"></i>
                ${totalKcal} kcal/semana
              </span>
            </div>
          </div>
        </div>
        <div class="dieta-grupo-header-right">
          <button class="btn-icon" title="Editar dieta" onclick="event.stopPropagation(); abrirModalEditarDieta('${dieta.id}')">
            <i data-lucide="pencil"></i>
          </button>
          <button class="btn-icon danger" title="Eliminar dieta" onclick="event.stopPropagation(); confirmarEliminarDieta('${dieta.id}', '${escapeHtml(dieta.nombre)}')">
            <i data-lucide="trash-2"></i>
          </button>
          <i data-lucide="chevron-down" class="chevron-icon"></i>
        </div>
      </div>

      <div class="dieta-grupo-body">
        ${renderizarDias(dieta)}
        ${renderizarResumenMacros(dieta)}
      </div>
    </div>
  `;
}

/* -------------------------------------------------------
   HTML de los días dentro de una dieta
------------------------------------------------------- */
function renderizarDias(dieta) {
  // Agrupar comidas por día
  const porDia = {};
  dieta.comidas.forEach(c => {
    if (!porDia[c.dia]) porDia[c.dia] = [];
    porDia[c.dia].push(c);
  });

  const diasOrdenados = DIAS_SEMANA.filter(d => porDia[d]);

  return diasOrdenados.map(dia => {
    const comidas = porDia[dia];
    const kcalDia = comidas.reduce((s, c) => s + (c.kcal || 0), 0);

    return `
      <div class="dia-seccion" id="dia_${dieta.id}_${dia}">
        <div class="dia-seccion-header" onclick="toggleDia('${dieta.id}', '${dia}')">
          <div class="dia-pill">${dia.substring(0,2).toUpperCase()}</div>
          <span class="dia-seccion-nombre">${dia}</span>
          <span class="dia-seccion-total">${kcalDia} kcal</span>
          <i data-lucide="chevron-down" class="dia-chevron"></i>
        </div>
        <div class="dia-comidas">
          ${comidas.map(c => renderizarComidaFila(c, dieta.id)).join('')}
        </div>
      </div>
    `;
  }).join('');
}

/* -------------------------------------------------------
   HTML de una fila de comida
------------------------------------------------------- */
function renderizarComidaFila(comida, dietaId) {
  const tomaKey   = comida.toma || 'Almuerzo';
  const tomaConf  = TOMAS_CONFIG[tomaKey] || TOMAS_CONFIG['Almuerzo'];
  const preview   = (comida.ingredientes || []).slice(0, 2).join(', ');

  return `
    <div class="comida-fila" onclick="abrirDetalle('${dietaId}', '${comida.id}')">
      <div class="comida-toma ${tomaConf.clase}">
        <i data-lucide="${tomaConf.icono}"></i>
        ${tomaKey}
      </div>
      <div class="comida-info">
        <div class="comida-nombre">${escapeHtml(comida.plato)}</div>
        <div class="comida-preview">${escapeHtml(preview)}${(comida.ingredientes || []).length > 2 ? '...' : ''}</div>
      </div>
      <div class="comida-kcal">
        <div class="comida-kcal-valor">${comida.kcal || '—'}</div>
        <div class="comida-kcal-label">kcal</div>
      </div>
    </div>
  `;
}

/* -------------------------------------------------------
   HTML del resumen de macros por semana
------------------------------------------------------- */
function renderizarResumenMacros(dieta) {
  const totales = dieta.comidas.reduce((acc, c) => {
    acc.kcal     += c.kcal || 0;
    acc.proteina += parseFloat(c.proteina) || 0;
    acc.carbos   += parseFloat(c.carbos)   || 0;
    acc.grasa    += parseFloat(c.grasa)    || 0;
    return acc;
  }, { kcal: 0, proteina: 0, carbos: 0, grasa: 0 });

  return `
    <div class="dieta-macros-resumen">
      <span class="macro-chip"><i data-lucide="flame"></i><strong>${totales.kcal}</strong> kcal semana</span>
      <span class="macro-chip"><i data-lucide="dumbbell"></i><strong>${totales.proteina.toFixed(0)} g</strong> proteína</span>
      <span class="macro-chip"><i data-lucide="wheat"></i><strong>${totales.carbos.toFixed(0)} g</strong> carbos</span>
      <span class="macro-chip"><i data-lucide="droplets"></i><strong>${totales.grasa.toFixed(0)} g</strong> grasa</span>
    </div>
  `;
}

/* -------------------------------------------------------
   Toggle expansión de grupo de dieta
------------------------------------------------------- */
function toggleGrupo(dietaId) {
  const el = document.getElementById(`grupo_${dietaId}`);
  if (el) el.classList.toggle('expandido');
}

/* -------------------------------------------------------
   Toggle expansión de día
------------------------------------------------------- */
function toggleDia(dietaId, dia) {
  const el = document.getElementById(`dia_${dietaId}_${dia}`);
  if (el) el.classList.toggle('abierta');
}

/* -------------------------------------------------------
   Filtros de dietas
------------------------------------------------------- */
function filtrarDietas() {
  textoBusqueda = document.getElementById('buscarDieta').value;
  renderizarDietas();
}

function filtrarPorDia(dia, btn) {
  diaSeleccionado = dia;
  document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderizarDietas();
}

/* -------------------------------------------------------
   Modal: ver detalle de una comida
------------------------------------------------------- */
function abrirDetalle(dietaId, comidaId) {
  const dieta  = getDietaPorId(dietaId);
  if (!dieta) return;
  const comida = dieta.comidas.find(c => c.id === comidaId);
  if (!comida) return;

  document.getElementById('detalleBadgeDia').textContent  = comida.dia;
  document.getElementById('detalleBadgeToma').textContent = comida.toma;

  document.getElementById('modalDetalleBody').innerHTML = `
    <h2 class="detalle-plato">${escapeHtml(comida.plato)}</h2>

    <div class="detalle-macros">
      <div class="macro-card kcal">
        <span class="macro-valor">${comida.kcal || '—'}</span>
        <span class="macro-label">Calorías</span>
      </div>
      <div class="macro-card">
        <span class="macro-valor">${comida.proteina || '—'}</span>
        <span class="macro-label">Proteína</span>
      </div>
      <div class="macro-card">
        <span class="macro-valor">${comida.carbos || '—'}</span>
        <span class="macro-label">Carbos</span>
      </div>
      <div class="macro-card">
        <span class="macro-valor">${comida.grasa || '—'}</span>
        <span class="macro-label">Grasa</span>
      </div>
    </div>

    <div class="detalle-seccion">
      <div class="detalle-seccion-titulo">
        <i data-lucide="package"></i>
        Ingredientes y pesos
      </div>
      <ul class="ingrediente-lista">
        ${(comida.ingredientes || []).map(ing => `
          <li class="ingrediente-item">${escapeHtml(ing)}</li>
        `).join('')}
      </ul>
    </div>

    ${comida.preparacion ? `
      <div class="detalle-seccion">
        <div class="detalle-seccion-titulo">
          <i data-lucide="chef-hat"></i>
          Preparación rápida
        </div>
        <div class="detalle-preparacion">${escapeHtml(comida.preparacion)}</div>
      </div>
    ` : ''}
  `;

  abrirModal('modalDetalle');
}

/* -------------------------------------------------------
   Modal: nueva dieta
------------------------------------------------------- */
function abrirModalNuevaDieta() {
  dietaEditando = null;
  document.getElementById('modalDietaTitulo').textContent = 'Nueva dieta';
  document.getElementById('dietaNombre').value      = '';
  document.getElementById('dietaDescripcion').value = '';
  construirFormularioDias({});
  abrirModal('modalDieta');
}

/* -------------------------------------------------------
   Modal: editar dieta existente
------------------------------------------------------- */
function abrirModalEditarDieta(id) {
  const dieta = getDietaPorId(id);
  if (!dieta) return;

  dietaEditando = id;
  document.getElementById('modalDietaTitulo').textContent = 'Editar dieta';
  document.getElementById('dietaNombre').value      = dieta.nombre;
  document.getElementById('dietaDescripcion').value = dieta.descripcion || '';

  // Agrupar comidas por día para el formulario
  const porDia = {};
  dieta.comidas.forEach(c => {
    if (!porDia[c.dia]) porDia[c.dia] = [];
    porDia[c.dia].push(c);
  });

  construirFormularioDias(porDia);
  abrirModal('modalDieta');
}

/* -------------------------------------------------------
   Construir el acordeón de días en el formulario
------------------------------------------------------- */
function construirFormularioDias(porDia) {
  const accordion = document.getElementById('diasAccordion');
  accordion.innerHTML = DIAS_SEMANA.map(dia => {
    const comidas = porDia[dia] || [];
    return `
      <div class="dia-form-item" id="formDia_${dia}">
        <div class="dia-form-header" onclick="toggleDiaForm('${dia}')">
          <div class="dia-pill">${dia.substring(0,2).toUpperCase()}</div>
          <span class="dia-form-nombre">${dia}</span>
          <i data-lucide="chevron-down" class="dia-chevron"></i>
        </div>
        <div class="dia-form-body" id="formDiaBody_${dia}">
          <div class="comidas-form-lista" id="comidasLista_${dia}">
            ${comidas.map(c => renderizarComidaFormBloque(c, dia)).join('')}
          </div>
          <button type="button" class="btn-add-comida" onclick="agregarComidaForm('${dia}')">
            <i data-lucide="plus"></i>
            Añadir comida
          </button>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

/* -------------------------------------------------------
   HTML de un bloque de comida en el formulario
------------------------------------------------------- */
function renderizarComidaFormBloque(comida, dia) {
  const id = comida.id || generarId('c');
  return `
    <div class="comida-form-bloque" id="bloque_${id}" data-comida-id="${id}" data-dia="${dia}">
      <div class="comida-form-bloque-titulo">
        <span class="comida-form-bloque-label">Comida</span>
        <button type="button" class="btn-icon danger" onclick="eliminarComidaForm('${id}')">
          <i data-lucide="x"></i>
        </button>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Toma</label>
          <select class="form-input form-select" data-campo="toma">
            ${['Desayuno','Almuerzo','Merienda','Cena'].map(t =>
              `<option value="${t}" ${comida.toma === t ? 'selected' : ''}>${t}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Plato</label>
          <input class="form-input" type="text" data-campo="plato" value="${escapeHtml(comida.plato || '')}" placeholder="Nombre del plato" />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Ingredientes (uno por línea)</label>
        <textarea class="form-input form-textarea" data-campo="ingredientes" placeholder="200 g lentejas de bote&#10;150 g pechuga de pollo">${(comida.ingredientes || []).join('\n')}</textarea>
      </div>

      <div class="form-group">
        <label class="form-label">Preparación</label>
        <textarea class="form-input form-textarea" data-campo="preparacion" placeholder="Pasos de preparación...">${escapeHtml(comida.preparacion || '')}</textarea>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Calorías (kcal)</label>
          <input class="form-input" type="number" data-campo="kcal" value="${comida.kcal || ''}" placeholder="455" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">Proteína</label>
          <input class="form-input" type="text" data-campo="proteina" value="${comida.proteina || ''}" placeholder="48 g" />
        </div>
        <div class="form-group">
          <label class="form-label">Carbos</label>
          <input class="form-input" type="text" data-campo="carbos" value="${comida.carbos || ''}" placeholder="42 g" />
        </div>
        <div class="form-group">
          <label class="form-label">Grasa</label>
          <input class="form-input" type="text" data-campo="grasa" value="${comida.grasa || ''}" placeholder="9 g" />
        </div>
      </div>
    </div>
  `;
}

/* -------------------------------------------------------
   Toggle del acordeón en el formulario
------------------------------------------------------- */
function toggleDiaForm(dia) {
  const el = document.getElementById(`formDia_${dia}`);
  if (el) el.classList.toggle('abierto');
}

/* -------------------------------------------------------
   Añadir comida vacía en un día del formulario
------------------------------------------------------- */
function agregarComidaForm(dia) {
  const lista = document.getElementById(`comidasLista_${dia}`);
  const id    = generarId('c');
  const bloque = document.createElement('div');
  bloque.innerHTML = renderizarComidaFormBloque({ id, toma: 'Almuerzo' }, dia);
  lista.appendChild(bloque.firstElementChild);
  lucide.createIcons();
}

/* -------------------------------------------------------
   Eliminar bloque de comida del formulario
------------------------------------------------------- */
function eliminarComidaForm(id) {
  const el = document.getElementById(`bloque_${id}`);
  if (el) el.remove();
}

/* -------------------------------------------------------
   Guardar dieta (nueva o editada)
------------------------------------------------------- */
function guardarDieta(e) {
  e.preventDefault();

  const nombre      = document.getElementById('dietaNombre').value.trim();
  const descripcion = document.getElementById('dietaDescripcion').value.trim();

  if (!nombre) {
    mostrarToast('El nombre de la dieta es obligatorio', 'error');
    return;
  }

  // Recoger todas las comidas del formulario
  const bloques = document.querySelectorAll('.comida-form-bloque');
  const comidas = [];

  bloques.forEach(bloque => {
    const id     = bloque.dataset.comidaId;
    const dia    = bloque.dataset.dia;
    const toma   = bloque.querySelector('[data-campo="toma"]').value;
    const plato  = bloque.querySelector('[data-campo="plato"]').value.trim();

    if (!plato) return; // Omitir bloques sin nombre de plato

    const ingredientesRaw = bloque.querySelector('[data-campo="ingredientes"]').value;
    const ingredientes = ingredientesRaw
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    comidas.push({
      id,
      dia,
      toma,
      plato,
      ingredientes,
      preparacion: bloque.querySelector('[data-campo="preparacion"]').value.trim(),
      kcal:        parseFloat(bloque.querySelector('[data-campo="kcal"]').value) || 0,
      proteina:    bloque.querySelector('[data-campo="proteina"]').value.trim(),
      carbos:      bloque.querySelector('[data-campo="carbos"]').value.trim(),
      grasa:       bloque.querySelector('[data-campo="grasa"]').value.trim()
    });
  });

  const dieta = {
    id:            dietaEditando || generarId('dieta'),
    nombre,
    descripcion,
    fechaCreacion: dietaEditando
      ? (getDietaPorId(dietaEditando)?.fechaCreacion || new Date().toISOString().split('T')[0])
      : new Date().toISOString().split('T')[0],
    comidas
  };

  guardarDietaStorage(dieta);
  cerrarModal('modalDieta');
  renderizarDietas();
  mostrarToast(dietaEditando ? 'Dieta actualizada' : 'Dieta guardada', 'success');
}

/* -------------------------------------------------------
   Confirmar y eliminar dieta
------------------------------------------------------- */
function confirmarEliminarDieta(id, nombre) {
  document.getElementById('confirmarTexto').textContent =
    `¿Seguro que quieres eliminar la dieta "${nombre}"? Esta acción no se puede deshacer.`;

  document.getElementById('confirmarBtn').onclick = () => {
    eliminarDietaStorage(id);
    cerrarModal('modalConfirmar');
    renderizarDietas();
    mostrarToast('Dieta eliminada', 'success');
  };

  abrirModal('modalConfirmar');
}
