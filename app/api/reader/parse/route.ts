import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function splitIntoChunks(text: string, maxChars = 900): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+[\s]*/g) ?? [text];
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if ((current + sentence).length > maxChars && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(c => c.length > 10);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Geen bestand" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    const buffer = Buffer.from(await file.arrayBuffer());
    // dynamic import to avoid edge runtime issues
    const pdfParseModule = await import("pdf-parse");
    const pdfParse = (pdfParseModule as unknown as { default: typeof pdfParseModule }).default ?? pdfParseModule;
    const data = await pdfParse(buffer);
    const chunks = splitIntoChunks(data.text);
    return NextResponse.json({ title: file.name.replace(/\.pdf$/i, ""), chunks });
  }

  if (ext === "txt") {
    const text = await file.text();
    const chunks = splitIntoChunks(text);
    return NextResponse.json({ title: file.name.replace(/\.txt$/i, ""), chunks });
  }

  if (ext === "epub") {
    const JSZip = (await import("jszip")).default;
    const buffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);

    // Extract text from all HTML content files
    let fullText = "";
    const htmlFiles = Object.keys(zip.files).filter(f =>
      f.match(/\.(html|xhtml|htm)$/i) && !f.includes("toc") && !f.includes("nav")
    ).sort();

    for (const filename of htmlFiles) {
      const content = await zip.files[filename].async("text");
      const stripped = content
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, " ")
        .trim();
      if (stripped.length > 50) fullText += stripped + " ";
    }

    // Try to get title from OPF
    let title = file.name.replace(/\.epub$/i, "");
    const opfFile = Object.keys(zip.files).find(f => f.endsWith(".opf"));
    if (opfFile) {
      const opfContent = await zip.files[opfFile].async("text");
      const match = opfContent.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
      if (match) title = match[1].trim();
    }

    const chunks = splitIntoChunks(fullText);
    return NextResponse.json({ title, chunks });
  }

  return NextResponse.json({ error: "Alleen PDF, EPUB of TXT bestanden" }, { status: 400 });
}
