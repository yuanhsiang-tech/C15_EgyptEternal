#!/usr/bin/env node

/**
 * 使用方式：
 *   node lua2ts.js
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const net = require('net');

// 取得當前目錄的絕對路徑
const currentDir = __dirname;

// 輔助函數：將路徑統一轉換為斜線格式
function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

// 輔助函數：檢查 port 是否可用
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(true);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    
    server.listen(port, '127.0.0.1');
  });
}

// 輔助函數：等待指定時間
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 輔助函數：開啟瀏覽器
function openBrowser(url) {
  const platform = process.platform;
  let command;
  
  if (platform === 'win32') {
    command = `start ${url}`;
  } else if (platform === 'darwin') {
    command = `open ${url}`;
  } else {
    command = `xdg-open ${url}`;
  }
  
  try {
    execSync(command, { stdio: 'ignore' });
    console.log(`✓ 已開啟瀏覽器: ${url}`);
  } catch (error) {
    console.log(`⚠ 無法自動開啟瀏覽器，請手動開啟: ${url}`);
  }
}

// 輔助函數：檢查並建立資料夾
function ensureDirectoryExists(dirPath, dirName, shouldCreate = true, isRequired = true) {
  try {
    if (!fs.existsSync(dirPath)) {
      if (shouldCreate) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✓ 已建立 ${dirName} 資料夾: ${dirPath}`);
        // 如果是 rules 資料夾，建立後也要顯示警告
        if (dirName === 'rules') {
          return { success: true, warning: true };
        }
        return { success: true, warning: false };
      } else if (isRequired) {
        console.error(`✗ 找不到必要的 ${dirName} 資料夾: ${dirPath}`);
        return { success: false, warning: false };
      } else {
        console.warn(`⚠ 警告，找不到 ${dirName} 資料夾: ${dirPath}`);
        return { success: true, warning: true }; // 非必要資料夾，繼續執行但有警告
      }
    } else {
      console.log(`✓ ${dirName} 資料夾已存在: ${dirPath}`);
      return { success: true, warning: false };
    }
  } catch (error) {
    console.error(`✗ 處理 ${dirName} 資料夾時發生錯誤: ${error.message}`);
    return { success: false, warning: false };
  }
}

// 主要執行流程
async function main() {
  console.log('=== lua2ts 自動化啟動腳本 ===\n');
  
  // 步驟 0: 檢查必要資源
  console.log('📁 步驟 0: 檢查必要資源...');
  
  const inputPath = path.join(currentDir, 'input');
  const outputPath = path.join(currentDir, 'output');
  const workflowDirPath = path.join(currentDir, 'workflow');
  const rulesPath = path.join(currentDir, 'rules');
  
  let hasErrors = false;
  let hasWarnings = false;
  
  // 檢查 input 資料夾（不存在則建立）
  const inputResult = ensureDirectoryExists(inputPath, 'input', true, false);
  if (!inputResult.success) {
    hasErrors = true;
  }
  
  // 檢查 output 資料夾（不存在則建立）
  const outputResult = ensureDirectoryExists(outputPath, 'output', true, false);
  if (!outputResult.success) {
    hasErrors = true;
  }
  
  // 檢查 workflow 資料夾（不存在則報錯跳出）
  const workflowResult = ensureDirectoryExists(workflowDirPath, 'workflow', false, true);
  if (!workflowResult.success) {
    hasErrors = true;
  }
  
  // 檢查 rules 資料夾（不存在則建立並記錄警告）
  const rulesResult = ensureDirectoryExists(rulesPath, 'rules', true, false);
  if (rulesResult.warning) {
    hasWarnings = true;
  }
  
  if (hasErrors) {
    console.error('\n✗ 資源檢查失敗，程式終止');
    process.exit(1);
  }
  
  if (hasWarnings) {
    console.log('⚠ 資源檢查完成，但存在警告\n');
  } else {
    console.log('✓ 資源檢查完成\n');
  }
  
  // 步驟 1: 檢查 n8n 是否已安裝
  console.log('📦 步驟 1: 檢查 n8n 安裝狀態...');
  try {
    execSync('n8n --version', { stdio: 'pipe' });
    console.log('✓ n8n 已安裝\n');
  } catch (error) {
    console.error('✗ n8n 未安裝！');
    console.error('   請先手動安裝 n8n：');
    console.error('   Windows: npm install -g n8n');
    console.error('   macOS: npm install -g n8n');
    console.error('   Linux: npm install -g n8n');
    console.error('   安裝完成後再重新執行此腳本');
    process.exit(1);
  }
  
  // 步驟 2: 更新工作流程配置
  console.log('⚙️  步驟 2: 更新工作流程配置...');
  const workflowPath = path.join(currentDir, 'workflow', 'lua2ts main.json');
  
  try {
    // 讀取 JSON 檔案
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');
    const workflowData = JSON.parse(workflowContent);
    
    // 找到「設定root」節點並更新路徑
    const targetNodeId = '7e1924df-3ba2-4a5a-b5a3-b93c1fdbe9ba';
    let nodeFound = false;
    
    for (const node of workflowData.nodes) {
      if (node.id === targetNodeId && node.name === '設定root') {
        const normalizedPath = normalizePath(currentDir);
        node.parameters.assignments.assignments[0].value = normalizedPath;
        nodeFound = true;
        console.log(`✓ 已更新 RootPath 為: ${normalizedPath}`);
        break;
      }
    }
    
    if (!nodeFound) {
      console.warn('⚠ 警告: 未找到「設定root」節點，跳過更新');
    } else {
      // 寫回檔案，保持格式
      fs.writeFileSync(workflowPath, JSON.stringify(workflowData, null, 2), 'utf8');
      console.log('✓ 工作流程配置已更新\n');
    }
  } catch (error) {
    console.error('✗ 更新工作流程配置失敗！');
    console.error(`   錯誤訊息: ${error.message}`);
    console.error('   請檢查 workflow/lua2ts main.json 檔案是否存在且格式正確');
    process.exit(1);
  }
  
  // 步驟 3: 導入工作流程
  console.log('📥 步驟 3: 導入工作流程到 n8n...');
  const workflowDir = path.join(currentDir, 'workflow');
  
  try {
    // 使用絕對路徑並加上引號以處理路徑中的空格
    const importCommand = `n8n import:workflow --separate --input="${workflowDir}"`;
    execSync(importCommand, { stdio: 'inherit' });
    console.log('✓ 工作流程導入完成\n');
  } catch (error) {
    // 工作流程已存在的錯誤可以忽略
    if (error.message.includes('already exists') || error.message.includes('已存在')) {
      console.log('⚠ 工作流程可能已存在，繼續執行...\n');
    } else {
      console.error('✗ 導入工作流程失敗！');
      console.error(`   錯誤訊息: ${error.message}`);
      console.error('   請檢查 workflow 資料夾是否存在且包含正確的工作流程檔案');
      // 不中斷執行，繼續啟動 n8n
    }
  }
  
  // 步驟 4: 檢查並啟動 n8n (已註解)
  /*
  console.log('🚀 步驟 4: 啟動 n8n 服務...');
  const port = 5678;
  const url = `http://localhost:${port}/`;
  
  const portAvailable = await isPortAvailable(port);
  
  if (!portAvailable) {
    console.log(`✓ n8n 服務已在 port ${port} 運行中`);
    console.log('   跳過啟動，直接開啟瀏覽器...\n');
    openBrowser(url);
  } else {
    console.log('   正在背景啟動 n8n 服務...');
    
    try {
      // 跨平台背景啟動 n8n
      const n8nProcess = spawn('n8n', [], {
        detached: true,
        stdio: 'ignore'
      });
      
      n8nProcess.unref();
      
      console.log('✓ n8n 服務已在背景啟動');
      console.log('   等待服務初始化...');
      
      // 等待服務啟動（檢查 port 是否開始監聽）
      let retries = 15; // 最多等待 15 秒
      let started = false;
      
      for (let i = 0; i < retries; i++) {
        await sleep(1000);
        const available = await isPortAvailable(port);
        if (!available) {
          started = true;
          break;
        }
        process.stdout.write('.');
      }
      
      console.log('');
      
      if (started) {
        console.log('✓ n8n 服務啟動成功\n');
        openBrowser(url);
      } else {
        console.log('⚠ n8n 服務啟動中，可能需要更多時間');
        console.log(`   請稍後手動開啟: ${url}\n`);
      }
      
    } catch (error) {
      console.error('✗ 啟動 n8n 服務失敗！');
      console.error(`   錯誤訊息: ${error.message}`);
      console.error('   請嘗試手動執行: n8n');
      process.exit(1);
    }
  }
  
  console.log('=== 執行完成 ===');
  console.log(`\n💡 提示: n8n 服務將在背景持續運行`);
  console.log(`   訪問網址: ${url}`);
  console.log(`   若要停止服務，請在工作管理員/活動監視器中結束 n8n 程序\n`);
  */
  
  
  console.log('=== 執行完成 ===');
  console.log('\n💡 提示: 請手動執行 "n8n" 指令來啟動 n8n 服務');
  console.log('   啟動後可訪問: http://localhost:5678/\n');
  // 最終警告檢查
  if (hasWarnings) {
    console.log('⚠ 警告，找不到規則，請將轉換規則命名為afterstep1.md，並放在rules資料夾中');
  }
}

// 執行主程式
main().catch(error => {
  console.error('\n✗ 執行過程中發生錯誤：');
  console.error(error);
  process.exit(1);
});

