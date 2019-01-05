const express = require('express');
const bodyParser = require('body-parser');
const logger = require('morgan');

const app = express();

require('./routes/routes')(app);

app.use(logger('dev'));
// app.use(bodyParser.urlencoded({
//   extended: true,
// }));
app.use(bodyParser.json());

app.use((err, req, res) => {
  if (res.status === 500) {
    res.json({
      status: 'error',
      message: err,
    });
  }
});

module.exports = app;
