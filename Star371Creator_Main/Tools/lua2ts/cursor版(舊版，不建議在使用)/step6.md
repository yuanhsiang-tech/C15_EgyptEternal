## Step 6 — 基本語法轉換

### 前提
- 已完成 Step 1（規則與禁則）、Step 2（類別結構與宣告）、Step 3（self → this 與「:」→「.」）、Step 4（資料結構）、Step 5（條件語句與循環）。
- 僅做必要語法轉換，不改動參數數量、順序與邏輯（遵守一對一原則）。

### 目標
- 轉換基本的 Lua 語法到 TypeScript 對應語法
- 保持語法結構完全一致
- 不改變邏輯和行為

### 基本語法對照表

#### 1. 變數宣告轉換
```lua
-- Lua
local variable = "value"
local number = 123
local array = {1, 2, 3}
```
```typescript
// TypeScript
const variable = "value";
const number = 123;
const array = [1, 2, 3];
```

#### 2. 陣列語法轉換
```lua
-- Lua
local array = {1, 2, 3}
local table = {a = 1, b = 2}
```
```typescript
// TypeScript
const array = [1, 2, 3];
const table = {a: 1, b: 2};
```

### 注意事項
- 僅替換語法結構，不改變參數的數值或順序
- 保持邏輯結構完全一致
- 不進行任何優化或重構，僅做必要的語法轉換

### 完成檢查清單
- 所有 `local` 已轉為 `const/let`（依可變性）
- 所有 `{1, 2, 3}` 已轉為 `[1, 2, 3]`
- 所有 `{a = 1}` 已轉為 `{a: 1}`
- 未改變任何邏輯或行為

### 下一步
- 請進行 step7.md：Lua 內建函數轉換