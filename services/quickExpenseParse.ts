import { categoryLabelsZh } from "../i18n";

export type QuickNlParseOk = {
  /** 金额数字串（不含「元」等），可直接写入金额输入框 */
  amount: string;
  /** 用户描述（如「午饭」「打车」），写入备注 */
  label: string;
};

const CURRENCY_SUFFIX = "(?:元|块|￥|圆|人民币|M|m)?";

/** 解析「描述 + 金额」或「金额 + 描述」，支持少量中英文货币后缀 */
export function parseQuickNlExpense(raw: string): QuickNlParseOk | null {
  const s = raw.trim().replace(/\s+/g, " ");
  if (!s) return null;

  const amountFirst = new RegExp(
    `^(\\d+(?:\\.\\d+)?)\\s*${CURRENCY_SUFFIX}\\s*(.+)$`,
    "u"
  );
  if (/^\d/u.test(s)) {
    const m = s.match(amountFirst);
    if (m) {
      const label = m[2].trim();
      if (label) return { amount: m[1], label };
    }
  }

  const spaced = new RegExp(
    `^(.+?)\\s+(\\d+(?:\\.\\d+)?)\\s*${CURRENCY_SUFFIX}$`,
    "u"
  );
  const a = s.match(spaced);
  if (a) {
    const label = a[1].trim();
    if (label) return { amount: a[2], label };
  }

  const compact = new RegExp(`^(.+?)(\\d+(?:\\.\\d+)?)\\s*${CURRENCY_SUFFIX}$`, "u");
  const b = s.match(compact);
  if (b) {
    const label = b[1].trim();
    if (label) return { amount: b[2], label };
  }

  return null;
}

type Hint = { re: RegExp; categoryName: string };

/** 支出类关键词 → 与预置 Categories.name 一致 */
const EXPENSE_HINTS: Hint[] = [
  { re: /感恩/, categoryName: "Thanksgiving Groceries" },
  { re: /圣诞/, categoryName: "Christmas Gifts" },
  { re: /新年|派对/, categoryName: "New Year Party Supplies" },
  { re: /午|餐|饭|吃|外卖|聚餐|火锅|咖啡|奶茶|餐厅|小吃/, categoryName: "Dining Out" },
  { re: /早|面包|牛奶|食材/, categoryName: "Breakfast Supplies" },
  { re: /水|电|气|话费|网费|宽|物业|暖/, categoryName: "Utilities" },
  { re: /手机|电脑|数码|电器|配件/, categoryName: "Electronics" },
  { re: /打|滴|出租|交通|停车|加油|地铁|公交/, categoryName: "Household Items" },
  { re: /日用|家居|超市|杂/, categoryName: "Household Items" },
];

const INCOME_HINTS: Hint[] = [
  { re: /年终|年底/, categoryName: "End of Year Bonus" },
  { re: /感恩.*兼|兼.*感恩/, categoryName: "Thanksgiving Freelance" },
  { re: /奖|红利/, categoryName: "Bonus" },
  { re: /咨询/, categoryName: "Consulting Work" },
  { re: /稿|撰稿|写稿/, categoryName: "Freelance Writing" },
  { re: /网店|线上.*卖|卖.*货/, categoryName: "Online Sales" },
  { re: /兼职|小时工|时薪/, categoryName: "Part-time Job" },
];

function matchHints(label: string, hints: Hint[]): string | undefined {
  const t = label.trim();
  if (!t) return undefined;
  for (const { re, categoryName } of hints) {
    if (re.test(t)) return categoryName;
  }
  return undefined;
}

/** 根据中文/关键词猜测 Categories.name（英文键）；无把握时返回 undefined */
export function suggestCategoryNameFromLabel(label: string): string | undefined {
  const t = label.trim();
  if (!t) return undefined;

  for (const [en, zh] of Object.entries(categoryLabelsZh)) {
    if (zh === t) return en;
    if (t.includes(zh) || zh.includes(t)) return en;
  }

  return matchHints(t, EXPENSE_HINTS) ?? matchHints(t, INCOME_HINTS);
}
