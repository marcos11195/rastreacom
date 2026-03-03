const mongoose = require("mongoose");

const productoSchema = new mongoose.Schema({
    termino: String,
    nombre: String,
    enlace: { type: String, unique: true },
    fuente: String,
    precio: String,
    createdAt: { type: Date, default: Date.now }
});

const rawDataSchema = new mongoose.Schema({
    productoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto' },
    jsonContenido: String
});

const Producto = mongoose.model("Producto", productoSchema);
const RawData = mongoose.model("RawData", rawDataSchema);

module.exports = { Producto, RawData };