"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Trophy, RotateCcw, ArrowLeft } from "lucide-react";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────────────────────

type Suit = "♠" | "♥" | "♦" | "♣";
type Value = "7" | "8" | "9" | "Z" | "D" | "H" | "A" | "M";
type Phase = "choosing_trump" | "playing" | "finished";

interface Card { suit: Suit; value: Value; id: string }
type Player = "emma" | "roel";

// Each slot = 1 stapeltje: open kaart bovenop, hidden eronder
// hidden is null wanneer de open kaart al gespeeld is (hidden werd onthuld)
interface Slot { open: Card | null; hidden: Card | null }

interface PlayerState {
  slots: Slot[];   // 4 stapeltjes
  drawn: Card[];   // getrokken kaarten (altijd open, geen hidden partner)
}

interface TrickPlay { player: Player; card: Card }

interface GameState {
  deck: Card[];
  players: Record<Player, PlayerState>;
  trick: TrickPlay[];
  trickWinner: Player | null;
  scores: Record<Player, number>;
  tricksWon: Record<Player, number>;
  currentPlayer: Player;
  phase: Phase;
  trump: Suit | null;
  firstPlayer: Player;
  roundWinner: Player | null;
  log: string[];
}

// ── Card constants ────────────────────────────────────────────────────────────

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const SUIT_LABEL: Record<Suit, string> = { "♠": "Schoppen", "♥": "Harten", "♦": "Ruiten", "♣": "Klaveren" };
const VALUES: Value[] = ["7", "8", "9", "Z", "D", "H", "A", "M"];

const RANK: Record<Value, number> = {
  "7": 0, "8": 1, "9": 2, "Z": 3, "D": 4, "H": 5, "A": 6, "M": 7,
};
const POINTS: Record<Value, number> = {
  "7": 0, "8": 0, "9": 0, "Z": 1, "D": 2, "H": 3, "A": 4, "M": 5,
};
const VLABEL: Record<Value, string> = {
  "7": "7", "8": "8", "9": "9", "Z": "Z", "D": "D", "H": "H", "A": "A", "M": "10",
};

function makeCard(suit: Suit, value: Value): Card { return { suit, value, id: suit + value }; }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Game logic ────────────────────────────────────────────────────────────────

function resolveTrick(trick: TrickPlay[], trump: Suit | null): Player {
  const leadSuit = trick[0].card.suit;
  let winner = trick[0];
  for (const play of trick.slice(1)) {
    const wT = winner.card.suit === trump;
    const cT = play.card.suit === trump;
    if (wT && !cT) continue;
    if (!wT && cT) { winner = play; continue; }
    if (play.card.suit === winner.card.suit && RANK[play.card.value] > RANK[winner.card.value]) winner = play;
  }
  return winner.player;
}

// Alle speelbare kaarten (bovenste open kaarten + getrokken kaarten)
function playableCards(ps: PlayerState): Card[] {
  const cards: Card[] = [];
  for (const slot of ps.slots) if (slot.open) cards.push(slot.open);
  cards.push(...ps.drawn);
  return cards;
}

// Welke kaarten zijn legaal te spelen (volgplicht / troefplicht)
function legalCards(ps: PlayerState, leadSuit: Suit, trump: Suit | null): Set<string> {
  const all = playableCards(ps);
  const hasLead = all.some(c => c.suit === leadSuit);
  if (hasLead) return new Set(all.filter(c => c.suit === leadSuit).map(c => c.id));
  if (trump) {
    const hasTrump = all.some(c => c.suit === trump);
    if (hasTrump) return new Set(all.filter(c => c.suit === trump).map(c => c.id));
  }
  return new Set(all.map(c => c.id));
}

// Verwijder een kaart uit de PlayerState; onthul hidden als open gespeeld werd
function removeCard(ps: PlayerState, cardId: string): PlayerState {
  // Check slots
  const newSlots = ps.slots.map(slot => {
    if (slot.open?.id === cardId) {
      // Open kaart gespeeld → hidden wordt nieuwe open (onthuld)
      return { open: slot.hidden, hidden: null };
    }
    return slot;
  });
  // Check drawn
  const newDrawn = ps.drawn.filter(c => c.id !== cardId);
  return { slots: newSlots, drawn: newDrawn };
}

