import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

let geminiRoundRobinPointer = 0;

/**
 * Parses keys from .env.local or .env if process.env is not yet populated
 */
function readEnvFileFallback(): Record<string, string> {
  if (process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEYS) {
    return {};
  }
  const result: Record<string, string> = {};
  const candidates = ['.env.local', '.env'];

  for (const filename of candidates) {
    try {
      const fullPath = path.resolve(/*turbopackIgnore: true*/ process.cwd(), filename);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const idx = trimmed.indexOf('=');
            if (idx > 0) {
              const k = trimmed.slice(0, idx).trim();
              const v = trimmed.slice(idx + 1).trim();
              if (!result[k]) {
                result[k] = v;
              }
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  return result;
}

/**
 * Returns all active Google Gemini keys in priority/pool order.
 * De-duplicates and preserves order.
 */
export function getAvailableGeminiKeys(overrideKey?: string, allowPlatformFallback: boolean = true): string[] {
  const keys: string[] = [];

  if (overrideKey?.trim()) {
    keys.push(overrideKey.trim());
  }

  if (!allowPlatformFallback) {
    return keys;
  }

  const fileEnv = readEnvFileFallback();

  const envKeysString = process.env.GEMINI_API_KEYS || fileEnv.GEMINI_API_KEYS;
  if (envKeysString) {
    envKeysString.split(',').forEach((k) => {
      const trimmed = k.trim();
      if (trimmed && !keys.includes(trimmed)) {
        keys.push(trimmed);
      }
    });
  }

  const individualKeys = [
    process.env.GEMINI_API_KEY || fileEnv.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_1 || fileEnv.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2 || fileEnv.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3 || fileEnv.GEMINI_API_KEY_3,
  ];

  for (const k of individualKeys) {
    if (k?.trim() && !keys.includes(k.trim())) {
      keys.push(k.trim());
    }
  }

  return keys;
}

/**
 * Executes a Gemini operation with:
 * 1. Multi-key round-robin load distribution
 * 2. Automatic key rotation on 429 (quota exhausted) or 503 (demand spikes)
 * 3. Transparent fallback between gemini-flash-latest -> gemini-2.5-flash -> gemini-1.5-flash
 */
export async function executeWithGeminiRotation<T>(
  callback: (model: any, apiKey: string, modelName: string) => Promise<T>,
  preferredModel: string = 'gemini-flash-latest',
  overrideKey?: string,
  allowPlatformFallback: boolean = true
): Promise<{ result: T; modelUsed: string; keyIndex: number }> {
  const keys = getAvailableGeminiKeys(overrideKey, allowPlatformFallback);
  if (keys.length === 0) {
    throw new Error(
      allowPlatformFallback
        ? 'No Google Gemini API keys configured.'
        : 'Your account requires you to provide your own Google Gemini API key. Please add it in Settings.'
    );
  }

  const modelCandidates = [
    preferredModel,
    'gemini-flash-latest',
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-pro-latest',
  ];
  const models = Array.from(new Set(modelCandidates));

  const startIndex = geminiRoundRobinPointer % keys.length;
  geminiRoundRobinPointer = (geminiRoundRobinPointer + 1) % keys.length;

  let lastError: any = null;

  // Try each key in the pool sequentially if one gets exhausted
  for (let attempt = 0; attempt < keys.length; attempt++) {
    const keyIndex = (startIndex + attempt) % keys.length;
    const currentKey = keys[keyIndex];
    const genAI = new GoogleGenerativeAI(currentKey);

    for (const modelName of models) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await callback(model, currentKey, modelName);
        return { result, modelUsed: modelName, keyIndex };
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || '';
        const status = err?.status;

        const isQuotaExhausted =
          status === 429 ||
          msg.includes('429') ||
          msg.includes('Quota exceeded') ||
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('rate limit');

        const isServerBusy =
          status === 503 || msg.includes('503') || msg.includes('high demand');

        if (isQuotaExhausted || isServerBusy) {
          console.warn(
            `⚠️ Gemini Key #${keyIndex + 1} (${currentKey.slice(0, 12)}...) hit ${status || 'rate limit'}. Rotating to next key in pool (${attempt + 1}/${keys.length})...`
          );
          // Break to next key in pool
          break;
        }

        if (status === 404 || msg.includes('not found')) {
          // Try next model on same key
          continue;
        }

        // Other error on current model, try next key
        break;
      }
    }
  }

  throw lastError || new Error('All Google Gemini API keys in the pool were exhausted or failed.');
}
