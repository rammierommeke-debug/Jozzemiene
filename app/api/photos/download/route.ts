import { supabase } from "@/lib/supabase";
import AdmZip from "adm-zip";

export const runtime = "nodejs";

type Photo = { id: string; url: string; caption: string; album_id: string | null };
type Album = { id: string; name: string };

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const albumId = searchParams.get("album_id");

  let query = supabase.from("photos").select("*");
  if (albumId === "none") query = query.is("album_id", null);
  else if (albumId !== "all") query = query.eq("album_id", albumId);

  const { data: photos } = await query;
  if (!photos || photos.length === 0) return new Response("Geen foto's gevonden", { status: 404 });

  let zipName = "alle-fotos";
  if (albumId === "none") zipName = "overige-fotos";
  else if (albumId && albumId !== "all") {
    const { data: album } = await supabase.from("albums").select("name").eq("id", albumId).single();
    if (album) zipName = (album as Album).name.replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "album";
  }

  const zip = new AdmZip();

  await Promise.all((photos as Photo[]).map(async (photo, i) => {
    try {
      const res = await fetch(photo.url);
      if (!res.ok) return;
      const buffer = Buffer.from(await res.arrayBuffer());
      const ext = photo.url.split(".").pop()?.split("?")[0] ?? "jpg";
      const caption = photo.caption?.replace(/[^a-zA-Z0-9\s]/g, "").trim().slice(0, 40).replace(/\s+/g, "-") || "";
      const filename = caption
        ? `${String(i + 1).padStart(2, "0")}-${caption}.${ext}`
        : `foto-${String(i + 1).padStart(2, "0")}.${ext}`;
      zip.addFile(filename, buffer);
    } catch {}
  }));

  const buffer = zip.toBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipName}.zip"`,
      "Content-Length": String(buffer.length),
    },
  });
}
