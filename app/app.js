// const express = require('express');
const app = require('fastify')({
  logger: {
    level: 'error',
  },
});
// const bodyParser = require('body-parser');
const logger = require('morgan');

// const app = express();

// app.use(bodyParser.urlencoded({
//   extended: true,
// }));
// app.use(bodyParser.json());
app.use(logger('dev'));

require('./routes/routes')(app);

module.exports = app;
