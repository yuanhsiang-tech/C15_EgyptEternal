#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
資源合併工具 - 將 output_resources.json 與 input_resources.json 合併成新的 input_resources.json
"""

import json
import time
from pathlib import Path


def merge_resources(output_resources_path="output_resources.json", input_resources_path="input_resources_backup.json", merged_output_path="input_merged.json"):
    """
    合併兩個資源文件
    
    Args:
        output_resources_path: 新生成的資源文件路徑
        input_resources_path: 原有的資源文件路徑  
        merged_output_path: 合併後的輸出文件路徑
    """
    
    print(f"🔄 開始合併資源文件...")
    print(f"  📁 輸入文件1: {output_resources_path}")
    print(f"  📁 輸入文件2: {input_resources_path}")  
    print(f"  📄 輸出文件: {merged_output_path}")
    
    # 載入 output_resources.json (新資源)
    output_data = {}
    if Path(output_resources_path).exists():
        print(f"✅ 載入新資源文件: {output_resources_path}")
        with open(output_resources_path, "r", encoding="utf-8") as f:
            output_data = json.load(f)
    else:
        print(f"⚠️  新資源文件不存在: {output_resources_path}")
    
    # 載入 input_resources.json (舊資源)  
    input_data = {}
    if Path(input_resources_path).exists():
        print(f"✅ 載入舊資源文件: {input_resources_path}")
        with open(input_resources_path, "r", encoding="utf-8") as f:
            input_data = json.load(f)
    else:
        print(f"⚠️  舊資源文件不存在: {input_resources_path}")
    
    # 創建合併後的資料結構
    merged_data = {
        "version": "1.0",
        "timestamp": str(time.time()),
        "image_cache": {},
        "particle_cache": {},
        "font_cache": {},
        "csd_cache": {},
        "path_mapping": {}
    }
    
    # 合併各種緩存 - 新資源優先
    cache_types = ["image_cache", "particle_cache", "font_cache", "csd_cache", "path_mapping"]
    
    for cache_type in cache_types:
        print(f"📝 合併 {cache_type}...")
        
        # 先添加舊資源
        if cache_type in input_data:
            merged_data[cache_type].update(input_data[cache_type])
            old_count = len(input_data[cache_type])
        else:
            old_count = 0
        
        # 再添加新資源 (覆蓋重複的項目)
        if cache_type in output_data:
            merged_data[cache_type].update(output_data[cache_type])
            new_count = len(output_data[cache_type])
        else:
            new_count = 0
            
        merged_count = len(merged_data[cache_type])
        print(f"  🔢 舊: {old_count}, 新: {new_count}, 合併後: {merged_count}")
    
    # 保存合併結果
    print(f"💾 保存合併結果到: {merged_output_path}")
    with open(merged_output_path, "w", encoding="utf-8") as f:
        json.dump(merged_data, f, indent=2, ensure_ascii=False)
    
    # 統計報告
    total_old = sum(len(input_data.get(cache_type, {})) for cache_type in cache_types)
    total_new = sum(len(output_data.get(cache_type, {})) for cache_type in cache_types)  
    total_merged = sum(len(merged_data[cache_type]) for cache_type in cache_types)
    
    print(f"")
    print(f"📊 合併統計:")
    print(f"  🗂️  舊資源總數: {total_old}")
    print(f"  🆕 新資源總數: {total_new}")
    print(f"  📋 合併後總數: {total_merged}")
    print(f"  🔄 重複項目: {total_old + total_new - total_merged}")
    print(f"")
    print(f"✅ 資源合併完成!")


if __name__ == "__main__":
    import sys
    
    # 預設參數
    output_path = "output_resources.json"
    input_path = "input_resources_backup.json" 
    merged_path = "input_merged.json"
    
    # 從命令行參數獲取路徑 (可選)
    if len(sys.argv) > 1:
        output_path = sys.argv[1]
    if len(sys.argv) > 2:
        input_path = sys.argv[2]
    if len(sys.argv) > 3:
        merged_path = sys.argv[3]
    
    merge_resources(output_path, input_path, merged_path)
