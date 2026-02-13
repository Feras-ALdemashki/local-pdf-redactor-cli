import pc from "picocolors";
import stringWidth from "string-width";

const c = pc.isColorSupported ? pc : pc.createColors(false);

type AnyLine = unknown;

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function toLines(args: AnyLine[]): string[] {
  const out: string[] = [];

  const pushString = (s: string) => {
    // Support multi-line strings
    out.push(...s.split(/\r?\n/));
  };

  for (const a of args) {
    if (a === undefined) {
      out.push("undefined");
      continue;
    }
    if (a === null) {
      out.push("null");
      continue;
    }
    if (Array.isArray(a)) {
      out.push(...toLines(a));
      continue;
    }
    if (a instanceof Error) {
      pushString(a.stack ?? a.message);
      continue;
    }
    if (typeof a === "string") {
      pushString(a);
      continue;
    }
    if (
      typeof a === "number" ||
      typeof a === "boolean" ||
      typeof a === "bigint"
    ) {
      out.push(String(a));
      continue;
    }
    // objects, functions, etc.
    pushString(safeStringify(a));
  }

  // Avoid an empty box
  return out.length ? out : [""];
}

function hr(n: number): string {
  return "─".repeat(Math.max(0, n));
}

function padRightVisible(s: string, target: number): string {
  const w = stringWidth(s);
  return w >= target ? s : s + " ".repeat(target - w);
}

function renderBox(
  lines: string[],
  opts: { isError: boolean; isTTY: boolean },
): string {
  if (!opts.isTTY) return lines.join("\n");

  const padding = 1;

  const first = lines[0] ?? "";
  const hasHeader = lines.length >= 2 && first.trim().length > 0;

  // Header styling:
  const headerLine = opts.isError
    ? c.red(c.bold(first))
    : c.green(c.bold(first)); // ✅ green header for normal log()

  const contentLines = hasHeader
    ? [headerLine, "__SEP__", ...lines.slice(1)]
    : lines;

  const maxLineWidth = contentLines
    .filter((l) => l !== "__SEP__")
    .reduce((m, l) => Math.max(m, stringWidth(l)), 0);

  const inner = Math.max(20, maxLineWidth + padding * 2);

  const border = opts.isError
    ? (s: string) => c.red(s)
    : (s: string) => c.dim(s);

  const top = border(`┌${hr(inner + 2)}┐`);
  const sep = border(`├${hr(inner + 2)}┤`);
  const bot = border(`└${hr(inner + 2)}┘`);

  const renderLine = (line: string) => {
    const usable = inner - padding * 2;
    const leftPad = " ".repeat(padding);
    const rightPad = " ".repeat(padding);

    const left = border("│");
    const right = border("│");

    return `${left} ${leftPad}${padRightVisible(line, usable)}${rightPad} ${right}`;
  };

  const body = contentLines
    .map((l) => (l === "__SEP__" ? sep : renderLine(l)))
    .join("\n");

  return [top, body, bot].join("\n");
}

function write(
  stream: NodeJS.WriteStream,
  isError: boolean,
  args: AnyLine[],
): void {
  const lines = toLines(args);
  const isTTY = stream.isTTY && process.env.TERM !== "dumb";
  const text = renderBox(lines, { isError, isTTY });
  stream.write(text + "\n");
}

export function log(...args: AnyLine[]): void {
  write(process.stdout, false, args);
}

export function logErr(...args: AnyLine[]): void {
  write(process.stderr, true, args);
}
