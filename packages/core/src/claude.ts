import Anthropic from '@anthropic-ai/sdk';
import { logEvent, maskPII } from './logger';

let anthropicInstance: Anthropic | null = null;

function getAnthropicClient() {
  if (anthropicInstance) return anthropicInstance;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY');
  }

  anthropicInstance = new Anthropic({ apiKey });
  return anthropicInstance;
}

export const anthropic = new Proxy({}, {
  get: (target, prop) => (getAnthropicClient() as any)[prop as string],
}) as Anthropic;

export interface CompleteOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export async function complete(
  userPrompt: string,
  options: CompleteOptions = {}
): Promise<string> {
  const {
    maxTokens = 2048,
    temperature = 0.7,
    systemPrompt = 'You are a helpful assistant.',
  } = options;

  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const content = response.content[0];
    const text = content.type === 'text' ? content.text : '';

    await logEvent('claude_completion', {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model: response.model,
    });

    return text;
  } catch (error) {
    await logEvent('claude_error', {
      error: error instanceof Error ? error.message : String(error),
      prompt: userPrompt.slice(0, 200),
    });
    throw error;
  }
}
