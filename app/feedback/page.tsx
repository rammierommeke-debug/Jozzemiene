"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";

export default function FeedbackPage() {
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const issueUrl = `https://github.com/rammierommeke-debug/Jozzemiene/issues/new?body=${encodeURIComponent(text)}`;

  return (
    <div className="max-w-lg mx-auto pt-14 md:pt-0 px-4">
      <h1 className="font-display text-3xl text-brown mb-2">Verbeteringen</h1>
      <p className="text-brown-light text-sm mb-6">Wat wil je nog veranderen aan de website?</p>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Beschrijf wat je wil veranderen..."
        rows={8}
        className="w-full bg-warm rounded-2xl border border-warm px-4 py-3 text-sm text-brown focus:outline-none focus:border-sage resize-none"
      />

      <div className="flex gap-3 mt-4">
        <button onClick={copy} disabled={!text.trim()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cream border border-warm text-sm font-semibold text-brown-light hover:border-brown-light disabled:opacity-40 transition-colors">
          {copied ? <Check size={15} className="text-sage" /> : <Copy size={15} />}
          {copied ? "Gekopieerd!" : "Kopiëren"}
        </button>
        <a href={issueUrl} target="_blank" rel="noopener noreferrer"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl bg-terracotta text-cream text-sm font-semibold hover:bg-terracotta/80 transition-colors ${!text.trim() ? "pointer-events-none opacity-40" : ""}`}>
          <ExternalLink size={15} /> Stuur als issue
        </a>
      </div>
    </div>
  );
}
