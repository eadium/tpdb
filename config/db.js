const promise = require('bluebird');

const options = {
  promiseLib: promise,
};

const pgp = require('pg-promise')(options);

const connectionString = 'postgres://manager:manager@localhost:5432/forum';
const db = pgp(connectionString);

module.exports = db;
