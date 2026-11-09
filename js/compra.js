/* =========================================================
   MÓDULO DE LA COMPRA
   - Lista rápida: se escribe y se añade al momento; cuando
     está todo comprado se vacía de un toque.
   - Lista fija: lo de siempre. No se borra; se marca en el
     súper y se desmarca al volver.
   ========================================================= */

let segmentoCompra = getPref('segmentoCompra', 'rapida');
let consultaFija = '';
let recienAnadidos = new Set();
let tRenderRapida = null;

/* -------------------------------------------------------
   Eventos de los controles fijos de la vista
------------------------------------------------------- */
function configurarCompra() {
  const form = document.getElementById('formRapida');
  const entrada = document.getElementById('entradaRapida');
  const nota = document.getElementById('notaRapida');
  const botonNota = document.getElementById('botonNotaRapida');

  // Las instrucciones son opcionales: el campo solo aparece si se pide
  const mostrarNota = (visible) => {
    nota.hidden = !visible;
    botonNota.setAttribute('aria-expanded', visible);
    if (!visible) nota.value = '';
  };
  botonNota.addEventListener('click', () => {
    const abrir = nota.hidden;
    mostrarNota(abrir);
    (abrir ? nota : entrada).focus();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!entrada.value.trim()) {
      entrada.focus();
      return;
    }
    anadirARapida(entrada.value, nota.value);
    entrada.value = '';
    mostrarNota(false);
    entrada.focus();
  });

  const buscar = document.getElementById('buscarFija');
  buscar.addEventListener('input', debounce(() => {
    consultaFija = buscar.value;
    renderizarListaFija();
  }, 120));
}

/* -------------------------------------------------------
   Renderizado general
------------------------------------------------------- */
function renderizarCompra() {
  const rapida = getRapida();
  const fija = getCompra();
  const pendientesRapida = rapida.filter(i => !i.comprado).length;
  const pendientesFija = fija.filter(i => !i.comprado).length;

  document.getElementById('numRapida').textContent = pendientesRapida || '';
  document.getElementById('numFija').textContent = fija.length ? pendientesFija : '';

  const enRapida = segmentoCompra === 'rapida';
  document.getElementById('pestanaRapida').setAttribute('aria-selected', enRapida);
  document.getElementById('pestanaFija').setAttribute('aria-selected', !enRapida);
  document.getElementById('panelRapida').hidden = !enRapida;
  document.getElementById('panelFija').hidden = enRapida;

  document.getElementById('compraAntetitulo').textContent = enRapida
    ? (pendientesRapida ? `${plural(pendientesRapida, 'cosa')} por comprar` : 'Lista rápida')
    : (fija.length ? plural(fija.length, 'producto') : 'Lista fija');

  if (enRapida) renderizarListaRapida();
  else renderizarListaFija();
}

function agruparPorCategoria(items) {
  const grupos = new Map(CATEGORIAS.map(c => [c.id, []]));
  items.forEach(i => {
    const cat = grupos.has(i.categoria) ? i.categoria : 'Otros';
    grupos.get(cat).push(i);
  });
  return [...grupos.entries()].filter(([, lista]) => lista.length);
}

function htmlProgreso(hechos, total, texto) {
  if (!total) return '';
  return `
    <div class="progreso">
      <span>${texto}</span>
      <div class="progreso-barra"><span style="width:${(hechos / total * 100).toFixed(1)}%"></span></div>
    </div>
  `;
}

function htmlCabeceraGrupo(catId, cuenta, plegable = false) {
  const cat = infoCategoria(catId);
  const contenido = `
    <span class="grupo-marca" style="--color-cat:${cat.color}"></span>
    <span>${esc(cat.nombre)}</span>
    <span class="grupo-cuenta">${cuenta}</span>
    ${plegable ? ico('chevron_abajo') : ''}
  `;
  return plegable
    ? `<button class="grupo-cabecera" data-accion="plegarGrupo" data-cat="${esc(catId)}" aria-expanded="true">${contenido}</button>`
    : `<div class="grupo-cabecera">${contenido}</div>`;
}

/* =========================================================
   LISTA RÁPIDA
   ========================================================= */
