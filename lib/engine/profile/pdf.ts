import { extractTextItems } from "unpdf";

/** One line of text as it sits on the page. */
export type PdfLine = {
  text: string;
  /** Left edge, in PDF points. */
  x: number;
  page: number;
  fontSize: number;
  /** "side" is LinkedIn's narrow left column; everything else is "main". */
  column: "main" | "side";
};

/** Headings that open LinkedIn's main column. Used to find where it starts. */
const MAIN_COLUMN_HEADINGS = new Set(["summary", "experience", "education"]);

/** Gap (in points) between two pieces on one line that counts as a tab stop. */
const TAB_GAP = 12;

/**
 * Reads a PDF into lines, top to bottom, keeping where each line sits. Pieces
 * on the same line separated by a wide gap (a resume's right-aligned dates,
 * say) are joined with a tab so parsers can split them again.
 *
 * LinkedIn's "Save to PDF" has two columns. Reading them as one stream mixes
 * the sidebar into the main text, so lines left of the main column's
 * headings are marked "side" and returned before the main column.
 */
export async function extractPdfLines(bytes: Uint8Array): Promise<PdfLine[]> {
  const { items } = await extractTextItems(bytes);

  const pages = items.map((pageItems, pageIndex) => {
    const pieces = pageItems.filter((item) => item.str.trim() !== "");
    // Group pieces into lines by their baseline.
    const rows: { y: number; pieces: typeof pieces }[] = [];
    for (const piece of [...pieces].sort((a, b) => b.y - a.y || a.x - b.x)) {
      const row = rows.find((r) => Math.abs(r.y - piece.y) <= Math.max(2, piece.fontSize * 0.3));
      if (row) row.pieces.push(piece);
      else rows.push({ y: piece.y, pieces: [piece] });
    }
    return rows.map((row) => ({ row, page: pageIndex + 1 }));
  });

  // Where does the main column start? The x of a main heading, if it is
  // clearly indented from the page's left edge.
  const all = pages.flat().flatMap(({ row }) => row.pieces);
  const leftEdge = Math.min(...all.map((p) => p.x));
  const headingX = all
    .filter((p) => MAIN_COLUMN_HEADINGS.has(p.str.trim().toLowerCase()))
    .map((p) => p.x);
  const split = headingX.length && Math.min(...headingX) - leftEdge > 100 ? Math.min(...headingX) - 5 : null;

  const side: PdfLine[] = [];
  const main: PdfLine[] = [];
  for (const { row, page } of pages.flat()) {
    const byColumn = { side: [] as typeof row.pieces, main: [] as typeof row.pieces };
    for (const piece of row.pieces) byColumn[split !== null && piece.x < split ? "side" : "main"].push(piece);
    for (const column of ["side", "main"] as const) {
      const pieces = byColumn[column].sort((a, b) => a.x - b.x);
      if (!pieces.length) continue;
      let text = "";
      let end = pieces[0].x;
      for (const piece of pieces) {
        if (text) text += piece.x - end > TAB_GAP ? "\t" : piece.x - end > 1 ? " " : "";
        text += piece.str;
        end = piece.x + piece.width;
      }
      const line = {
        text: text.replace(/[  ]+/g, " ").trim(),
        x: pieces[0].x,
        page,
        fontSize: Math.max(...pieces.map((p) => p.fontSize)),
        column,
      };
      if (line.text) (column === "side" ? side : main).push(line);
    }
  }
  return [...side, ...main];
}

/** Plain text of a PDF, one line per line. */
export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  return (await extractPdfLines(bytes)).map((line) => line.text).join("\n");
}
