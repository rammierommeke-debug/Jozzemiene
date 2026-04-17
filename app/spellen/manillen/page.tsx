"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Trophy, RotateCcw } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type Suit = "♠" | "♥" | "♦" | "♣";
type Value = "6" | "7" | "8" | "9" | "Z" | "D" | "H" | "A" | "M";
type Phase = "choosing_trump" | "playing" | "finished";

interface Card { suit: Suit; value: Value; id: string }
type Player = "emma" | "roel";
interface PlayerState { open: Card[]; hand: Card[] }
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
  firstPlayer: Player; // wisselt elke ronde ("om de buurt")
  roundWinner: Player | null;
  log: string[];
}

// ── Card constants ────────────────────────────────────────────────────────────

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const SUIT_LABEL: Record<Suit, string> = { "♠": "Schoppen", "♥": "Harten", "♦": "Ruiten", "♣": "Klaveren" };
const VALUES: Value[] = ["6", "7", "8", "9", "Z", "D", "H", "A", "M"];

const RANK: Record<Value, number> = {
  "6": 0, "7": 1, "8": 2, "9": 3, "Z": 4, "D": 5, "H": 6, "A": 7, "M": 8,
};
// Manille=5, Aas=4, Heer=3, Dame=2, Zot=1 → 4×15=60pt
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

// ── Trick resolution with trump ───────────────────────────────────────────────

function resolveTrick(trick: TrickPlay[], trump: Suit): Player {
  const leadSuit = trick[0].card.suit;
  let winner = trick[0];
  for (const play of trick.slice(1)) {
    const wTrump = winner.card.suit === trump;
    const cTrump = play.card.suit === trump;
    if (wTrump && !cTrump) continue; // winner stays
    if (!wTrump && cTrump) { winner = play; continue; } // troef wint
    // both same situation: only beats if same suit and higher rank
    if (play.card.suit === winner.card.suit && RANK[play.card.value] > RANK[winner.card.value]) {
      winner = play;
    }
  }
  return winner.player;
}

// Which cards are legally playable when responding to a lead card
function legalCards(hand: Card[], open: Card[], leadSuit: Suit, trump: Suit): Set<string> {
  const all = [...hand, ...open];
  const hasLead = all.some(c => c.suit === leadSuit);
  if (hasLead) {
    return new Set(all.filter(c => c.suit === leadSuit).map(c => c.id));
  }
  const hasTrump = all.some(c => c.suit === trump);
  if (hasTrump) {
    return new Set(all.filter(c => c.suit === trump).map(c => c.id));
  }
  return new Set(all.map(c => c.id)); // vrij spel
}

// ── New game ──────────────────────────────────────────────────────────────────

function newGame(firstPlayer: Player): GameState {
  const deck = shuffle(SUITS.flatMap(s => VALUES.map(v => makeCard(s, v))));
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
    currentPlayer: firstPlayer,
    phase: "choosing_trump",
    trump: null,
    firstPlayer,
    roundWinner: null,
    log: [`Nieuw spel — ${PNAME[firstPlayer]} kiest troef`],
  };
}

// ── Validation (detect stale Supabase state) ──────────────────────────────────

