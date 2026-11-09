/* =========================================================
   MÓDULO RECETAS
   Recetario de la familia: ingredientes con peso y tipo,
   preparación y valores aproximados. Desde cada receta se
   puede mandar al plan de la semana o a la lista de la compra.
   (Se guardan en la colección "comidas" por compatibilidad.)
   ========================================================= */

let consultaRecetas = '';
let filtroToma = 'todas';
let ordenRecetas = 'reciente';

const ORDENES_RECETAS = {
  reciente: 'Más recientes primero',
  nombre: 'Por nombre (A-Z)',
  kcal: 'Por calorías (de más a menos)'
};

// Tipos de ingrediente disponibles
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

function tipoDesdeCategoria(categoria) {
  const mapa = {
    'Verduras y hortalizas': 'Verdura / Hortaliza fresca',
    'Carnes y pescados': 'Carne fresca',
    'Congelados': 'Congelados',
    'Legumbres y cereales': 'Legumbres / Cereales',
    'Lácteos y huevos': 'Huevos / Lácteos',
    'Conservas': 'Conservas',
    'Condimentos y aceites': 'Especias y condimentos'
  };
  return mapa[categoria] || 'Otros';
}

/* -------------------------------------------------------
   Eventos de los controles fijos de la vista
------------------------------------------------------- */
function configurarRecetas() {
  const buscar = document.getElementById('buscarRecetas');
  buscar.addEventListener('input', debounce(() => {
    consultaRecetas = buscar.value;
    renderizarListaRecetas();
  }, 120));
}

/* -------------------------------------------------------
   Renderizado
------------------------------------------------------- */
function renderizarRecetas() {
  const todas = getComidas();
  document.getElementById('recetasConteo').textContent = todas.length
    ? plural(todas.length, 'receta guardada', 'recetas guardadas')
    : 'El recetario de la familia';

  const conteo = (t) => todas.filter(r => r.toma === t).length;
  document.getElementById('filtroTomas').innerHTML = [
    `<button class="chip" data-accion="filtroToma" data-toma="todas" aria-pressed="${filtroToma === 'todas'}">Todas</button>`,
    ...TOMAS.filter(t => conteo(t) > 0 || filtroToma === t).map(t => `
      <button class="chip" data-accion="filtroToma" data-toma="${t}" aria-pressed="${filtroToma === t}">
        <span class="toma toma-${t}"></span>${t} <span class="chip-cuenta">${conteo(t)}</span>
      </button>`)
  ].join('');

  document.getElementById('filtroTomas').hidden = !todas.length;
  document.querySelector('#vista-recetas .herramientas').hidden = !todas.length;
  renderizarListaRecetas();
}

function renderizarListaRecetas() {
  const cont = document.getElementById('recetasContenido');
  const todas = getComidas();

  if (!todas.length) {
    cont.innerHTML = `
      <div class="vacio">
        <h2 class="vacio-titulo">Aquí van las recetas de casa</h2>
        <p class="vacio-texto">Guardad lo que soléis cocinar con sus ingredientes y cantidades. Luego se añade al plan de la semana o a la compra en dos toques.</p>
        <div class="grupo-botones">
          <button class="boton boton-primario" data-accion="nuevaReceta">${ico('mas')}Crear receta</button>
          <button class="boton boton-secundario" data-accion="cargarEjemplos">Ver ejemplos</button>
        </div>
      </div>
    `;
    return;
  }

  let recetas = todas.filter(r =>
    (filtroToma === 'todas' || r.toma === filtroToma) &&
    coincideBusqueda([r.nombre, r.preparacion, ...(r.ingredientesDetallados || []).flatMap(i => [i.nombre, i.tipo])], consultaRecetas)
  );

  if (ordenRecetas === 'nombre') recetas = recetas.slice().sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));
  if (ordenRecetas === 'kcal') recetas = recetas.slice().sort((a, b) => numero(b.kcal) - numero(a.kcal));

  if (!recetas.length) {
    cont.innerHTML = `
      <div class="vacio-compacto">
        <p>${consultaRecetas ? `Ninguna receta coincide con «${esc(consultaRecetas)}».` : 'No hay recetas en este filtro.'}</p>
        <button class="boton boton-secundario boton-pequeno" data-accion="limpiarFiltrosRecetas">Ver todas</button>
      </div>
    `;
    return;
  }

  cont.innerHTML = `
    ${htmlAvisoEjemplos('comidas')}
    <div class="lista-recetas">${recetas.map(htmlTarjetaReceta).join('')}</div>
  `;
}

