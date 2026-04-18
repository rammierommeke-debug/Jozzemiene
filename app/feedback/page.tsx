"use client";

import { useState, useEffect } from "react";
import { Copy, Check, ExternalLink, Save, Trash2 } from "lucide-react";

type Issue = { id: string; text: string; created_at: string };

export default function FeedbackPage() {
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);

  useEffect(() => {
    fetch("/api/feedback").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setIssues(data);
    });
  }, []);

  function copy(t: string) {
    navigator.clipboard.writeText(t);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function save() {
    if (!text.trim()) return;
    setSaving(true);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const saved = await res.json();
    setIssues(prev => [saved, ...prev]);
    setText("");
    setSaving(false);
  }

  async function remove(id: string) {
    await fetch("/api/feedback", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setIssues(prev => prev.filter(i => i.id !== id));
  }

  function issueUrl(t: string) {
    const firstLine = t.split(/[\n.!?]/)[0].trim().slice(0, 60);
    const title = firstLine || "Website verbetering";
    return `https://github.com/rammierommeke-debug/Jozzemiene/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(`@claude ${t}`)}`;
  }

  return (
    <div className="max-w-lg mx-auto pt-14 md:pt-0 px-4 pb-8">
      <h1 className="font-display text-3xl text-brown mb-2">Verbeteringen</h1>
      <p className="text-brown-light text-sm mb-6">Wat wil je nog veranderen aan de website?</p>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Beschrijf wat je wil veranderen..."
        rows={5}
        className="w-full bg-warm rounded-2xl border border-warm px-4 py-3 text-sm text-brown focus:outline-none focus:border-sage resize-none"
      />

      <div className="flex gap-3 mt-3">
        <button onClick={save} disabled={!text.trim() || saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sage text-cream text-sm font-semibold hover:bg-sage/80 disabled:opacity-40 transition-colors">
          <Save size={15} /> {saving ? "Opslaan…" : "Opslaan"}
        </button>
        <button onClick={() => copy(text)} disabled={!text.trim()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cream border border-warm text-sm font-semibold text-brown-light hover:border-brown-light disabled:opacity-40 transition-colors">
          {copied ? <Check size={15} className="text-sage" /> : <Copy size={15} />}
          {copied ? "Gekopieerd!" : "Kopiëren"}
        </button>
        <a href={issueUrl(text)} target="_blank" rel="noopener noreferrer"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl bg-terracotta text-cream text-sm font-semibold hover:bg-terracotta/80 transition-colors ${!text.trim() ? "pointer-events-none opacity-40" : ""}`}>
          <ExternalLink size={15} /> Issue
        </a>
      </div>

      {issues.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-semibold text-brown-light uppercase tracking-wide mb-3">Opgeslagen issues</p>
          <ul className="flex flex-col gap-3">
            {issues.map(issue => (
              <li key={issue.id} className="bg-warm rounded-2xl px-4 py-3 flex gap-3 items-start">
                <p className="flex-1 text-sm text-brown whitespace-pre-wrap">{issue.text}</p>
                <div className="flex gap-2 shrink-0 mt-0.5">
                  <button onClick={() => copy(issue.text)} className="text-brown-light hover:text-terracotta transition-colors" title="Kopiëren">
                    <Copy size={14} />
                  </button>
                  <a href={issueUrl(issue.text)} target="_blank" rel="noopener noreferrer"
                    className="text-brown-light hover:text-terracotta transition-colors" title="Stuur als issue">
                    <ExternalLink size={14} />
                  </a>
                  <button onClick={() => remove(issue.id)} className="text-brown-light hover:text-rose transition-colors" title="Verwijderen">
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
