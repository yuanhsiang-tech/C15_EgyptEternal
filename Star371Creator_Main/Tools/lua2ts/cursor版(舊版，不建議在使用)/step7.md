## Step 7 — Lua 內建函數轉換

### 前提
- 已完成 Step 1（規則與禁則）、Step 2（類別結構與宣告）、Step 3（self → this 與「:」→「.」）、Step 4（資料結構）、Step 5（條件語句與循環）、Step 6（基本語法轉換）。
- 僅做必要語法轉換，不改動參數數量、順序與邏輯（遵守一對一原則）。

### 目標
- 轉換 Lua 內建函數到 TypeScript 對應方式
- 保持函數調用的參數形式完全一致
- 不改變函數的行為和返回值

### Lua 內建函數對照表

#### 1. 字串函數轉換
```lua
-- Lua
local str = "Hello World"
local len = string.len(str)
local upper = string.upper(str)
local lower = string.lower(str)
local sub = string.sub(str, 1, 5)
local find = string.find(str, "World")
local gsub = string.gsub(str, "World", "TypeScript")
```
```typescript
// TypeScript
const str = "Hello World";
const len = str.length;
const upper = str.toUpperCase();
const lower = str.toLowerCase();
const sub = str.substring(0, 5);
const find = str.indexOf("World");
const gsub = str.replace(/World/g, "TypeScript");
```

#### 2. 表格函數轉換
```lua
-- Lua
local arr = {1, 2, 3, 4, 5}
table.insert(arr, 6)
table.remove(arr, 1)
local count = #arr
local concat = table.concat(arr, ",")
```
```typescript
// TypeScript
const arr = [1, 2, 3, 4, 5];
arr.push(6);
arr.shift(); // 移除第一個元素
const count = arr.length;
const concat = arr.join(",");
```

#### 3. 類型檢查函數轉換
```lua
-- Lua
local value = "test"
local isString = type(value) == "string"
local isNumber = type(value) == "number"
local isNil = value == nil
```
```typescript
// TypeScript
const value = "test";
const isString = typeof value === "string";
const isNumber = typeof value === "number";
const isNil = value === null;
```

#### 4. 時間函數轉換
```lua
-- Lua
local time = os.time()
```
```typescript
// TypeScript
const time = Date.now();
```

#### 5. 輸入輸出函數轉換
```lua
-- Lua
print("Hello World")
```
```typescript
// TypeScript
log("Hello World");
```

#### 6. 錯誤處理函數轉換
```lua
-- Lua
local success, result = pcall(function()
    return riskyOperation()
end)
if success then
    print("Success:", result)
else
    print("Error:", result)
end
```
```typescript
// TypeScript
try {
    const result = riskyOperation();
    log("Success:", result);
} catch (error) {
    log("Error:", error);
}
```

#### 7. clone 轉換
```lua
-- Lua
self.m_battlePassEvent = clone(LuaMobile.BattlePass.BATTLE_PASS_EVENT)
local copiedData = clone(originalData)
```
```typescript
// TypeScript
this.m_battlePassEvent = JSON.parse(JSON.stringify(LuaMobile.BattlePass.BATTLE_PASS_EVENT));
const copiedData = JSON.parse(JSON.stringify(originalData));
```

#### 8. pairs / ipairs 轉換
```lua
-- Lua
local table = {a = 1, b = 2, c = 3}
for k, v in pairs(table) do
    print(k, v)
end

local array = {10, 20, 30}
for i, v in ipairs(array) do
    print(i, v)
end
```
```typescript
// TypeScript
const table = {a: 1, b: 2, c: 3};
for (const [k, v] of Object.entries(table)) {
    log(k, v);
}

const array = [10, 20, 30];
for (let i = 0; i < array.length; i++) {
    log(i + 1, array[i]); // Lua 是 1-based
}
```

### 注意事項
- 僅替換函數名稱和調用方式，不改變參數的數值或順序
- 保持函數的行為完全一致
- 對於 Lua 特有的函數，使用最接近的 TypeScript 對應方式
- 不進行任何優化或重構，僅做必要的語法轉換

### 完成檢查清單
- 所有 `string.*` 函數已轉為對應的字串方法
- 所有 `table.*` 函數已轉為對應的陣列方法
- 所有 `type()` 函數已轉為 `typeof`
- 所有 `os.time()` 已轉為 `Date.now()`
- 所有 `print()` 函數已轉為 `log()`
- 所有 `pcall()` 已轉為 `try/catch`
- 所有 `clone()` 已轉為 `JSON.parse(JSON.stringify())`
- 所有 `pairs/ipairs` 已轉為對應的遍歷方式
- 未改變任何函數的參數或行為

### 下一步
- 請進行 step8.md：Cocos2d-x 特有函數轉換