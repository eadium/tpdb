const dbConfig = require('../../config/db');
const Thread = require('../models/thread');

const db = dbConfig.db;

async function createThread(req, reply) {
  const slug = req.body.slug ? req.body.slug : null;
  let slugStr;
  if (slug) {
    slugStr = ', slug';
  } else {
    slugStr = '';
  }

  const t = new Thread({
    author: req.body.author,
    created: req.body.created,
    forum: req.body.forum,
    message: req.body.message,
    title: req.body.title,
    slug: req.params.slug,
  });

  db.one({
    text: `INSERT INTO threads (author, created, forum, message, title, slug) VALUES
    ((SELECT nickname FROM users WHERE nickname=$1),
    $2,
    (SELECT slug FROM forums WHERE slug=$3),
    $4, $5, $6) RETURNING author, created, forum, message, title, votes, id ${slugStr}`,
    values: [
      req.body.author,
      req.body.created,
      req.body.forum,
      req.body.message,
      req.body.title,
      slug,
    ],
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
          text: 'SELECT * FROM threads WHERE slug=$1',
          values: [t.slug],
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
      } else {
        reply.code(500).send(err);
      }
      console.log(err);
    });
}

async function getThreads(req, reply) {
  const desc = req.query.desc;
  let sort;
  let limit;
  let since;

  if (desc === 'true') {
    sort = 'DESC';
  } else {
    sort = 'ASC';
  }

  if (req.query.limit) {
    limit = `LIMIT ${req.query.limit}`;
  } else {
    limit = '';
  }

  if (req.query.since) {
    since = `AND created <= '${req.query.since}'`;
  } else {
    since = '';
  }

  console.log(`SELECT * FROM threads WHERE forum=$1 ${since} ORDER BY created ${sort} ${limit}`)

  db.any({
    text: `SELECT * FROM threads WHERE forum=$1 ${since} ORDER BY created ${sort} ${limit};`,
    values: [req.params.slug],
  })
    .then((data) => {
      if (data.length === 0) {
        db.one({
          text: 'SELECT * FROM forums WHERE slug=$1',
          values: [req.params.slug],
        })
          .then(() => {
            reply.code(200).send(data);
          })
          .catch((error) => {
            console.log(error);
            if (error.code === 0) {
              reply.code(404).send({
                message: `Can't find threads by forum ${req.params.slug}`,
              });
            } else { reply.code(500).send(error); }
          });
      } else {
        reply.code(200).send(data);
      }
    })
    .catch((err) => {
      console.log(err);
      if (err.code === dbConfig.notFound) {
        reply.code(404)
          .send({
            message: `Can't find threads by forum ${req.params.slug}`,
          });
      } else {
        reply.code(500).send(err);
      }
    });
}


module.exports = {
  createThread,
  getThreads,
};
