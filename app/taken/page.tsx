"use client";

import { useState, useEffect } from "react";
import { CheckSquare, Plus, Trash2, Check, ChevronDown, ChevronUp, Flag } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { nl } from "date-fns/locale";

type Task = {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: "laag" | "normaal" | "hoog";
  dueDate: string | null;
  done: boolean;
  created_at: string;
};

const CATEGORIES = ["algemeen", "samen", "boodschappen", "thuis", "werk", "persoonlijk"];

const CATEGORY_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  algemeen:    { bg: "bg-warm",              text: "text-brown-light", dot: "bg-brown-light" },
  samen:       { bg: "bg-rose-light/50",     text: "text-rose",        dot: "bg-rose" },
  boodschappen:{ bg: "bg-sage-light/50",     text: "text-sage",        dot: "bg-sage" },
  thuis:       { bg: "bg-terracotta-light/30",text: "text-terracotta", dot: "bg-terracotta" },
  werk:        { bg: "bg-warm",              text: "text-brown",       dot: "bg-brown" },
  persoonlijk: { bg: "bg-rose-light/30",     text: "text-rose",        dot: "bg-rose-light" },
};

const PRIORITY_STYLE: Record<string, { color: string; label: string }> = {
  laag:    { color: "text-sage",        label: "Laag" },
  normaal: { color: "text-brown-light", label: "Normaal" },
  hoog:    { color: "text-rose",        label: "Hoog" },
};

const defaultForm = { title: "", description: "", category: "algemeen", priority: "normaal" as Task["priority"], dueDate: "" };

