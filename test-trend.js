const mongoose = require("mongoose");
const { Producto } = require("./src/models/Scrap.model"); 

async function simularBajada() {
    try {
        // --- CONFIGURA ESTO ---
        const USER = "root";          // Tu usuario de Mongo
        const PASS = "root123";       // Tu contraseña de Mongo
        const DB_NAME = "appdb"; // El nombre de tu base de datos
        
        // La URI con auth: mongodb://user:pass@127.0.0.1:27017/db?authSource=admin
        const MONGO_URI = `mongodb://${USER}:${PASS}@127.0.0.1:27017/${DB_NAME}?authSource=admin`; 
        
        console.log("Conectando con autenticación...");
        await mongoose.connect(MONGO_URI);
        console.log("Conectado con éxito.");

        const p = await Producto.findOne().sort({ _id: -1 });

        if (!p) {
            console.log("No se encontró ningún producto.");
            return;
        }

        console.log(`Producto: ${p.nombre}`);
        
        await Producto.findByIdAndUpdate(p._id, {
            precio: "888.88 €",
            precioAnterior: p.precio,
            tendencia: null
        });

        console.log("---");
        console.log("MODIFICACIÓN EXITOSA: Precio cambiado a 888.88 €.");

    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await mongoose.disconnect();
    }
}

simularBajada();