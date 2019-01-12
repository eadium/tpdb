const dbConfig = require('../../config/db');
const Thread = require('../models/thread');

const db = dbConfig.db;

async function createThread(req, reply) {
  const slug = req.body.slug ? req.body.slug : req.params.slug;
  const forum = req.body.forum ? req.body.forum : req.params.slug;
  let slugStr;
  if (req.body.slug) {
    slugStr = ', slug';
  } else {
    slugStr = '';
  }

  db.one({
    text: `INSERT INTO threads (author, created, forum, message, title, slug) VALUES
    ((SELECT nickname FROM users WHERE nickname=$1),
    $2, (SELECT slug FROM forums WHERE slug=$3),$4, $5, $6)
    RETURNING author, created, forum, message, title, votes, id ${slugStr}`,
    values: [
      req.body.author,
      req.body.created,
      forum,
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
          values: [slug],
        })
          .then((data) => {
            console.log(data);
            reply.code(409)
              .send(data);
          })
          .catch((error) => {
            console.log(error);
            reply.code(500).send(error);
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
    if (desc === 'true') {
      since = `AND created <= '${req.query.since}'`;
    } else {
      since = `AND created >= '${req.query.since}'`;
    }
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

async function getThreadInfo(req, reply) {
  let sql = `
    SELECT author, created, forum, id, message, slug, title FROM threads
      WHERE 
  `;
  if (isNaN(req.params.slug)) {
    sql += ' slug = $1';
  } else {
    sql += ' id = $1';
  }

  db.one({
    text: sql,
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
  createThread,
  getThreads,
  getThreadInfo,
};
