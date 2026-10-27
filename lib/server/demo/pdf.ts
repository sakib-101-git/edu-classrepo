import "server-only";

/** Builds a small, valid one-page PDF so demo materials can be previewed. */
export function makeSamplePdf(title: string, lines: string[]): Uint8Array {
  const esc = (t: string) => t.replace(/[^\x20-\x7e]/g, "?").replace(/([\\()])/g, "\\$1");
  const body = [
    "BT /F1 22 Tf 72 740 Td (" + esc(title) + ") Tj ET",
    "BT /F1 11 Tf 72 712 Td (EDU ClassRepo - demo mode sample file) Tj ET",
    ...lines.map((l, i) => `BT /F1 12 Tf 72 ${670 - i * 20} Td (${esc(l)}) Tj ET`),
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${body.length} >>\nstream\n${body}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(out);
}
