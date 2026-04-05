import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function markdownToDocxXml(markdown: string, title: string): string {
  const escapeXml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const lines = markdown.split("\n");
  let body = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      body += `<w:p><w:pPr><w:spacing w:after="120"/></w:pPr></w:p>`;
      continue;
    }

    if (trimmed.startsWith("# ")) {
      const text = escapeXml(trimmed.slice(2));
      body += `<w:p><w:pPr><w:pStyle w:val="Heading1"/><w:spacing w:before="360" w:after="200"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="48"/></w:rPr><w:t>${text}</w:t></w:r></w:p>`;
    } else if (trimmed.startsWith("## ")) {
      const text = escapeXml(trimmed.slice(3));
      body += `<w:p><w:pPr><w:pStyle w:val="Heading2"/><w:spacing w:before="280" w:after="160"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="36"/></w:rPr><w:t>${text}</w:t></w:r></w:p>`;
    } else if (trimmed.startsWith("### ")) {
      const text = escapeXml(trimmed.slice(4));
      body += `<w:p><w:pPr><w:pStyle w:val="Heading3"/><w:spacing w:before="200" w:after="120"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>${text}</w:t></w:r></w:p>`;
    } else if (trimmed.startsWith("- ")) {
      const text = escapeXml(trimmed.slice(2));
      body += `<w:p><w:pPr><w:spacing w:after="60"/><w:ind w:left="720" w:hanging="360"/></w:pPr><w:r><w:t>• ${text}</w:t></w:r></w:p>`;
    } else if (trimmed === "---") {
      body += `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="CCCCCC"/></w:pBdr><w:spacing w:before="240" w:after="240"/></w:pPr></w:p>`;
    } else {
      let text = escapeXml(trimmed);
      // Handle bold
      const parts: string[] = [];
      const boldRegex = /\*\*(.+?)\*\*/g;
      let lastIndex = 0;
      let match;
      while ((match = boldRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          parts.push(`<w:r><w:rPr><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">${text.slice(lastIndex, match.index)}</w:t></w:r>`);
        }
        parts.push(`<w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>${match[1]}</w:t></w:r>`);
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < text.length) {
        parts.push(`<w:r><w:rPr><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">${text.slice(lastIndex)}</w:t></w:r>`);
      }
      body += `<w:p><w:pPr><w:spacing w:after="120" w:line="360" w:lineRule="auto"/></w:pPr>${parts.join("")}</w:p>`;
    }
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mo="http://schemas.microsoft.com/office/mac/office/2008/main"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:mv="urn:schemas-microsoft-com:mac:vml"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
  mc:Ignorable="w14 wp14">
  <w:body>
    ${body}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  return documentXml;
}

