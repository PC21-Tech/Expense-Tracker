import * as XLSX from "xlsx";
import type { Category, Transaction } from "../types";

/** 导出/导入使用的统一行结构（不含自增 id） */
export type LedgerExportRow = {
  category_name: string;
  amount: number;
  date: number;
  description: string;
  type: "Expense" | "Income";
};

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

/** CSV 单行解析（支持双引号包裹字段） */
export function parseCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let i = 0;
  let inQuotes = false;
  while (i < line.length) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      i++;
      continue;
    }
    if (!inQuotes && c === delimiter) {
      out.push(cur.trim());
      cur = "";
      i++;
      continue;
    }
    cur += c;
    i++;
  }
  out.push(cur.trim().replace(/^"|"$/g, ""));
  return out;
}

function detectDelimiter(firstLine: string): string {
  const tabs = (firstLine.match(/\t/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return tabs > commas ? "\t" : ",";
}

function normalizeHeaderKey(h: string): string {
  const s = stripBom(h).trim();
  const sl = s.toLowerCase();
  const map: Record<string, string> = {
    category_name: "category_name",
    category: "category_name",
    category_id: "category_id",
    amount: "amount",
    date: "date",
    description: "description",
    desc: "description",
    type: "type",
    分类: "category_name",
    分类名称: "category_name",
    金额: "amount",
    时间: "date",
    日期: "date",
    备注: "description",
    说明: "description",
    类型: "type",
  };
  return map[s] ?? map[sl] ?? sl;
}

/** 将交易转为导出行（日期统一为 Unix 秒） */
export function transactionsToLedgerRows(
  transactions: Transaction[],
  categories: Category[]
): LedgerExportRow[] {
  return transactions.map((t) => {
    const cat = categories.find((c) => c.id === t.category_id);
    const dateSec =
      t.date >= 1_000_000_000_000 ? Math.floor(t.date / 1000) : t.date;
    return {
      category_name: cat?.name ?? "",
      amount: t.amount,
      date: dateSec,
      description: (t.description ?? "").replace(/\r?\n/g, " "),
      type: t.type,
    };
  });
}

export function ledgerRowsToCsv(rows: LedgerExportRow[]): string {
  const headers = [
    "category_name",
    "amount",
    "date",
    "description",
    "type",
  ];
  const esc = (v: string | number) => {
    const s = String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        esc(r.category_name),
        esc(r.amount),
        esc(r.date),
        esc(r.description),
        esc(r.type),
      ].join(",")
    ),
  ];
  return "\uFEFF" + lines.join("\r\n");
}

export function ledgerRowsToXlsxBase64(rows: LedgerExportRow[]): string {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Transactions");
  return XLSX.write(wb, { type: "base64", bookType: "xlsx" });
}

/** 解析 .csv / .txt（逗号或 Tab 分隔，首行为表头） */
export function parseLedgerTextFile(content: string): Record<string, string>[] {
  const text = stripBom(content.trim());
  if (!text) return [];
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) return [];
  const delimiter = detectDelimiter(lines[0]);
  const headerCells = parseCsvLine(lines[0], delimiter);
  const keys = headerCells.map(normalizeHeaderKey);
  const rows: Record<string, string>[] = [];
  for (let li = 1; li < lines.length; li++) {
    const cells = parseCsvLine(lines[li], delimiter);
    if (cells.every((c) => c === "")) continue;
    const row: Record<string, string> = {};
    keys.forEach((k, idx) => {
      row[k] = cells[idx] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

export function parseXlsxArrayBuffer(
  data: ArrayBuffer | Uint8Array
): Record<string, string>[] {
  const wb = XLSX.read(data, { type: "array" });
  const name = wb.SheetNames[0];
  if (!name) return [];
  const sheet = wb.Sheets[name];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: true,
    blankrows: false,
  });
  return raw.map((obj) => {
    const row: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj)) {
      const key = normalizeHeaderKey(String(k));
      if (!key || key.startsWith("__")) continue;
      row[key] =
        v === null || v === undefined ? "" : String(v).trim();
    }
    return row;
  });
}

