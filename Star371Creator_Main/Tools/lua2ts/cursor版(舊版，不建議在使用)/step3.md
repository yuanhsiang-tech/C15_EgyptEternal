## Step 3 — self → this 與「:」→「.」轉換

### 前提
- 已完成 Step 1（規則與禁則）與 Step 2（類別結構與生命週期）。
- 已將原始檔各自複製一份並更名為 .ts（僅更名、未改邏輯）。

### 目標
- 僅執行兩項必要語法轉換，維持一對一與功能等效：
  1) `self` 改為 `this`
  2) 方法呼叫與定義的 `:` 改為 `.`

### 範圍界定
- 本步驟只處理 `self` 與 `:` 的語法替換，不處理其他 API 對應（請依其他步驟執行）。

### 規則 1：self → this
對照示例：
```lua
-- Lua（方法內）
self.m_controller = controller
self:InitData()
self:InitView()
```
```typescript
// TS（方法內）
this.m_controller = controller
this.InitData()
this.InitView()
```

定義使用 `self` 的函式（點號定義）
```lua
function ClassName.Method(self, a, b)
  self:DoWork(a, b)
end
```
```typescript
public Method(a: any, b: any): void {
  this.DoWork(a, b)
}
```

### 規則 2：「:」→「.」
呼叫轉換：
```lua
self:RunHide()
itemNode:setPosition(cc.p(x, y))
containerView:addChild(child)
```
```typescript
this.RunHide()
itemNode.setPosition(x, y)
containerView.addChild(child)
```

定義轉換：
```lua
function ClassName:Update(a, b)
  self:DoWork(a, b)
end
```
```typescript
public Update(a: any, b: any): void {
  this.DoWork(a, b)
}
```


### 注意事項
- 使用 `this.*` 的屬性必須在類別開頭宣告（屬性宣告在開頭）
- 僅更改 `self` 與 `:` 的語法表達，不改變參數數量/順序/名稱
- 不新增任何臨時變數或綁定（例如 `const that = this`、`.bind` 等）
- 點號定義且第一參數為 `self` 的函式，在 TS 改為類別方法時需移除該參數並以 `this` 取代
- 其餘 API/行為轉換（可見性、座標、型別等）在後續步驟處理

屬性宣告對照：
```typescript
@ccclass('Example')
export class Example extends Component {
  // ✅ 在類別開頭宣告所有會以 this.* 使用的成員
  public m_controller: any
  public count: number = 0

  public ctor(controller: any): void {
    this.m_controller = controller
  }

  public Update(): void {
    this.count += 1
    this.m_controller.DoWork()
  }
}

// ❌ 錯誤：未於類別開頭宣告就直接使用
// public Update(): void {
//   this.undeclaredField = 1
// }
```

### 規則 3：成員變數命名規範（最後一步）
在完成 `self` → `this` 和 `:` → `.` 轉換後，最後調整 class 成員變數的命名格式。

**命名規範**：class 的成員變數應使用 `m_` 小寫開頭的命名格式。

**轉換範例**：
```typescript
// 轉換前（完成 self → this 和 : → . 後）
@ccclass('Example')
export class Example extends Component {
  public controller: any
  public count: number = 0
  public title: string = "Hello"

  public ctor(controller: any): void {
    this.controller = controller
  }

  public Update(): void {
    this.count += 1
    this.controller.DoWork()
  }
}
```

```typescript
// 轉換後（應用命名規範）
@ccclass('Example')
export class Example extends Component {
  public m_controller: any
  public m_count: number = 0
  public m_title: string = "Hello"

  public ctor(controller: any): void {
    this.m_controller = controller
  }

  public Update(): void {
    this.m_count += 1
    this.m_controller.DoWork()
  }
}
```

**注意事項**：
- 僅調整 class 成員變數的命名，其他變數（函數參數、局部變數等）保持原名稱
- 確保所有使用該成員變數的地方都同步更新
- 保持變數的類型和初始值不變

### 完成檢查清單
- 所有 `self.` 均已改為 `this.`
- 所有 `obj:Method(...)` 均已改為 `obj.Method(...)`
- 以冒號定義的函式已轉為類別方法；以點號定義且參數含 `self` 者已移除該參數並改用 `this`
- 未引入任何額外引數或邏輯更動
- **class 成員變數已調整為 `m_` 小寫開頭格式**

### 下一步
- 請進行 step4.md：資料結構轉換
