const dbConfig = require('../../config/db');
const Threads = require('../models/thread');

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

async function getPostsBySlug(req, reply, slug) {
  const slugOrId = slug;

  const limit = req.query.limit;
  const since = req.query.since;
  let sort = req.query.sort;
  const desc = req.query.desc;

  if (sort === undefined) {
    sort = 'flat';
  }
  let sql;
  let args = [];
  if (sort === 'flat') {
    sql = `SELECT p.id, p.thread_id AS thread, p.created,
    p.message, p.parent_id AS parent, p.author, p.forum_slug AS forum FROM posts p
    LEFT JOIN threads ON p.thread_id = threads.id WHERE threads.slug = $1`;
    args = [slugOrId];
    let i = 2;
    if (since !== undefined) {
      if (desc === 'true') {
        sql += `AND p.id < $${i++}`;
      } else {
        sql += `AND p.id > $${i++}`;
      }
      args.push(since);
    }

    if (desc === 'true') {
      sql += ' ORDER BY p.created DESC, p.id DESC ';
    } else {
      sql += ' ORDER BY p.created, p.id  ';
    }

    if (limit !== undefined) {
      sql += ` LIMIT $${i++}`;
      args.push(limit);
    }
  } else if (sort === 'tree') {
    sql = `SELECT p.id, p.thread_id AS thread, p.created,
      p.message, p.parent_id AS parent, p.author, p.forum_slug
      AS forum FROM posts p
      LEFT JOIN threads ON p.thread_id = threads.id
    `;
    args = [];
    let i = 1;
    if (since !== undefined) {
      if (desc === 'true') {
        sql += ` LEFT JOIN posts ON posts.id = $${i++}
          WHERE p.path || p.id < posts.path || posts.id
        `;
      } else {
        sql += ` LEFT JOIN posts ON posts.id = $${i++}
          WHERE p.path || p.id > posts.path || posts.id
        `;
      }
      sql += ` AND threads.slug = $${i++} ORDER BY p.path || p.id `;
      args.push(since);
      args.push(slugOrId);
    } else {
      sql += ` WHERE threads.slug = $${i++} ORDER BY p.path || p.id`;
      args.push(slugOrId);
    }

    if (desc === 'true') {
      sql += ' DESC ';
    }

    if (limit !== undefined) {
      sql += ` LIMIT $${i++}`;
      args.push(limit);
    }
  } else {
    sql = `WITH ranked_posts AS
      (SELECT p.author, p.created, p.forum_slug, p.id, p.message,
        p.parent_id, p.thread_id, p.path || p.id AS path,`;
    if (desc === 'true') {
      sql += ' dense_rank() OVER (ORDER BY COALESCE(path[1], p.id) DESC) AS rank';
    } else {
      sql += ' dense_rank() OVER (ORDER BY COALESCE(path[1], p.id)) AS rank';
    }

    sql += `
     FROM posts p LEFT JOIN threads
      ON p.thread_id = threads.id WHERE threads.slug = $1)
      SELECT p.author, p.created, p.forum_slug AS forum,
          p.id, p.message, p.parent_id AS parent, p.thread_id AS thread
        FROM ranked_posts p `;
    args = [slugOrId];

    let i = 2;
    if (since !== undefined) {
      sql += ` LEFT JOIN ranked_posts posts ON posts.id = $${i++} WHERE `;
      args.push(since);
      if (limit !== undefined) {
        sql += `p.rank <= $${i++} + posts.rank AND `;
        args.push(limit);
      }
      sql += `
        (p.rank > posts.rank OR
          p.rank = posts.rank AND p.path > posts.path)
          ORDER BY p.rank, p.path
      `;
    } else {
      if (limit !== undefined) {
        sql += ` WHERE p.rank <= $${i++}`;
        args.push(limit);
      }
      sql += ' ORDER BY p.rank, p.path';
    }
  }

  console.log(sql, args);

  db.any({
    text: sql,
    values: args,
  })
    .then((res) => {
      const data = res;
      if (data.length === 0) {
        let query = 'SELECT threads.id FROM threads WHERE ';
        if (isNaN(slugOrId)) {
          query += 'threads.slug = $1 LIMIT 1';
        } else {
          query += 'threads.id = $1 LIMIT 1';
        }

        db.any({
          text: query,
          values: slugOrId,
        })
          .then((threadForumInfo) => {
            if (threadForumInfo.length === 0) {
              reply.code(404)
                .send({
                  message: "Can't find user with id #42",
                });
            }
          })
          .catch((error) => {
            console.log(error);
            reply.code(500)
              .send(error);
          });
      }

      for (let i = 0; i < data.rowCount; i++) {
        data.rows[i].id = parseInt(data.rows[i].id, 10);
        data.rows[i].threads = parseInt(data.rows[i].thread, 10);
        if (data.rows[i].parent != null) {
          data.rows[i].parent = parseInt(data.rows[i].parent, 10);
        } else {
          data.rows[i].parent = undefined;
        }
      }
      reply.code(200)
        .send(res);
    })
    .catch((err) => {
      console.log(err);
      reply.code(500).send(err);
    });
}

async function getPosts(req, reply) {

  if (!isNaN(req.params.slug)) {
    db.one({
      text: 'SELECT slug FROM threads WHERE id=$1',
      values: [req.params.slug],
    })
      .then((data) => {
        getPostsBySlug(req, reply, data.slug);
      })
      .catch((err) => {
        console.log(err);
        reply.code(500).send(err);
      });
  } else {
    getPostsBySlug(req, reply, req.params.slug);
  }
}

module.exports = {
  createThread,
  getThreads,
  getThreadInfo,
  getPosts,
};
