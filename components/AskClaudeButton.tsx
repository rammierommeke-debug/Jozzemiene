"use client";

export default function AskClaudeButton() {
  function handleClick() {
    window.open("https://claude.ai/new", "_blank");
  }

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 flex items-center gap-2 bg-brown text-cream px-4 py-2.5 rounded-full shadow-lg hover:bg-brown/80 active:scale-95 transition-all text-sm font-semibold"
    >
      <span className="text-base">✦</span> Ask Claude
    </button>
  );
}
