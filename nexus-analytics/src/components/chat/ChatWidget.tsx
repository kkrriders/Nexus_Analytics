"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { clsx } from "@/lib/clsx";
import { createClient } from "@/lib/supabase/client";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

const SUGGESTIONS = [
  "What's my ROAS?",
  "What's my best campaign?",
  "Any critical alerts?",
  "What should I do next?",
];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: "Hi! Ask me about your spend, revenue, ROAS, campaigns, or alerts — I'll answer in plain English." },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || sending) return;

    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setSending(true);

    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Please sign in again to use the assistant.");

      const res = await fetch(`${apiUrl}/api/chat`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: question }),
      });
      if (res.status === 404) throw new Error("Connect a Google Ads or Meta Ads account in Settings first — I don't have any data to answer from yet.");
      if (!res.ok) throw new Error(`Assistant request failed (${res.status})`);
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", text: data.reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: e instanceof Error ? e.message : "Something went wrong — please try again." }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close assistant" : "Open assistant"}
        className="fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-full bg-primary text-white shadow-lg hover:bg-[#4338CA] transition-all flex items-center justify-center active:scale-95"
      >
        <Icon name={open ? "close" : "smart_toy"} className="text-[24px]" fill={!open} />
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-[60] w-[360px] max-w-[calc(100vw-3rem)] h-[480px] max-h-[calc(100vh-8rem)] bg-surface-bright border border-outline-variant rounded-[16px] shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3.5 border-b border-outline-variant flex items-center gap-2.5 bg-[#F5F3FF]/50">
            <div className="w-8 h-8 rounded-[8px] bg-ai flex items-center justify-center shrink-0">
              <Icon name="smart_toy" className="text-white text-[16px]" fill />
            </div>
            <div>
              <p className="text-[13px] font-bold text-on-surface leading-tight">Nexus Assistant</p>
              <p className="text-[11px] text-on-surface-variant leading-tight">Ask about your analytics</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={clsx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={clsx(
                    "max-w-[85%] px-3.5 py-2.5 rounded-[12px] text-[13px] leading-relaxed whitespace-pre-wrap",
                    m.role === "user" ? "bg-primary text-white rounded-br-[4px]" : "bg-surface-container-low text-on-surface rounded-bl-[4px]",
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-surface-container-low text-on-surface-variant px-3.5 py-2.5 rounded-[12px] rounded-bl-[4px] text-[13px]">
                  Thinking…
                </div>
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="p-3 border-t border-outline-variant flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              disabled={sending}
              className="flex-1 px-3 py-2 rounded-[10px] border border-outline-variant text-[13px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="w-9 h-9 rounded-[10px] bg-primary text-white flex items-center justify-center disabled:opacity-40 transition-opacity"
              aria-label="Send"
            >
              <Icon name="send" className="text-[16px]" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
