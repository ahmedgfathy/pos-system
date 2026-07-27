const { connectToMongo } = require('./src/db');

connectToMongo()
  .then(async (db) => {
    console.log('connected', !!db);
    await db.admin().ping();
    console.log('ping ok');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
