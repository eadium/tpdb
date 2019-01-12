const dbConfig = require('../../config/db');
// const Forum = require('../models/forum');

const db = dbConfig.db;

async function createForum(req, reply) {
  db.one({
    text: `INSERT INTO forums (slug, title, "user") VALUES
    ($1, $2, (SELECT nickname FROM users WHERE nickname=$3)) RETURNING *`,
    values: [req.body.slug, req.body.title, req.body.user],
  })
    .then((data) => {
    //   console.log(data);
      reply.code(201)
        .send(data);
    })
    .catch((err) => {
      console.log(err);
      if (err.code === dbConfig.dataConflict) {
        db.one({
          text: 'SELECT slug, title, "user" FROM forums WHERE slug=$1',
          values: [req.body.slug],
        })
          .then((data) => {
            console.log(data);
            // const existingForum = data.map(tempForum => new Forum(tempForum));
            reply.code(409)
              .send(data);
          });
      } else if (err.code === dbConfig.notNullErorr) {
        reply.code(404)
          .send(err);
      }
      console.log(err);
    });
}

async function getForumInfo(req, reply) {
  db.one({
    text: 'SELECT * FROM forums WHERE slug=$1;',
    values: [req.params.slug],
  })
    .then((data) => {
      if (data.length === 0) {
        reply.code(404)
          .send({
            message: `Can't find forum by slug ${req.params.slug}`,
          });
      }
      reply.code(200)
        .send(data);
    })
    .catch((err) => {
      console.log(err);
      if (err.code === 0) {
        reply.code(404)
          .send({
            message: `Can't find forum by slug ${req.params.slug}`,
          });
      }
    });
}

module.exports = {
  createForum,
  getForumInfo,
};
