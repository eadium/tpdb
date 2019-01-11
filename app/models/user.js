module.exports = class User {
  constructor({
    about,
    email,
    fullname,
    nickname,
  }) {
    this.about = about;
    this.email = email;
    this.fullname = fullname;
    this.nickname = nickname;
  }

  getNickname() {
    return this.nickname;
  }

  getEmail() {
    return this.email;
  }

  getFullname() {
    return this.fullname;
  }

  getAbout() {
    return this.about;
  }

  toString() {
    return `nickname: ${this.getNickname()}\n
                fullname: ${this.getFullname()}\n`;
  }

  toJson() {
    return {
      about: this.about,
      email: this.email,
      fullname: this.fullname,
      nickname: this.nickname,
    };
  }
};
