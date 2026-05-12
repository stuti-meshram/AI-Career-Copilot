# ✦ CareerAI — AI Career Copilot Agent 

> An AI-powered career assistant with multi-agent routing — finds jobs, preps you for interviews, and reviews your resume. Built with React + Claude API.

![CareerAI Demo](https://img.shields.io/badge/status-working-brightgreen) ![React](https://img.shields.io/badge/React-18-blue) ![Claude](https://img.shields.io/badge/Claude-Sonnet_4-purple) ![License](https://img.shields.io/badge/license-MIT-green)

---

## 🎯 What Is This?

A **mini project** version of a production AI Career Copilot. It demonstrates:

- **Multi-agent routing** — one controller, four specialized agents
- **Tool use** — web search for live job listings
- **RAG-lite** — resume text injected into context for analysis
- **Streaming-ready architecture** — per-agent conversation memory
- **Production patterns** — proper error handling, cost-aware context trimming

This is intentionally a **mini** (frontend-only) version. See [Production Roadmap](#-production-roadmap) for what the full version would add.

---

## 🤖 Agents

| Agent | Mode | Web Search | Use Case |
|-------|------|-----------|----------|
| **✦ Auto Pilot** | Controller | ✅ Yes | Routes automatically by intent |
| **◈ Job Hunter** | Specialist | ✅ Yes | Finds live job openings |
| **⬡ Interview Prep** | Specialist | ❌ No | DSA, system design, behavioral Q&A |
| **▣ Resume AI** | Specialist | ❌ No | ATS scoring, rewrites, keywords |

### How Routing Works

```
User Query
    │
    ▼
Auto Pilot (Claude)
    │
    ├─ "find jobs / openings" ──────► Job Hunter (+ web_search tool)
    ├─ "DSA / interview / mock" ────► Interview Prep
    ├─ "resume / CV / ATS" ─────────► Resume AI (+ resume context)
    └─ Career advice ───────────────► General LLM response
```

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/ai-career-copilot.git
cd ai-career-copilot
npm install
```

### 2. Set up API Key

```bash
cp .env.example .env.local
# Edit .env.local and add your Anthropic API key
```

Get your API key at [console.anthropic.com](https://console.anthropic.com/)

### 3. Run

```bash
npm run dev
# Open http://localhost:5173
```

---

## 📁 Project Structure

```
ai-career-copilot/
├── src/
│   ├── App.jsx          # Entire app — agents, API, UI components
│   ├── main.jsx         # React entry point
│   └── index.css        # Global reset & base styles
├── index.html           # HTML shell
├── vite.config.js       # Vite + dev proxy config
├── package.json
├── .env.example         # ← copy to .env.local, add your key
└── .gitignore
```

> **Why one file?** This is a **mini project**. For production, split into `agents/`, `components/`, `api/`, `hooks/` folders.

---

## 💬 Usage Examples

### Find Jobs
```
"Find React developer jobs in Bangalore"
"Remote Python backend roles in India"
"SDE-2 positions at product companies"
```

### Interview Prep
```
"Give me 3 medium array problems"
"System design: Design YouTube"
"Behavioral: Tell me about a conflict you resolved"
"Mock interview me for Amazon SDE-1"
```

### Resume Review
1. Click **Add Resume** in the sidebar
2. Paste your resume text
3. Type: *"Analyze my resume for SDE-2 roles"*
4. Get: ATS score, issues, rewrites, missing keywords

### Auto Mode
```
"I'm a fresher looking for frontend jobs in Pune"
→ Auto detects → Job Hunter response with live listings
```

---

## 🧠 Architecture Decisions (Mini vs Production)

| Concern | Mini (This) | Production |
|---------|------------|------------|
| **Routing** | Prompt-based intent detection | LangChain agent + tool calls |
| **Memory** | In-component state | PostgreSQL + Redis |
| **Resume** | Paste as text | PDF upload + FAISS vector DB |
| **Job Search** | Claude web_search tool | Dedicated scraper + Naukri/LinkedIn API |
| **Auth** | None | NextAuth / JWT |
| **Cost control** | Last-10-msg context window | Token budget per user |
| **Deployment** | Static (Vercel/Netlify) | Docker + AWS/Render |

---

## ⚙️ Tech Stack

| Layer | Tool | Why |
|-------|------|-----|
| UI | React 18 | Component state per agent |
| Build | Vite | Fast dev + tree shaking |
| LLM | Claude Sonnet 4 | Best price/performance ratio |
| Search | Anthropic web_search tool | No third-party API needed |
| Styling | Inline CSS + CSS-in-JS | Zero dependencies |
| Fonts | DM Sans + JetBrains Mono | Clean + developer-friendly |

---

## 🔒 Security Notes

⚠️ **This mini project calls the Anthropic API directly from the browser.** This is fine for local development and demos, but for production:

1. **Never ship your API key in frontend code**
2. Add a backend proxy (Node/FastAPI) that adds the key server-side
3. Add rate limiting + auth per user
4. The `vite.config.js` proxy handles this in dev mode

---

## 💰 Cost Optimization

The mini project uses these techniques to minimize API costs:

- `max_tokens: 1000` — capped response length
- **Context window trimming** — only last 10 messages sent per request
- **No streaming** — single complete response (streaming uses same tokens)
- **Selective web search** — only Job Hunter + Auto use it (costs more)
- **No embeddings** — resume injected as plain text (no vector DB costs)

Estimated cost per typical session: **< $0.05**

---

## 🗺️ Production Roadmap

What you'd add for a real product:

- [ ] **FastAPI backend** — handles auth, rate limiting, key security
- [ ] **PostgreSQL** — user accounts, chat history, saved jobs
- [ ] **FAISS / Pinecone** — vector embeddings for resume RAG
- [ ] **PDF upload** — parse and chunk resume automatically
- [ ] **LangChain agents** — proper tool-calling agent loop
- [ ] **Real job APIs** — Naukri API / LinkedIn Scraper / Adzuna
- [ ] **Streaming responses** — better UX for long answers
- [ ] **Docker + CI/CD** — containerized, deployable anywhere
- [ ] **Analytics** — track which features users use most

---

## 🤝 Contributing

PRs welcome! Especially for:
- Adding more agent types (Salary Negotiation, Cover Letter)
- Improving the markdown renderer
- Adding the FastAPI backend layer

---

## 📄 License

MIT — use freely, credit appreciated.

---

Built with ❤️ using [Claude API](https://anthropic.com) | For learning & portfolio purposes