function htmlTarjetaReceta(r) {
  const ings = (r.ingredientesDetallados || []).map(i => i.nombre).filter(Boolean);
  const macros = [['P', r.proteina], ['H', r.carbos], ['G', r.grasa]].filter(([, v]) => numero(v));
  const autor = autorVisible(r.autor);
  return `
    <button class="receta-tarjeta" data-accion="verReceta" data-id="${esc(r.id)}">
      <div class="receta-arriba">
        <span class="toma toma-${esc(r.toma)}">${esc(r.toma || 'Sin momento')}</span>
        ${numero(r.kcal) ? `<span class="receta-kcal">${fmt(r.kcal)} <small>kcal</small></span>` : ''}
      </div>
      <h3 class="receta-nombre">${esc(r.nombre)}${esEjemplo('comidas', r) ? '<span class="etiqueta-ejemplo">Ejemplo</span>' : ''}</h3>
      ${ings.length ? `<p class="receta-ings">${esc(ings.join(', '))}</p>` : ''}
      ${macros.length || autor ? `
        <div class="receta-macros">
          ${macros.map(([l, v]) => `<span>${l} <b>${fmt(v)} g</b></span>`).join('')}
          ${autor ? `<span class="receta-autor">De ${esc(autor)}</span>` : ''}
        </div>` : ''}
    </button>
  `;
}

/* -------------------------------------------------------
   Ficha de la receta
------------------------------------------------------- */
function abrirDetalleReceta(id) {
  const r = getComidaPorId(id);
  if (!r) return;
  const ings = r.ingredientesDetallados || [];
  const autor = autorVisible(r.autor);

  Hoja.abrir({
    titulo: r.nombre,
    subtitulo: [r.toma, esEjemplo('comidas', r) ? 'Receta de ejemplo' : autor && `Receta de ${autor}`].filter(Boolean).join(' · '),
    cuerpo: `
      ${htmlCifras(r)}
      ${ings.length ? `
        <section class="detalle-bloque">
          <h3>Ingredientes</h3>
          <ul class="lista-ingredientes">
            ${ings.map(i => `
              <li>
                <span class="ing-nombre">${esc(i.nombre)}${i.tipo && i.tipo !== 'Otros' ? `<span class="ing-tipo">${esc(i.tipo)}</span>` : ''}</span>
                ${i.peso ? `<span class="ing-peso">${esc(i.peso)}</span>` : ''}
              </li>`).join('')}
          </ul>
        </section>` : ''}
      ${htmlPreparacion(r.preparacion)}
      <div class="detalle-acciones">
        <button class="boton boton-primario" data-x="plan">${ico('calendario_mas')}Al plan</button>
        ${ings.length ? `<button class="boton boton-secundario" data-x="compra">${ico('cesta_mas')}A la compra</button>` : ''}
        <button class="boton boton-secundario" data-x="editar">${ico('editar')}Editar</button>
        <button class="boton boton-secundario" data-x="duplicar">${ico('duplicar')}Duplicar</button>
        <button class="boton boton-secundario peligro ${ings.length ? 'ancho' : ''}" data-x="eliminar">${ico('papelera')}Eliminar</button>
      </div>
    `,
    alAbrir: (d) => {
      const en = (x, fn) => d.querySelector(`[data-x="${x}"]`)?.addEventListener('click', async () => {
        await Hoja.cerrar(d);
        fn();
      });
      en('plan', () => abrirRecetaAlPlan(r.id));
      en('compra', () => abrirAnadirACompra({ titulo: r.nombre, entradas: ings }));
      en('editar', () => abrirFormReceta(r.id));
      en('duplicar', () => {
        guardarComidaStorage({ ...clonar(r), id: generarId('comida'), nombre: `${r.nombre} (copia)`, autor: getYo().id, fechaCreacion: new Date().toISOString() });
        refrescarApp();
        aviso('Receta duplicada');
      });
      en('eliminar', () => {
        const deshacer = quitarDeColeccion('comidas', r.id);
        refrescarApp();
        aviso(`«${r.nombre}» eliminada`, { accion: { texto: 'Deshacer', fn: () => { deshacer(); refrescarApp(); } } });
      });
    }
  });
}

