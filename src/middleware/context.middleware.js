// src/middleware/context.middleware.js

const updateObjectUser = (req, res, next) => {
  // Hace que 'currentUser' esté disponible en cualquier archivo .ejs
  res.locals.currentUser = req.session.currentUser || null;
  next();
};

module.exports = updateObjectUser;