import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { MessageCircle, X, Send, Zap, Loader2 } from "lucide-react";
import { STARTUPS } from "../mockData";
import ReactMarkdown from "react-markdown";

const SYSTEM_CONTEXT = `You are the VentureNerve AI assistant — an expert in venture capital, startup risk analysis, and the VentureNerve platform.

VentureNerve matches investors with startups based on Risk-Adjusted Return (RAR = Expected IRR × (1 − PD)).

Current startup pipeline:
${STARTUPS.map(s => `- ${s.name} (${s.sector}, ${s.stage}): IRR ${Math.round(s.expectedIRR*100)}%, PD ${Math.round(s.pd12m*100)}%, RAR ${(s.expectedIRR*(1-s.pd12m)*100).toFixed(1)}%, Fragility ${s.fragilityScore}, Revenue Conc. ${s.revenueConcentration}%, Runway ${s.runway}mo`).join('\n')}

You can explain RAR scores, compare startups, explain risk metrics like PD and fragility score, help investors understand which startups best fit their criteria, and answer general venture capital questions. Keep answers concise and professional. Use markdown formatting where helpful.`;

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Zap className="w-3 h-3 text-white" />
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-cyan-500/20 border border-cyan-500/30 text-white"
            : "bg-white/[0.05] border border-white/8 text-white/80"
        }`}
      >
        {isUser ? (
          <p>{msg.content}</p>
        ) : (
          <ReactMarkdown
            className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            components={{
              p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="my-1 ml-4 list-disc space-y-0.5">{children}</ul>,
              li: ({ children }) => <li className="text-white/75">{children}</li>,
              strong: ({ children }) => <strong className="text-white font-bold">{children}</strong>,
              code: ({ children }) => <code className="bg-white/10 px-1 rounded text-cyan-300 text-xs">{children}</code>,
            }}
          >
            {msg.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

export default function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I'm the VentureNerve AI. Ask me anything about our startups, risk metrics, or how RAR scoring works." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const conversationHistory = newMessages
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n\n");

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `${SYSTEM_CONTEXT}\n\n---\n\nConversation so far:\n${conversationHistory}\n\nRespond as the VentureNerve AI assistant:`,
    });

    setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:shadow-[0_0_40px_rgba(6,182,212,0.6)] flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        style={{ bottom: window.innerWidth < 1024 ? "80px" : "24px" }}
      >
        {open ? <X className="w-6 h-6 text-white" /> : <MessageCircle className="w-6 h-6 text-white" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed z-50 bg-[#0E1020] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{
            bottom: window.innerWidth < 1024 ? "148px" : "90px",
            right: "24px",
            width: "min(380px, calc(100vw - 48px))",
            height: "520px",
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 bg-white/[0.02]">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">VentureNerve AI</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                <span className="text-xs text-white/35">Online</span>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white/60 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin">
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-3 h-3 text-white" />
                </div>
                <div className="bg-white/[0.05] border border-white/8 rounded-2xl px-4 py-2.5 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                  <span className="text-xs text-white/40">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {messages.length === 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {[
                "Which startup has the best RAR?",
                "Explain fragility score",
                "Compare FleetForge vs NovaHealth",
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  className="text-xs bg-white/[0.04] border border-white/8 text-white/50 hover:text-white/70 hover:bg-white/[0.07] px-2.5 py-1.5 rounded-lg transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-4 py-3 border-t border-white/8 flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about startups, risk, IRR..."
              className="flex-1 bg-white/[0.04] border border-white/8 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-cyan-500/40 transition-colors"
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all flex-shrink-0"
            >
              <Send className="w-4 h-4 text-black" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
