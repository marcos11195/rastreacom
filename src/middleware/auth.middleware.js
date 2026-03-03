// src/middleware/auth.middleware.js

// Bloquea acceso si NO hay sesión
const isLoggedIn = (req, res, next) => {
  if (req.session.currentUser) {
    next();
  } else {
    res.redirect("/auth/login");
  }
};

// Bloquea acceso si YA hay sesión (evita re-login)
const isLoggedOut = (req, res, next) => {
  if (req.session.currentUser) {
    return res.redirect("/auth/dashboard");
  }
  next();
};

module.exports = {
  isLoggedIn,
  isLoggedOut
};