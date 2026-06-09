import * as React from "react";
import {
  Alert,
  Button,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Category, Transaction } from "../types";
import { useSQLiteContext } from "expo-sqlite";
import TransactionList from "../components/TransactionsList";
import Card from "../components/ui/Card";
import AddTransaction from "../components/AddTransaction";
import SummaryChart from "../components/SummaryChart";
import LedgerToolbar, {
  type TransactionInsert,
} from "../components/LedgerToolbar";

export default function Home() {
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [selectionMode, setSelectionMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<number[]>([]);

  const db = useSQLiteContext();

  React.useEffect(() => {
    db.withTransactionAsync(async () => {
      await getData();
    });
  }, [db]);

  async function getData() {
    const result = await db.getAllAsync<Transaction>(
      `SELECT * FROM Transactions 
       ORDER BY date DESC;`
    );
    setTransactions(result);

    const categoriesResult = await db.getAllAsync<Category>(
      `SELECT * FROM Categories;`
    );
    setCategories(categoriesResult);
  }

  async function deleteAllTransactions() {
    Alert.alert("清空全部", "将删除所有交易记录，是否继续？", [
      { text: "取消", style: "cancel" },
      {
        text: "清空",
        style: "destructive",
        onPress: () => {
          db.withTransactionAsync(async () => {
            await db.runAsync(`DELETE FROM Transactions;`);
            await getData();
          });
        },
      },
    ]);
  }

  async function deleteTransactionIds(ids: number[]) {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => "?").join(",");
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `DELETE FROM Transactions WHERE id IN (${placeholders});`,
        ids
      );
    });
  }

  async function deleteTransaction(id: number) {
    db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM Transactions WHERE id = ?;`, [id]);
      await getData();
    });
  }

  async function insertTransaction(transaction: Transaction) {
    db.withTransactionAsync(async () => {
      await db.runAsync(
        `
        INSERT INTO Transactions (category_id, amount, date, description, type) VALUES (?, ?, ?, ?, ?);
      `,
        [
          transaction.category_id,
          transaction.amount,
          transaction.date,
          transaction.description,
          transaction.type,
        ]
      );
      await getData();
    });
  }

  async function insertMany(rows: TransactionInsert[]) {
    await db.withTransactionAsync(async () => {
      for (const r of rows) {
        await db.runAsync(
          `INSERT INTO Transactions (category_id, amount, date, description, type) VALUES (?, ?, ?, ?, ?);`,
          [r.category_id, r.amount, r.date, r.description, r.type]
        );
      }
    });
    await getData();
  }

  async function replaceAllWith(rows: TransactionInsert[]) {
    await db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM Transactions;`);
      for (const r of rows) {
        await db.runAsync(
          `INSERT INTO Transactions (category_id, amount, date, description, type) VALUES (?, ?, ?, ?, ?);`,
          [r.category_id, r.amount, r.date, r.description, r.type]
        );
      }
    });
    await getData();
  }

  return (
    <>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 15,
          paddingVertical: Platform.OS === "ios" ? 170 : 16,
        }}
      >
        <AddTransaction insertTransaction={insertTransaction} />
        <LedgerToolbar
          categories={categories}
          transactions={transactions}
          reload={getData}
          insertMany={insertMany}
          replaceAllWith={replaceAllWith}
          deleteTransactionIds={async (ids) => {
            await deleteTransactionIds(ids);
            await getData();
          }}
          selectionMode={selectionMode}
          setSelectionMode={setSelectionMode}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
        />
        <Button title="清空全部交易" onPress={deleteAllTransactions} />
        <TransactionSummary />
        <TransactionList
          categories={categories}
          transactions={transactions}
          deleteTransaction={deleteTransaction}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggleSelect={(id) => {
            setSelectedIds((prev) =>
              prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
            );
          }}
        />
      </ScrollView>
    </>
  );
}

function TransactionSummary() {
  return (
    <>
      <Card style={styles.container}>
        <SummaryChart />
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    paddingBottom: 7,
  },
});
