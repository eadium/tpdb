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

const users = new Map();
const fill = false;
const postsCount = 0;
const fusersInserted = false;
const finishedFilling = false;
const timeToThinFill = false;

module.exports.fusers = users;
module.exports.postsCount = postsCount;
module.exports.isFill = fill;
module.exports.fusersInserted = fusersInserted;
module.exports.timeToThinFill = timeToThinFill;
module.exports.finishedFilling = finishedFilling;

module.exports.dataDoesNotExist = dataDoesNotExist;
module.exports.dataConflict = dataConflict;
module.exports.notNullErorr = notNullErorr;
module.exports.notFound = notFound;
module.exports.db = db;
