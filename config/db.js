const promise = require('bluebird');

const options = {
  promiseLib: promise,
};

const pgp = require('pg-promise')(options);

const connectionString = 'postgres://manager:manager@localhost:5432/forum';
const db = pgp(connectionString);

const notNullErorr = '23502';
const dataConflict = '23505';
const dataDoesNotExist = '23503';
const notFound = '42601';

module.exports.dataDoesNotExist = dataDoesNotExist;
module.exports.dataConflict = dataConflict;
module.exports.notNullErorr = notNullErorr;
module.exports.notFound = notFound;
module.exports.db = db;
