CREATE EXTENSION IF NOT EXISTS CITEXT;

CREATE TABLE IF NOT EXISTS users (
  id       SERIAL    PRIMARY KEY,
  about    TEXT,
  email    CITEXT         NOT NULL,
  fullname CITEXT         NOT NULL,
  nickname CITEXT         NOT NULL
);

CREATE UNIQUE INDEX idx_users_nickname ON users(nickname);
CREATE UNIQUE INDEX idx_users_email    ON users(email);

CREATE TABLE IF NOT EXISTS forums (
  id      BIGSERIAL PRIMARY KEY,
  posts   INT    NOT NULL DEFAULT 0,
  slug    CITEXT,
  threads INT       NOT NULL DEFAULT 0,
  title   TEXT      NOT NULL,
  "user"  CITEXT      NOT NULL
);

CREATE UNIQUE INDEX idx_forums_slug    ON forums(slug);

CREATE TABLE IF NOT EXISTS threads (
  id        SERIAL PRIMARY KEY,
  author    CITEXT        NOT NULL REFERENCES users(nickname),
  created   TIMESTAMPTZ DEFAULT now(),
  forum     CITEXT        NOT NULL REFERENCES forums(slug),
  message   TEXT        NOT NULL,
  slug      CITEXT      DEFAULT NULL UNIQUE,
  title     TEXT        NOT NULL,
  votes     INT         NOT NULL DEFAULT 0
);

CREATE INDEX idx_threads_slug_created    ON threads(slug, created);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  path INTEGER[],
  author CITEXT,
  created TIMESTAMPTZ DEFAULT now(),
  edited BOOLEAN,
  message TEXT,
  parent_id INTEGER REFERENCES posts(id),
  forum_slug CITEXT,
  thread_id INTEGER REFERENCES threads NOT NULL
);

CREATE INDEX idx_post_id ON posts(id);
CREATE INDEX idx_post_thread_id ON posts(thread_id);
CREATE INDEX idx_post_cr_id ON posts(created, id, thread_id);
CREATE INDEX idx_post_thread_id_cr_i ON posts(thread_id, id);
CREATE INDEX idx_post_thread_id_p_i ON posts(thread_id, (path[1]), id);

CREATE TABLE IF NOT EXISTS votes (
  user_id   BIGINT REFERENCES users(id)   NOT NULL,
  thread_id BIGINT REFERENCES threads(id) NOT NULL,
  voice     INT                           NOT NULL
);