"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Trophy, RotateCcw } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type Suit = "♠" | "♥" | "♦" | "♣";
type Value = "6" | "7" | "8" | "9" | "B" | "D" | "H" | "Z" | "M";

interface Card {
  suit: Suit;
  value: Value;
  id: string; // suit+value
}

type Player = "emma" | "roel";

interface PlayerHand {
  open: Card[];    // face-up, visible to all
  gedekt: Card[];  // face-down, only owner can see
}

interface GameState {
  deck: Card[];
  hands: Record<Player, PlayerHand>;
  trick: { player: Player; card: Card }[];
  trickWinner: Player | null;
  scores: Record<Player, number>;
  tricksWon: Record<Player, number>;
  currentPlayer: Player;
  phase: "playing" | "finished";
  roundWinner: Player | null;
  log: string[];
}

// ── Card helpers ─────────────────────────────────────────────────────────────

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const VALUES: Value[] = ["6", "7", "8", "9", "B", "D", "H", "Z", "M"];

const RANK: Record<Value, number> = {
  "6": 0, "7": 1, "8": 2, "9": 3, "B": 4, "D": 5, "H": 6, "Z": 7, "M": 8,
};
const POINTS: Record<Value, number> = {
  "6": 0, "7": 0, "8": 0, "9": 0, "B": 1, "D": 2, "H": 3, "Z": 4, "M": 5,
};
const VALUE_LABEL: Record<Value, string> = {
  "6": "6", "7": "7", "8": "8", "9": "9", "B": "B", "D": "D", "H": "H", "Z": "Z", "M": "M",
};

function makeCard(suit: Suit, value: Value): Card {
  return { suit, value, id: suit + value };
}

function makeDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) for (const v of VALUES) deck.push(makeCard(s, v));
  return deck;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cardPoints(card: Card): number { return POINTS[card.value]; }

function beats(challenger: Card, defender: Card, leadSuit: Suit): boolean {
  if (challenger.suit === defender.suit) return RANK[challenger.value] > RANK[defender.value];
  return false; // different suit never beats
}

function trickWinner(trick: { player: Player; card: Card }[]): Player {
  const lead = trick[0];
  let winner = lead;
  for (const play of trick.slice(1)) {
    if (beats(play.card, winner.card, lead.card.suit)) winner = play;
  }
  return winner.player;
}

// ── New game factory ──────────────────────────────────────────────────────────

function newGame(): GameState {
  const deck = shuffle(makeDeck());
  const eDeck = deck.splice(0, 8);
  const rDeck = deck.splice(0, 8);
  return {
    deck,
    hands: {
      emma: { open: eDeck.slice(0, 4), gedekt: eDeck.slice(4) },
      roel: { open: rDeck.slice(0, 4), gedekt: rDeck.slice(4) },
    },
    trick: [],
    trickWinner: null,
    scores: { emma: 0, roel: 0 },
    tricksWon: { emma: 0, roel: 0 },
    currentPlayer: "emma",
    phase: "playing",
    roundWinner: null,
    log: ["Nieuw spel gestart — Emma begint!"],
  };
}

// ── Card visual ───────────────────────────────────────────────────────────────

