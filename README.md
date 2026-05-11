# AI-Career-Copilot# 🚀 

> A smart AI agent that finds jobs, conducts mock interviews, reviews resumes, and guides your career — powered by Claude AI.

![Python](https://img.shields.io/badge/Python-3.11+-blue?style=flat-square&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green?style=flat-square&logo=fastapi)
![Claude](https://img.shields.io/badge/Claude-Sonnet%204-purple?style=flat-square)
![FAISS](https://img.shields.io/badge/FAISS-1.9-orange?style=flat-square)

---

## 🎯 What It Does

| Agent | Trigger Keywords | Example |
|-------|-----------------|---------|
| 🔍 **Job Agent** | "find jobs", "hiring", "openings" | *"Find backend jobs in Pune"* |
| 🎯 **Interview Agent** | "interview", "DSA", "mock", "question" | *"Ask me array problems"* |
| 📄 **Resume Agent** | "resume", "CV", "improve", "ATS" | *"Review my resume"* |
| 🧭 **Career Coach** | everything else | *"How to get 20 LPA?"* |

---

## 🏗 Architecture

```
User Query
    │
    ▼
Controller Agent  ──── classifies intent (1 LLM call)
    │
    ├──▶ Job Agent        → generates job listings
    ├──▶ Interview Agent  → Q&A, mock interviews
    ├──▶ Resume Agent     → RAG on uploaded resume
    └──▶ Career Coach     → general career advice

Resume RAG Pipeline:
  Upload (.txt/.pdf) → Chunk → Embed (MiniLM) → FAISS Index → Retrieve on query
```

---

## 📁 Project Structure

```
ai-career-copilot/
├── backend/
│   ├── main.py           # FastAPI app (all routes)
│   ├── agents.py         # Controller + 4 sub-agents
│   ├── rag.py            # Resume RAG with FAISS
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   └── index.html        # Single-file chat UI
├── .gitignore
└── README.md
```

---

## ⚡ Quick Start

### 1. Clone & Setup

```bash
git clone https://github.com/YOUR_USERNAME/ai-career-copilot.git
cd ai-career-copilot/backend

python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure API Key

```bash
cp .env.example .env
# Edit .env and add your Anthropic API key
# Get one at: https://console.anthropic.com
```

### 3. Run the Server

```bash
uvicorn main:app --reload --port 8000
```

### 4. Open the App

Open `frontend/index.html` in your browser  
*(or navigate to `http://localhost:8000` if serving via FastAPI)*

---

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | ✅ Yes | Get from console.anthropic.com |

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/session/new` | Create a new chat session |
| `DELETE` | `/session/{id}` | Delete a session |
| `POST` | `/resume/upload` | Upload resume file |
| `GET` | `/resume/status` | Check if resume is loaded |
| `POST` | `/chat` | Send a message, get agent response |
| `DELETE` | `/chat/history` | Clear conversation history |
| `GET` | `/health` | Health check |

**Interactive docs:** `http://localhost:8000/docs`

---

## 💬 Example Queries

```
"Find Python developer jobs in Bangalore with 3 years experience"
"Ask me a medium difficulty graph problem"
"Mock interview me for a backend engineering role at a startup"
"What's missing from my resume for a DevOps role?"
"How do I transition from QA to software development?"
"Should I join a startup or a big company at 2 YOE?"
```

---

## 🧠 How the RAG Works

1. You upload your resume (`.txt` or `.pdf`)
2. It's split into **overlapping chunks** (200 words, 30-word overlap)
3. Each chunk is embedded with **`all-MiniLM-L6-v2`** (384-dim)
4. Stored in a **FAISS flat index** (in-memory, per session)
5. On resume queries, the **top-4 relevant chunks** are retrieved and injected into the Resume Agent's prompt

---

## 🛠 Tech Stack

| Layer | Tech | Why |
|-------|------|-----|
| LLM | Claude Sonnet 4 | Best quality/cost ratio |
| API | FastAPI | Fast, auto-docs, async |
| Embeddings | sentence-transformers `all-MiniLM-L6-v2` | Fast, free, good quality |
| Vector DB | FAISS (in-memory) | No infra needed for mini project |
| Frontend | Vanilla HTML/CSS/JS | Zero dependencies |
| Session | Python dict (in-memory) | Simple for mini project |

---

## ⚠ Mini Project Limitations

This is a simplified version. Production upgrades would include:

| Feature | Mini Project | Production |
|---------|-------------|------------|
| Sessions | In-memory dict | PostgreSQL / Redis |
| Vector DB | FAISS in-memory | Pinecone / Weaviate |
| Job search | AI-generated listings | Real API (Naukri, LinkedIn) |
| Auth | None | JWT / OAuth |
| Resume | Text only | PDF parser + image OCR |
| Deployment | Local | Docker + AWS/Render |
| Scalability | Single process | Multiple workers + load balancer |

---

## 🚢 Deployment (Render.com)

```bash
# render.yaml (create in root)
services:
  - type: web
    name: career-copilot
    env: python
    buildCommand: pip install -r backend/requirements.txt
    startCommand: cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: ANTHROPIC_API_KEY
        sync: false
```

---

## 🤝 Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feature/real-job-api`
3. Commit: `git commit -m "Add Naukri job search integration"`
4. Push & PR
