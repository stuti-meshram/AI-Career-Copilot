import { useState, useRef, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════
// AGENT CONFIGURATION — Each agent has its own system prompt,
// color accent, and behavior (web search on/off).
// ═══════════════════════════════════════════════════════════════
const AGENTS = {
  auto: {
    id: "auto",
    name: "Auto Pilot",
    icon: "✦",
    accent: "#8b5cf6",
    bg: "#8b5cf610",
    tag: "Smart routing",
    useSearch: true,
    systemPrompt: `You are an AI Career Copilot for software developers. Detect the user's intent and respond:
- Job search → Use web search to find current openings. Show role, company, location, skills, link.
- Interview/DSA/coding → Generate realistic Q&A with code solutions and complexity.
- Resume/CV → Analyze and provide specific improvements with ATS score.
- Career advice → Strategic, actionable guidance.
Always format responses clearly. Be concise and actionable. End with a helpful follow-up question.`,
  },
  jobs: {
    id: "jobs",
    name: "Job Hunter",
    icon: "◈",
    accent: "#0d9488",
    bg: "#0d948810",
    tag: "Find live openings",
    useSearch: true,
    systemPrompt: `You are a Job Search Agent for software developers. Use web search to find CURRENT job openings.

For each job, use this format:
**[Role Title] @ [Company Name]**
📍 [City, Country] | 🏠 [Remote/Hybrid/Onsite]
🛠 Skills: [required skills comma separated]
💰 Salary: [range if found, else "Not listed"]
🔗 [Apply link or "Search on LinkedIn/Naukri"]

Find 4-5 positions. After listing jobs, add:
"💡 Want me to tailor your resume for any of these roles?"

Focus on India (Bangalore, Hyderabad, Pune, Remote-India) unless user specifies otherwise.`,
  },
  interview: {
    id: "interview",
    name: "Interview Prep",
    icon: "⬡",
    accent: "#d97706",
    bg: "#d9770610",
    tag: "Q&A & mock sessions",
    useSearch: false,
    systemPrompt: `You are an Interview Prep Coach for software developers. Generate targeted, realistic questions.

DSA Question format:
**Problem:** [Clear problem statement]
**Example:** Input → Output
**Approach:** [Algorithm/technique name + explanation]
**Complexity:** ⏱ Time: O(n) | 💾 Space: O(1)
\`\`\`python
# Clean, commented solution
def solution(input):
    pass
\`\`\`
**Follow-up:** [Harder variant]

System Design: Draw ASCII diagrams, mention scale numbers, discuss trade-offs.
Behavioral: Use STAR format (Situation, Task, Action, Result).
HR: Give authentic, strategic answers.

If role/company not specified, ask before generating. Adjust difficulty to user's level.`,
  },
  resume: {
    id: "resume",
    name: "Resume AI",
    icon: "▣",
    accent: "#2563eb",
    bg: "#2563eb10",
    tag: "ATS analysis & rewrites",
    useSearch: false,
    systemPrompt: `You are an ATS Resume Expert and technical recruiter with 10+ years experience. Analyze resumes critically.

Output format:
## ATS Score: XX/100
**Breakdown:** Format (X/20) | Keywords (X/25) | Impact (X/25) | Clarity (X/30)

## ✅ What's Working
- [specific strengths]

## ⚠️ Critical Issues
- [specific problems with examples]

## ✏️ Rewrite Examples
**Before:** [weak original bullet]
**After:** [strong rewrite with metrics]
(provide 3+ rewrites)

## 🔑 Missing Keywords
[keywords by category: technical skills, tools, soft skills]

## ⚡ Quick Wins (< 5 min fixes)
[prioritized list]

Be direct and specific. If no resume is provided, ask the user to paste their resume.`,
  },
};

// ═══════════════════════════════════════════════════════════════
// WELCOME MESSAGES — shown when agent is first activated
// ═══════════════════════════════════════════════════════════════
const WELCOME = {
  auto: `Hey! I'm your **AI Career Copilot** ✦

I can help you with:
• 💼 "Find React jobs in Bangalore"
• 🎯 "Ask me Google SDE-2 DSA questions"
• 📄 "Analyze my resume"
• 💡 "How do I switch from service to product company?"

What do you need today?`,
  jobs: `**Job Hunter** mode activated ◈

Tell me:
• Target role (e.g., "SDE-2", "Frontend Dev", "Data Engineer")
• Preferred location or "Remote India"
• Your key skills

I'll search live openings from Naukri, LinkedIn, and company sites.`,
  interview: `**Interview Prep** mode ready ⬡

What do you need?
• DSA problems — easy / medium / hard
• System design (e.g., "Design Instagram")
• Behavioral prep (e.g., "conflict at work")
• Full mock interview for [Company Name]

Which company or role are you targeting?`,
  resume: `**Resume AI** mode ready ▣

Paste your resume in the **Resume Panel** (right side), then ask:
• "Analyze my resume for SDE roles"
• "Rewrite my project bullet points"
• "What's my ATS score?"
• "Add keywords for ML Engineer role"

Don't have your resume handy? Describe your experience and I'll help craft bullet points.`,
};

// ═══════════════════════════════════════════════════════════════
// CLAUDE API — Calls Anthropic's API with web search when needed
// ═══════════════════════════════════════════════════════════════
async function callClaude({ agent, messages, resumeText }) {
  // Inject resume context if available
  const systemPrompt =
    agent.systemPrompt +
    (resumeText && (agent.id === "resume" || agent.id === "auto")
      ? `\n\n[USER'S RESUME — use this for analysis]\n---\n${resumeText}\n---`
      : "");

  const apiMessages = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-10) // Keep last 10 messages for context window efficiency
    .map((m) => ({ role: m.role, content: m.content }));

  const body = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: systemPrompt,
    messages: apiMessages,
    ...(agent.useSearch && {
      tools: [{ type: "web_search_20250305", name: "web_search" }],
    }),
  };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  const text = data.content
    ?.filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  if (!text) throw new Error("Empty response from AI");
  return text;
}

