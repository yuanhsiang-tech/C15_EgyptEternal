#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
獨立的 Plist 處理工具
支援讀取、解析、修改和保存 plist 檔案，特別是粒子系統配置檔案
"""

import os
import sys
import json
import base64
import gzip
import argparse
from pathlib import Path
import xml.etree.ElementTree as ET
from typing import Dict, Any, Optional, Union

class PlistProcessor:
    """Plist 檔案處理器"""
    
    def __init__(self):
        self.plist_data = {}
        self.texture_data = None
        self.texture_filename = None
    
    def load_plist(self, plist_path: str) -> Dict[str, Any]:
        """載入 plist 檔案"""
        if not os.path.exists(plist_path):
            raise FileNotFoundError(f"找不到檔案: {plist_path}")
        
        try:
            tree = ET.parse(plist_path)
            root = tree.getroot()
            
            # 解析 plist 結構
            plist_dict = root.find('dict')
            if plist_dict is None:
                raise ValueError("無效的 plist 格式")
            
            self.plist_data = self._parse_dict(plist_dict)
            
            # 提取紋理資訊
            self.texture_filename = self.plist_data.get('textureFileName', '')
            self.texture_data = self.plist_data.get('textureImageData', '')
            
            print(f"✓ 成功載入 plist: {plist_path}")
            print(f"  - 紋理檔名: {self.texture_filename}")
            print(f"  - 包含紋理數據: {'是' if self.texture_data else '否'}")
            
            return self.plist_data
            
        except ET.ParseError as e:
            raise ValueError(f"XML 解析錯誤: {e}")
        except Exception as e:
            raise Exception(f"載入 plist 失敗: {e}")
    
    def _parse_dict(self, dict_element) -> Dict[str, Any]:
        """解析 dict 元素"""
        result = {}
        children = list(dict_element)
        
        i = 0
        while i < len(children):
            if children[i].tag == 'key' and i + 1 < len(children):
                key_name = children[i].text
                value_elem = children[i + 1]
                result[key_name] = self._parse_value(value_elem)
                i += 2  # 跳過 key 和 value
            else:
                i += 1
        
        return result
    
    def _parse_value(self, value_element) -> Any:
        """解析值元素"""
        tag = value_element.tag
        text = value_element.text
        
        if tag == 'string':
            return text or ''
        elif tag == 'real':
            return float(text) if text else 0.0
        elif tag == 'integer':
            return int(text) if text else 0
        elif tag == 'true':
            return True
        elif tag == 'false':
            return False
        elif tag == 'dict':
            return self._parse_dict(value_element)
        elif tag == 'array':
            return [self._parse_value(child) for child in value_element]
        else:
            return text or ''
    
    def extract_texture(self, output_dir: str = "extracted_textures") -> Optional[str]:
        """提取紋理圖片"""
        print(f"🔍 開始提取紋理...")
        print(f"  - 紋理檔名: {self.texture_filename}")
        print(f"  - 有紋理數據: {bool(self.texture_data)}")
        print(f"  - 紋理數據長度: {len(self.texture_data) if self.texture_data else 0}")
        
        if not self.texture_data:
            print("⚠ 沒有紋理數據可提取")
            return None
        
        if not self.texture_filename:
            print("⚠ 沒有紋理檔名")
            return None
        
        try:
            # 確保輸出目錄存在
            if output_dir != ".":
                os.makedirs(output_dir, exist_ok=True)
            
            # 解碼 base64 數據
            print("🔄 解碼 base64 數據...")
            decoded_data = base64.b64decode(self.texture_data)
            print(f"✓ Base64 解碼完成，解碼後大小: {len(decoded_data)} bytes")
            
            # 檢查是否為 gzip 壓縮數據（通常以 H4sI 開頭的 base64）
            if decoded_data.startswith(b'\x1f\x8b'):
                print("🔄 檢測到 gzip 壓縮，正在解壓縮...")
                decoded_data = gzip.decompress(decoded_data)
                print(f"✓ Gzip 解壓縮完成，解壓後大小: {len(decoded_data)} bytes")
            
            # 輸出檔案路徑
            output_path = os.path.join(output_dir, self.texture_filename)
            print(f"💾 寫入檔案: {output_path}")
            
            # 寫入檔案
            with open(output_path, 'wb') as f:
                f.write(decoded_data)
            
            print(f"✅ 紋理已提取到: {output_path}")
            print(f"  - 檔案大小: {len(decoded_data)} bytes")
            
            return output_path
            
        except Exception as e:
            print(f"❌ 提取紋理失敗: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def update_property(self, key: str, value: Any) -> bool:
        """更新屬性值"""
        if key in self.plist_data:
            old_value = self.plist_data[key]
            self.plist_data[key] = value
            print(f"✓ 已更新屬性 '{key}': {old_value} → {value}")
            return True
        else:
            print(f"⚠ 屬性 '{key}' 不存在")
            return False
    
    def get_property(self, key: str, default=None) -> Any:
        """獲取屬性值"""
        return self.plist_data.get(key, default)
    
    def list_properties(self) -> None:
        """列出所有屬性"""
        print("\n=== Plist 屬性列表 ===")
        for key, value in sorted(self.plist_data.items()):
            if key == 'textureImageData':
                # 不顯示完整的 base64 數據，只顯示長度
                print(f"  {key}: [Base64 數據, 長度: {len(str(value))}]")
            else:
                print(f"  {key}: {value}")
        print(f"\n總共 {len(self.plist_data)} 個屬性")
    
    def get_particle_info(self) -> Dict[str, Any]:
        """獲取粒子系統主要資訊"""
        info = {
            '紋理檔名': self.get_property('textureFileName', 'N/A'),
            '最大粒子數': self.get_property('maxParticles', 0),
            '粒子壽命': self.get_property('particleLifespan', 0),
            '發射角度': self.get_property('angle', 0),
            '初始大小': self.get_property('startParticleSize', 0),
            '結束大小': self.get_property('finishParticleSize', 0),
            '重力X': self.get_property('gravityx', 0),
            '重力Y': self.get_property('gravityy', 0),
            '速度': self.get_property('speed', 0),
            '持續時間': self.get_property('duration', 0),
        }
        return info
    
    def print_particle_info(self) -> None:
        """顯示粒子系統資訊"""
        info = self.get_particle_info()
        print("\n=== 粒子系統資訊 ===")
        for key, value in info.items():
            print(f"  {key}: {value}")
    
    def save_plist(self, output_path: str) -> bool:
        """保存 plist 檔案"""
        try:
            # 創建 XML 結構
            plist_elem = ET.Element('plist', version='1.0')
            dict_elem = ET.SubElement(plist_elem, 'dict')
            
            # 添加所有屬性
            for key, value in sorted(self.plist_data.items()):
                key_elem = ET.SubElement(dict_elem, 'key')
                key_elem.text = key
                self._add_value_element(dict_elem, value)
            
            # 格式化 XML（添加縮排）
            self._indent_xml(plist_elem)
            
            # 確保輸出目錄存在
            os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else '.', exist_ok=True)
            
            # 轉換為字符串
            plist_str = ET.tostring(plist_elem, encoding='unicode')
            
            # 創建完整的 XML 內容
            xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
            xml_content += '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n'
            xml_content += plist_str
            
            # 寫入檔案
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(xml_content)
            
            print(f"✓ Plist 已保存到: {output_path}")
            return True
            
        except Exception as e:
            print(f"✗ 保存 plist 失敗: {e}")
            return False
    
    def _indent_xml(self, elem, level=0):
        """格式化 XML 元素，添加縮排和換行"""
        indent = "\n" + level * "\t"
        
        if len(elem):
            if not elem.text or not elem.text.strip():
                elem.text = indent + "\t"
            if not elem.tail or not elem.tail.strip():
                elem.tail = indent
                
            for child in elem:
                self._indent_xml(child, level + 1)
                
            if not child.tail or not child.tail.strip():
                child.tail = indent
        else:
            if level and (not elem.tail or not elem.tail.strip()):
                elem.tail = indent
    
    def _add_value_element(self, parent, value):
        """添加值元素到 XML"""
        if isinstance(value, str):
            elem = ET.SubElement(parent, 'string')
            elem.text = value
        elif isinstance(value, float):
            elem = ET.SubElement(parent, 'real')
            elem.text = str(value)
        elif isinstance(value, int):
            elem = ET.SubElement(parent, 'integer')
            elem.text = str(value)
        elif isinstance(value, bool):
            if value:
                ET.SubElement(parent, 'true')
            else:
                ET.SubElement(parent, 'false')
        elif isinstance(value, dict):
            dict_elem = ET.SubElement(parent, 'dict')
            for k, v in sorted(value.items()):
                key_elem = ET.SubElement(dict_elem, 'key')
                key_elem.text = k
                self._add_value_element(dict_elem, v)
        elif isinstance(value, list):
            array_elem = ET.SubElement(parent, 'array')
            for item in value:
                self._add_value_element(array_elem, item)
        else:
            # 預設作為字符串處理
            elem = ET.SubElement(parent, 'string')
            elem.text = str(value)
    
    def export_to_json(self, output_path: str) -> bool:
        """導出為 JSON 格式"""
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(self.plist_data, f, indent=2, ensure_ascii=False)
            
            print(f"✓ 已導出為 JSON: {output_path}")
            return True
            
        except Exception as e:
            print(f"✗ 導出 JSON 失敗: {e}")
            return False

def extract_plist_and_texture(plist_path: str) -> bool:
    """拖拽模式：自動提取紋理和創建新的 plist 檔案"""
    try:
        print(f"🎯 處理檔案: {plist_path}")
        
        # 創建處理器
        processor = PlistProcessor()
        
        # 載入 plist
        processor.load_plist(plist_path)
        
        # 獲取檔案路徑資訊
        file_dir = os.path.dirname(plist_path)
        file_name = os.path.splitext(os.path.basename(plist_path))[0]
        
        # 1. 提取紋理圖片
        texture_path = None
        if processor.texture_data and processor.texture_filename:
            texture_path = processor.extract_texture(".")
        
        # 2. 創建新的 plist 檔案（移除 textureImageData）
        new_plist_data = processor.plist_data.copy()
        
        # 移除嵌入的紋理數據
        if 'textureImageData' in new_plist_data:
            del new_plist_data['textureImageData']
            print("✓ 已從新 plist 中移除嵌入的紋理數據")
        
        # 更新處理器的數據
        processor.plist_data = new_plist_data
        processor.texture_data = None
        
        # 保存新的 plist 檔案
        extracted_plist_path = os.path.join(file_dir, f"extracted_{file_name}.plist")
        processor.save_plist(extracted_plist_path)
        
        # 顯示結果摘要
        print(f"\n🎉 處理完成!")
        print(f"📁 輸出檔案:")
        print(f"   • Plist: {extracted_plist_path}")
        if texture_path:
            print(f"   • 紋理: {texture_path}")
        
        # 顯示粒子系統資訊
        processor.print_particle_info()
        
        return True
        
    except Exception as e:
        print(f"✗ 處理失敗: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Plist 處理工具')
    parser.add_argument('input', help='輸入的 plist 檔案路徑')
    parser.add_argument('-o', '--output', help='輸出檔案路徑')
    parser.add_argument('-e', '--extract', help='提取紋理到指定目錄', metavar='DIR')
    parser.add_argument('-i', '--info', action='store_true', help='顯示粒子系統資訊')
    parser.add_argument('-l', '--list', action='store_true', help='列出所有屬性')
    parser.add_argument('-j', '--json', help='導出為 JSON 格式', metavar='FILE')
    parser.add_argument('--set', nargs=2, metavar=('KEY', 'VALUE'), help='設置屬性值')
    parser.add_argument('--drag', action='store_true', help='拖拽模式：自動提取紋理和創建新 plist')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.input):
        print(f"✗ 檔案不存在: {args.input}")
        return 1
    
    try:
        # 拖拽模式：自動處理
        if args.drag or (not any([args.info, args.list, args.extract, args.json, args.set, args.output])):
            # 如果沒有指定任何參數，或明確指定拖拽模式，則執行自動處理
            return 0 if extract_plist_and_texture(args.input) else 1
        
        # 命令行模式：按參數執行
        processor = PlistProcessor()
        processor.load_plist(args.input)
        
        # 顯示資訊
        if args.info:
            processor.print_particle_info()
        
        # 列出屬性
        if args.list:
            processor.list_properties()
        
        # 設置屬性
        if args.set:
            key, value = args.set
            # 嘗試轉換數值類型
            try:
                if '.' in value:
                    value = float(value)
                else:
                    value = int(value)
            except ValueError:
                if value.lower() == 'true':
                    value = True
                elif value.lower() == 'false':
                    value = False
                # 否則保持字符串
            
            processor.update_property(key, value)
        
        # 提取紋理
        if args.extract:
            processor.extract_texture(args.extract)
        
        # 導出 JSON
        if args.json:
            processor.export_to_json(args.json)
        
        # 保存修改後的 plist
        if args.output:
            processor.save_plist(args.output)
        elif args.set:
            # 如果有修改但沒指定輸出路徑，則覆蓋原檔案
            processor.save_plist(args.input)
        
        print("✓ 處理完成")
        return 0
        
    except Exception as e:
        print(f"✗ 處理失敗: {e}")
        return 1

if __name__ == '__main__':
    # 如果沒有命令行參數，顯示範例用法
    if len(sys.argv) == 1:
        print("🎯 Plist 處理工具")
        print("\n🚀 拖拽模式（推薦）:")
        print("   直接將 .plist 檔案拖拽到本工具即可自動提取！")
        print("   會產生兩個檔案：")
        print("     • extracted_原檔名.plist (移除嵌入紋理的新plist)")
        print("     • 紋理圖片.png (提取的紋理檔案)")
        print("\n📝 命令行用法:")
        print("  拖拽模式:")
        print("    python plist_tool.py your_file.plist")
        print("\n  查看粒子資訊:")
        print("    python plist_tool.py New_HR_CoinShine02L.plist -i")
        print("\n  列出所有屬性:")
        print("    python plist_tool.py New_HR_CoinShine02L.plist -l")
        print("\n  提取紋理圖片:")
        print("    python plist_tool.py New_HR_CoinShine02L.plist -e textures")
        print("\n  修改屬性:")
        print("    python plist_tool.py New_HR_CoinShine02L.plist --set maxParticles 50 -o modified.plist")
        print("\n  導出為 JSON:")
        print("    python plist_tool.py New_HR_CoinShine02L.plist -j data.json")
        print("\n使用 -h 參數查看完整說明")
        sys.exit(0)
    
    sys.exit(main())
