# 记账助手

![Budget Buddy App Thumbnail](https://i.ytimg.com/vi/dl74XgJYK1A/maxresdefault.jpg)

## 简介

基于 SQLite 与 Expo 的本地优先记账应用示例，演示复杂数据结构的本地存储与即时 CRUD。

### 关于应用

帮助用户通过 SQLite 管理收支与分类，界面简洁，数据保存在本地。

演示视频：[Budget Buddy App Demo](https://youtu.be/dl74XgJYK1A)

## 功能

- 收支记录与分类
- 本地 SQLite 存储
- TypeScript + Expo

## 技术栈

- **语言：** TypeScript
- **框架：** Expo
- **数据库：** SQLite
- **类型：** 移动端 / Web（`expo start --web`）

## 开始使用

克隆仓库并安装依赖：

```bash
git clone <你的仓库地址>
cd Expense-Tracker
npm install
```

运行（开发服务器默认 **8889** 端口，Web 为 `http://localhost:8889`；若该端口被占用，Expo 会自动改用下一个可用端口，以终端显示为准）：

```bash
npm start
# 或仅 Web
npm run web
# 外网/跨网段用手机扫 Expo：隧道模式（需先 npm install，已包含 @expo/ngrok）
npm run start:tunnel
```

### Expo 隧道 `--tunnel` 报错说明

若出现 **`spawn EPERM`**（全局安装 `@expo/ngrok` 失败）或 **`The "file" argument must be of type string. Received null`**：

1. **不要用全局安装**：本项目已在 **`devDependencies` 里加入 `@expo/ngrok`**，执行 `npm install` 后 Expo 会优先用**项目内**的包。
2. 若仍提示安装全局，可先关掉杀毒/Defender 对 `npm` 的拦截，或在 **以管理员身份运行** 的终端里再试（仍推荐只用本地依赖）。
3. **替代方案（不依赖隧道）**：手机与电脑同一 WiFi，使用局域网地址：
   ```bash
   npx expo start -p 8889 --lan
   ```
   在终端里选 **LAN**，用手机扫二维码；若连不上，在 Windows **防火墙**里允许 Node.js 专用网络入站。
4. **USB 连接安卓**：可配合 `adb reverse tcp:8889 tcp:8889`（端口与 `npm start` 一致），再用 Expo Go 连接。

### Expo Go 扫码后「没反应」怎么办？

现象：手机已打开 Expo Go，扫了终端里的二维码，一直转圈或没有任何加载。

**按顺序检查：**

1. **同一局域网**  
   手机与电脑必须连 **同一个 WiFi**（不要一边手机 4G、一边电脑 WiFi）。  
   若路由器开了 **「AP 隔离 / 访客网络」**，手机与电脑不能互访，请关掉或换到主网络。

2. **端口默认 8889**（与 `package.json` 里 `npm start` / `npm run web` 一致）  
   若你用手动输入地址，应为：  
   `exp://<你电脑的局域网 IP>:8889`  
   若终端提示已改用 **8890** 等端口，则以终端为准。

3. **Windows 防火墙 / Trellix 拦截入站**（最常见）  
   电脑上要允许 **TCP 8889** 入站（对 Node / Metro）。可在 **管理员 PowerShell** 里为「专用」网络加一条规则（示例）：
   ```powershell
   New-NetFirewallRule -DisplayName "Expo Metro 8889" -Direction Inbound -Protocol TCP -LocalPort 8889 -Action Allow -Profile Private
   ```
   Trellix 若拦截 **Node.exe** 入站，需在策略里放行或给项目目录/Node 加排除。

4. **VPN / 代理**  
   电脑或手机开了 **公司 VPN、全局代理**，可能导致 Expo 拿到的 IP 不对。可暂时关掉再试。

5. **Expo Go 版本**  
   应用商店把 **Expo Go 更新到最新**，需支持 **Expo SDK 53** 对应版本。

6. **不用扫码，改手输 URL**  
   在 Expo Go 里选 **Enter URL manually**，输入终端里 **Development servers** 下形如 `exp://192.168.x.x:8889` 的完整地址（端口以终端为准）。

7. **仍不行时用隧道（跨网也能连）**  
   ```bash
   npm run start:tunnel
   ```  
   再扫新二维码（依赖本机已 `npm install` 且 `@expo/ngrok` 未被杀毒删光）。

8. **安卓 + USB 备选**  
   ```bash
   adb reverse tcp:8889 tcp:8889
   ```  
   然后仍用终端给出的地址（或 `exp://127.0.0.1:8889`，以 Expo 终端提示为准）在 Expo Go 里打开。

## 历史账本：批量删除与导入/导出

- **批量删除**：点「批量删除」进入多选模式，勾选记录后「删除选中」；非批量模式下仍支持**长按单条删除**。
- **导出 CSV**：UTF-8（带 BOM），可用 Excel 打开；列为 `category_name,amount,date,description,type`（`type` 为 `Expense` / `Income`；`date` 为 Unix **秒**）。
- **导出 Excel**：`.xlsx` 单表 `Transactions`，列同上。
- **导入**：支持 `.csv`、`.txt`（逗号或 Tab 分隔，首行为表头）、`.xlsx`。分类可通过 **`category_name`（须与数据库英文分类名一致）** 或 **`category_id`** 匹配。导入时可选择 **追加** 或 **清空后导入**。  
  - **Web 端**：系统文件选择器返回的是 **Data URL**，已改为用浏览器 **`File.arrayBuffer()` / `text()`** 读取，不再对 `data:` 地址调用 `FileSystem.readAsStringAsync`（否则会导入失败）。  
  - 若用 Excel 打开再保存，日期可能被改成 **Excel 序列号**，解析逻辑已兼容。

更多资源：[codewithbeto.dev](https://codewithbeto.dev)
