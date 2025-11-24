#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
路徑映射更新工具 - 更新 input_resources.json 中的路徑映射，使其適配當前的文件結構
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
        elif next_break:
            # 對於 Lua，使用 Lua 後下一層開始的路徑
            canonical_path = "/".join(normalized_parts[i:])
            return canonical_path
            
    # 如果沒有找到特殊目錄，使用標準化的完整路徑
    return "/".join(normalized_parts)


def create_path_mapping_part(path_mapping, path_list, path_type):
    """
    創建路徑映射的一部分，與 doit.py 中的邏輯相同
    """
    for path in path_list:
        path_file = Path(path)
        filename = path_file.name
        parts = path_file.parts
        next_break = False

        for i in range(len(parts)):
            if i > 0:
                if next_break:
                    tobreak = True
                partial_path = "/".join(parts[i:])

                # 總是添加映射，但對於完全匹配優先使用第一個出現的
                if partial_path not in path_mapping:
                    path_mapping[partial_path] = path
                else:
                    # 如果有重複的部分路徑，我們仍然要保留兩者以便更好的匹配
                    existing_path = path_mapping[partial_path]
                    if existing_path != path:
                        print(f"DEBUG Multiple files with same partial path '{partial_path}': {existing_path} vs {path}")

                if parts[i] == "Lua":
                    next_break = True
                if parts[i] == "CommonResource" or parts[i] == "GameResource":
                    tobreak = True


def scan_for_available_files(input_folder="../input"):
    """
    掃描輸入文件夾中的可用文件
    """
    input_path = Path(input_folder)
    
    if not input_path.exists():
        print(f"⚠️  輸入文件夾不存在: {input_folder}")
        return set(), set(), set(), set()
    
    available_images = set()
    available_particles = set()  
    available_fonts = set()
    available_csds = set()
    
    print(f"🔍 掃描文件夾: {input_folder}")
    
    # 找所有圖像文件
    image_extensions = {".png", ".jpg", ".jpeg", ".bmp", ".tga"}
    for ext in image_extensions:
        for img_file in input_path.rglob(f"*{ext}"):
            available_images.add(str(img_file))
    
    # 找所有粒子文件
    for plist_file in input_path.rglob("*.plist"):
        available_particles.add(str(plist_file))
    
    # 找所有字體文件  
    for fnt_file in input_path.rglob("*.fnt"):
        available_fonts.add(str(fnt_file))
    
    # 找所有 CSD 文件
    for csd_file in input_path.rglob("*.csd"):
        available_csds.add(str(csd_file))
    
    print(f"  📷 圖像: {len(available_images)}")
    print(f"  ✨ 粒子: {len(available_particles)}")  
    print(f"  🔤 字體: {len(available_fonts)}")
    print(f"  📄 CSD: {len(available_csds)}")
    
    return available_images, available_particles, available_fonts, available_csds


def update_path_mapping(resources_path="input_resources.json", input_folder="../input", updated_path="input_resources_updated.json"):
    """
    更新資源文件中的路徑映射
    
    Args:
        resources_path: 要更新的資源文件路徑
        input_folder: 輸入文件夾路徑  
        updated_path: 更新後的輸出文件路徑
    """
    
    print(f"🔧 開始更新路徑映射...")
    print(f"  📁 資源文件: {resources_path}")
    print(f"  📁 輸入文件夾: {input_folder}")
    print(f"  📄 輸出文件: {updated_path}")
    
    # 載入現有資源文件
    if not Path(resources_path).exists():
        print(f"❌ 資源文件不存在: {resources_path}")
        return
    
    print(f"✅ 載入資源文件: {resources_path}")
    with open(resources_path, "r", encoding="utf-8") as f:
        resources_data = json.load(f)
    
    # 掃描當前可用文件
    available_images, available_particles, available_fonts, available_csds = scan_for_available_files(input_folder)
    
    # 創建新的路徑映射
    print(f"🗺️  重建路徑映射...")
    new_path_mapping = {}
    create_path_mapping_part(new_path_mapping, available_images, "image")
    create_path_mapping_part(new_path_mapping, available_particles, "particle")  
    create_path_mapping_part(new_path_mapping, available_fonts, "font")
    create_path_mapping_part(new_path_mapping, available_csds, "csd")
    
    print(f"  🔢 新路徑映射條目: {len(new_path_mapping)}")
    
    # 更新緩存中的路徑映射
    old_mapping_count = len(resources_data.get("path_mapping", {}))
    resources_data["path_mapping"] = new_path_mapping
    
    # 檢查並更新各種緩存中的路徑
    cache_types = ["image_cache", "particle_cache", "font_cache", "csd_cache"]
    
    for cache_type in cache_types:
        if cache_type not in resources_data:
            continue
            
        print(f"🔄 檢查 {cache_type}...")
        cache_data = resources_data[cache_type]
        updated_cache = {}
        missing_files = []
        
        for path_key, uuid_value in cache_data.items():
            # 檢查路徑鍵是否能在新的路徑映射中找到對應的實際文件
            if path_key in new_path_mapping:
                actual_file = new_path_mapping[path_key]
                if Path(actual_file).exists():
                    updated_cache[path_key] = uuid_value
                else:
                    missing_files.append(path_key)
            else:
                # 嘗試通過文件名匹配
                path_filename = Path(path_key).name
                found = False
                for mapped_path, actual_file in new_path_mapping.items():
                    if Path(mapped_path).name == path_filename and Path(actual_file).exists():
                        # 使用新的標準化路徑作為鍵
                        normalized_key = normalize_path_for_uuid_key(actual_file)
                        updated_cache[normalized_key] = uuid_value
                        found = True
                        break
                
                if not found:
                    missing_files.append(path_key)
        
        print(f"  ✅ 保留: {len(updated_cache)}")
        print(f"  ❌ 缺失: {len(missing_files)}")
        
        if missing_files:
            print(f"  🗑️  缺失的文件:")
            for missing in missing_files[:5]:  # 只顯示前5個
                print(f"    - {missing}")
            if len(missing_files) > 5:
                print(f"    ... 及其他 {len(missing_files) - 5} 個文件")
        
        resources_data[cache_type] = updated_cache
    
    # 更新時間戳
    resources_data["timestamp"] = str(time.time())
    
    # 保存更新後的文件
    print(f"💾 保存更新後的資源文件: {updated_path}")
    with open(updated_path, "w", encoding="utf-8") as f:
        json.dump(resources_data, f, indent=2, ensure_ascii=False)
    
    # 統計報告
    print(f"")
    print(f"📊 更新統計:")
    print(f"  🗺️  舊路徑映射: {old_mapping_count}")
    print(f"  🗺️  新路徑映射: {len(new_path_mapping)}")
    
    for cache_type in cache_types:
        if cache_type in resources_data:
            print(f"  📋 {cache_type}: {len(resources_data[cache_type])}")
    
    print(f"")
    print(f"✅ 路徑映射更新完成!")


if __name__ == "__main__":
    import sys
    
    # 預設參數
    resources_path = "input_resources.json"
    input_folder = "../input"
    updated_path = "input_resources_updated.json"
    
    # 從命令行參數獲取路徑 (可選)
    if len(sys.argv) > 1:
        resources_path = sys.argv[1]
    if len(sys.argv) > 2:
        input_folder = sys.argv[2]
    if len(sys.argv) > 3:
        updated_path = sys.argv[3]
    
    update_path_mapping(resources_path, input_folder, updated_path)
