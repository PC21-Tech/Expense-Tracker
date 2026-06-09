import * as React from "react";
import { TouchableOpacity, View } from "react-native";
import { Category, Transaction } from "../types";
import TransactionListItem from "./TransactionListItem";

export default function TransactionList({
  transactions,
  categories,
  deleteTransaction,
  selectionMode = false,
  selectedIds = [],
  onToggleSelect,
}: {
  categories: Category[];
  transactions: Transaction[];
  deleteTransaction: (id: number) => Promise<void>;
  selectionMode?: boolean;
  selectedIds?: number[];
  onToggleSelect?: (id: number) => void;
}) {
  const selectedSet = React.useMemo(
    () => new Set(selectedIds),
    [selectedIds]
  );

  return (
    <View style={{ gap: 15 }}>
      {transactions.map((transaction) => {
        const categoryForCurrentItem = categories.find(
          (category) => category.id === transaction.category_id
        );
        const selected = selectedSet.has(transaction.id);
        return (
          <TouchableOpacity
            key={transaction.id}
            activeOpacity={0.7}
            onPress={() => {
              if (selectionMode && onToggleSelect) {
                onToggleSelect(transaction.id);
              }
            }}
            onLongPress={
              selectionMode
                ? undefined
                : () => deleteTransaction(transaction.id)
            }
            delayLongPress={380}
          >
            <TransactionListItem
              transaction={transaction}
              categoryInfo={categoryForCurrentItem}
              selectionMode={selectionMode}
              selected={selected}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
