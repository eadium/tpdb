const dbConfig = require('../../config/db');

const { db } = dbConfig;

async function createThread(req, reply) {
  const slug = req.body.slug ? req.body.slug : null;
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
    .then(async (data) => {
      // one more batch...
      const usersSql = `
        INSERT INTO fusers(forum_slug, username) VALUES
          ($1, $2) ON CONFLICT DO NOTHING
      `;
      // console.log(usersSql);
      await db.none({
        text: usersSql,
        values: [forum, req.body.author],
      });
      reply.code(201)
        .send(data);
    })
    .catch((err) => {
      // console.log(err);
      if (err.code === dbConfig.dataConflict) {
        db.one({
          text: 'SELECT * FROM threads WHERE slug=$1',
          values: [slug],
        })
          .then((data) => {
            // console.log(data);
            reply.code(409)
              .send(data);
          })
          .catch((error) => {
            // console.log(error);
            reply.code(500).send(error);
          });
      } else if (err.code === dbConfig.notNullErorr) {
        reply.code(404)
          .send(err);
      } else {
        reply.code(500).send(err);
      }
      // console.log(err);
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

  // console.log(`SELECT * FROM threads WHERE forum=$1 ${since} ORDER BY created ${sort} ${limit}`);

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
            // console.log(error);
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
      // console.log(err);
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
    SELECT author, created, forum, id, message, votes, slug, title FROM threads
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
      // console.log(err);
      if (err.code === 0) {
        reply.code(404)
          .send({
            message: `Can't find forum by slug ${req.params.slug}`,
          });
      }
    });
}

async function getPostsByID(req, reply, id) {
  const slugOrId = id;

  const { limit } = req.query;
  const { since } = req.query;
  let { sort } = req.query;
  const { desc } = req.query;

  if (sort === undefined) {
    sort = 'flat';
  }
  let sql;
  let args = [];
  if (sort === 'flat') {
    sql = `SELECT p.id, p.thread_id AS thread, p.created,
    p.message, p.parent_id AS parent, p.author, p.forum_slug AS forum FROM posts p
    LEFT JOIN threads ON p.thread_id = threads.id WHERE threads.id = $1`;
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
      sql += ` AND threads.id = $${i++} ORDER BY p.path || p.id `;
      args.push(since);
      args.push(slugOrId);
    } else {
      sql += ` WHERE threads.id = $${i++} ORDER BY p.path || p.id`;
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

    args = [slugOrId];
    const descSql = desc === 'true' ? 'DESC' : '';
    let sinceSql;
    let limitSql;
    let k = 1;
    if (since !== undefined) {
      sinceSql = `WHERE p2.thread_id = $${k++} AND p2.parent_id IS NULL
                    AND p2.path[1] ${desc === 'true' ? '<' : '>'}
                      (SELECT p3.path[1] from posts p3 where p3.id = $${k++})`;
      args.push(since);
    } else {
      sinceSql = `WHERE p2.parent_id IS NULL AND p2.thread_id = $${k++}`;
    }

    if (limit !== undefined) {
      limitSql = `LIMIT $${k++}`;
      args.push(limit);
    } else {
      limitSql = '';
    }

    sql = `
    SELECT p.id, p.author, p.created, p.edited, p.message, p.thread_id AS thread,
      COALESCE(p.parent_id,0) AS parent, p.forum_slug AS forum
      FROM posts p
      WHERE p.thread_id = $1 and p.path[1] IN (
        SELECT p2.path[1]
        FROM posts p2
        ${sinceSql}
        ORDER BY p2.path ${descSql}
        ${limitSql}
      )
      ORDER BY p.path[1] ${descSql}, p.path;
    `;
  }

  // console.log(sql, args);

  db.any({
    text: sql,
    values: args,
  })
    .then(async (data) => {
      if (data.length === 0) {
        // console.log('data: ', data);

        let query = 'SELECT threads.id FROM threads WHERE ';
        if (isNaN(slugOrId)) {
          query += 'threads.id = $1 LIMIT 1';
        } else {
          query += 'threads.id = $1 LIMIT 1';
        }

        // console.log(query, slugOrId);
        await db.one({
          text: query,
          values: slugOrId,
        })
          .then((threadForumInfo) => {
            // console.log(threadForumInfo);
            if (threadForumInfo.length === 0) {
              reply.code(404)
                .send({
                  message: "Can't find thread with id #42",
                });
            } else {
              reply.code(200)
                .send([]);
            }
          })
          .catch((error) => {
            // console.log(error);
            if (error.code === 0) {
              reply.code(404)
                .send({
                  message: "Can't find thread with id #42",
                });
            } else {
              reply.code(500)
                .send(error);
            }
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
            message: "Can't find thread with id #42",
          });
      } else {
        reply.code(500).send(err);
      }
    });
}

async function getPosts(req, reply) {
  if (isNaN(req.params.slug)) {
    db.one({
      text: 'SELECT id FROM threads WHERE slug=$1',
      values: [req.params.slug],
    })
      .then((data) => {
        // console.log('data', data, req.params.slug);
        getPostsByID(req, reply, data.id);
      })
      .catch((err) => {
        // console.log(err);
        reply.code(404)
          .send({
            message: "Can't find thread with id #42",
          });
      });
  } else {
    getPostsByID(req, reply, req.params.slug);
  }
}

async function updateThread(req, reply) {

  let sql;
  let args = [];
  let i = 1;

  const title = req.body.title;
  const message = req.body.message;

  if (title === undefined && message === undefined) {
    sql = `
      SELECT created, id, title,
        slug, message, author, forum
        FROM threads WHERE
    `;
    if (isNaN(req.params.slug)) {
      sql += 'slug = $1 LIMIT 1';
    } else {
      sql += 'id = $1 LIMIT 1';
    }
    args = [req.params.slug];
  } else {
    sql = 'UPDATE threads SET ';
    if (title !== undefined) {
      sql += `title = $${i++},`;
      args.push(title);
    }

    if (message !== undefined) {
      sql += `message = $${i++},`;
      args.push(message);
    }
    sql = sql.slice(0, -1);
    sql += ' WHERE ';
    if (isNaN(req.params.slug)) {
      sql += `
        slug = $${i++}
        RETURNING created, id, title,
          slug, message,
          author, forum
      `;
    } else {
      sql += `
        id = $${i++}
        RETURNING created, id, title,
          slug, message,
          author, forum
      `;
    }
    args.push(req.params.slug);
  }

  db.one({
    text: sql,
    values: args,
  })
    .then((data) => {
      if (data.length === 0) {
        reply.code(404)
          .send({
            message: `Can't find thread by slug: ${req.params.slug}`,
          });
      } else {
        reply.code(200).send(data);
      }
    })
    .catch((err) => {
      // console.log(err);
      if (err.code === 0) {
        reply.code(404)
          .send({
            message: `Can't find thread by slug: ${req.params.slug}`,
          })
      } else {
        reply.code(500).send(err);
      }
    });
}

module.exports = {
  createThread,
  getThreads,
  getThreadInfo,
  getPosts,
  updateThread,
};
