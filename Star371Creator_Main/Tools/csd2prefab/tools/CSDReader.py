#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CSDReader.py - 讀取和輸出 CSD 檔案的工具
可以完整讀取 CSD 檔案並輸出，保持與原始檔案完全一致的格式
"""

import sys
import os
from xml.dom import minidom
from xml.etree import ElementTree as ET
import argparse
import re
from easing_map import apply_easing, get_easing_name
import unicodedata

class CSDReader:
    def __init__(self):
        self.encoding = 'utf-8'

    def read_csd_file(self, file_path):
        """
        讀取 CSD 檔案

        Args:
            file_path (str): CSD 檔案路徑

        Returns:
            str: 檔案內容
        """
        try:
            with open(file_path, 'r', encoding=self.encoding) as file:
                content = file.read()
            return content
        except UnicodeDecodeError:
            # 嘗試其他編碼
            try:
                with open(file_path, 'r', encoding='gbk') as file:
                    content = file.read()
                self.encoding = 'gbk'
                return content
            except UnicodeDecodeError:
                with open(file_path, 'r', encoding='latin-1') as file:
                    content = file.read()
                self.encoding = 'latin-1'
                return content
        except FileNotFoundError:
            print(f"錯誤：找不到檔案 '{file_path}'")
            return None
        except Exception as e:
            print(f"讀取檔案時發生錯誤：{e}")
            return None

    def parse_csd_xml(self, content):
        """
        解析 CSD XML 內容

        Args:
            content (str): XML 內容

        Returns:
            xml.dom.minidom.Document: 解析後的 XML 文檔
        """
        try:
            # 使用 minidom 解析，保留格式信息
            dom = minidom.parseString(content)
            return dom
        except Exception as e:
            print(f"解析 XML 時發生錯誤：{e}")
            return None

    def write_csd_file(self, content, output_path=None):
        """
        將內容寫入檔案

        Args:
            content (str): 要寫入的內容
            output_path (str, optional): 輸出檔案路徑，如果為 None 則輸出到控制台

        Returns:
            str: 輸出的內容
        """
        try:
            if output_path:
                with open(output_path, 'w', encoding=self.encoding) as file:
                    file.write(content)
                print(f"檔案已輸出到：{output_path}")
            else:
                print(content)

            return content

        except Exception as e:
            print(f"寫入檔案時發生錯誤：{e}")
            return None

    def write_analysis_file(self, analysis_result, analysis_file_path):
        """
        將分析結果寫入檔案

        Args:
            analysis_result (str): 分析結果
            analysis_file_path (str): 分析檔案路徑
        """
        try:
            with open(analysis_file_path, 'w', encoding=self.encoding) as file:
                file.write(analysis_result)
            print(f"分析結果已輸出到：{analysis_file_path}")
        except Exception as e:
            print(f"寫入分析檔案時發生錯誤：{e}")

    def analyze_animation(self, content, file_path):
        """
        分析 CSD 檔案中的動畫信息

        Args:
            content (str): CSD 檔案內容
            file_path (str): 檔案路徑

        Returns:
            str: 分析結果
        """
        analysis = []
        analysis.append(f"檔案分析：{os.path.basename(file_path)}")
        analysis.append("=" * 50)

        # 檢查是否有動畫
        duration_match = re.search(r'Animation Duration="([^"]*)"', content)
        speed_match = re.search(r'Speed="([^"]*)"', content)

        if duration_match and speed_match:
            duration = duration_match.group(1)
            speed = speed_match.group(1)
            analysis.append(f"[EMOJI] 有動畫")
            analysis.append(f"  持續時間：{duration} 幀")
            analysis.append(f"  播放速度：{speed}")

            # 檢查是否有動畫列表
            if '<AnimationList>' in content:
                analysis.append(f"[EMOJI] 有動畫列表")

                # 解析動畫列表
                animation_list_match = re.search(r'<AnimationList>(.*?)</AnimationList>', content, re.DOTALL)
                if animation_list_match:
                    animation_list_content = animation_list_match.group(1)

                    # 找到所有的 AnimationInfo
                    animation_info_matches = re.findall(r'<AnimationInfo Name="([^"]*)" StartIndex="([^"]*)" EndIndex="([^"]*)"', animation_list_content)

                    if animation_info_matches:
                        analysis.append(f"  動畫數量：{len(animation_info_matches)} 個")
                        analysis.append("")

                        for i, (name, start, end) in enumerate(animation_info_matches, 1):
                            analysis.append(f"  動畫 {i}: {name}")
                            analysis.append(f"    幀範圍：第 {start}F - 第 {end}F")
                            analysis.append("")
                    else:
                        analysis.append("  未找到動畫信息")
            else:
                analysis.append("[EMOJI] 無動畫列表")
        else:
            analysis.append("[EMOJI] 無動畫")

        analysis.append("=" * 50)
        return "\n".join(analysis)

    def enhance_animation(self, content, file_path):
        """
        增強動畫模式：延長1幀動畫並優化動畫參數

        Args:
            content (str): 原始 CSD 內容
            file_path (str): 檔案路徑

        Returns:
            str: 增強後的 CSD 內容
        """
        print(f"Processing 增強模式處理：{os.path.basename(file_path)}")

        # 檢查是否有動畫
        duration_match = re.search(r'Animation Duration="([^"]*)"', content)
        if not duration_match:
            print("ERROR 無動畫，跳過增強")
            return content

        duration = int(duration_match.group(1))

        # 1. 如果只有1幀的動畫，延長到2幀
        if duration == 0:
            print("[EMOJI] 延長1幀動畫到2幀")
            content = content.replace('Duration="0"', 'Duration="1"')

            # 找到動畫列表並延長結束幀
            if 'AnimationList' in content:
                # 延長動畫列表中的結束幀
                content = re.sub(
                    r'EndIndex="(\d+)"',
                    lambda m: f'EndIndex="{int(m.group(1)) + 1}"',
                    content
                )

        # 2. 如果有動畫列表且有動畫參數，進行參數優化
        if '<AnimationList>' in content:
            content = self.optimize_animation_parameters(content)

        print("Success 增強模式處理完成")
        return content

    def optimize_animation_parameters(self, content):
        """
        優化動畫參數：處理動畫幀參數的插值邏輯

        Args:
            content (str): CSD 內容

        Returns:
            str: 優化後的內容
        """
        # 解析動畫列表
        animation_list_match = re.search(r'<AnimationList>(.*?)</AnimationList>', content, re.DOTALL)
        if not animation_list_match:
            return content

        animation_list_content = animation_list_match.group(1)

        # 找到所有的動畫信息
        animation_info_matches = re.findall(
            r'<AnimationInfo Name="([^"]*)" StartIndex="([^"]*)" EndIndex="([^"]*)">(.*?)</AnimationInfo>',
            animation_list_content,
            re.DOTALL
        )

        if not animation_info_matches:
            return content

        # 處理每個動畫的參數優化
        optimized_content = content

        for anim_name, start_idx, end_idx, anim_content in animation_info_matches:
            start_frame = int(start_idx)
            end_frame = int(end_idx)

            print(f"Mask 優化動畫 '{anim_name}' (幀 {start_frame}-{end_frame})")

            # 找到該動畫中的所有動畫屬性（Scale、Alpha等）
            optimized_content = self.optimize_single_animation(
                optimized_content, anim_name, start_frame, end_frame
            )

        return optimized_content

    def optimize_single_animation(self, content, anim_name, start_frame, end_frame):
        """
        優化單個動畫的參數

        Args:
            content (str): 原始內容
            anim_name (str): 動畫名稱
            start_frame (int): 起始幀
            end_frame (int): 結束幀

        Returns:
            str: 優化後的內容
        """
        # 延長動畫持續時間到至少2幀
        if start_frame == end_frame:
            # 將單幀動畫延長為2幀
            pattern = f'EndIndex="{end_frame}"'
            replacement = f'EndIndex="{end_frame + 1}"'
            content = content.replace(pattern, replacement)

            print(f"  [EMOJI] 延長動畫 '{anim_name}' 從 {start_frame}-{end_frame} 到 {start_frame}-{end_frame + 1}")

        # 處理動畫參數插值
        content = self.interpolate_animation_frames(content, anim_name, start_frame, end_frame)

        # 對 Timeline 中的幀進行排序
        content = self.sort_timeline_frames(content, anim_name)

        return content

    def interpolate_animation_frames(self, content, anim_name, start_frame, end_frame):
        """
        對動畫幀進行插值處理

        Args:
            content (str): 原始內容
            anim_name (str): 動畫名稱
            start_frame (int): 起始幀
            end_frame (int): 結束幀

        Returns:
            str: 插值後的內容
        """
        # 解析動畫列表，找到所有 Timeline
        timeline_pattern = r'<Timeline ActionTag="([^"]*)" Property="([^"]*)">(.*?)</Timeline>'
        timeline_matches = re.findall(timeline_pattern, content, re.DOTALL)

        for action_tag, property_name, timeline_content in timeline_matches:
            print(f"    [EMOJI] 處理 Timeline: {property_name} (ActionTag: {action_tag})")

            # 解析這個 Timeline 中的所有幀，包括 Tween 和 EasingData 信息
            frame_data = {}
            
            # 處理 IntFrame
            int_pattern = r'<IntFrame[^>]*FrameIndex="(\d+)"[^>]*(?:Tween="([^"]*)")?[^>]*Value="([^"]*)"[^>]*>(.*?)</IntFrame>'
            int_matches = re.findall(int_pattern, timeline_content, re.DOTALL)
            for frame_idx, tween, value, frame_content in int_matches:
                tween_flag = tween != "False" if tween else True  # 默認為 True
                easing_type = self.extract_easing_type(frame_content)
                frame_data[int(frame_idx)] = (value, tween_flag, easing_type)
                print(f"      DEBUG IntFrame {frame_idx}: Value={value}, Tween={tween_flag}, Easing={easing_type}")
            
            # 處理 BoolFrame (通常是自閉合標籤)
            bool_pattern = r'<BoolFrame[^>]*FrameIndex="(\d+)"[^>]*(?:Tween="([^"]*)")?[^>]*Value="([^"]*)"[^>]*/>'
            bool_matches = re.findall(bool_pattern, timeline_content)
            for frame_idx, tween, value in bool_matches:
                tween_flag = tween != "False" if tween else True
                easing_type = 0  # BoolFrame 通常不使用 easing
                frame_data[int(frame_idx)] = (value, tween_flag, easing_type)
                print(f"      DEBUG BoolFrame {frame_idx}: Value={value}, Tween={tween_flag}")
            
            # 處理 ScaleFrame
            scale_pattern = r'<ScaleFrame[^>]*FrameIndex="(\d+)"[^>]*(?:Tween="([^"]*)")?[^>]*X="([^"]*)"[^>]*Y="([^"]*)"[^>]*>(.*?)</ScaleFrame>'
            scale_matches = re.findall(scale_pattern, timeline_content, re.DOTALL)
            for frame_idx, tween, x_value, y_value, frame_content in scale_matches:
                tween_flag = tween != "False" if tween else True
                easing_type = self.extract_easing_type(frame_content)
                frame_data[int(frame_idx)] = ((x_value, y_value), tween_flag, easing_type)
                print(f"      DEBUG ScaleFrame {frame_idx}: X={x_value}, Y={y_value}, Tween={tween_flag}, Easing={easing_type}")
            
            # 處理自閉合的 ScaleFrame
            scale_self_pattern = r'<ScaleFrame[^>]*FrameIndex="(\d+)"[^>]*(?:Tween="([^"]*)")?[^>]*X="([^"]*)"[^>]*Y="([^"]*)"[^>]*/>'
            scale_self_matches = re.findall(scale_self_pattern, timeline_content)
            for frame_idx, tween, x_value, y_value in scale_self_matches:
                if int(frame_idx) not in frame_data:  # 避免重複
                    tween_flag = tween != "False" if tween else True
                    easing_type = 0  # 自閉合標籤通常沒有 EasingData
                    frame_data[int(frame_idx)] = ((x_value, y_value), tween_flag, easing_type)
                    print(f"      DEBUG ScaleFrame (self-closing) {frame_idx}: X={x_value}, Y={y_value}, Tween={tween_flag}")

            print(f"      Stats 找到 {len(frame_data)} 個幀數據: {sorted(frame_data.keys())}")

            # 檢查動畫區間內是否有數據
            frames_in_range = [f for f in frame_data.keys() if start_frame <= f <= end_frame]

            # 檢查起始幀是否已經存在
            if start_frame in frame_data:
                print(f"      ℹ[EMOJI] 動畫 '{anim_name}' 起始幀 {start_frame} 已有數據，跳過插值")
                continue

            # 無論區間內是否有數據，都要檢查是否需要補充起始幀
            print(f"      Stats 動畫 '{anim_name}' 區間 {start_frame}-{end_frame} 內有 {len(frames_in_range)} 個幀數據")

            # 根據規則進行插值
            interpolated_value = self.calculate_interpolation(frame_data, start_frame, end_frame, property_name, content, action_tag)
            if interpolated_value is not None:
                content = self.add_interpolated_frame(content, action_tag, property_name, start_frame, interpolated_value)
                print(f"      Success 已添加插值幀 {start_frame}: {interpolated_value}")
            else:
                print(f"      WARNING 無法為動畫 '{anim_name}' 起始幀 {start_frame} 計算插值")

        return content

    def extract_easing_type(self, frame_content):
        """
        從幀內容中提取 EasingData Type

        Args:
            frame_content (str): 幀的內容

        Returns:
            int: Easing Type (默認為 0，即 Linear)
        """
        easing_match = re.search(r'<EasingData Type="(\d+)"', frame_content)
        if easing_match:
            return int(easing_match.group(1))
        return 0  # 默認為 Linear

    def calculate_interpolation(self, frame_data, target_start, target_end, property_name, content, action_tag):
        """
        計算插值值

        Args:
            frame_data (dict): 所有幀的數據 (frame_index -> (value, tween_flag, easing_type))
            target_start (int): 目標動畫起始幀
            target_end (int): 目標動畫結束幀
            property_name (str): 屬性名稱
            content (str): CSD 內容，用於查找 EasingData
            action_tag (str): ActionTag，用於定位具體的 Timeline

        Returns:
            str or tuple: 插值後的值
        """
        all_frames = sorted(frame_data.keys())

        # 找到目標起始幀之前和之後的幀（包括區間內的幀）
        before_frames = [f for f in all_frames if f < target_start]
        after_frames = [f for f in all_frames if f > target_start]  # 改為大於起始幀的所有幀
        
        print(f"        DEBUG 所有幀: {sorted(all_frames)}")
        print(f"        DEBUG 目標起始幀: {target_start}, 目標結束幀: {target_end}")
        print(f"        DEBUG 之前的幀: {before_frames}")
        print(f"        DEBUG 之後的幀: {after_frames}")

        if not before_frames and not after_frames:
            # 沒有任何參考數據，返回默認值
            print(f"        MOVED 沒有任何參考數據，使用默認值")
            if property_name.lower() == 'visibleforframe':
                return "True"  # VisibleForFrame 默認值
            else:
                return "255"  # Alpha 默認值

        if not before_frames:
            # 只有之後的幀，取最接近的之後幀
            closest_after = min(after_frames)
            frame_info = frame_data[closest_after]
            value = frame_info[0] if isinstance(frame_info, tuple) else frame_info
            print(f"        MOVED 只有之後的幀，取最接近的 {closest_after}F 值: {value}")
            return value

        if not after_frames:
            # 只有之前的幀，取最接近的之前幀
            closest_before = max(before_frames)
            frame_info = frame_data[closest_before]
            value = frame_info[0] if isinstance(frame_info, tuple) else frame_info
            print(f"        MOVED 只有之前的幀，取最接近的 {closest_before}F 值: {value}")
            return value

        # 既有之前也有之後的幀，需要進行插值計算
        closest_before = max(before_frames)
        closest_after = min(after_frames)

        before_info = frame_data[closest_before]
        after_info = frame_data[closest_after]
        
        # 解析幀信息
        if isinstance(before_info, tuple) and len(before_info) == 3:
            before_value, before_tween, before_easing = before_info
        elif isinstance(before_info, tuple) and len(before_info) == 2:
            # 可能是舊格式的數據
            before_value = before_info
            before_tween = True
            before_easing = 0
        else:
            before_value = before_info
            before_tween = True  # 默認啟用補間
            before_easing = 0    # 默認線性
            
        if isinstance(after_info, tuple) and len(after_info) == 3:
            after_value, after_tween, after_easing = after_info
        elif isinstance(after_info, tuple) and len(after_info) == 2:
            # 可能是舊格式的數據
            after_value = after_info
            after_tween = True
            after_easing = 0
        else:
            after_value = after_info
            after_tween = True
            after_easing = 0

        print(f"        MOVED 插值計算：之前 {closest_before}F={before_value} (Tween={before_tween}, Easing={before_easing})")
        print(f"        MOVED 插值計算：之後 {closest_after}F={after_value} (Tween={after_tween}, Easing={after_easing})")

        # 檢查是否禁用補間
        if not before_tween:
            print(f"        MOVED 之前幀禁用補間 (Tween=False)，直接複製值: {before_value}")
            return before_value

        # 根據屬性類型進行不同的插值計算
        if property_name.lower() == 'visibleforframe':
            # VisibleForFrame 通常不需要插值，直接使用前一個值
            print(f"        MOVED VisibleForFrame 使用之前的值: {before_value}")
            return before_value
        elif isinstance(before_value, str) and isinstance(after_value, str):
            # 數值插值 (Alpha, Position 等)
            try:
                before_val = float(before_value)
                after_val = float(after_value)
                frame_diff = closest_after - closest_before
                target_pos = target_start - closest_before

                if frame_diff > 0:
                    # 計算進度 (0.0 到 1.0)
                    progress = target_pos / frame_diff
                    
                    # 使用 easing 函數進行插值
                    easing_name = get_easing_name(before_easing)
                    interpolated = apply_easing(before_val, after_val, progress, before_easing)
                    result = str(int(round(interpolated)))
                    
                    print(f"        MOVED {easing_name} 插值計算: {before_val} -> {after_val}, 進度={progress:.3f}, 結果={result}")
                    return result
            except ValueError:
                print(f"        WARNING 插值計算失敗，使用之前的值: {before_value}")
                pass
        elif isinstance(before_value, tuple) and isinstance(after_value, tuple):
            # Scale 值插值 (X, Y)
            try:
                before_x, before_y = float(before_value[0]), float(before_value[1])
                after_x, after_y = float(after_value[0]), float(after_value[1])
                frame_diff = closest_after - closest_before
                target_pos = target_start - closest_before

                if frame_diff > 0:
                    progress = target_pos / frame_diff
                    
                    # 對 X 和 Y 分別進行 easing 插值
                    easing_name = get_easing_name(before_easing)
                    interpolated_x = apply_easing(before_x, after_x, progress, before_easing)
                    interpolated_y = apply_easing(before_y, after_y, progress, before_easing)
                    
                    result = (f"{interpolated_x:.4f}", f"{interpolated_y:.4f}")
                    print(f"        MOVED {easing_name} Scale插值: ({before_x},{before_y}) -> ({after_x},{after_y}), 進度={progress:.3f}, 結果={result}")
                    return result
            except ValueError:
                print(f"        WARNING Scale插值計算失敗，使用之前的值: {before_value}")
                pass

        # 如果無法插值，取之前的幀值
        value = before_value if isinstance(before_value, (str, tuple)) else before_info[0]
        print(f"        MOVED 無法插值，使用之前的值: {value}")
        return value

    def add_interpolated_frame(self, content, action_tag, property_name, frame_index, value):
        """
        添加插值幀到 Timeline 中

        Args:
            content (str): 原始內容
            action_tag (str): ActionTag
            property_name (str): 屬性名稱
            frame_index (int): 幀索引
            value: 幀值

        Returns:
            str: 添加插值幀後的內容
        """
        # 找到對應的 Timeline
        timeline_pattern = f'<Timeline ActionTag="{action_tag}" Property="{property_name}">(.*?)</Timeline>'
        timeline_match = re.search(timeline_pattern, content, re.DOTALL)

        if timeline_match:
            timeline_content = timeline_match.group(1)

            # 檢查是否已經存在相同的幀索引
            frame_check_pattern = f'FrameIndex="{frame_index}"'
            if re.search(frame_check_pattern, timeline_content):
                print(f"      ℹ[EMOJI] 幀 {frame_index} 已存在，跳過添加")
                return content

            # 生成新的幀標籤
            if property_name.lower() == 'alpha':
                frame_tag = f'          <IntFrame FrameIndex="{frame_index}" Value="{value}">\n            <EasingData Type="0" />\n          </IntFrame>'
            elif property_name.lower() == 'scale' and isinstance(value, tuple):
                frame_tag = f'          <ScaleFrame FrameIndex="{frame_index}" X="{value[0]}" Y="{value[1]}">\n            <EasingData Type="0" />\n          </ScaleFrame>'
            elif property_name.lower() == 'visibleforframe':
                frame_tag = f'          <BoolFrame FrameIndex="{frame_index}" Tween="False" Value="{value}" />'
            else:
                return content

            # 在 Timeline 內容的結尾添加新幀
            new_timeline_content = timeline_content.rstrip() + '\n' + frame_tag + '\n        '

            # 替換原始的 Timeline 內容
            old_timeline = timeline_match.group(0)
            new_timeline = old_timeline.replace(timeline_content, new_timeline_content)
            content = content.replace(old_timeline, new_timeline)

        return content

    def sort_timeline_frames(self, content, anim_name):
        """
        對 Timeline 中的幀按照 FrameIndex 進行排序

        Args:
            content (str): 原始內容
            anim_name (str): 動畫名稱

        Returns:
            str: 排序後的內容
        """
        # 解析動畫列表，找到所有 Timeline
        timeline_pattern = r'<Timeline ActionTag="([^"]*)" Property="([^"]*)">(.*?)</Timeline>'
        timeline_matches = re.findall(timeline_pattern, content, re.DOTALL)

        for action_tag, property_name, timeline_content in timeline_matches:
            print(f"    Processing 排序 Timeline: {property_name} (ActionTag: {action_tag})")

            # 解析這個 Timeline 中的所有幀 - 支持自閉合和非自閉合標籤
            frame_pattern = r'(<(?:IntFrame|ScaleFrame|BoolFrame)[^>]*FrameIndex="(\d+)"[^>]*(?:Value="([^"]*)"|X="([^"]*)" Y="([^"]*)")?[^>]*?(?:/>|>.*?</(?:IntFrame|ScaleFrame|BoolFrame)>))'
            frames = re.findall(frame_pattern, timeline_content, re.DOTALL)

            # 調試：顯示找到的幀
            print(f"      DEBUG 找到 {len(frames)} 個幀匹配")
            for i, frame_match in enumerate(frames[:3]):  # 只顯示前3個
                print(f"        匹配 {i+1}: {frame_match[0][:50]}...")

            if len(frames) <= 1:
                # 只有一個幀或沒有幀，不需要排序
                continue

            # 將幀按照 FrameIndex 排序
            sorted_frames = []
            for frame_match in frames:
                full_frame = frame_match[0]
                frame_index = int(frame_match[1])
                sorted_frames.append((frame_index, full_frame))

            sorted_frames.sort(key=lambda x: x[0])

            # 提取排序後的幀內容 - 保持原始格式
            sorted_frame_contents = []
            for frame_index, full_frame in sorted_frames:
                # 直接使用完整的幀標籤，保持原始縮排
                sorted_frame_contents.append(f"          {full_frame}")

            # 重新構建 Timeline 內容
            if sorted_frame_contents:
                # 構造新的 Timeline 內容
                new_timeline_inner = '\n'.join(sorted_frame_contents)

                # 調試輸出
                print(f"      [EMOJI] 重建 Timeline 內容 ({len(sorted_frame_contents)} 個幀)")
                for i, (frame_index, full_frame) in enumerate(sorted_frames[:3]):  # 只顯示前3個幀
                    print(f"        幀 {i+1} (Index {frame_index}): {full_frame[:50]}...")
                if len(sorted_frames) > 3:
                    print(f"        ... 還有 {len(sorted_frames) - 3} 個幀")

                # 替換原始 Timeline - 使用更精確的方法
                timeline_pattern = f'<Timeline ActionTag="{re.escape(action_tag)}" Property="{re.escape(property_name)}">(.*?)</Timeline>'
                timeline_match = re.search(timeline_pattern, content, re.DOTALL)

                if timeline_match:
                    full_timeline = timeline_match.group(0)
                    
                    # 構造新的 Timeline
                    new_timeline = f'<Timeline ActionTag="{action_tag}" Property="{property_name}">\n{new_timeline_inner}\n        </Timeline>'

                    # 執行替換
                    content = content.replace(full_timeline, new_timeline)
                    print(f"      Success 已排序 {len(sorted_frames)} 個幀 - 替換成功")
                else:
                    print(f"      ERROR 替換失敗 - 找不到 Timeline")
                    print(f"      ActionTag: {action_tag}")
                    print(f"      Property: {property_name}")

        return content

    def process_file(self, input_path, output_path=None, analysis_file=None, enhanced_mode=False):
        """
        處理單個 CSD 檔案

        Args:
            input_path (str): 輸入檔案路徑
            output_path (str, optional): 輸出檔案路徑
            analysis_file (str, optional): 分析結果輸出檔案路徑
        """
        print(f"處理檔案：{input_path}")

        # 讀取檔案
        content = self.read_csd_file(input_path)
        if content is None:
            return {"success": False, "error": "Failed to read CSD file"}

        # 清理節點名稱中的特殊符號 (防止引擎 crash)
        print("清理節點名稱中的特殊符號...")
        content = self.sanitize_csd_content(content)

        # 如果需要分析動畫
        if analysis_file:
            analysis_result = self.analyze_animation(content, input_path)
            self.write_analysis_file(analysis_result, analysis_file)

        # 如果啟用增強模式，先處理增強邏輯
        if enhanced_mode and content:
            content = self.enhance_animation(content, input_path)

        # 如果只需要輸出原始內容（用於驗證，且沒有分析任務）
        if output_path is None and not analysis_file:
            if enhanced_mode:
                print("增強後的檔案內容：")
            else:
                print("原始檔案內容：")
            print(content)
            return {"success": True, "output_path": None}

        # 寫入檔案（保持原始格式）
        result = self.write_csd_file(content, output_path)

        # 驗證輸出
        if result:
            self.verify_output(content, result)
            
        # 返回處理成功狀態
        return {"success": True, "output_path": output_path}

    def sanitize_node_name(self, name):
        """
        清理節點名稱，移除會導致引擎 crash 的特殊符號
        
        處理規則：
        1. "'~`?<&*+-[{(【" 或任何全形符號 → 直接刪除
        2. "]})】>" → 替換為 "_"
        3. "空格,." → 替換為 "_"
        
        Args:
            name (str): 原始節點名稱
            
        Returns:
            str: 清理後的節點名稱
        """
        if not name:
            return name

        # 下中斷用 判斷有沒有 大括號在裡面
        if '】' in name:
            print(f"  清理節點名稱: '{name}' 包含 】")
        
        # 第1步：替換指定符號為底線
        replace_to_underscore = ']})>'
        for char in replace_to_underscore:
            name = name.replace(char, '_')

        replace_to_underscore = '】'
        for char in replace_to_underscore:
            name = name.replace(char, '_')
        
        replace_to_underscore = ' ,.'
        for char in replace_to_underscore:
            name = name.replace(char, '_')

        # 第2步：刪除指定的特殊符號和全形符號
        # 定義要刪除的字符 (包括全形字符範圍)
        
        # 刪除指定字符 (注意: 不刪除 & 符號，因為它可能是 XML 實體的一部分，如 &#xA;)
        delete_chars = "'~`?<*+-[{("
        for char in delete_chars:
            name = name.replace(char, '')
        
        delete_chars = "【"
        for char in delete_chars:
            name = name.replace(char, '')
            
        # 刪除其他全形符號 (Unicode範圍 U+FF00-U+FFEF)
        cleaned_name = ''
        for char in name:
            # 檢查是否為全形字符
            if '\uff00' <= char <= '\uffef':
                # 如果是全形字符且不在替換列表中，則跳過(刪除)
                if char not in ']})>':
                    continue
            cleaned_name += char
        name = cleaned_name

        
        return name
    
    def sanitize_csd_content(self, content):
        """
        清理 CSD 內容中的節點名稱
        
        Args:
            content (str): 原始 CSD 內容
            
        Returns:
            str: 清理後的 CSD 內容
        """
        
        # 找到所有 AbstractNodeData 的 Name 屬性
        def replace_name_attr(match):
            full_match = match.group(0)
            name_value = match.group(1)
            sanitized_name = self.sanitize_node_name(name_value)
            if name_value != sanitized_name:
                print(f"  清理節點名稱: '{name_value}' -> '{sanitized_name}'")
            return full_match.replace(f'Name="{name_value}"', f'Name="{sanitized_name}"')

        # 使用正則表達式匹配和替換節點名稱
        # 匹配 Name="..." 屬性
        name_pattern = r'<AbstractNodeData[^>]*Name="([^"]*)"[^>]*'
        new_content = re.sub(name_pattern, replace_name_attr, content)
        
        return new_content

    def verify_output(self, original, output):
        """
        驗證輸出是否與原始檔案一致

        Args:
            original (str): 原始內容
            output (str): 輸出內容
        """
        print("\n=== 驗證結果 ===")

        # 移除空白和換行符進行比較
        original_clean = self._clean_for_comparison(original)
        output_clean = self._clean_for_comparison(output)

        if original_clean == output_clean:
            print("[EMOJI] 輸出與原始檔案完全一致")
        else:
            print("[EMOJI] 輸出與原始檔案不一致")

            # 顯示差異
            print(f"原始長度：{len(original)}")
            print(f"輸出長度：{len(output)}")
            print(f"原始清理後長度：{len(original_clean)}")
            print(f"輸出清理後長度：{len(output_clean)}")

    def _clean_for_comparison(self, content):
        """
        清理內容以進行比較（移除空白和註釋）

        Args:
            content (str): 要清理的內容

        Returns:
            str: 清理後的內容
        """
        # 移除 XML 註釋
        content = re.sub(r'<!--.*?-->', '', content, flags=re.DOTALL)

        # 移除多餘的空白和換行
        lines = content.split('\n')
        cleaned_lines = []

        for line in lines:
            stripped = line.strip()
            if stripped:  # 只保留非空行
                # 移除標籤間的多餘空白
                stripped = re.sub(r'>\s+<', '><', stripped)
                cleaned_lines.append(stripped)

        return ''.join(cleaned_lines)

    def batch_process(self, input_dir, output_dir=None, recursive=True, analysis_file=None, enhanced_mode=False):
        """
        批次處理目錄中的所有 CSD 檔案

        Args:
            input_dir (str): 輸入目錄
            output_dir (str, optional): 輸出目錄
            recursive (bool): 是否遞歸處理子目錄
        """
        if not os.path.exists(input_dir):
            print(f"輸入目錄不存在：{input_dir}")
            return

        csd_files = []

        if recursive:
            for root, dirs, files in os.walk(input_dir):
                for file in files:
                    if file.lower().endswith('.csd'):
                        csd_files.append(os.path.join(root, file))
        else:
            for file in os.listdir(input_dir):
                if file.lower().endswith('.csd'):
                    csd_files.append(os.path.join(input_dir, file))

        if not csd_files:
            print(f"在 {input_dir} 中找不到 CSD 檔案")
            return

        print(f"找到 {len(csd_files)} 個 CSD 檔案")

        all_analysis_results = []

        for csd_file in csd_files:
            try:
                if output_dir:
                    # 構造輸出路徑
                    rel_path = os.path.relpath(csd_file, input_dir)
                    output_file_path = os.path.join(output_dir, rel_path)

                    # 確保輸出目錄存在
                    os.makedirs(os.path.dirname(output_file_path), exist_ok=True)

                    self.process_file(csd_file, output_file_path, analysis_file, enhanced_mode)
                else:
                    self.process_file(csd_file, analysis_file=analysis_file, enhanced_mode=enhanced_mode)

                # 如果需要分析，收集分析結果
                if analysis_file:
                    content = self.read_csd_file(csd_file)
                    if content:
                        analysis_result = self.analyze_animation(content, csd_file)
                        all_analysis_results.append(analysis_result)

            except Exception as e:
                print(f"處理檔案 {csd_file} 時發生錯誤：{e}")

        # 如果有分析結果且是批次處理，寫入總分析檔案
        if analysis_file and all_analysis_results:
            combined_analysis = "\n\n".join(all_analysis_results)
            self.write_analysis_file(combined_analysis, analysis_file)

def main():
    parser = argparse.ArgumentParser(description='CSD 檔案讀取和輸出工具')
    parser.add_argument('input', help='輸入的 CSD 檔案或目錄路徑')
    parser.add_argument('-o', '--output', help='輸出檔案或目錄路徑')
    parser.add_argument('-r', '--recursive', action='store_true', help='遞歸處理子目錄')
    parser.add_argument('-v', '--verify', action='store_true', help='只驗證不輸出')
    parser.add_argument('-a', '--analyze', help='分析動畫並輸出到指定檔案')
    parser.add_argument('-e', '--enhanced', action='store_true', help='啟用增強模式：自動延長1幀動畫並優化動畫參數')

    args = parser.parse_args()

    reader = CSDReader()

    input_path = args.input

    if os.path.isfile(input_path):
        # 處理單個檔案
        if args.verify:
            reader.process_file(input_path, enhanced_mode=args.enhanced)
        else:
            reader.process_file(input_path, args.output, args.analyze, args.enhanced)

    elif os.path.isdir(input_path):
        # 處理目錄
        if args.verify:
            reader.batch_process(input_path, recursive=args.recursive, analysis_file=args.analyze, enhanced_mode=args.enhanced)
        else:
            reader.batch_process(input_path, args.output, args.recursive, args.analyze, args.enhanced)

    else:
        print(f"輸入路徑不存在：{input_path}")

if __name__ == "__main__":
    main()