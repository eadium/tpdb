const dbConfig = require('../../config/db');
const Post = require('../models/post');

const { db } = dbConfig;

async function createPost(req, reply) {
  let sql = 'SELECT id AS thread_id, forum FROM threads WHERE ';
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

async function getPostInfo(req, reply) {
  const id = req.params.slug;
  const related = req.query.related;
  console.log(related);

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
        message, edited, created, forum_slug AS forum,
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
        console.log(err);
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

    console.log(sql, id);
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
        console.log(err);
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

module.exports = {
  createPost,
  getPostInfo,
};
