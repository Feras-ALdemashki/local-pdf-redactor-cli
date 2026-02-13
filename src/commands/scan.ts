import fs from "node:fs/promises";
import path from "node:path";
import { extractPdfText } from "../PDF/extractText.js";
import { scanBaseline } from "../detectors/baseline.js";
import { log, logErr } from "../UI/log.js";
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
    logErr(`scan: file not found: ${fullPath}`);
    process.exitCode = 2;
    return;
  }
  if (!stat.isFile()) {
    logErr(
      `scan: only single PDF files are supported in v1 scan (got: ${fullPath})`,
    );
    process.exitCode = 2;
    return;
  }
  if (path.extname(fullPath).toLowerCase() !== ".pdf") {
    logErr(`scan: not a PDF: ${fullPath}`);
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
  log(
    "PDF Scan Report",
    `File: ${result.filePath}`,
    `Pages: ${result.numPages}`,
    `Text items: ${result.totalTextItems}`,
    `Text layer: ${hasTextLayer ? "YES (text-based PDF)" : "NO (likely scanned/image-only)"}`,
  );

  if (!hasTextLayer) {
    log(
      "This PDF appears to have no extractable text. v1 does not support scanned PDFs.",
    );
    process.exitCode = 2;
    return;
  }

  const counts = scanBaseline(result.text, customTerms);

  const entries = Object.entries(counts);
  const keyWidth = Math.max(0, ...entries.map(([k]) => k.length));

  log(
    "Potential redactions (counts):",
    ...entries.map(([k, v]) => `- ${k.padEnd(keyWidth)} : ${v}`),
  );

  process.exitCode = 0;
}
