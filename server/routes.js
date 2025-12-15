import express from 'express';
import { appendMessages, chatSummaryPrompt, formatConversation, loadOrCreateSession } from './agentProfiles.js';
import {
  readConversation,
  recordConversation,
  readStageConversation,
  recordStageConversation,
  readAllStageMessages,
  readLatestStageSummary,
  recordStageSummary,
  recordAnalysisQuery,
} from './storage.js';
import { createChatClient } from './chatgptClient.js';

export function createRouter({ mongoUri, openaiApiKey }) {
  const router = express.Router();
  const chatClient = createChatClient(openaiApiKey);
  const problemStage = 'problem-definition';

  router.post('/login', async (req, res) => {
    try {
      const { userId, stakeholder_type } = req.body || {};
      if (!userId || !stakeholder_type) {
        return res.status(400).json({ error: 'userId and stakeholder_type are required' });
      }

      const session = await loadOrCreateSession(mongoUri, { userId, stakeholder_type });
      const conversation = await readConversation(mongoUri, session.sessionId);

      return res.json({
        sessionId: session.sessionId,
        systemPrompt: session.systemPrompt,
        agent_profile: session,
        conversation,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to load personalized agent profile' });
    }
  });

  router.get('/chat/:sessionId', async (req, res) => {
    try {
      const conversation = await readConversation(mongoUri, req.params.sessionId);
      res.json({ conversation });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to load conversation history' });
    }
  });

  router.post('/chat', async (req, res) => {
    try {
      const { sessionId, message } = req.body || {};
      if (!sessionId || !message) {
        return res.status(400).json({ error: 'sessionId and message are required' });
      }

      const [userId, stakeholder_type] = sessionId.split(':');
      const session = await loadOrCreateSession(mongoUri, { userId, stakeholder_type });
      const priorConversation = await readConversation(mongoUri, session.sessionId);
      const messages = formatConversation(session.systemPrompt, priorConversation);
      messages.push({ role: 'user', content: message });

      const assistantMessage = await chatClient.send(messages);
      const updatedConversation = appendMessages(priorConversation, message, assistantMessage.content);
      await recordConversation(mongoUri, session.sessionId, updatedConversation);

      res.json({ assistantMessage, conversation: updatedConversation });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Unable to reach the personalized agent pipeline' });
    }
  });

  router.get('/stage/problem-definition/chat', async (req, res) => {
    try {
      const { sessionId } = req.query;
      if (!sessionId) {
        return res.status(400).json({ error: 'sessionId is required' });
      }
      const conversation = await readStageConversation(mongoUri, problemStage, sessionId);
      const summary = await readLatestStageSummary(mongoUri, problemStage);
      res.json({ conversation, summary });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to load problem-definition conversation' });
    }
  });

  router.post('/stage/problem-definition/chat', async (req, res) => {
    try {
      const { sessionId, message } = req.body || {};
      if (!sessionId || !message) {
        return res.status(400).json({ error: 'sessionId and message are required' });
      }

      const [userId, stakeholder_type] = sessionId.split(':');
      const session = await loadOrCreateSession(mongoUri, { userId, stakeholder_type });
      const priorConversation = await readStageConversation(mongoUri, problemStage, session.sessionId);
      const messages = formatConversation(session.systemPrompt, priorConversation);
      messages.push({ role: 'user', content: message });

      const assistantMessage = await chatClient.send(messages);
      const updatedConversation = appendMessages(priorConversation, message, assistantMessage.content);
      await recordStageConversation(mongoUri, problemStage, session.sessionId, updatedConversation);
      const latestSummary = await readLatestStageSummary(mongoUri, problemStage);

      res.json({ assistantMessage, conversation: updatedConversation, summary: latestSummary });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Unable to process the problem-definition chat' });
    }
  });

  router.post('/stage/problem-definition/summary', async (req, res) => {
    try {
      const { sessionId } = req.body || {};
      if (!sessionId) {
        return res.status(400).json({ error: 'sessionId is required' });
      }

      const [userId, stakeholder_type] = sessionId.split(':');
      await loadOrCreateSession(mongoUri, { userId, stakeholder_type });
      const allMessages = await readAllStageMessages(mongoUri, problemStage);

      if (!allMessages.length) {
        return res.status(400).json({ error: 'No problem-definition chats available to summarize yet.' });
      }

      const transcript = allMessages
        .map((entry) => `[${entry.sessionId}] ${entry.role}: ${entry.content}`)
        .join('\n');

      const messages = [
        { role: 'system', content: chatSummaryPrompt },
        {
          role: 'user',
          content: `Summarize the following cross-user problem-definition transcript into concise bullets with convergences, conflicts, and next steps.\n${transcript}`,
        },
      ];

      const assistantMessage = await chatClient.send(messages);
      const summaryRecord = await recordStageSummary(mongoUri, problemStage, assistantMessage.content);

      res.json({ summary: summaryRecord.summary });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Unable to generate the problem-definition summary' });
    }
  });

  router.post('/analysis/query', async (req, res) => {
    try {
      const { sessionId, user_question, context_docs = [] } = req.body || {};
      if (!sessionId || !user_question) {
        return res.status(400).json({ error: 'sessionId and user_question are required' });
      }

      const [userId, stakeholder_type] = sessionId.split(':');
      const session = await loadOrCreateSession(mongoUri, { userId, stakeholder_type });

      const multimodalContext = context_docs.flatMap((doc) => {
        const parts = [
          { type: 'text', text: `${doc.title || 'Untitled'}: ${doc.text || ''}`.trim() },
        ];
        if (doc.image) {
          parts.push({ type: 'image_url', image_url: { url: doc.image } });
        }
        return parts;
      });

      const messages = [
        {
          role: 'system',
          content:
            `${session.systemPrompt} You are in the data analysis stage. Use the provided text and image evidence to answer with succinct bullets, citing the case numbers when relevant.`,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: `User question: ${user_question}` },
            { type: 'text', text: 'Context documents provided below.' },
            ...multimodalContext,
          ],
        },
      ];

      const assistantMessage = await chatClient.send(messages);

      const stored = await recordAnalysisQuery(mongoUri, {
        sessionId,
        user_question,
        context_docs,
        response: assistantMessage.content,
      });

      res.json({
        answer: assistantMessage.content,
        query: stored,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Unable to process the analysis query' });
    }
  });

  return router;
}
