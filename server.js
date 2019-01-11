const app = require('./app/app');

const port = 5000;

app.listen(port, () => {
  console.log(`We live on ${port}`);
});