// ═══════════════════════════════════════════════════════════════
// MARKDOWN RENDERER — Converts markdown text to HTML
// ═══════════════════════════════════════════════════════════════
function renderMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      const escaped = code.replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
      return `<pre class="code-block" data-lang="${lang || "code"}"><code>${escaped}</code></pre>`;
    })
    .replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`\n]+)`/g, "<code class='inline-code'>$1</code>")
    .replace(/^[\-•] (.+)$/gm, '<li class="md-li">$1</li>')
    .replace(/(<li[\s\S]*?<\/li>)+/g, (m) => `<ul class="md-ul">${m}</ul>`)
    .replace(/\n\n/g, '<div class="spacer"></div>')
    .replace(/\n/g, "<br/>");
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

function AgentButton({ agent, active, onClick }) {
  return (
    <button
      onClick={onClick}
      title={agent.tag}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 14px",
        borderRadius: "10px",
        border: active
          ? `1.5px solid ${agent.accent}`
          : "1.5px solid transparent",
        background: active ? agent.bg : "transparent",
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
        transition: "all 0.18s ease",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "#ffffff08";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      <span
        style={{
          fontSize: "18px",
          color: active ? agent.accent : "#666",
          lineHeight: 1,
          width: "20px",
          textAlign: "center",
        }}
      >
        {agent.icon}
      </span>
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: "13px",
            fontWeight: 600,
            color: active ? agent.accent : "#bbb",
            lineHeight: 1.2,
          }}
        >
          {agent.name}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: "10px",
            color: "#666",
            lineHeight: 1.4,
          }}
        >
          {agent.tag}
        </p>
      </div>
    </button>
  );
}

