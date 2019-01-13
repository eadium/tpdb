CREATE EXTENSION IF NOT EXISTS CITEXT;

DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS forums CASCADE;
DROP TABLE IF EXISTS threads CASCADE;
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS posts CASCADE;

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

----------------------------- POSTS ------------------------------

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  path INTEGER[],
  author CITEXT NOT NULL REFERENCES users(nickname),
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

CREATE FUNCTION update_path()
  RETURNS TRIGGER AS '
    BEGIN
    IF NEW.parent_id = NULL THEN
      UPDATE posts
        SET path = array_append(NEW.path, NEW.id)
        WHERE id=NEW.id;
        RETURN NULL;
    END IF;
      UPDATE posts
        SET path = array_append(
            (SELECT path FROM posts WHERE id=NEW.parent_id), NEW.id)
        WHERE id=NEW.id;
        RETURN NULL;
    END;
' LANGUAGE plpgsql;

CREATE TRIGGER on_insert_post_update_path
AFTER INSERT ON posts
FOR EACH ROW EXECUTE PROCEDURE update_path();


------------------------------ VOTES ------------------------------

CREATE TABLE IF NOT EXISTS votes (
  user_id   INT REFERENCES users(id)   NOT NULL,
  thread_id INT REFERENCES threads(id) NOT NULL,
  -- author CITEXT NOT NULL REFERENCES users(nickname),
  -- slug      CITEXT      NOT NULL,
  voice     INT                           NOT NULL
);

ALTER TABLE ONLY votes
    ADD CONSTRAINT votes_user_thread_unique UNIQUE (user_id, thread_id);

CREATE FUNCTION vote_insert()
  RETURNS TRIGGER AS '
    BEGIN
        UPDATE threads
        SET votes = votes + NEW.voice
        WHERE id = NEW.thread_id;
        RETURN NULL;
    END;
' LANGUAGE plpgsql;


CREATE TRIGGER on_vote_insert
AFTER INSERT ON votes
FOR EACH ROW EXECUTE PROCEDURE vote_insert();


CREATE FUNCTION vote_update()
  RETURNS TRIGGER AS '
BEGIN
  IF OLD.voice = NEW.voice
  THEN
    RETURN NULL;
  END IF;
  UPDATE threads
  SET
    votes = votes + CASE WHEN NEW.voice = -1
      THEN -2
                    ELSE 2 END
  WHERE id = NEW.thread_id;
  RETURN NULL;
END;
' LANGUAGE plpgsql;

CREATE TRIGGER on_vote_update
AFTER UPDATE ON votes
FOR EACH ROW EXECUTE PROCEDURE vote_update();
