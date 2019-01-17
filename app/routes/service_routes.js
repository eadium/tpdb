const dbConfig = require('../../config/db');

const { db } = dbConfig;

async function ping(req, reply) {
  // await db.none({
  //   text: `
  //     DROP INDEX IF EXISTS
  //       idx_post_id,
  //       idx_post_thread_id,
  //       idx_post_cr_id,
  //       idx_post_thread_id_cr_i,
  //       idx_post_thread_id_p_i CASCADE;
  //   `,
  // });

  reply.code(200).send({});
}

async function status(req, reply) {
  const query = `
    SELECT (
      SELECT COUNT(*) FROM forums) AS forum,
      (SELECT COUNT(*) FROM   users) AS "user",
      (SELECT COUNT(*) FROM threads) AS thread,
      (SELECT COUNT(*) FROM posts) AS post
    `;

  db.one(query)
    .then((data) => {
      data.forum = parseInt(data.forum, 10);
      data.user = parseInt(data.user, 10);
      data.thread = parseInt(data.thread, 10);
      data.post = parseInt(data.post, 10);
      reply.code(200).send(data);
    })
    .catch((err) => {
      console.log(err);
      reply.code(500).send(err);
    });
}

async function clear(req, reply) {
  const query = `
    TRUNCATE TABLE fusers, votes, posts, threads, forums, users;
  `;

  dbConfig.counter = {
    forum: 0,
    thread: 0,
    user: 0,
    post: 0,
  };

  db.none(query)
    .then(() => {
      reply.code(200).send(null);
    })
    .catch((err) => {
      console.log(err);
      reply.code(500).send(err);
    });
}

module.exports = {
  status,
  clear,
  ping,
};
