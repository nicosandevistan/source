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

/** Lays out lines top-down in a column. lines = [size, text, indent?] or a number (extra gap). */
function column(x, top, lines) {
  const items = [];
  let y = top;
  for (const line of lines) {
    if (typeof line === "number") {
      y -= line;
      continue;
    }
    const [size, text, indent = 0] = line;
    // Text after a run of spaces is right-aligned, like a resume tab stop.
    const [left, right] = text.split(/ {3,}/);
    items.push([x + indent, y, size, left]);
    if (right) items.push([430, y, size, right]);
    y -= size + 5;
  }
  return items;
}

const H = 13; // section heading size
const T = 10; // body size

// Sizes copied from a real LinkedIn PDF: company 12, title 11.5, dates,
// locations and descriptions 10.5. Long names wrap onto a second line.
const C = 12;
const TI = 11.5;
const D = 10.5;

const linkedinPage1 = [
  ...column(30, 740, [
    [H, "Contact"],
    [D, "jordan.rivera@example.c"],
    [D, "om"],
    [D, "www.linkedin.com/in/jordan-rivera-example"],
    8,
    [H, "Top Skills"],
    [D, "Financial Modeling"],
    [D, "Market Research"],
    8,
    [H, "Languages"],
    [D, "Spanish (Native or Bilingual)"],
    [D, "Portuguese (Limited Working)"],
    8,
    [H, "Honors-Awards"],
    [D, "Riverbend Memorial Scholarship"],
    [D, "Dean's List"],
  ]),
  ...column(220, 740, [
    [26, "Jordan Rivera"],
    [12, "Student at Example State University | Economics"],
    [12, "Revere, Massachusetts, United States"],
    10,
    [15.8, "Summary"],
    [12, "First-generation student interested in life sciences strategy."],
    10,
    [15.8, "Experience"],
    [C, "Northwind Biotech"],
    [TI, "Strategy Intern"],
    [D, "June 2026 - August 2026 (3 months)"],
    [D, "Boston, Massachusetts, United States"],
    [D, "Built a market model for a rare disease program."],
    [D, "- Interviewed twelve physicians and summarized the findings for the"],
    [D, "head of strategy."],
    6,
    [C, "Example Consulting Group"],
    [D, "1 year 3 months"],
    [TI, "Senior Analyst"],
    [D, "March 2026 - Present (9 months)"],
    [TI, "Junior Analyst"],
    [D, "September 2025 - March 2026 (7 months)"],
    [D, "Amherst, Massachusetts, United States"],
    6,
    [C, "Riverside Institute for Science, Technology, and Engineering"],
    [C, "(previously RISE)"],
    [TI, "Summer Scholar"],
    [D, "June 2024 - August 2024 (3 months)"],
  ]),
  [384, 30, 9, "Page 1 of 2"],
];

const linkedinPage2 = [
  ...column(220, 740, [
    [D, "Research Operations Team"],
    [C, "Riverbend Coffee Co."],
    [TI, "Barista"],
    [D, "2023 - 2024 (1 year)"],
    10,
    [15.8, "Education"],
    [C, "Example State University"],
    [D, "Bachelor of Science - BS, Economics and Statistics & Data"],
    [D, "Science \u00b7 (2024 - 2028)"],
    6,
    [C, "MIT Educational Studies Program"],
    [D, "(2022 - 2022)"],
    6,
    [C, "Revere High School"],
  ]),
  [384, 30, 9, "Page 2 of 2"],
];

writeFileSync(`${OUT}sample-linkedin.pdf`, buildPdf([linkedinPage1, linkedinPage2]));

// Bullets sit at +9 points and their wrapped lines at +23, with no bullet
// mark, as in a real resume.
const resume = column(60, 740, [
  [16, "JORDAN RIVERA"],
  [9, "Revere, MA | jordan.rivera@example.com | (555) 555-0100"],
  10,
  [H, "EDUCATION"],
  [T, "Example State University, Amherst, MA                    Expected May 2028"],
  [T, "Bachelor of Science in Economics; GPA 3.6"],
  [9, "\u2022 Honors: Riverbend Memorial Scholarship (full-ride award)", 9],
  [T, "Revere High School, Revere, MA                                  2020 - 2024"],
  10,
  [H, "EXPERIENCE"],
  [T, "Northwind Biotech                                             Boston, MA"],
  [T, "Strategy Intern                                   Jun. 2026 - Aug. 2026"],
  [9, "\u2022 Built a market model for a rare disease program with PhD candidate", 9],
  [9, "Alex Smith; presented findings to the head of strategy", 23],
  [9, "\u2022 Ran an RNA-seq pipeline (STAR alignment, DESeq2 differential expression,", 9],
  [9, "GOseq pathway enrichment) to find shifts in microgravity", 23],
  [T, "Example Consulting Group                                    Amherst, MA"],
  [T, "Junior Analyst                                      Sep 2025 - Present"],
  [9, "\u2022 Sized the market for a regional health system.", 9],
  10,
  [H, "LEADERSHIP & PROJECTS"],
  [T, "Latin American Business Society | Treasurer             Jan 2025 - Present"],
  [9, "\u2022 Managed a budget for 12 events.", 9],
  [T, "iGEM Example Team | Vice President                      Dec 2023 - Aug 2024"],
  [9, "\u2022 Led design of 3 plasmid constructs for the largest bioengineering", 9],
  [9, "competition (150+ university teams)", 23],
  10,
  [H, "SKILLS & INTERESTS"],
  [9, "Technical: Excel, R, Python"],
  [9, "Languages: English and Spanish (bilingual), Portuguese, French"],
]);

writeFileSync(`${OUT}sample-resume.pdf`, buildPdf([resume]));
console.log("Wrote sample-linkedin.pdf and sample-resume.pdf");
