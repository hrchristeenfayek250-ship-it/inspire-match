
"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const suggestions = [
  "Give me an overview of our recruitment pipeline.",
  "Which jobs need urgent attention?",
  "Where are candidates getting stuck?",
  "What should our recruitment team prioritize?",
];

export default function AskInspirePage() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  async function askAI(value) {
    const text = value.trim();
    if (!text || loading) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", text },
    ]);
    setQuestion("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session?.access_token) {
        throw new Error("Please sign in to use Ask Inspire AI.");
      }

      const response = await fetch("/api/ask-inspire", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ question: text }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "AI request failed.");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: result.answer,
          recommendations: result.recommendations || [],
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: error.message || "Something went wrong.",
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="ask-page">
      <style>{`
        .ask-page {
          min-height: 100vh;
          background: #f6f8fb;
          color: #1e293b;
          font-family: Arial, sans-serif;
          padding: 34px 24px 60px;
        }
        .ask-container {
          max-width: 1000px;
          margin: auto;
        }
        .ask-back {
          color: #315f50;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
        }
        .ask-header {
          padding: 36px 0 25px;
        }
        .ask-eyebrow {
          color: #315f50;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2px;
        }
        .ask-header h1 {
          font-size: clamp(28px, 4vw, 42px);
          margin: 12px 0;
          letter-spacing: -1px;
        }
        .ask-header p {
          color: #718096;
          font-size: 14px;
          line-height: 1.7;
        }
        .ask-panel {
          background: white;
          border: 1px solid #e6eaf0;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 8px 30px rgba(23,35,50,.04);
        }
        .ask-panel-top {
          background: #315f50;
          color: white;
          padding: 20px 25px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .ask-ai-icon {
          width: 42px;
          height: 42px;
          background: rgba(255,255,255,.15);
          border-radius: 12px;
          display: grid;
          place-items: center;
          font-size: 23px;
        }
        .ask-panel-top strong {
          font-size: 15px;
        }
        .ask-panel-top small {
          display: block;
          margin-top: 5px;
          opacity: .8;
          font-size: 11px;
        }
        .ask-messages {
          min-height: 340px;
          max-height: 540px;
          overflow-y: auto;
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .ask-empty {
          margin: auto;
          text-align: center;
          max-width: 440px;
        }
        .ask-empty-icon {
          font-size: 42px;
        }
        .ask-empty h2 {
          font-size: 21px;
          margin: 16px 0 8px;
        }
        .ask-empty p {
          color: #8994a3;
          line-height: 1.7;
          font-size: 13px;
        }
        .ask-bubble {
          max-width: 85%;
          padding: 17px 20px;
          border-radius: 16px;
          font-size: 13px;
          line-height: 1.8;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }
        .ask-bubble.user {
          background: #315f50;
          color: white;
          align-self: flex-end;
          border-bottom-right-radius: 4px;
        }
        .ask-bubble.assistant {
          background: #f1f6f3;
          color: #263b32;
          align-self: flex-start;
          border-bottom-left-radius: 4px;
        }
        .ask-bubble.error {
          background: #fff0ef;
          color: #a33b35;
        }
        .ask-recommendations {
          margin-top: 14px;
          border-top: 1px solid #d8e5dc;
          padding-top: 12px;
        }
        .ask-recommendations strong {
          display: block;
          margin-bottom: 8px;
        }
        .ask-recommendations ul {
          margin: 0;
          padding-left: 20px;
        }
        .ask-suggestions {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
          padding: 0 25px 20px;
        }
        .ask-suggestions button {
          border: 1px solid #d9e6df;
          background: #f5f9f6;
          color: #315f50;
          border-radius: 30px;
          padding: 10px 14px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
        }
        .ask-suggestions button:disabled {
          opacity: .5;
          cursor: not-allowed;
        }
        .ask-form {
          display: flex;
          gap: 12px;
          padding: 22px 25px;
          border-top: 1px solid #edf0f2;
        }
        .ask-form input {
          flex: 1;
          min-width: 0;
          border: 1px solid #dce5df;
          border-radius: 12px;
          padding: 15px;
          font-size: 13px;
          outline-color: #315f50;
        }
        .ask-form button {
          background: #315f50;
          color: white;
          border: 0;
          border-radius: 12px;
          padding: 0 25px;
          font-weight: 700;
          cursor: pointer;
        }
        .ask-form button:disabled {
          opacity: .5;
          cursor: not-allowed;
        }
        @media (max-width: 600px) {
          .ask-page { padding: 20px 12px; }
          .ask-messages { padding: 18px; }
          .ask-bubble { max-width: 95%; }
          .ask-form { padding: 15px; }
          .ask-form button { padding: 0 16px; }
        }
      `}</style>

      <div className="ask-container">
        <Link href="/app/dashboard" className="ask-back">
          ← Back to Dashboard
        </Link>

        <header className="ask-header">
          <span className="ask-eyebrow">
            INSPIRE MATCH INTELLIGENCE
          </span>
          <h1>Ask Inspire AI</h1>
          <p>
            Your AI-powered recruitment analytics assistant.
            Explore hiring trends, identify bottlenecks,
            and get actionable recommendations.
          </p>
        </header>

        <section className="ask-panel">
          <div className="ask-panel-top">
            <div className="ask-ai-icon">✦</div>
            <div>
              <strong>Inspire Intelligence</strong>
              <small>
                AI recruitment insights · Company data
              </small>
            </div>
          </div>

          <div className="ask-messages" role="log" aria-live="polite">
            {messages.length === 0 ? (
              <div className="ask-empty">
                <div className="ask-empty-icon">✦</div>
                <h2>How can I help you today?</h2>
                <p>
                  Ask questions about your recruitment
                  pipeline, jobs, hiring progress,
                  and team priorities.
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`ask-bubble ${message.role} ${
                    message.error ? "error" : ""
                  }`}
                >
                  {message.text}

                  {message.recommendations?.length > 0 && (
                    <div className="ask-recommendations">
                      <strong>Recommended Actions</strong>
                      <ul>
                        {message.recommendations.map(
                          (item, i) => (
                            <li key={i}>{item}</li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              ))
            )}

            {loading && (
              <div className="ask-bubble assistant">
                Inspire AI is analyzing...
              </div>
            )}
          </div>

          <div className="ask-suggestions">
            {suggestions.map((item) => (
              <button
                key={item}
                type="button"
                disabled={loading}
                onClick={() => askAI(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <form
            className="ask-form"
            onSubmit={(event) => {
              event.preventDefault();
              askAI(question);
            }}
          >
            <input
              value={question}
              onChange={(event) =>
                setQuestion(event.target.value)
              }
              maxLength={1000}
              placeholder="Ask anything about recruitment..."
              aria-label="Ask Inspire AI a question"
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
            >
              {loading ? "Thinking..." : "Ask AI →"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
