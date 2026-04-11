"use client";

import { useState, useEffect } from "react";
import { Lightbulb, Plus, Trash2, Check } from "lucide-react";

type Idea = {
  id: string;
  title: string;
  description: string;
  category: string;
  done: boolean;
  created_at: string;
};

const CATEGORIES = ["date night", "travel", "activity", "movie", "restaurant", "other"];
const CATEGORY_COLORS: Record<string, string> = {
  "date night": "bg-rose-light text-rose",
  travel: "bg-sage-light text-sage",
  activity: "bg-terracotta-light/40 text-terracotta",
  movie: "bg-warm text-brown-light",
  restaurant: "bg-rose-light/60 text-rose",
  other: "bg-cream text-brown-light",
};

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("date night");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ideas")
      .then((r) => r.json())
      .then((data) => setIdeas(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  async function addIdea() {
    if (!title.trim()) return;
    const res = await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, category }),
    });
    const created = await res.json();
    setIdeas((prev) => [created, ...prev]);
    setTitle("");
    setDescription("");
  }

  async function toggleDone(idea: Idea) {
    const res = await fetch(`/api/ideas/${idea.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !idea.done }),
    });
    const updated = await res.json();
    setIdeas((prev) => prev.map((i) => (i.id === idea.id ? updated : i)));
  }

  async function deleteIdea(id: string) {
    await fetch(`/api/ideas/${id}`, { method: "DELETE" });
    setIdeas((prev) => prev.filter((i) => i.id !== id));
  }

  const filtered =
    filter === "all" ? ideas : filter === "done" ? ideas.filter((i) => i.done) : ideas.filter((i) => !i.done && i.category === filter);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Lightbulb className="text-terracotta" size={28} />
        <h1 className="font-display text-3xl text-brown">Our Ideas</h1>
      </div>

      {/* Add idea form */}
      <div className="bg-warm rounded-3xl p-6 border border-warm mb-8">
        <p className="font-semibold text-brown mb-3 text-sm">New idea</p>
        <div className="flex flex-col gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's the idea? ✨"
            className="bg-cream rounded-xl border border-warm px-4 py-2 text-sm text-brown focus:outline-none focus:border-terracotta"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Any details? (optional)"
            className="bg-cream rounded-xl border border-warm px-4 py-2 text-sm text-brown focus:outline-none focus:border-terracotta"
          />
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all ${
                  category === cat
                    ? "bg-terracotta text-cream"
                    : "bg-cream text-brown-light hover:bg-terracotta/20"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <button
            onClick={addIdea}
            className="self-end flex items-center gap-2 bg-terracotta text-cream px-5 py-2.5 rounded-2xl text-sm font-semibold hover:bg-terracotta/80 transition-colors"
          >
            <Plus size={16} /> Add Idea
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap mb-5">
        {["all", ...CATEGORIES, "done"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all ${
              filter === f ? "bg-brown text-cream" : "bg-warm text-brown-light hover:bg-warm/80"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Ideas list */}
      {loading ? (
        <p className="text-brown-light text-sm text-center mt-10">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center mt-16">
          <p className="font-handwriting text-2xl text-brown-light">No ideas here yet 💭</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((idea) => (
            <div
              key={idea.id}
              className={`bg-cream rounded-3xl p-5 border border-warm flex gap-4 items-start group transition-opacity ${
                idea.done ? "opacity-60" : ""
              }`}
            >
              <button
                onClick={() => toggleDone(idea)}
                className={`mt-0.5 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  idea.done
                    ? "bg-sage border-sage text-cream"
                    : "border-warm hover:border-sage"
                }`}
              >
                {idea.done && <Check size={12} />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className={`font-semibold text-brown text-sm ${idea.done ? "line-through" : ""}`}>
                    {idea.title}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${CATEGORY_COLORS[idea.category] ?? "bg-cream text-brown-light"}`}>
                    {idea.category}
                  </span>
                </div>
                {idea.description && (
                  <p className="text-xs text-brown-light">{idea.description}</p>
                )}
              </div>
              <button
                onClick={() => deleteIdea(idea.id)}
                className="opacity-0 group-hover:opacity-100 text-rose hover:text-rose/70 transition-all shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
