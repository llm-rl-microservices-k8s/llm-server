import { Injectable } from '@nestjs/common';
import fetch from 'node-fetch';
import { LLMReplySchema, type LLMReply } from './schemas';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_PROMPT = `You are an assistant that converts Vietnamese business requests into a JSON ChangeSet.

Return ONLY JSON, no prose. Shape: {
 "proposal_text": string,
 "changeset": {"model": string, "features": Array<{"key": string, "value": string|number|boolean}>, "impacted_services": string[]},
 "metadata": {"intent": string, "confidence": number, "risk": "low"|"medium"|"high"}
}`;

@Injectable()
export class ChatService {
  private provider = (process.env.LLM_PROVIDER || 'deepseek').toLowerCase();
  private geminiClient: GoogleGenerativeAI;

  constructor() {
    this.geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  }

  async ask(
    message: string,
    tenant?: string,
    role?: string,
    lang: 'vi' | 'en' = 'vi',
  ): Promise<LLMReply> {
    const content =
      this.provider === 'ollama'
        ? await this.callOllama(message, tenant, role, lang)
        : this.provider === 'deepseek'
        ? await this.callDeepSeek(message, tenant, role, lang)
        : await this.callGemini(message, tenant, role, lang);

    // Parse và validate JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = String(content).match(/\{[\s\S]*\}/);
      if (!match) throw new Error('LLM did not return JSON');
      parsed = JSON.parse(match[0]);
    }
    return LLMReplySchema.parse(parsed);
  }

  // -------------------------------
  // DeepSeek (OpenAI-compatible)
  // -------------------------------
  private async callDeepSeek(
    message: string,
    tenant?: string,
    role?: string,
    lang: string = 'vi',
  ): Promise<string> {
    const base = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
    const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    const key = process.env.DEEPSEEK_API_KEY;
    if (!key) throw new Error('Missing DEEPSEEK_API_KEY');

    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `tenant_id=${tenant || 't-unknown'}; role=${
              role || 'guest'
            }; lang=${lang};\n\nYêu cầu: ${message}`,
          },
        ],
      }),
    });

    if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${await res.text()}`);
    const data: any = await res.json();
    return data?.choices?.[0]?.message?.content ?? '{}';
  }

  // -------------------------------
  // Ollama (Local)
  // -------------------------------
  private async callOllama(
    message: string,
    tenant?: string,
    role?: string,
    lang: string = 'vi',
  ): Promise<string> {
    const base = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'llama3.1';

    const res = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `tenant_id=${tenant || 't-unknown'}; role=${
              role || 'guest'
            }; lang=${lang};\n\nYêu cầu: ${message}`,
          },
        ],
      }),
    });

    if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
    const data: any = await res.json();
    return data?.message?.content ?? '{}';
  }

  // -------------------------------
  // Gemini (Google API)
  // -------------------------------
  private async callGemini(
    message: string,
    tenant?: string,
    role?: string,
    lang: string = 'vi',
  ): Promise<string> {
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const model = this.geminiClient.getGenerativeModel({ model: modelName });

    const prompt = `tenant_id=${tenant || 't-unknown'}; role=${
      role || 'guest'
    }; lang=${lang};\n\nYêu cầu: ${message}\n\n${SYSTEM_PROMPT}`;

    const result = await model.generateContent(prompt);

    return result.response.text() || '{}';
  }
}