function CardFace({ card, onClick, selected, disabled }: {
  card: Card;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
}) {
  const red = card.suit === "♥" || card.suit === "♦";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative w-14 h-20 rounded-xl border-2 bg-white flex flex-col items-center justify-center
        font-bold text-lg select-none transition-all duration-150
        ${red ? "text-red-500" : "text-gray-800"}
        ${selected ? "border-terracotta -translate-y-3 shadow-lg" : "border-gray-200 shadow-sm"}
        ${disabled ? "opacity-50 cursor-default" : "cursor-pointer hover:-translate-y-1 hover:shadow-md"}
      `}
    >
      <span className="text-xl leading-none">{card.suit}</span>
      <span className="text-sm leading-none mt-0.5">{VALUE_LABEL[card.value]}</span>
      {POINTS[card.value] > 0 && (
        <span className="absolute bottom-1 right-1.5 text-[9px] font-semibold text-amber-500">{POINTS[card.value]}pt</span>
      )}
    </button>
  );
}

function CardBack() {
  return (
    <div className="w-14 h-20 rounded-xl border-2 border-gray-200 bg-gradient-to-br from-terracotta to-rose shadow-sm flex items-center justify-center">
      <span className="text-white text-2xl">🌿</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const PLAYERS: Record<Player, { name: string; color: string }> = {
  emma: { name: "Emma", color: "text-rose" },
  roel: { name: "Roel", color: "text-blue-500" },
};

export default function ManillenPage() {
  const [game, setGame] = useState<GameState | null>(null);
  const [me, setMe] = useState<Player | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load game state from server
  const loadGame = useCallback(async () => {
    const res = await fetch("/api/manillen");
    const data = await res.json();
    setGame(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadGame(); }, [loadGame]);

  // Poll every 3 seconds
  useEffect(() => {
    const id = setInterval(loadGame, 3000);
    return () => clearInterval(id);
  }, [loadGame]);

  async function saveGame(state: GameState) {
    setSaving(true);
    await fetch("/api/manillen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });
    setGame(state);
    setSaving(false);
  }

  async function startNewGame() {
    await saveGame(newGame());
    setSelected(null);
  }

  function playCard(card: Card) {
    if (!game || !me || game.currentPlayer !== me || game.phase !== "playing") return;

    const newTrick = [...game.trick, { player: me, card }];
    const newHands = {
      ...game.hands,
      [me]: {
        open: game.hands[me].open.filter((c) => c.id !== card.id),
        gedekt: game.hands[me].gedekt.filter((c) => c.id !== card.id),
      },
    };

    let newState: GameState;

    if (newTrick.length === 2) {
      // Trick complete
      const winner = trickWinner(newTrick);
      const pts = newTrick.reduce((sum, p) => sum + cardPoints(p.card), 0);
      const newScores = { ...game.scores, [winner]: game.scores[winner] + pts };
      const newTricksWon = { ...game.tricksWon, [winner]: game.tricksWon[winner] + 1 };

      // Draw from deck
      let newDeck = [...game.deck];
      const drawFor = (h: PlayerHand, player: Player): PlayerHand => {
        if (newDeck.length === 0) return h;
        const drawn = newDeck.shift()!;
        // drawn card goes open
        return { ...h, open: [...h.open, drawn] };
      };
      // winner draws first, then loser
      const loser: Player = winner === "emma" ? "roel" : "emma";
      const updatedHands = { ...newHands };
      updatedHands[winner] = drawFor(updatedHands[winner], winner);
      updatedHands[loser] = drawFor(updatedHands[loser], loser);

      const totalCards = updatedHands.emma.open.length + updatedHands.emma.gedekt.length +
        updatedHands.roel.open.length + updatedHands.roel.gedekt.length + newDeck.length;

      const finished = totalCards === 0 && newTrick.length === 2;
      const roundWinner = finished
        ? (newScores.emma > newScores.roel ? "emma" : newScores.roel > newScores.emma ? "roel" : null)
        : null;

      const logEntry = `${PLAYERS[winner].name} wint slag (+${pts}pt)`;

      newState = {
        ...game,
        deck: newDeck,
        hands: updatedHands,
        trick: [],
        trickWinner: winner,
        scores: newScores,
        tricksWon: newTricksWon,
        currentPlayer: winner,
        phase: finished ? "finished" : "playing",
        roundWinner,
        log: [logEntry, ...game.log].slice(0, 20),
      };
    } else {
      // First card played
      const other: Player = me === "emma" ? "roel" : "emma";
      const logEntry = `${PLAYERS[me].name} speelt ${card.suit}${VALUE_LABEL[card.value]}`;
      newState = {
        ...game,
        hands: newHands,
        trick: newTrick,
        trickWinner: null,
        currentPlayer: other,
        log: [logEntry, ...game.log].slice(0, 20),
      };
    }

    setSelected(null);
    saveGame(newState);
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-terracotta" size={32} />
      </div>
    );
  }

  if (!me) {
    return (
      <div className="max-w-sm mx-auto pt-14 md:pt-0 flex flex-col items-center gap-6">
        <div className="text-center">
          <p className="text-5xl mb-3">🃏</p>
          <h1 className="font-display text-3xl text-brown mb-1">Manillen</h1>
          <p className="text-brown-light text-sm">Wie ben jij?</p>
        </div>
        <div className="flex gap-4 w-full">
          {(["emma", "roel"] as Player[]).map((p) => (
            <button
              key={p}
              onClick={() => setMe(p)}
              className="flex-1 bg-warm border-2 border-warm rounded-2xl py-5 font-display text-xl text-brown hover:border-terracotta hover:text-terracotta transition-colors capitalize"
            >
              {PLAYERS[p].name}
            </button>
          ))}
        </div>
        {!game && (
          <button
            onClick={startNewGame}
            className="w-full bg-terracotta text-cream rounded-2xl py-3 font-semibold hover:bg-terracotta/80 transition-colors"
          >
            Nieuw spel starten
          </button>
        )}
      </div>
    );
  }

  if (!game) {
    return (
      <div className="max-w-sm mx-auto pt-14 md:pt-0 flex flex-col items-center gap-4">
        <p className="text-5xl">🃏</p>
        <p className="text-brown font-display text-xl">Geen actief spel</p>
        <button
          onClick={startNewGame}
          className="bg-terracotta text-cream rounded-2xl px-6 py-3 font-semibold hover:bg-terracotta/80 transition-colors"
        >
          Nieuw spel starten
        </button>
      </div>
    );
  }

  const opponent: Player = me === "emma" ? "roel" : "emma";
  const myHand = game.hands[me];
  const oppHand = game.hands[opponent];
  const isMyTurn = game.currentPlayer === me && game.phase === "playing";

  const allMyCards = [...myHand.open, ...myHand.gedekt];

  return (
    <div className="max-w-lg mx-auto pt-14 md:pt-0 pb-8 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🃏</span>
          <h1 className="font-display text-2xl text-brown">Manillen</h1>
          {saving && <RefreshCw className="animate-spin text-brown-light" size={14} />}
        </div>
        <button
          onClick={startNewGame}
          className="flex items-center gap-1.5 text-sm text-brown-light hover:text-rose transition-colors"
        >
          <RotateCcw size={14} />
          Nieuw spel
        </button>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-2 gap-3">
        {(["emma", "roel"] as Player[]).map((p) => (
          <div
            key={p}
            className={`rounded-2xl p-3 border-2 transition-colors ${
              game.currentPlayer === p && game.phase === "playing"
                ? "border-terracotta bg-terracotta/5"
                : "border-warm bg-warm"
            }`}
          >
            <p className={`text-xs font-semibold uppercase tracking-wide mb-0.5 ${PLAYERS[p].color}`}>
              {PLAYERS[p].name} {p === me ? "(jij)" : ""}
            </p>
            <p className="font-display text-2xl text-brown">{game.scores[p]} pt</p>
            <p className="text-xs text-brown-light">{game.tricksWon[p]} slagen</p>
          </div>
        ))}
      </div>

      {/* Finished state */}
      {game.phase === "finished" && (
        <div className="bg-warm rounded-3xl p-5 text-center border-2 border-terracotta">
          <Trophy className="text-amber-400 mx-auto mb-2" size={32} />
          <p className="font-display text-2xl text-brown mb-1">
            {game.roundWinner
              ? `${PLAYERS[game.roundWinner].name} wint!`
              : "Gelijkspel!"}
          </p>
          <p className="text-brown-light text-sm mb-3">
            Emma {game.scores.emma}pt — Roel {game.scores.roel}pt
          </p>
          <button
            onClick={startNewGame}
            className="bg-terracotta text-cream rounded-xl px-5 py-2 text-sm font-semibold hover:bg-terracotta/80 transition-colors"
          >
            Nog een ronde
          </button>
        </div>
      )}

      {/* Opponent's hand */}
      <div>
        <p className="text-xs font-semibold text-brown-light uppercase tracking-wide mb-2">
          {PLAYERS[opponent].name} ({oppHand.open.length + oppHand.gedekt.length} kaarten)
        </p>
        <div className="flex gap-1.5 flex-wrap">
          {oppHand.open.map((c) => (
            <CardFace key={c.id} card={c} disabled />
          ))}
          {oppHand.gedekt.map((c) => (
            <CardBack key={c.id} />
          ))}
        </div>
      </div>

      {/* Trick area */}
      <div className="bg-warm rounded-3xl p-4 min-h-[100px] flex items-center justify-center gap-6 border border-warm">
        {game.trick.length === 0 ? (
          <p className="text-brown-light text-sm">
            {game.trickWinner
              ? `${PLAYERS[game.trickWinner].name} won de slag`
              : isMyTurn
              ? "Jij begint — speel een kaart"
              : `Wacht op ${PLAYERS[game.currentPlayer].name}...`}
          </p>
        ) : (
          game.trick.map(({ player, card }) => (
            <div key={card.id} className="flex flex-col items-center gap-1">
              <p className="text-xs font-semibold text-brown-light">{PLAYERS[player].name}</p>
              <CardFace card={card} disabled />
            </div>
          ))
        )}
      </div>

      {/* My hand */}
      <div>
        <p className="text-xs font-semibold text-brown-light uppercase tracking-wide mb-2">
          Jouw kaarten ({allMyCards.length})
          {!isMyTurn && game.phase === "playing" && (
            <span className="ml-2 text-brown-light normal-case font-normal">— wacht op {PLAYERS[opponent].name}</span>
          )}
        </p>
        <div className="flex gap-1.5 flex-wrap">
          {myHand.open.map((c) => (
            <CardFace
              key={c.id}
              card={c}
              selected={selected === c.id}
              disabled={!isMyTurn}
              onClick={() => {
                if (!isMyTurn) return;
                if (selected === c.id) playCard(c);
                else setSelected(c.id);
              }}
            />
          ))}
          {myHand.gedekt.map((c) => (
            <CardFace
              key={c.id}
              card={c}
              selected={selected === c.id}
              disabled={!isMyTurn}
              onClick={() => {
                if (!isMyTurn) return;
                if (selected === c.id) playCard(c);
                else setSelected(c.id);
              }}
            />
          ))}
        </div>
        {isMyTurn && selected && (
          <p className="text-xs text-terracotta mt-2">Klik nog eens om te spelen, of kies een andere kaart</p>
        )}
      </div>

      {/* Deck remaining */}
      <div className="flex items-center gap-2">
        <p className="text-xs text-brown-light">{game.deck.length} kaarten in stapel</p>
      </div>

      {/* Log */}
      <div className="bg-warm rounded-2xl p-3 max-h-32 overflow-y-auto">
        <p className="text-xs font-semibold text-brown-light uppercase tracking-wide mb-1">Spelverloop</p>
        {game.log.map((entry, i) => (
          <p key={i} className="text-xs text-brown leading-relaxed">{entry}</p>
        ))}
      </div>

      {/* Switch player */}
      <button
        onClick={() => setMe(opponent)}
        className="text-xs text-brown-light hover:text-terracotta transition-colors underline text-center"
      >
        Speel als {PLAYERS[opponent].name}
      </button>
    </div>
  );
}
