"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";

declare global {
  interface Window {
    Spotify: {
      Player: new (opts: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume: number;
      }) => SpotifyPlayerInstance;
    };
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

interface SpotifyPlayerInstance {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(event: string, cb: (data: unknown) => void): void;
  togglePlay(): Promise<void>;
  previousTrack(): Promise<void>;
  nextTrack(): Promise<void>;
}

export type PlayerState = {
  playing: boolean;
  title: string;
  artist: string;
  album: string;
  image: string | null;
  progress: number;
  duration: number;
};

export type SpotifyTrack = {
  id: string;
  uri: string;
  title: string;
  artist: string;
  album: string;
  image: string | null;
  duration: number;
};

type SpotifyContextType = {
  connected: boolean | null;
  playerReady: boolean;
  state: PlayerState | null;
  playerRef: React.MutableRefObject<SpotifyPlayerInstance | null>;
  deviceIdRef: React.MutableRefObject<string | null>;
  tokenRef: React.MutableRefObject<string | null>;
  playUri: (uri: string) => Promise<void>;
};

const SpotifyContext = createContext<SpotifyContextType | null>(null);

export function useSpotify() {
  const ctx = useContext(SpotifyContext);
  if (!ctx) throw new Error("useSpotify must be used within SpotifyProvider");
  return ctx;
}

export function SpotifyProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [state, setState] = useState<PlayerState | null>(null);
  const playerRef = useRef<SpotifyPlayerInstance | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    fetch("/api/spotify/token").then(r => {
      if (r.status === 404) { setConnected(false); return null; }
      return r.json();
    }).then(data => {
      if (!data?.token) return;
      tokenRef.current = data.token;
      setConnected(true);
      loadSDK(data.token);
    });
  }, []);

  function loadSDK(token: string) {
    if (document.getElementById("spotify-sdk")) { initPlayer(token); return; }
    const script = document.createElement("script");
    script.id = "spotify-sdk";
    script.src = "https://sdk.scdn.co/spotify-player.js";
    document.body.appendChild(script);
    window.onSpotifyWebPlaybackSDKReady = () => initPlayer(token);
  }

  function initPlayer(token: string) {
    if (playerRef.current) return;
    const player = new window.Spotify.Player({
      name: "Jozzemiene",
      getOAuthToken: async cb => {
        const res = await fetch("/api/spotify/token");
        const data = await res.json();
        tokenRef.current = data.token;
        cb(data.token);
      },
      volume: 0.8,
    });

    player.addListener("ready", (data) => {
      const { device_id } = data as { device_id: string };
      deviceIdRef.current = device_id;
      setPlayerReady(true);
    });

    player.addListener("player_state_changed", (s) => {
      if (!s) return;
      const ps = s as {
        paused: boolean;
        position: number;
        duration: number;
        track_window: { current_track: { name: string; artists: { name: string }[]; album: { name: string; images: { url: string }[] } } };
      };
      const track = ps.track_window.current_track;
      setState({
        playing: !ps.paused,
        title: track.name,
        artist: track.artists.map(a => a.name).join(", "),
        album: track.album.name,
        image: track.album.images[0]?.url ?? null,
        progress: ps.position,
        duration: ps.duration,
      });
    });

    player.connect();
    playerRef.current = player;
  }

  async function playUri(uri: string) {
    if (!deviceIdRef.current || !tokenRef.current) return;
    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceIdRef.current}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${tokenRef.current}`, "Content-Type": "application/json" },
      body: JSON.stringify({ uris: [uri] }),
    });
  }

  return (
    <SpotifyContext.Provider value={{ connected, playerReady, state, playerRef, deviceIdRef, tokenRef, playUri }}>
      {children}
    </SpotifyContext.Provider>
  );
}