function MessageBubble({ msg, agent }) {
  const isUser = msg.role === "user";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: "14px",
        gap: "8px",
        alignItems: "flex-start",
      }}
    >
      {!isUser && (
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            background: agent.bg,
            border: `1px solid ${agent.accent}40`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            flexShrink: 0,
            marginTop: "2px",
          }}
        >
          {agent.icon}
        </div>
      )}
      <div
        style={{
          maxWidth: "82%",
          padding: "11px 15px",
          borderRadius: isUser ? "14px 14px 4px 14px" : "4px 14px 14px 14px",
          background: isUser ? agent.accent : "#1a1d26",
          border: isUser ? "none" : "1px solid #2a2d3a",
          color: isUser ? "#fff" : "#d4d8e8",
          fontSize: "14px",
          lineHeight: 1.65,
          fontFamily: "'DM Sans', sans-serif",
        }}
        className={isUser ? "" : "ai-msg"}
        dangerouslySetInnerHTML={{
          __html: isUser
            ? msg.content.replace(/\n/g, "<br/>")
            : renderMarkdown(msg.content),
        }}
      />
    </div>
  );
}

function TypingIndicator({ agent }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "14px",
      }}
    >
      <div
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "8px",
          background: agent.bg,
          border: `1px solid ${agent.accent}40`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "14px",
          flexShrink: 0,
        }}
      >
        {agent.icon}
      </div>
      <div
        style={{
          display: "flex",
          gap: "4px",
          padding: "12px 16px",
          background: "#1a1d26",
          border: "1px solid #2a2d3a",
          borderRadius: "4px 14px 14px 14px",
          alignItems: "center",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: agent.accent,
              animation: "typing-dot 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function App() {
  // Per-agent chat history
  const [chats, setChats] = useState(() =>
    Object.fromEntries(
      Object.keys(AGENTS).map((id) => [
        id,
        [{ role: "assistant", content: WELCOME[id], id: `welcome-${id}` }],
      ])
    )
  );

  const [activeId, setActiveId] = useState("auto");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [showResumePanel, setShowResumePanel] = useState(false);
  const [error, setError] = useState(null);

  const agent = AGENTS[activeId];
  const messages = chats[activeId];
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input after switching agent
  useEffect(() => {
    inputRef.current?.focus();
  }, [activeId]);

  // Auto-resize textarea
  const handleInputChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
  };

  const switchAgent = (id) => {
    setActiveId(id);
    setError(null);
    // Auto-show resume panel when switching to resume agent
    if (id === "resume") setShowResumePanel(true);
  };

  const clearChat = () => {
    setChats((prev) => ({
      ...prev,
      [activeId]: [
        { role: "assistant", content: WELCOME[activeId], id: `welcome-${activeId}` },
      ],
    }));
    setError(null);
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError(null);
    if (inputRef.current) inputRef.current.style.height = "auto";

    const userMsg = { role: "user", content: text, id: Date.now() };
    const updatedMsgs = [...messages, userMsg];
    setChats((prev) => ({ ...prev, [activeId]: updatedMsgs }));
    setLoading(true);

    try {
      const reply = await callClaude({ agent, messages: updatedMsgs, resumeText });
      setChats((prev) => ({
        ...prev,
        [activeId]: [
          ...prev[activeId],
          { role: "assistant", content: reply, id: Date.now() + 1 },
        ],
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, messages, agent, resumeText, activeId]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Quick action chips
  const CHIPS = {
    auto: ["Find React jobs", "Mock interview me", "Review my resume"],
    jobs: ["SDE-2 Bangalore", "Remote frontend", "Data Engineer India"],
    interview: ["Array problems", "System design: Twitter", "Google behavioral"],
    resume: ["Analyze my resume", "Write bullet points", "ATS keywords for ML"],
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0d0f18", color: "#e0e4f0", fontFamily: "'DM Sans', sans-serif", overflow: "hidden" }}>

      {/* ── SIDEBAR ─────────────────────────────── */}
      <aside style={{ width: "220px", flexShrink: 0, background: "#10121d", borderRight: "1px solid #1e2130", display: "flex", flexDirection: "column", padding: "20px 12px" }}>

        {/* Logo */}
        <div style={{ padding: "0 4px 20px", borderBottom: "1px solid #1e2130", marginBottom: "16px" }}>
          <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#e0e4f0", letterSpacing: "-0.3px" }}>
            Career<span style={{ color: agent.accent }}>AI</span>
          </p>
          <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#555", letterSpacing: "0.8px", textTransform: "uppercase" }}>Copilot Agent</p>
        </div>

        {/* Agent buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
          <p style={{ margin: "0 4px 8px", fontSize: "10px", color: "#555", letterSpacing: "0.8px", textTransform: "uppercase" }}>Agents</p>
          {Object.values(AGENTS).map((ag) => (
            <AgentButton key={ag.id} agent={ag} active={activeId === ag.id} onClick={() => switchAgent(ag.id)} />
          ))}
        </div>

        {/* Resume toggle */}
        <button
          onClick={() => setShowResumePanel(!showResumePanel)}
          style={{
            marginTop: "16px",
            padding: "10px 14px",
            borderRadius: "10px",
            border: `1.5px solid ${showResumePanel ? "#2563eb80" : "#1e2130"}`,
            background: showResumePanel ? "#2563eb15" : "transparent",
            color: showResumePanel ? "#60a5fa" : "#666",
            cursor: "pointer",
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "16px" }}>▣</span>
          {showResumePanel ? "Hide Resume" : "Add Resume"}
          {resumeText && <span style={{ marginLeft: "auto", fontSize: "10px", background: "#2563eb40", color: "#60a5fa", padding: "2px 6px", borderRadius: "6px" }}>✓</span>}
        </button>

        {/* Clear chat */}
        <button
          onClick={clearChat}
          style={{ marginTop: "8px", padding: "10px 14px", borderRadius: "10px", border: "1.5px solid transparent", background: "transparent", color: "#555", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#888")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
        >
          <span style={{ fontSize: "16px" }}>↺</span>
          Clear Chat
        </button>
      </aside>

      {/* ── MAIN AREA ────────────────────────────── */}
      <main style={{ flex: 1, display: "flex", minWidth: 0, overflow: "hidden" }}>

        {/* Chat column */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

          {/* Header */}
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #1e2130", display: "flex", alignItems: "center", gap: "12px", background: "#10121d" }}>
            <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: agent.bg, border: `1.5px solid ${agent.accent}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
              {agent.icon}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#e0e4f0" }}>{agent.name}</p>
              <p style={{ margin: 0, fontSize: "12px", color: "#555" }}>
                {agent.tag}
                {agent.useSearch && <span style={{ marginLeft: "8px", fontSize: "10px", color: agent.accent, border: `1px solid ${agent.accent}40`, padding: "1px 6px", borderRadius: "4px" }}>web search ✓</span>}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column" }}>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} agent={agent} />
            ))}
            {loading && <TypingIndicator agent={agent} />}
            {error && (
              <div style={{ padding: "12px 16px", background: "#2d1010", border: "1px solid #7f1d1d", borderRadius: "10px", color: "#fca5a5", fontSize: "13px", marginBottom: "14px" }}>
                ⚠️ {error}
                {error.includes("API") && <span style={{ color: "#888", display: "block", marginTop: "4px", fontSize: "11px" }}>Check your VITE_ANTHROPIC_API_KEY in .env</span>}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick chips */}
          <div style={{ padding: "0 24px 8px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {CHIPS[activeId].map((chip) => (
              <button
                key={chip}
                onClick={() => { setInput(chip); inputRef.current?.focus(); }}
                style={{ padding: "5px 12px", borderRadius: "20px", border: `1px solid ${agent.accent}40`, background: agent.bg, color: agent.accent, fontSize: "12px", cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.border = `1px solid ${agent.accent}90`)}
                onMouseLeave={(e) => (e.currentTarget.style.border = `1px solid ${agent.accent}40`)}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input area */}
          <div style={{ padding: "12px 24px 20px" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", padding: "12px", background: "#1a1d26", borderRadius: "14px", border: `1.5px solid #2a2d3a`, transition: "border-color 0.2s" }}
              onFocus={() => { }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${agent.name}... (Enter to send, Shift+Enter for newline)`}
                rows={1}
                style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#e0e4f0", fontSize: "14px", resize: "none", lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif", maxHeight: "140px" }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  border: "none",
                  background: input.trim() && !loading ? agent.accent : "#2a2d3a",
                  color: input.trim() && !loading ? "#fff" : "#555",
                  cursor: input.trim() && !loading ? "pointer" : "default",
                  fontSize: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.2s",
                }}
              >
                {loading ? "⏳" : "↑"}
              </button>
            </div>
            <p style={{ margin: "6px 0 0 4px", fontSize: "10px", color: "#444" }}>AI responses may not be perfectly accurate. Verify important info.</p>
          </div>
        </div>

        {/* ── RESUME PANEL ────────────────────────── */}
        {showResumePanel && (
          <div style={{ width: "300px", flexShrink: 0, borderLeft: "1px solid #1e2130", background: "#10121d", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e2130" }}>
              <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#e0e4f0" }}>Resume Panel</p>
              <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#555" }}>Paste your resume text for AI analysis</p>
            </div>
            <textarea
              ref={textareaRef}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder={`Paste your resume text here...\n\nExample:\nJohn Doe | Full Stack Developer\njohn@email.com\n\nEXPERIENCE\nSDE-1 at Infosys (2022-2024)\n- Developed REST APIs using Spring Boot\n...`}
              style={{ flex: 1, background: "#0d0f18", border: "none", outline: "none", color: "#c0c6d8", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", padding: "16px 20px", resize: "none", lineHeight: 1.6 }}
            />
            <div style={{ padding: "12px 20px", borderTop: "1px solid #1e2130", display: "flex", gap: "8px" }}>
              {resumeText && (
                <>
                  <span style={{ fontSize: "11px", color: "#555", flex: 1 }}>
                    {resumeText.split(/\s+/).filter(Boolean).length} words
                  </span>
                  <button
                    onClick={() => setResumeText("")}
                    style={{ padding: "5px 12px", borderRadius: "8px", border: "1px solid #2a2d3a", background: "transparent", color: "#666", fontSize: "12px", cursor: "pointer" }}
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => {
                      setActiveId("resume");
                      setInput("Analyze my resume");
                      inputRef.current?.focus();
                    }}
                    style={{ padding: "5px 12px", borderRadius: "8px", border: "none", background: "#2563eb", color: "#fff", fontSize: "12px", cursor: "pointer", fontWeight: 500 }}
                  >
                    Analyze →
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Global styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2d3a; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #3a3d4a; }
        @keyframes typing-dot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        .ai-msg h2.md-h2 { margin: 14px 0 6px; font-size: 14px; font-weight: 600; color: #e0e4f0; border-bottom: 1px solid #2a2d3a; padding-bottom: 4px; }
        .ai-msg h3.md-h3 { margin: 10px 0 4px; font-size: 13px; font-weight: 600; color: #c0c6d8; }
        .ai-msg .md-ul { margin: 6px 0 6px 4px; padding: 0; list-style: none; }
        .ai-msg .md-li { padding: 2px 0 2px 14px; position: relative; font-size: 13.5px; }
        .ai-msg .md-li::before { content: "·"; position: absolute; left: 2px; color: #555; }
        .ai-msg .code-block { background: #0a0c14; border: 1px solid #2a2d3a; border-radius: 8px; padding: 12px 14px; margin: 10px 0; overflow-x: auto; }
        .ai-msg .code-block::before { content: attr(data-lang); display: block; font-size: 10px; color: #555; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.8px; }
        .ai-msg .code-block code { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #a8d8a8; line-height: 1.6; }
        .ai-msg .inline-code { background: #1a1d26; border: 1px solid #2a2d3a; padding: 1px 6px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #60a5fa; }
        .ai-msg .spacer { height: 8px; }
        .ai-msg strong { color: #e0e4f0; }
      `}</style>
    </div>
  );
}