function renderizarListaRapida() {
  clearTimeout(tRenderRapida);
  const cont = document.getElementById('listaRapida');
  const lista = getRapida();
  const pendientes = lista.filter(i => !i.comprado);
  const comprados = lista.filter(i => i.comprado);

  renderizarSugerencias(pendientes);

  if (!lista.length) {
    cont.innerHTML = `
      <div class="vacio-compacto">
        <p><strong>La lista está vacía.</strong> Escribe arriba lo que haga falta y pulsa intro. Puedes poner varias cosas a la vez separadas por comas, y la cantidad delante: «pan, 2 kg naranjas». Con ${ico('nota')} le añades instrucciones.</p>
        ${getCompra().some(i => !i.comprado) ? `
          <button class="boton boton-secundario boton-pequeno" data-accion="traerDeFija">${ico('fija')}Traer lo pendiente de la fija</button>` : ''}
      </div>
    `;
    return;
  }

  // Ajustes: agrupar por secciones del súper y mandar lo marcado al final
  const agrupar = getPref('agruparRapida', true);
  const alFinal = getPref('marcadosAlFinal', true);
  const principales = alFinal ? pendientes : lista;

  cont.innerHTML = `
    ${!pendientes.length ? `
      <div class="compra-hecha">
        ${ico('hecho')}
        <h3>Lo tienes todo</h3>
        <p>Vacía la lista y queda lista para la próxima vez.</p>
        <button class="boton boton-primario" data-accion="vaciarRapida">${ico('vaciar')}Vaciar lista</button>
      </div>
    ` : htmlProgreso(comprados.length, lista.length, `${comprados.length} de ${lista.length} en el carro`)}

    ${!principales.length ? '' : agrupar ? agruparPorCategoria(principales).map(([cat, items]) => `
      <section class="grupo">
        ${htmlCabeceraGrupo(cat, items.length)}
        <div class="lista">${items.map(htmlFilaRapida).join('')}</div>
      </section>
    `).join('') : `
      <section class="grupo">
        <div class="lista">${principales.map(htmlFilaRapida).join('')}</div>
      </section>
    `}

    ${alFinal && comprados.length ? `
      <section class="grupo carro">
        <div class="grupo-cabecera">
          <span>En el carro</span>
          <span class="grupo-cuenta">${comprados.length}</span>
          ${pendientes.length ? '<button class="boton-texto" data-accion="vaciarCompradosRapida" style="margin-left:8px">Quitar</button>' : ''}
        </div>
        <div class="lista">${comprados.map(htmlFilaRapida).join('')}</div>
      </section>
    ` : ''}

    ${getPref('pistaEditarRapida', false) ? '' : `
      <p class="pista-lista">Mantén pulsado un producto para cambiarlo o añadirle instrucciones.</p>`}
  `;
  recienAnadidos = new Set();
}

// "x6 · lo pidió Ana" / "cogido por Luis" (solo si lo hizo otra persona)
function detalleProducto(i) {
  const quien = i.comprado ? autorVisible(i.marcadoPor) : autorVisible(i.autor);
  const partes = [
    i.cantidad && esc(i.cantidad),
    quien && `<span class="producto-autor">${i.comprado ? 'cogido por' : 'lo pidió'} ${esc(quien)}</span>`
  ].filter(Boolean);
  return partes.length ? `<span class="producto-cantidad">${partes.join(' · ')}</span>` : '';
}

// Instrucciones o notas: solo se pintan si hay algo escrito
function htmlNotaProducto(i) {
  const texto = String(i.notas || '').trim();
  return texto ? `<span class="producto-nota">${ico('nota')}${esc(texto)}</span>` : '';
}

function htmlFilaRapida(i) {
  return `
    <div class="producto ${i.comprado ? 'marcado' : ''} ${recienAnadidos.has(i.id) ? 'producto-entrando' : ''}" data-pulsacion-larga="editarRapida" data-id="${esc(i.id)}">
      <button class="producto-marcar" data-accion="marcarRapida" data-id="${esc(i.id)}" aria-pressed="${!!i.comprado}">
        <span class="casilla">${ico('check')}</span>
        <span class="producto-texto">
          <span class="producto-nombre">${esc(i.nombre)}</span>
          ${detalleProducto(i)}
          ${htmlNotaProducto(i)}
        </span>
      </button>
      <button class="boton-icono pequeno" data-accion="quitarRapida" data-id="${esc(i.id)}" aria-label="Quitar ${esc(i.nombre)}">${ico('cerrar')}</button>
    </div>
  `;
}

