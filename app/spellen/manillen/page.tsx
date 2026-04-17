"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Trophy, RotateCcw } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type Suit = "♠" | "♥" | "♦" | "♣";
type Value = "6" | "7" | "8" | "9" | "Z" | "D" | "H" | "A" | "M";

interface Card { suit: Suit; value: Value; id: string }

type Player = "emma" | "roel";

interface PlayerState {
  open: Card[];   // 4 tafelkaarten, zichtbaar voor iedereen
  hand: Card[];   // gedekte kaarten, alleen eigenaar ziet ze
}

interface TrickPlay { player: Player; card: Card; fromOpen: boolean }

interface GameState {
  deck: Card[];
  players: Record<Player, PlayerState>;
  trick: TrickPlay[];
  trickWinner: Player | null;
  scores: Record<Player, number>;
  tricksWon: Record<Player, number>;
  currentPlayer: Player;
  phase: "playing" | "finished";
  roundWinner: Player | null;
  log: string[];
}

// ── Card constants ────────────────────────────────────────────────────────────

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
// 6 7 8 9 Zot Dame Heer Aas Manille(10) — rank laag→hoog
const VALUES: Value[] = ["6", "7", "8", "9", "Z", "D", "H", "A", "M"];

const RANK: Record<Value, number> = {
  "6": 0, "7": 1, "8": 2, "9": 3, "Z": 4, "D": 5, "H": 6, "A": 7, "M": 8,
};
// Manille=5, Aas=4, Heer=3, Dame=2, Zot=1 → 4×15=60pt totaal
const POINTS: Record<Value, number> = {
  "6": 0, "7": 0, "8": 0, "9": 0, "Z": 1, "D": 2, "H": 3, "A": 4, "M": 5,
};
const VLABEL: Record<Value, string> = {
  "6": "6", "7": "7", "8": "8", "9": "9", "Z": "Z", "D": "D", "H": "H", "A": "A", "M": "10",
};

