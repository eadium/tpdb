const dbConfig = require('../../config/db');

const db = dbConfig.db;

async function createVote(req, reply) {
  let selectQuery = ` SELECT id, created, slug, title, forum,
    author, message, votes FROM threads WHERE `;

  if (isNaN(req.params.slug)) {
    selectQuery += `slug = '${req.params.slug}' LIMIT 1`;
  } else {
    selectQuery += `id = '${req.params.slug}' LIMIT 1`;
  }

  let queryData;
  if (isNaN(req.params.slug)) {
    queryData = {
      text: `INSERT INTO votes (thread_id, user_id, voice)
      VALUES (
        (SELECT id FROM threads WHERE slug=$1), $2, $3
      )
      ON CONFLICT ON CONSTRAINT votes_user_thread_unique
        DO UPDATE SET voice = $3
        WHERE votes.thread_id = (SELECT id FROM threads WHERE slug = $1)
          AND votes.user_id = $2
      `,
      values: [req.params.slug, req.body.nickname, req.body.voice],
    };
  } else {
    queryData = {
      text: `INSERT INTO votes (thread_id, user_id, voice)
              VALUES ($1, $2, $3)
              ON CONFLICT ON CONSTRAINT votes_user_thread_unique
              DO UPDATE SET voice = $3
              WHERE votes.thread_id = $1 AND votes.user_id = $2
      `,
      values: [+req.params.slug, req.body.nickname, req.body.voice],
    };
  }

  // queryData.text += selectQuery;

  // console.log(queryData);

  db.none(queryData)
    .then(() => {
      db.one(selectQuery)
        .then((data) => {
          reply.code(200)
            .send(data);
        })
        .catch((error) => {
          reply.code(500).send(error);
        });
    })
    .catch((err) => {
      // console.log(err);
      reply.code(404).send({
        message: 'Can\'t find user with id #42\n',
      });
    });
}

module.exports = {
  createVote,
};
