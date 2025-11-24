## Step 8 — Cocos2d-x 特有函數轉換

### 前提
- 已完成 Step 1（規則與禁則）、Step 2（類別結構與宣告）、Step 3（self → this 與「:」→「.」）、Step 4（資料結構）、Step 5（條件語句與循環）、Step 6（基本語法轉換）、Step 7（Lua 內建函數轉換）。
- 僅做必要語法轉換，不改動參數數量、順序與邏輯（遵守一對一原則）。

### 目標
- 轉換 Cocos2d-x 特有的函數到 TypeScript 對應方式
- 保持函數調用的參數形式完全一致
- 不改變函數的行為和返回值

### Cocos2d-x 特有函數對照表

#### 1. TimedBool / TimeBoolV2 轉換
```lua
-- Lua
local timer = TimedBool()
local timer2 = TimeBoolV2()
timer:start()
timer2:start()
timer:stop()
timer2:stop()
```
```typescript
// TypeScript
const timer = new TimeBool();
const timer2 = new TimeBool();
timer.start();
timer2.start();
timer.stop();
timer2.stop();
```

#### 2. setVisible 轉換
```lua
-- Lua
self.m_tipLabel:setVisible(false)
self.m_button:setVisible(true)
self.m_background:setVisible(false)
```

```typescript
// TypeScript
this.m_tipLabel.active = false;
this.m_button.active = true;
this.m_background.active = false;
```

#### 3. isnull 轉換
```lua
-- Lua
if not tolua.isnull(self) and not tolua.isnull(self.m_scrollView) then
    -- 處理邏輯
end

if tolua.isnull(someNode) then
    return
end
```
```typescript
// TypeScript
if (isValid(this) && isValid(this.m_scrollView)) {
    // 處理邏輯
}

if (!isValid(someNode)) {
    return;
}
```

#### 4. GET_UI 轉換
```lua
-- Lua
local title = GET_UI(self, TotalAwardUIName.TITLE)
local label = GET_UI(self, "LabelNode")
```
```typescript
// TypeScript
const title = NodeUtils.GetUI(this.node, TotalAwardUIName.TITLE);
const label = NodeUtils.GetUI(this.node, "LabelNode");
```

#### 5. UserDefault 轉換
```lua
-- Lua
cc.UserDefault:getInstance():setIntegerForKey("key", value)
cc.UserDefault:getInstance():getIntegerForKey("key", 0)
cc.UserDefault:getInstance():setStringForKey("key", "value")
cc.UserDefault:getInstance():getStringForKey("key", "default")
cc.UserDefault:getInstance():setFloatForKey("key", 1.5)
cc.UserDefault:getInstance():getFloatForKey("key", 0.0)
cc.UserDefault:getInstance():setBoolForKey("key", true)
cc.UserDefault:getInstance():getBoolForKey("key", false)
```
```typescript
// TypeScript
Persist.App.Set("key", value.toString());
Persist.App.Get("key") || "0";
Persist.App.Set("key", "value");
Persist.App.Get("key") || "default";
Persist.App.Set("key", "1.5");
Persist.App.Get("key") || "0.0";
Persist.App.Set("key", "true");
Persist.App.Get("key") || "false";
```

### 注意事項
- 僅替換函數名稱和調用方式，不改變參數的數值或順序
- 保持函數的行為完全一致
- 對於 Cocos2d-x 特有的函數，使用最接近的 TypeScript 對應方式
- 不進行任何優化或重構，僅做必要的語法轉換

### 完成檢查清單
- 所有 `TimedBool()` 和 `TimeBoolV2()` 已轉為 `new TimeBool()`
- 所有 `setVisible(true/false)` 已轉為 `active = true/false`
- 所有 `tolua.isnull()` 已轉為 `isValid()`
- 所有 `GET_UI()` 已轉為 `NodeUtils.GetUI()`
- 所有 `cc.UserDefault:getInstance()` 已轉為 `Persist.App`
  - `setXXXForKey` → `Set`（XXX轉字串）
  - `getXXXForKey` → `Get`（字串轉XXX）
- 未改變任何函數的參數或行為

### 下一步
- 請進行 step9.md：最終檢查與驗證