function makeCard(suit: Suit, value: Value): Card {
  return { suit, value, id: suit + value };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function beats(challenger: Card, defender: Card): boolean {
  if (challenger.suit !== defender.suit) return false;
  return RANK[challenger.value] > RANK[defender.value];
}

function resolveTrick(trick: TrickPlay[]): Player {
  let winner = trick[0];
  for (const play of trick.slice(1)) {
    if (beats(play.card, winner.card)) winner = play;
  }
  return winner.player;
}

// ── New game ──────────────────────────────────────────────────────────────────

function newGame(): GameState {
  const deck = shuffle([...SUITS].flatMap(s => VALUES.map(v => makeCard(s, v))));
  const e = deck.splice(0, 8);
  const r = deck.splice(0, 8);
  return {
    deck,
    players: {
      emma: { open: e.slice(0, 4), hand: e.slice(4) },
      roel: { open: r.slice(0, 4), hand: r.slice(4) },
    },
    trick: [],
    trickWinner: null,
    scores: { emma: 0, roel: 0 },
    tricksWon: { emma: 0, roel: 0 },
    currentPlayer: "emma",
    phase: "playing",
    roundWinner: null,
    log: ["Nieuw spel — Emma begint!"],
  };
}

// ── Card components ───────────────────────────────────────────────────────────

const RED_SUITS = new Set(["♥", "♦"]);

function CardFace({
  card, selected, disabled, onClick, small,
}: {
  card: Card; selected?: boolean; disabled?: boolean; onClick?: () => void; small?: boolean;
}) {
  const red = RED_SUITS.has(card.suit);
  const w = small ? "w-12 h-16" : "w-14 h-20";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative ${w} rounded-xl border-2 bg-white flex flex-col items-start justify-start p-1
        font-bold select-none transition-all duration-150 shrink-0
        ${red ? "text-red-500" : "text-gray-800"}
        ${selected ? "border-terracotta -translate-y-3 shadow-lg ring-2 ring-terracotta/30" : "border-gray-200 shadow-sm"}
        ${!disabled ? "cursor-pointer hover:-translate-y-1 hover:shadow-md active:scale-95" : "cursor-default"}
        ${disabled && !selected ? "opacity-80" : ""}
      `}
    >
      <span className="text-xs leading-none font-bold">{VLABEL[card.value]}</span>
      <span className="text-xs leading-none">{card.suit}</span>
      <span className="absolute inset-0 flex items-center justify-center text-lg opacity-30 pointer-events-none">
        {card.suit}
      </span>
      {POINTS[card.value] > 0 && (
        <span className="absolute bottom-0.5 right-1 text-[8px] font-semibold text-amber-500 leading-none">
          {POINTS[card.value]}p
        </span>
      )}
    </button>
  );
}

function CardBack({ small }: { small?: boolean }) {
  const w = small ? "w-12 h-16" : "w-14 h-20";
  return (
    <div className={`${w} rounded-xl border-2 border-terracotta/40 bg-gradient-to-br from-terracotta/80 to-rose/60 shadow-sm flex items-center justify-center shrink-0`}>
      <span className="text-white text-lg">🌿</span>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PNAME: Record<Player, string> = { emma: "Emma", roel: "Roel" };
const PCOLOR: Record<Player, string> = { emma: "text-rose", roel: "text-blue-500" };
const PBG: Record<Player, string> = { emma: "bg-rose/10 border-rose/30", roel: "bg-blue-50 border-blue-200" };

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ManillenPage() {
  const [game, setGame] = useState<GameState | null>(null);
  const [me, setMe] = useState<Player | null>(null);
  const [selected, setSelected] = useState<{ id: string; fromOpen: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadGame = useCallback(async () => {
    try {
      const res = await fetch("/api/manillen");
      const data = await res.json();
      setGame(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadGame(); }, [loadGame]);
  useEffect(() => {
    const id = setInterval(loadGame, 3000);
    return () => clearInterval(id);
  }, [loadGame]);

  async function saveGame(state: GameState) {
    setSaving(true);
    setGame(state);
    await fetch("/api/manillen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });
    setSaving(false);
  }

  async function startNewGame() {
    setSelected(null);
    await saveGame(newGame());
  }

  function handleCardClick(card: Card, fromOpen: boolean) {
    if (!game || !me || game.currentPlayer !== me || game.phase !== "playing") return;
    if (selected?.id === card.id) {
      // Second tap → play the card
      playCard(card, fromOpen);
    } else {
      setSelected({ id: card.id, fromOpen });
    }
  }

  function playCard(card: Card, fromOpen: boolean) {
    if (!game || !me) return;

    const newTrick: TrickPlay[] = [...game.trick, { player: me, card, fromOpen }];

    // Remove card from player's hand
    const updatedMe: PlayerState = {
      open: fromOpen ? game.players[me].open.filter(c => c.id !== card.id) : game.players[me].open,
      hand: !fromOpen ? game.players[me].hand.filter(c => c.id !== card.id) : game.players[me].hand,
    };

    const newPlayers = { ...game.players, [me]: updatedMe };
    const other: Player = me === "emma" ? "roel" : "emma";

    setSelected(null);

    if (newTrick.length < 2) {
      // First card — wait for opponent
      saveGame({
        ...game,
        players: newPlayers,
        trick: newTrick,
        trickWinner: null,
        currentPlayer: other,
        log: [`${PNAME[me]} speelt ${card.suit}${VLABEL[card.value]}`, ...game.log].slice(0, 20),
      });
      return;
    }

    // Both played — resolve trick
    const winner = resolveTrick(newTrick);
    const pts = newTrick.reduce((s, p) => s + POINTS[p.card.value], 0);
    const newScores = { ...game.scores, [winner]: game.scores[winner] + pts };
    const newTricksWon = { ...game.tricksWon, [winner]: game.tricksWon[winner] + 1 };
    const loser: Player = winner === "emma" ? "roel" : "emma";

    // Draw from deck: winner first, then loser
    const newDeck = [...game.deck];
    function drawInto(ps: PlayerState): PlayerState {
      if (newDeck.length === 0) return ps;
      const drawn = newDeck.shift()!;
      return { ...ps, open: [...ps.open, drawn] };
    }
    const afterDraw: Record<Player, PlayerState> = { ...newPlayers };
    afterDraw[winner] = drawInto(afterDraw[winner]);
    afterDraw[loser] = drawInto(afterDraw[loser]);

    const totalCards = afterDraw.emma.open.length + afterDraw.emma.hand.length +
      afterDraw.roel.open.length + afterDraw.roel.hand.length + newDeck.length;
    const finished = totalCards === 0;
    const roundWinner = finished
      ? (newScores.emma > newScores.roel ? "emma" : newScores.roel > newScores.emma ? "roel" : null)
      : null;

    saveGame({
      ...game,
      deck: newDeck,
      players: afterDraw,
      trick: [],
      trickWinner: winner,
      scores: newScores,
      tricksWon: newTricksWon,
      currentPlayer: winner,
      phase: finished ? "finished" : "playing",
      roundWinner,
      log: [`${PNAME[winner]} wint slag! +${pts}pt`, `${PNAME[me]} speelt ${card.suit}${VLABEL[card.value]}`, ...game.log].slice(0, 20),
    });
  }

  // ── Login screen ───────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="animate-spin text-terracotta" size={28} />
    </div>
  );

  if (!me) return (
    <div className="max-w-sm mx-auto pt-14 md:pt-0 flex flex-col items-center gap-6 px-4">
      <div className="text-center mt-8">
        <p className="text-6xl mb-3">🃏</p>
        <h1 className="font-display text-3xl text-brown mb-1">Manillen</h1>
        <p className="text-brown-light text-sm">Wie ben jij?</p>
      </div>
      <div className="flex gap-4 w-full">
        {(["emma", "roel"] as Player[]).map(p => (
          <button key={p} onClick={() => setMe(p)}
            className={`flex-1 rounded-2xl py-5 font-display text-xl border-2 transition-all ${PBG[p]} ${PCOLOR[p]} hover:scale-105`}>
            {PNAME[p]}
          </button>
        ))}
      </div>
      <button onClick={startNewGame}
        className="w-full bg-terracotta text-cream rounded-2xl py-3 font-semibold hover:bg-terracotta/80 transition-colors">
        Nieuw spel starten
      </button>
    </div>
  );

  if (!game) return (
    <div className="max-w-sm mx-auto pt-14 md:pt-0 flex flex-col items-center gap-4 px-4">
      <p className="text-5xl mt-8">🃏</p>
      <p className="font-display text-xl text-brown">Geen actief spel</p>
      <button onClick={startNewGame}
        className="bg-terracotta text-cream rounded-2xl px-6 py-3 font-semibold hover:bg-terracotta/80 transition-colors">
        Nieuw spel starten
      </button>
    </div>
  );

  const opp: Player = me === "emma" ? "roel" : "emma";
  const mine = game.players[me];
  const theirs = game.players[opp];
  const isMyTurn = game.currentPlayer === me && game.phase === "playing";
  const myPlayedCard = game.trick.find(t => t.player === me);
  const oppPlayedCard = game.trick.find(t => t.player === opp);

  // ── Game board ─────────────────────────────────────────────────────────────

  return (
    <div className="max-w-lg mx-auto pt-14 md:pt-0 pb-6 px-3 flex flex-col gap-3 min-h-screen">

      {/* Header */}
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">🃏</span>
          <span className="font-display text-xl text-brown">Manillen</span>
          {saving && <RefreshCw className="animate-spin text-brown-light" size={12} />}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setMe(opp)} className="text-xs text-brown-light hover:text-terracotta transition-colors underline">
            Speel als {PNAME[opp]}
          </button>
          <button onClick={startNewGame} className="flex items-center gap-1 text-xs text-brown-light hover:text-rose transition-colors">
            <RotateCcw size={12} /> Nieuw
          </button>
        </div>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-2 gap-2">
        {(["emma", "roel"] as Player[]).map(p => (
          <div key={p} className={`rounded-2xl p-2.5 border-2 transition-all ${
            game.currentPlayer === p && game.phase === "playing"
              ? "border-terracotta bg-terracotta/5"
              : "border-warm bg-warm"
          }`}>
            <p className={`text-xs font-semibold ${PCOLOR[p]}`}>{PNAME[p]} {p === me ? "(jij)" : ""}</p>
            {game.phase === "finished" ? (
              <p className="font-display text-xl text-brown leading-tight">{game.scores[p]}<span className="text-xs font-normal text-brown-light ml-0.5">pt</span></p>
            ) : (
              <p className="font-display text-xl text-brown-light leading-tight">—</p>
            )}
            <p className="text-[10px] text-brown-light">{game.tricksWon[p]} slagen · {game.deck.length} in stapel</p>
          </div>
        ))}
      </div>

      {/* Finished */}
      {game.phase === "finished" && (
        <div className="bg-warm rounded-3xl p-5 text-center border-2 border-terracotta">
          <Trophy className="text-amber-400 mx-auto mb-2" size={28} />
          <p className="font-display text-2xl text-brown mb-1">
            {game.roundWinner ? `${PNAME[game.roundWinner]} wint!` : "Gelijkspel!"}
          </p>
          <p className="text-sm text-brown-light mb-3">Emma {game.scores.emma}pt — Roel {game.scores.roel}pt</p>
          <button onClick={startNewGame}
            className="bg-terracotta text-cream rounded-xl px-5 py-2 text-sm font-semibold hover:bg-terracotta/80 transition-colors">
            Nog een ronde
          </button>
        </div>
      )}

      {/* ── OPPONENT SECTION ── */}
      <div className={`rounded-3xl p-3 border ${PBG[opp]}`}>
        <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${PCOLOR[opp]}`}>
          {PNAME[opp]} — hand ({theirs.hand.length} gedekt)
        </p>
        {/* Opponent's face-down hand */}
        <div className="flex gap-1 mb-3">
          {theirs.hand.map((_, i) => <CardBack key={i} small />)}
          {theirs.hand.length === 0 && <p className="text-xs text-brown-light italic">Geen kaarten in hand</p>}
        </div>
        {/* Opponent's open table cards */}
        <p className="text-[10px] text-brown-light uppercase tracking-wide mb-1.5">Open tafelkaarten</p>
        <div className="flex gap-1.5 flex-wrap">
          {theirs.open.map(c => <CardFace key={c.id} card={c} disabled small />)}
          {theirs.open.length === 0 && <p className="text-xs text-brown-light italic">Geen open kaarten</p>}
        </div>
      </div>

      {/* ── TRICK AREA ── */}
      <div className="bg-warm rounded-3xl p-3 flex items-center justify-center gap-8 min-h-[90px] border border-warm/60">
        {game.trick.length === 0 ? (
          <p className="text-sm text-brown-light text-center">
            {game.trickWinner
              ? `${PNAME[game.trickWinner]} won de slag`
              : isMyTurn ? "Jouw beurt — kies een kaart" : `Wachten op ${PNAME[game.currentPlayer]}…`}
          </p>
        ) : (
          <>
            {([opp, me] as Player[]).map(p => {
              const played = game.trick.find(t => t.player === p);
              return (
                <div key={p} className="flex flex-col items-center gap-1">
                  <p className={`text-[10px] font-semibold ${PCOLOR[p]}`}>{PNAME[p]}</p>
                  {played ? <CardFace card={played.card} disabled /> : (
                    <div className="w-14 h-20 rounded-xl border-2 border-dashed border-warm/80 flex items-center justify-center">
                      <span className="text-brown-light text-xs">…</span>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* ── MY SECTION ── */}
      <div className={`rounded-3xl p-3 border ${PBG[me]}`}>
        {/* My open table cards */}
        <p className="text-[10px] text-brown-light uppercase tracking-wide mb-1.5">Mijn open tafelkaarten</p>
        <div className="flex gap-1.5 flex-wrap mb-3">
          {mine.open.map(c => {
            const sel = selected?.id === c.id && selected.fromOpen;
            return (
              <CardFace key={c.id} card={c} selected={sel} disabled={!isMyTurn || !!myPlayedCard}
                onClick={() => handleCardClick(c, true)} small />
            );
          })}
          {mine.open.length === 0 && <p className="text-xs text-brown-light italic">Geen open kaarten</p>}
        </div>

        {/* My hand */}
        <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${PCOLOR[me]}`}>
          Mijn hand ({mine.hand.length} kaarten)
          {!isMyTurn && game.phase === "playing" && (
            <span className="ml-1 normal-case font-normal text-brown-light">— wacht op {PNAME[opp]}</span>
          )}
        </p>
        <div className="flex gap-1.5 flex-wrap">
          {mine.hand.map(c => {
            const sel = selected?.id === c.id && !selected.fromOpen;
            return (
              <CardFace key={c.id} card={c} selected={sel} disabled={!isMyTurn || !!myPlayedCard}
                onClick={() => handleCardClick(c, false)} />
            );
          })}
          {mine.hand.length === 0 && <p className="text-xs text-brown-light italic">Geen kaarten in hand</p>}
        </div>

        {isMyTurn && selected && !myPlayedCard && (
          <p className="text-xs text-terracotta mt-2">Tik nog eens op de kaart om te spelen</p>
        )}
        {myPlayedCard && game.trick.length === 1 && (
          <p className="text-xs text-brown-light mt-2">Wachten op {PNAME[opp]}…</p>
        )}
      </div>

      {/* Log */}
      <div className="bg-warm rounded-2xl p-3 max-h-28 overflow-y-auto">
        <p className="text-[10px] font-semibold text-brown-light uppercase tracking-wide mb-1">Spelverloop</p>
        {game.log.map((entry, i) => (
          <p key={i} className={`text-xs leading-relaxed ${i === 0 ? "text-brown font-semibold" : "text-brown-light"}`}>{entry}</p>
        ))}
      </div>

    </div>
  );
}
