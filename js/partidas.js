/* =========================================================
   MÓDULO DE PARTIDAS COMPARTIDAS — PARTIDAS.JS
   Sin cuentas de usuario • Sin correos • Sin contraseñas
   Permite:
   - Crear una partida con código compartido (ej: CASA24)
   - Unirse a una partida existente mediante enlace o código de 6 letras
   - Sincronización en vivo: cualquier cambio en la compra, comidas o dietas
     se actualiza en los dispositivos de todos los que tengan el código
   - Alternar entre tus distintas partidas con 1 clic
   ========================================================= */

/* -------------------------------------------------------
   Actualizar elementos de interfaz (Sidebar, Topbar, Banner)
------------------------------------------------------- */
function actualizarUIPartidas() {
  const activa = getPartidaActiva();
  const nombre = activa ? activa.nombre : 'Mi Partida';
  const codigo = activa ? activa.codigo : '';

  // 1. Selector en la barra lateral (Sidebar)
  const contenedorSidebar = document.getElementById('sidebarCuentaInfo');
  if (contenedorSidebar) {
    contenedorSidebar.innerHTML = `
      <div class="partida-sidebar-card" onclick="abrirModalGestionPartidas()" title="Cambiar o gestionar partidas">
        <div class="partida-sidebar-icon">
          <i data-lucide="layers"></i>
        </div>
        <div class="partida-sidebar-meta">
          <span class="partida-sidebar-label">${codigo ? `En vivo • ${codigo}` : 'Partida activa'}</span>
          <span class="partida-sidebar-title">${escapeHtml(nombre)}</span>
        </div>
        <i data-lucide="chevrons-up-down" class="partida-sidebar-chevron"></i>
      </div>
    `;
  }

  // 2. Chip en la cabecera móvil (Topbar)
  const contenedorTopbar = document.getElementById('topbarCuentaInfo');
  if (contenedorTopbar) {
    contenedorTopbar.innerHTML = `
      <button class="topbar-chip-partida" onclick="abrirModalGestionPartidas()" title="Partida activa: ${escapeHtml(nombre)}">
        <span class="punto-online"></span>
        <span class="topbar-chip-text">${escapeHtml(nombre)}</span>
        ${codigo ? `<span class="topbar-chip-code">${codigo}</span>` : ''}
      </button>
    `;
  }

  // 3. Banner superior con estado en vivo
  actualizarBannerPartidaActiva();

  lucide.createIcons();
}

function actualizarBannerPartidaActiva() {
  const contenedor = document.getElementById('bannerPartidaActiva');
  if (!contenedor) return;

  const activa = getPartidaActiva();
  if (!activa) {
    contenedor.style.display = 'none';
    return;
  }

  const numDietas = (activa.dietas || []).length;
  const numComidas = (activa.comidas || []).length;
  const numCompra = (activa.compra || []).length;
  const tieneCodigo = !!activa.codigo;

  contenedor.innerHTML = `
    <div class="banner-partida-card">
      <div class="banner-partida-left">
        <div class="badge-partida-live">
          <span class="punto-online"></span>
          ${tieneCodigo ? `En vivo • Código ${activa.codigo}` : 'Espacio local'}
        </div>
        <h2 class="banner-partida-titulo">${escapeHtml(activa.nombre)}</h2>
        <div class="banner-partida-meta">
          <span><i data-lucide="calendar"></i> ${numDietas} ${numDietas === 1 ? 'dieta' : 'dietas'}</span>
          <span><i data-lucide="cooking-pot"></i> ${numComidas} ${numComidas === 1 ? 'comida' : 'comidas'}</span>
          <span><i data-lucide="shopping-cart"></i> ${numCompra} en compra</span>
          ${tieneCodigo ? `<span id="syncIndicator" class="sync-indicator"><i data-lucide="cloud"></i> Compartida en tiempo real</span>` : ''}
        </div>
      </div>
      <div class="banner-partida-actions">
        ${tieneCodigo ? `
          <button class="btn btn-primary btn-sm" onclick="copiarEnlaceCompartidoRapido('${activa.codigo}')">
            <i data-lucide="share-2"></i>
            Invitar / Compartir
          </button>
        ` : `
          <button class="btn btn-outline btn-sm" onclick="convertirPartidaACompartida('${activa.id}')">
            <i data-lucide="radio"></i>
            Hacer compartida
          </button>
        `}
        <button class="btn btn-outline btn-sm" onclick="abrirModalGestionPartidas()">
          <i data-lucide="layers"></i>
          Mis partidas
        </button>
      </div>
    </div>
  `;
  contenedor.style.display = 'block';

  lucide.createIcons();
}

