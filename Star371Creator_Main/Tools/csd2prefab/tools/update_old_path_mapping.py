#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
舊資源文件路徑映射更新工具 - 將 input_resources_old.json 中的 path_mapping 更新為新格式
"""

import json
import time
from pathlib import Path


def normalize_path_for_uuid_key(file_path):
    """
    標準化文件路徑作為 UUID 緩存的鍵，使用與 doit.py 相同的邏輯
    """
    if not file_path:
        return file_path
        
    path_file = Path(file_path)
    parts = path_file.parts
    
    # 轉換為正斜線以保持一致性
    normalized_parts = [part.replace("\\", "/") for part in parts]
    
    next_break = False
    for i in range(len(normalized_parts)):
        # 檢查特殊目錄
        if normalized_parts[i] == "Lua":
            next_break = True
            continue
        elif normalized_parts[i] in ["CommonResource", "GameResource"]:
            # 對於 CommonResource/GameResource，使用從這一層開始的路徑
            canonical_path = "/".join(normalized_parts[i:])
            return canonical_path
        elif normalized_parts[i] in ["LuaResource", "ProfileResource", "WuShiResource"]:
            # 對於這些資源目錄，使用從這一層開始的路徑
            canonical_path = "/".join(normalized_parts[i:])
            return canonical_path
        elif next_break:
            # 在遇到 "Lua" 後的下一個目錄開始計算路徑
            canonical_path = "/".join(normalized_parts[i:])
            return canonical_path
    
    # 如果沒有找到特殊目錄，返回完整路徑
    return "/".join(normalized_parts)


def update_path_mapping(input_file="input_resources_old.json", output_file="input_resources_updated.json"):
    """
    更新 path_mapping 中的路徑格式
    
    Args:
        input_file: 輸入的舊格式資源文件
        output_file: 輸出的新格式資源文件
    """
    
    print(f"🔄 開始更新路徑映射...")
    print(f"  📁 輸入文件: {input_file}")
    print(f"  📄 輸出文件: {output_file}")
    
    # 載入舊資源文件
    if not Path(input_file).exists():
        print(f"❌ 錯誤：輸入文件 {input_file} 不存在")
        return False
        
    print(f"✅ 載入資源文件: {input_file}")
    with open(input_file, 'r', encoding='utf-8') as f:
        resources_data = json.load(f)
    
    # 檢查是否存在 path_mapping
    if "path_mapping" not in resources_data:
        print(f"⚠️ 警告：文件中沒有找到 path_mapping 區段")
        return False
    
    old_path_mapping = resources_data["path_mapping"]
    print(f"📊 發現 {len(old_path_mapping)} 個路徑映射條目")
    
    # 更新路徑映射
    new_path_mapping = {}
    updated_count = 0
    unchanged_count = 0
    error_count = 0
    
    print(f"🔄 開始處理路徑映射...")
    
    for key, old_value in old_path_mapping.items():
        try:
            # 將舊的相對路徑值轉換為標準化路徑
            normalized_value = normalize_path_for_uuid_key(old_value)
            
            if normalized_value and normalized_value != old_value:
                new_path_mapping[key] = normalized_value
                updated_count += 1
                if updated_count <= 5:  # 只顯示前5個例子
                    print(f"  ✅ 更新: {key}")
                    print(f"    舊值: {old_value}")
                    print(f"    新值: {normalized_value}")
            else:
                new_path_mapping[key] = old_value
                unchanged_count += 1
                
        except Exception as e:
            print(f"❌ 處理 {key} 時發生錯誤: {e}")
            new_path_mapping[key] = old_value  # 保持原值
            error_count += 1
    
    if updated_count > 5:
        print(f"  ... 共更新了 {updated_count} 個條目")
    
    # 更新資源數據
    resources_data["path_mapping"] = new_path_mapping
    resources_data["timestamp"] = str(time.time())
    
    # 添加更新信息
    if "update_history" not in resources_data:
        resources_data["update_history"] = []
    
    resources_data["update_history"].append({
        "timestamp": resources_data["timestamp"],
        "operation": "path_mapping_normalization",
        "updated_entries": updated_count,
        "unchanged_entries": unchanged_count,
        "error_entries": error_count
    })
    
    # 保存更新後的資源文件
    print(f"💾 保存更新後的資源文件...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(resources_data, f, ensure_ascii=False, indent=2)
    
    # 統計報告
    print(f"\n📊 更新完成統計:")
    print(f"  ✅ 成功更新: {updated_count} 個條目")
    print(f"  ➡️  保持不變: {unchanged_count} 個條目") 
    print(f"  ❌ 處理錯誤: {error_count} 個條目")
    print(f"  📂 總計條目: {len(new_path_mapping)} 個")
    print(f"  💾 輸出文件: {output_file}")
    print(f"  📏 文件大小: {Path(output_file).stat().st_size:,} 字節")
    
    return True


if __name__ == "__main__":
    import sys
    
    # 檢查命令行參數
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    else:
        input_file = "input_resources_old.json"
        
    if len(sys.argv) > 2:
        output_file = sys.argv[2]
    else:
        output_file = "input_resources_updated.json"
    
    print("=" * 60)
    print("🔧 舊資源文件路徑映射更新工具")
    print("=" * 60)
    
    success = update_path_mapping(input_file, output_file)
    
    if success:
        print(f"\n🎉 路徑映射更新成功！")
        print(f"現在可以使用更新後的文件: {output_file}")
    else:
        print(f"\n❌ 路徑映射更新失敗！")
        sys.exit(1)