function totalCards(ps: PlayerState): number {
  return ps.slots.reduce((s, sl) => s + (sl.open ? 1 : 0) + (sl.hidden ? 1 : 0), 0) + ps.drawn.length;
}

// ── New game ──────────────────────────────────────────────────────────────────

function newGame(firstPlayer: Player): GameState {
  const deck = shuffle(SUITS.flatMap(s => VALUES.map(v => makeCard(s, v))));
  function dealPlayer(): PlayerState {
    const slotCards = deck.splice(0, 8);
    const handCards = deck.splice(0, 8);
    // 4 stapeltjes: kaarten 0-3 zijn open (bovenop), kaarten 4-7 zijn hidden (eronder)
    const slots: Slot[] = [0, 1, 2, 3].map(i => ({ open: slotCards[i], hidden: slotCards[i + 4] }));
    return { slots, drawn: handCards };
  }
  const emma = dealPlayer();
  const roel = dealPlayer();
  return {
    deck,
    players: { emma, roel },
    trick: [],
    trickWinner: null,
    scores: { emma: 0, roel: 0 },
    tricksWon: { emma: 0, roel: 0 },
    currentPlayer: firstPlayer,
    phase: "choosing_trump",
    trump: null,
    firstPlayer,
    roundWinner: null,
    log: [`Nieuw spel — ${PNAME[firstPlayer]} kiest troef`],
  };
}

// ── Validation ────────────────────────────────────────────────────────────────

const VALID_VALUES = new Set(["7","8","9","Z","D","H","A","M"]);
function isValidGame(g: unknown): g is GameState {
  if (!g || typeof g !== "object") return false;
  const gs = g as GameState;
  try {
    if (!gs.players?.emma?.slots || !gs.players?.roel?.slots) return false;
    const all: Card[] = [];
    for (const p of ["emma","roel"] as Player[]) {
      for (const slot of gs.players[p].slots) {
        if (slot.open) all.push(slot.open);
        if (slot.hidden) all.push(slot.hidden);
      }
      all.push(...gs.players[p].drawn);
    }
    all.push(...gs.deck, ...gs.trick.map(t => t.card));
    return all.every(c => VALID_VALUES.has(c.value)) && "trump" in gs && "firstPlayer" in gs;
  } catch { return false; }
}

// ── Display helpers ───────────────────────────────────────────────────────────

const PNAME: Record<Player, string> = { emma: "Emma", roel: "Roel" };
const PCOLOR: Record<Player, string> = { emma: "text-rose", roel: "text-blue-500" };
const PBG: Record<Player, string> = { emma: "bg-rose/10 border-rose/30", roel: "bg-blue-50 border-blue-200" };
const RED_SUITS = new Set<Suit>(["♥", "♦"]);

// ── Card visuals ──────────────────────────────────────────────────────────────

function CardFace({ card, selected, disabled, illegal, onClick, isTrump }: {
  card: Card; selected?: boolean; disabled?: boolean; illegal?: boolean;
  onClick?: () => void; isTrump?: boolean;
}) {
  const red = RED_SUITS.has(card.suit);
  return (
    <button onClick={onClick} disabled={disabled}
      className={`
        relative w-14 h-20 rounded-xl border-2 bg-white flex flex-col items-start justify-start p-1.5
        font-bold select-none transition-all duration-150 shrink-0
        ${red ? "text-red-500" : "text-gray-800"}
        ${selected ? "border-terracotta -translate-y-4 shadow-xl ring-2 ring-terracotta/30" : isTrump ? "border-amber-400 shadow-sm" : "border-gray-200 shadow-sm"}
        ${!disabled && !illegal ? "cursor-pointer hover:-translate-y-1 hover:shadow-md active:scale-95" : ""}
        ${illegal ? "opacity-30 cursor-not-allowed" : ""}
      `}
    >
      <span className="text-xs leading-none font-bold">{VLABEL[card.value]}</span>
      <span className="text-xs leading-none">{card.suit}</span>
      <span className="absolute inset-0 flex items-center justify-center text-2xl opacity-10 pointer-events-none select-none">{card.suit}</span>
{isTrump && <span className="absolute top-0.5 right-1 text-[7px] text-amber-500 leading-none">★</span>}
    </button>
  );
}