/* -------------------------------------------------------
   Modal: Gestión de Partidas (Listado, cambio, borrado)
------------------------------------------------------- */
function abrirModalGestionPartidas() {
  renderizarListaPartidasModal();
  abrirModal('modalGestionPartidas');
}

function renderizarListaPartidasModal() {
  const contenedor = document.getElementById('modalPartidasLista');
  if (!contenedor) return;

  const partidas = getPartidas();
  const activaId = getPartidaActivaId();

  if (partidas.length === 0) {
    contenedor.innerHTML = `
      <div class="empty-state" style="padding: 20px;">
        <i data-lucide="folder-plus"></i>
        <p>No tienes ninguna partida creada.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  contenedor.innerHTML = partidas.map(p => {
    const esActiva = p.id === activaId;
    const numDietas = (p.dietas || []).length;
    const numComidas = (p.comidas || []).length;
    const numCompra = (p.compra || []).length;
    const tieneCodigo = !!p.codigo;

    return `
      <div class="partida-item-card ${esActiva ? 'activa' : ''}">
        <div class="partida-item-header" onclick="seleccionarPartidaDirecta('${p.id}')">
          <div class="partida-item-title-box">
            <span class="partida-radio-dot"></span>
            <div>
              <strong class="partida-item-name">${escapeHtml(p.nombre)}</strong>
              ${p.descripcion ? `<p class="partida-item-desc">${escapeHtml(p.descripcion)}</p>` : ''}
            </div>
          </div>
          ${tieneCodigo ? `
            <div class="partida-item-codigo-badge" title="Código de sala compartida">
              ${escapeHtml(p.codigo)}
            </div>
          ` : ''}
          ${esActiva ? `<span class="badge-activa-label"><i data-lucide="check"></i> Activa</span>` : ''}
        </div>

        <div class="partida-item-footer">
          <div class="partida-item-meta">
            <span><i data-lucide="calendar"></i> ${numDietas} dietas</span>
            <span><i data-lucide="cooking-pot"></i> ${numComidas} platos</span>
            <span><i data-lucide="shopping-cart"></i> ${numCompra} compra</span>
            ${tieneCodigo ? `<span class="rol-tag en-vivo"><i data-lucide="wifi"></i> En vivo</span>` : ''}
          </div>
          <div class="partida-item-btns">
            ${tieneCodigo ? `
              <button class="btn btn-outline btn-sm" title="Compartir enlace" onclick="copiarEnlaceCompartidoRapido('${p.codigo}')">
                <i data-lucide="share-2"></i>
                Compartir
              </button>
            ` : `
              <button class="btn btn-outline btn-sm" title="Convertir en sala compartida" onclick="convertirPartidaACompartida('${p.id}')">
                <i data-lucide="wifi"></i>
                Hacer compartida
              </button>
            `}
            <button class="btn-icon" title="Duplicar partida" onclick="procesarDuplicarPartida('${p.id}')">
              <i data-lucide="copy"></i>
            </button>
            ${!esActiva ? `
              <button class="btn btn-primary btn-sm" onclick="seleccionarPartidaDirecta('${p.id}')">
                Seleccionar
              </button>
              <button class="btn-icon danger" title="Eliminar partida" onclick="confirmarEliminarPartida('${p.id}', '${escapeHtml(p.nombre)}')">
                <i data-lucide="trash-2"></i>
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

function seleccionarPartidaDirecta(id) {
  setPartidaActivaId(id);
  cerrarModal('modalGestionPartidas');

  // Refrescar vistas
  if (typeof renderizarDietas === 'function') renderizarDietas();
  if (typeof renderizarComidas === 'function') renderizarComidas();
  if (typeof renderizarCompra === 'function') renderizarCompra();
  if (typeof actualizarBannerEjemplos === 'function') actualizarBannerEjemplos();
  actualizarUIPartidas();

  const activa = getPartidaActiva();
  mostrarToast(`Partida cambiada a "${activa.nombre}"`, 'success');
}

/* -------------------------------------------------------
   Crear nueva partida compartida
------------------------------------------------------- */
function abrirModalCrearPartida() {
  document.getElementById('nuevaPartidaNombre').value = '';
  document.getElementById('nuevaPartidaDesc').value = '';
  abrirModal('modalCrearPartida');
}

async function procesarCrearPartida(e) {
  e.preventDefault();
  const nombre = document.getElementById('nuevaPartidaNombre').value.trim();
  const descripcion = document.getElementById('nuevaPartidaDesc').value.trim();

  if (!nombre) {
    mostrarToast('Por favor, indica un nombre para la partida', 'error');
    return;
  }

  const nueva = await crearNuevaPartidaCompartida(nombre, descripcion);
  cerrarModal('modalCrearPartida');
  cerrarModal('modalGestionPartidas');

  if (typeof renderizarDietas === 'function') renderizarDietas();
  if (typeof renderizarComidas === 'function') renderizarComidas();
  if (typeof renderizarCompra === 'function') renderizarCompra();
  if (typeof actualizarBannerEjemplos === 'function') actualizarBannerEjemplos();
  actualizarUIPartidas();

  if (nueva.codigo) {
    mostrarToast(`¡Partida compartida "${nueva.nombre}" creada! Código: ${nueva.codigo}`, 'success');
    abrirModalCompartirPartida(nueva.id);
  } else {
    mostrarToast(`¡Partida "${nueva.nombre}" creada y activa!`, 'success');
  }
}

/* -------------------------------------------------------
   Convertir una partida local existente en partida compartida
------------------------------------------------------- */
async function convertirPartidaACompartida(id) {
  const partidas = getPartidas();
  const p = partidas.find(x => x.id === id);
  if (!p) return;

  try {
    const res = await fetch('/api/sala/crear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: p.nombre,
        descripcion: p.descripcion,
        dietas: p.dietas || [],
        comidas: p.comidas || [],
        compra: p.compra || []
      })
    });

    if (res.ok) {
      const data = await res.json();
      p.codigo = data.codigo;
      p.versionRemota = 1;
      setPartidas(partidas);
      actualizarUIPartidas();
      renderizarListaPartidasModal();
      comprobarPollingPartidaActiva();

      mostrarToast(`¡Partida compartida lista! Código: ${p.codigo}`, 'success');
      abrirModalCompartirPartida(id);
    }
  } catch (err) {
    mostrarToast('No se pudo conectar con el servidor', 'error');
  }
}

/* -------------------------------------------------------
   Duplicar y Eliminar Partidas
------------------------------------------------------- */
function procesarDuplicarPartida(id) {
  const copia = duplicarPartida(id);
  if (copia) {
    renderizarListaPartidasModal();
    actualizarUIPartidas();
    if (typeof renderizarDietas === 'function') renderizarDietas();
    if (typeof renderizarComidas === 'function') renderizarComidas();
    if (typeof renderizarCompra === 'function') renderizarCompra();
    mostrarToast(`Copia creada: "${copia.nombre}"`, 'success');
  }
}

function confirmarEliminarPartida(id, nombre) {
  document.getElementById('confirmarTexto').textContent =
    `¿Seguro que deseas eliminar la partida "${nombre}" de tu lista?`;

  document.getElementById('confirmarBtn').onclick = () => {
    const ok = eliminarPartida(id);
    cerrarModal('modalConfirmar');
    if (ok) {
      renderizarListaPartidasModal();
      actualizarUIPartidas();
      if (typeof renderizarDietas === 'function') renderizarDietas();
      if (typeof renderizarComidas === 'function') renderizarComidas();
      if (typeof renderizarCompra === 'function') renderizarCompra();
      mostrarToast(`Partida "${nombre}" eliminada`, 'info');
    } else {
      mostrarToast('No puedes eliminar la única partida que tienes', 'error');
    }
  };

  abrirModal('modalConfirmar');
}

/* -------------------------------------------------------
   Compartir Partida (Enlace / Código)
------------------------------------------------------- */
function abrirModalCompartirPartida(partidaId) {
  const partidas = getPartidas();
  const p = partidas.find(x => x.id === partidaId) || getPartidaActiva();
  if (!p) return;

  const urlBase = window.location.href.split('#')[0].split('?')[0];
  const urlCompartir = `${urlBase}?partida=${p.codigo}`;

  document.getElementById('compartirPartidaTitulo').textContent = p.nombre;
  document.getElementById('compartirEnlaceInput').value = urlCompartir;
  document.getElementById('compartirCodigoInput').value = p.codigo || '';

  const labelCod = document.getElementById('compartirCodigoLabel');
  if (labelCod) labelCod.textContent = p.codigo || 'LOCAL';

  abrirModal('modalCompartirPartida');
}

function copiarEnlaceGenerado() {
  const input = document.getElementById('compartirEnlaceInput');
  input.select();
  navigator.clipboard.writeText(input.value).then(() => {
    mostrarToast('¡Enlace de partida copiado al portapapeles!', 'success');
  }).catch(() => {
    prompt('Copia este enlace para compartir:', input.value);
  });
}

function copiarCodigoGenerado() {
  const input = document.getElementById('compartirCodigoInput');
  const codigo = input.value;
  if (!codigo) return;
  navigator.clipboard.writeText(codigo).then(() => {
    mostrarToast(`Código ${codigo} copiado al portapapeles`, 'success');
  });
}

function copiarEnlaceCompartidoRapido(codigo) {
  const urlBase = window.location.href.split('#')[0].split('?')[0];
  const url = `${urlBase}?partida=${codigo}`;
  navigator.clipboard.writeText(url).then(() => {
    mostrarToast(`¡Enlace copiado! Quien lo abra editará contigo la misma partida`, 'success');
  }).catch(() => {
    prompt('Copia este enlace para compartir:', url);
  });
}

/* -------------------------------------------------------
   Unirse a una Partida con Código
------------------------------------------------------- */
function abrirModalImportarPartida() {
  document.getElementById('importarCodigoInput').value = '';
  abrirModal('modalImportarPartida');
}

async function procesarImportarPegado(e) {
  e.preventDefault();
  const valor = document.getElementById('importarCodigoInput').value.trim();
  if (!valor) {
    mostrarToast('Por favor, escribe el código de 6 letras o pega el enlace', 'error');
    return;
  }

  // Extraer código si pegó una URL completa
  let codigo = valor;
  if (codigo.includes('partida=')) {
    codigo = codigo.split('partida=')[1].split('&')[0].split('#')[0];
  } else if (codigo.includes('unirse=')) {
    codigo = codigo.split('unirse=')[1].split('&')[0].split('#')[0];
  }
  codigo = codigo.replace(/[^A-Za-z0-9]/g, '').toUpperCase().trim();

  if (!codigo) {
    mostrarToast('Código no válido', 'error');
    return;
  }

  await unirseAPartidaPorCodigo(codigo);
}

async function unirseAPartidaPorCodigo(codigo) {
  try {
    mostrarToast('Conectando a la partida...', 'info');
    const res = await fetch(`/api/sala/${codigo}`);
    if (!res.ok) {
      throw new Error('No se encontró ninguna partida con ese código');
    }

    const data = await res.json();
    const sala = data.sala;

    const partidas = getPartidas();
    // Si ya la tiene en su lista, seleccionarla
    let existente = partidas.find(p => p.codigo === sala.codigo);

    if (existente) {
      existente.nombre = sala.nombre;
      existente.descripcion = sala.descripcion;
      existente.dietas = sala.dietas || [];
      existente.comidas = sala.comidas || [];
      existente.compra = sala.compra || [];
      existente.versionRemota = sala.version;
      setPartidas(partidas);
      setPartidaActivaId(existente.id);
    } else {
      const nueva = {
        id: generarId('partida'),
        codigo: sala.codigo,
        nombre: sala.nombre,
        descripcion: sala.descripcion,
        creadaEn: Date.now(),
        versionRemota: sala.version,
        dietas: sala.dietas || [],
        comidas: sala.comidas || [],
        compra: sala.compra || [],
        ejemplosCargados: false
      };
      partidas.unshift(nueva);
      setPartidas(partidas);
      setPartidaActivaId(nueva.id);
    }

    cerrarModal('modalImportarPartida');
    cerrarModal('modalGestionPartidas');

    if (typeof renderizarDietas === 'function') renderizarDietas();
    if (typeof renderizarComidas === 'function') renderizarComidas();
    if (typeof renderizarCompra === 'function') renderizarCompra();
    actualizarUIPartidas();

    mostrarToast(`¡Te has unido a "${sala.nombre}"! Todo lo que editéis se sincronizará`, 'success');

  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

/* -------------------------------------------------------
   Detección de Partida por Parámetro URL (?partida=CASA24)
------------------------------------------------------- */
async function verificarParametroPartidaURL() {
  const search = window.location.search || '';
  const hash = window.location.hash || '';

  let codigo = '';
  if (search.includes('partida=')) {
    codigo = new URLSearchParams(search).get('partida');
  } else if (search.includes('unirse=')) {
    codigo = new URLSearchParams(search).get('unirse');
  } else if (hash.includes('partida=')) {
    codigo = hash.split('partida=')[1].split('&')[0];
  }

  if (codigo) {
    // Limpiar URL para no volver a ejecutar en futuros F5
    window.history.replaceState({}, document.title, window.location.pathname);
    await unirseAPartidaPorCodigo(codigo.trim().toUpperCase());
  }
}
