/* =========================================================
   MÓDULO PLAN (DIETAS)
   Muestra una dieta por días con el de hoy seleccionado.
   Las comidas se añaden, editan, copian y quitan día a día.
   Cada dieta puede ser para toda la familia o para algunos
   miembros; al abrir la app se muestra la tuya.
   ========================================================= */

const TOMAS = ['Desayuno', 'Almuerzo', 'Merienda', 'Cena'];

// Día seleccionado en la tira de la semana (0 = lunes)
let diaPlan = indiceHoy();

/* -------------------------------------------------------
   Utilidades de dietas
------------------------------------------------------- */
function claveDietaVista() {
  return `dietaVista_${getFamiliaActivaId()}`;
}

function dietaVisible() {
  const dietas = getDietas();
  if (!dietas.length) return null;
  const yo = getYo().id;
  return dietas.find(d => d.id === getPref(claveDietaVista()))
    || dietas.find(d => (d.para || []).includes(yo))
    || dietas.find(d => !(d.para || []).length)
    || dietas[0];
}

// Miembros que siguen una dieta (los que ya no están en la familia se ignoran)
function miembrosDeDieta(dieta) {
  const ids = dieta.para || [];
  return getMiembros().filter(m => ids.includes(m.id));
}

function textoParaQuien(dieta) {
  const nombres = miembrosDeDieta(dieta).map(m => (m.id === getYo().id ? 'ti' : m.nombre));
  if (!nombres.length) return getMiembros().length > 1 ? 'Para toda la familia' : '';
  if (nombres.length === 1) return `Para ${nombres[0]}`;
  return `Para ${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

function comidasDelDia(dieta, dia) {
  return (dieta.comidas || [])
    .filter(c => c.dia === dia)
    .sort((a, b) => ordenToma(a.toma) - ordenToma(b.toma));
}

function ordenToma(toma) {
  const i = TOMAS.indexOf(toma);
  return i < 0 ? 9 : i;
}

function totalesMacros(comidas) {
  return comidas.reduce((acc, c) => {
    acc.kcal += numero(c.kcal);
    acc.proteina += numero(c.proteina);
    acc.carbos += numero(c.carbos);
    acc.grasa += numero(c.grasa);
    return acc;
  }, { kcal: 0, proteina: 0, carbos: 0, grasa: 0 });
}

function guardarDietaModificada(dietaId, modificar) {
  const dieta = clonar(getDietaPorId(dietaId));
  if (!dieta) return null;
  dieta.comidas = dieta.comidas || [];
  modificar(dieta);
  guardarDietaStorage(dieta);
  return dieta;
}

/* -------------------------------------------------------
   Piezas de HTML compartidas con el módulo de recetas
------------------------------------------------------- */
function htmlCifras({ kcal, proteina, carbos, grasa }) {
  const cifra = (valor, etiqueta, clase) => `
    <div class="detalle-cifra">
      <strong>${valor || '—'}</strong>
      <span>${clase ? `<i class="${clase}"></i>` : ''}${etiqueta}</span>
    </div>`;
  return `
    <div class="detalle-cifras">
      ${cifra(numero(kcal) ? fmt(kcal) : '', 'kcal')}
      ${cifra(esc(fmtGramos(proteina)), 'Proteína', 'm-p')}
      ${cifra(esc(fmtGramos(carbos)), 'Hidratos', 'm-c')}
      ${cifra(esc(fmtGramos(grasa)), 'Grasa', 'm-g')}
    </div>
  `;
}

function htmlBarraMacros(t) {
  const p = t.proteina * 4, c = t.carbos * 4, g = t.grasa * 9;
  const total = p + c + g;
  if (!total) return '';
  const pct = v => `${(v / total * 100).toFixed(1)}%`;
  return `
    <div class="macros">
      <div class="macros-barra" role="img" aria-label="Reparto de macronutrientes">
        <span class="m-p" style="width:${pct(p)}"></span>
        <span class="m-c" style="width:${pct(c)}"></span>
        <span class="m-g" style="width:${pct(g)}"></span>
      </div>
      <div class="macros-leyenda">
        <span><i class="m-p"></i>Proteína <strong>${fmt(t.proteina)} g</strong></span>
        <span><i class="m-c"></i>Hidratos <strong>${fmt(t.carbos)} g</strong></span>
        <span><i class="m-g"></i>Grasa <strong>${fmt(t.grasa)} g</strong></span>
      </div>
    </div>
  `;
}

function htmlPreparacion(texto) {
  if (!texto) return '';
  return `
    <section class="detalle-bloque">
      <h3>Preparación</h3>
      <p class="texto-preparacion">${esc(texto)}</p>
    </section>
  `;
}

/* -------------------------------------------------------
   Renderizado principal
------------------------------------------------------- */
function renderizarPlan() {
  const cont = document.getElementById('planContenido');
  if (!cont) return;
  document.getElementById('planFecha').textContent = fechaLarga();

  const dietas = getDietas();
  if (!dietas.length) {
    cont.innerHTML = `
      <div class="vacio">
        <h2 class="vacio-titulo">Todavía no hay ninguna dieta</h2>
        <p class="vacio-texto">Crea la de casa o una para cada uno y rellena los días con vuestras recetas. Al abrir la app verás directamente lo que toca hoy.</p>
        <div class="grupo-botones">
          <button class="boton boton-primario" data-accion="nuevaDieta">${ico('mas')}Crear dieta</button>
          <button class="boton boton-secundario" data-accion="cargarEjemplos">Ver un ejemplo</button>
        </div>
      </div>
    `;
    return;
  }

  const dieta = dietaVisible();
  const nombreDia = DIAS_SEMANA[diaPlan];
  const comidas = comidasDelDia(dieta, nombreDia);
  const totales = totalesMacros(comidas);
  const esHoy = diaPlan === indiceHoy();

  cont.innerHTML = `
    ${esEjemplo('dietas', dieta) ? htmlAvisoEjemplos('dietas') : ''}

    <div class="scroll-x selector-dietas" role="list">
      ${dietas.map(d => `
        <button class="chip ${d.id === dieta.id ? 'activo' : ''}" role="listitem" data-accion="verDieta" data-id="${esc(d.id)}">
          ${miembrosDeDieta(d).length ? `<span class="mini-avatares">${miembrosDeDieta(d).slice(0, 3).map(m => htmlAvatarMiembro(m, 'mini')).join('')}</span>` : ''}${esc(d.nombre)}
        </button>
      `).join('')}
      <button class="chip" data-accion="nuevaDieta">${ico('mas')}Nueva</button>
    </div>

    <div class="dieta-cabecera">
      <div class="dieta-cabecera-texto">
        <h2 class="dieta-nombre">${esc(dieta.nombre)}</h2>
        ${textoParaQuien(dieta) ? `<p class="dieta-para">${esc(textoParaQuien(dieta))}</p>` : ''}
        ${dieta.descripcion ? `<p class="dieta-descripcion">${esc(dieta.descripcion)}</p>` : ''}
      </div>
      <button class="boton-icono" data-accion="menuDieta" data-id="${esc(dieta.id)}" aria-label="Opciones de la dieta">${ico('mas_h')}</button>
    </div>

    ${htmlTiraSemana(dieta)}

    <div class="dia-resumen">
      <h3 class="dia-nombre">${nombreDia}${esHoy ? '<small>Hoy</small>' : ''}</h3>
      <div class="dia-resumen-derecha">
        ${totales.kcal ? `<div class="dia-kcal-total"><strong>${fmt(totales.kcal)}</strong><span>kcal</span></div>` : ''}
        ${comidas.length ? `<button class="boton-icono pequeno" data-accion="menuDia" aria-label="Opciones del ${nombreDia.toLowerCase()}">${ico('mas_h')}</button>` : ''}
      </div>
    </div>
    ${htmlBarraMacros(totales)}

    ${comidas.length ? `
      <div class="lista">
        ${comidas.map(c => htmlComidaFila(c, dieta.id)).join('')}
        <button class="fila fila-anadir" data-accion="anadirComidaDia">${ico('mas')}Añadir comida</button>
      </div>
    ` : `
      <div class="vacio-compacto">
        <p>No hay nada planeado para el ${nombreDia.toLowerCase()}.</p>
        <div class="grupo-botones">
          <button class="boton boton-primario boton-pequeno" data-accion="anadirComidaDia">${ico('mas')}Añadir comida</button>
          ${diaConComidasCercano(dieta) !== null ? `<button class="boton boton-secundario boton-pequeno" data-accion="copiarDeOtroDia">${ico('repetir')}Copiar de otro día</button>` : ''}
        </div>
      </div>
    `}

    ${htmlResumenSemana(dieta)}
  `;
}

function htmlTiraSemana(dieta) {
  const hoy = indiceHoy();
  return `
    <div class="semana" role="group" aria-label="Días de la semana">
      ${DIAS_SEMANA.map((dia, i) => {
        const kcal = totalesMacros(comidasDelDia(dieta, dia)).kcal;
        const tiene = (dieta.comidas || []).some(c => c.dia === dia);
        return `
          <button class="dia-boton ${i === hoy ? 'hoy' : ''} ${tiene ? '' : 'vacio-dia'}" data-accion="elegirDia" data-dia="${i}"
                  aria-pressed="${i === diaPlan}" aria-label="${dia}${i === hoy ? ', hoy' : ''}">
            <span class="dia-letra">${DIAS_CORTOS[i]}</span>
            <span class="dia-kcal">${kcal ? (kcal >= 1000 ? `${fmtDecimal(kcal / 1000)}k` : fmt(kcal)) : (tiene ? '·' : '')}</span>
          </button>
        `;
      }).join('')}
    </div>
  `;
}

function htmlComidaFila(c, dietaId) {
  const vista = (c.ingredientes || []).slice(0, 3).join(' · ');
  return `
    <button class="fila comida-fila" data-accion="verComidaDieta" data-dieta="${esc(dietaId)}" data-comida="${esc(c.id)}">
      <span class="fila-texto">
        <span class="toma toma-${esc(c.toma)}">${esc(c.toma || 'Comida')}</span>
        <span class="comida-nombre">${esc(c.plato)}</span>
        ${vista ? `<span class="fila-detalle">${esc(vista)}</span>` : ''}
      </span>
      ${numero(c.kcal) ? `<span class="comida-kcal">${fmt(c.kcal)}<small>kcal</small></span>` : ''}
    </button>
  `;
}

function htmlResumenSemana(dieta) {
  const porDia = DIAS_SEMANA.map(d => totalesMacros(comidasDelDia(dieta, d)));
  const conPlan = porDia.filter(t => t.kcal > 0);
  if (!conPlan.length) return '';

  const max = Math.max(...porDia.map(t => t.kcal), 1);
  const media = conPlan.reduce((s, t) => s + t.kcal, 0) / conPlan.length;
  const mediaProt = conPlan.reduce((s, t) => s + t.proteina, 0) / conPlan.length;
  const hoy = indiceHoy();

  return `
    <h3 class="titulo-seccion">La semana <small>${plural(conPlan.length, 'día')} con plan</small></h3>
    <div class="lista semana-grafico">
      <div class="grafico-barras" role="img" aria-label="Calorías de cada día de la semana">
        ${porDia.map((t, i) => `
          <div class="grafico-col ${i === hoy ? 'hoy' : ''} ${i === diaPlan ? 'seleccionado' : ''}">
            <div class="grafico-barra" style="height:${Math.max(2, t.kcal / max * 100)}%" title="${DIAS_SEMANA[i]}: ${fmt(t.kcal)} kcal"></div>
            <span class="grafico-letra">${DIAS_CORTOS[i]}</span>
          </div>
        `).join('')}
      </div>
      <div class="grafico-pie">
        <span>Media <strong>${fmt(media)} kcal</strong> al día</span>
        ${mediaProt ? `<span><strong>${fmt(mediaProt)} g</strong> de proteína</span>` : ''}
      </div>
    </div>
  `;
}

function diaConComidasCercano(dieta) {
  for (let salto = 1; salto < 7; salto++) {
    for (const i of [diaPlan - salto, diaPlan + salto]) {
      if (i >= 0 && i < 7 && (dieta.comidas || []).some(c => c.dia === DIAS_SEMANA[i])) return i;
    }
  }
  return null;
}

/* -------------------------------------------------------
   Detalle de una comida del plan
------------------------------------------------------- */
function abrirDetalleComidaDieta(dietaId, comidaId) {
  const dieta = getDietaPorId(dietaId);
  const c = dieta && (dieta.comidas || []).find(x => x.id === comidaId);
  if (!c) return;

  const yaEsPlato = getComidas().some(p => normalizar(p.nombre) === normalizar(c.plato));
  const ings = c.ingredientes || [];

  Hoja.abrir({
    titulo: c.plato,
    subtitulo: `${c.toma || 'Comida'} · ${c.dia}`,
    cuerpo: `
      ${htmlCifras(c)}
      ${ings.length ? `
        <section class="detalle-bloque">
          <h3>Ingredientes</h3>
          <ul class="lista-ingredientes">
            ${ings.map(i => `<li><span class="ing-nombre">${esc(i)}</span></li>`).join('')}
          </ul>
        </section>` : ''}
      ${htmlPreparacion(c.preparacion)}
      <div class="detalle-acciones">
        <button class="boton boton-secundario" data-x="editar">${ico('editar')}Editar</button>
        <button class="boton boton-secundario" data-x="copiar">${ico('repetir')}Copiar a…</button>
        ${ings.length ? `<button class="boton boton-secundario" data-x="compra">${ico('cesta_mas')}A la compra</button>` : ''}
        ${!yaEsPlato ? `<button class="boton boton-secundario" data-x="guardar">${ico('platos')}Guardar receta</button>` : ''}
        <button class="boton boton-secundario peligro ancho" data-x="quitar">${ico('papelera')}Quitar del ${c.dia.toLowerCase()}</button>
      </div>
    `,
    alAbrir: (d) => {
      const en = (x, fn) => d.querySelector(`[data-x="${x}"]`)?.addEventListener('click', fn);
      en('editar', async () => { await Hoja.cerrar(d); abrirFormComidaDia(dietaId, c.dia, c.id); });
      en('copiar', async () => {
        await Hoja.cerrar(d);
        elegirDias({
          titulo: `Copiar «${c.plato}»`,
          boton: 'Copiar',
          excluir: DIAS_SEMANA.indexOf(c.dia),
          alElegir: (dias) => copiarComidaADias(dietaId, c.id, dias)
        });
      });
      en('compra', async () => {
        await Hoja.cerrar(d);
        abrirAnadirACompra({ titulo: c.plato, entradas: ings.map(texto => ({ texto })) });
      });
      en('guardar', async () => {
        await Hoja.cerrar(d);
        guardarComidaComoReceta(c);
      });
      en('quitar', async () => {
        await Hoja.cerrar(d);
        quitarComidaDia(dietaId, c.id);
      });
    }
  });
}

function quitarComidaDia(dietaId, comidaId) {
  const dieta = getDietaPorId(dietaId);
  const idx = (dieta.comidas || []).findIndex(x => x.id === comidaId);
  if (idx < 0) return;
  const comida = dieta.comidas[idx];

  guardarDietaModificada(dietaId, d => { d.comidas.splice(idx, 1); });
  refrescarApp();
  aviso(`«${comida.plato}» quitado del ${comida.dia.toLowerCase()}`, {
    accion: {
      texto: 'Deshacer',
      fn: () => {
        guardarDietaModificada(dietaId, d => {
          if (!d.comidas.some(x => x.id === comida.id)) d.comidas.splice(idx, 0, comida);
        });
        refrescarApp();
      }
    }
  });
}

function copiarComidaADias(dietaId, comidaId, dias) {
  const original = (getDietaPorId(dietaId)?.comidas || []).find(x => x.id === comidaId);
  if (!original || !dias.length) return;
  guardarDietaModificada(dietaId, d => {
    dias.forEach(i => d.comidas.push({ ...clonar(original), id: generarId('c'), dia: DIAS_SEMANA[i] }));
  });
  refrescarApp();
  aviso(dias.length === 1 ? `Copiado al ${DIAS_SEMANA[dias[0]].toLowerCase()}` : `Copiado a ${dias.length} días`);
}

function guardarComidaComoReceta(c) {
  const ingredientesDetallados = (c.ingredientes || []).map(linea => {
    const m = linea.match(RE_MEDIDA);
    const nombre = m ? linea.slice(m[0].length).replace(/^\s*(de\s+)?/i, '') : linea;
    return {
      nombre: capitalizar(nombre || linea),
      peso: m ? m[0].trim() : '',
      tipo: tipoDesdeCategoria(adivinarCategoria(nombre || linea))
    };
  });

  guardarComidaStorage({
    id: generarId('comida'),
    nombre: c.plato,
    toma: c.toma || 'Almuerzo',
    preparacion: c.preparacion || '',
    ingredientesDetallados,
    kcal: numero(c.kcal),
    proteina: c.proteina || '',
    carbos: c.carbos || '',
    grasa: c.grasa || '',
    autor: getYo().id,
    fechaCreacion: new Date().toISOString()
  });
  aviso(`«${c.plato}» guardada en las recetas`);
}

/* -------------------------------------------------------
   Formulario de una comida del día (nueva o existente)
   plantilla: datos con los que rellenar (p. ej. una receta)
------------------------------------------------------- */
function abrirFormComidaDia(dietaId, dia, comidaId = null, plantilla = null) {
  const dieta = getDietaPorId(dietaId);
  if (!dieta) return;
  const existente = comidaId ? (dieta.comidas || []).find(x => x.id === comidaId) : null;
  const c = existente || plantilla || { toma: tomaSugerida(dieta, dia) };

  Hoja.abrir({
    titulo: existente ? 'Editar comida' : `Nueva comida`,
    subtitulo: existente ? '' : `Para el ${dia.toLowerCase()} · ${dieta.nombre}`,
    cuerpo: `
      <form id="formComidaDia" novalidate>
        <div class="campo">
          <span class="campo-etiqueta">Momento del día</span>
          ${htmlSegmentado('toma', TOMAS.map(t => ({ valor: t, texto: t })), c.toma || 'Almuerzo')}
        </div>
        <label class="campo">
          <span class="campo-etiqueta">Plato</span>
          <input class="entrada" name="plato" required maxlength="120" value="${esc(c.plato || '')}" placeholder="Ej.: Lentejas con pollo" ${existente ? '' : 'autofocus'} autocapitalize="sentences" />
        </label>
        ${existente ? `
          <label class="campo">
            <span class="campo-etiqueta">Día</span>
            <select class="entrada" name="dia">
              ${DIAS_SEMANA.map(d => `<option ${d === dia ? 'selected' : ''}>${d}</option>`).join('')}
            </select>
          </label>` : ''}
        <label class="campo">
          <span class="campo-etiqueta">Ingredientes</span>
          <textarea class="entrada" name="ingredientes" rows="4" placeholder="Uno por línea:&#10;200 g lentejas cocidas&#10;150 g pechuga de pollo">${esc((c.ingredientes || []).join('\n'))}</textarea>
        </label>
        <label class="campo">
          <span class="campo-etiqueta">Preparación</span>
          <textarea class="entrada" name="preparacion" rows="3" placeholder="Pasos, tiempos, trucos…">${esc(c.preparacion || '')}</textarea>
        </label>
        ${htmlCamposMacros(c)}
      </form>
    `,
    pie: `
      <button type="button" class="boton boton-secundario" data-cerrar-hoja>Cancelar</button>
      <button type="submit" form="formComidaDia" class="boton boton-primario">${existente ? 'Guardar' : 'Añadir'}</button>
    `,
    alAbrir: (d) => {
      const form = d.querySelector('form');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const v = valoresFormulario(form);
        if (!v.plato) {
          form.plato.focus();
          aviso('Ponle nombre al plato', { tipo: 'error' });
          return;
        }
        const comida = {
          id: existente ? existente.id : generarId('c'),
          dia: v.dia || dia,
          toma: v.toma || 'Almuerzo',
          plato: v.plato,
          ingredientes: (v.ingredientes || '').split('\n').map(l => l.trim()).filter(Boolean),
          preparacion: v.preparacion || '',
          ...leerMacros(v)
        };
        guardarDietaModificada(dietaId, dd => {
          const i = dd.comidas.findIndex(x => x.id === comida.id);
          if (i >= 0) dd.comidas[i] = comida;
          else dd.comidas.push(comida);
        });
        Hoja.cerrar(d);
        diaPlan = DIAS_SEMANA.indexOf(comida.dia);
        refrescarApp();
        aviso(existente ? 'Comida actualizada' : `Añadido al ${comida.dia.toLowerCase()}`);
      });
    }
  });
}

function htmlCamposMacros(c = {}) {
  const campo = (nombre, etiqueta, valor, sufijo) => `
    <label class="campo">
      <span class="campo-etiqueta">${etiqueta}</span>
      <span class="con-sufijo" data-sufijo="${sufijo}">
        <input class="entrada" name="${nombre}" type="text" inputmode="decimal" value="${esc(valorEntrada(valor))}" placeholder="0" />
      </span>
    </label>`;
  return `
    <div class="separador-formulario">Valores aproximados <span class="campo-ayuda">opcional</span></div>
    <div class="campos-macros">
      ${campo('kcal', 'Kcal', c.kcal, '')}
      ${campo('proteina', 'Proteína', c.proteina, 'g')}
      ${campo('carbos', 'Hidratos', c.carbos, 'g')}
      ${campo('grasa', 'Grasa', c.grasa, 'g')}
    </div>
  `;
}

// Valor numérico para un campo de texto (sin separador de miles)
function valorEntrada(valor) {
  const n = Math.round(numero(valor) * 10) / 10;
  return n ? String(n).replace('.', ',') : '';
}

function leerMacros(v) {
  const g = (x) => (numero(x) ? `${valorEntrada(x)} g` : '');
  return {
    kcal: Math.round(numero(v.kcal)),
    proteina: g(v.proteina),
    carbos: g(v.carbos),
    grasa: g(v.grasa)
  };
}

// Primera toma del día que aún no tiene comida
function tomaSugerida(dieta, dia) {
  const usadas = new Set(comidasDelDia(dieta, dia).map(c => c.toma));
  return TOMAS.find(t => !usadas.has(t) && t !== 'Desayuno' && t !== 'Merienda')
    || TOMAS.find(t => !usadas.has(t))
    || 'Almuerzo';
}

/* -------------------------------------------------------
   Añadir comida a un día: elegir de las recetas o escribir
------------------------------------------------------- */
function abrirAnadirComidaDia() {
  let dieta = dietaVisible();
  if (!dieta) {
    abrirFormDieta();
    return;
  }
  const dia = DIAS_SEMANA[diaPlan];
  const recetas = getComidas();
  if (!recetas.length) {
    abrirFormComidaDia(dieta.id, dia);
    return;
  }

  let toma = tomaSugerida(dieta, dia);
  let consulta = '';

  const lista = () => {
    const filtrados = recetas
      .filter(p => coincideBusqueda([p.nombre, ...(p.ingredientesDetallados || []).map(i => i.nombre)], consulta))
      .sort((a, b) => (a.toma === toma ? 0 : 1) - (b.toma === toma ? 0 : 1));
    if (!filtrados.length) return `<p class="campo-ayuda" style="padding:16px 4px">No hay recetas que coincidan.</p>`;
    return `<div class="lista">${filtrados.map(p => `
      <button class="fila" data-plato="${esc(p.id)}">
        <span class="fila-texto">
          <span class="fila-titulo">${esc(p.nombre)}</span>
          <span class="fila-detalle"><span class="toma toma-${esc(p.toma)}">${esc(p.toma)}</span>${numero(p.kcal) ? ` · ${fmt(p.kcal)} kcal` : ''}</span>
        </span>
        ${ico('mas', 'ico-final')}
      </button>`).join('')}</div>`;
  };

  Hoja.abrir({
    titulo: `Añadir al ${dia.toLowerCase()}`,
    subtitulo: dieta.nombre,
    cuerpo: `
      <div class="campo">
        ${htmlSegmentado('tomaAnadir', TOMAS.map(t => ({ valor: t, texto: t })), toma)}
      </div>
      <button type="button" class="boton boton-borde boton-bloque" data-x="nuevo">${ico('editar')}Escribir una comida nueva</button>
      <h3 class="titulo-seccion">De las recetas</h3>
      <label class="buscador" style="margin-bottom:12px">
        ${ico('buscar')}
        <input type="search" placeholder="Buscar receta" data-x="buscar" autocomplete="off" enterkeyhint="search" />
      </label>
      <div data-x="lista">${lista()}</div>
    `,
    alAbrir: (d) => {
      const contLista = d.querySelector('[data-x="lista"]');
      d.querySelectorAll('input[name="tomaAnadir"]').forEach(r => r.addEventListener('change', () => {
        toma = r.value;
        contLista.innerHTML = lista();
      }));
      d.querySelector('[data-x="buscar"]').addEventListener('input', (e) => {
        consulta = e.target.value;
        contLista.innerHTML = lista();
      });
      d.querySelector('[data-x="nuevo"]').addEventListener('click', async () => {
        await Hoja.cerrar(d);
        abrirFormComidaDia(dieta.id, dia, null, { toma });
      });
      contLista.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-plato]');
        if (!btn) return;
        const plato = getComidaPorId(btn.dataset.plato);
        await Hoja.cerrar(d);
        anadirRecetaADieta(plato, dieta.id, diaPlan, toma);
      });
    }
  });
}

// Convierte una receta en una comida de la dieta
function comidaDesdePlato(plato, dia, toma) {
  return {
    id: generarId('c'),
    dia,
    toma: toma || plato.toma || 'Almuerzo',
    plato: plato.nombre,
    ingredientes: (plato.ingredientesDetallados || []).map(i => (i.peso ? `${i.peso} ${i.nombre}` : i.nombre)),
    preparacion: plato.preparacion || '',
    kcal: numero(plato.kcal),
    proteina: plato.proteina || '',
    carbos: plato.carbos || '',
    grasa: plato.grasa || ''
  };
}

function anadirRecetaADieta(plato, dietaId, diaIndice, toma) {
  if (!plato) return;
  const comida = comidaDesdePlato(plato, DIAS_SEMANA[diaIndice], toma);
  guardarDietaModificada(dietaId, d => { d.comidas.push(comida); });
  refrescarApp();
  aviso(`«${plato.nombre}» añadido al ${comida.dia.toLowerCase()}`, {
    accion: {
      texto: 'Deshacer',
      fn: () => {
        guardarDietaModificada(dietaId, d => { d.comidas = d.comidas.filter(x => x.id !== comida.id); });
        refrescarApp();
      }
    }
  });
}

/* -------------------------------------------------------
   Selector de días (copiar comida o día entero)
------------------------------------------------------- */
function elegirDias({ titulo, boton, excluir = -1, alElegir }) {
  const elegidos = new Set();
  const d = Hoja.abrir({
    titulo,
    subtitulo: 'Elige uno o varios días',
    clase: 'hoja-menu',
    cuerpo: `
      <div class="grupo-botones">
        ${DIAS_SEMANA.map((dia, i) => i === excluir ? '' : `
          <button type="button" class="chip" data-dia="${i}" aria-pressed="false">${dia}</button>
        `).join('')}
      </div>
    `,
    pie: `
      <button type="button" class="boton boton-secundario" data-cerrar-hoja>Cancelar</button>
      <button type="button" class="boton boton-primario" data-x="ok" disabled>${esc(boton)}</button>
    `
  });

  const ok = d.querySelector('[data-x="ok"]');
  d.querySelectorAll('[data-dia]').forEach(chip => chip.addEventListener('click', () => {
    const i = Number(chip.dataset.dia);
    if (elegidos.has(i)) elegidos.delete(i);
    else elegidos.add(i);
    chip.setAttribute('aria-pressed', elegidos.has(i));
    ok.disabled = !elegidos.size;
  }));
  ok.addEventListener('click', async () => {
    await Hoja.cerrar(d);
    alElegir([...elegidos].sort());
  });
}

/* -------------------------------------------------------
   Crear / editar dieta
------------------------------------------------------- */
function abrirFormDieta(dietaId = null) {
  const dieta = dietaId ? getDietaPorId(dietaId) : null;
  const otras = getDietas();
  const miembros = getMiembros();
  const para = new Set(dieta ? (dieta.para || []) : []);

  Hoja.abrir({
    titulo: dieta ? 'Editar dieta' : 'Nueva dieta',
    cuerpo: `
      <form id="formDieta" novalidate>
        <label class="campo">
          <span class="campo-etiqueta">Nombre</span>
          <input class="entrada" name="nombre" required maxlength="80" value="${esc(dieta?.nombre || '')}" placeholder="Ej.: Definición otoño" ${dieta ? '' : 'autofocus'} autocapitalize="sentences" />
        </label>
        <label class="campo">
          <span class="campo-etiqueta">Descripción</span>
          <textarea class="entrada" name="descripcion" rows="3" placeholder="Objetivo, calorías, notas…">${esc(dieta?.descripcion || '')}</textarea>
        </label>
        ${miembros.length > 1 ? `
          <div class="campo">
            <span class="campo-etiqueta">¿Para quién es?</span>
            <div class="grupo-botones" data-x="para">
              ${miembros.map(m => `
                <button type="button" class="chip" data-miembro="${esc(m.id)}" aria-pressed="${para.has(m.id)}">
                  ${htmlAvatarMiembro(m, 'mini')}${esc(m.id === getYo().id ? `${m.nombre} (tú)` : m.nombre)}
                </button>`).join('')}
            </div>
            <span class="campo-ayuda">Si no marcas a nadie, es la dieta de toda la familia.</span>
          </div>` : ''}
        ${!dieta && otras.length ? `
          <label class="campo">
            <span class="campo-etiqueta">Empezar con</span>
            <select class="entrada" name="base">
              <option value="">La semana vacía</option>
              ${otras.map(o => `<option value="${esc(o.id)}">Una copia de «${esc(o.nombre)}»</option>`).join('')}
            </select>
          </label>` : ''}
      </form>
    `,
    pie: `
      <button type="button" class="boton boton-secundario" data-cerrar-hoja>Cancelar</button>
      <button type="submit" form="formDieta" class="boton boton-primario">${dieta ? 'Guardar' : 'Crear'}</button>
    `,
    alAbrir: (d) => {
      const form = d.querySelector('form');
      d.querySelectorAll('[data-miembro]').forEach(chip => chip.addEventListener('click', () => {
        const id = chip.dataset.miembro;
        if (para.has(id)) para.delete(id);
        else para.add(id);
        chip.setAttribute('aria-pressed', para.has(id));
      }));

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const v = valoresFormulario(form);
        if (!v.nombre) {
          form.nombre.focus();
          aviso('Ponle un nombre a la dieta', { tipo: 'error' });
          return;
        }

        if (dieta) {
          guardarDietaModificada(dieta.id, dd => {
            dd.nombre = v.nombre;
            dd.descripcion = v.descripcion;
            dd.para = [...para];
          });
          aviso('Dieta actualizada');
        } else {
          const base = v.base ? getDietaPorId(v.base) : null;
          const nueva = {
            id: generarId('dieta'),
            nombre: v.nombre,
            descripcion: v.descripcion,
            para: [...para],
            fechaCreacion: new Date().toISOString().split('T')[0],
            comidas: base ? clonar(base.comidas || []).map(c => ({ ...c, id: generarId('c') })) : []
          };
          guardarDietaStorage(nueva);
          setPref(claveDietaVista(), nueva.id);
          diaPlan = indiceHoy();
          aviso(`Dieta «${nueva.nombre}» creada`);
        }
        Hoja.cerrar(d);
        if (vistaActual !== 'plan') irAVista('plan');
        else refrescarApp();
      });
    }
  });
}

function menuDieta(dietaId) {
  const dieta = getDietaPorId(dietaId);
  if (!dieta) return;
  const ingredientes = (dieta.comidas || []).flatMap(c => c.ingredientes || []);

  menuAcciones({
    titulo: dieta.nombre,
    acciones: [
      {
        icono: 'editar',
        texto: getMiembros().length > 1 ? 'Nombre, notas y para quién' : 'Nombre y descripción',
        fn: () => abrirFormDieta(dieta.id)
      },
      ingredientes.length && {
        icono: 'cesta_mas',
        texto: 'Añadir la semana a la compra',
        detalle: 'Junta los ingredientes de todos los días',
        fn: () => abrirAnadirACompra({ titulo: dieta.nombre, entradas: ingredientes.map(texto => ({ texto })) })
      },
      { icono: 'duplicar', texto: 'Duplicar dieta', fn: () => duplicarDieta(dieta.id) },
      {
        icono: 'papelera', texto: 'Eliminar dieta', peligro: true,
        fn: async () => {
          const ok = await confirmar({
            titulo: `¿Eliminar «${dieta.nombre}»?`,
            texto: `Se borrarán sus ${plural((dieta.comidas || []).length, 'comida')}. Las recetas no se tocan.`
          });
          if (!ok) return;
          const deshacer = quitarDeColeccion('dietas', dieta.id);
          refrescarApp();
          aviso('Dieta eliminada', { accion: { texto: 'Deshacer', fn: () => { deshacer(); refrescarApp(); } } });
        }
      }
    ]
  });
}

function duplicarDieta(dietaId) {
  const original = getDietaPorId(dietaId);
  if (!original) return;
  const copia = {
    ...clonar(original),
    id: generarId('dieta'),
    nombre: `${original.nombre} (copia)`,
    fechaCreacion: new Date().toISOString().split('T')[0]
  };
  copia.comidas = (copia.comidas || []).map(c => ({ ...c, id: generarId('c') }));
  guardarDietaStorage(copia);
  setPref(claveDietaVista(), copia.id);
  refrescarApp();
  aviso('Dieta duplicada');
}

/* -------------------------------------------------------
   Acciones sobre el día seleccionado
------------------------------------------------------- */
function menuDia() {
  const dieta = dietaVisible();
  if (!dieta) return;
  const dia = DIAS_SEMANA[diaPlan];
  const comidas = comidasDelDia(dieta, dia);

  menuAcciones({
    titulo: dia,
    subtitulo: plural(comidas.length, 'comida'),
    acciones: [
      {
        icono: 'repetir', texto: 'Copiar este día a…',
        fn: () => elegirDias({
          titulo: `Copiar el ${dia.toLowerCase()}`,
          boton: 'Copiar',
          excluir: diaPlan,
          alElegir: (dias) => copiarDia(dieta.id, diaPlan, dias)
        })
      },
      {
        icono: 'cesta_mas', texto: 'Añadir el día a la compra',
        fn: () => abrirAnadirACompra({ titulo: dia, entradas: comidas.flatMap(c => c.ingredientes || []).map(texto => ({ texto })) })
      },
      {
        icono: 'vaciar', texto: 'Vaciar el día', peligro: true,
        fn: () => {
          const antes = clonar(getDietaPorId(dieta.id).comidas || []);
          guardarDietaModificada(dieta.id, d => { d.comidas = d.comidas.filter(c => c.dia !== dia); });
          refrescarApp();
          aviso(`${dia} vaciado`, {
            accion: {
              texto: 'Deshacer',
              fn: () => {
                guardarDietaModificada(dieta.id, d => {
                  const ids = new Set(d.comidas.map(c => c.id));
                  d.comidas = [...d.comidas, ...antes.filter(c => c.dia === dia && !ids.has(c.id))];
                });
                refrescarApp();
              }
            }
          });
        }
      }
    ]
  });
}

function copiarDia(dietaId, origen, destinos) {
  const comidas = comidasDelDia(getDietaPorId(dietaId), DIAS_SEMANA[origen]);
  guardarDietaModificada(dietaId, d => {
    destinos.forEach(i => {
      comidas.forEach(c => d.comidas.push({ ...clonar(c), id: generarId('c'), dia: DIAS_SEMANA[i] }));
    });
  });
  refrescarApp();
  aviso(destinos.length === 1 ? `Copiado al ${DIAS_SEMANA[destinos[0]].toLowerCase()}` : `Copiado a ${destinos.length} días`);
}

/* -------------------------------------------------------
   Acciones registradas
------------------------------------------------------- */
registrarAcciones({
  verDieta: (el) => {
    setPref(claveDietaVista(), el.dataset.id);
    renderizarPlan();
  },
  nuevaDieta: () => abrirFormDieta(),
  menuDieta: (el) => menuDieta(el.dataset.id),
  elegirDia: (el) => {
    diaPlan = Number(el.dataset.dia);
    vibrar(5);
    renderizarPlan();
  },
  verComidaDieta: (el) => abrirDetalleComidaDieta(el.dataset.dieta, el.dataset.comida),
  anadirComidaDia: () => abrirAnadirComidaDia(),
  menuDia: () => menuDia(),
  copiarDeOtroDia: () => {
    const dieta = dietaVisible();
    const destino = diaPlan;
    menuAcciones({
      titulo: `Copiar al ${DIAS_SEMANA[destino].toLowerCase()}`,
      subtitulo: 'Elige de qué día',
      acciones: DIAS_SEMANA.map((dia, i) => {
        const n = comidasDelDia(dieta, dia).length;
        return i !== destino && n > 0 && {
          icono: 'plan', texto: dia, detalle: plural(n, 'comida'),
          fn: () => copiarDia(dieta.id, i, [destino])
        };
      })
    });
  },
  cargarEjemplos: () => {
    cargarEjemplos();
    // El ejemplo va de lunes a viernes: el fin de semana se enseña el lunes
    diaPlan = indiceHoy() < 5 ? indiceHoy() : 0;
    refrescarApp();
    aviso('Ejemplo cargado: una dieta de lunes a viernes, recetas y una lista fija');
  },
  // Con data-col quita solo los de ese apartado; sin él, todos
  quitarEjemplos: (el) => {
    const col = el && el.dataset ? el.dataset.col : '';
    const { total, deshacer } = quitarEjemplos(col ? [col] : undefined);
    refrescarApp();
    if (!total) {
      aviso('No quedan datos de ejemplo. Lo que habéis cambiado ya cuenta como vuestro.');
      return;
    }
    const mensajes = {
      dietas: total === 1 ? 'Dieta de ejemplo quitada' : `${total} dietas de ejemplo quitadas`,
      comidas: total === 1 ? 'Receta de ejemplo quitada' : `${total} recetas de ejemplo quitadas`,
      compra: total === 1 ? 'Producto de ejemplo quitado' : `${total} productos de ejemplo quitados`
    };
    aviso(`${mensajes[col] || 'Datos de ejemplo quitados'}. Lo demás sigue igual.`, {
      accion: { texto: 'Deshacer', fn: () => { deshacer(); refrescarApp(); } }
    });
  }
});
