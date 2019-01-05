const app = require('./app/app');

const port = 3000;

app.listen(port, () => {
  console.log(`We live on ${port}`);
});
