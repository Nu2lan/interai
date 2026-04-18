import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { setupWebSocket } from './ws.js';
import { streamAnswer } from './openaiClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Scrape job posting URL and extract fields using OpenAI
app.post('/api/scrape-job', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'Missing "url" field' });
    }

    console.log(`[API /scrape-job] Fetching: ${url}`);

    // Fetch the page HTML with browser-like headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.error(`[API /scrape-job] HTTP ${response.status} for ${url}`);
      return res.status(400).json({ error: `Failed to fetch URL (HTTP ${response.status})` });
    }

    const html = await response.text();

    // Strip HTML tags and extract text content (limit to 12000 chars for GPT)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 12000);

    if (textContent.length < 50) {
      return res.status(400).json({ error: 'Could not extract meaningful text from the URL' });
    }

    // Use OpenAI to extract structured job info
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You extract job posting data from raw webpage text. Return ONLY a valid JSON object with these fields: "company" (string), "position" (string), "description" (string). IMPORTANT: For the "description" field, copy the ORIGINAL text from the posting as-is. Do NOT summarize, rephrase, or generate new text. Extract the actual requirements, responsibilities, and qualifications sections verbatim from the page. Concatenate them with newlines. Keep up to 2000 characters. If a field cannot be found, use an empty string.',
        },
        {
          role: 'user',
          content: textContent,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
      temperature: 0,
    });

    const parsed = JSON.parse(completion.choices[0].message.content);
    console.log(`[API /scrape-job] Extracted: ${parsed.company} — ${parsed.position}`);

    res.json({
      company: parsed.company || '',
      position: parsed.position || '',
      description: parsed.description || '',
    });
  } catch (err) {
    console.error('[API /scrape-job] Error:', err.message);
    if (err.name === 'TimeoutError' || err.code === 'ABORT_ERR') {
      return res.status(408).json({ error: 'URL request timed out' });
    }
    res.status(500).json({ error: 'Failed to scrape job posting' });
  }
});

// Standalone text → OpenAI endpoint
app.post('/api/ask', async (req, res) => {
  try {
    const { question, language } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Missing "question" field' });
    }

    const lang = language || 'en';
    let fullAnswer = '';

    for await (const chunk of streamAnswer(question, lang)) {
      fullAnswer += chunk;
    }

    res.json({ answer: fullAnswer, language: lang });
  } catch (err) {
    console.error('[API /ask] Error:', err.message);
    res.status(500).json({ error: 'Failed to generate answer' });
  }
});

// Serve built frontend in production
const clientDist = join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(join(clientDist, 'index.html'));
});

// Create HTTP server and attach WebSocket
const server = createServer(app);
setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`🚀 InterAI server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket available at ws://localhost:${PORT}`);
});
