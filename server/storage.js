import { MongoClient } from 'mongodb';

const DB_NAME = 'ppss';
const COLLECTION_SESSIONS = 'agent_sessions';
const COLLECTION_CONVERSATIONS = 'conversations';
const COLLECTION_STAGE_CONVERSATIONS = 'stage_conversations';
const COLLECTION_STAGE_SUMMARIES = 'stage_summaries';

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

export async function getStageConversationCollection(uri) {
  const db = await getDb(uri);
  return db.collection(COLLECTION_STAGE_CONVERSATIONS);
}

export async function getStageSummaryCollection(uri) {
  const db = await getDb(uri);
  return db.collection(COLLECTION_STAGE_SUMMARIES);
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

export async function recordStageConversation(uri, stage, sessionId, conversation) {
  const collection = await getStageConversationCollection(uri);
  await collection.updateOne({ stage, sessionId }, { $set: { stage, sessionId, conversation } }, { upsert: true });
}

export async function readStageConversation(uri, stage, sessionId) {
  const collection = await getStageConversationCollection(uri);
  const found = await collection.findOne({ stage, sessionId });
  return found?.conversation || [];
}

export async function readAllStageMessages(uri, stage) {
  const collection = await getStageConversationCollection(uri);
  const docs = await collection.find({ stage }).toArray();
  return docs.flatMap((doc) =>
    (doc.conversation || []).map((message) => ({ ...message, sessionId: doc.sessionId }))
  );
}

export async function recordStageSummary(uri, stage, summary) {
  const collection = await getStageSummaryCollection(uri);
  const entry = { stage, summary, createdAt: new Date().toISOString() };
  await collection.insertOne(entry);
  return entry;
}

export async function readLatestStageSummary(uri, stage) {
  const collection = await getStageSummaryCollection(uri);
  const doc = await collection.find({ stage }).sort({ createdAt: -1 }).limit(1).next();
  return doc?.summary || '';
}

export async function getSession(uri, sessionId) {
  const collection = await getSessionCollection(uri);
  return collection.findOne({ sessionId });
}
