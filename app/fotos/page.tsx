"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Image, Upload, Trash2, X, Plus, FolderOpen, ChevronDown, ChevronRight, CheckSquare, Square, Pencil, Check, Download } from "lucide-react";
import NextImage from "next/image";

type Album = { id: string; name: string; emoji: string; created_at: string };
type Photo = { id: string; url: string; caption: string; album_id: string | null; created_at: string };

// ── Drag state shared via ref ─────────────────────────────────────────────────
let _draggedPhotoId: string | null = null;

export default function FotosPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [expandedAlbums, setExpandedAlbums] = useState<Set<string>>(new Set());
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [showAlbumForm, setShowAlbumForm] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [newAlbumEmoji, setNewAlbumEmoji] = useState("📸");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Drag-and-drop state
  const [dropTarget, setDropTarget] = useState<string | null>(null); // album id or "__none__"
  const [touchGhost, setTouchGhost] = useState<{ x: number; y: number; url: string } | null>(null);
  const touchDragPhoto = useRef<Photo | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/albums").then(r => r.json()),
      fetch("/api/photos").then(r => r.json()),
    ]).then(([a, p]) => {
      setAlbums(Array.isArray(a) ? a : []);
      setPhotos(Array.isArray(p) ? p : []);
    }).finally(() => setLoading(false));
  }, []);

  async function movePhoto(photoId: string, albumId: string | null) {
    await fetch(`/api/photos/${photoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ album_id: albumId }),
    });
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, album_id: albumId } : p));
  }

  // ── Desktop DnD handlers ──────────────────────────────────────────────────

  function onDragStart(photo: Photo) {
    _draggedPhotoId = photo.id;
  }

  function onDragEnd() {
    _draggedPhotoId = null;
    setDropTarget(null);
  }

  function onDragOver(e: React.DragEvent, albumId: string | null) {
    e.preventDefault();
    setDropTarget(albumId ?? "__none__");
  }

  function onDrop(e: React.DragEvent, albumId: string | null) {
    e.preventDefault();
    if (_draggedPhotoId) movePhoto(_draggedPhotoId, albumId);
    _draggedPhotoId = null;
    setDropTarget(null);
  }

  // ── Mobile touch DnD handlers ─────────────────────────────────────────────

  const onTouchStart = useCallback((photo: Photo, e: React.TouchEvent) => {
    touchDragPhoto.current = photo;
    const t = e.touches[0];
    setTouchGhost({ x: t.clientX, y: t.clientY, url: photo.url });
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchDragPhoto.current) return;
    e.preventDefault();
    const t = e.touches[0];
    setTouchGhost({ x: t.clientX, y: t.clientY, url: touchDragPhoto.current.url });

    // Find album under finger
    const el = document.elementFromPoint(t.clientX, t.clientY);
    const zone = el?.closest("[data-drop-album]") as HTMLElement | null;
    setDropTarget(zone ? zone.dataset.dropAlbum! : null);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (touchDragPhoto.current && dropTarget !== null) {
      const albumId = dropTarget === "__none__" ? null : dropTarget;
      movePhoto(touchDragPhoto.current.id, albumId);
    }
    touchDragPhoto.current = null;
    setTouchGhost(null);
    setDropTarget(null);
  }, [dropTarget]);

  // ── Regular handlers ──────────────────────────────────────────────────────

  async function createAlbum() {
    if (!newAlbumName.trim()) return;
    const res = await fetch("/api/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newAlbumName, emoji: newAlbumEmoji }),
    });
    const created = await res.json();
    setAlbums(prev => [created, ...prev]);
    setNewAlbumName(""); setNewAlbumEmoji("📸"); setShowAlbumForm(false);
  }

  async function deleteAlbum(id: string) {
    await fetch(`/api/albums/${id}`, { method: "DELETE" });
    setAlbums(prev => prev.filter(a => a.id !== id));
    setPhotos(prev => prev.map(p => p.album_id === id ? { ...p, album_id: null } : p));
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    setUploadProgress({ done: 0, total: files.length });
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop() ?? "jpg";
      const { signedUrl, filename, error: presignError } = await fetch("/api/photos/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ext }),
      }).then(r => r.json());
      if (presignError || !signedUrl) { setUploadProgress({ done: i + 1, total: files.length }); continue; }
      const uploadRes = await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!uploadRes.ok) { setUploadProgress({ done: i + 1, total: files.length }); continue; }
      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/uploads/${filename}`;
      const created = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: publicUrl, caption, album_id: selectedAlbum }),
      }).then(r => r.json());
      if (created?.id) setPhotos(prev => [created, ...prev]);
      setUploadProgress({ done: i + 1, total: files.length });
    }
    setCaption("");
    if (fileRef.current) fileRef.current.value = "";
    setUploading(false);
    setUploadProgress(null);
  }

  async function deletePhoto(id: string) {
    await fetch(`/api/photos/${id}`, { method: "DELETE" });
    setPhotos(prev => prev.filter(p => p.id !== id));
    if (lightbox?.id === id) setLightbox(null);
  }

  async function saveCaption() {
    if (!lightbox) return;
    const updated = await fetch(`/api/photos/${lightbox.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption: captionDraft }),
    }).then(r => r.json());
    setPhotos(prev => prev.map(p => p.id === updated.id ? updated : p));
    setLightbox(updated);
    setEditingCaption(false);
  }

  function openLightbox(photo: Photo) {
    setLightbox(photo);
    setCaptionDraft(photo.caption || "");
    setEditingCaption(false);
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    setDeleting(true);
    await Promise.all([...selected].map(id => fetch(`/api/photos/${id}`, { method: "DELETE" })));
    setPhotos(prev => prev.filter(p => !selected.has(p.id)));
    setSelected(new Set());
    setSelectMode(false);
    setDeleting(false);
  }

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function toggleExpand(id: string) {
    setExpandedAlbums(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const unassigned = photos.filter(p => !p.album_id);

  function dropZoneClass(id: string) {
    return dropTarget === id
      ? "ring-2 ring-terracotta ring-inset bg-terracotta/5"
      : "";
  }

  return (
    <div className="max-w-4xl mx-auto pt-14 md:pt-0">

      {/* Touch drag ghost */}
      {touchGhost && (
        <div className="fixed z-[999] pointer-events-none rounded-2xl overflow-hidden shadow-2xl opacity-80 w-20 h-20"
          style={{ left: touchGhost.x - 40, top: touchGhost.y - 40, transform: "scale(1.1)" }}>
          <NextImage src={touchGhost.url} alt="" width={80} height={80} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Image className="text-rose" size={28} />
          <h1 className="font-display text-3xl text-brown">Onze Foto's</h1>
        </div>
        <div className="flex gap-2">
          {selectMode ? (
            <>
              <button onClick={() => { setSelectMode(false); setSelected(new Set()); }}
                className="flex items-center gap-2 bg-warm text-brown-light px-4 py-2 rounded-2xl text-sm font-semibold hover:bg-warm/80 transition-colors">
                <X size={16} /> Annuleren
              </button>
              <button onClick={deleteSelected} disabled={selected.size === 0 || deleting}
                className="flex items-center gap-2 bg-rose text-cream px-4 py-2 rounded-2xl text-sm font-semibold hover:bg-rose/80 transition-colors disabled:opacity-40">
                <Trash2 size={16} />
                {deleting ? "Verwijderen..." : `Verwijder${selected.size > 0 ? ` (${selected.size})` : ""}`}
              </button>
            </>
          ) : (
            <>
              {photos.length > 0 && (
                <a href="/api/photos/download?album_id=all" download
                  className="flex items-center gap-2 bg-warm text-brown px-4 py-2 rounded-2xl text-sm font-semibold hover:bg-warm/80 transition-colors">
                  <Download size={16} /> Download foto's
                </a>
              )}
              <button onClick={() => setSelectMode(true)}
                className="flex items-center gap-2 bg-warm text-brown px-4 py-2 rounded-2xl text-sm font-semibold hover:bg-warm/80 transition-colors">
                <CheckSquare size={16} /> Selecteren
              </button>
              <button onClick={() => setShowAlbumForm(!showAlbumForm)}
                className="flex items-center gap-2 bg-rose text-cream px-4 py-2 rounded-2xl text-sm font-semibold hover:bg-rose/80 transition-colors">
                <Plus size={16} /> Nieuw album
              </button>
            </>
          )}
        </div>
      </div>

      {selectMode && (
        <div className="bg-rose-light/30 border border-warm rounded-2xl px-4 py-3 mb-5 flex items-center justify-between">
          <p className="text-sm text-brown">
            {selected.size === 0 ? "Klik op foto's om ze te selecteren" : `${selected.size} foto${selected.size !== 1 ? "'s" : ""} geselecteerd`}
          </p>
          <button onClick={() => setSelected(selected.size === photos.length ? new Set() : new Set(photos.map(p => p.id)))}
            className="text-xs font-semibold text-rose hover:text-rose/70 transition-colors">
            {selected.size === photos.length ? "Alles deselecteren" : "Alles selecteren"}
          </button>
        </div>
      )}

      {showAlbumForm && (
        <div className="bg-rose-light/30 rounded-3xl p-5 border border-warm mb-6">
          <p className="font-semibold text-brown mb-3 text-sm">Nieuw album aanmaken</p>
          <div className="flex gap-2 mb-3">
            <input value={newAlbumEmoji} onChange={e => setNewAlbumEmoji(e.target.value)}
              className="w-12 bg-cream rounded-xl border border-warm text-center py-2 focus:outline-none focus:border-rose" maxLength={2} />
            <input value={newAlbumName} onChange={e => setNewAlbumName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && createAlbum()}
              placeholder="Naam van het album (bv. Parijs 2024)"
              className="flex-1 bg-cream rounded-xl border border-warm px-4 py-2 text-sm text-brown focus:outline-none focus:border-rose" />
          </div>
          <div className="flex gap-2">
            <button onClick={createAlbum} className="flex-1 bg-rose text-cream rounded-xl py-2 text-sm font-semibold hover:bg-rose/80">Aanmaken</button>
            <button onClick={() => setShowAlbumForm(false)} className="flex-1 bg-warm text-brown-light rounded-xl py-2 text-sm hover:bg-warm/80">Annuleren</button>
          </div>
        </div>
      )}

      {!selectMode && (
        <div className="bg-warm rounded-3xl p-6 border border-warm mb-8">
          <p className="font-semibold text-brown mb-3 text-sm">Foto's uploaden</p>
          <div className="flex flex-col gap-3">
            <input value={caption} onChange={e => setCaption(e.target.value)}
              placeholder="Bijschrift toevoegen..."
              className="bg-cream rounded-xl border border-warm px-4 py-2 text-sm text-brown focus:outline-none focus:border-rose" />
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setSelectedAlbum(null)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${!selectedAlbum ? "bg-rose text-cream" : "bg-cream text-brown-light hover:bg-rose/20"}`}>
                Geen album
              </button>
              {albums.map(a => (
                <button key={a.id} onClick={() => setSelectedAlbum(a.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${selectedAlbum === a.id ? "bg-rose text-cream" : "bg-cream text-brown-light hover:bg-rose/20"}`}>
                  {a.emoji} {a.name}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex items-center gap-2 bg-rose text-cream px-5 py-2.5 rounded-2xl text-sm font-semibold hover:bg-rose/80 transition-colors disabled:opacity-50">
                <Upload size={16} />
                {uploading && uploadProgress ? `Uploaden ${uploadProgress.done}/${uploadProgress.total}...` : "Foto's kiezen & uploaden"}
              </button>
              {uploading && uploadProgress && (
                <div className="w-full bg-cream rounded-full h-1.5 overflow-hidden">
                  <div className="bg-rose h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${(uploadProgress.done / uploadProgress.total) * 100}%` }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-brown-light text-sm text-center mt-10">Laden...</p>
      ) : (
        <div className="flex flex-col gap-4">

          {albums.map(album => {
            const albumPhotos = photos.filter(p => p.album_id === album.id);
            const expanded = expandedAlbums.has(album.id);
            const isTarget = dropTarget === album.id;
            return (
              <div key={album.id}
                data-drop-album={album.id}
                className={`bg-cream rounded-3xl border-2 overflow-hidden transition-all duration-150 ${isTarget ? "border-terracotta bg-terracotta/5" : "border-warm"}`}
                onDragOver={e => onDragOver(e, album.id)}
                onDragLeave={() => setDropTarget(null)}
                onDrop={e => onDrop(e, album.id)}
              >
                <button onClick={() => toggleExpand(album.id)}
                  className="w-full flex items-center gap-3 p-5 hover:bg-warm/30 transition-colors group">
                  <span className="text-xl">{album.emoji}</span>
                  <div className="flex-1 text-left">
                    <p className="font-display text-lg text-brown">{album.name}</p>
                    <p className="text-xs text-brown-light">
                      {albumPhotos.length} foto{albumPhotos.length !== 1 ? "'s" : ""}
                      {isTarget && <span className="ml-2 text-terracotta font-semibold">← sleep hier naartoe</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {albumPhotos.length > 0 && (
                      <a href={`/api/photos/download?album_id=${album.id}`} download
                        onClick={e => e.stopPropagation()}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-sage font-semibold hover:text-sage/70 transition-all p-1">
                        <Download size={14} />
                      </a>
                    )}
                    <button onClick={e => { e.stopPropagation(); deleteAlbum(album.id); }}
                      className="opacity-0 group-hover:opacity-100 text-rose transition-opacity p-1">
                      <Trash2 size={14} />
                    </button>
                    {expanded ? <ChevronDown size={16} className="text-brown-light" /> : <ChevronRight size={16} className="text-brown-light" />}
                  </div>
                </button>
                {expanded && (
                  <div className="px-5 pb-5">
                    {albumPhotos.length === 0 ? (
                      <p className="text-sm text-brown-light italic text-center py-4">
                        {isTarget ? "✨ Laat los om te verplaatsen" : "Nog geen foto's in dit album 🌸"}
                      </p>
                    ) : (
                      <div className="columns-2 sm:columns-3 gap-3 space-y-3">
                        {albumPhotos.map(photo => (
                          <PhotoCard key={photo.id} photo={photo}
                            onOpen={openLightbox}
                            selectMode={selectMode}
                            selected={selected.has(photo.id)}
                            onToggleSelect={toggleSelect}
                            onDragStart={() => onDragStart(photo)}
                            onDragEnd={onDragEnd}
                            onTouchStart={e => onTouchStart(photo, e)}
                            onTouchMove={onTouchMove}
                            onTouchEnd={onTouchEnd}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Overige foto's — ook een drop zone */}
          {(unassigned.length > 0 || dropTarget === "__none__") && (
            <div
              data-drop-album="__none__"
              className={`bg-cream rounded-3xl border-2 overflow-hidden transition-all duration-150 ${dropTarget === "__none__" ? "border-terracotta bg-terracotta/5" : "border-warm"}`}
              onDragOver={e => onDragOver(e, null)}
              onDragLeave={() => setDropTarget(null)}
              onDrop={e => onDrop(e, null)}
            >
              <button onClick={() => toggleExpand("__none__")}
                className="w-full flex items-center gap-3 p-5 hover:bg-warm/30 transition-colors group">
                <FolderOpen size={20} className="text-brown-light" />
                <div className="flex-1 text-left">
                  <p className="font-display text-lg text-brown">Overige foto's</p>
                  <p className="text-xs text-brown-light">
                    {unassigned.length} foto{unassigned.length !== 1 ? "'s" : ""}
                    {dropTarget === "__none__" && <span className="ml-2 text-terracotta font-semibold">← sleep hier naartoe</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a href="/api/photos/download?album_id=none" download onClick={e => e.stopPropagation()}
                    className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-sage font-semibold hover:text-sage/70 transition-all p-1">
                    <Download size={14} />
                  </a>
                  {expandedAlbums.has("__none__") ? <ChevronDown size={16} className="text-brown-light" /> : <ChevronRight size={16} className="text-brown-light" />}
                </div>
              </button>
              {expandedAlbums.has("__none__") && (
                <div className="px-5 pb-5">
                  <div className="columns-2 sm:columns-3 gap-3 space-y-3">
                    {unassigned.map(photo => (
                      <PhotoCard key={photo.id} photo={photo}
                        onOpen={openLightbox}
                        selectMode={selectMode}
                        selected={selected.has(photo.id)}
                        onToggleSelect={toggleSelect}
                        onDragStart={() => onDragStart(photo)}
                        onDragEnd={onDragEnd}
                        onTouchStart={e => onTouchStart(photo, e)}
                        onTouchMove={onTouchMove}
                        onTouchEnd={onTouchEnd}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {photos.length === 0 && albums.length === 0 && (
            <div className="text-center mt-10">
              <p className="font-handwriting text-2xl text-brown-light">Nog geen foto's 🌸</p>
              <p className="text-sm text-brown-light mt-1">Maak een album aan en upload jullie eerste herinnering!</p>
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && !selectMode && (
        <div className="fixed inset-0 bg-brown/70 z-50 flex items-center justify-center p-6"
          onClick={() => { setLightbox(null); setEditingCaption(false); }}>
          <div className="relative max-w-2xl w-full bg-cream rounded-3xl overflow-hidden shadow-xl"
            onClick={e => e.stopPropagation()}>
            <NextImage src={lightbox.url} alt={lightbox.caption || ""} width={800} height={600}
              className="w-full object-contain max-h-[65vh]" />
            <div className="p-4 flex items-start gap-3">
              {editingCaption ? (
                <div className="flex-1 flex gap-2 items-start">
                  <textarea value={captionDraft} onChange={e => setCaptionDraft(e.target.value)}
                    placeholder="Schrijf een berichtje bij deze foto..." autoFocus rows={2}
                    className="flex-1 bg-warm rounded-xl border border-warm px-3 py-2 text-sm text-brown focus:outline-none focus:border-rose resize-none font-handwriting text-lg" />
                  <div className="flex flex-col gap-1">
                    <button onClick={saveCaption} className="bg-sage text-cream rounded-xl p-2 hover:bg-sage/80 transition-colors"><Check size={15} /></button>
                    <button onClick={() => { setEditingCaption(false); setCaptionDraft(lightbox.caption || ""); }}
                      className="bg-warm text-brown-light rounded-xl p-2 hover:bg-warm/80 transition-colors"><X size={15} /></button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center gap-2 group/caption">
                  <p onClick={() => setEditingCaption(true)}
                    className={`flex-1 font-handwriting text-xl cursor-text ${lightbox.caption ? "text-brown" : "text-brown-light italic"} hover:text-terracotta transition-colors`}>
                    {lightbox.caption || "Voeg een berichtje toe..."}
                  </p>
                  <button onClick={() => setEditingCaption(true)}
                    className="opacity-0 group-hover/caption:opacity-100 transition-opacity text-brown-light hover:text-terracotta">
                    <Pencil size={14} />
                  </button>
                </div>
              )}
            </div>
            <div className="absolute top-3 right-3 flex gap-2">
              <button onClick={() => deletePhoto(lightbox.id)}
                className="bg-rose/90 text-cream rounded-xl p-2 hover:bg-rose transition-colors"><Trash2 size={16} /></button>
              <button onClick={() => { setLightbox(null); setEditingCaption(false); }}
                className="bg-brown/80 text-cream rounded-xl p-2 hover:bg-brown transition-colors"><X size={16} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PhotoCard({ photo, onOpen, selectMode, selected, onToggleSelect, onDragStart, onDragEnd, onTouchStart, onTouchMove, onTouchEnd }: {
  photo: Photo;
  onOpen: (p: Photo) => void;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}) {
  return (
    <div
      className={`relative group rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing break-inside-avoid transition-all ${selected ? "ring-3 ring-rose scale-[0.97]" : ""}`}
      draggable={!selectMode}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onTouchStart={selectMode ? undefined : onTouchStart}
      onTouchMove={selectMode ? undefined : onTouchMove}
      onTouchEnd={selectMode ? undefined : onTouchEnd}
      onClick={() => selectMode ? onToggleSelect(photo.id) : onOpen(photo)}
    >
      <NextImage src={photo.url} alt={photo.caption || ""} width={400} height={400}
        className="w-full object-cover transition-transform duration-300 group-hover:scale-105" />
      <div className={`absolute inset-0 transition-all duration-200 ${selected ? "bg-rose/30" : "bg-brown/0 group-hover:bg-brown/20"}`} />
      {selectMode && (
        <div className="absolute top-2 left-2">
          {selected ? <CheckSquare size={20} className="text-rose drop-shadow" /> : <Square size={20} className="text-white drop-shadow" />}
        </div>
      )}
      {photo.caption && !selectMode && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-brown/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-cream font-handwriting text-base">{photo.caption}</p>
        </div>
      )}
    </div>
  );
}
