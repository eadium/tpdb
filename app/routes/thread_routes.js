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
        INSERT INTO fusers(user_id,forum_slug, username) VALUES
          ((SELECT id FROM users WHERE users.nickname = $2), $1, $2) ON CONFLICT DO NOTHING
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
  const now = new Date();
  // console.log('getPostsByID: ', now.getSeconds(), ':', now.getMilliseconds());

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
    sql = `SELECT id, thread_id AS thread, created,
    message, parent_id AS parent, author, forum_slug AS forum FROM
    (SELECT * FROM posts WHERE thread_id = $1 `;
    args = [slugOrId];
    let i = 2;
    if (since !== undefined) {
      if (desc === 'true') {
        sql += ` AND id < $${i++}`;
      } else {
        sql += ` AND id > $${i++}`;
      }
      args.push(since);
    }
    sql += ' ) p ';
    if (desc === 'true') {
      sql += ' ORDER BY created DESC, id DESC ';
    } else {
      sql += ' ORDER BY created, id  ';
    }

    if (limit !== undefined) {
      sql += ` LIMIT $${i++}`;
      args.push(limit);
    }
  } else if (sort === 'tree') {
    // sql = `SELECT p.id, p.thread_id AS thread, p.created,
    //   p.message, p.parent_id AS parent, p.author, p.forum_slug
    //   AS forum FROM posts p
    //   LEFT JOIN threads ON p.thread_id = threads.id
    // `;

    let sinceSql;
    let descSql;
    let limitSql;
    let i = 2;
    args = [];
    args.push(slugOrId);

    if (since !== undefined) {
      sinceSql = ` AND (path ${desc === 'true' ? '<' : '>'}
        (SELECT path FROM posts WHERE id = $${i++})) `;
      args.push(since);
    } else {
      sinceSql = '';
    }

    if (desc === 'true') {
      descSql = ' DESC ';
    } else {
      descSql = '';
    }

    if (limit !== undefined) {
      limitSql = ` LIMIT $${i++}`;
      args.push(limit);
    } else {
      limitSql = '';
    }

    sql = `
      SELECT id, author, created, message, parent_id AS parent,
        forum_slug AS forum, thread_id AS thread
        FROM posts
        WHERE thread_id = $1 ${sinceSql}
        ORDER BY path ${descSql}
        ${limitSql}
    `;

    //  parent tree
  } else {
    args = [slugOrId];
    const descSql = desc === 'true' ? 'DESC' : '';
    let sinceSql;
    let limitSql;
    let k = 2;
    if (since !== undefined) {
      sinceSql = `
        AND id ${desc === 'true' ? '<' : '>'} (SELECT path[1] FROM posts WHERE id = $${k++})`;
      args.push(since);
    } else {
      sinceSql = '';
    }

    if (limit !== undefined) {
      limitSql = `LIMIT $${k++}`;
      args.push(limit);
    } else {
      limitSql = 'LIMIT 100000';
    }

    sql = `
    SELECT author, created, forum_slug AS forum, id, edited,
      message, parent_id AS parent, thread_id AS thread
      FROM posts
      WHERE path[1] IN (
        SELECT id FROM posts
        WHERE thread_id=$1 AND parent_id IS NULL
        ${sinceSql}
        ORDER BY id ${descSql}
        ${limitSql}
      ) AND thread_id=$1
      ORDER BY path[1] ${descSql}, path;
    `;
  }

  const now1 = new Date();
  // console.log('query made : ', now1.getSeconds(), ':', now1.getMilliseconds());
  // console.log('sort: ', sort);
  // console.log(sql, args);

  db.any({
    text: sql,
    values: args,
  })
    .then(async (data) => {
      if (data.length === 0) {
        // console.log('data: ', data);

        const now2 = new Date();
        // console.log('result is empty : ', now2.getSeconds(), ':', now2.getMilliseconds());

        let query = 'SELECT threads.id FROM threads WHERE ';
        if (isNaN(slugOrId)) {
          query += 'threads.id = $1';
        } else {
          query += 'threads.id = $1';
        }

        // console.log(query, slugOrId);
        await db.one({
          text: query,
          values: slugOrId,
        })
          .then((threadForumInfo) => {

            const now3 = new Date();
            // console.log('got threadForumInfo: ', now3.getSeconds(), ':', now3.getMilliseconds()); 

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

      const now4 = new Date();
      // console.log('reply sent: ', now4.getSeconds(), ':', now4.getMilliseconds());
      // console.log('time taken: ', now4.getTime() - now.getTime(), 'sort: ', sort);

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
  const now = new Date();
  // console.log('get Posts: ', now.getSeconds(), ':', now.getMilliseconds());

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
