const dbConfig = require('../../config/db');

const { db } = dbConfig;


async function finishDB() {
  if (dbConfig.finishedFilling !== true) {
    dbConfig.finishedFilling = true;
    console.log('FINISHING');
    await db.none('VACUUM ANALYZE;');
    // await db.none('CLUSTER;');
    // await db.none({
    //   text: 'CREATE INDEX IF NOT EXISTS idx_post_id ON posts(id);',
    // });
    // await db.none({
    //   text: 'CREATE INDEX IF NOT EXISTS idx_post_thread_id ON posts(thread_id)',
    // });
    // await db.none({
    //   text: 'CREATE INDEX IF NOT EXISTS idx_post_cr_id ON posts(created, id, thread_id);',
    // });
    // await db.none({
    //   text: 'CREATE INDEX IF NOT EXISTS idx_post_thread_id_cr_i ON posts(thread_id, id);',
    // });
    // await db.none({
    //   text: 'CREATE INDEX IF NOT EXISTS idx_post_thread_id_p_i ON posts(thread_id, (path[1]), id);',
    // });
  }
}

async function insertForumUsersAtFill() {
  console.log(dbConfig.postsCount, dbConfig.fusersInserted);
  if (dbConfig.postsCount === 1500000 && !dbConfig.fusersInserted) {
    dbConfig.fusersInserted = true;
    console.log('INSERTING FORUM USERS', dbConfig.postsCount);

    // one more batch...
    let usersSql = 'INSERT INTO fusers(forum_slug, username) VALUES ';
    dbConfig.fusers.forEach((key, value) => {
      for (let l = 0; l < value.length; l++) {
        usersSql += `('${key}', '${value[l]}'),`;
      }
    });

    dbConfig.fusers.clear();

    usersSql = usersSql.slice(0, -1);
    usersSql += ' ON CONFLICT DO NOTHING';
    console.log(dbConfig.fusers);
    
    db.none(usersSql).catch(err => console.log(err));
    await finishDB();
  } else if (!dbConfig.fusersInserted) {
    // console.log('FUNC ', !dbConfig.isFill);
    // one more batch...
    let usersSql = 'INSERT INTO fusers(forum_slug, username) VALUES ';
    dbConfig.fusers.forEach((key, value) => {
      for (let l = 0; l < value.length; l++) {
        usersSql += `('${key}', '${value[l]}'),`;
      }
    });

    dbConfig.fusers.clear();

    usersSql = usersSql.slice(0, -1);
    usersSql += ' ON CONFLICT DO NOTHING';
    // console.log(usersSql);
    await db.none(usersSql).catch(err => console.log(err));
  }
}

async function createPost(req, reply) {
  let sql = 'SELECT id AS thread_id, forum FROM threads WHERE ';
  if (isNaN(req.params.slug)) {
    sql += ' slug = $1';
  } else {
    sql += ' id = $1';
  }

  const posts = req.body;
  dbConfig.postsCount += posts.length;

  if (posts.length > 60) {
    dbConfig.isFill = true;
  }

  // console.log(sql, req.params.slug)

  db.one({
    text: sql,
    values: req.params.slug,
  })
    .then((threadForumInfo) => {
      // console.log('threadForumInfo', threadForumInfo)
      if (posts.length === 0) {
        reply.code(201).send([]);
      }
      if (threadForumInfo.length === 0) {
        reply.code(404)
          .send({
            message: `Can't find thread by slug ${req.params.slug}`,
          });
      }

      sql = 'INSERT INTO posts (edited, author, message, thread_id, parent_id, forum_slug) VALUES ';

      const args = [];
      let i = 1;
      // dbConfig.counter.post += posts.length;
      const forumUsers = [];

      for (let j = 0; j < posts.length; j++) {
        if (!forumUsers.includes(posts[j].author)) {
          forumUsers.push(posts[j].author);
        }

        if (posts[j].parent !== undefined) {
          sql += `( FALSE, $${i}, $${i + 1}, (
              SELECT (
                CASE WHEN
                EXISTS (
                  SELECT 1 FROM posts p
                  WHERE p.id=$${i + 3}
                  AND p.thread_id=$${i + 2}
                )
                THEN $${i + 2} ELSE NULL END)
            ), $${i + 3}, $${i + 4}),`;
          i += 5;
          args.push(
            ...[posts[j].author,
              posts[j].message,
              threadForumInfo.thread_id,
              posts[j].parent,
              threadForumInfo.forum],
          );
        } else {
          sql += `( FALSE, $${i}, $${i + 1}, $${i + 2}, NULL, $${i + 3}),`;
          i += 4;
          args.push(
            ...[posts[j].author,
              posts[j].message,
              threadForumInfo.thread_id,
              threadForumInfo.forum],
          );
        }
      }

      sql = sql.slice(0, -1);
      sql += ` RETURNING author, id, created,
        thread_id AS thread, parent_id AS parent, forum_slug AS forum, message`;

      // console.log(sql);

      db.any(({
        text: sql,
        values: args,
      }))
        .then(async (data) => {
          await db.none({
            text: 'UPDATE forums SET posts=forums.posts+$1 WHERE slug=$2',
            values: [posts.length, threadForumInfo.forum],
          });

          dbConfig.fusers.set(forumUsers, threadForumInfo.forum);

          if (dbConfig.isFill === true) {
            if (dbConfig.postsCount >= 1500000) {
              await insertForumUsersAtFill();
              // await finishDB();
            }
          } else if (dbConfig.isFill === false) {
            await insertForumUsersAtFill();
            // console.log(posts.length);
          }

          reply.code(201).send(data);
        })
        .catch((error) => {
          // console.log(error);
          if (error.code === dbConfig.notNullErorr) {
            reply.code(409)
              .send({
                message: 'Parent post was created in another thread',
              });
          } else if (error.code === dbConfig.dataDoesNotExist) {
            reply.code(404)
              .send({
                message: 'User not found',
              });
          } else if (error.code === dbConfig.notNullErorr) {
            reply.code(404).send({
              message: "Can't find user with id #42",
            });
          } else {
            // console.log(error);
            reply.code(500).send(error);
          }
        });
    })
    .catch((err) => {
      // console.log(err);
      if (err.code === 0) {
        reply.code(404)
          .send({
            message: "Can't find user with id #42",
          });
      } else {
        reply.code(500).send(err);
      }
    });
}