function CardBack({ small }: { small?: boolean }) {
  const cls = small ? "w-12 h-16 text-base" : "w-14 h-20 text-lg";
  return (
    <div className={`${cls} rounded-xl border-2 border-terracotta/40 bg-gradient-to-br from-terracotta/80 to-rose/60 shadow-sm flex items-center justify-center shrink-0`}>
      <span className="text-white">🌿</span>
    </div>
  );
}

// Stapeltje: open kaart bovenop, optioneel een ruggetje dat eronder uitsteekt
function SlotStack({ slot, canPlay, selected, illegal, onPlay, showHidden, trump }: {
  slot: Slot;
  canPlay: boolean;
  selected: boolean;
  illegal: boolean;
  onPlay: () => void;
  showHidden: boolean;
  trump: Suit | null;
}) {
  if (!slot.open && !slot.hidden) {
    return <div className="w-14 h-20 rounded-xl border-2 border-dashed border-gray-200 opacity-30 shrink-0" />;
  }
  const openIsTrump = !!trump && slot.open?.suit === trump;
  return (
    <div className="relative shrink-0" style={{ width: 56, height: showHidden && slot.hidden ? 88 : 80 }}>
      {slot.hidden && (
        <div className="absolute bottom-0 left-0">
          {showHidden
            ? <CardFace card={slot.hidden} disabled isTrump={false} />
            : <CardBack />
          }
        </div>
      )}
      {slot.open && (
        <div className="absolute top-0 left-0">
          <CardFace
            card={slot.open}
            selected={selected}
            disabled={!canPlay || illegal}
            illegal={illegal}
            onClick={canPlay && !illegal ? onPlay : undefined}
            isTrump={openIsTrump}
          />
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ManillenPage() {
  const [game, setGame] = useState<GameState | null>(null);
  const [me, setMe] = useState<Player | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadGame = useCallback(async () => {
    try {
      const res = await fetch("/api/manillen");
      const data = await res.json();
      setGame(isValidGame(data) ? data : null);
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

  async function startNewGame(forceFirst?: Player) {
    setSelected(null);
    const nextFirst: Player = forceFirst
      ?? (game ? (game.firstPlayer === "emma" ? "roel" : "emma") : "emma");
    await saveGame(newGame(nextFirst));
  }

  function chooseTrump(suit: Suit | null) {
    if (!game || !me || game.phase !== "choosing_trump" || game.currentPlayer !== me) return;
    const other: Player = me === "emma" ? "roel" : "emma";
    const label = suit ? `${suit} ${SUIT_LABEL[suit]} als troef` : "geen troef";
    saveGame({
      ...game,
      trump: suit,
      phase: "playing",
      currentPlayer: other,
      log: [`${PNAME[me]} kiest ${label} — ${PNAME[other]} legt eerste kaart`, ...game.log].slice(0, 20),
    });
  }

  function handleCardClick(card: Card) {
    if (!game || !me || game.currentPlayer !== me || game.phase !== "playing") return;
    if (selected === card.id) playCard(card);
    else setSelected(card.id);
  }

  function playCard(card: Card) {
    if (!game || !me || game.phase !== "playing") return;
    const newTrick: TrickPlay[] = [...game.trick, { player: me, card }];
    const newPlayers = { ...game.players, [me]: removeCard(game.players[me], card.id) };
    const other: Player = me === "emma" ? "roel" : "emma";
    setSelected(null);

    if (newTrick.length < 2) {
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

    const winner = resolveTrick(newTrick, game.trump);
    const basePts = newTrick.reduce((s, p) => s + POINTS[p.card.value], 0);
    const pts = game.trump === null ? basePts * 2 : basePts;
    const newScores = { ...game.scores, [winner]: game.scores[winner] + pts };
    const newTricksWon = { ...game.tricksWon, [winner]: game.tricksWon[winner] + 1 };
    const loser: Player = winner === "emma" ? "roel" : "emma";

    // Trek kaart uit stapel: winner eerst
    const newDeck = [...game.deck];
    function drawCard(ps: PlayerState): PlayerState {
      if (newDeck.length === 0) return ps;
      const drawn = newDeck.shift()!;
      return { ...ps, drawn: [...ps.drawn, drawn] };
    }
    const afterDraw = { ...newPlayers };
    afterDraw[winner] = drawCard(afterDraw[winner]);
    afterDraw[loser] = drawCard(afterDraw[loser]);

    const remaining = totalCards(afterDraw.emma) + totalCards(afterDraw.roel) + newDeck.length;
    const finished = remaining === 0;
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
      log: [`${PNAME[me]} speelt ${card.suit}${VLABEL[card.value]}`, ...game.log].slice(0, 20),
    });
  }

  // ── Screens ───────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="animate-spin text-terracotta" size={28} />
    </div>
  );

  const Screen = ({ children }: { children: React.ReactNode }) => (
    <div className="fixed inset-0 z-50 bg-cream overflow-y-auto">
      <div className="max-w-lg mx-auto px-3 pb-8">
        {children}
      </div>
    </div>
  );

  if (!me) return (
    <Screen>
      <div className="flex items-center pt-5 mb-6">
        <Link href="/spellen" className="flex items-center gap-1.5 text-brown-light hover:text-terracotta transition-colors">
          <ArrowLeft size={18} />
          <span className="text-sm font-semibold">Spellen</span>
        </Link>
      </div>
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
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
        <button onClick={() => startNewGame()}
          className="w-full bg-terracotta text-cream rounded-2xl py-3 font-semibold hover:bg-terracotta/80 transition-colors">
          Nieuw spel starten
        </button>
      </div>
    </Screen>
  );

  if (!game) return (
    <Screen>
      <div className="flex items-center pt-5 mb-6">
        <Link href="/spellen" className="flex items-center gap-1.5 text-brown-light hover:text-terracotta transition-colors">
          <ArrowLeft size={18} />
          <span className="text-sm font-semibold">Spellen</span>
        </Link>
      </div>
      <div className="flex flex-col items-center gap-4 mt-8">
        <p className="text-5xl">🃏</p>
        <p className="font-display text-xl text-brown">Geen actief spel</p>
        <button onClick={() => startNewGame()}
          className="bg-terracotta text-cream rounded-2xl px-6 py-3 font-semibold hover:bg-terracotta/80 transition-colors">
          Nieuw spel starten
        </button>
      </div>
    </Screen>
  );

  const opp: Player = me === "emma" ? "roel" : "emma";
  const mine = game.players[me];
  const theirs = game.players[opp];
  const isMyTurn = game.currentPlayer === me;
  const leadCard = game.trick[0]?.card ?? null;
  const myPlayedCard = game.trick.find(t => t.player === me);

  const legal: Set<string> = (game.phase === "playing" && leadCard && !myPlayedCard && isMyTurn)
    ? legalCards(mine, leadCard.suit, game.trump)
    : new Set(playableCards(mine).map(c => c.id));

  // ── Trump selection screen ─────────────────────────────────────────────────

  if (game.phase === "choosing_trump") {
    const iChose = game.currentPlayer === me;
    return (
      <div className="max-w-lg mx-auto pt-14 md:pt-0 pb-6 px-3 flex flex-col gap-4">
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">🃏</span>
            <span className="font-display text-xl text-brown">Manillen</span>
          </div>
          <button onClick={() => setMe(opp)} className="text-xs text-brown-light hover:text-terracotta underline">Speel als {PNAME[opp]}</button>
        </div>
        <div className="bg-warm rounded-3xl p-5 text-center border-2 border-terracotta/40">
          <p className="text-3xl mb-2">🎴</p>
          {iChose ? (
            <>
              <p className="font-display text-xl text-brown mb-1">Jij begint — kies troef</p>
              <p className="text-sm text-brown-light mb-4">Welke kleur wordt troef?</p>
              <div className="grid grid-cols-2 gap-3">
                {SUITS.map(suit => (
                  <button key={suit} onClick={() => chooseTrump(suit)}
                    className={`rounded-2xl py-4 text-2xl font-bold border-2 border-warm hover:border-terracotta hover:bg-terracotta/5 transition-all ${RED_SUITS.has(suit) ? "text-red-500" : "text-gray-800"}`}>
                    {suit} <span className="text-sm font-normal text-brown-light block">{SUIT_LABEL[suit]}</span>
                  </button>
                ))}
                <button onClick={() => chooseTrump(null as unknown as Suit)}
                  className="col-span-2 rounded-2xl py-3 text-sm font-semibold border-2 border-warm hover:border-brown-light hover:bg-warm/60 transition-all text-brown-light">
                  Geen troef spelen
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="font-display text-xl text-brown mb-1">{PNAME[game.currentPlayer]} kiest troef</p>
              <p className="text-sm text-brown-light mb-4">Even wachten…</p>
              <RefreshCw className="animate-spin text-terracotta mx-auto mb-4" size={20} />
              <button onClick={() => startNewGame(me)} className="text-xs text-brown-light hover:text-rose underline transition-colors">
                Nieuw spel starten (jij begint)
              </button>
            </>
          )}
        </div>
        {/* Preview eigen kaarten */}
        <div className={`rounded-3xl p-3 border ${PBG[me]}`}>
          <p className="text-[10px] text-brown-light uppercase tracking-wide mb-2">Jouw kaarten</p>
          <div className="flex gap-3 flex-wrap">
            {mine.slots.map((slot, i) => (
              <SlotStack key={i} slot={slot} canPlay={false} selected={false} illegal={false}
                onPlay={() => {}} showHidden trump={null} />
            ))}
          </div>
          {mine.drawn.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mt-2">
              {mine.drawn.map(c => (
                <CardFace key={c.id} card={c} disabled isTrump={false} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Game board ─────────────────────────────────────────────────────────────

  return (
    <div className="max-w-lg mx-auto pt-14 md:pt-0 pb-6 px-3 flex flex-col gap-3">

      {/* Header */}
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">🃏</span>
          <span className="font-display text-xl text-brown">Manillen</span>
          {game.phase === "playing" && (
            <span className={`font-bold ${game.trump && RED_SUITS.has(game.trump) ? "text-red-500" : "text-gray-700"}`}>
              {game.trump ? game.trump : "∅"} <span className="text-xs text-brown-light font-normal">{game.trump ? "troef" : "geen troef"}</span>
            </span>
          )}
          {saving && <RefreshCw className="animate-spin text-brown-light" size={12} />}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setMe(opp)} className="text-xs text-brown-light hover:text-terracotta underline">Speel als {PNAME[opp]}</button>
          <button onClick={() => startNewGame()} className="flex items-center gap-1 text-xs text-brown-light hover:text-rose transition-colors">
            <RotateCcw size={12} /> Nieuw
          </button>
        </div>
      </div>

      {/* Scores — only when finished */}
      {game.phase === "finished" ? (
        <div className="bg-warm rounded-3xl p-5 text-center border-2 border-terracotta">
          <Trophy className="text-amber-400 mx-auto mb-2" size={28} />
          <p className="font-display text-2xl text-brown mb-1">
            {game.roundWinner ? `${PNAME[game.roundWinner]} wint!` : "Gelijkspel!"}
          </p>
          <p className="text-sm text-brown-light mb-1">Emma {game.scores.emma}pt — Roel {game.scores.roel}pt</p>
          <p className="text-xs text-brown-light mb-4">Volgende beurt: {PNAME[game.firstPlayer === "emma" ? "roel" : "emma"]} begint</p>
          <button onClick={() => startNewGame()}
            className="bg-terracotta text-cream rounded-xl px-5 py-2 text-sm font-semibold hover:bg-terracotta/80 transition-colors">
            Volgende ronde
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {(["emma", "roel"] as Player[]).map(p => (
            <div key={p} className={`rounded-2xl p-2.5 border-2 transition-all ${game.currentPlayer === p ? "border-terracotta bg-terracotta/5" : "border-warm bg-warm"}`}>
              <p className={`text-xs font-semibold ${PCOLOR[p]}`}>{PNAME[p]} {p === me ? "(jij)" : ""}</p>
              <p className="font-display text-xl text-brown-light leading-tight">—</p>
              <p className="text-[10px] text-brown-light">{game.tricksWon[p]} slagen · {game.deck.length} in stapel</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Tegenstander ── */}
      <div className={`rounded-3xl p-3 border ${PBG[opp]}`}>
        <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${PCOLOR[opp]}`}>{PNAME[opp]}</p>
        {/* 4 stapeltjes gecentreerd */}
        <div className="flex justify-center gap-3 mb-4">
          {theirs.slots.map((slot, i) => (
            <SlotStack key={i} slot={slot} canPlay={false} selected={false} illegal={false}
              onPlay={() => {}} showHidden={false}
              trump={game.trump} />
          ))}
        </div>
        {/* Handkaarten tegenstander als ruggetjes */}
        {theirs.drawn.length > 0 && (
          <div className="flex gap-1.5 flex-wrap justify-center border-t border-current/10 pt-3">
            {theirs.drawn.map((_, i) => (
              <CardBack key={i} small />
            ))}
          </div>
        )}
      </div>

      {/* ── Tafel ── */}
      <div className="bg-warm rounded-3xl p-3 flex items-center justify-center gap-8 min-h-[100px] border border-warm/60">
        {game.trick.length === 0 ? (
          <p className="text-sm text-brown-light text-center">
            {isMyTurn ? "Jouw beurt — kies een kaart" : `Wachten op ${PNAME[game.currentPlayer]}…`}
          </p>
        ) : (
          ([opp, me] as Player[]).map(p => {
            const played = game.trick.find(t => t.player === p);
            return (
              <div key={p} className="flex flex-col items-center gap-1">
                <p className={`text-[10px] font-semibold ${PCOLOR[p]}`}>{PNAME[p]}</p>
                {played
                  ? <CardFace card={played.card} disabled isTrump={game.trump === played.card.suit} />
                  : <div className="w-14 h-20 rounded-xl border-2 border-dashed border-warm/80 flex items-center justify-center">
                      <span className="text-brown-light text-xs">…</span>
                    </div>
                }
              </div>
            );
          })
        )}
      </div>

      {/* ── Mijn kaarten ── */}
      <div className={`rounded-3xl p-3 border ${PBG[me]}`}>
        <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${PCOLOR[me]}`}>Jouw kaarten</p>
        {/* 4 stapeltjes gecentreerd */}
        <div className="flex justify-center gap-3 mb-4">
          {mine.slots.map((slot, i) => {
            const topCard = slot.open;
            const isIllegal = topCard ? (!legal.has(topCard.id) && isMyTurn && !myPlayedCard) : false;
            const isSel = topCard ? selected === topCard.id : false;
            return (
              <SlotStack key={i} slot={slot}
                canPlay={isMyTurn && !myPlayedCard && !!topCard}
                selected={isSel}
                illegal={isIllegal}
                onPlay={() => topCard && handleCardClick(topCard)}
                showHidden
                trump={game.trump}
              />
            );
          })}
        </div>
        {/* Handkaarten */}
        {mine.drawn.length > 0 && (
          <div className="flex gap-1.5 flex-wrap justify-center border-t border-current/10 pt-3">
            {mine.drawn.map(c => {
              const isIllegal = !legal.has(c.id) && isMyTurn && !myPlayedCard;
              return (
                <CardFace key={c.id} card={c}
                  selected={selected === c.id}
                  disabled={!isMyTurn || !!myPlayedCard || isIllegal}
                  illegal={isIllegal}
                  isTrump={game.trump === c.suit}
                  onClick={!isIllegal ? () => handleCardClick(c) : undefined} />
              );
            })}
          </div>
        )}
        {isMyTurn && selected && !myPlayedCard && (
          <p className="text-xs text-terracotta mt-2 text-center">Tik nog eens om te spelen</p>
        )}
      </div>


    </div>
  );
}
