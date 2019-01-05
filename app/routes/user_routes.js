const db = require('../../config/db');

async function getAllUsers(req, res, next) {
  db.any('select * from users')
    .then((data) => {
      res.status(200)
        .json({
          about: data[0].about,
          email: data[0].email,
          fullname: data[0].fullname,
          nickname: data[0].nickname,
        });
    })
    .catch((err) => { next(err); });
}

async function createUser(req, res, next) {
  console.log(req);
  db.one('INSERT INTO users (nickname, fullname, email, about) values'
  + `values(${req.params.nickname}, ${req.body.fullname}, ${req.body.email}, ${req.body.about} RETURNING (about,email, fullname, nickname)`)
    .then((data) => {
      res.status(200)
        .json({
          data,
        });
    })
    .catch((err) => { next(err); });
}

module.exports = {
  getAllUsers,
  createUser,
};
