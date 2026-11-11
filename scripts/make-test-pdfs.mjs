// Writes the PDF fixtures in tests/fixtures/. Run with: node scripts/make-test-pdfs.mjs
// Every name in these files is made up.
//
// sample-linkedin.pdf copies the layout of LinkedIn's "Save to PDF": a narrow
// left column (Contact, Top Skills, Languages, Honors-Awards) beside the main
// column (name, headline, Summary, Experience, Education), with a
// "Page N of M" footer.
//
// sample-resume.pdf is a one-column student resume.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const OUT = fileURLToPath(new URL("../tests/fixtures/", import.meta.url));

/** Builds a minimal PDF. pages = [[x, y, size, text], ...][] */
function buildPdf(pages) {
  // WinAnsi puts the bullet at 0x95; latin1 would mangle U+2022.
  const esc = (s) => s.replace(/\u2022/g, "\x95").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const objects = [];
  const add = (body) => objects.push(body) && objects.length;

  const catalog = add(null);
  const pagesObj = add(null);
  const font = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const kids = [];
  for (const items of pages) {
    const stream = items
      .map(([x, y, size, text]) => `BT /F1 ${size} Tf ${x} ${y} Td (${esc(text)}) Tj ET`)
      .join("\n");
    const content = add(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
    kids.push(
      add(
        `<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${content} 0 R >>`,
      ),
    );
  }
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
  objects[pagesObj - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;

  let out = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += `${String(o).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

/** Lays out lines top-down in a column. lines = [size, text] or a number (extra gap). */
function column(x, top, lines) {
  const items = [];
  let y = top;
  for (const line of lines) {
    if (typeof line === "number") {
      y -= line;
      continue;
    }
    const [size, text] = line;
    // Text after a run of spaces is right-aligned, like a resume tab stop.
    const [left, right] = text.split(/ {3,}/);
    items.push([x, y, size, left]);
    if (right) items.push([430, y, size, right]);
    y -= size + 5;
  }
  return items;
}

const H = 13; // section heading size
const T = 10; // body size

const linkedinPage1 = [
  ...column(30, 740, [
    [H, "Contact"],
    [9, "jordan.rivera@example.com"],
    [9, "www.linkedin.com/in/jordan-rivera-example"],
    8,
    [H, "Top Skills"],
    [9, "Financial Modeling"],
    [9, "Market Research"],
    8,
    [H, "Languages"],
    [9, "Spanish (Native or Bilingual)"],
    [9, "Portuguese (Limited Working)"],
    8,
    [H, "Honors-Awards"],
    [9, "Riverbend Memorial Scholarship"],
    [9, "Dean's List"],
  ]),
  ...column(220, 740, [
    [26, "Jordan Rivera"],
    [T, "Student at Example State University | Economics"],
    [9, "Revere, Massachusetts, United States"],
    10,
    [H, "Summary"],
    [T, "First-generation student interested in life sciences strategy."],
    10,
    [H, "Experience"],
    [12, "Northwind Biotech"],
    [T, "Strategy Intern"],
    [9, "June 2026 - August 2026 (3 months)"],
    [9, "Boston, Massachusetts, United States"],
    [9, "Built a market model for a rare disease program."],
    6,
    [12, "Example Consulting Group"],
    [9, "1 year 3 months"],
    [T, "Senior Analyst"],
    [9, "March 2026 - Present (9 months)"],
    [T, "Junior Analyst"],
    [9, "September 2025 - March 2026 (7 months)"],
    [9, "Amherst, Massachusetts, United States"],
    6,
    [12, "Riverbend Coffee Co."],
    [T, "Barista"],
    [9, "2023 - 2024 (1 year)"],
  ]),
  [260, 30, 8, "Page 1 of 2"],
];

const linkedinPage2 = [
  ...column(220, 740, [
    [H, "Education"],
    [12, "Example State University"],
    [9, "Bachelor of Science - BS, Economics · (2024 - 2028)"],
    6,
    [12, "MIT Educational Studies Program"],
    [9, "(2022 - 2022)"],
    6,
    [12, "Revere High School"],
    [9, "High School Diploma · (2020 - 2024)"],
  ]),
  [260, 30, 8, "Page 2 of 2"],
];

writeFileSync(`${OUT}sample-linkedin.pdf`, buildPdf([linkedinPage1, linkedinPage2]));

const resume = column(60, 740, [
  [16, "JORDAN RIVERA"],
  [9, "Revere, MA | jordan.rivera@example.com | (555) 555-0100"],
  10,
  [H, "EDUCATION"],
  [T, "Example State University, Amherst, MA                    Expected May 2028"],
  [T, "Bachelor of Science in Economics; GPA 3.6"],
  [9, "• Riverbend Memorial Scholarship recipient"],
  [T, "Revere High School, Revere, MA                                  2020 - 2024"],
  10,
  [H, "EXPERIENCE"],
  [T, "Northwind Biotech                                             Boston, MA"],
  [T, "Strategy Intern                                   Jun. 2026 - Aug. 2026"],
  [9, "• Built a market model for a rare disease program."],
  [9, "• Presented findings to the head of strategy."],
  [T, "Example Consulting Group                                    Amherst, MA"],
  [T, "Junior Analyst                                      Sep 2025 - Present"],
  [9, "• Sized the market for a regional health system."],
  10,
  [H, "LEADERSHIP & ACTIVITIES"],
  [T, "Latin American Business Society                         Jan 2025 - Present"],
  [T, "Treasurer"],
  [9, "• Managed a budget for 12 events."],
  10,
  [H, "SKILLS & INTERESTS"],
  [9, "Languages: Spanish (native), Portuguese (conversational)"],
  [9, "Technical: Excel, R, Python"],
]);

writeFileSync(`${OUT}sample-resume.pdf`, buildPdf([resume]));
console.log("Wrote sample-linkedin.pdf and sample-resume.pdf");
