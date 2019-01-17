// const express = require('express');
const users = require('./user_routes');
const forums = require('./forum_routes');
const threads = require('./thread_routes');
const posts = require('./post_routes');
const votes = require('./vote_routes');
const service = require('./service_routes');

// const router = express.Router;

module.exports = (app) => {
  app.get('/api', service.ping);
  app.post('/api/user/:nickname/create', users.createUser);
  app.get('/api/user/:nickname/profile', users.getUserInfo);
  app.post('/api/user/:nickname/profile', users.updateUserInfo);
  app.post('/api/forum/create', forums.createForum);
  app.get('/api/forum/:slug/details', forums.getForumInfo);
  app.post('/api/forum/:slug/create', threads.createThread);
  app.get('/api/forum/:slug/threads', threads.getThreads);
  app.post('/api/thread/:slug/create', posts.createPost);
  app.post('/api/thread/:slug/vote', votes.createVote);
  app.get('/api/thread/:slug/details', threads.getThreadInfo);
  app.get('/api/thread/:slug/posts', threads.getPosts);
  app.post('/api/thread/:slug/details', threads.updateThread);
  app.get('/api/forum/:slug/users', forums.getForumUsers);
  app.get('/api/post/:slug/details', posts.getPostInfo);
  app.get('/api/service/status', service.status);
  app.post('/api/service/clear', service.clear);
  app.post('/api/post/:id/details', posts.updatePost);
};
