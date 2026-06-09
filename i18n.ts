/**
 * 界面文案与分类显示名（数据库内仍为英文 category name / type）。
 */

export const categoryLabelsZh: Record<string, string> = {
  Groceries: "杂货",
  Rent: "房租",
  Salary: "工资",
  Freelancing: "自由职业",
  Utilities: "水电杂费",
  Electronics: "电子产品",
  "Dining Out": "外出就餐",
  "Breakfast Supplies": "早餐食材",
  "Household Items": "家居用品",
  "Christmas Gifts": "圣诞礼物",
  "New Year Party Supplies": "新年派对",
  "Thanksgiving Groceries": "感恩节食材",
  Bonus: "奖金",
  "Consulting Work": "咨询收入",
  "Part-Time Job": "兼职",
  "Part-time Job": "兼职",
  "Online Sales": "网店销售",
  "Freelance Writing": "撰稿收入",
  "End of Year Bonus": "年终奖",
  "Thanksgiving Freelance": "感恩节兼职",
  Default: "未分类",
};

export function categoryDisplayName(name: string | undefined): string {
  if (!name) return categoryLabelsZh.Default;
  return categoryLabelsZh[name] ?? name;
}