/* -------------------------------------------------------
   Mandar una receta al plan de la semana
------------------------------------------------------- */
function abrirRecetaAlPlan(id) {
  const receta = getComidaPorId(id);
  if (!receta) return;
  const dietas = getDietas();
  const visible = dietaVisible();
  let dia = diaPlan;

  const d = Hoja.abrir({
    titulo: 'Añadir al plan',
    subtitulo: receta.nombre,
    cuerpo: `
      <form id="formAlPlan">
        ${dietas.length > 1 ? `
          <label class="campo">
            <span class="campo-etiqueta">Dieta</span>
            <select class="entrada" name="dieta">
              ${dietas.map(x => `<option value="${esc(x.id)}" ${x.id === visible.id ? 'selected' : ''}>${esc(x.nombre)}${textoParaQuien(x) ? ` · ${esc(textoParaQuien(x))}` : ''}</option>`).join('')}
            </select>
          </label>` : ''}
        <div class="campo">
          <span class="campo-etiqueta">Día</span>
          <div class="semana semana-compacta" data-x="dias">
            ${DIAS_SEMANA.map((nombre, i) => `
              <button type="button" class="dia-boton ${i === indiceHoy() ? 'hoy' : ''}" data-dia="${i}" aria-pressed="${i === dia}" aria-label="${nombre}">
                <span class="dia-letra">${DIAS_CORTOS[i]}</span><span class="dia-kcal"></span>
              </button>`).join('')}
          </div>
        </div>
        <div class="campo">
          <span class="campo-etiqueta">Momento</span>
          ${htmlSegmentado('toma', TOMAS.map(t => ({ valor: t, texto: t })), receta.toma || 'Almuerzo')}
        </div>
        ${!dietas.length ? `<p class="campo-ayuda">Aún no hay ninguna dieta: se creará «Semana de casa» para ponerla ahí.</p>` : ''}
      </form>
    `,
    pie: `
      <button type="button" class="boton boton-secundario" data-cerrar-hoja>Cancelar</button>
      <button type="submit" form="formAlPlan" class="boton boton-primario">Añadir</button>
    `
  });

  d.querySelectorAll('[data-dia]').forEach(b => b.addEventListener('click', () => {
    dia = Number(b.dataset.dia);
    d.querySelectorAll('[data-dia]').forEach(x => x.setAttribute('aria-pressed', x === b));
  }));

  d.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = valoresFormulario(e.target);
    let dietaId = v.dieta || (visible && visible.id);
    if (!dietaId) {
      const nueva = { id: generarId('dieta'), nombre: 'Semana de casa', descripcion: '', para: [], fechaCreacion: new Date().toISOString().split('T')[0], comidas: [] };
      guardarDietaStorage(nueva);
      dietaId = nueva.id;
    }
    setPref(claveDietaVista(), dietaId);
    diaPlan = dia;
    await Hoja.cerrar(d);
    anadirRecetaADieta(receta, dietaId, dia, v.toma);
  });
}

/* -------------------------------------------------------
   Formulario de receta (nueva o edición)
------------------------------------------------------- */
function abrirFormReceta(id = null) {
  const r = id ? getComidaPorId(id) : null;

  Hoja.abrir({
    titulo: r ? 'Editar receta' : 'Nueva receta',
    cuerpo: `
      <form id="formReceta" novalidate>
        <label class="campo">
          <span class="campo-etiqueta">Nombre</span>
          <input class="entrada" name="nombre" required maxlength="120" value="${esc(r?.nombre || '')}" placeholder="Ej.: Pollo al curry con arroz" ${r ? '' : 'autofocus'} autocapitalize="sentences" />
        </label>
        <div class="campo">
          <span class="campo-etiqueta">Momento del día</span>
          ${htmlSegmentado('toma', TOMAS.map(t => ({ valor: t, texto: t })), r?.toma || 'Almuerzo')}
        </div>

        <div class="separador-formulario">
          Ingredientes
          <button type="button" class="boton boton-texto" data-x="masIng">${ico('mas')}Añadir</button>
        </div>
        <div class="ing-form-lista" data-x="ings"></div>
        <p class="campo-ayuda" style="margin-top:8px">El peso es opcional. Pulsa «Intro» en un ingrediente para pasar al siguiente.</p>

        <label class="campo" style="margin-top:18px">
          <span class="campo-etiqueta">Preparación</span>
          <textarea class="entrada" name="preparacion" rows="4" placeholder="Pasos, tiempos de sartén, horno o micro…">${esc(r?.preparacion || '')}</textarea>
        </label>

        ${htmlCamposMacros(r || {})}
      </form>
    `,
    pie: `
      <button type="button" class="boton boton-secundario" data-cerrar-hoja>Cancelar</button>
      <button type="submit" form="formReceta" class="boton boton-primario">${r ? 'Guardar' : 'Crear receta'}</button>
    `,
    alAbrir: (d) => {
      const form = d.querySelector('form');
      const lista = d.querySelector('[data-x="ings"]');

      const ings = r?.ingredientesDetallados?.length ? r.ingredientesDetallados : [null, null];
      ings.forEach(i => anadirFilaIngrediente(lista, i));
      d.querySelector('[data-x="masIng"]').addEventListener('click', () => {
        anadirFilaIngrediente(lista, null).querySelector('.f-nombre').focus();
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const v = valoresFormulario(form);
        if (!v.nombre) {
          form.nombre.focus();
          aviso('Ponle nombre a la receta', { tipo: 'error' });
          return;
        }

        const ingredientesDetallados = [...lista.querySelectorAll('.ing-form-fila')]
          .map(f => ({
            nombre: f.querySelector('.f-nombre').value.trim(),
            peso: f.querySelector('.f-peso').value.trim(),
            tipo: f.querySelector('.f-tipo').value || 'Otros'
          }))
          .filter(i => i.nombre);

        guardarComidaStorage({
          id: r ? r.id : generarId('comida'),
          nombre: v.nombre,
          toma: v.toma || 'Almuerzo',
          preparacion: v.preparacion || '',
          ingredientesDetallados,
          ...leerMacros(v),
          autor: r ? (r.autor || '') : getYo().id,
          fechaCreacion: r?.fechaCreacion || new Date().toISOString()
        });
        Hoja.cerrar(d);
        if (vistaActual !== 'recetas') irAVista('recetas');
        else refrescarApp();
        aviso(r ? 'Receta guardada' : `«${v.nombre}» añadida a las recetas`);
      });
    }
  });
}

