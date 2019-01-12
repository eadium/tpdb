const dbConfig = require('../../config/db');
const Post = require('../models/post');

const db = dbConfig.db;

async function createPost(req, reply) {
  let sql = 'SELECT id AS thread_id, forum AS forum FROM threads WHERE ';
  if (isNaN(req.params.slug)) {
    sql += ' slug = $1';
  } else {
    sql += ' id = $1';
  }

  const posts = req.body;

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

      sql = 'INSERT INTO posts (author, message, thread_id, parent_id, forum_slug) VALUES ';

      const args = [];
      let i = 1;

      for (let j = 0; j < posts.length; j++) {
        if (posts[j].parent !== undefined) {
          sql += `($${i}, $${(i + 1)}, $${(i + 2)},$${(i + 3)} , $${(i + 4)}),`;
          i += 5;
          args.push(
            ...[posts[j].author,
              posts[j].message,
              threadForumInfo.thread_id,
              posts[j].parent,
              threadForumInfo.forum],
          );
        } else {
          sql += `($${i}, $${(i + 1)}, $${(i + 2)}, NULL, $${(i + 3)}),`;
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

      // console.log(sql, args)

      db.any(({
        text: sql,
        values: args,
      }))
        .then((data) => {
          const result = data;
          for (let k = 0; k < result.rowCount; k++) {
            result.rows[k].id = parseInt(result.rows[k].id, 10);
            result.rows[k].thread = parseInt(result.rows[k].thread, 10);
            if (result.rows[k].parent == null) {
              result.rows[k].parent = undefined;
            } else {
              result.rows[k].parent = parseInt(result.rows[k].parent, 10);
            }
          }

          reply.code(201).send(result);
        })
        .catch((error) => {
/*           if (error.code === 'post_user') {
            reply.code(404)
              .send({
                message: "Can't find user with id #42",
              });
          } else if (error.routine === 'exec_stmt_raise') {
            reply.code(409)
              .send({
                message: "Can't find user with id #42",
              });
          } else */ if (error.code === dbConfig.dataDoesNotExist) {
            reply.code(404).send({
              message: "Can't find user with id #42",
            });
          } else {
            console.log(error);
            reply.code(500).send(error);
          }
        });
    })
    .catch((err) => {
      console.log(err);
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

module.exports = {
  createPost,
};
