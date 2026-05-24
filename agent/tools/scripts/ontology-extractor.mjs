import { fileURLToPath } from 'node:url';

const PROVIDERS = {
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    keyEnv: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-haiku-4-5-20251001',
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    keyEnv: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o-mini',
  },
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    keyEnv: 'GROQ_API_KEY',
    defaultModel: 'llama-3.1-8b-instant',
  },
};

const SYSTEM = `You are an incident ontology extractor. Extract nodes and edges from a post-mortem.
Node types: Service, Error, Trigger, RootCause, Symptom, Mitigation, CodePath, Incident
Edge types: caused, manifested_as, resolved, touched, depended_on, satisfies
ID formats:
  service:<slug> | error:<slug> | root-cause:<slug> | symptom:<slug>
  mitigation:<slug>-<date> | code-path:<raw-file-path> | incident:<id>
CRITICAL: code-path ids use raw file paths — do NOT slugify (e.g. code-path:src/payments/handler.py)
Return ONLY valid JSON: {"nodes":[{"id","type","properties"}],"edges":[{"source","target","type"}]}`;

export async function run({ raw_text, incident_id }) {
  const provider = (process.env.LLM_PROVIDER ?? 'anthropic').toLowerCase();
  const cfg = PROVIDERS[provider];
  if (!cfg) throw new Error(`Unknown provider: ${provider}. Use anthropic | openai | groq`);

  const apiKey = process.env[cfg.keyEnv];
  if (!apiKey) throw new Error(`Missing env var ${cfg.keyEnv} for provider ${provider}`);

  const model = process.env.LLM_MODEL ?? cfg.defaultModel;
  const userMsg = `Incident ID: ${incident_id}\n\n${raw_text}`;

  let reqHeaders, reqBody;
  if (provider === 'anthropic') {
    reqHeaders = { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' };
    reqBody = JSON.stringify({ model, max_tokens: 2048, system: SYSTEM,
      messages: [{ role: 'user', content: userMsg }] });
  } else {
    // OpenAI-compatible (openai + groq share the same request shape)
    reqHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
    reqBody = JSON.stringify({ model, response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: userMsg }] });
  }

  const res = await fetch(cfg.url, { method: 'POST', headers: reqHeaders, body: reqBody });
  if (!res.ok) throw new Error(`${provider} API ${res.status}: ${await res.text()}`);
  const data = await res.json();

  const text = provider === 'anthropic'
    ? data.content[0].text
    : data.choices[0].message.content;

  const result = JSON.parse(text);
  if (!Array.isArray(result.nodes) || !Array.isArray(result.edges)) {
    throw new Error('LLM response missing nodes or edges arrays');
  }
  return result;
}

export default async function extract(rawText, incidentId) {
  return run({ raw_text: rawText, incident_id: incidentId });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  try {
    process.stdout.write(JSON.stringify(await run(JSON.parse(Buffer.concat(chunks)))));
  } catch (e) {
    process.stderr.write(JSON.stringify({ error: e.message }));
    process.exit(1);
  }
}