function anadirFilaIngrediente(lista, dato) {
  const fila = document.createElement('div');
  fila.className = 'ing-form-fila';
  const tipo = dato?.tipo || '';
  fila.innerHTML = `
    <input class="entrada f-nombre" placeholder="Ingrediente" value="${esc(dato?.nombre || '')}" enterkeyhint="next" autocapitalize="sentences" aria-label="Ingrediente" />
    <input class="entrada f-peso" placeholder="Peso" value="${esc(dato?.peso || '')}" enterkeyhint="next" aria-label="Peso o cantidad" />
    <select class="entrada f-tipo" aria-label="Tipo de ingrediente" ${tipo ? 'data-tocado="1"' : ''}>
      ${TIPOS_INGREDIENTE.map(t => `<option ${t === (tipo || 'Otros') ? 'selected' : ''}>${t}</option>`).join('')}
    </select>
    <button type="button" class="boton-icono pequeno peligro" aria-label="Quitar ingrediente">${ico('cerrar')}</button>
  `;

  const nombre = fila.querySelector('.f-nombre');
  const peso = fila.querySelector('.f-peso');
  const selTipo = fila.querySelector('.f-tipo');

  // Sugerir el tipo según el nombre mientras no se elija a mano
  nombre.addEventListener('change', () => {
    if (!selTipo.dataset.tocado && nombre.value.trim()) {
      selTipo.value = tipoDesdeCategoria(adivinarCategoria(nombre.value));
    }
  });
  selTipo.addEventListener('change', () => { selTipo.dataset.tocado = '1'; });

  // "Intro" pasa del nombre al peso y del peso a una fila nueva
  nombre.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      peso.focus();
    }
  });
  peso.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const siguiente = fila.nextElementSibling;
    if (siguiente) siguiente.querySelector('.f-nombre').focus();
    else anadirFilaIngrediente(lista, null).querySelector('.f-nombre').focus();
  });

  fila.querySelector('button').addEventListener('click', () => fila.remove());
  lista.appendChild(fila);
  return fila;
}

/* -------------------------------------------------------
   Acciones registradas
------------------------------------------------------- */
registrarAcciones({
  verReceta: (el) => abrirDetalleReceta(el.dataset.id),
  nuevaReceta: () => abrirFormReceta(),
  filtroToma: (el) => {
    filtroToma = el.dataset.toma;
    renderizarRecetas();
  },
  ordenRecetas: () => {
    const claves = Object.keys(ORDENES_RECETAS);
    ordenRecetas = claves[(claves.indexOf(ordenRecetas) + 1) % claves.length];
    renderizarListaRecetas();
    aviso(ORDENES_RECETAS[ordenRecetas], { duracion: 1600 });
  },
  limpiarFiltrosRecetas: () => {
    consultaRecetas = '';
    filtroToma = 'todas';
    document.getElementById('buscarRecetas').value = '';
    renderizarRecetas();
  }
});