/* -------------------------------------------------------
   Sugerencias (lo que sueles comprar)
------------------------------------------------------- */
function renderizarSugerencias(pendientes) {
  const enLista = new Set(pendientes.map(i => claveProducto(i.nombre)));
  const historial = getHistorial()
    .slice()
    .sort((a, b) => puntuacionHistorial(b) - puntuacionHistorial(a));

  const sugeridas = historial.filter(h => !enLista.has(h.id)).slice(0, 12);
  const cont = document.getElementById('sugerenciasRapida');
  cont.hidden = !sugeridas.length;
  cont.innerHTML = sugeridas.map(h => `
    <button class="chip sugerencia" data-accion="anadirSugerencia" data-nombre="${esc(h.nombre)}">${ico('mas')}${esc(h.nombre)}</button>
  `).join('');

  document.getElementById('productosConocidos').innerHTML = historial
    .slice(0, 80)
    .map(h => `<option value="${esc(h.nombre)}"></option>`)
    .join('');
}

/* -------------------------------------------------------
   Añadir a la lista rápida
   Acepta "pan, leche, 2 kg naranjas" de una vez
------------------------------------------------------- */
function anadirARapida(texto, notas = '') {
  const nota = String(notas || '').trim();
  const entradas = dividirEntradas(texto).map(interpretarEntrada).filter(Boolean)
    .map(e => (nota ? { ...e, notas: nota } : e));
  if (!entradas.length) return;

  const r = anadirProductosARapida(entradas);
  vibrar(6);
  refrescarApp();

  if (r.repetidos && r.repetidos === entradas.length) {
    aviso(entradas.length === 1 ? 'Ya estaba en la lista' : 'Ya estaban en la lista', { duracion: 1600 });
  }
}

/*
  Añade productos [{ nombre, cantidad, categoria, notas }] a la rápida.
  Si ya estaban, vuelven a quedar pendientes en vez de duplicarse.
*/
function anadirProductosARapida(productos) {
  const lista = getRapida().slice();
  const anotados = [];
  let nuevos = 0;
  let repetidos = 0;

  productos.forEach(p => {
    const clave = claveProducto(p.nombre);
    if (!clave) return;
    const idx = lista.findIndex(i => claveProducto(i.nombre) === clave);
    if (idx >= 0) {
      const ex = lista[idx];
      if (!ex.comprado && (!p.cantidad || p.cantidad === ex.cantidad) && (!p.notas || p.notas === ex.notas)) repetidos++;
      lista[idx] = { ...ex, comprado: false, marcadoPor: '', cantidad: p.cantidad || ex.cantidad || '' };
      if (p.notas) lista[idx].notas = p.notas;
      anotados.push(lista[idx]);
      return;
    }
    const item = {
      id: generarId('r'),
      nombre: capitalizar(p.nombre),
      cantidad: p.cantidad || '',
      categoria: p.categoria || adivinarCategoria(p.nombre),
      comprado: false,
      autor: getYo().id,
      creadoEn: Date.now()
    };
    if (p.notas) item.notas = p.notas;
    lista.push(item);
    anotados.push(item);
    recienAnadidos.add(item.id);
    nuevos++;
  });

  actualizarFamiliaActiva({ rapida: lista, historial: anotarEnHistorial(anotados) });
  return { nuevos, repetidos };
}

// Marca o desmarca y apunta quién lo ha cogido
function alternarComprado(i) {
  return i.comprado
    ? { ...i, comprado: false, marcadoPor: '' }
    : { ...i, comprado: true, marcadoPor: getYo().id };
}

function marcarRapida(id, el) {
  const lista = getRapida().map(i => (i.id === id ? alternarComprado(i) : i));
  const item = lista.find(i => i.id === id);
  if (!item) return;
  setColeccion('rapida', lista);
  vibrar(item.comprado ? 10 : 5);

  // Marcar al instante y recolocar un momento después (si no, el producto "salta")
  const fila = el.closest('.producto');
  fila.classList.toggle('marcado', item.comprado);
  el.setAttribute('aria-pressed', item.comprado);
  actualizarInsigniaCompra();

  clearTimeout(tRenderRapida);
  tRenderRapida = setTimeout(renderizarCompra, item.comprado ? 650 : 250);
}

function quitarRapida(id) {
  const item = getRapida().find(i => i.id === id);
  if (!item) return;
  const deshacer = quitarDeColeccion('rapida', id);
  renderizarCompra();
  actualizarInsigniaCompra();
  aviso(`${item.nombre} quitado`, {
    accion: { texto: 'Deshacer', fn: () => { deshacer(); refrescarApp(); } }
  });
}

