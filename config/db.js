const promise = require('bluebird');

const options = {
  promiseLib: promise,
};

const pgp = require('pg-promise')(options);

const connectionString = 'postgres://manager:manager@localhost:5432/forum';
const db = pgp(connectionString);

const dataConflict = '23505';
const notNullErorr = '23502';
const notFound = '42601';


module.exports.dataConflict = dataConflict;
module.exports.notNullErorr = notNullErorr;
module.exports.notFound = notFound;
module.exports.db = db;