export default function TakenPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...defaultForm });
  const [filter, setFilter] = useState<"open" | "gedaan" | "alles">("open");
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    fetch("/api/taken").then((r) => r.json()).then((d) => setTasks(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }, []);

  async function addTask() {
    if (!form.title.trim()) return;
    const res = await fetch("/api/taken", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, dueDate: form.dueDate || null }),
    });
    const created = await res.json();
    setTasks((prev) => [created, ...prev]);
    setForm({ ...defaultForm });
    setShowForm(false);
  }

  async function toggleDone(task: Task) {
    const res = await fetch(`/api/taken/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !task.done }),
    });
    const updated = await res.json();
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
  }

  async function deleteTask(id: string) {
    await fetch(`/api/taken/${id}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  // Group open tasks by category
  const grouped = CATEGORIES.reduce<Record<string, Task[]>>((acc, cat) => {
    const catTasks = open.filter((t) => t.category === cat);
    if (catTasks.length > 0) acc[cat] = catTasks;
    return acc;
  }, {});

  const dueDateLabel = (task: Task) => {
    if (!task.dueDate) return null;
    const d = new Date(task.dueDate);
    if (isToday(d)) return { label: "Vandaag", urgent: true };
    if (isPast(d)) return { label: `Te laat – ${format(d, "d MMM", { locale: nl })}`, urgent: true };
    return { label: format(d, "d MMM", { locale: nl }), urgent: false };
  };

  return (
    <div className="max-w-2xl mx-auto pt-14 md:pt-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <CheckSquare className="text-sage" size={28} />
          <h1 className="font-display text-3xl text-brown">Taken</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-sage text-cream px-4 py-2 rounded-2xl text-sm font-semibold hover:bg-sage/80 transition-colors"
        >
          <Plus size={16} /> Nieuwe taak
        </button>
      </div>

      {/* Stats */}
      {tasks.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Open", count: open.length, color: "bg-warm", text: "text-brown" },
            { label: "Gedaan", count: done.length, color: "bg-sage-light/40", text: "text-sage" },
            { label: "Totaal", count: tasks.length, color: "bg-cream", text: "text-brown-light" },
          ].map(({ label, count, color, text }) => (
            <div key={label} className={`${color} rounded-2xl p-4 text-center border border-warm`}>
              <p className={`font-display text-2xl ${text}`}>{count}</p>
              <p className="text-xs text-brown-light">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Formulier */}
      {showForm && (
        <div className="bg-warm rounded-3xl p-5 border border-warm mb-6">
          <p className="font-semibold text-brown mb-4 text-sm">Nieuwe taak</p>
          <div className="flex flex-col gap-3">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder="Wat moet er gedaan worden?"
              autoFocus
              className="bg-cream rounded-xl border border-warm px-4 py-2 text-sm text-brown focus:outline-none focus:border-sage"
            />
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Extra details (optioneel)"
              className="bg-cream rounded-xl border border-warm px-4 py-2 text-sm text-brown focus:outline-none focus:border-sage"
            />
            <div className="flex gap-2 flex-wrap">
              <div className="flex-1 min-w-[140px]">
                <p className="text-xs text-brown-light mb-1">Categorie</p>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => {
                    const style = CATEGORY_STYLE[cat];
                    return (
                      <button
                        key={cat}
                        onClick={() => setForm({ ...form, category: cat })}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize transition-all ${
                          form.category === cat ? `${style.bg} ${style.text} ring-2 ring-offset-1 ring-current` : "bg-cream text-brown-light hover:bg-warm"
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-xs text-brown-light mb-1">Prioriteit</p>
                <div className="flex gap-1.5">
                  {(["laag", "normaal", "hoog"] as Task["priority"][]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setForm({ ...form, priority: p })}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize transition-all ${
                        form.priority === p ? "bg-brown text-cream" : "bg-cream text-brown-light hover:bg-warm"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs text-brown-light mb-1">Deadline (optioneel)</p>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="bg-cream rounded-xl border border-warm px-3 py-2 text-sm text-brown focus:outline-none focus:border-sage"
              />
            </div>
            <div className="flex gap-2 mt-1">
              <button onClick={addTask} className="flex-1 bg-sage text-cream rounded-xl py-2 text-sm font-semibold hover:bg-sage/80">Toevoegen</button>
              <button onClick={() => { setShowForm(false); setForm({ ...defaultForm }); }} className="flex-1 bg-cream text-brown-light rounded-xl py-2 text-sm hover:bg-warm">Annuleren</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-brown-light text-sm text-center mt-10">Laden...</p>
      ) : tasks.length === 0 ? (
        <div className="text-center mt-20">
          <p className="font-handwriting text-2xl text-brown-light">Geen taken 🌿</p>
          <p className="text-sm text-brown-light mt-1">Voeg jullie eerste taak toe!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Open taken gegroepeerd per categorie */}
          {Object.entries(grouped).map(([cat, catTasks]) => {
            const style = CATEGORY_STYLE[cat] ?? CATEGORY_STYLE.algemeen;
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                  <p className="text-xs font-bold text-brown-light uppercase tracking-wide capitalize">{cat}</p>
                  <span className="text-xs text-brown-light">({catTasks.length})</span>
                </div>
                <div className="flex flex-col gap-2">
                  {catTasks
                    .sort((a, b) => {
                      const order = { hoog: 0, normaal: 1, laag: 2 };
                      return order[a.priority] - order[b.priority];
                    })
                    .map((task) => (
                      <TaskRow key={task.id} task={task} onToggle={toggleDone} onDelete={deleteTask} dueDateLabel={dueDateLabel(task)} />
                    ))}
                </div>
              </div>
            );
          })}

          {/* Afgevinkte taken */}
          {done.length > 0 && (
            <div>
              <button
                onClick={() => setShowDone(!showDone)}
                className="flex items-center gap-2 text-xs font-bold text-brown-light uppercase tracking-wide mb-2 hover:text-brown transition-colors"
              >
                {showDone ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                Afgerond ({done.length})
              </button>
              {showDone && (
                <div className="flex flex-col gap-2">
                  {done.map((task) => (
                    <TaskRow key={task.id} task={task} onToggle={toggleDone} onDelete={deleteTask} dueDateLabel={null} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, onToggle, onDelete, dueDateLabel }: {
  task: Task;
  onToggle: (t: Task) => void;
  onDelete: (id: string) => void;
  dueDateLabel: { label: string; urgent: boolean } | null;
}) {
  const catStyle = CATEGORY_STYLE[task.category] ?? CATEGORY_STYLE.algemeen;
  const prioStyle = PRIORITY_STYLE[task.priority];

  return (
    <div className={`bg-cream rounded-2xl px-4 py-3 border border-warm flex items-start gap-3 group transition-opacity ${task.done ? "opacity-50" : ""}`}>
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task)}
        className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          task.done ? "bg-sage border-sage" : "border-warm hover:border-sage"
        }`}
      >
        {task.done && <Check size={10} className="text-cream" />}
      </button>

      {/* Inhoud */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`text-sm font-semibold text-brown ${task.done ? "line-through text-brown-light" : ""}`}>
            {task.title}
          </p>
          {/* Prioriteit vlag (alleen hoog) */}
          {task.priority === "hoog" && !task.done && (
            <Flag size={12} className="text-rose fill-rose shrink-0" />
          )}
          {/* Categorie badge */}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${catStyle.bg} ${catStyle.text}`}>
            {task.category}
          </span>
        </div>
        {task.description && (
          <p className="text-xs text-brown-light mt-0.5">{task.description}</p>
        )}
        {dueDateLabel && (
          <p className={`text-xs mt-1 font-semibold ${dueDateLabel.urgent ? "text-rose" : "text-brown-light"}`}>
            ⏰ {dueDateLabel.label}
          </p>
        )}
      </div>

      {/* Verwijderen */}
      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 text-rose/70 hover:text-rose transition-all shrink-0 mt-0.5"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