// Quita varios elementos de una lista dejando la opción de deshacer
function quitarVarios(coleccion, filtro, mensaje) {
  const lista = getColeccion(coleccion);
  const quitados = lista.map((item, idx) => ({ item, idx })).filter(({ item }) => filtro(item));
  if (!quitados.length) return;

  setColeccion(coleccion, lista.filter(i => !filtro(i)));
  refrescarApp();
  aviso(mensaje(quitados.length), {
    accion: {
      texto: 'Deshacer',
      fn: () => {
        restaurarEnColeccion(coleccion, quitados);
        refrescarApp();
      }
    }
  });
}

/* -------------------------------------------------------
   Editar un producto de la lista rápida (pulsación larga)
------------------------------------------------------- */
function abrirEditarRapida(id) {
  const item = getRapida().find(i => i.id === id);
  if (!item) return;
  setPref('pistaEditarRapida', true);

  Hoja.abrir({
    titulo: 'Editar producto',
    cuerpo: `
      <form id="formEditarRapida" novalidate>
        <div class="fila-campos">
          <label class="campo">
            <span class="campo-etiqueta">Producto</span>
            <input class="entrada" name="nombre" required value="${esc(item.nombre)}" autocapitalize="sentences" />
          </label>
          <label class="campo">
            <span class="campo-etiqueta">Cantidad</span>
            <input class="entrada" name="cantidad" value="${esc(item.cantidad || '')}" placeholder="Opcional" />
          </label>
        </div>
        <label class="campo">
          <span class="campo-etiqueta">Instrucciones</span>
          <textarea class="entrada" name="notas" rows="2" maxlength="200" placeholder="Opcional. Ej.: la de marca blanca, sin lactosa, que esté madura…">${esc(item.notas || '')}</textarea>
          <span class="campo-ayuda">Solo se ve en la lista si escribes algo.</span>
        </label>
        <label class="campo">
          <span class="campo-etiqueta">Sección del súper</span>
          ${htmlSelectorCategoria(item.categoria)}
        </label>
        <div class="grupo-botones">
          <button type="button" class="boton boton-secundario boton-pequeno" data-x="aFija">${ico('fija')}Guardar también en la fija</button>
        </div>
      </form>
    `,
    pie: `
      <button type="button" class="boton boton-secundario" data-cerrar-hoja>Cancelar</button>
      <button type="submit" form="formEditarRapida" class="boton boton-primario">Guardar</button>
    `,
    alAbrir: (d) => {
      const form = d.querySelector('form');
      d.querySelector('[data-x="aFija"]').addEventListener('click', async () => {
        await Hoja.cerrar(d);
        const v = valoresFormulario(form);
        anadirAFija([{ nombre: v.nombre || item.nombre, cantidad: v.cantidad, categoria: v.categoria, notas: v.notas }]);
        aviso('Guardado en la lista fija');
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const v = valoresFormulario(form);
        if (!v.nombre) return form.nombre.focus();
        const editado = { ...item, nombre: capitalizar(v.nombre), cantidad: v.cantidad, categoria: v.categoria, notas: v.notas };
        if (!editado.notas) delete editado.notas;
        const lista = getRapida().map(i => (i.id === id ? editado : i));
        // Recordar la sección elegida para la próxima vez
        actualizarFamiliaActiva({ rapida: lista, historial: anotarEnHistorial([editado]) });
        Hoja.cerrar(d);
        refrescarApp();
      });
    }
  });
}

