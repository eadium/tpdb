const dbConfig = require('../../config/db');

const { db } = dbConfig;

async function createUser(req, reply) {
  const user = {
    nickname: req.params.nickname,
    fullname: req.body.fullname,
    email: req.body.email,
    about: req.body.about,
  };

  db.one({
    text: 'INSERT INTO users (nickname, fullname, email, about) '
    + 'VALUES ($1, $2, $3, $4) RETURNING *',
    // + ' RETURNING (about, email, fullname, nickname);',
    values: [user.nickname, user.fullname, user.email, user.about],
  })
    .then((data) => {
      reply.code(201)
        .send(data);
    })
    .catch((err) => {
      // console.log(err);
      if (err.code === dbConfig.dataConflict) {
        db.any({
          text: 'SELECT * FROM users WHERE nickname=$1 OR email=$2',
          values: [user.nickname, user.email],
        })
          .then((data) => {
            reply.code(409)
              .send(data);
          })
          .catch((error) => {
            // console.log(error);
            reply.code(500)
              .send(error);
          });
      }
    });
}

async function getUserInfo(req, reply) {
  db.one({
    text: 'SELECT about, email, nickname, fullname FROM users WHERE nickname=$1;',
    values: [req.params.nickname],
  })
    .then((data) => {
      if (data.length === 0) {
        reply.code(404)
          .send({
            message: `Can't find user by nickname ${req.params.nickname}`,
          });
      }
      reply.code(200)
        .send(data);
    })
    .catch((err) => {
      // console.log(err);
      if (err.code === 0) {
        reply.code(404)
          .send({
            message: "Can't find user with id #42",
          });
      }
    });
}

async function updateUserInfo(req, reply) {
  let query = 'UPDATE users SET ';
  if (req.body.fullname) {
    query += `fullname = '${req.body.fullname}', `;
  } else {
    query += 'fullname = fullname, ';
  }
  if (req.body.email) {
    query += `email = '${req.body.email}', `;
  } else {
    query += 'email = email, ';
  }
  if (req.body.about) {
    query += `about = '${req.body.about}' `;
  } else {
    query += 'about = about ';
  }
  query += `
    WHERE nickname = '${req.params.nickname}'
    RETURNING *`;

  db.one(query)
    .then((data) => {
      if (data.length === 0) {
        reply.code(404)
          .send({
            message: `Can't find user by nickname ${req.params.nickname}`,
          });
      }
      reply.code(200)
        .send(data);
    })
    .catch((err) => {
      // console.log(err);
      if (err.code === 0) {
        reply.code(404)
          .send({
            message: "Can't find user with id #42",
          });
      } else if (err.code === dbConfig.dataConflict) {
        reply.code(409)
          .send({
            message: "Can't find user with id #42",
          });
      }
    });
}

module.exports = {
  createUser,
  getUserInfo,
  updateUserInfo,
};
