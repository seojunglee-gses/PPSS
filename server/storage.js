import { MongoClient } from 'mongodb';

const DB_NAME = 'ppss';
const COLLECTION_SESSIONS = 'agent_sessions';
const COLLECTION_CONVERSATIONS = 'conversations';

let client;

export async function getClient(uri) {
  if (client?.topology?.isConnected()) return client;
  client = new MongoClient(uri, { useUnifiedTopology: true });
  await client.connect();
  return client;
}

export async function getDb(uri) {
  const mongoClient = await getClient(uri);
  return mongoClient.db(DB_NAME);
}

export async function getSessionCollection(uri) {
  const db = await getDb(uri);
  return db.collection(COLLECTION_SESSIONS);
}

export async function getConversationCollection(uri) {
  const db = await getDb(uri);
  return db.collection(COLLECTION_CONVERSATIONS);
}

export async function recordSession(uri, session) {
  const collection = await getSessionCollection(uri);
  await collection.updateOne({ sessionId: session.sessionId }, { $set: session }, { upsert: true });
}

export async function recordConversation(uri, sessionId, conversation) {
  const collection = await getConversationCollection(uri);
  await collection.updateOne({ sessionId }, { $set: { sessionId, conversation } }, { upsert: true });
}

export async function readConversation(uri, sessionId) {
  const collection = await getConversationCollection(uri);
  const found = await collection.findOne({ sessionId });
  return found?.conversation || [];
}

export async function getSession(uri, sessionId) {
  const collection = await getSessionCollection(uri);
  return collection.findOne({ sessionId });
}
