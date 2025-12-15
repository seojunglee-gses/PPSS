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
      async generateImages(prompt) {
        const safePrompt = encodeURIComponent(prompt || 'design prompt');
        return [
          `https://picsum.photos/seed/${safePrompt}-1/640/360`,
          `https://picsum.photos/seed/${safePrompt}-2/640/360`,
        ];
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
    async generateImages(prompt) {
      const result = await client.images.generate({
        model: 'gpt-image-1',
        prompt,
        size: '1024x1024',
        n: 2,
      });
      const urls = result?.data?.map((entry) => entry.url).filter(Boolean) || [];
      if (urls.length) return urls;
      return [''];
    },
  };
}
