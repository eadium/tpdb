const app = require('./app/app');

const port = 5000;

app.listen(port, '0.0.0.0', () => {
  console.log(`We live on ${port}`);
});
