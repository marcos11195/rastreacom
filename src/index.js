require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo");

// Importación de middlewares externos
// Corregido: Asegúrate de que la ruta coincide con la estructura de carpetas
const updateObjectUser = require("./middleware/context.middleware");
const authRoutes = require("./routes/auth.routes");

const app = express();

// 1. Middlewares de lectura de cuerpo
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Configuración de Sesiones
app.use(
  session({
    secret: process.env.SESSION_SECRET || "clave-secreta-rastreacom",
    resave: false,
    saveUninitialized: false,
    cookie: { 
      maxAge: 1000 * 60 * 60 * 24, 
      secure: false 
    },
    store: (MongoStore.default ? MongoStore.default : MongoStore).create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions"
    })
  })
);

// 3. Middleware de contexto global
app.use(updateObjectUser);

// 4. Estáticos y Vistas
// Unificado: Servimos la carpeta public que está un nivel por encima de /src
app.use(express.static(path.join(__dirname, "..", "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));

// 5. Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Mongo conectado y Sesiones listas"))
  .catch(err => console.error("❌ Error en MongoDB:", err));

// 6. Rutas
app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  if (req.session.currentUser) {
    res.redirect("/auth/dashboard");
  } else {
    res.redirect("/auth/login");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});