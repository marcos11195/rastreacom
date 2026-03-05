const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/User.model");
const { Producto, RawData } = require("../models/Scrap.model");
const { buscarYVincular } = require("../services/scraper");
const router = express.Router();

// Importación de middlewares externos
const { isLoggedIn, isLoggedOut } = require("../middleware/auth.middleware");

// REGISTER
router.get("/register", isLoggedOut, (req, res) => {
  res.render("register");
});

router.post("/register", async (req, res) => {
  try {
    const { nombre, email, password, password2, edad } = req.body;
    if (!nombre || !email || !password || !password2 || !edad) {
      return res.status(400).send({ message: "Todos los campos son obligatorios" });
    }
    if (password !== password2) {
      return res.status(400).send({ message: "Las contraseñas no coinciden" });
    }
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).send({ message: "El correo electrónico ya está registrado" });
    }
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const newUser = new User({
      nombre,
      email,
      password: hashedPassword,
      edad: edad || null
    });
    const savedUser = await newUser.save();
    if (savedUser) {
      res.redirect("/auth/login");
    } else {
      res.status(500).send({ message: "Error al crear el usuario" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error al procesar el registro" });
  }
});

// LOGIN
router.get("/login", isLoggedOut, (req, res) => {
  res.render("login");
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).send({ message: "Email y contraseña son obligatorios" });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).send({ message: "Credenciales inválidas" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).send({ message: "Credenciales inválidas" });
    }
    req.session.currentUser = user;
    res.redirect("/auth/dashboard");
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error al procesar el login" });
  }
});

// DASHBOARD
router.get("/dashboard", isLoggedIn, async (req, res) => {
  try {
    // Ordenamos por ultimaActualizacion para que el Live Search muestre lo más reciente arriba
    const productos = await Producto.find().sort({ ultimaActualizacion: -1 }).lean();
    res.render("dashboard", { productos, currentUser: req.session.currentUser });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error al cargar el dashboard" });
  }
});

// API PRODUCTOS (Optimizado para Live Search)
router.get("/api/productos", isLoggedIn, async (req, res) => {
  try {
    // Importante: El mismo sort que el dashboard para consistencia visual
    const productos = await Producto.find().sort({ ultimaActualizacion: -1 }).lean();
    res.json(productos);
  } catch (error) {
    res.status(500).json([]);
  }
});

// API RAW DATA
router.get("/api/raw/:id", isLoggedIn, async (req, res) => {
  try {
    const data = await RawData.findOne({ productoId: req.params.id }).lean();
    res.json(data || { jsonContenido: "{}" });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener data" });
  }
});

// BUSCAR
router.post("/buscar", isLoggedIn, (req, res) => {
  // Pasamos la query al scraper
  buscarYVincular(req.body.query).catch(err => console.error("Error Scraper:", err));
  res.status(200).send("Scraping iniciado");
});

// BORRAR
router.post("/borrar", isLoggedIn, async (req, res) => {
  try {
    await Producto.deleteMany({});
    await RawData.deleteMany({});
    res.redirect("/auth/dashboard");
  } catch (error) {
    res.status(500).send({ message: "Error al borrar datos" });
  }
});

// LOGOUT
router.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) console.log(err);
    res.redirect("/auth/login");
  });
});

module.exports = router;