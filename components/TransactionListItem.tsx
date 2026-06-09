import { AntDesign } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { Category, Transaction } from "../types";
import { AutoSizeText, ResizeTextMode } from "react-native-auto-size-text";
import { categoryColors, categoryEmojies } from "../constants";
import { categoryDisplayName } from "../i18n";
import Card from "./ui/Card";

/** 库内一般为 Unix 秒；若误存为毫秒（数值通常 ≥ 1e12），不可再乘 1000，否则年份会异常 */
function formatTransactionDate(epoch: number): string {
  if (!Number.isFinite(epoch)) return "—";
  const ms = epoch >= 1_000_000_000_000 ? epoch : epoch * 1000;
  return new Date(ms).toLocaleString("zh-CN");
}

interface TransactionListItemProps {
  transaction: Transaction;
  categoryInfo: Category | undefined;
  selectionMode?: boolean;
  selected?: boolean;
}

export default function TransactionListItem({
  transaction,
  categoryInfo,
  selectionMode = false,
  selected = false,
}: TransactionListItemProps) {
  const iconName =
    transaction.type === "Expense" ? "minuscircle" : "pluscircle";
  const color = transaction.type === "Expense" ? "red" : "green";
  const categoryColor = categoryColors[categoryInfo?.name ?? "Default"];
  const emoji = categoryEmojies[categoryInfo?.name ?? "Default"];
  return (
    <Card>
      <View style={styles.row}>
        {selectionMode && (
          <View
            style={[
              styles.checkbox,
              selected && styles.checkboxSelected,
            ]}
          >
            {selected ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
        )}
        <View style={{ flex: 1, flexDirection: "row" }}>
        <View style={{ width: "40%", gap: 3 }}>
          <Amount
            amount={transaction.amount}
            color={color}
            iconName={iconName}
          />
          <CategoryItem
            categoryColor={categoryColor}
            categoryInfo={categoryInfo}
            emoji={emoji}
          />
        </View>
        <TransactionInfo
          date={transaction.date}
          description={transaction.description}
          id={transaction.id}
        />
        </View>
      </View>
    </Card>
  );
}

function TransactionInfo({
  id,
  date,
  description,
}: {
  id: number;
  date: number;
  description: string;
}) {
  return (
    <View style={{ flexGrow: 1, gap: 6, flexShrink: 1 }}>
      <Text style={{ fontSize: 16, fontWeight: "bold" }}>{description}</Text>
      <Text>交易编号 {id}</Text>
      <Text style={{ fontSize: 12, color: "gray" }}>
        {formatTransactionDate(date)}
      </Text>
    </View>
  );
}

function CategoryItem({
  categoryColor,
  categoryInfo,
  emoji,
}: {
  categoryColor: string;
  categoryInfo: Category | undefined;
  emoji: string;
}) {
  return (
    <View
      style={[
        styles.categoryContainer,
        { backgroundColor: categoryColor + "40" },
      ]}
    >
      <Text style={styles.categoryText}>
        {emoji} {categoryDisplayName(categoryInfo?.name)}
      </Text>
    </View>
  );
}

function Amount({
  iconName,
  color,
  amount,
}: {
  iconName: "minuscircle" | "pluscircle";
  color: string;
  amount: number;
}) {
  return (
    <View style={styles.row}>
      <AntDesign name={iconName} size={18} color={color} />
      <AutoSizeText
        fontSize={32}
        mode={ResizeTextMode.max_lines}
        numberOfLines={1}
        style={[styles.amount, { maxWidth: "80%" }]}
      >
        ¥{amount}
      </AutoSizeText>
    </View>
  );
}

const styles = StyleSheet.create({
  amount: {
    fontSize: 32,
    fontWeight: "800",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  categoryContainer: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  categoryText: {
    fontSize: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#007AFF",
    marginRight: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: "#007AFF",
  },
  checkmark: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
});
