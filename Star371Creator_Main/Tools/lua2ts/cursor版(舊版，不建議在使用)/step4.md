## Step 4 — 資料結構轉換（cc.size / cc.p / c3b / c4b）

### 前提
- 已完成 Step 1（規則與禁則）、Step 2（類別結構與宣告）、Step 3（self → this 與「:」→「.」）。
- 僅做必要語法替換，不改動參數數量、順序與邏輯。

### 目標
- 轉換 Cocos2d-x 資料結構到 TypeScript 對應類型
- 保持資料結構的數值和參數完全一致
- 不改變任何數值、順序或邏輯結構


### cc.size(w, h) → new Size(w, h)
- 一對一替換：表達相同資料，不調整數值與順序。
```lua
-- Lua
local S = cc.size(100, 50)
```
```typescript
// TypeScript
const S = new Size(100, 50)
// 可選型別註記
const S2: Size = new Size(200, 80)
```

### cc.p(x, y) → v2(x, y)
- 一對一替換：保持參數形式與順序；不引入其他 API。
```lua
-- Lua
local P = cc.p(x, y)
```
```typescript
// TypeScript
const P = v2(x, y)
```

型別註記（可選，僅補型別不改語意）
```typescript
const P: Vec2 = v2(x, y)
```

### cc.c3b(r, g, b) → new Color(r, g, b)
- 三通道顏色；不包含 alpha。
```lua
-- Lua
label:setColor(cc.c3b(255, 255, 255))
```
```typescript
// TypeScript
label.color = new Color(255, 255, 255)
```

### cc.c4b(r, g, b, a) → new Color(r, g, b, a)
- 四通道顏色；a 為 0–255。
```lua
-- Lua
local maskColor = cc.c4b(0, 0, 0, 130)
```
```typescript
// TypeScript
const maskColor = new Color(0, 0, 0, 130)
// 可選型別註記
const white: Color = new Color(255, 255, 255)
```

### cc.rect(x, y, w, h) → new Rect(x, y, w, h)
```lua
-- Lua
local R = cc.rect(10, 20, 100, 50)
```
```typescript
// TypeScript
const R = new Rect(10, 20, 100, 50)
// 可選型別註記
const R2: Rect = new Rect(0, 0, 0, 0)
```

### math → Math（數學函數一對一）
```lua
-- Lua
local rows = math.ceil(n/m)
local vMax = math.max(a, b)
local vMin = math.min(a, b)
local vAbs = math.abs(x)
local vFloor = math.floor(x)
local vPow = math.pow(x, y)
local vSqrt = math.sqrt(x)
```
```typescript
let rows = Math.ceil(n / m)
const vMax = Math.max(a, b)
const vMin = Math.min(a, b)
const vAbs = Math.abs(x)
const vFloor = Math.floor(x)
const vPow = Math.pow(x, y)
const vSqrt = Math.sqrt(x)
```

### 3D/世界座標需求時使用 v3
```typescript
// 例如：UITransform 轉換需要 Vec3
const world: Vec3 = (node.getComponent(UITransform) ?? node.addComponent(UITransform)).convertToWorldSpaceAR(v3(0, 0, 0))
```

### 常見零值對應（僅一對一）
```lua
-- Lua
cc.p(0, 0)
cc.size(0, 0)
cc.rect(0, 0, 0, 0)
```
```typescript
// TypeScript
v2(0, 0)
new Size(0, 0)
new Rect(0, 0, 0, 0)
```

### 注意事項（一步到位，不加料）
- 僅替換語法：不得改動任何數值、常數名稱或參數位置。
- 不將 `v2(x, y)` 改寫為其他形式（如兩個獨立參數）；遵守 Step 1 的一對一原則。
- 僅在需要使用時，補上對應匯入（Size / Color / v2 / v3 / Rect / UITransform）。
- 若需 3D 或世界座標，使用 v3 與 Vec3；矩形使用 Rect。
- 僅補型別註記（Vec2/Vec3/Size/Rect/Color）而不改動語意與值。
- Math 使用保持一對一：`math.*` → `Math.*`，不改成其他算式表達。

### 型別與陣列的放置（僅註記，不改語意）
- 類別屬性的陣列型別請在 Step 2 依 CLASS_PROPDECL_001 於類別開頭宣告：
  - `public points: Vec2[] = []`
  - `public sizes: Size[] = []`
- 區域或常數的陣列型別在第一次宣告處補上：
  - `const colors: Color[] = []`

### 完成檢查清單
- 所有 `cc.size(...)` 均已改為 `new Size(...)`。
- 所有 `cc.p(...)` 均已改為 `v2(...)`。
- 所有 `cc.c3b(...)` 均已改為 `new Color(r, g, b)`。
- 所有 `cc.c4b(...)` 均已改為 `new Color(r, g, b, a)`。
- 未改變任何參數數量、順序與數值；必要匯入已補齊。

### 下一步
- 請進行 step5.md：條件語句與循環（if/elseif/else、for/while/pairs 一對一轉換與索引規則）。