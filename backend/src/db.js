const { MongoClient } = require('mongodb');
const { ensureDatabaseSchema } = require('./schema');

const uri = process.env.MONGODB_URI || 'mongodb+srv://ahmedgfathy_db_user:racuGTjJvKQlFB16@cluster0.vmjfkqs.mongodb.net/?appName=Cluster0';
const dbName = process.env.MONGODB_DB || 'pos_system';

let client;
let db;

async function connectToMongo() {
  if (db) return db;

  client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 15000,
  });

  await client.connect();
  db = client.db(dbName);

  await ensureDatabaseSchema(db);

  return db;
}

async function closeMongo() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

module.exports = {
  connectToMongo,
  closeMongo,
};
