const puppeteer = require("puppeteer");
const { Producto, RawData } = require("../models/Scrap.model");

async function extraerMetadatosProfundos(page, url) {
    try {
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

            if (precioFinal === "S/P") { 
                const selectoresPrecio = ['span[class*="price"]', 'p[class*="price"]', '.re-16.p-14', '[data-test="product-price"]'];
                for (let selector of selectoresPrecio) {
                    const el = document.querySelector(selector);
                    if (el && el.innerText.includes('€')) {
                        const num = el.innerText.replace(/[^\d.,]/g, '').replace(',', '.');
                        if (num) { precioFinal = `${num} €`; break; }
                    }
                }
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
    const browser = await puppeteer.launch({
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote']
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

        for (const f of fuentes) {
            try {
                await page.goto(f.url, { waitUntil: 'networkidle2', timeout: 45000 });
                const links = await page.evaluate((q) => {
                    const results = [];
                    const words = q.toLowerCase().split(' ');
                    document.querySelectorAll('a').forEach(a => {
                        const text = a.innerText.toLowerCase();
                        if (words.some(w => text.includes(w)) && a.href.length > 40) {
                            results.push({ nombre: a.innerText.trim().split('\n')[0] || "Producto", link: a.href });
                        }
                    });
                    return results.slice(0, 15);
                }, query);

                for (const item of links) {
                    try {
                        let p = await Producto.findOne({ enlace: item.link });
                        
                        if (!p) {
                            p = await Producto.create({
                                enlace: item.link,
                                termino: query,
                                nombre: item.nombre,
                                fuente: f.nombre,
                                precio: "Pendiente..." 
                            });
                        }

                        const data = await extraerMetadatosProfundos(page, item.link);
                        
                        let actualizacion = { 
                            precio: data.precio,
                            ultimaActualizacion: new Date(), // Esto es lo que detecta el front
                            termino: query 
                        };

                        if (p.precio !== "Pendiente...") {
                            const pViejo = parseFloat(p.precio);
                            const pNuevo = parseFloat(data.precio);
                            if (!isNaN(pNuevo) && !isNaN(pViejo) && pNuevo !== pViejo) {
                                actualizacion.precioAnterior = p.precio;
                                actualizacion.tendencia = pNuevo < pViejo ? "bajada" : "subida";
                            }
                        }

                        await Producto.findByIdAndUpdate(p._id, actualizacion);
                        await RawData.findOneAndUpdate(
                            { productoId: p._id }, 
                            { jsonContenido: data.json }, 
                            { upsert: true }
                        );
                        
                    } catch (err) { console.error(err); }
                }
            } catch (err) { console.error(err); }
        }
    } finally {
        if (browser) await browser.close();
    }
}

module.exports = { buscarYVincular };