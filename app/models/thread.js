module.exports = class Thread {
  constructor({
    author,
    created,
    forum,
    message,
    slug,
    title,
    votes = 0,
    id = 0,
  }) {
    this.author = author;
    this.created = created;
    this.forum = forum;
    this.message = message;
    if (slug !== forum) {
      this.slug = slug;
    }
    this.title = title;
    this.votes = votes;
    this.id = parseInt(id, 10);
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

  getTitle() {
    return this.title;
  }

  getVotes() {
    return this.votes;
  }

  getSlug() {
    return this.slug;
  }

  toJson() {
    return {
      author: this.author,
      created: this.created,
      forum: this.forum,
      message: this.message,
      slug: this.slug,
      title: this.title,
      votes: this.votes,
      id: this.id,
    };
  }
};
