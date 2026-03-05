let tiendaActual = 'Zalando';
let paginaActual = 1;
const itemsPorPagina = 7; 
let currentRawData = "";

function renderizar() {
    // Usamos la variable global que actualiza el dashboard
    const productos = window.todosLosProductos || [];
    const filtrados = productos.filter(p => p.fuente === tiendaActual);
    
    const totalPaginas = Math.ceil(filtrados.length / itemsPorPagina) || 1;
    if (paginaActual > totalPaginas) paginaActual = totalPaginas;

    const inicio = (paginaActual - 1) * itemsPorPagina;
    const itemsAMostrar = filtrados.slice(inicio, inicio + itemsPorPagina);

    const listDiv = document.getElementById('product-list');
    if (!listDiv) return;

    if (itemsAMostrar.length === 0) {
        listDiv.innerHTML = '<p style="text-align:center; color:#999; margin-top:20px;">Sin datos en esta tienda.</p>';
    } else {
        listDiv.innerHTML = itemsAMostrar.map(p => {
            const displayPrecio = (p.precio && p.precio !== 'S/P' && !p.precio.includes('undefined')) ? p.precio : 'Pendiente...';
            
            let tendenciaHTML = '';
            let colorPrecio = '#000'; 

            if (p.tendencia === 'bajada') {
                colorPrecio = '#27ae60'; 
                tendenciaHTML = `
                    <span style="color: ${colorPrecio}; font-weight: bold; margin-left: 5px;">↓</span>
                    <div style="font-size: 0.75em; color: #7f8c8d; text-decoration: line-through;">
                        Antes: ${p.precioAnterior}
                    </div>
                `;
            } else if (p.tendencia === 'subida') {
                colorPrecio = '#e74c3c'; 
                tendenciaHTML = `
                    <span style="color: ${colorPrecio}; font-weight: bold; margin-left: 5px;">↑</span>
                    <div style="font-size: 0.75em; color: #7f8c8d;">
                        Antes: ${p.precioAnterior}
                    </div>
                `;
            }

            return `
                <div class="product-card" onclick="cargarData('${p._id}', '${p.nombre.replace(/'/g, "\\'")}', this)">
                    <div class="brand">${p.fuente}</div>
                    <div class="price" style="color: ${colorPrecio}; display: flex; align-items: baseline; flex-wrap: wrap;">
                        ${displayPrecio} ${tendenciaHTML}
                    </div>
                    <div style="font-size: 0.9em; color: #333; margin-bottom: 8px; line-height: 1.2;">${p.nombre}</div>
                    <a href="${p.enlace}" target="_blank" onclick="event.stopPropagation()" class="link-btn">🔗 Abrir enlace</a>
                </div>`;
        }).join('');
    }
    renderizarPaginacion(totalPaginas);
}

function renderizarPaginacion(total) {
    const pagDiv = document.getElementById('pagination');
    if (!pagDiv) return;
    let pagHTML = '';
    if (total > 1) {
        for (let i = 1; i <= total; i++) {
            pagHTML += `
                <button class="page-btn ${i === paginaActual ? 'active' : ''}" 
                        onclick="irPagina(${i})">
                    ${i}
                </button>`;
        }
    }
    pagDiv.innerHTML = pagHTML;
}

function cambiarTienda(tienda) {
    tiendaActual = tienda;
    paginaActual = 1;
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b.innerText === tienda);
    });
    renderizar();
}

function irPagina(p) {
    paginaActual = p;
    renderizar();
    const list = document.getElementById('product-list');
    if (list) list.scrollTop = 0;
}

async function cargarData(id, nombre, element) {
    document.querySelectorAll('.product-card').forEach(c => c.classList.remove('active'));
    if (element) element.classList.add('active');
    
    document.getElementById('ins-titulo').innerText = "Inspeccionando: " + nombre;
    const viewer = document.getElementById('jsonViewer');
    viewer.textContent = "Cargando metadatos desde DB...";

    try {
        const res = await fetch('/auth/api/raw/' + id);
        const data = await res.json();
        currentRawData = data.jsonContenido;
        viewer.textContent = currentRawData; 
        viewer.scrollTop = 0;
    } catch (e) {
        viewer.innerText = "Error al conectar con la API de datos.";
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

// Exportación para dashboard.ejs
window.renderizar = renderizar;
window.cambiarTienda = cambiarTienda;
window.irPagina = irPagina;
window.cargarData = cargarData;
window.filtrarJson = filtrarJson;

document.addEventListener("DOMContentLoaded", renderizar);