export function parseXlsxBase64(base64: string): Record<string, string>[] {
  const clean = base64.replace(/\s/g, "");
  const buf = Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));
  return parseXlsxArrayBuffer(buf);
}

function normalizeType(raw: string): "Expense" | "Income" | null {
  const s = raw.trim();
  if (!s) return null;
  const sl = s.toLowerCase();
  if (sl === "expense" || s === "支出") return "Expense";
  if (sl === "income" || s === "收入") return "Income";
  return null;
}

/** 将单元格解析为 Unix 秒（支持 Unix 秒/毫秒、ISO 字符串、Excel 序列日期） */
export function parseDateCell(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const n = Number(s);
  if (Number.isFinite(n)) {
    if (n > 1_000_000_000_000) return Math.floor(n / 1000);
    if (n > 1_000_000_000) return Math.floor(n);
    // Excel 日期序列（约 1982–2173）
    if (n > 30_000 && n < 120_000) {
      const utc = (n - 25569) * 86400;
      return Math.floor(utc);
    }
    return null;
  }
  const ms = Date.parse(s);
  if (!Number.isFinite(ms)) return null;
  return Math.floor(ms / 1000);
}

export type ImportParseResult =
  | { ok: true; rows: LedgerExportRow[] }
  | { ok: false; errors: string[] };

/** 将表格行映射为可写入 DB 的结构 */
function findCategoryByName(
  categories: Category[],
  name: string
): Category | undefined {
  const t = stripBom(name).trim();
  if (!t) return undefined;
  const exact = categories.find((c) => c.name === t);
  if (exact) return exact;
  const tl = t.toLowerCase();
  return categories.find((c) => c.name.toLowerCase() === tl);
}

export function mapRawRowsToLedger(
  raw: Record<string, string>[],
  categories: Category[]
): ImportParseResult {
  const errors: string[] = [];
  const out: LedgerExportRow[] = [];
  const byId = new Map(categories.map((c) => [String(c.id), c]));

  raw.forEach((row, idx) => {
    const line = idx + 2;
    const idStr = (row.category_id ?? "").trim();
    const nameStr = (row.category_name ?? "").trim();
    const amountStr = String(row.amount ?? "").trim();
    const dateStr = String(row.date ?? "").trim();
    const typeStr = String(row.type ?? "").trim();
    if (!idStr && !nameStr && !amountStr && !dateStr && !typeStr) {
      return;
    }
    let cat: Category | undefined;
    if (idStr) {
      const n = Number(idStr.replace(/,/g, ""));
      if (Number.isFinite(n)) {
        const key = String(Math.floor(n));
        if (byId.has(key)) cat = byId.get(key);
      }
    }
    if (!cat && nameStr) cat = findCategoryByName(categories, nameStr);
    if (!cat) {
      errors.push(
        `第 ${line} 行：无法匹配分类（category_name="${nameStr}" 或 category_id=${idStr || "空"}）。须与数据库 Categories 表英文名或 id 一致。`
      );
      return;
    }
    const amount = Number(String(row.amount ?? "").replace(/,/g, ""));
    if (!Number.isFinite(amount)) {
      errors.push(`第 ${line} 行：金额无效`);
      return;
    }
    const dateSec = parseDateCell(String(row.date ?? ""));
    if (dateSec === null) {
      errors.push(`第 ${line} 行：日期无效`);
      return;
    }
    const type = normalizeType(String(row.type ?? ""));
    if (!type) {
      errors.push(`第 ${line} 行：类型须为 Expense/Income 或 支出/收入`);
      return;
    }
    out.push({
      category_name: cat.name,
      amount,
      date: dateSec,
      description: String(row.description ?? "").trim(),
      type,
    });
  });

  if (errors.length) return { ok: false, errors };
  if (out.length === 0) {
    return {
      ok: false,
      errors: [
        "未解析到任何有效记录。请确认：① 首行表头含 category_name、amount、date、type；② 分类名与库里英文一致；③ 若用 Excel 编辑过，勿删表头行。",
      ],
    };
  }
  return { ok: true, rows: out };
}
