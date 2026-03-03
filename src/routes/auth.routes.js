const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/User.model");
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
router.get("/dashboard", isLoggedIn, (req, res) => {
  // Nota: 'currentUser' ya está en res.locals gracias al middleware de contexto
  res.render("dashboard");
});

// LOGOUT
router.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) console.log(err);
    res.redirect("/auth/login");
  });
});

module.exports = router;