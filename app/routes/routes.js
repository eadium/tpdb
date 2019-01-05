// const express = require('express');
const users = require('./user_routes');

// const router = express.Router;

module.exports = (app) => {
  app.get('/users', users.getAllUsers);
  app.post('/user/:nickname/create', users.createUser);
};
