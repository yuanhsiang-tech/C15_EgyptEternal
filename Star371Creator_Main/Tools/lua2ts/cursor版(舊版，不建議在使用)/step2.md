## Step 2 — 類別結構與生命週期轉換

### 必要 import 語句

```typescript
import { _decorator, assetManager, Component, Sprite, Vec2, Prefab, log, math, Node, instantiate, UITransform, Animation, Color, isValid, SpriteFrame, Label, Size, Vec3, EventTouch, v3, Director, TimeBool } from 'cc';
import { NodeUtils } from 'db://assets/Stark/FuncUtils/NodeUtils';
import { Persist } from 'db://assets/Script/Persist/Persist';
```

### 前提
- 已完成 Step 1（規則與禁則）
- 已將原始檔各自複製一份並更名為 .ts（僅更名，未改邏輯）
- 嚴格依檔案轉換，不得添加或刪除邏輯

### 目標
- 建立 TypeScript 類別結構
- 轉換 Lua 的 CClass 到 TypeScript 的 @ccclass
- 建立生命週期方法對應關係
- 保持功能完全一致

### 轉換順序

#### 階段 1：準備工作

**步驟 1.1：創建 @ccclass 結構**
```typescript
@ccclass('MoneyRainLayer')
export class MoneyRainLayer extends Component {
    // 暫時為空
}
```

**步驟 1.2：函式識別與大小評估**
```bash
# 識別函式
grep -n "function MoneyRainLayer:" input_file.lua

# 檢查函式大小（手動計算行數）
```

**函式大小評估標準**：
- **小型函式**（≤ 20 行）：一次可處理 2 個
- **中型函式**（21-50 行）：一次處理 1 個
- **大型函式**（> 50 行）：一次處理 1 個

#### 階段 2：分段移動與格式轉換

**嚴格禁止**：
- ❌ 批量處理多個函式
- ❌ 使用批量替換功能
- ❌ 使用正則表達式進行批量轉換

**必須執行**：
- ✅ **根據函式大小決定處理數量**
- ✅ 每組函式移動後必須驗證結構
- ✅ 嚴格按照原始檔案中的函式順序進行轉換
- ✅ 手動搬運函式內容，確保準確性

**操作順序**：
1. **手動複製並轉換**：複製函式內容到類別內部，同時進行格式轉換
2. **手動刪除**：刪除類別外部的原始函式
3. **綜合驗證**：檢查移動和轉換後的類別結構

**格式轉換規則**：
- `function ClassName:MethodName` → `MethodName() {`
- 移除函式結尾的 `end` 關鍵字
- 使用 `{` 和 `}` 包圍方法內容

**重要限制**：
- 只能轉換類別內部的函式
- 只能轉換函式結尾的 `end`
- 不得轉換 if/for/while 等控制結構

#### 階段 3：變數處理

**步驟 3.1：提取 self.* 變數**
掃描所有函式中的 `self.*` 使用，在類別開頭宣告這些成員變數。

**步驟 3.2：變數命名規範調整**
- 使用 **`m_` 前綴**
- 前綴後使用 camelCase

#### 階段 4：create 函式處理

**步驟 4.1：判斷 create 函式類型**
檢查 create 函式是否有參數：

**無參數情況**：使用 `onLoad` 方法
```typescript
public static onLoad(): MyClass {
    const node = cc.CSLoader.createNode("path/to/file")
    const extendedNode = MyClass.extend(node)
    extendedNode.onLoad()
    return extendedNode
}
```

**有參數情況**：使用 `create` 方法
```typescript
public static create(param1: any, param2: any): MyClass {
    const node = cc.CSLoader.createNode("path/to/file")
    const extendedNode = MyClass.extend(node)
    extendedNode.ctor(param1, param2)
    return extendedNode
}
```

**判斷標準**：
- 如果 `function ClassName:create()` 沒有參數 → 轉換為 `onLoad()`
- 如果 `function ClassName:create(param1, param2, ...)` 有參數 → 轉換為 `create(param1, param2, ...)`

### 生命週期方法對應

| Lua 方法 | TypeScript 方法 | 說明 |
|---|---|---|
| `create()` (無參數) | `onLoad()` | 無參數的實例化 |
| `create(param1, ...)` (有參數) | `create(param1, ...)` | 有參數的實例化 |
| `ctor` | `ctor` | 對應建構初始化 |
| `OnEnter` | `start` | Cocos Creator 生命週期啟動 |
| `OnExit` | `onDestroy` | 銷毀時呼叫 |
| `OnUpdate`| `update` | 每幀更新 |

### 工具命令

```bash
# 識別函式
grep -n "function ClassName:" input_file.lua

# 檢查函式大小
awk '/function ClassName:/ {start=NR} /^end$/ && start {print start":"NR-start+1; start=0}' input_file.lua

# 結構驗證
grep -n "@ccclass\|export class\|}" output_file.ts
```

### 驗證檢查清單

#### 階段 1 驗證
- [ ] 已創建 `@ccclass('ClassName')` 和 `extends Component` 結構
- [ ] 已識別所有需要移動的函式並保持原始順序
- [ ] 已根據函式大小進行分組

#### 階段 2 驗證
- [ ] 已分段移動所有函式到類別內部並轉換為 TypeScript 格式
- [ ] 已驗證函式在類別內部的順序與原始檔案一致
- [ ] 函式語法正確，沒有遺漏的 end
- [ ] 類別結構完整，沒有語法錯誤

#### 階段 3 驗證
- [ ] 所有 `self.*` 使用的成員變數已在類別開頭宣告
- [ ] class 成員變數已調整為 `m_` 前綴 + camelCase 格式

#### 階段 4 驗證
- [ ] 已判斷 create 函式是否有參數
- [ ] 無參數的 create 函式已轉換為 `onLoad()` 靜態方法
- [ ] 有參數的 create 函式已轉換為 `create()` 靜態方法

### 注意事項
- **根據函式大小決定處理數量**（小型函式可處理2個，中大型函式處理1個）
- **嚴格按照原始檔案中的函式順序進行轉換，不得改變順序**
- **禁止使用腳本或自動化工具，必須手動搬運函式內容**
- **嚴格禁止使用批量替換功能**
- **必須逐個函式手動轉換，不得使用任何批量操作**
- **只能轉換類別內部的函式，不得轉換 if/for/while 等控制結構**
- **只能轉換函式結尾的 end，不得轉換控制結構的 end**
- **create 函式必須根據參數情況判斷使用 onLoad() 或 create()**
- 嚴格依檔案轉換，不得添加或刪除邏輯
- 錯誤保留，交由編譯器報錯，禁止用註解隱藏

### 下一步
- 請進行 step3.md：self → this 與「:」→「.」轉換