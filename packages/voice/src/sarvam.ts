import { logEvent, fetchWithRetry } from '@realty-engine/core';

const SARVAM_TTS_URL = 'https://api.sarvam.ai/text-to-speech';

export const LANGUAGE_CODE_MAP: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  hinglish: 'hi-IN',
  gu: 'gu-IN',
  mr: 'mr-IN',
  bn: 'bn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  pa: 'pa-IN',
  or: 'od-IN',
};

interface SynthesizeOptions {
  text: string;
  language: string;
  speaker?: 'meera' | 'arvind';
}

export async function synthesizeSpeech({ text, language, speaker = 'meera' }: SynthesizeOptions): Promise<Buffer> {
  const targetLanguageCode = LANGUAGE_CODE_MAP[language] ?? 'hi-IN';

  let res: Response;
  try {
    res = await fetchWithRetry(SARVAM_TTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': process.env.SARVAM_API_KEY ?? '',
      },
      body: JSON.stringify({
        inputs: [text],
        target_language_code: targetLanguageCode,
        speaker,
        model: 'bulbul:v1',
        enable_preprocessing: true,
      }),
    }, { provider: 'sarvam' });
  } catch (err) {
    await logEvent('sarvam_tts_request_failed', {
      error: err instanceof Error ? err.message : String(err),
      language,
    });
    throw new Error(`Sarvam TTS network error: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!res.ok) {
    const errText = await res.text();
    await logEvent('sarvam_tts_api_error', { status: res.status, error: errText, language });
    throw new Error(`Sarvam TTS API error ${res.status}: ${errText}`);
  }

  const data = await res.json() as { audios: string[] };

  if (!data.audios?.[0]) {
    await logEvent('sarvam_tts_empty_response', { language });
    throw new Error('Sarvam TTS returned no audio');
  }

  return Buffer.from(data.audios[0], 'base64');
}
