const db = require('../../config/db');

exports.createUser = (data) => {
  const query = 'INSERT INTO users (nickname, fullname, email, about) '
    + `VALUES ('${data.nickname}', '${data.fullname}', '${data.email}', '${data.about}')`
    + ' RETURNING (about, email, fullname, nickname);';

  console.log(query);
  let responseData;
  let status;

  return new Promise(async (resolve, reject) => {
    db.one(query)
      .then((data) => {
        
      })
      .catch((err) => { });
  });
};
