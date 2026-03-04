const mongoose = require("mongoose");

const ProductoSchema = new mongoose.Schema({
    enlace: { type: String, unique: true },
    termino: String,
    nombre: String,
    fuente: String,
    precio: String,
    // --- NUEVOS CAMPOS ---
    precioAnterior: { type: String, default: null },
    tendencia: { type: String, enum: ['subida', 'bajada', 'igual', null], default: null },
    ultimaActualizacion: { type: Date, default: Date.now }
});

const RawDataSchema = new mongoose.Schema({
    productoId: { type: mongoose.Schema.Types.ObjectId, ref: "Producto" },
    jsonContenido: String
});

const Producto = mongoose.model("Producto", ProductoSchema);
const RawData = mongoose.model("RawData", RawDataSchema);

module.exports = { Producto, RawData };