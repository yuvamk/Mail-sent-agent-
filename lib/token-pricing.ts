/**
 * Token Pricing Engine - Converts AI token usage to Indian Rupees (INR ₹)
 * Current Exchange Rate: 1 USD = 86.5 INR
 */

const USD_TO_INR = 86.5;

export interface TokenPricing {
  inputCostPerMillionUSD: number;
  outputCostPerMillionUSD: number;
}

const PRICING_MAP: Record<string, TokenPricing> = {
  // Claude Models
  'claude-haiku-4-5-20251001': { inputCostPerMillionUSD: 1.0, outputCostPerMillionUSD: 5.0 },
  'claude-3-5-haiku-20241022': { inputCostPerMillionUSD: 1.0, outputCostPerMillionUSD: 5.0 },
  'claude-3-5-haiku-latest': { inputCostPerMillionUSD: 1.0, outputCostPerMillionUSD: 5.0 },
  'claude-3-haiku-20240307': { inputCostPerMillionUSD: 0.25, outputCostPerMillionUSD: 1.25 },
  'claude-3-5-sonnet-20241022': { inputCostPerMillionUSD: 3.0, outputCostPerMillionUSD: 15.0 },

  // Gemini Models
  'gemini-1.5-flash': { inputCostPerMillionUSD: 0.075, outputCostPerMillionUSD: 0.3 },
  'gemini-1.5-pro': { inputCostPerMillionUSD: 1.25, outputCostPerMillionUSD: 5.0 },

  // Groq AI Models
  'llama-3.3-70b-versatile': { inputCostPerMillionUSD: 0.59, outputCostPerMillionUSD: 0.79 },
  'llama-3.1-8b-instant': { inputCostPerMillionUSD: 0.05, outputCostPerMillionUSD: 0.08 },
  'groq/compound': { inputCostPerMillionUSD: 0.59, outputCostPerMillionUSD: 0.79 },
  'groq/compound-mini': { inputCostPerMillionUSD: 0.05, outputCostPerMillionUSD: 0.08 },
};

export function calculateCostINR(
  modelName: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PRICING_MAP[modelName] || PRICING_MAP['llama-3.3-70b-versatile'];

  const inputCostUSD = (inputTokens / 1_000_000) * pricing.inputCostPerMillionUSD;
  const outputCostUSD = (outputTokens / 1_000_000) * pricing.outputCostPerMillionUSD;

  const totalUSD = inputCostUSD + outputCostUSD;
  const totalINR = totalUSD * USD_TO_INR;

  return Math.round(totalINR * 10000) / 10000;
}
