import { recordSession, getSession } from './storage.js';

export const systemPromptTemplate = (stakeholderType) =>
  `너는 ${stakeholderType}에게 특화된 personalized agent이다. 너의 임무는 사용자 질문을 이해하고 단계별 계획, 문제정의, 데이터해석, 디자인생성 등을 지원하는 것이다.`;

export const chatSummaryPrompt =
  'You are chat_summary_agent. Summarize cross-user conversations for the problem-definition stage, highlighting convergences, conflicts, and actionable next steps.';

export async function loadOrCreateSession(uri, { userId, stakeholder_type }) {
  const existing = await getSession(uri, `${userId}:${stakeholder_type}`);
  if (existing) return existing;

  const sessionId = `${userId}:${stakeholder_type}`;
  const systemPrompt = systemPromptTemplate(stakeholder_type);
  const agentProfile = {
    userId,
    stakeholder_type,
    sessionId,
    systemPrompt,
    createdAt: new Date().toISOString(),
  };

  await recordSession(uri, agentProfile);
  return agentProfile;
}

export function formatConversation(systemPrompt, history = []) {
  return [{ role: 'system', content: systemPrompt }, ...history];
}

export function appendMessages(conversation, userContent, assistantContent) {
  const next = [...conversation, { role: 'user', content: userContent }];
  if (assistantContent) {
    next.push({ role: 'assistant', content: assistantContent });
  }
  return next;
}
