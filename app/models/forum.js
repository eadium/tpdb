module.exports = class Forum {
  constructor({
    posts,
    slug,
    threads,
    title,
    user,
  }) {
    this.posts = posts;
    this.slug = slug;
    this.threads = threads;
    this.title = title;
    this.user = user;
  }

  getTitle() {
    return this.title;
  }

  getUser() {
    return this.user;
  }

  getSlug() {
    return this.slug;
  }

  getPosts() {
    return this.posts;
  }

  getThreads() {
    return this.threads;
  }

  toString() {
    return `'${this.posts}', 
            '${this.slug}', 
            '${this.threads}', 
            '${this.title}', 
            '${this.user}'`;
  }

  toJson() {
    return {
      posts: this.posts,
      slug: this.slug,
      threads: this.threads,
      title: this.title,
      user: this.user,
    };
  }
};
