// AI-search (AEO) visibility: ask each configured LLM for the best <category> in <city>,
// then detect whether the business is named and where. Only providers with a key run.
import type { AeoResult } from "./types.js";
import { nameMatches, fetchJson } from "./util.js";

function detect(answer: string, name: string): { mentioned: boolean; position: number | null } {
  const lines = answer.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    if (nameMatches(name, lines[i])) return { mentioned: true, position: i + 1 <= 10 ? i + 1 : null };
  }
  if (nameMatches(name, answer)) return { mentioned: true, position: null };
  return { mentioned: false, position: null };
}

function prompt(categoryLabel: string, city: string): string {
  return `A customer is looking for the best ${categoryLabel.toLowerCase()} in ${city || "their area"}. ` +
    `List the top 5 businesses you would recommend, one per line, name first. Be specific and name real businesses.`;
}

async function askOpenAI(p: string, key: string): Promise<string> {
  const d = await fetchJson("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: p }], temperature: 0.3 }),
  });
  return d.choices?.[0]?.message?.content || "";
}
async function askAnthropic(p: string, key: string): Promise<string> {
  const d = await fetchJson("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-3-5-haiku-latest", max_tokens: 400, messages: [{ role: "user", content: p }] }),
  });
  return (d.content || []).map((c: any) => c.text || "").join("\n");
}
async function askPerplexity(p: string, key: string): Promise<string> {
  const d = await fetchJson("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "sonar", messages: [{ role: "user", content: p }] }),
  });
  return d.choices?.[0]?.message?.content || "";
}
async function askGemini(p: string, key: string): Promise<string> {
  const d = await fetchJson(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: p }] }] }) }
  );
  return (d.candidates?.[0]?.content?.parts || []).map((x: any) => x.text || "").join("\n");
}

export interface LlmKeys { openai: string; anthropic: string; perplexity: string; gemini: string; }

export async function aeoChecks(
  name: string, categoryLabel: string, city: string, keys: LlmKeys
): Promise<{ aeo: AeoResult[]; aeoScore: number; warnings: string[] }> {
  const p = prompt(categoryLabel, city);
  const providers: [string, string, (p: string, k: string) => Promise<string>][] = [
    ["Google AI Overviews", keys.gemini, askGemini], // Gemini approximates Google's AI answers
    ["ChatGPT", keys.openai, askOpenAI],
    ["Gemini", keys.gemini, askGemini],
    ["Perplexity", keys.perplexity, askPerplexity],
    ["Claude", keys.anthropic, askAnthropic],
  ].filter(([, k]) => !!k) as any;

  const warnings: string[] = [];
  if (providers.length === 0) {
    warnings.push("No LLM API key configured — AI-search (AEO) scored as unavailable. Add OPENAI_API_KEY etc. to enable.");
    return { aeo: [], aeoScore: 0, warnings };
  }

  const aeo: AeoResult[] = [];
  for (const [engine, key, fn] of providers) {
    try {
      const answer = await fn(p, key);
      const { mentioned, position } = detect(answer, name);
      aeo.push({
        engine, mentioned, position,
        note: mentioned
          ? position ? `Named #${position} when asked for a ${categoryLabel.toLowerCase()}.` : "Named, but below competitors cited first."
          : `Not surfaced — the AI recommends competitors for "${categoryLabel.toLowerCase()} in ${city || "the area"}".`,
      });
    } catch (e: any) {
      warnings.push(`${engine} check failed: ${String(e.message || e).slice(0, 120)}`);
    }
  }
  const tested = aeo.length;
  const aeoScore = tested ? Math.round((aeo.filter((a) => a.mentioned).length / tested) * 100) : 0;
  return { aeo, aeoScore, warnings };
}
