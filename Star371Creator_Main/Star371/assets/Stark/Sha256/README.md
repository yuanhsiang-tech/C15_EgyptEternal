# SHA 加密工具 (SHA Encryption Tools)

基於 TypeScript 的 SHA 加密函式庫，支援 SHA1 和 SHA256 兩種演算法。

**注意：此函式庫為純 TypeScript 實現，無需外部依賴，適用於 Cocos Creator 專案。**

## 目錄結構

```
Common/Script/Sha1/
├── Sha1.ts                    # SHA1 加密實作
├── Sha256.ts                  # SHA256 加密實作
├── Sha256Example.ts           # SHA256 使用示例
└── README.md                  # 說明文件
```

## 核心概念

### 1. SHA1 vs SHA256 的差異

**SHA1（Secure Hash Algorithm 1）**：
- 輸出長度：160 位元（20 bytes）
- 安全性：已被破解，不建議用於安全場景
- 性能：較快
- 適用場景：檔案校驗、非安全性雜湊

**SHA256（Secure Hash Algorithm 256）**：
- 輸出長度：256 位元（32 bytes）
- 安全性：目前安全，建議用於安全場景
- 性能：較慢
- 適用場景：密碼雜湊、數位簽章、安全性雜湊

### 2. 輸出格式

支援四種輸出格式：
- **hex**: 十六進位字串（預設，大寫）
- **array**: 數字陣列
- **digest**: 數字陣列（與 array 相同）
- **arrayBuffer**: ArrayBuffer

## 使用方法

### SHA1 基本使用

```typescript
import sha1 from './Sha1';

// 基本 SHA1 加密
const message = "Hello, World!";
const hash = sha1(message);
log(hash); // 輸出：0A4D55A8D778E5022FAB701977C5D840BBC486D0
```

### SHA256 基本使用

```typescript
import sha256 from './Sha256';

// 基本 SHA256 加密
const message = "Hello, World!";
const hash = sha256(message);
log(hash); // 輸出：DFFD6021BB2BD5B0AF676290809EC3A53191DD81C7F70A4B28688A362182986F
```

### 不同輸出格式

```typescript
import sha256 from './Sha256';

const message = "test";

// 十六進位字串（預設）
const hexHash = sha256(message);
log(hexHash); // 大寫十六進位字串

// 數字陣列
const arrayHash = (sha256 as any).array(message);
log(arrayHash); // [159, 134, 208, 129, ...]

// ArrayBuffer
const bufferHash = (sha256 as any).arrayBuffer(message);
log(bufferHash.byteLength); // 32
```

### 進階使用 - 串流處理

```typescript
import sha256 from './Sha256';

// 建立 SHA256 實例進行串流處理
const hasher = (sha256 as any).create();
hasher.update("Hello, ");
hasher.update("World!");
const result = hasher.hex();
log(result);
```

### 中文字串支援

```typescript
import sha256 from './Sha256';

const chineseMessage = "你好世界";
const hash = sha256(chineseMessage);
log(hash); // 自動支援 UTF-8 編碼
```

### 使用示例類別

```typescript
import { Sha256Example } from './Sha256Example';

// 執行所有測試
Sha256Example.runAllTests();

// 或執行特定測試
Sha256Example.basicExample();
Sha256Example.testChineseString();
Sha256Example.testKnownVectors();
Sha256Example.performanceTest();
```

## API 參考

### SHA1 函式

| 方法 | 說明 | 回傳值 |
|------|------|--------|
| `sha1(message: string)` | 計算 SHA1 並返回大寫十六進位字串 | `string` |
| `sha1.create()` | 建立新的 SHA1 實例 | `Sha1` |
| `sha1.array(message: string)` | 返回數字陣列 | `number[]` |
| `sha1.arrayBuffer(message: string)` | 返回 ArrayBuffer | `ArrayBuffer` |

### SHA256 函式

| 方法 | 說明 | 回傳值 |
|------|------|--------|
| `sha256(message: string)` | 計算 SHA256 並返回大寫十六進位字串 | `string` |
| `(sha256 as any).create()` | 建立新的 SHA256 實例 | `Sha256` |
| `(sha256 as any).array(message: string)` | 返回數字陣列 | `number[]` |
| `(sha256 as any).arrayBuffer(message: string)` | 返回 ArrayBuffer | `ArrayBuffer` |

### SHA1 類別方法

| 方法 | 說明 | 回傳值 |
|------|------|--------|
| `update(message: string \| ArrayBuffer \| Uint8Array)` | 更新雜湊內容 | `Sha1` |
| `hex()` | 返回十六進位字串 | `string` |
| `array()` | 返回數字陣列 | `number[]` |
| `arrayBuffer()` | 返回 ArrayBuffer | `ArrayBuffer` |

### SHA256 類別方法

| 方法 | 說明 | 回傳值 |
|------|------|--------|
| `update(message: string \| ArrayBuffer \| Uint8Array)` | 更新雜湊內容 | `Sha256` |
| `hex()` | 返回十六進位字串 | `string` |
| `array()` | 返回數字陣列 | `number[]` |
| `arrayBuffer()` | 返回 ArrayBuffer | `ArrayBuffer` |

## 演算法比較

| 特性 | SHA1 | SHA256 |
|------|------|--------|
| 輸出長度 | 160 位元 (20 bytes) | 256 位元 (32 bytes) |
| 安全性 | 較低（已被破解） | 較高（目前安全） |
| 性能 | 較快 | 較慢 |
| 使用建議 | 不建議用於安全場景 | 建議用於安全場景 |
| 適用場景 | 檔案校驗、非安全性雜湊 | 密碼雜湊、數位簽章 |

## 測試驗證

### SHA256 已知測試向量

```typescript
// 空字串
sha256("") === "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855"

// "abc"
sha256("abc") === "BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD"

// "message digest"
sha256("message digest") === "F7846F55CF23E14EEBEAB5B4E1550CAD5B509E3348FBC4EFA3A1413D393CB650"
```

## 注意事項

- 所有輸出的十六進位字串都是大寫格式
- 支援 UTF-8 字元編碼，可以正確處理中文等多位元組字元
- 適用於瀏覽器和 Cocos Creator 環境
- SHA1 僅建議用於非安全性場景，如檔案校驗
- SHA256 建議用於需要安全性的場景，如密碼雜湊
- 使用 TypeScript 的 `as any` 來訪問動態添加的方法（如 `array`、`arrayBuffer`）

## 性能考量

- SHA1 性能較好，適合大量數據處理
- SHA256 安全性更高，適合安全性要求高的場景
- 建議在開發環境中使用 `Sha256Example` 進行性能測試
- 對於大量數據，可以使用串流處理方式以減少記憶體使用

## 實際應用場景

### 1. 檔案完整性校驗
```typescript
import sha256 from './Sha256';

function verifyFileIntegrity(fileContent: string, expectedHash: string): boolean {
    const actualHash = sha256(fileContent);
    return actualHash === expectedHash.toUpperCase();
}
```

### 2. 密碼雜湊
```typescript
import sha256 from './Sha256';

function hashPassword(password: string, salt: string): string {
    return sha256(password + salt);
}
```

### 3. 數據指紋生成
```typescript
import sha256 from './Sha256';

function generateDataFingerprint(data: any): string {
    const dataString = JSON.stringify(data);
    return sha256(dataString);
}
``` 