import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const LANGUAGE_NAMES = {
  az: 'Azerbaijani',
  en: 'English',
  ru: 'Russian',
  tr: 'Turkish',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  ar: 'Arabic',
  fa: 'Persian',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
};

/**
 * Stream an AI interview answer for the given question.
 * Returns an async generator that yields text chunks.
 *
 * @param {string} question - The transcribed interviewer question
 * @param {string} language - ISO 639-1 language code (e.g. "az", "en")
 * @param {string} position - The job position being interviewed for
 * @param {string} company - The company name
 * @param {string} jobDescription - The job description/requirements
 * @returns {AsyncGenerator<string>}
 */
export async function* streamAnswer(question, language = 'en', position = '', company = '', jobDescription = '') {
  const langName = LANGUAGE_NAMES[language] || language;

  const positionContext = position
    ? `You have 7+ years of experience as a ${position}.`
    : `You are a highly experienced professional.`;

  const companyContext = company
    ? `[INTERNAL CONTEXT — DO NOT MENTION]: You are interviewing at ${company}. Use this to understand the domain but NEVER say the company name in your answer.`
    : '';

  const jdContext = jobDescription
    ? `[INTERNAL CONTEXT — DO NOT MENTION]: The job requires: ${jobDescription}\nUse this to shape your answers so they match these requirements, but NEVER reference "the job description", "the posting", or "the requirements" directly. Just naturally demonstrate that you have the right skills.`
    : '';

  const systemPrompt = [
    `CRITICAL RULE: You MUST write your ENTIRE response in ${langName} language ONLY.`,
    `You are in a live job interview. ${positionContext}`,
    companyContext,
    jdContext,
    `You are the CANDIDATE answering questions.`,
    `IMPORTANT: Keep your answers GENERAL. Do NOT mention the company name, job title, or specific requirements from the job posting. Answer naturally as an experienced professional would — show your skills through examples without naming where you are applying.`,
    `Give real-world examples, mention specific tools and methodologies from your experience.`,
    `Be confident and convincing. 4 to 8 sentences max.`,
    `TERMINOLOGY RULE: ALL technical and professional terms MUST stay in English. NEVER translate terms like: developer, frontend, backend, fullstack, software engineer, API, database, framework, server, deployment, CI/CD, agile, scrum, sprint, product manager, designer, DevOps, cloud, microservices, REST, GraphQL, etc. Write them exactly in English even when the rest of the sentence is in ${langName}.`,
    `LANGUAGE RULE: Respond ONLY in ${langName} (${language}). NEVER switch languages. But keep technical terminology in English as specified above.`,
    `Never mention you are an AI.`,
  ].filter(Boolean).join('\n');

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ],
    stream: true,
    max_tokens: 500,
    temperature: 0.7,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}
