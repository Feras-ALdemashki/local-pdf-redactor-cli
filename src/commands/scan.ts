import fs from "node:fs/promises";
import path from "node:path";
import { extractPdfText } from "../PDF/extractText.js";
import { scanBaseline } from "../detectors/baseline.js";

type ScanOptions = {
  addTerm?: string[];
  addTermsFile?: string;
};

async function readTermsFile(filePath: string): Promise<string[]> {
  const raw = await fs.readFile(filePath, "utf8");
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function runScan(
  inputPath: string,
  options: ScanOptions,
): Promise<void> {
  const fullPath = path.resolve(inputPath);

  const stat = await fs.stat(fullPath).catch(() => null);
  if (!stat) {
    console.error(`scan: file not found: ${fullPath}`);
    process.exitCode = 2;
    return;
  }
  if (!stat.isFile()) {
    console.error(
      `scan: only single PDF files are supported in v1 scan (got: ${fullPath})`,
    );
    process.exitCode = 2;
    return;
  }
  if (path.extname(fullPath).toLowerCase() !== ".pdf") {
    console.error(`scan: not a PDF: ${fullPath}`);
    process.exitCode = 2;
    return;
  }

  const inlineTerms = options.addTerm ?? [];
  const fileTerms = options.addTermsFile
    ? await readTermsFile(options.addTermsFile)
    : [];
  const customTerms = [...inlineTerms, ...fileTerms];

  const result = await extractPdfText(fullPath);

  const hasTextLayer =
    result.totalTextItems > 0 && result.text.trim().length > 0;

  console.log("=== PDF Scan Report ===");
  console.log(`File: ${result.filePath}`);
  console.log(`Pages: ${result.numPages}`);
  console.log(`Text items: ${result.totalTextItems}`);
  console.log(
    `Text layer: ${hasTextLayer ? "YES (text-based PDF)" : "NO (likely scanned/image-only)"}`,
  );
  console.log("");

  if (!hasTextLayer) {
    console.log(
      "This PDF appears to have no extractable text. v1 does not support scanned PDFs.",
    );
    process.exitCode = 2;
    return;
  }

  const counts = scanBaseline(result.text, customTerms);

  console.log("Potential redactions (counts):");
  for (const [k, v] of Object.entries(counts)) {
    console.log(`- ${k}: ${v}`);
  }

  process.exitCode = 0;
}
