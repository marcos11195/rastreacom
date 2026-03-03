const puppeteer = require("puppeteer");
const { Producto, RawData } = require("../models/Scrap.model");

async function extraerMetadatosProfundos(page, url) {
    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        return await page.evaluate(() => {
            const dataLayer = window.dataLayer || [];
            const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
            let precioFinal = "S/P";
            let rawJsons = [];
            for (const s of scripts) {
                try {
                    const texto = s.innerText;
                    rawJsons.push(texto);
                    const match = texto.match(/"price"\s*:\s*"?([\d.,]+)"?/i);
                    if (match && match[1]) {
                        precioFinal = `${match[1]} €`;
                        break; 
                    }
                } catch(e) {}
            }
            if (precioFinal === "S/P") {
                const ad = dataLayer.find(d => d.productPrice || d.u26);
                if (ad) precioFinal = `${ad.productPrice || ad.u26} €`;
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
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
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
                console.log(`Iniciando búsqueda en: ${f.nombre}`);
                await page.goto(f.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
                const links = await page.evaluate((q) => {
                    const results = [];
                    const words = q.toLowerCase().split(' ');
                    document.querySelectorAll('a').forEach(a => {
                        const text = a.innerText.toLowerCase();
                        if (words.some(w => text.includes(w)) && a.href.length > 40) {
                            results.push({ nombre: a.innerText.trim().split('\n')[0] || "Producto", link: a.href });
                        }
                    });
                    return results.slice(0, 10);
                }, query);

                for (const item of links) {
                    try {
                        // Cambiamos la lógica para evitar el error de ObjectId inexistente
                        // Primero buscamos o creamos el producto de forma limpia
                        let p = await Producto.findOne({ enlace: item.link });
                        
                        if (!p) {
                            p = await Producto.create({
                                enlace: item.link,
                                termino: query,
                                nombre: item.nombre,
                                fuente: f.nombre,
                                precio: "S/P"
                            });
                        }

                        const existeData = await RawData.exists({ productoId: p._id });
                        
                        if (!existeData || p.precio === "S/P" || p.precio === "Error") {
                            const data = await extraerMetadatosProfundos(page, item.link);
                            
                            // Actualizamos usando el modelo directamente para asegurar persistencia
                            await Producto.findByIdAndUpdate(p._id, { precio: data.precio });
                            await RawData.findOneAndUpdate(
                                { productoId: p._id }, 
                                { jsonContenido: data.json }, 
                                { upsert: true }
                            );
                        }
                    } catch (err) { 
                        console.error("Error en item:", err.message);
                        continue; 
                    }
                }
            } catch (err) { console.error("Fallo en fuente:", f.nombre); }
        }
    } finally {
        await browser.close();
        console.log("Navegador cerrado.");
    }
}

module.exports = { buscarYVincular };