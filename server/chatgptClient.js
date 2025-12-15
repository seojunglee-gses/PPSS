import OpenAI from 'openai';

export function createChatClient(apiKey) {
  if (!apiKey) {
    return {
      async send(messages) {
        return {
          content:
            'ChatGPT API key not configured. This placeholder response confirms the personalized agent pipeline is wired.',
        };
      },
    };
  }
  const client = new OpenAI({ apiKey });
  return {
    async send(messages) {
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
      });
      const choice = completion?.choices?.[0]?.message;
      return { content: choice?.content || '' };
    },
  };
}