async function getPostInfo(req, reply) {
  const id = req.params.slug;
  const related = req.query.related;

  let userRelated;
  let threadRelated;
  let forumRelated;

  if (related !== undefined) {
    userRelated = related.includes('user');
    threadRelated = related.includes('thread');
    forumRelated = related.includes('forum');
  }

  let query;
  if (related === undefined) {
    query = `
      SELECT id, parent_id AS parent, thread_id AS thread,
        message, edited AS "isEdited", created, forum_slug AS forum,
        author FROM posts WHERE id = $1 LIMIT 1
    `;

    db.one({
      text: query,
      values: [id],
    })
      .then((post) => {
        reply.code(200).send({
          post,
        });
      })
      .catch((err) => {
        // console.log(err);
        if (err.code === 0) {
          reply.code(404)
            .send({
              message: `Can't find post with id ${id}`,
            });
        } else {
          reply.code(500).send(err);
        }
      });
  } else {
    let beginQuery = `
      SELECT posts.id AS pid, posts.parent_id AS pparent,
        posts.thread_id AS pthread, posts.message AS pmessage,
        posts.edited AS pisedited, posts.created AS pcreated,
        posts.forum_slug AS pforumslug, posts.author AS pauthor,`;
    let endQuery = ' FROM posts ';
    if (userRelated) {
      beginQuery += `
        U.nickname AS unickname, U.about AS uabout,
        U.fullname AS ufullname, U.email AS uemail,`;
      endQuery += 'LEFT JOIN users U ON U.nickname = posts.author ';
    }
    if (threadRelated) {
      beginQuery += `
        threads.author AS tauthor, threads.created AS tcreated,
        threads.votes AS tvotes, threads.id AS tid,
        threads.title AS ttitle, threads.message AS tmessage,
        threads.slug AS tslug, threads.forum AS tforumslug,`;
      endQuery += 'LEFT JOIN threads ON threads.id = posts.thread_id ';
    }
    if (forumRelated) {
      beginQuery += `
        F.slug AS fslug, F.threads AS fthreads, F.title as ftitle,
        F.posts AS fposts, F."user" AS fuser_nickname,`;
      endQuery += 'LEFT JOIN forums F ON F.slug = posts.forum_slug ';
    }
    endQuery += ' WHERE posts.id = $1 LIMIT 1';
    const sql = beginQuery.slice(0, -1) + endQuery;

    // console.log(sql, id);
    db.one(sql, id)
      .then((bigData) => {
        const response = {};
        response.post = {
          author: bigData.pauthor,
          id: bigData.pid,
          thread: bigData.pthread,
          parent: bigData.pparent,
          forum: bigData.pforumslug,
          message: bigData.pmessage,
          isEdited: bigData.pisEdited,
          created: bigData.pcreated,
        };

        if (forumRelated) {
          response.forum = {
            threads: bigData.fthreads,
            posts: bigData.fposts,
            title: bigData.ftitle,
            user: bigData.fuser_nickname,
            slug: bigData.fslug,
          };
        }

        if (userRelated) {
          response.author = {
            nickname: bigData.unickname,
            about: bigData.uabout,
            fullname: bigData.ufullname,
            email: bigData.uemail,
          };
        }

        if (threadRelated) {
          response.thread = {
            forum: bigData.tforumslug,
            author: bigData.tauthor,
            created: bigData.tcreated,
            votes: bigData.tvotes,
            id: bigData.tid,
            title: bigData.ttitle,
            message: bigData.tmessage,
            slug: bigData.tslug,
          };
        }

        reply.code(200).send(response);
      })
      .catch((err) => {
        // console.log(err);
        if (err.code === 0) {
          reply.code(404)
            .send({
              message: `Can't find thread with id ${id}`,
            });
        } else {
          reply.code(500)
            .send(err);
        }
      });
  }
}

async function updatePost(req, reply) {
  let query;
  const args = [];

  if (req.body.message === undefined) {
    query = `
      SELECT id, author, message, created,
      forum_slug AS forum,
      thread_id AS thread
      FROM posts WHERE id=$1
      `;
    args.push(req.params.id);
  } else {
    query = `
    UPDATE posts SET edited = message <> $1, message = $1
      WHERE id = $2
      RETURNING id, message, author, created, forum_slug AS forum,
        parent_id AS parent, thread_id AS thread, edited AS "isEdited"

    `;
    args.push(req.body.message, req.params.id);
  }

  // console.log(query);

  db.one(query, args)
    .then((data) => {
      if (data.length === 0) {
        reply.code(404)
          .send({
            message: `Can't find post by id ${req.params.id}`,
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
            message: `Can't find post by id ${req.params.id}`,
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
  createPost,
  getPostInfo,
  updatePost,
};
