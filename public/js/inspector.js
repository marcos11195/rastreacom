let tiendaActual = 'Zalando';
let paginaActual = 1;
const itemsPorPagina = 7; // Configurado a 7 como pediste
let currentRawData = "";

/**
 * Renderiza la lista de productos filtrada por tienda y paginada
 */
function renderizar() {
    // 1. Filtrar por la tienda seleccionada (Zalando / Adidas)
    const filtrados = todosLosProductos.filter(p => p.fuente === tiendaActual);
    
    // 2. Calcular paginación
    const totalPaginas = Math.ceil(filtrados.length / itemsPorPagina) || 1;
    if (paginaActual > totalPaginas) paginaActual = totalPaginas;

    const inicio = (paginaActual - 1) * itemsPorPagina;
    const itemsAMostrar = filtrados.slice(inicio, inicio + itemsPorPagina);

    // 3. Renderizar Lista
    const listDiv = document.getElementById('product-list');
    if (itemsAMostrar.length === 0) {
        listDiv.innerHTML = '<p style="text-align:center; color:#999; margin-top:20px;">Sin datos en esta tienda.</p>';
    } else {
        listDiv.innerHTML = itemsAMostrar.map(p => {
            const displayPrecio = (p.precio && p.precio !== 'S/P' && !p.precio.includes('undefined')) ? p.precio : 'Pendiente...';
            
            // --- LÓGICA DE PINTADO DE TENDENCIA ---
            let tendenciaHTML = '';
            let colorPrecio = '#000'; // Color por defecto

            if (p.tendencia === 'bajada') {
                colorPrecio = '#27ae60'; // Verde
                tendenciaHTML = `
                    <span style="color: ${colorPrecio}; font-weight: bold; margin-left: 5px;">↓</span>
                    <div style="font-size: 0.75em; color: #7f8c8d; text-decoration: line-through;">
                        Antes: ${p.precioAnterior}
                    </div>
                `;
            } else if (p.tendencia === 'subida') {
                colorPrecio = '#e74c3c'; // Rojo
                tendenciaHTML = `
                    <span style="color: ${colorPrecio}; font-weight: bold; margin-left: 5px;">↑</span>
                    <div style="font-size: 0.75em; color: #7f8c8d;">
                        Antes: ${p.precioAnterior}
                    </div>
                `;
            }

            // Usamos la clase 'product-card' para aplicar los nuevos estilos
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

    // 4. Renderizar Botones de Páginas
    renderizarPaginacion(totalPaginas);
}

// Función global para que dashboard.ejs pueda refrescar la lista
window.renderProducts = renderizar;

/**
 * Crea los botones numéricos de la paginación
 */
function renderizarPaginacion(total) {
    const pagDiv = document.getElementById('pagination');
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

/**
 * Cambia entre Zalando y Adidas
 */
function cambiarTienda(tienda) {
    tiendaActual = tienda;
    paginaActual = 1; // Resetear a la primera página al cambiar de pestaña
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b.innerText === tienda);
    });
    renderizar();
}

/**
 * Salta a una página específica
 */
function irPagina(p) {
    paginaActual = p;
    renderizar();
    document.getElementById('product-list').scrollTop = 0;
}

/**
 * Carga el JSON desde la API y lo muestra en el visor
 */
async function cargarData(id, nombre, element) {
    document.querySelectorAll('.product-card').forEach(c => c.classList.remove('active'));
    element.classList.add('active');
    
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

/**
 * Filtra el contenido del JSON visible
 */
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

document.addEventListener("DOMContentLoaded", renderizar);