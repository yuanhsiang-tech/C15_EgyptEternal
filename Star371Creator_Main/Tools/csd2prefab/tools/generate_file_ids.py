#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成預定義的 fileId 池，用於 Cocos Creator Prefab 文件。
確保每個 ID 都是唯一的且符合 Cocos Creator 的格式要求。
"""

import json
import random
import string
import hashlib
from pathlib import Path

def generate_unique_file_id():
    """生成一個唯一的 18 字符 fileId，符合 Cocos Creator 格式。"""
    # 使用字母和數字的組合
    chars = string.ascii_letters + string.digits
    return ''.join(random.choice(chars) for _ in range(18))

def generate_deterministic_file_id(index):
    """基於索引生成確定性的 fileId，確保可重現但唯一。"""
    # 使用索引創建種子，生成確定性但唯一的ID
    seed_str = f"prefab_file_id_{index:06d}"
    hash_obj = hashlib.sha256(seed_str.encode())
    hex_digest = hash_obj.hexdigest()
    
    # 將 hex 轉換為字母數字字符
    chars = string.ascii_letters + string.digits
    file_id = ""
    
    # 使用hash的字節來選擇字符
    hash_bytes = hash_obj.digest()
    for i in range(18):
        char_index = hash_bytes[i % len(hash_bytes)] % len(chars)
        file_id += chars[char_index]
    
    return file_id

def generate_file_id_pool(count=1000, use_deterministic=False):
    """
    生成 fileId 池。
    
    Args:
        count (int): 要生成的 ID 數量
        use_deterministic (bool): 是否使用確定性生成（用於可重現的結果）
    
    Returns:
        list: 唯一的 fileId 列表
    """
    ids = set()
    attempts = 0
    max_attempts = count * 10  # 避免無限循環
    
    print(f"🔄 開始生成 {count} 個唯一的 fileId...")
    
    while len(ids) < count and attempts < max_attempts:
        if use_deterministic:
            new_id = generate_deterministic_file_id(attempts)
        else:
            new_id = generate_unique_file_id()
        
        ids.add(new_id)
        attempts += 1
        
        if attempts % 100 == 0:
            print(f"   已生成 {len(ids)} 個唯一ID，嘗試次數: {attempts}")
    
    if len(ids) < count:
        print(f"⚠️  只生成了 {len(ids)} 個唯一ID（目標: {count}）")
    
    return list(ids)

def create_file_id_config(output_path="file_id_pool.json", count=1000, use_deterministic=True):
    """
    創建 fileId 配置文件。
    
    Args:
        output_path (str): 輸出文件路徑
        count (int): ID 數量
        use_deterministic (bool): 是否使用確定性生成
    """
    print(f"🎯 創建 fileId 配置文件: {output_path}")
    print(f"📊 參數設置:")
    print(f"   - ID 數量: {count}")
    print(f"   - 確定性生成: {use_deterministic}")
    print("=" * 50)
    
    # 生成 ID 池
    file_ids = generate_file_id_pool(count, use_deterministic)
    
    # 創建配置結構
    config = {
        "version": "1.0.0",
        "description": "Cocos Creator Prefab fileId 池，用於確保每個 prefab 內的 fileId 唯一",
        "generation_method": "deterministic" if use_deterministic else "random",
        "total_ids": len(file_ids),
        "usage_instructions": [
            "每個 prefab 轉換時從池中按順序取用 fileId",
            "確保同一個 prefab 內的 fileId 不重複",
            "當池用完時會自動生成新的 ID"
        ],
        "file_ids": file_ids
    }
    
    # 驗證 ID 的唯一性
    unique_ids = set(file_ids)
    if len(unique_ids) != len(file_ids):
        print(f"⚠️  檢測到重複的 ID！唯一ID數量: {len(unique_ids)}, 總數量: {len(file_ids)}")
    else:
        print(f"✅ 所有 {len(file_ids)} 個 ID 都是唯一的")
    
    # 驗證 ID 格式
    valid_chars = set(string.ascii_letters + string.digits)
    invalid_ids = []
    
    for file_id in file_ids[:10]:  # 檢查前10個作為樣本
        if len(file_id) != 18:
            invalid_ids.append(f"{file_id} (長度: {len(file_id)})")
        elif not all(c in valid_chars for c in file_id):
            invalid_ids.append(f"{file_id} (含無效字符)")
    
    if invalid_ids:
        print(f"⚠️  檢測到格式無效的 ID:")
        for invalid_id in invalid_ids:
            print(f"   - {invalid_id}")
    else:
        print(f"✅ ID 格式驗證通過（樣本檢查）")
    
    # 寫入配置文件
    output_file = Path(output_path)
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
    
    print(f"✅ 配置文件已保存: {output_file}")
    print(f"📄 文件大小: {output_file.stat().st_size / 1024:.1f} KB")
    
    # 顯示樣本 ID
    print(f"\n📝 樣本 fileId (前10個):")
    for i, file_id in enumerate(file_ids[:10], 1):
        print(f"   {i:2d}. {file_id}")
    
    if len(file_ids) > 10:
        print(f"   ... 還有 {len(file_ids) - 10} 個 ID")
    
    return config

def validate_existing_config(config_path="file_id_pool.json"):
    """驗證現有的配置文件。"""
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        file_ids = config.get('file_ids', [])
        print(f"📋 驗證配置文件: {config_path}")
        print(f"   版本: {config.get('version', 'N/A')}")
        print(f"   總ID數量: {len(file_ids)}")
        print(f"   生成方法: {config.get('generation_method', 'N/A')}")
        
        # 檢查唯一性
        unique_ids = set(file_ids)
        if len(unique_ids) != len(file_ids):
            print(f"❌ ID重複問題！唯一: {len(unique_ids)}, 總數: {len(file_ids)}")
            return False
        else:
            print(f"✅ 所有ID都是唯一的")
        
        # 檢查格式
        valid_chars = set(string.ascii_letters + string.digits)
        invalid_count = 0
        
        for file_id in file_ids:
            if len(file_id) != 18 or not all(c in valid_chars for c in file_id):
                invalid_count += 1
                if invalid_count <= 5:  # 只顯示前5個無效ID
                    print(f"❌ 無效ID: {file_id}")
        
        if invalid_count > 0:
            print(f"❌ 發現 {invalid_count} 個格式無效的ID")
            return False
        else:
            print(f"✅ 所有ID格式都正確")
        
        return True
        
    except FileNotFoundError:
        print(f"❌ 配置文件不存在: {config_path}")
        return False
    except Exception as e:
        print(f"❌ 驗證配置文件時發生錯誤: {str(e)}")
        return False

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) == 1:
        # 默認生成配置
        create_file_id_config()
    elif len(sys.argv) == 2:
        if sys.argv[1] == "--validate":
            # 驗證現有配置
            validate_existing_config()
        elif sys.argv[1].startswith("--count="):
            # 指定數量
            count = int(sys.argv[1].split("=")[1])
            create_file_id_config(count=count)
        else:
            print("未知參數，使用默認設置")
            create_file_id_config()
    elif len(sys.argv) == 3:
        # 自定義輸出路徑和數量
        output_path = sys.argv[1]
        count = int(sys.argv[2])
        create_file_id_config(output_path, count)
    else:
        print("使用方法:")
        print("  python generate_file_ids.py                    # 生成默認配置 (1000個ID)")
        print("  python generate_file_ids.py --count=2000       # 生成指定數量的ID")
        print("  python generate_file_ids.py --validate         # 驗證現有配置文件")
        print("  python generate_file_ids.py output.json 1500   # 自定義輸出路徑和數量")
        sys.exit(1)