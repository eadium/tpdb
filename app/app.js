const app = require('fastify')({
  // logger: {
  //   level: 'error',
  // },
});

app.addContentTypeParser('application/json',
  { parseAs: 'buffer' },
  (req, body, done) => {
    if (body.length > 0) {
      done(null, JSON.parse(body));
    } else {
      done(null, {});
    }
  });

const logger = require('morgan');

// app.use(logger(':response-time ms :url'));

require('./routes/routes')(app);

module.exports = app;
