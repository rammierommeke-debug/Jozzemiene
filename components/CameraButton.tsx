"use client";

import { useRef, useState } from "react";
import { Camera, Check, Loader } from "lucide-react";

type Album = { id: string; name: string; emoji: string };

export default function CameraButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done">("idle");

  async function getOrCreateLiveGallery(): Promise<string> {
    const res = await fetch("/api/albums");
    const albums: Album[] = await res.json();
    const existing = albums.find(a => a.name.toLowerCase() === "live gallery");
    if (existing) return existing.id;
    const created = await fetch("/api/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Live Gallery", emoji: "📷" }),
    }).then(r => r.json());
    return created.id;
  }

  async function handleCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("uploading");

    try {
      const albumId = await getOrCreateLiveGallery();
      const ext = file.name.split(".").pop() ?? "jpg";

      const { signedUrl, filename } = await fetch("/api/photos/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ext }),
      }).then(r => r.json());

      await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/uploads/${filename}`;
      await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: publicUrl, caption: "", album_id: albumId }),
      });

      setStatus("done");
      setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setStatus("idle");
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" capture="environment"
        onChange={handleCapture} className="hidden" />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={status === "uploading"}
        className="md:hidden fixed bottom-24 left-4 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95
          bg-terracotta text-cream hover:bg-terracotta/80 disabled:opacity-60"
      >
        {status === "uploading" && <Loader size={20} className="animate-spin" />}
        {status === "done" && <Check size={20} />}
        {status === "idle" && <Camera size={20} />}
      </button>
    </>
  );
}
