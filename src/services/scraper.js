const puppeteer = require("puppeteer");
const { Producto, RawData } = require("../models/Scrap.model");

async function extraerMetadatosProfundos(page, url) {
    try {
        // Aumentamos un poco el timeout y usamos networkidle2 para asegurar que los JSON de precios carguen
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 40000 });
        
        return await page.evaluate(() => {
            const dataLayer = window.dataLayer || [];
            const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
            let precioFinal = "S/P";
            let rawJsons = [];
            let preciosEncontrados = [];

            for (const s of scripts) {
                try {
                    const texto = s.innerText;
                    rawJsons.push(texto);
                    const obj = JSON.parse(texto);

                    const buscarPreciosInteligentes = (o) => {
                        if (!o || typeof o !== 'object') return;
                        
                        if (o["@type"] === "Product" || o.offers) {
                            const ofertas = Array.isArray(o.offers) ? o.offers : [o.offers];
                            
                            ofertas.forEach(oferta => {
                                if (oferta) {
                                    const stock = oferta.availability || "";
                                    const valorPrecio = parseFloat(oferta.price || o.price);
                                    
                                    if (valorPrecio && stock.toLowerCase().includes("instock")) {
                                        preciosEncontrados.push(valorPrecio);
                                    }
                                }
                            });
                        }
                        Object.values(o).forEach(v => buscarPreciosInteligentes(v));
                    };

                    buscarPreciosInteligentes(obj);
                } catch(e) {}
            }

            if (preciosEncontrados.length > 0) {
                const minimo = Math.min(...preciosEncontrados.filter(p => !isNaN(p)));
                precioFinal = `${minimo} €`;
            }

            // PLAN B: Selectores visuales
            if (precioFinal === "S/P") { 
                const selectoresPrecio = ['span[class*="price"]', 'p[class*="price"]', '.re-16.p-14', '[data-test="product-price"]'];
                for (let selector of selectoresPrecio) {
                    const el = document.querySelector(selector);
                    if (el && el.innerText.includes('€')) {
                        const num = el.innerText.replace(/[^\d.,]/g, '').replace(',', '.');
                        if (num) {
                            precioFinal = `${num} €`;
                            break;
                        }
                    }
                }
            }

            // PLAN C: DataLayer
            if (precioFinal === "S/P") {
                const ad = dataLayer.find(d => d.productPrice || d.u26 || d.price);
                if (ad) precioFinal = `${ad.productPrice || ad.u26 || ad.price} €`;
            }

            return {
                precio: precioFinal,
                json: JSON.stringify({ scripts: rawJsons, dataLayer: dataLayer }, null, 2)
            };
        });
    } catch (e) { 
        return { precio: "Error", json: JSON.stringify({ error: e.message }) }; 
    }
}

async function buscarYVincular(query) {
    // Configuración optimizada para evitar que el proceso se quede colgado
    const browser = await puppeteer.launch({
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
        headless: "new",
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote'
        ]
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'font', 'media'].includes(req.resourceType())) req.abort();
            else req.continue();
        });

        const fuentes = [
            { nombre: 'Zalando', url: `https://www.zalando.es/catalogo/?q=${encodeURIComponent(query)}` },
            { nombre: 'Adidas', url: `https://www.adidas.es/search?q=${encodeURIComponent(query)}` }
        ];

        console.log(`--- INICIANDO SCRAPING PARA: "${query}" ---`);

        for (const f of fuentes) {
            try {
                console.log(`\n[${f.nombre}] Accediendo a la fuente...`);
                // Cambiado a networkidle2 para Adidas, que tarda más en renderizar los links
                await page.goto(f.url, { waitUntil: 'networkidle2', timeout: 45000 });
                
                const links = await page.evaluate((q) => {
                    const results = [];
                    const words = q.toLowerCase().split(' ');
                    document.querySelectorAll('a').forEach(a => {
                        const text = a.innerText.toLowerCase();
                        // Verificamos que el enlace parezca un producto (longitud > 40 suele filtrar menús)
                        if (words.some(w => text.includes(w)) && a.href.length > 40) {
                            results.push({ 
                                nombre: a.innerText.trim().split('\n')[0] || "Producto", 
                                link: a.href 
                            });
                        }
                    });
                    return results.slice(0, 15);
                }, query);

                console.log(`[${f.nombre}] Se han encontrado ${links.length} enlaces potenciales.`);

                let index = 1;
                for (const item of links) {
                    try {
                        console.log(`   (${index}/${links.length}) Procesando: ${item.nombre.substring(0, 40)}...`);
                        
                        let p = await Producto.findOne({ enlace: item.link });
                        
                        // Si no existe, lo creamos como "Pendiente..." para activar el Live Search en el front
                        if (!p) {
                            p = await Producto.create({
                                enlace: item.link,
                                termino: query,
                                nombre: item.nombre,
                                fuente: f.nombre,
                                precio: "Pendiente..." 
                            });
                        }

                        // Ahora extraemos el precio real
                        const data = await extraerMetadatosProfundos(page, item.link);
                        const nuevoPrecioNum = parseFloat(data.precio);
                        let actualizacion = { 
                            precio: data.precio,
                            ultimaActualizacion: new Date()
                        };

                        const precioViejoNum = parseFloat(p.precio);

                        // Lógica de tendencias
                        if (!isNaN(nuevoPrecioNum) && !isNaN(precioViejoNum) && nuevoPrecioNum !== precioViejoNum) {
                            actualizacion.precioAnterior = p.precio;
                            actualizacion.tendencia = nuevoPrecioNum < precioViejoNum ? "bajada" : "subida";

                            if (actualizacion.tendencia === "bajada") {
                                console.log(`      ✅ [OFERTA] ${p.precio} -> ${data.precio}`);
                            } else {
                                console.log(`      📈 [SUBIDA] ${p.precio} -> ${data.precio}`);
                            }
                        }
                        
                        // Guardamos precio final y quitamos el "Pendiente..."
                        await Producto.findByIdAndUpdate(p._id, actualizacion);

                        // Guardamos RawData
                        await RawData.findOneAndUpdate(
                            { productoId: p._id }, 
                            { jsonContenido: data.json }, 
                            { upsert: true }
                        );
                        
                    } catch (err) { 
                        console.error(`   [!] Error en item ${index}:`, err.message);
                    }
                    index++;
                }
            } catch (err) { 
                console.error(`[!] Error grave en fuente ${f.nombre}:`, err.message); 
            }
        }
        console.log(`\n--- SCRAPING FINALIZADO PARA: "${query}" ---`);
    } finally {
        // El bloque finally garantiza que el navegador se cierre SIEMPRE,
        // evitando errores de "Failed to launch" en la siguiente búsqueda.
        if (browser) {
            await browser.close();
            console.log("Navegador cerrado correctamente.");
        }
    }
}

module.exports = { buscarYVincular };