function htmlSelectorCategoria(seleccionada) {
  return `
    <select class="entrada" name="categoria">
      ${CATEGORIAS.map(c => `<option value="${esc(c.id)}" ${c.id === seleccionada ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}
    </select>
  `;
}

/* =========================================================
   LISTA FIJA
   ========================================================= */
function renderizarListaFija() {
  const cont = document.getElementById('listaFija');
  const todos = getCompra();
  const plegados = new Set(getPref('fijaPlegados', []));
  document.querySelector('#panelFija .herramientas').hidden = todos.length < 8;

  if (!todos.length) {
    cont.innerHTML = `
      <div class="vacio-compacto">
        <p><strong>La lista fija está vacía.</strong> Añade lo que compras siempre, con la cantidad y notas como cómo congelarlo o dividirlo.</p>
        <div class="grupo-botones">
          <button class="boton boton-primario boton-pequeno" data-accion="nuevoFija">${ico('mas')}Añadir producto</button>
          <button class="boton boton-secundario boton-pequeno" data-accion="cargarEjemplos">Ver un ejemplo</button>
        </div>
      </div>
    `;
    return;
  }

  const items = todos
    .filter(i => coincideBusqueda([i.nombre, i.cantidad, i.notas], consultaFija))
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));
  const marcados = todos.filter(i => i.comprado).length;

  if (!items.length) {
    cont.innerHTML = `<div class="vacio-compacto"><p>Nada coincide con «${esc(consultaFija)}».</p></div>`;
    return;
  }

  cont.innerHTML = `
    ${consultaFija ? '' : htmlAvisoEjemplos('compra')}
    ${marcados ? `
      <div class="progreso">
        <span>${marcados} de ${todos.length} marcados</span>
        <div class="progreso-barra"><span style="width:${(marcados / todos.length * 100).toFixed(1)}%"></span></div>
        <button class="boton-texto" data-accion="desmarcarFija">Desmarcar</button>
      </div>` : ''}

    ${agruparPorCategoria(items).map(([cat, lista]) => {
      const hechos = lista.filter(i => i.comprado).length;
      const plegado = plegados.has(cat) && !consultaFija;
      return `
        <section class="grupo ${plegado ? 'plegado' : ''}">
          ${htmlCabeceraGrupo(cat, `${hechos}/${lista.length}`, true).replace('aria-expanded="true"', `aria-expanded="${!plegado}"`)}
          <div class="lista">${lista.map(htmlFilaFija).join('')}</div>
        </section>
      `;
    }).join('')}
  `;
}

function htmlFilaFija(i) {
  return `
    <div class="producto ${i.comprado ? 'marcado' : ''} ${recienAnadidos.has(i.id) ? 'producto-entrando' : ''}" data-pulsacion-larga="editarFija" data-id="${esc(i.id)}">
      <button class="producto-marcar" data-accion="marcarFija" data-id="${esc(i.id)}" aria-pressed="${!!i.comprado}">
        <span class="casilla">${ico('check')}</span>
        <span class="producto-texto">
          <span class="producto-nombre">${esc(i.nombre)}${esEjemplo('compra', i) ? '<span class="etiqueta-ejemplo">Ejemplo</span>' : ''}</span>
          ${detalleProducto(i)}
          ${htmlNotaProducto(i)}
        </span>
      </button>
      <button class="boton-icono pequeno" data-accion="editarFija" data-id="${esc(i.id)}" aria-label="Editar ${esc(i.nombre)}">${ico('editar')}</button>
    </div>
  `;
}

function marcarFija(id, el) {
  const lista = getCompra().map(i => (i.id === id ? alternarComprado(i) : i));
  const item = lista.find(i => i.id === id);
  if (!item) return;
  setColeccion('compra', lista);
  vibrar(item.comprado ? 10 : 5);
  el.closest('.producto').classList.toggle('marcado', item.comprado);
  el.setAttribute('aria-pressed', item.comprado);

  clearTimeout(tRenderRapida);
  tRenderRapida = setTimeout(renderizarCompra, 250);
}

// Añade productos a la fija; si ya existen, los deja sin marcar
function anadirAFija(productos) {
  const lista = getCompra().slice();
  let nuevos = 0;
  productos.forEach(p => {
    const clave = claveProducto(p.nombre);
    const idx = lista.findIndex(i => claveProducto(i.nombre) === clave);
    if (idx >= 0) {
      lista[idx] = { ...lista[idx], comprado: false, marcadoPor: '', cantidad: lista[idx].cantidad || p.cantidad || '' };
    } else {
      const item = {
        id: generarId('ing'),
        nombre: capitalizar(p.nombre),
        cantidad: p.cantidad || '',
        categoria: p.categoria || adivinarCategoria(p.nombre),
        notas: p.notas || '',
        comprado: false,
        autor: getYo().id
      };
      lista.push(item);
      recienAnadidos.add(item.id);
      nuevos++;
    }
  });
  setColeccion('compra', lista);
  return nuevos;
}

/* -------------------------------------------------------
   Formulario de la lista fija (nuevo / editar)
------------------------------------------------------- */
function abrirFormFija(id = null) {
  const item = id ? getIngredientePorId(id) : null;

  Hoja.abrir({
    titulo: item ? 'Editar producto' : 'Añadir a la lista fija',
    cuerpo: `
      <form id="formFija" novalidate>
        <label class="campo">
          <span class="campo-etiqueta">Producto</span>
          <input class="entrada" name="nombre" required maxlength="100" value="${esc(item?.nombre || '')}" placeholder="Ej.: Pechuga de pollo" ${item ? '' : 'autofocus'} autocapitalize="sentences" />
        </label>
        <div class="fila-campos">
          <label class="campo">
            <span class="campo-etiqueta">Cantidad</span>
            <input class="entrada" name="cantidad" value="${esc(item?.cantidad || '')}" placeholder="Ej.: 500 g" />
          </label>
          <label class="campo">
            <span class="campo-etiqueta">Sección</span>
            ${htmlSelectorCategoria(item?.categoria || 'Otros')}
          </label>
        </div>
        <label class="campo">
          <span class="campo-etiqueta">Notas</span>
          <textarea class="entrada" name="notas" rows="3" placeholder="Cómo dividirlo, congelarlo, marca preferida…">${esc(item?.notas || '')}</textarea>
        </label>
        ${item ? `
          <div class="grupo-botones">
            <button type="button" class="boton boton-secundario boton-pequeno" data-x="aRapida">${ico('rayo')}Añadir a la rápida</button>
            <button type="button" class="boton boton-secundario boton-pequeno peligro" data-x="eliminar">${ico('papelera')}Eliminar</button>
          </div>` : ''}
      </form>
    `,
    pie: `
      <button type="button" class="boton boton-secundario" data-cerrar-hoja>Cancelar</button>
      <button type="submit" form="formFija" class="boton boton-primario">${item ? 'Guardar' : 'Añadir'}</button>
    `,
    alAbrir: (d) => {
      const form = d.querySelector('form');
      const selCat = form.categoria;
      let catTocada = !!item;
      selCat.addEventListener('change', () => { catTocada = true; });
      form.nombre.addEventListener('input', debounce(() => {
        if (!catTocada && form.nombre.value.trim()) selCat.value = adivinarCategoria(form.nombre.value);
      }, 250));

      d.querySelector('[data-x="aRapida"]')?.addEventListener('click', async () => {
        await Hoja.cerrar(d);
        anadirProductosARapida([{ nombre: item.nombre, cantidad: item.cantidad, categoria: item.categoria }]);
        refrescarApp();
        aviso(`${item.nombre} en la lista rápida`);
      });
      d.querySelector('[data-x="eliminar"]')?.addEventListener('click', async () => {
        await Hoja.cerrar(d);
        const deshacer = quitarDeColeccion('compra', item.id);
        refrescarApp();
        aviso(`${item.nombre} eliminado de la fija`, { accion: { texto: 'Deshacer', fn: () => { deshacer(); refrescarApp(); } } });
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const v = valoresFormulario(form);
        if (!v.nombre) {
          form.nombre.focus();
          aviso('Escribe el nombre del producto', { tipo: 'error' });
          return;
        }
        const nuevo = {
          id: item ? item.id : generarId('ing'),
          nombre: capitalizar(v.nombre),
          cantidad: v.cantidad,
          categoria: v.categoria,
          notas: v.notas,
          comprado: item ? !!item.comprado : false,
          marcadoPor: item ? (item.marcadoPor || '') : '',
          autor: item ? (item.autor || '') : getYo().id
        };
        if (!item) recienAnadidos.add(nuevo.id);
        guardarIngredienteStorage(nuevo);
        Hoja.cerrar(d);
        refrescarApp();
        aviso(item ? 'Producto guardado' : `${nuevo.nombre} añadido a la fija`);
      });
    }
  });
}

/* =========================================================
   AÑADIR INGREDIENTES (de dietas o recetas) A LA COMPRA
   ========================================================= */
function abrirAnadirACompra({ titulo, entradas }) {
  const productos = agregarIngredientes(entradas || []);
  if (!productos.length) {
    aviso('No hay ingredientes que añadir');
    return;
  }
  let destino = getPref('destinoCompra', 'rapida');

  const yaEn = (dest) => new Set((dest === 'rapida' ? getRapida().filter(i => !i.comprado) : getCompra())
    .map(i => claveProducto(i.nombre)));

  const filas = () => {
    const existentes = yaEn(destino);
    return productos.map((p, i) => {
      const ya = existentes.has(p.clave);
      return `
        <label class="fila previa-fila ${ya ? '' : 'marcado'}">
          <input type="checkbox" name="p" value="${i}" ${ya ? '' : 'checked'} />
          <span class="casilla">${ico('check')}</span>
          <span class="fila-texto">
            <span class="fila-titulo" style="font-weight:550">${esc(p.nombre)}</span>
            <span class="fila-detalle">${esc([p.cantidad, infoCategoria(p.categoria).nombre].filter(Boolean).join(' · '))}</span>
          </span>
          ${ya ? '<span class="ya">Ya está</span>' : ''}
        </label>
      `;
    }).join('');
  };

  const d = Hoja.abrir({
    titulo: 'Añadir a la compra',
    subtitulo: titulo,
    cuerpo: `
      <div class="campo">
        ${htmlSegmentado('destino', [{ valor: 'rapida', texto: 'Lista rápida' }, { valor: 'fija', texto: 'Lista fija' }], destino)}
      </div>
      <p class="campo-ayuda" style="margin-bottom:10px">Se han juntado los ingredientes repetidos. Desmarca lo que ya tengas en casa.</p>
      <div class="lista" data-x="filas">${filas()}</div>
    `,
    pie: `
      <button type="button" class="boton boton-secundario" data-cerrar-hoja>Cancelar</button>
      <button type="button" class="boton boton-primario" data-x="ok"></button>
    `
  });

  const cont = d.querySelector('[data-x="filas"]');
  const ok = d.querySelector('[data-x="ok"]');
  const actualizarBoton = () => {
    const n = cont.querySelectorAll('input:checked').length;
    ok.textContent = n ? `Añadir ${n}` : 'Nada que añadir';
    ok.disabled = !n;
  };
  actualizarBoton();

  // Las filas son <label>: el estilo de "marcado" sigue a su casilla
  cont.addEventListener('change', (e) => {
    e.target.closest('.previa-fila').classList.toggle('marcado', e.target.checked);
    actualizarBoton();
  });

  d.querySelectorAll('input[name="destino"]').forEach(r => r.addEventListener('change', () => {
    destino = r.value;
    setPref('destinoCompra', destino);
    cont.innerHTML = filas();
    actualizarBoton();
  }));

  ok.addEventListener('click', async () => {
    const elegidos = [...cont.querySelectorAll('input:checked')].map(c => productos[Number(c.value)]);
    await Hoja.cerrar(d);

    if (destino === 'rapida') {
      anadirProductosARapida(elegidos);
    } else {
      anadirAFija(elegidos);
    }

    refrescarApp();
    aviso(`${plural(elegidos.length, 'producto')} en la lista ${destino === 'rapida' ? 'rápida' : 'fija'}`, {
      accion: vistaActual === 'compra' && segmentoCompra === destino ? null : {
        texto: 'Ver',
        fn: () => {
          segmentoCompra = destino;
          setPref('segmentoCompra', destino);
          irAVista('compra');
        }
      }
    });
  });
}

/* =========================================================
   MENÚ Y TEXTO PARA COMPARTIR
   ========================================================= */
function textoLista(items, titulo) {
  const lineas = [titulo];
  agruparPorCategoria(items).forEach(([cat, lista]) => {
    lineas.push('', infoCategoria(cat).nombre);
    lista.forEach(i => {
      const nota = String(i.notas || '').trim();
      lineas.push(`• ${i.nombre}${i.cantidad ? ` (${i.cantidad})` : ''}${nota ? ` — ${nota}` : ''}`);
    });
  });
  return lineas.join('\n');
}

async function compartirTexto(titulo, texto) {
  if (navigator.share) {
    try {
      await navigator.share({ title: titulo, text: texto });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(texto);
    aviso('Lista copiada. Pégala donde quieras.');
  } catch (e) {
    aviso('No se ha podido copiar la lista', { tipo: 'error' });
  }
}

function menuCompra() {
  if (segmentoCompra === 'rapida') {
    const lista = getRapida();
    const pendientes = lista.filter(i => !i.comprado);
    const comprados = lista.length - pendientes.length;
    const fijaPendiente = getCompra().filter(i => !i.comprado).length;

    const acciones = [
      pendientes.length && {
        icono: 'compartir', texto: 'Enviar la lista', detalle: 'Por WhatsApp, mensaje o donde quieras',
        fn: () => compartirTexto('Lista de la compra', textoLista(pendientes, 'Lista de la compra'))
      },
      fijaPendiente && {
        icono: 'fija', texto: 'Traer lo pendiente de la fija', detalle: `${plural(fijaPendiente, 'producto')} sin marcar`,
        fn: () => traerDeFija()
      },
      comprados && { icono: 'check', texto: 'Quitar lo comprado', detalle: plural(comprados, 'producto'), fn: () => ACCIONES.vaciarCompradosRapida() },
      lista.length && { icono: 'vaciar', texto: 'Vaciar la lista', peligro: true, fn: () => ACCIONES.vaciarRapida() }
    ].filter(Boolean);

    menuAcciones({
      titulo: 'Lista rápida',
      acciones: acciones.length ? acciones : [{
        icono: 'mas', texto: 'La lista está vacía', detalle: 'Escribe arriba para añadir',
        fn: () => document.getElementById('entradaRapida').focus()
      }]
    });
    return;
  }

  const fija = getCompra();
  const marcados = fija.filter(i => i.comprado).length;
  const pendientes = fija.filter(i => !i.comprado);
  menuAcciones({
    titulo: 'Lista fija',
    acciones: [
      { icono: 'mas', texto: 'Añadir producto', fn: () => abrirFormFija() },
      marcados && { icono: 'desmarcar', texto: 'Desmarcar todo', detalle: 'Para empezar la próxima compra', fn: () => ACCIONES.desmarcarFija() },
      pendientes.length && {
        icono: 'rayo', texto: 'Pasar lo no marcado a la rápida', detalle: plural(pendientes.length, 'producto'),
        fn: () => {
          segmentoCompra = 'rapida';
          setPref('segmentoCompra', 'rapida');
          actualizarFab();
          traerDeFija();
        }
      },
      fija.length && {
        icono: 'compartir', texto: 'Enviar la lista fija',
        fn: () => compartirTexto('Lista fija', textoLista(pendientes.length ? pendientes : fija, 'Lista de la compra'))
      }
    ]
  });
}

function traerDeFija() {
  const yaPendientes = new Set(getRapida().filter(i => !i.comprado).map(i => claveProducto(i.nombre)));
  const faltan = getCompra().filter(i => !i.comprado && !yaPendientes.has(claveProducto(i.nombre)));
  if (!faltan.length) {
    aviso('Ya estaba todo en la rápida');
    return;
  }
  anadirProductosARapida(faltan.map(i => ({ nombre: i.nombre, cantidad: i.cantidad, categoria: i.categoria })));
  refrescarApp();
  aviso(`${plural(faltan.length, 'producto')} traído${faltan.length === 1 ? '' : 's'} de la fija`);
}

function actualizarInsigniaCompra() {
  const n = getRapida().filter(i => !i.comprado).length;
  const insignia = document.getElementById('insigniaCompra');
  insignia.hidden = !n;
  insignia.textContent = n > 99 ? '99+' : n;
}

/* -------------------------------------------------------
   Acciones registradas
------------------------------------------------------- */
registrarAcciones({
  segmentoCompra: (el) => {
    segmentoCompra = el.dataset.segmento;
    setPref('segmentoCompra', segmentoCompra);
    actualizarFab();
    renderizarCompra();
  },
  menuCompra: () => menuCompra(),
  marcarRapida: (el) => marcarRapida(el.dataset.id, el),
  quitarRapida: (el) => quitarRapida(el.dataset.id),
  editarRapida: (el) => abrirEditarRapida(el.dataset.id),
  anadirSugerencia: (el) => anadirARapida(el.dataset.nombre),
  traerDeFija: () => traerDeFija(),
  vaciarRapida: () => quitarVarios('rapida', () => true, n => `Lista vaciada (${plural(n, 'producto')})`),
  vaciarCompradosRapida: () => quitarVarios('rapida', i => i.comprado, n => `${plural(n, 'producto')} fuera de la lista`),
  marcarFija: (el) => marcarFija(el.dataset.id, el),
  editarFija: (el) => abrirFormFija(el.dataset.id),
  nuevoFija: () => abrirFormFija(),
  desmarcarFija: () => {
    const antes = getCompra().filter(i => i.comprado).map(i => i.id);
    setColeccion('compra', getCompra().map(i => ({ ...i, comprado: false, marcadoPor: '' })));
    refrescarApp();
    aviso('Lista fija desmarcada', {
      accion: {
        texto: 'Deshacer',
        fn: () => {
          const ids = new Set(antes);
          setColeccion('compra', getCompra().map(i => (ids.has(i.id) ? { ...i, comprado: true } : i)));
          refrescarApp();
        }
      }
    });
  },
  plegarGrupo: (el) => {
    const plegados = new Set(getPref('fijaPlegados', []));
    const cat = el.dataset.cat;
    if (plegados.has(cat)) plegados.delete(cat);
    else plegados.add(cat);
    setPref('fijaPlegados', [...plegados]);
    const grupo = el.closest('.grupo');
    grupo.classList.toggle('plegado', plegados.has(cat));
    el.setAttribute('aria-expanded', !plegados.has(cat));
  }
});
