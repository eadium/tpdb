CREATE EXTENSION IF NOT EXISTS CITEXT;

CREATE TABLE IF NOT EXISTS users (
  id       BIGSERIAL    PRIMARY KEY,
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
  created   TIMESTAMPTZ,
  forum     CITEXT        NOT NULL REFERENCES forums(slug),
  message   TEXT        NOT NULL,
  slug      CITEXT      DEFAULT NULL UNIQUE,
  title     TEXT        NOT NULL,
  votes     INT         NOT NULL DEFAULT 0
);

CREATE INDEX idx_threads_slug_created    ON threads(slug, created);


CREATE TABLE IF NOT EXISTS posts (
  id        BIGSERIAL   PRIMARY KEY,
  author    TEXT        NOT NULL,
  created   TIMESTAMPTZ NOT NULL,
  forum     TEXT        NOT NULL,
  is_edited BOOLEAN     DEFAULT FALSE,
  message   TEXT,
  parent    BIGINT,
  --path    BIGINT [] NOT NULL,
  thread_id BIGINT REFERENCES threads(id) NOT NULL
);

CREATE TABLE IF NOT EXISTS votes (
  user_id   BIGINT REFERENCES users(id)   NOT NULL,
  thread_id BIGINT REFERENCES threads(id) NOT NULL,
  voice     INT                           NOT NULL
);