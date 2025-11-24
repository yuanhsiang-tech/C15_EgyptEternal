#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CSD Tree Viewer
解析 CSD 檔案並輸出樹狀圖代表節點間的關係
"""

import xml.etree.ElementTree as ET
import os
import sys
from typing import Dict, List, Optional, Tuple
import argparse

class CSDNode:
    """代表 CSD 中的一個節點"""
    
    def __init__(self, name: str, node_type: str, action_tag: str = "", tag: str = ""):
        self.name = name
        self.node_type = node_type
        self.action_tag = action_tag
        self.tag = tag
        self.children: List[CSDNode] = []
        self.parent: Optional[CSDNode] = None
        
    def add_child(self, child: 'CSDNode'):
        """添加子節點"""
        child.parent = self
        self.children.append(child)
        
    def get_depth(self) -> int:
        """獲取節點深度"""
        if self.parent is None:
            return 0
        return self.parent.get_depth() + 1

class CSDParser:
    """CSD 檔案解析器"""
    
    def __init__(self):
        self.root_node: Optional[CSDNode] = None
        
    def parse_file(self, file_path: str) -> CSDNode:
        """解析 CSD 檔案"""
        try:
            tree = ET.parse(file_path)
            root = tree.getroot()
            
            # 找到 ObjectData 節點
            object_data = root.find('.//ObjectData')
            if object_data is None:
                raise ValueError("找不到 ObjectData 節點")
                
            # 解析根節點
            self.root_node = self._parse_node(object_data)
            return self.root_node
            
        except ET.ParseError as e:
            print(f"XML 解析錯誤: {e}")
            raise
        except Exception as e:
            print(f"解析檔案時發生錯誤: {e}")
            raise
    
    def _parse_node(self, element: ET.Element) -> CSDNode:
        """解析單個節點"""
        # 獲取節點名稱
        name = element.get('Name', 'Unknown')
        
        # 獲取節點類型
        node_type = element.get('ctype', 'Unknown')
        
        # 獲取 ActionTag 和 Tag
        action_tag = element.get('ActionTag', '')
        tag = element.get('Tag', '')
        
        # 創建節點
        node = CSDNode(name, node_type, action_tag, tag)
        
        # 解析子節點
        children_elem = element.find('Children')
        if children_elem is not None:
            for child_elem in children_elem.findall('AbstractNodeData'):
                child_node = self._parse_node(child_elem)
                node.add_child(child_node)
                
        return node
    
    def print_tree(self, node: Optional[CSDNode] = None, prefix: str = "", is_last: bool = True):
        """以樹狀圖形式打印節點結構"""
        if node is None:
            node = self.root_node
            if node is None:
                print("沒有節點可以顯示")
                return
        
        # 打印當前節點
        connector = "└── " if is_last else "├── "
        node_info = f"{node.name} ({node.node_type})"
        if node.action_tag:
            node_info += f" [ActionTag: {node.action_tag}]"
        if node.tag:
            node_info += f" [Tag: {node.tag}]"
            
        print(f"{prefix}{connector}{node_info}")
        
        # 打印子節點
        if node.children:
            new_prefix = prefix + ("    " if is_last else "│   ")
            for i, child in enumerate(node.children):
                is_last_child = (i == len(node.children) - 1)
                self.print_tree(child, new_prefix, is_last_child)
    
    def get_node_count(self, node: Optional[CSDNode] = None) -> int:
        """獲取節點總數"""
        if node is None:
            node = self.root_node
            if node is None:
                return 0
        
        count = 1  # 當前節點
        for child in node.children:
            count += self.get_node_count(child)
        return count
    
    def find_node_by_name(self, name: str, node: Optional[CSDNode] = None) -> Optional[CSDNode]:
        """根據名稱查找節點"""
        if node is None:
            node = self.root_node
            if node is None:
                return None
        
        if node.name == name:
            return node
        
        for child in node.children:
            result = self.find_node_by_name(name, child)
            if result:
                return result
        
        return None
    
    def export_to_text(self, node: Optional[CSDNode] = None, prefix: str = "", is_last: bool = True) -> str:
        """將樹狀結構導出為文字格式"""
        if node is None:
            node = self.root_node
            if node is None:
                return "沒有節點可以顯示"
        
        result = []
        
        # 當前節點
        connector = "└── " if is_last else "├── "
        node_info = f"{node.name} ({node.node_type})"
        if node.action_tag:
            node_info += f" [ActionTag: {node.action_tag}]"
        if node.tag:
            node_info += f" [Tag: {node.tag}]"
            
        result.append(f"{prefix}{connector}{node_info}")
        
        # 子節點
        if node.children:
            new_prefix = prefix + ("    " if is_last else "│   ")
            for i, child in enumerate(node.children):
                is_last_child = (i == len(node.children) - 1)
                result.append(self.export_to_text(child, new_prefix, is_last_child))
        
        return "\n".join(result)

def main():
    """主函數"""
    import argparse
    
    parser = argparse.ArgumentParser(description='CSD 檔案樹狀圖查看器')
    parser.add_argument('file', nargs='?', help='CSD 檔案路徑 (可選，預設處理 input 資料夾)')
    parser.add_argument('-o', '--output', help='輸出檔案路徑 (可選)')
    parser.add_argument('-s', '--search', help='搜尋特定節點名稱')
    parser.add_argument('-c', '--count', action='store_true', help='顯示節點總數')
    parser.add_argument('--batch', action='store_true', help='批量處理 input 資料夾')
    
    args = parser.parse_args()
    
    # 如果沒有指定檔案且沒有 --batch 參數，預設使用批量處理
    if not args.file and not args.batch:
        args.batch = True
    
    if args.batch:
        # 批量處理模式
        process_input_folder()
    else:
        # 單檔案處理模式
        process_single_file(args)
    
def process_input_folder():
    """處理 input 資料夾中的所有 CSD 檔案"""
    import glob
    import os
    
    input_folder = "../input"
    output_folder = "../output_csd_tree"
    
    # 檢查 input 資料夾是否存在
    if not os.path.exists(input_folder):
        print(f"錯誤: input 資料夾不存在")
        sys.exit(1)
    
    # 創建輸出資料夾
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
        print(f"創建輸出資料夾: {output_folder}")
    
    # 搜尋所有 CSD 檔案
    search_pattern = os.path.join(input_folder, "**", "*.csd")
    csd_files = glob.glob(search_pattern, recursive=True)
    
    if not csd_files:
        print(f"在 {input_folder} 資料夾中沒有找到 CSD 檔案")
        return
    
    print(f"找到 {len(csd_files)} 個 CSD 檔案")
    print("=" * 50)
    
    # 處理每個檔案
    for file_path in csd_files:
        try:
            print(f"正在處理: {file_path}")
            process_single_file_to_output(file_path, output_folder)
        except Exception as e:
            print(f"處理失敗: {file_path} - {e}")
    
    print(f"\n所有檔案處理完成！結果保存在: {output_folder}")
    
def process_single_file_to_output(file_path, output_folder):
    """處理單個檔案並輸出到指定資料夾"""
    # 解析 CSD 檔案
    csd_parser = CSDParser()
    root_node = csd_parser.parse_file(file_path)
    
    # 生成輸出檔案名
    relative_path = os.path.relpath(file_path, "../input")
    base_name = os.path.splitext(relative_path)[0]
    output_file = os.path.join(output_folder, f"{base_name}.txt")
    
    # 確保輸出目錄存在
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    # 生成樹狀圖內容
    tree_text = csd_parser.export_to_text()
    
    # 寫入檔案
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(f"CSD 檔案樹狀圖: {file_path}\n")
        f.write("=" * 50 + "\n")
        f.write(f"根節點: {root_node.name} ({root_node.node_type})\n")
        f.write(f"節點總數: {csd_parser.get_node_count()}\n")
        f.write("=" * 50 + "\n")
        f.write(tree_text)
    
    print(f"  樹狀圖已保存到: {output_file}")

def process_single_file(args):
    """處理單個檔案（原有功能）"""
    # 檢查檔案是否存在
    if not os.path.exists(args.file):
        print(f"錯誤: 檔案 '{args.file}' 不存在")
        sys.exit(1)
    
    # 解析 CSD 檔案
    csd_parser = CSDParser()
    try:
        root_node = csd_parser.parse_file(args.file)
        print(f"成功解析 CSD 檔案: {args.file}")
        print(f"根節點: {root_node.name} ({root_node.node_type})")
        print()
        
        # 顯示節點總數
        if args.count:
            total_nodes = csd_parser.get_node_count()
            print(f"節點總數: {total_nodes}")
            print()
        
        # 搜尋特定節點
        if args.search:
            found_node = csd_parser.find_node_by_name(args.search)
            if found_node:
                print(f"找到節點 '{args.search}':")
                print(f"  類型: {found_node.node_type}")
                print(f"  ActionTag: {found_node.action_tag}")
                print(f"  Tag: {found_node.tag}")
                print(f"  子節點數量: {len(found_node.children)}")
                print()
            else:
                print(f"未找到名稱為 '{args.search}' 的節點")
                print()
        
        # 生成樹狀圖
        tree_text = csd_parser.export_to_text()
        
        # 輸出到檔案或控制台
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                f.write(f"CSD 檔案樹狀圖: {args.file}\n")
                f.write("=" * 50 + "\n")
                f.write(tree_text)
            print(f"樹狀圖已保存到: {args.output}")
        else:
            print("節點樹狀圖:")
            print("=" * 50)
            csd_parser.print_tree()
            
    except Exception as e:
        print(f"解析失敗: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 