async function createDocxZip(documentXml: string): Promise<Uint8Array> {
  // Minimal DOCX structure using manual ZIP creation
  const encoder = new TextEncoder();

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const wordRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`;

  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": encoder.encode(contentTypes),
    "_rels/.rels": encoder.encode(rels),
    "word/_rels/document.xml.rels": encoder.encode(wordRels),
    "word/document.xml": encoder.encode(documentXml),
  };

  // Simple ZIP construction
  const centralDirectory: Uint8Array[] = [];
  const localFiles: Uint8Array[] = [];
  let offset = 0;
  const entries = Object.entries(files);

  for (const [name, data] of entries) {
    const nameBytes = encoder.encode(name);
    // Local file header
    const local = new Uint8Array(30 + nameBytes.length + data.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true); // signature
    view.setUint16(4, 20, true); // version
    view.setUint16(6, 0, true); // flags
    view.setUint16(8, 0, true); // compression (stored)
    view.setUint16(10, 0, true); // mod time
    view.setUint16(12, 0, true); // mod date
    // CRC32
    const crc = crc32(data);
    view.setUint32(14, crc, true);
    view.setUint32(18, data.length, true); // compressed size
    view.setUint32(22, data.length, true); // uncompressed size
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true); // extra length
    local.set(nameBytes, 30);
    local.set(data, 30 + nameBytes.length);
    localFiles.push(local);

    // Central directory entry
    const central = new Uint8Array(46 + nameBytes.length);
    const cView = new DataView(central.buffer);
    cView.setUint32(0, 0x02014b50, true);
    cView.setUint16(4, 20, true);
    cView.setUint16(6, 20, true);
    cView.setUint16(8, 0, true);
    cView.setUint16(10, 0, true);
    cView.setUint16(12, 0, true);
    cView.setUint16(14, 0, true);
    cView.setUint32(16, crc, true);
    cView.setUint32(20, data.length, true);
    cView.setUint32(24, data.length, true);
    cView.setUint16(28, nameBytes.length, true);
    cView.setUint16(30, 0, true);
    cView.setUint16(32, 0, true);
    cView.setUint16(34, 0, true);
    cView.setUint16(36, 0, true);
    cView.setUint32(38, 0, true);
    cView.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centralDirectory.push(central);

    offset += local.length;
  }

  const cdSize = centralDirectory.reduce((a, b) => a + b.length, 0);
  const endRecord = new Uint8Array(22);
  const eView = new DataView(endRecord.buffer);
  eView.setUint32(0, 0x06054b50, true);
  eView.setUint16(4, 0, true);
  eView.setUint16(6, 0, true);
  eView.setUint16(8, entries.length, true);
  eView.setUint16(10, entries.length, true);
  eView.setUint32(12, cdSize, true);
  eView.setUint32(16, offset, true);
  eView.setUint16(20, 0, true);

  const total = offset + cdSize + 22;
  const result = new Uint8Array(total);
  let pos = 0;
  for (const f of localFiles) { result.set(f, pos); pos += f.length; }
  for (const c of centralDirectory) { result.set(c, pos); pos += c.length; }
  result.set(endRecord, pos);

  return result;
}

function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, title, format } = await req.json();

    if (!content?.trim()) {
      return new Response(JSON.stringify({ error: "Content is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (format === "docx") {
      const docXml = markdownToDocxXml(content, title || "Book");
      const docxBytes = await createDocxZip(docXml);
      return new Response(docxBytes, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${(title || "book").replace(/[^a-zA-Z0-9]/g, "_")}.docx"`,
        },
      });
    }

    if (format === "epub") {
      // Simple EPUB generation
      const encoder = new TextEncoder();
      const safeTitle = title || "Book";
      const uid = crypto.randomUUID();

      // Convert markdown to basic HTML
      let html = content
        .replace(/^### (.+)$/gm, "<h3>$1</h3>")
        .replace(/^## (.+)$/gm, "<h2>$1</h2>")
        .replace(/^# (.+)$/gm, "<h1>$1</h1>")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/^- (.+)$/gm, "<li>$1</li>")
        .replace(/\n\n/g, "</p><p>")
        .replace(/\n/g, "<br/>");
      html = `<p>${html}</p>`;

      const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

      const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${uid}</dc:identifier>
    <dc:title>${safeTitle.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</dc:title>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().split(".")[0]}Z</meta>
  </metadata>
  <manifest>
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
  </manifest>
  <spine>
    <itemref idref="chapter1"/>
  </spine>
</package>`;

      const chapterXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${safeTitle.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</title>
<style>body{font-family:serif;line-height:1.6;margin:2em;} h1{font-size:2em;margin-top:1em;} h2{font-size:1.5em;margin-top:1em;} h3{font-size:1.2em;margin-top:0.8em;} p{margin:0.5em 0;}</style>
</head>
<body>${html}</body>
</html>`;

      const navXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Navigation</title></head>
<body>
<nav epub:type="toc"><h1>Table of Contents</h1><ol><li><a href="chapter1.xhtml">${safeTitle.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</a></li></ol></nav>
</body>
</html>`;

      // Build EPUB (which is a ZIP)
      const files: Record<string, Uint8Array> = {
        "mimetype": encoder.encode("application/epub+zip"),
        "META-INF/container.xml": encoder.encode(containerXml),
        "OEBPS/content.opf": encoder.encode(contentOpf),
        "OEBPS/chapter1.xhtml": encoder.encode(chapterXhtml),
        "OEBPS/nav.xhtml": encoder.encode(navXhtml),
      };

      // Simple ZIP (same as DOCX approach)
      const centralDirectory: Uint8Array[] = [];
      const localFiles: Uint8Array[] = [];
      let offset = 0;
      const fileEntries = Object.entries(files);

      for (const [name, data] of fileEntries) {
        const nameBytes = encoder.encode(name);
        const local = new Uint8Array(30 + nameBytes.length + data.length);
        const view = new DataView(local.buffer);
        view.setUint32(0, 0x04034b50, true);
        view.setUint16(4, 20, true);
        view.setUint16(8, 0, true);
        const crc = crc32(data);
        view.setUint32(14, crc, true);
        view.setUint32(18, data.length, true);
        view.setUint32(22, data.length, true);
        view.setUint16(26, nameBytes.length, true);
        local.set(nameBytes, 30);
        local.set(data, 30 + nameBytes.length);
        localFiles.push(local);

        const central = new Uint8Array(46 + nameBytes.length);
        const cView = new DataView(central.buffer);
        cView.setUint32(0, 0x02014b50, true);
        cView.setUint16(4, 20, true);
        cView.setUint16(6, 20, true);
        cView.setUint32(16, crc, true);
        cView.setUint32(20, data.length, true);
        cView.setUint32(24, data.length, true);
        cView.setUint16(28, nameBytes.length, true);
        cView.setUint32(42, offset, true);
        central.set(nameBytes, 46);
        centralDirectory.push(central);

        offset += local.length;
      }

      const cdSize = centralDirectory.reduce((a, b) => a + b.length, 0);
      const endRecord = new Uint8Array(22);
      const eView = new DataView(endRecord.buffer);
      eView.setUint32(0, 0x06054b50, true);
      eView.setUint16(8, fileEntries.length, true);
      eView.setUint16(10, fileEntries.length, true);
      eView.setUint32(12, cdSize, true);
      eView.setUint32(16, offset, true);

      const total = offset + cdSize + 22;
      const result = new Uint8Array(total);
      let pos = 0;
      for (const f of localFiles) { result.set(f, pos); pos += f.length; }
      for (const c of centralDirectory) { result.set(c, pos); pos += c.length; }
      result.set(endRecord, pos);

      return new Response(result, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/epub+zip",
          "Content-Disposition": `attachment; filename="${(safeTitle).replace(/[^a-zA-Z0-9]/g, "_")}.epub"`,
        },
      });
    }

    // Default: return markdown
    return new Response(content, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/markdown",
        "Content-Disposition": `attachment; filename="${(title || "book").replace(/[^a-zA-Z0-9]/g, "_")}.md"`,
      },
    });
  } catch (e) {
    console.error("export-book error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
