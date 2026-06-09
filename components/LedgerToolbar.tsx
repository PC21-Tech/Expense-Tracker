import * as React from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { Category, Transaction } from "../types";
import {
  ledgerRowsToCsv,
  ledgerRowsToXlsxBase64,
  mapRawRowsToLedger,
  parseLedgerTextFile,
  parseXlsxArrayBuffer,
  parseXlsxBase64,
  transactionsToLedgerRows,
  type LedgerExportRow,
} from "../services/ledgerIo";

export type TransactionInsert = Omit<Transaction, "id">;

type Props = {
  categories: Category[];
  transactions: Transaction[];
  reload: () => Promise<void>;
  insertMany: (rows: TransactionInsert[]) => Promise<void>;
  replaceAllWith: (rows: TransactionInsert[]) => Promise<void>;
  deleteTransactionIds: (ids: number[]) => Promise<void>;
  selectionMode: boolean;
  setSelectionMode: (v: boolean) => void;
  selectedIds: number[];
  setSelectedIds: React.Dispatch<React.SetStateAction<number[]>>;
};

function ledgerRowsToInserts(
  rows: LedgerExportRow[],
  categories: Category[]
): TransactionInsert[] {
  return rows.map((r) => {
    const c = categories.find((x) => x.name === r.category_name);
    if (!c) {
      throw new Error(`分类不存在: ${r.category_name}`);
    }
    return {
      category_id: c.id,
      amount: r.amount,
      date: r.date,
      description: r.description,
      type: r.type,
    };
  });
}

