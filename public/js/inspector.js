let tiendaActual = 'Zalando';
let paginaActual = 1;
const itemsPorPagina = 10;
let currentRawData = "";

function renderizar() {
    const filtrados = todosLosProductos.filter(p => p.fuente === tiendaActual);
    const totalPaginas = Math.ceil(filtrados.length / itemsPorPagina) || 1;
    if (paginaActual > totalPaginas) paginaActual = totalPaginas;

    const inicio = (paginaActual - 1) * itemsPorPagina;
    const itemsAMostrar = filtrados.slice(inicio, inicio + itemsPorPagina);

    const listDiv = document.getElementById('product-list');
    if (itemsAMostrar.length === 0) {
        listDiv.innerHTML = '<p style="text-align:center; color:#999; margin-top:20px;">Sin datos.</p>';
    } else {
        listDiv.innerHTML = itemsAMostrar.map(p => {
            const displayPrecio = (p.precio && p.precio !== 'S/P' && !p.precio.includes('undefined')) ? p.precio : 'Pendiente...';
            return `
                <div class="card" onclick="cargarData('${p._id}', '${p.nombre.replace(/'/g, "\\'")}', this)">
                    <div class="price-badge">${displayPrecio}</div>
                    <small style="color:#666; font-weight:bold;">${p.fuente}</small>
                    <div style="font-weight:bold; margin:3px 0; padding-right: 85px; font-size: 0.95em;">${p.nombre}</div>
                    <div style="display:flex; justify-content: space-between; align-items: center; margin-top: 5px;">
                         <a href="${p.enlace}" target="_blank" onclick="event.stopPropagation()" style="font-size:0.75em; color:#0e639c; text-decoration: none; font-weight: 600;">🔗 Abrir</a>
                    </div>
                </div>`;
        }).join('');
    }

    const pagDiv = document.getElementById('pagination');
    let pagHTML = '';
    for (let i = 1; i <= totalPaginas; i++) {
        pagHTML += `<button class="page-btn ${i === paginaActual ? 'active' : ''}" onclick="irPagina(${i})">${i}</button>`;
    }
    pagDiv.innerHTML = totalPaginas > 1 ? pagHTML : '';
}

function cambiarTienda(tienda) {
    tiendaActual = tienda;
    paginaActual = 1;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.innerText === tienda));
    renderizar();
}

function irPagina(p) {
    paginaActual = p;
    renderizar();
    document.getElementById('product-list').scrollTop = 0;
}

async function cargarData(id, nombre, element) {
    document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
    element.classList.add('active');
    document.getElementById('ins-titulo').innerText = "Inspeccionando: " + nombre;
    const viewer = document.getElementById('jsonViewer');
    viewer.textContent = "Cargando JSON...";
    try {
        const res = await fetch('/auth/api/raw/' + id);
        const data = await res.json();
        currentRawData = data.jsonContenido;
        viewer.textContent = currentRawData; 
        viewer.scrollTop = 0;
    } catch (e) {
        viewer.innerText = "Error al cargar los datos.";
    }
}

function filtrarJson() {
    const search = document.getElementById('ins-filter').value.trim();
    const viewer = document.getElementById('jsonViewer');
    if (!search || search.length < 2) {
        viewer.textContent = currentRawData;
        return;
    }
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "gi");
    viewer.innerHTML = currentRawData.replace(regex, (match) => `<span class="highlight">${match}</span>`);
    const firstMatch = viewer.querySelector('.highlight');
    if (firstMatch) firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Inicializar
document.addEventListener("DOMContentLoaded", renderizar);