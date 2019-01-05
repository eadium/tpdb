const express = require('express');

const router = express.Router();
const db = require('./routes');


router.get('/api/puppies', db.getAllPuppies);


module.exports = router;
