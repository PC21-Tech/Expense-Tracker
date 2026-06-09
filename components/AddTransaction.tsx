import * as React from "react";
import {
  Button,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Card from "./ui/Card";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { useSQLiteContext } from "expo-sqlite";
import { Category, Transaction } from "../types";
import { categoryDisplayName } from "../i18n";
import {
  parseQuickNlExpense,
  suggestCategoryNameFromLabel,
} from "../services/quickExpenseParse";

export default function AddTransaction({
  insertTransaction,
}: {
  insertTransaction(transaction: Transaction): Promise<void>;
}) {
  const [isAddingTransaction, setIsAddingTransaction] =
    React.useState<boolean>(false);
  const [currentTab, setCurrentTab] = React.useState<number>(0);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [typeSelected, setTypeSelected] = React.useState<string>("");
  const [amount, setAmount] = React.useState<string>("");
  const [description, setDescription] = React.useState<string>("");
  const [category, setCategory] = React.useState<string>("Expense");
  const [categoryId, setCategoryId] = React.useState<number>(1);
  const [quickNl, setQuickNl] = React.useState("");
  const [quickNlError, setQuickNlError] = React.useState("");
  const db = useSQLiteContext();

  React.useEffect(() => {
    getExpenseType(currentTab);
  }, [currentTab]);

  async function getExpenseType(currentTab: number) {
    setCategory(currentTab === 0 ? "Expense" : "Income");
    const type = currentTab === 0 ? "Expense" : "Income";

    const result = await db.getAllAsync<Category>(
      `SELECT * FROM Categories WHERE type = ?;`,
      [type]
    );
    setCategories(result);
  }

  const applyQuickNl = async () => {
    setQuickNlError("");
    const parsed = parseQuickNlExpense(quickNl);
    if (!parsed) {
      setQuickNlError("未识别。试试：午饭 35 元、打车 18 块，或 35 元 午饭");
      return;
    }
    setAmount(parsed.amount);
    setDescription(parsed.label);

    const guess = suggestCategoryNameFromLabel(parsed.label);
    if (!guess) return;

    const row = await db.getFirstAsync<{
      id: number;
      name: string;
      type: "Expense" | "Income";
    }>(`SELECT id, name, type FROM Categories WHERE name = ? LIMIT 1`, [
      guess,
    ]);
    if (!row) return;

    const tab = row.type === "Income" ? 1 : 0;
    setCategory(row.type);
    if (tab !== currentTab) setCurrentTab(tab);
    setCategoryId(row.id);
    setTypeSelected(row.name);
  };

  async function handleSave() {
    // @ts-ignore
    await insertTransaction({
      amount: Number(amount),
      description,
      category_id: categoryId,
      date: new Date().getTime() / 1000,
      type: category as "Expense" | "Income",
    });
    setAmount("");
    setDescription("");
    setQuickNl("");
    setQuickNlError("");
    setCategory("Expense");
    setCategoryId(1);
    setCurrentTab(0);
    setIsAddingTransaction(false);
  }

  return (
    <View style={{ marginBottom: 15 }}>
      {isAddingTransaction ? (
        <View>
          <Card>
            <Text style={{ marginBottom: 6, fontWeight: "600", color: "#333" }}>
              快捷输入
            </Text>
            <Text style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
              例如：午饭 35 元、打车 18 块；解析后填入下方金额与备注（可选匹配分类）
            </Text>
            <TextInput
              placeholder="午饭 35 元"
              value={quickNl}
              onChangeText={(t) => {
                setQuickNl(t);
                if (quickNlError) setQuickNlError("");
              }}
              style={{
                borderWidth: 1,
                borderColor: "#ccc",
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 8,
              }}
            />
            {quickNlError ? (
              <Text style={{ color: "#c00", fontSize: 12, marginBottom: 8 }}>
                {quickNlError}
              </Text>
            ) : null}
            <Pressable
              onPress={() => void applyQuickNl()}
              style={({ pressed }) => ({
                alignSelf: "flex-start",
                backgroundColor: pressed ? "#0051a8" : "#007AFF",
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 8,
                marginBottom: 16,
              })}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>解析并填入</Text>
            </Pressable>
            <TextInput
              placeholder="金额（元）"
              style={{ fontSize: 32, marginBottom: 15, fontWeight: "bold" }}
              keyboardType="numeric"
              onChangeText={(text) => {
                // Remove any non-numeric characters before setting the state
                const numericValue = text.replace(/[^0-9.]/g, "");
                setAmount(numericValue);
              }}
            />
            <TextInput
              placeholder="备注说明"
              style={{ marginBottom: 15 }}
              onChangeText={setDescription}
            />
            <Text style={{ marginBottom: 6 }}>选择类型</Text>
            <SegmentedControl
              values={["支出", "收入"]}
              style={{ marginBottom: 15 }}
              selectedIndex={currentTab}
              onChange={(event) => {
                setCurrentTab(event.nativeEvent.selectedSegmentIndex);
              }}
            />
            {categories.map((cat) => (
              <CategoryButton
                key={cat.name}
                // @ts-ignore
                id={cat.id}
                categoryName={cat.name}
                displayName={categoryDisplayName(cat.name)}
                isSelected={typeSelected === cat.name}
                setTypeSelected={setTypeSelected}
                setCategoryId={setCategoryId}
              />
            ))}
          </Card>
          <View
            style={{ flexDirection: "row", justifyContent: "space-around" }}
          >
            <Button
              title="取消"
              color="red"
              onPress={() => {
                setQuickNl("");
                setQuickNlError("");
                setIsAddingTransaction(false);
              }}
            />
            <Button title="保存" onPress={handleSave} />
          </View>
        </View>
      ) : (
        <AddButton setIsAddingTransaction={setIsAddingTransaction} />
      )}
    </View>
  );
}

function CategoryButton({
  id,
  categoryName,
  displayName,
  isSelected,
  setTypeSelected,
  setCategoryId,
}: {
  id: number;
  categoryName: string;
  displayName: string;
  isSelected: boolean;
  setTypeSelected: React.Dispatch<React.SetStateAction<string>>;
  setCategoryId: React.Dispatch<React.SetStateAction<number>>;
}) {
  return (
    <TouchableOpacity
      onPress={() => {
        setTypeSelected(categoryName);
        setCategoryId(id);
      }}
      activeOpacity={0.6}
      style={{
        height: 40,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: isSelected ? "#007BFF20" : "#00000020",
        borderRadius: 15,
        marginBottom: 6,
      }}
    >
      <Text
        style={{
          fontWeight: "700",
          color: isSelected ? "#007BFF" : "#000000",
          marginLeft: 5,
        }}
      >
        {displayName}
      </Text>
    </TouchableOpacity>
  );
}

function AddButton({
  setIsAddingTransaction,
}: {
  setIsAddingTransaction: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <TouchableOpacity
      onPress={() => setIsAddingTransaction(true)}
      activeOpacity={0.6}
      style={{
        height: 40,
        flexDirection: "row",
        alignItems: "center",

        justifyContent: "center",
        backgroundColor: "#007BFF20",
        borderRadius: 15,
      }}
    >
      <MaterialIcons name="add-circle-outline" size={24} color="#007BFF" />
      <Text style={{ fontWeight: "700", color: "#007BFF", marginLeft: 5 }}>
        记一笔
      </Text>
    </TouchableOpacity>
  );
}
