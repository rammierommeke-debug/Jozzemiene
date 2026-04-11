"use client";

import { useState, useEffect, useRef } from "react";
import { Image, Upload, Trash2, X } from "lucide-react";
import NextImage from "next/image";

type Photo = {
  id: string;
  url: string;
  caption: string;
  created_at: string;
};

export default function PhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/photos")
      .then((r) => r.json())
      .then((data) => setPhotos(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("caption", caption);
    const res = await fetch("/api/photos", { method: "POST", body: form });
    const created = await res.json();
    setPhotos((prev) => [created, ...prev]);
    setCaption("");
    if (fileRef.current) fileRef.current.value = "";
    setUploading(false);
  }

  async function deletePhoto(id: string) {
    await fetch(`/api/photos/${id}`, { method: "DELETE" });
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    if (lightbox?.id === id) setLightbox(null);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Image className="text-rose" size={28} />
        <h1 className="font-display text-3xl text-brown">Our Photos</h1>
      </div>

      {/* Upload area */}
      <div className="bg-warm rounded-3xl p-6 border border-warm mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        <div className="flex-1 flex flex-col gap-2">
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption..."
            className="bg-cream rounded-xl border border-warm px-4 py-2 text-sm text-brown focus:outline-none focus:border-rose w-full"
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm text-brown-light">Choose a photo to share</span>
          </label>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 bg-rose text-cream px-5 py-2.5 rounded-2xl text-sm font-semibold hover:bg-rose/80 transition-colors disabled:opacity-50"
          >
            <Upload size={16} />
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>

      {/* Photo grid */}
      {loading ? (
        <p className="text-brown-light text-sm text-center mt-10">Loading photos...</p>
      ) : photos.length === 0 ? (
        <div className="text-center mt-20">
          <p className="font-handwriting text-2xl text-brown-light">No photos yet 🌸</p>
          <p className="text-sm text-brown-light mt-1">Upload your first shared memory!</p>
        </div>
      ) : (
        <div className="columns-2 sm:columns-3 gap-4 space-y-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative group rounded-3xl overflow-hidden cursor-pointer break-inside-avoid"
              onClick={() => setLightbox(photo)}
            >
              <NextImage
                src={photo.url}
                alt={photo.caption || ""}
                width={400}
                height={400}
                className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-brown/0 group-hover:bg-brown/20 transition-all duration-200" />
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-brown/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-cream text-xs font-handwriting text-lg">{photo.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-brown/70 z-50 flex items-center justify-center p-6"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-cream rounded-3xl overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <NextImage
              src={lightbox.url}
              alt={lightbox.caption || ""}
              width={800}
              height={600}
              className="w-full object-contain max-h-[70vh]"
            />
            {lightbox.caption && (
              <div className="p-4">
                <p className="font-handwriting text-xl text-brown">{lightbox.caption}</p>
              </div>
            )}
            <div className="absolute top-3 right-3 flex gap-2">
              <button
                onClick={() => deletePhoto(lightbox.id)}
                className="bg-rose/90 text-cream rounded-xl p-2 hover:bg-rose transition-colors"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={() => setLightbox(null)}
                className="bg-brown/80 text-cream rounded-xl p-2 hover:bg-brown transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
