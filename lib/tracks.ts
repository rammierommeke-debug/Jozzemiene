import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

export type Track = {
  id: string;
  name: string;
  url: string;
  created_at: string;
};

const MUSIC_DIR = path.join(process.cwd(), "public", "music");
const TRACKS_FILE = path.join(MUSIC_DIR, "tracks.json");

async function ensureDir() {
  await mkdir(MUSIC_DIR, { recursive: true });
}

export async function readTracksFile(): Promise<Track[]> {
  await ensureDir();
  try {
    const raw = await readFile(TRACKS_FILE, "utf-8");
    return JSON.parse(raw) as Track[];
  } catch {
    return [];
  }
}

export async function writeTracksFile(tracks: Track[]) {
  await ensureDir();
  await writeFile(TRACKS_FILE, JSON.stringify(tracks, null, 2), "utf-8");
}
