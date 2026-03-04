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

    // 1. Validación: Campos obligatorios
    if (!nombre || !email || !password || !password2 || !edad) {
      return res.status(400).send({ message: "Todos los campos son obligatorios" });
    }

    // 2. Validación: Coincidencia de contraseñas
    if (password !== password2) {
      return res.status(400).send({ message: "Las contraseñas no coinciden" });
    }

    // 3. Validación: Email ya registrado
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).send({ message: "El correo electrónico ya está registrado" });
    }

    // 4. Hashear la contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 5. Crear y guardar el usuario en la base de datos
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

    // --- GUARDAR SESIÓN ---
    req.session.currentUser = user;
    
    // Redirigir al dashboard tras login exitoso
    res.redirect("/auth/dashboard");

  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error al procesar el login" });
  }
});

// DASHBOARD
router.get("/dashboard", isLoggedIn, async (req, res) => {
  try {
    // Obtenemos los productos para pasarlos al inspector del dashboard
    const productos = await Producto.find().sort({ createdAt: -1 });
    // Nota: 'currentUser' ya está en res.locals gracias al middleware de contexto
    res.render("dashboard", { productos });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error al cargar el dashboard" });
  }
});

// API PRODUCTOS (NUEVO: Para actualizar en vivo)
router.get("/api/productos", isLoggedIn, async (req, res) => {
  try {
    const productos = await Producto.find().sort({ createdAt: -1 });
    res.json(productos);
  } catch (error) {
    res.status(500).json([]);
  }
});

// API RAW DATA (Para el inspector JSON)
router.get("/api/raw/:id", isLoggedIn, async (req, res) => {
  try {
    const data = await RawData.findOne({ productoId: req.params.id });
    res.json(data || { jsonContenido: "{}" });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener data" });
  }
});

// BUSCAR (Modificado: No bloqueante para actualización en vivo)
router.post("/buscar", isLoggedIn, (req, res) => {
  // Quitamos el await para que el scraper corra en background
  buscarYVincular(req.body.query).catch(err => console.error("Error Scraper:", err));
  // Respondemos rápido para que el Dashboard inicie el ciclo de refresco
  res.status(200).send("Scraping iniciado");
});

// BORRAR (Limpia la base de datos de productos)
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