const dbConfig = require('../../config/db');
// const Forum = require('../models/forum');

const { db } = dbConfig;

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
            // console.log(data);
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

async function getForumUsers(req, reply) {
  const { desc } = req.query;
  const { limit } = req.query;
  const { since } = req.query;
  const { slug } = req.params;

  let query = `
    SELECT U.nickname, U.about, U.fullname, U.email
      FROM fusers F
      LEFT JOIN users U ON F.username = U.nickname
      WHERE F.forum_slug = $1
    `;
  const args = [slug];
  let i = 2;
  if (since !== undefined) {
    if (desc === 'true') {
      query += ` AND U.nickname < $${i++} COLLATE "C" `;
    } else {
      query += ` AND U.nickname > $${i++} COLLATE "C" `;
    }
    args.push(since);
  }
  if (desc === 'true') {
    query += ' ORDER BY U.nickname COLLATE "C" DESC ';
  } else {
    query += ' ORDER BY U.nickname COLLATE "C" ASC ';
  }
  if (limit !== undefined) {
    query += ` LIMIT $${i++}`;
    args.push(limit);
  }

  // console.log(query, args);

  db.any({
    text: query,
    values: args,
  })
    .then((data) => {
      if (data.length === 0) {

        db.one({
          text: 'SELECT id FROM forums WHERE slug = $1 LIMIT 1',
          values: [slug],
        })
          .then((forumInfo) => {
            if (forumInfo.length !== 0) {
              reply.code(200).send([]);
            } else {
              reply.code(500)
                .send({
                  message: 'Everything is empty',
                  forumInfo,
                });
            }
          })
          .catch((error) => {
            if (error.code === 0) {
              reply.code(404)
                .send({
                  message: `Can't find forum by slug ${slug}`,
                });
            } else {
              reply.code(500).send(error);
            }
          });
      } else {
        reply.code(200).send(data);
      }
    })
    .catch((err) => {
      if (err.code === 0) {
        reply.code(404)
          .send({
            message: `Can't find forum by slug ${slug}`,
          });
      } else {
        reply.code(500).send(err);
      }
    });
}

module.exports = {
  createForum,
  getForumInfo,
  getForumUsers,
};
