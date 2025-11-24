## Step 5 — 條件語句與循環（if / elseif / else / while / for / repeat）

### 前提
- 已完成 Step 1（規則與禁則）、Step 2（類別結構與宣告）、Step 3（self → this 與「:」→「.」）、Step 4（資料結構）。
- 僅做必要語法替換，不改動參數數量、順序與邏輯（遵守一對一原則）。

### 目標
- 轉換 Lua 控制結構到 TypeScript 對應語法
- 保持邏輯流程和條件判斷完全一致
- 處理陣列索引的 1-based 到 0-based 轉換

### 關鍵對照（運算子）
- and → &&
- or → ||
- not → !
- 等值比較：==（Lua）→ ===（TypeScript）（數字/字串等值一對一）

### if / elseif / else
```lua
-- Lua
if a and not b then
  doA()
elseif x == 1 or y == 2 then
  doB()
else
  doC()
end
```
```typescript
// TypeScript
if (a && !b) {
  doA()
} else if (x === 1 || y === 2) {
  doB()
} else {
  doC()
}
```

### while
```lua
-- Lua
while cond do
  step()
end
```
```typescript
// TypeScript
while (cond) {
  step()
}
```

### Switch（函數式 Switch → switch-case）
```lua
-- Lua
Switch(eventName, {
  [EVT.A] = function()
    handleA()
  end,
  [EVT.B] = function()
    handleB()
  end,
}, handleDefault())
```
```typescript
// TypeScript
switch (eventName) {
  case EVT.A:
    handleA()
    break
  case EVT.B:
    handleB()
    break
  default:
    handleDefault()
    break
}
```

注意：
- 每個 case 結束必須 `break`
- 建議保留 `default` 分支
- 分支內的參數/邏輯不做更動（僅語法替換）

### repeat ... until（→ do ... while）
```lua
-- Lua
repeat
  step()
until done
```
```typescript
// TypeScript（直到 done 為真才結束 → 反向條件）
do {
  step()
} while (!done)
```

### for（數值迴圈）
- 非陣列情境（僅計次或數學範圍）：保持起訖一致（1→n）
```lua
-- Lua：1 到 n（包含 n）
for i = 1, n do
  work(i)
end
```
```typescript
// TypeScript：1 到 n（包含 n）
for (let i = 1; i <= n; i++) {
  work(i)
}
```
- 陣列情境（存取索引）：Lua 為 1-based；TS 為 0-based，需位移
```lua
-- Lua：1 到 #arr
for i = 1, #arr do
  local item = arr[i]
  use(item)
end
```
```typescript
// TypeScript：0 到 length-1
for (let i = 0; i < arr.length; i++) {
  const item = arr[i]
  use(item)
}
```

### for ... of（僅取值，不需索引）
```typescript
for (const item of arr) {
  use(item)
}
```

### pairs / ipairs（物件或陣列遍歷）
- 物件：pairs(table) → Object.entries(table)
```lua
-- Lua
for k, v in pairs(map) do
  use(k, v)
end
```
```typescript
// TypeScript
for (const [k, v] of Object.entries(map)) {
  use(k, v as any)
}
```
- 陣列：ipairs(arr) 等價於索引序遍歷 → for (let i = 0; i < arr.length; i++) 或 for...of（僅值）

### break / continue
- break：兩邊語義相同，可直接使用。
- continue：Lua 5.x 無 continue；若原邏輯透過條件包裹實現「跳過」，在 TS 可保留原寫法或改用 continue（不改變行為）。

### Lua 慣用短路寫法（注意不要偷改語意）
- cond and A or B（Lua 惯用三元）→ 可能在 A 為假值時語意改變；不建議自動改為 `cond ? A : B`。
- value or default → 可能在 value 為假但合法（如 0、空字串）時被覆蓋；不建議自動改為 `value || default`。
- 原則：遇到此類寫法，優先保留為 if/else 結構，保持語意等同。

### 注意事項（一步到位，不加料）
- 僅替換語法：不得改動任何條件式或邏輯結構的語意。
- 陣列索引：Lua 1-based → TS 0-based，取值前務必位移或改用 length 驅動。
- 等值比較使用 `===`（數字/字串等）保持等值一對一。
- 短路/預設值慣用法不自動改 ternary 或 `||`，除非確認語意完全等同。

### 完成檢查清單
- if/elseif/else 與 while、repeat 已正確轉為 TS 結構。
- 數值 for（非陣列）保持 1→n；陣列 for 已採 0→length-1。
- 物件遍歷已改為 Object.entries；僅值遍歷採 for...of。
- 無偷換語意的短路寫法；必要時已改為 if/else。

### 下一步
- 請進行 step6.md：基本語法轉換。