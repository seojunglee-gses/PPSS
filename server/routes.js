import express from 'express';
import { appendMessages, formatConversation, loadOrCreateSession } from './agentProfiles.js';
import { readConversation, recordConversation } from './storage.js';
import { createChatClient } from './chatgptClient.js';

export function createRouter({ mongoUri, openaiApiKey }) {
  const router = express.Router();
  const chatClient = createChatClient(openaiApiKey);

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

  return router;
}
