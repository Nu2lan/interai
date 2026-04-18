# 🎙️ InterAI — Realtime AI Interview Assistant

InterAI is a real-time AI-powered interview simulation tool. It captures live audio from your screen, transcribes it on-the-fly, and generates expert-level answers tailored to the job you're applying for.

---

## ✨ Features

- **Real-time Speech-to-Text** — Powered by Soniox, captures and transcribes audio from screen sharing
- **AI-Powered Answers** — GPT-4o generates contextual interview answers streamed in real-time
- **Job URL Scraper** — Paste a job posting URL to auto-fill company, position, and job description
- **Multi-language Support** — Supports 12+ languages including English, Azerbaijani, Turkish, Russian, and more
- **Smart Terminology** — Keeps technical terms (developer, API, framework, etc.) in English regardless of language
- **Two-step Setup** — Configure job details → Resume & language → Start interview
- **Auto-scroll Transcription** — Live transcript and AI responses with internal scrolling

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite, TailwindCSS |
| Backend | Node.js, Express |
| Real-time | WebSocket (ws) |
| Speech-to-Text | Soniox API |
| AI | OpenAI GPT-4o |
| Deployment | Railway |

---

## 📋 Prerequisites

- Node.js 18+
- [Soniox API Key](https://soniox.com)
- [OpenAI API Key](https://platform.openai.com)

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/interai.git
cd interai
```

### 2. Install dependencies

```bash
npm run install:all
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
SONIOX_API_KEY=your_soniox_api_key
OPENAI_API_KEY=your_openai_api_key
PORT=3001
```

### 4. Run in development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📦 Production Build

```bash
npm run build
npm start
```

The server will serve the built frontend at `http://localhost:3001`.

---

## 🚄 Deploy to Railway

1. Push the repo to GitHub
2. Create a new project on [Railway](https://railway.app) → Deploy from GitHub
3. Add environment variables:
   - `SONIOX_API_KEY`
   - `OPENAI_API_KEY`
4. Railway auto-detects the config, builds the client, and starts the server
5. Your app will be live at the generated Railway URL

---

## 📁 Project Structure

```
interai/
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── SetupPage.jsx       # Step 1: Job details
│   │   │   ├── ConfigPage.jsx      # Step 2: Resume & language
│   │   │   ├── TranscriptStream.jsx # Live transcript sidebar
│   │   │   └── AIResponseBox.jsx    # AI answer panel
│   │   ├── lib/
│   │   │   ├── AudioCapture.js     # Screen audio capture
│   │   │   └── WebsocketClient.js  # WS client manager
│   │   ├── App.jsx                 # Main app with 3-page flow
│   │   ├── main.jsx
│   │   └── index.css               # Global styles
│   └── public/
│       └── favicon.svg
├── server/                 # Express backend
│   ├── index.js            # API routes + static serving
│   ├── ws.js               # WebSocket handler (Soniox + OpenAI)
│   └── openaiClient.js     # OpenAI streaming client
├── .env.example
├── railway.json
├── nixpacks.toml
└── package.json
```

---

## 🔧 How It Works

1. **Setup** — Enter job details manually or paste a URL to auto-scrape
2. **Configure** — Upload resume and select language
3. **Interview** — Click Next → select screen/tab to share → interview starts
4. **Live Flow** — Audio is captured → sent via WebSocket → Soniox transcribes → GPT-4o answers → streamed back to UI

---

## 📄 License

MIT