const VALID_VALUES = new Set(["6","7","8","9","Z","D","H","A","M"]);
function isValidGame(g: unknown): g is GameState {
  if (!g || typeof g !== "object") return false;
  const gs = g as GameState;
  try {
    const all = [
      ...gs.players.emma.open, ...gs.players.emma.hand,
      ...gs.players.roel.open, ...gs.players.roel.hand,
      ...gs.deck, ...gs.trick.map(t => t.card),
    ];
    return all.every(c => VALID_VALUES.has(c.value)) && "trump" in gs && "firstPlayer" in gs;
  } catch { return false; }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PNAME: Record<Player, string> = { emma: "Emma", roel: "Roel" };
const PCOLOR: Record<Player, string> = { emma: "text-rose", roel: "text-blue-500" };
const PBG: Record<Player, string> = { emma: "bg-rose/10 border-rose/30", roel: "bg-blue-50 border-blue-200" };
const RED_SUITS = new Set<Suit>(["♥", "♦"]);

// ── Card visuals ──────────────────────────────────────────────────────────────

function CardFace({ card, selected, disabled, illegal, onClick, small, isTrump }: {
  card: Card; selected?: boolean; disabled?: boolean; illegal?: boolean;
  onClick?: () => void; small?: boolean; isTrump?: boolean;
}) {
  const red = RED_SUITS.has(card.suit);
  const w = small ? "w-12 h-16" : "w-14 h-20";
  return (
    <button onClick={onClick} disabled={disabled}
      className={`
        relative ${w} rounded-xl border-2 bg-white flex flex-col items-start justify-start p-1
        font-bold select-none transition-all duration-150 shrink-0
        ${red ? "text-red-500" : "text-gray-800"}
        ${selected ? "border-terracotta -translate-y-3 shadow-lg ring-2 ring-terracotta/30" : isTrump ? "border-amber-400" : "border-gray-200 shadow-sm"}
        ${!disabled && !illegal ? "cursor-pointer hover:-translate-y-1 hover:shadow-md active:scale-95" : ""}
        ${illegal ? "opacity-30 cursor-not-allowed" : ""}
        ${disabled && !selected && !illegal ? "opacity-80" : ""}
      `}
    >
      <span className="text-xs leading-none font-bold">{VLABEL[card.value]}</span>
      <span className="text-xs leading-none">{card.suit}</span>
      <span className="absolute inset-0 flex items-center justify-center text-lg opacity-20 pointer-events-none">{card.suit}</span>
      {POINTS[card.value] > 0 && (
        <span className="absolute bottom-0.5 right-1 text-[8px] font-semibold text-amber-500 leading-none">
          {POINTS[card.value]}p
        </span>
      )}
      {isTrump && <span className="absolute top-0.5 right-1 text-[8px] leading-none">★</span>}
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

  async function startNewGame() {
    setSelected(null);
    // "om de buurt": whoever didn't start last time starts now
    const nextFirst: Player = game
      ? (game.firstPlayer === "emma" ? "roel" : "emma")
      : "emma";
    await saveGame(newGame(nextFirst));
  }

  function chooseTrump(suit: Suit) {
    if (!game || !me || game.phase !== "choosing_trump" || game.currentPlayer !== me) return;
    saveGame({
      ...game,
      trump: suit,
      phase: "playing",
      log: [`${PNAME[me]} kiest ${suit} ${SUIT_LABEL[suit]} als troef`, ...game.log].slice(0, 20),
    });
  }

  function handleCardClick(card: Card) {
    if (!game || !me || game.currentPlayer !== me || game.phase !== "playing") return;
    if (selected === card.id) {
      playCard(card);
    } else {
      setSelected(card.id);
    }
  }

  function playCard(card: Card) {
    if (!game || !me || !game.trump) return;

    const fromOpen = game.players[me].open.some(c => c.id === card.id);
    const newTrick: TrickPlay[] = [...game.trick, { player: me, card }];
    const updatedMe: PlayerState = {
      open: game.players[me].open.filter(c => c.id !== card.id),
      hand: game.players[me].hand.filter(c => c.id !== card.id),
    };
    const newPlayers = { ...game.players, [me]: updatedMe };
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

    // Resolve trick
    const winner = resolveTrick(newTrick, game.trump);
    const pts = newTrick.reduce((s, p) => s + POINTS[p.card.value], 0);
    const newScores = { ...game.scores, [winner]: game.scores[winner] + pts };
    const newTricksWon = { ...game.tricksWon, [winner]: game.tricksWon[winner] + 1 };
    const loser: Player = winner === "emma" ? "roel" : "emma";

    // Draw from deck (winner first)
    const newDeck = [...game.deck];
    function drawInto(ps: PlayerState): PlayerState {
      if (newDeck.length === 0) return ps;
      const drawn = newDeck.shift()!;
      return { ...ps, open: [...ps.open, drawn] };
    }
    const afterDraw = { ...newPlayers };
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
      log: [
        `${PNAME[winner]} wint slag! +${pts}pt`,
        `${PNAME[me]} speelt ${card.suit}${VLABEL[card.value]}`,
        ...game.log,
      ].slice(0, 20),
    });
  }

  // ── Screens ───────────────────────────────────────────────────────────────

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
      <button onClick={() => { setMe("emma"); startNewGame(); }}
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
  const isMyTurn = game.currentPlayer === me;
  const leadCard = game.trick[0]?.card ?? null;
  const myPlayedCard = game.trick.find(t => t.player === me);

  // Legal cards when responding
  const legal: Set<string> = (game.phase === "playing" && leadCard && !myPlayedCard && isMyTurn && game.trump)
    ? legalCards(mine.hand, mine.open, leadCard.suit, game.trump)
    : new Set([...mine.open, ...mine.hand].map(c => c.id));

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
          <button onClick={() => setMe(opp)} className="text-xs text-brown-light hover:text-terracotta underline">
            Speel als {PNAME[opp]}
          </button>
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
              </div>
            </>
          ) : (
            <>
              <p className="font-display text-xl text-brown mb-1">{PNAME[game.currentPlayer]} kiest troef</p>
              <p className="text-sm text-brown-light">Even wachten…</p>
              <RefreshCw className="animate-spin text-terracotta mx-auto mt-4" size={20} />
            </>
          )}
        </div>

        {/* Show my cards already */}
        <div className={`rounded-3xl p-3 border ${PBG[me]}`}>
          <p className="text-[10px] text-brown-light uppercase tracking-wide mb-1.5">Jouw open tafelkaarten</p>
          <div className="flex gap-1.5 flex-wrap mb-3">
            {mine.open.map(c => <CardFace key={c.id} card={c} disabled small />)}
          </div>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${PCOLOR[me]}`}>Jouw hand</p>
          <div className="flex gap-1.5 flex-wrap">
            {mine.hand.map(c => <CardFace key={c.id} card={c} disabled />)}
          </div>
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
          {game.trump && (
            <span className={`text-lg font-bold ${RED_SUITS.has(game.trump) ? "text-red-500" : "text-gray-700"}`}>
              {game.trump} <span className="text-xs text-brown-light font-normal">troef</span>
            </span>
          )}
          {saving && <RefreshCw className="animate-spin text-brown-light" size={12} />}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setMe(opp)} className="text-xs text-brown-light hover:text-terracotta underline">
            Speel als {PNAME[opp]}
          </button>
          <button onClick={startNewGame} className="flex items-center gap-1 text-xs text-brown-light hover:text-rose transition-colors">
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
          <p className="text-xs text-brown-light mb-4">
            Volgende beurt: {PNAME[game.firstPlayer === "emma" ? "roel" : "emma"]} begint
          </p>
          <button onClick={startNewGame}
            className="bg-terracotta text-cream rounded-xl px-5 py-2 text-sm font-semibold hover:bg-terracotta/80 transition-colors">
            Volgende ronde
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {(["emma", "roel"] as Player[]).map(p => (
            <div key={p} className={`rounded-2xl p-2.5 border-2 transition-all ${
              game.currentPlayer === p ? "border-terracotta bg-terracotta/5" : "border-warm bg-warm"
            }`}>
              <p className={`text-xs font-semibold ${PCOLOR[p]}`}>{PNAME[p]} {p === me ? "(jij)" : ""}</p>
              <p className="font-display text-xl text-brown-light leading-tight">—</p>
              <p className="text-[10px] text-brown-light">{game.tricksWon[p]} slagen · {game.deck.length} in stapel</p>
            </div>
          ))}
        </div>
      )}

      {/* Opponent */}
      <div className={`rounded-3xl p-3 border ${PBG[opp]}`}>
        <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${PCOLOR[opp]}`}>
          {PNAME[opp]} — {theirs.hand.length} gedekt
        </p>
        <div className="flex gap-1 mb-3">
          {theirs.hand.map((_, i) => <CardBack key={i} small />)}
        </div>
        <p className="text-[10px] text-brown-light uppercase tracking-wide mb-1.5">Open tafelkaarten</p>
        <div className="flex gap-1.5 flex-wrap">
          {theirs.open.map(c => (
            <CardFace key={c.id} card={c} disabled small isTrump={game.trump === c.suit} />
          ))}
        </div>
      </div>

      {/* Trick area */}
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
                  {played
                    ? <CardFace card={played.card} disabled isTrump={game.trump === played.card.suit} />
                    : <div className="w-14 h-20 rounded-xl border-2 border-dashed border-warm/80 flex items-center justify-center">
                        <span className="text-brown-light text-xs">…</span>
                      </div>
                  }
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* My section */}
      <div className={`rounded-3xl p-3 border ${PBG[me]}`}>
        <p className="text-[10px] text-brown-light uppercase tracking-wide mb-1.5">Mijn open tafelkaarten</p>
        <div className="flex gap-1.5 flex-wrap mb-3">
          {mine.open.map(c => {
            const isIllegal = !legal.has(c.id) && isMyTurn && !myPlayedCard && game.phase === "playing";
            return (
              <CardFace key={c.id} card={c}
                selected={selected === c.id}
                disabled={!isMyTurn || !!myPlayedCard}
                illegal={isIllegal}
                isTrump={game.trump === c.suit}
                onClick={() => handleCardClick(c)} small />
            );
          })}
        </div>
        <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${PCOLOR[me]}`}>
          Mijn hand
          {!isMyTurn && game.phase === "playing" && (
            <span className="ml-1 normal-case font-normal text-brown-light">— wacht op {PNAME[opp]}</span>
          )}
        </p>
        <div className="flex gap-1.5 flex-wrap">
          {mine.hand.map(c => {
            const isIllegal = !legal.has(c.id) && isMyTurn && !myPlayedCard && game.phase === "playing";
            return (
              <CardFace key={c.id} card={c}
                selected={selected === c.id}
                disabled={!isMyTurn || !!myPlayedCard}
                illegal={isIllegal}
                isTrump={game.trump === c.suit}
                onClick={() => handleCardClick(c)} />
            );
          })}
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
