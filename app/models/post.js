module.exports = class Post {
  constructor({
    author,
    created,
    forum,
    message,
    isEdited,
    id,
    parent,
    thread,
    path,
  }) {
    this.id = parseInt(id, 10);
    this.author = author;
    this.created = created;
    this.forum = forum;
    this.message = message;
    this.thread = thread;
    this.isEdited = isEdited;
    this.parent = parseInt(parent, 10);
    this.thread = parseInt(thread, 10);
    this.path = path;
  }


  setAuthor(author) {
    this.author = author;
  }

  setForum(forum) {
    this.forum = forum;
  }

  setThread(thread) {
    this.thread = thread;
  }

  getId() {
    return this.id;
  }

  getAuthor() {
    return this.author;
  }

  getCreated() {
    return this.created;
  }

  getForum() {
    return this.forum;
  }

  getMessage() {
    return this.message;
  }

  getThread() {
    return this.thread;
  }

  getParent() {
    return this.parent;
  }

  getIsEdited() {
    return this.isEdited;
  }

  setCreated(created) {
    this.created = created;
  }

  setMessage(message) {
    this.message = message;
  }

  setEdited(edited) {
    this.isEdited = edited;
  }

  toJson() {
    return {
      author: this.author,
      created: this.created,
      forum: this.forum,
      message: this.message,
      is_edited: this.is_edited,
      id: this.id,
      parent: this.parent,
      thread: this.thread,
      path: this.path,
    };
  }
};
