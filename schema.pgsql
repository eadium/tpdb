SET SYNCHRONOUS_COMMIT = 'off';
-- CREATE EXTENSION IF NOT EXISTS CITEXT;

DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS forums CASCADE;
DROP TABLE IF EXISTS threads CASCADE;
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS fusers CASCADE;

CREATE UNLOGGED TABLE IF NOT EXISTS users (
  nickname CITEXT         NOT NULL PRIMARY KEY,
  email    CITEXT         NOT NULL UNIQUE,
  fullname CITEXT         NOT NULL,
  about    TEXT
);

CREATE UNIQUE INDEX idx_users_nickname ON users(nickname COLLATE "C");
CLUSTER users USING idx_users_nickname;

----------------------------- FORUMS ------------------------------

CREATE UNLOGGED TABLE IF NOT EXISTS forums (
  id      SERIAL,
  slug    CITEXT PRIMARY KEY,
  posts   INT    NOT NULL DEFAULT 0,
  threads INT       NOT NULL DEFAULT 0,
  title   TEXT      NOT NULL,
  "user"  CITEXT      NOT NULL
);

-- CREATE UNIQUE INDEX idx_forums_slug    ON forums(slug);
CLUSTER forums USING idx_forums_slug;

----------------------------- THREADS ------------------------------

CREATE UNLOGGED TABLE IF NOT EXISTS threads (
  id        SERIAL,
  author    CITEXT        NOT NULL REFERENCES users(nickname),
  created   TIMESTAMPTZ DEFAULT now(),
  forum     CITEXT        NOT NULL REFERENCES forums(slug),
  message   TEXT        NOT NULL,
  slug      CITEXT      UNIQUE,
  title     TEXT        NOT NULL,
  votes     INT         NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX idx_thread_id        ON threads(id);
-- CREATE INDEX idx_threads_slug_created    ON threads(slug, created);
CREATE INDEX idx_threads_slug_id         ON threads(slug, id);
CREATE INDEX idx_threads_forum_created   ON threads(forum, created);

CLUSTER threads USING idx_threads_forum_created;

CREATE OR REPLACE FUNCTION threads_forum_counter()
  RETURNS TRIGGER AS '
    BEGIN
      UPDATE forums
        SET threads = threads + 1
          WHERE slug = NEW.forum;
      RETURN NULL;
    END;
' LANGUAGE plpgsql;

CREATE TRIGGER increase_forum_threads
AFTER INSERT ON threads
FOR EACH ROW EXECUTE PROCEDURE threads_forum_counter();

----------------------------- POSTS -------------------------------

CREATE UNLOGGED TABLE posts (
  id SERIAL PRIMARY KEY,
  path INTEGER[],
  author CITEXT NOT NULL REFERENCES users(nickname),
  created TIMESTAMPTZ DEFAULT now(),
  edited BOOLEAN,
  message TEXT,
  parent_id INTEGER,
  forum_slug CITEXT NOT NULL,
  thread_id INTEGER NOT NULL
);

CREATE INDEX idx_post_thid_cr_id ON posts(thread_id, created, id); --flat
CREATE INDEX idx_post_thid_path ON posts(thread_id, path); --tree
CREATE INDEX idx_post_forum ON posts(forum_slug);
CREATE INDEX idx_post_thread_id_id ON posts(thread_id, id, parent_id); --parent tree
CREATE INDEX idx_posts_root_path      ON posts ((path[1]), path);           -- parent_tree
CREATE INDEX idx_post_thread_id_parent_id ON posts(thread_id, parent_id);
-- CREATE INDEX idx_posts_root      ON posts ((path[1]));           -- parent_tree
-- CREATE INDEX idx_posts_main      ON posts (id); -- parent_tree, flat

-- CREATE UNIQUE INDEX idx_post_id ON posts (id);
-- CREATE INDEX idx_post_thread_id ON posts(thread_id); --too heavy
-- CREATE INDEX idx_post_id_thid_crid ON posts(id, thread_id, created);
-- CREATE INDEX idx_post_threadid_path1_path ON posts(thread_id,(path[1]),path); --useless and heavy
-- CREATE INDEX idx_posts_parent    ON posts (parent_id); -- parent_tree, flat
-- CREATE INDEX idx_posts_root_desc      ON posts ((path[1]) DESC, path);           -- parent_tree
-- CREATE INDEX idx_post_path_thread_id_i ON posts(path, thread_id, id);

-- CREATE INDEX idx_post_threadid_path ON posts(thread_id,path);
-- CREATE INDEX idx_post_threadid_parentid_path1_path ON posts(thread_id,parent_id,(path[1]),path);
-- CREATE INDEX idx_post_threadid_parentid_path ON posts(thread_id,parent_id,path);
-- CREATE INDEX idx_post_threadid_id ON posts(thread_id,id);

CLUSTER posts USING idx_post_crid;

CREATE OR REPLACE FUNCTION update_path()
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

CREATE OR REPLACE FUNCTION set_edited()
  RETURNS TRIGGER AS '
    BEGIN
      IF (NEW.message = OLD.message)
        THEN RETURN NULL;
      END IF;
        UPDATE posts SET edited = TRUE
          WHERE id=NEW.id;
        RETURN NULL;
    END;
  ' LANGUAGE plpgsql;

CREATE TRIGGER set_edited
AFTER UPDATE ON posts
FOR EACH ROW EXECUTE PROCEDURE set_edited();

CREATE OR REPLACE FUNCTION check_edited(pid INT, message TEXT)
  RETURNS BOOLEAN AS '
    BEGIN
      IF (
          (SELECT posts.message FROM posts WHERE id=pid) = message
        )
        THEN RETURN FALSE;
      END IF;
        RETURN TRUE;
    END;
  ' LANGUAGE plpgsql;

------------------------------ VOTES ------------------------------

CREATE UNLOGGED TABLE IF NOT EXISTS votes (
  user_id   CITEXT REFERENCES users(nickname)   NOT NULL,
  thread_id INT REFERENCES threads(id) NOT NULL,
  voice     INT                           NOT NULL
);

ALTER TABLE ONLY votes
    ADD CONSTRAINT votes_user_thread_unique UNIQUE (user_id, thread_id);

CLUSTER votes USING votes_user_thread_unique;

CREATE OR REPLACE FUNCTION vote_insert()
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


CREATE OR REPLACE FUNCTION vote_update()
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

----------------------------- FORUM_USERS -----------------------------

CREATE UNLOGGED TABLE fusers (
    forum_slug CITEXT NOT NULL,
    username CITEXT NOT NULL--,
    -- CONSTRAINT userforum_pkey UNIQUE (forum_slug, username)
);

CREATE UNIQUE INDEX idx_fusers_slug ON fusers(forum_slug, username);

CLUSTER fusers USING idx_fusers_slug;