function downloadOnWeb(data: Uint8Array | string, filename: string, mime: string) {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  const blob = new Blob([data as unknown as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function LedgerToolbar({
  categories,
  transactions,
  reload,
  insertMany,
  replaceAllWith,
  deleteTransactionIds,
  selectionMode,
  setSelectionMode,
  selectedIds,
  setSelectedIds,
}: Props) {
  const exportCsv = async () => {
    try {
      const rows = transactionsToLedgerRows(transactions, categories);
      const csv = ledgerRowsToCsv(rows);
      const name = `transactions_${Date.now()}.csv`;
      if (Platform.OS === "web") {
        downloadOnWeb(csv, name, "text/csv;charset=utf-8");
        Alert.alert("导出", "已开始下载 CSV 文件");
        return;
      }
      const path = `${FileSystem.cacheDirectory}${name}`;
      await FileSystem.writeAsStringAsync(path, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const can = await Sharing.isAvailableAsync();
      if (can) await Sharing.shareAsync(path, { mimeType: "text/csv", dialogTitle: "导出 CSV" });
      else Alert.alert("导出", `文件已写入:\n${path}`);
    } catch (e: unknown) {
      Alert.alert("导出失败", String(e));
    }
  };

  const exportXlsx = async () => {
    try {
      const rows = transactionsToLedgerRows(transactions, categories);
      const b64 = ledgerRowsToXlsxBase64(rows);
      const name = `transactions_${Date.now()}.xlsx`;
      if (Platform.OS === "web") {
        const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        downloadOnWeb(
          bin,
          name,
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        Alert.alert("导出", "已开始下载 Excel 文件");
        return;
      }
      const path = `${FileSystem.cacheDirectory}${name}`;
      await FileSystem.writeAsStringAsync(path, b64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const can = await Sharing.isAvailableAsync();
      if (can) {
        await Sharing.shareAsync(path, {
          mimeType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          dialogTitle: "导出 Excel",
        });
      } else Alert.alert("导出", `文件已写入:\n${path}`);
    } catch (e: unknown) {
      Alert.alert("导出失败", String(e));
    }
  };

  const runImport = async (rawRows: Record<string, string>[]) => {
    const fail = (title: string, body: string) => {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert(`${title}\n\n${body}`);
      } else {
        Alert.alert(title, body);
      }
    };

    const parsed = mapRawRowsToLedger(rawRows, categories);
    if (!parsed.ok) {
      fail("导入失败", parsed.errors.slice(0, 8).join("\n"));
      return;
    }
    let inserts: TransactionInsert[];
    try {
      inserts = ledgerRowsToInserts(parsed.rows, categories);
    } catch (e: unknown) {
      fail("导入失败", String(e));
      return;
    }

    const n = inserts.length;

    // Web：多按钮 Alert 常不触发 onPress，导致从未写入数据库
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const append = window.confirm(
        `共 ${n} 条有效记录。\n\n点「确定」= 追加到现有账本\n点「取消」= 再选是否清空后导入`
      );
      try {
        if (append) {
          await insertMany(inserts);
          await reload();
          window.alert(`完成：已追加 ${n} 条`);
        } else {
          if (
            !window.confirm(
              "将删除全部交易记录后再导入，此操作不可恢复。是否继续？"
            )
          ) {
            return;
          }
          await replaceAllWith(inserts);
          await reload();
          window.alert(`完成：已替换为 ${n} 条`);
        }
      } catch (e: unknown) {
        window.alert(`导入失败：${String(e)}`);
      }
      return;
    }

    Alert.alert("导入方式", `共 ${n} 条有效记录`, [
      { text: "取消", style: "cancel" },
      {
        text: "追加到现有账本",
        onPress: async () => {
          await insertMany(inserts);
          await reload();
          Alert.alert("完成", `已追加 ${n} 条`);
        },
      },
      {
        text: "清空后导入（危险）",
        style: "destructive",
        onPress: () => {
          Alert.alert("确认清空", "将删除全部交易记录后再导入，是否继续？", [
            { text: "取消", style: "cancel" },
            {
              text: "确认",
              style: "destructive",
              onPress: async () => {
                await replaceAllWith(inserts);
                await reload();
                Alert.alert("完成", `已替换为 ${n} 条`);
              },
            },
          ]);
        },
      },
    ]);
  };

  const pickAndImport = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: [
          "text/plain",
          "text/csv",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "*/*",
        ],
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      const uri = asset.uri;
      const name = asset.name ?? "";
      const lower = name.toLowerCase();

      const readExcelRows = async (): Promise<Record<string, string>[]> => {
        if (Platform.OS === "web" && asset.file) {
          const buf = await asset.file.arrayBuffer();
          return parseXlsxArrayBuffer(buf);
        }
        if (Platform.OS === "web" && uri.startsWith("data:")) {
          const m = /^data:[^;]+;base64,(.+)$/i.exec(uri.replace(/\s/g, ""));
          if (!m)
            throw new Error(
              "Web 端无法解析所选文件，请换用桌面端或确保浏览器允许读取文件"
            );
          return parseXlsxBase64(m[1]);
        }
        const b64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return parseXlsxBase64(b64);
      };

      const readTextUtf8 = async (): Promise<string> => {
        if (Platform.OS === "web" && asset.file) {
          return asset.file.text();
        }
        if (Platform.OS === "web" && uri.startsWith("data:")) {
          const m = /^data:[^;]+;base64,(.+)$/i.exec(uri.replace(/\s/g, ""));
          if (m) {
            const bin = atob(m[1]);
            return new TextDecoder("utf-8").decode(
              Uint8Array.from(bin, (c) => c.charCodeAt(0))
            );
          }
          const comma = uri.indexOf(",");
          if (comma >= 0) {
            try {
              return decodeURIComponent(uri.slice(comma + 1));
            } catch {
              return uri.slice(comma + 1);
            }
          }
        }
        return FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      };

      if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
        const raw = await readExcelRows();
        if (raw.length === 0) {
          Alert.alert("导入", "Excel 中未解析到数据行");
          return;
        }
        await runImport(raw);
        return;
      }

      const text = await readTextUtf8();
      const raw = parseLedgerTextFile(text);
      if (raw.length === 0) {
        Alert.alert("导入", "未解析到任何数据行，请检查表头与分隔符");
        return;
      }
      await runImport(raw);
    } catch (e: unknown) {
      const msg = String(e);
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert(`导入失败：${msg}`);
      } else {
        Alert.alert("导入失败", msg);
      }
    }
  };

  const toggleBatchMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedIds([]);
  };

  const selectAll = () => {
    setSelectedIds(transactions.map((t) => t.id));
  };

  const clearSelection = () => setSelectedIds([]);

  const deleteSelected = () => {
    const ids = [...selectedIds];
    if (ids.length === 0) {
      Alert.alert("批量删除", "请先勾选要删除的记录");
      return;
    }

    const runDelete = async () => {
      try {
        await deleteTransactionIds(ids);
        setSelectedIds([]);
        setSelectionMode(false);
        await reload();
      } catch (e: unknown) {
        const msg = String(e);
        if (Platform.OS === "web" && typeof window !== "undefined") {
          window.alert(`删除失败：${msg}`);
        } else {
          Alert.alert("删除失败", msg);
        }
      }
    };

    const msg = `确定删除选中的 ${ids.length} 条记录？此操作不可恢复。`;

    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm(msg)) void runDelete();
      return;
    }

    Alert.alert("批量删除", msg, [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: () => void runDelete(),
      },
    ]);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>历史账本</Text>
      <View style={styles.row}>
        <Btn label={selectionMode ? "退出批量" : "批量删除"} onPress={toggleBatchMode} />
        <Btn label="导出 CSV" onPress={exportCsv} />
        <Btn label="导出 Excel" onPress={exportXlsx} />
        <Btn label="导入" onPress={pickAndImport} />
      </View>
      {selectionMode && (
        <View style={[styles.row, { marginTop: 8 }]}>
          <Btn label="全选" onPress={selectAll} />
          <Btn label="取消全选" onPress={clearSelection} />
          <Btn
            label={`删除选中 (${selectedIds.length})`}
            danger
            onPress={deleteSelected}
          />
        </View>
      )}
    </View>
  );
}

function Btn({
  label,
  onPress,
  danger,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        danger && styles.btnDanger,
        pressed && styles.btnPressed,
      ]}
    >
      <Text style={[styles.btnText, danger && styles.btnTextDanger]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
    color: "#333",
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#007AFF18",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF44",
  },
  btnDanger: {
    backgroundColor: "#ff000018",
    borderColor: "#ff000044",
  },
  btnPressed: { opacity: 0.7 },
  btnText: { color: "#007AFF", fontWeight: "600", fontSize: 13 },
  btnTextDanger: { color: "#c00" },
});
