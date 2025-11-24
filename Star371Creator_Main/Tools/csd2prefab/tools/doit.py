import xmltodict
import json
import sys
import uuid
import random
import string
import os
import shutil
import re
import math
import traceback
import base64
import gzip
import plistlib
from pathlib import Path
from copy import deepcopy
from PIL import Image
import io
from CSDReader import CSDReader

INPUT_FOLDER = "../input"
OUTPUT_FOLDER = "../output"
OUTPUT_ANYWAY = True
OUTPUT_RESOURCES_JSON = "output_resources.json"
INPUT_RESOURCES_JSON = "input_resources.json"
USE_INPUT_RESOURCES_JSON = True
DO_OUTPUT_RESOURCES_JSON = True


class UUIDManager:
    """全域UUID管理器，確保所有UUID的唯一性"""

    def __init__(self):
        self.used_uuids = set()  # 所有已使用的UUID
        self.max_retry_attempts = 100  # 最大重試次數

    def register_existing_uuid(self, uuid_str):
        """註冊已存在的UUID（從resource.json載入等）"""
        if uuid_str:
            # 處理sprite frame格式的UUID (uuid@f9941)
            base_uuid = uuid_str.split("@")[0]
            self.used_uuids.add(base_uuid)
            self.used_uuids.add(uuid_str)  # 也加入完整的UUID

    def generate_unique_uuid(self, uuid_type="base"):
        """產生唯一的UUID，確保不與已存在的重複"""
        import uuid

        for attempt in range(self.max_retry_attempts):
            new_uuid = str(uuid.uuid4())

            # 根據類型添加後綴
            if uuid_type == "sprite_frame":
                full_uuid = f"{new_uuid}@f9941"
            else:
                full_uuid = new_uuid

            # 檢查是否重複
            if new_uuid not in self.used_uuids and full_uuid not in self.used_uuids:
                self.used_uuids.add(new_uuid)
                self.used_uuids.add(full_uuid)
                return full_uuid

            print(
                f"WARNING  UUID collision detected (attempt {attempt + 1}), regenerating..."
            )

        raise RuntimeError(
            f"Unable to generate unique UUID after {self.max_retry_attempts} attempts"
        )

    def is_uuid_used(self, uuid_str):
        """檢查UUID是否已被使用"""
        if not uuid_str:
            return False
        base_uuid = uuid_str.split("@")[0]
        return base_uuid in self.used_uuids or uuid_str in self.used_uuids

    def get_usage_stats(self):
        """獲取使用統計"""
        return {
            "total_uuids": len(self.used_uuids),
            "unique_base_uuids": len([u for u in self.used_uuids if "@" not in u]),
        }


class ImageResourceManager:
    """
    Manages image resources and handles path mapping for sprite frames.
    Ignores plist files and uses individual images directly.
    Enhanced with resource copying, validation, and trim calculation functionality.
    Now also handles particle system files (.plist).
    """

    def __init__(self, uuid_manager=None):
        self.uuid_manager = uuid_manager or UUIDManager()  # UUID管理器實例
        self.image_cache = {}  # Cache for image path -> UUID mapping
        self.available_images = set()  # Set of available image files
        self.path_mapping = {}  # Mapping from CSD paths to actual file paths
        self.used_images = set()  # Track which images are actually used
        self.copied_images = {}  # Track copied images: source -> destination
        self.trim_info_cache = {}  # Cache for image path -> trim information
        self.scale9_info_cache = {}  # Cache for image path -> scale9 information
        # Particle system support
        self.particle_cache = {}  # Cache for particle plist path -> UUID mapping
        self.available_particles = set()  # Set of available particle files
        self.used_particles = set()  # Track which particles are actually used
        self.copied_particles = {}  # Track copied particles: source -> destination
        # Font support
        self.font_cache = {}  # Cache for font path -> UUID mapping
        self.available_fonts = set()  # Set of available font files (.fnt)
        self.used_fonts = set()  # Track which fonts are actually used
        self.copied_fonts = {}  # Track copied fonts: source -> destination
        # CSD/Prefab support
        self.csd_cache = {}  # Cache for CSD path -> prefab UUID mapping
        self.available_csds = set()  # Set of available CSD files
        self.used_csds = set()  # Track which CSDs are actually used
        self.copied_prefabs = {}  # Track copied prefabs: source -> destination
        # Not found files tracking
        self.not_found_files = set()  # Track all files that couldn't be found
        # Moved images tracking - images that have been moved to font/particle directories
        self.moved_images = (
            set()
        )  # Track images that have been moved to avoid duplicating in Img/

    def scan_for_images(self, input_folder=INPUT_FOLDER):
        """Scan the input folder for available image files, particle files, font files, and CSD files."""
        input_path = Path(input_folder)

        # 先載入現有的 resources.json 快取（如果存在）
        if USE_INPUT_RESOURCES_JSON:
            self.load_resources_from_json(INPUT_RESOURCES_JSON)

        # 然後正常執行原本的掃描流程
        print(f"DEBUG Scanning for resources in: {input_folder}")
        if not input_path.exists():
            print(f"WARNING  Input folder does not exist: {input_folder}")
            return

        # Find all image files (only in input directories - whitelist mode)
        image_extensions = {".png", ".jpg", ".jpeg", ".bmp", ".tga"}
        for ext in image_extensions:
            for img_file in input_path.rglob(f"*{ext}"):
                # Only include files in input directories (whitelist mode)  
                if not self._is_input_path(str(img_file)):
                    continue
                self.available_images.add(str(img_file))

        # Find all particle files (only in input directories, exclude texture atlas plists)
        texture_atlas_count = 0
        particle_count = 0
        output_skipped_count = 0
        for plist_file in input_path.rglob("*.plist"):
            # Only include files in input directories (whitelist mode)
            if not self._is_input_path(str(plist_file)):
                output_skipped_count += 1
                continue
                
            if self.is_texture_atlas_plist(str(plist_file)):
                texture_atlas_count += 1
                print(f"Skip Texture atlas plist: {plist_file.name}")
            else:
                self.available_particles.add(str(plist_file))
                particle_count += 1
                print(f"Particle Particle plist: {plist_file.name}")
        
        if output_skipped_count > 0:
            print(f"Skip Skipped {output_skipped_count} particle files outside input directories")

        print(
            f"Processing Found {particle_count} particle plists, {texture_atlas_count} texture atlas plists (excluded)"
        )

        # Find all font files (.fnt, only in input directories)
        font_output_skipped = 0
        for font_file in input_path.rglob("*.fnt"):
            # Only include files in input directories (whitelist mode)
            if not self._is_input_path(str(font_file)):
                font_output_skipped += 1
                continue
            self.available_fonts.add(str(font_file))
            
        if font_output_skipped > 0:
            print(f"Skip Skipped {font_output_skipped} font files outside input directories")

        # Find all CSD files (only in input directories)
        csd_count = 0
        csd_output_skipped = 0
        for csd_file in input_path.rglob("*.csd"):
            # Only include files in input directories (whitelist mode)
            if not self._is_input_path(str(csd_file)):
                csd_output_skipped += 1
                continue
            self.available_csds.add(str(csd_file))
            csd_count += 1
            
        if csd_output_skipped > 0:
            print(f"Skip Skipped {csd_output_skipped} CSD files outside input directories")

        print(f"CSD Found {csd_count} CSD files")

        # Create simplified path mapping for partial matching
        self.create_path_mapping()

        print("Done scanning for resources")

    def _filter_input_paths(self, cache_dict):
        """
        只保留輸入目錄範圍內的緩存條目（白名單模式）
        
        Args:
            cache_dict: 原始緩存字典 {路徑 -> UUID}
            
        Returns:
            dict: 過濾後的緩存字典
        """
        if not cache_dict:
            return {}
            
        filtered_cache = {}
        filtered_count = 0
        
        for path, uuid in cache_dict.items():
            # 檢查路徑是否在允許的輸入目錄範圍內
            if self._is_input_path(path):
                filtered_cache[path] = uuid
            else:
                filtered_count += 1
                print(f"Skip Filtered non-input path from cache: {path}")
                
        if filtered_count > 0:
            print(f"WARNING Filtered {filtered_count} non-input directory entries from cache")
            
        return filtered_cache

    def _is_input_path(self, file_path):
        """
        檢查文件路徑是否在輸入目錄範圍內（白名單模式）
        
        Args:
            file_path: 要檢查的文件路徑
            
        Returns:
            bool: 如果是有效輸入路徑則返回True
        """
        try:
            # 標準化路徑
            path_str = str(file_path).replace("\\", "/")
            
            # 檢查是否為根目錄下的檔案（沒有目錄分隔符）
            if "/" not in path_str:
                return True
            
            # 檢查是否在允許的輸入目錄範圍內
            valid_input_patterns = [
                "../input/",        # 相對於 tools 目錄的 input 路徑
                "./input/",         # 當前目錄的 input 路徑
                "input/",           # 直接的 input 路徑
                "CommonResource/",  # 標準化後的資源路徑
                "GameResource/",    # 標準化後的資源路徑
                "LuaResource/",     # 標準化後的資源路徑
                "ProfileResource/", # 標準化後的資源路徑
                "WuShiResource/",   # 標準化後的資源路徑
                "TManMJResource/",   # 標準化後的資源路徑
                "CrossCommonResource/",   # 標準化後的資源路徑
                "LuaDefine/",   # 標準化後的資源路徑
                "Lua/",             # Lua 目錄路徑
            ]

            # 檢查是否以任何有效的輸入模式開頭
            for pattern in valid_input_patterns:
                if path_str.startswith(pattern):
                    return True
            
            return False
            
        except Exception:
            # 如果路徑處理出錯，為了安全起見返回False
            return False

    def _filter_input_paths_mapping(self, mapping_dict):
        """
        只保留輸入目錄範圍內的路徑映射條目（白名單模式）
        
        Args:
            mapping_dict: 原始路徑映射字典 {路徑鍵 -> 路徑值}
            
        Returns:
            dict: 過濾後的路徑映射字典
        """
        if not mapping_dict:
            return {}
            
        filtered_mapping = {}
        filtered_count = 0
        
        for key, value in mapping_dict.items():
            # 檢查鍵和值是否都在允許的輸入目錄範圍內
            key_is_input = self._is_input_path(key)
            value_is_input = self._is_input_path(value)
            
            if key_is_input and value_is_input:
                filtered_mapping[key] = value
            else:
                filtered_count += 1
                print(f"Skip Filtered non-input path mapping: {key} -> {value}")
        
        if filtered_count > 0:
            print(f"WARNING Filtered {filtered_count} non-input directory entries from path mapping")
            
        return filtered_mapping

    def create_path_mapping_part(self, path_mapping, path_list, path_type):
        for path in path_list:
            path_file = Path(path)
            filename = path_file.name
            parts = path_file.parts
            
            # 取得標準化路徑作為統一的目標值（1 in N-to-1）
            normalized_target = self.normalize_path_for_uuid_key(path)
            if not normalized_target:
                continue
            
            # 創建多種路徑表示方式，全部指向同一個標準化目標（N in N-to-1）
            path_variants = set()
            
            # 1. 原始路徑
            path_variants.add(str(path).replace("\\", "/"))
            
            # 2. 標準化路徑本身
            path_variants.add(normalized_target)
            
            # 3. 部分路徑邏輯 - 從不同層級開始的路徑
            next_break = False
            tobreak = False
            for i in range(len(parts)):
                if tobreak:
                    break
                if next_break:
                    tobreak = True
                partial_path = "/".join(parts[i:])
                path_variants.add(partial_path)

                if parts[i] == "Lua":
                    next_break = True
                if parts[i] == "CommonResource" or parts[i] == "GameResource":
                    tobreak = True
            
            # 將所有路徑變體都映射到標準化目標
            for variant in path_variants:
                if variant not in path_mapping:
                    path_mapping[variant] = normalized_target
                elif path_mapping[variant] != normalized_target:
                    existing_target = path_mapping[variant]
                    print(f"DEBUG Conflicting path mapping '{variant}': {existing_target} vs {normalized_target}")

    def create_path_mapping(self):
        """Create mapping from CSD paths to actual available files."""
        self.create_path_mapping_part(self.path_mapping, self.available_images, "image")
        self.create_path_mapping_part(
            self.path_mapping, self.available_particles, "particle"
        )
        self.create_path_mapping_part(self.path_mapping, self.available_fonts, "font")
        self.create_path_mapping_part(self.path_mapping, self.available_csds, "csd")

    def find_image_file(self, img_path):
        """Find the actual image file for a CSD path, ignoring plist references."""
        if not img_path:
            return None

        # Check if path starts with "Default/" - these represent non-existent resources
        if img_path.startswith("Default/"):
            print(f"Skip Skipping Default resource: {img_path}")
            return None

        # Remove plist references - we only want the image path
        clean_path = img_path.replace("\\", "/")

        # Try exact match first
        if clean_path in self.path_mapping:
            found_image = self.path_mapping[clean_path]
            print(f"Found Exact match found: {img_path} ->\n {Path(found_image)}")
            return found_image

        # Try partial path matching (from longest to shortest for better specificity)
        path_parts = clean_path.split("/")
        best_match = None
        best_match_score = 0

        for i in range(len(path_parts)):
            partial_path = "/".join(path_parts[i:])
            if partial_path in self.path_mapping:
                found_image = self.path_mapping[partial_path]
                # Calculate match score based on path length to prefer more specific matches
                match_score = len(partial_path.split("/"))
                if match_score > best_match_score:
                    best_match = found_image
                    best_match_score = match_score
                print(
                    f"[EMOJI] Partial path match found: {img_path} -> {partial_path} ->\n  {Path(found_image)} (score: {match_score})"
                )

        if best_match:
            print(f"[EMOJI] Best match selected: {img_path} ->\n  {Path(best_match)}")
            return best_match

        # Finally, try filename-only match but look for the best match considering directory structure
        filename = Path(clean_path).name
        filename_matches = []

        # Find all files with matching filename
        for path_key, actual_path in self.path_mapping.items():
            if Path(path_key).name == filename:
                filename_matches.append((path_key, actual_path))

        if filename_matches:
            if len(filename_matches) == 1:
                # Single match, use it
                found_image = filename_matches[0][1]
                print(
                    f"Folder Single filename match found: {img_path} ->\n  {Path(found_image)}"
                )
                return found_image
            else:
                # Multiple matches - try to find the best one based on directory structure similarity
                best_filename_match = None
                best_filename_score = 0

                for path_key, actual_path in filename_matches:
                    # Calculate similarity score between csd_path and path_key directory structures
                    csd_parts = set(clean_path.split("/")[:-1])  # Exclude filename
                    key_parts = set(path_key.split("/")[:-1])

                    # Score based on common directory names
                    common_dirs = len(csd_parts.intersection(key_parts))
                    total_dirs = len(csd_parts.union(key_parts))

                    if total_dirs > 0:
                        similarity_score = common_dirs / total_dirs
                    else:
                        similarity_score = 0

                    if similarity_score > best_filename_score:
                        best_filename_match = actual_path
                        best_filename_score = similarity_score

                if best_filename_match:
                    print(
                        f"Folder Multiple filename matches found, selected best: {img_path} ->\n  {Path(best_filename_match)} (similarity: {best_filename_score:.2f})"
                    )
                    return best_filename_match
                else:
                    # If no good similarity match, use the first one
                    found_image = filename_matches[0][1]
                    print(
                        f"Folder Multiple filename matches found, using first: {img_path} ->\n  {Path(found_image)}"
                    )
                    return found_image

        print(f"ERROR Image not found: {img_path}")
        self.not_found_files.add(f"Image: {img_path}")
        return None

    def find_csd_file(self, csd_path):
        """Find the actual CSD file for a CSD path reference."""
        if not csd_path:
            return None

        # Remove any .csd extension and then try with .csd
        clean_path = csd_path.replace("\\", "/")
        if clean_path.endswith(".csd"):
            clean_path = clean_path[:-4]  # Remove .csd extension
        
        # Try with .csd extension
        csd_path_with_ext = clean_path + ".csd"

        # Try exact match first
        if csd_path_with_ext in self.path_mapping:
            found_csd = self.path_mapping[csd_path_with_ext]
            print(f"CSD Exact match found: {csd_path} ->\n {Path(found_csd)}")
            return found_csd

        # Try partial path matching (from longest to shortest for better specificity)
        path_parts = csd_path_with_ext.split("/")
        best_match = None
        best_match_score = 0

        for i in range(len(path_parts)):
            partial_path = "/".join(path_parts[i:])
            if partial_path in self.path_mapping:
                found_csd = self.path_mapping[partial_path]
                # Calculate match score based on path length to prefer more specific matches
                match_score = len(partial_path.split("/"))
                if match_score > best_match_score:
                    best_match = found_csd
                    best_match_score = match_score
                print(
                    f"CSD Partial path match found: {csd_path} -> {partial_path} ->\n  {Path(found_csd)} (score: {match_score})"
                )

        if best_match:
            print(f"CSD Best match selected: {csd_path} ->\n  {Path(best_match)}")
            return best_match

        # Finally, try filename-only match
        filename = Path(csd_path_with_ext).name
        filename_matches = []

        # Find all files with matching filename
        for path_key, actual_path in self.path_mapping.items():
            if Path(path_key).name == filename:
                filename_matches.append((path_key, actual_path))

        if filename_matches:
            if len(filename_matches) == 1:
                # Single match, use it
                found_csd = filename_matches[0][1]
                print(
                    f"CSD Single filename match found: {csd_path} ->\n  {Path(found_csd)}"
                )
                return found_csd
            else:
                # Multiple matches - use the first one found
                found_csd = filename_matches[0][1]
                print(
                    f"CSD Multiple filename matches found, using first: {csd_path} ->\n  {Path(found_csd)}"
                )
                return found_csd

        # File not found
        print(f"CSD ERROR: Could not find CSD file for: {csd_path}")
        self.not_found_files.add(f"CSD: {csd_path}")
        return None

    def find_particle_file(self, csd_path):
        """Find the actual particle file for a CSD path."""
        if not csd_path:
            return None

        # Check if path starts with "Default/" - these represent non-existent resources
        if csd_path.startswith("Default/"):
            print(f"Skip Skipping Default resource: {csd_path}")
            return None

        # Remove plist references - we want the exact plist path
        clean_path = csd_path.replace("\\", "/")

        # Try exact match first
        if clean_path in self.path_mapping:
            found_particle = self.path_mapping[clean_path]
            print(f"[EMOJI] Exact match found: {csd_path} ->\n {Path(found_particle)}")
            return found_particle

        # Try partial path matching (from longest to shortest for better specificity)
        path_parts = clean_path.split("/")
        best_match = None
        best_match_score = 0

        for i in range(len(path_parts)):
            partial_path = "/".join(path_parts[i:])
            if partial_path in self.path_mapping:
                found_particle = self.path_mapping[partial_path]
                # Calculate match score based on path length to prefer more specific matches
                match_score = len(partial_path.split("/"))
                if match_score > best_match_score:
                    best_match = found_particle
                    best_match_score = match_score
                print(
                    f"[EMOJI] Partial path match found: {csd_path} -> {partial_path} ->\n  {Path(found_particle)} (score: {match_score})"
                )

        if best_match:
            print(f"[EMOJI] Best match selected: {csd_path} ->\n  {Path(best_match)}")
            return best_match

        # Finally, try filename-only match but look for the best match considering directory structure
        filename = Path(clean_path).name
        filename_matches = []

        # Find all files with matching filename
        for path_key, actual_path in self.path_mapping.items():
            if Path(path_key).name == filename:
                filename_matches.append((path_key, actual_path))

        if filename_matches:
            if len(filename_matches) == 1:
                # Single match, use it
                found_particle = filename_matches[0][1]
                print(
                    f"Folder Single filename match found: {csd_path} ->\n  {Path(found_particle)}"
                )
                return found_particle
            else:
                # Multiple matches - try to find the best one based on directory structure similarity
                best_filename_match = None
                best_filename_score = 0

                for path_key, actual_path in filename_matches:
                    # Calculate similarity score between csd_path and path_key directory structures
                    csd_parts = set(clean_path.split("/")[:-1])  # Exclude filename
                    key_parts = set(path_key.split("/")[:-1])

                    # Score based on common directory names
                    common_dirs = len(csd_parts.intersection(key_parts))
                    total_dirs = len(csd_parts.union(key_parts))

                    if total_dirs > 0:
                        similarity_score = common_dirs / total_dirs
                    else:
                        similarity_score = 0

                    if similarity_score > best_filename_score:
                        best_filename_match = actual_path
                        best_filename_score = similarity_score

                if best_filename_match:
                    print(
                        f"Folder Multiple filename matches found, selected best: {csd_path} ->\n  {Path(best_filename_match)} (similarity: {best_filename_score:.2f})"
                    )
                    return best_filename_match
                else:
                    # If no good similarity match, use the first one
                    found_particle = filename_matches[0][1]
                    print(
                        f"Folder Multiple filename matches found, using first: {csd_path} ->\n  {Path(found_particle)}"
                    )
                    return found_particle

        print(f"ERROR Particle file not found: {csd_path}")
        self.not_found_files.add(f"Particle: {csd_path}")
        return None

    def find_font_file(self, csd_path):
        """Find the actual font file for a CSD path."""
        if not csd_path:
            return None

        # Check if path starts with "Default/" - these represent non-existent resources
        if csd_path.startswith("Default/"):
            print(f"Skip Skipping Default resource: {csd_path}")
            return None

        # Remove plist references - we want the exact fnt path
        clean_path = csd_path.replace("\\", "/")

        # Try exact match first
        if clean_path in self.path_mapping:
            found_font = self.path_mapping[clean_path]
            print(f"Font Exact match found: {csd_path} ->\n {Path(found_font)}")
            return found_font

        # Try partial path matching (from longest to shortest for better specificity)
        path_parts = clean_path.split("/")
        best_match = None
        best_match_score = 0

        for i in range(len(path_parts)):
            partial_path = "/".join(path_parts[i:])
            if partial_path in self.path_mapping:
                found_font = self.path_mapping[partial_path]
                # Calculate match score based on path length to prefer more specific matches
                match_score = len(partial_path.split("/"))
                if match_score > best_match_score:
                    best_match = found_font
                    best_match_score = match_score
                print(
                    f"[EMOJI] Partial path match found: {csd_path} -> {partial_path} ->\n  {Path(found_font)} (score: {match_score})"
                )

        if best_match:
            print(f"[EMOJI] Best match selected: {csd_path} ->\n  {Path(best_match)}")
            return best_match

        # Finally, try filename-only match but look for the best match considering directory structure
        filename = Path(clean_path).name
        filename_matches = []

        # Find all files with matching filename
        for path_key, actual_path in self.path_mapping.items():
            if Path(path_key).name == filename:
                filename_matches.append((path_key, actual_path))

        if filename_matches:
            if len(filename_matches) == 1:
                # Single match, use it
                found_font = filename_matches[0][1]
                print(
                    f"Folder Single filename match found: {csd_path} ->\n  {Path(found_font)}"
                )
                return found_font
            else:
                # Multiple matches - try to find the best one based on directory structure similarity
                best_filename_match = None
                best_filename_score = 0

                for path_key, actual_path in filename_matches:
                    # Calculate similarity score between csd_path and path_key directory structures
                    csd_parts = set(clean_path.split("/")[:-1])  # Exclude filename
                    key_parts = set(path_key.split("/")[:-1])

                    # Score based on common directory names
                    common_dirs = len(csd_parts.intersection(key_parts))
                    total_dirs = len(csd_parts.union(key_parts))

                    if total_dirs > 0:
                        similarity_score = common_dirs / total_dirs
                    else:
                        similarity_score = 0

                    if similarity_score > best_filename_score:
                        best_filename_match = actual_path
                        best_filename_score = similarity_score

                if best_filename_match:
                    print(
                        f"Folder Multiple filename matches found, selected best: {csd_path} ->\n  {Path(best_filename_match)} (similarity: {best_filename_score:.2f})"
                    )
                    return best_filename_match
                else:
                    # If no good similarity match, use the first one
                    found_font = filename_matches[0][1]
                    print(
                        f"Folder Multiple filename matches found, using first: {csd_path} ->\n  {Path(found_font)}"
                    )
                    return found_font

        print(f"ERROR Font file not found: {csd_path}")
        self.not_found_files.add(f"Font: {csd_path}")
        return None

    def get_particle_uuid(self, particle_path):
        """Generate or retrieve UUID for a particle system."""
        if not particle_path:
            return None

        # Use normalized path as cache key to ensure consistency
        normalized_path = self.normalize_path_for_uuid_key(particle_path)
        
        if normalized_path in self.particle_cache:
            return self.particle_cache[normalized_path]

        # Generate new unique UUID for this particle using UUID manager
        particle_uuid = self.uuid_manager.generate_unique_uuid("base")
        self.particle_cache[normalized_path] = particle_uuid
        return particle_uuid

    def create_particle_reference(self, csd_path):
        """Create a particle reference from CSD path."""
        actual_particle = self.find_particle_file(csd_path)
        if not actual_particle:
            print(f"WARNING  Cannot create particle reference for: {csd_path}")
            return None

        # Track that this particle is used
        self.used_particles.add(actual_particle)
        print(f"Success Particle marked as used: {Path(actual_particle).name}")

        particle_uuid = self.get_particle_uuid(actual_particle)
        if not particle_uuid:
            return None

        return {"__uuid__": particle_uuid, "__expectedType__": "cc.ParticleAsset"}

    def get_font_uuid(self, font_path):
        """Generate or retrieve UUID for a font file."""
        if not font_path:
            return None

        # Use normalized path as cache key to ensure consistency
        normalized_path = self.normalize_path_for_uuid_key(font_path)
        
        if normalized_path in self.font_cache:
            return self.font_cache[normalized_path]

        # Generate new unique UUID for this font using UUID manager
        font_uuid = self.uuid_manager.generate_unique_uuid("base")
        self.font_cache[normalized_path] = font_uuid
        return font_uuid

    def create_font_reference(self, csd_path):
        """Create a font reference from CSD path."""
        # Check if path starts with "Default/" - these represent non-existent resources
        if csd_path and csd_path.startswith("Default/"):
            print(f"Skip Skipping Default resource font: {csd_path}")
            return None

        actual_font = self.find_font_file(csd_path)
        if not actual_font:
            print(f"WARNING  Cannot create font reference for: {csd_path}")
            return None

        # Track that this font is used
        self.used_fonts.add(actual_font)
        print(f"Success Font marked as used: {Path(actual_font).name}")

        font_uuid = self.get_font_uuid(actual_font)
        if not font_uuid:
            return None

        return {"__uuid__": font_uuid, "__expectedType__": "cc.LabelAsset"}

    def normalize_path_for_uuid_key(self, file_path):
        """
        Normalize file path for UUID cache key using the same logic as create_path_mapping_part.
        Returns the canonical path that should be used as UUID key.
        """
        if not file_path:
            return file_path
            
        path_file = Path(file_path)
        parts = path_file.parts
        
        # Convert to forward slashes for consistency
        normalized_parts = [part.replace("\\", "/") for part in parts]
        
        next_break = False
        for i in range(len(normalized_parts)):
            # Check for special directories
            if normalized_parts[i] == "Lua":
                next_break = True
                continue
            elif normalized_parts[i] in ["CommonResource", "GameResource"]:
                # For CommonResource/GameResource, use path from this level
                canonical_path = "/".join(normalized_parts[i:])
                return canonical_path
            elif next_break:
                # For Lua, use path from next level after Lua
                canonical_path = "/".join(normalized_parts[i:])
                return canonical_path
                
        # If no special directories found, use the full path normalized
        return "/".join(normalized_parts).replace("\\", "/")

    def get_csd_uuid(self, csd_path):
        """Get UUID for a CSD/prefab file from cache, or return None if not cached."""
        if not csd_path:
            return None

        # Use normalized path as cache key to ensure consistency
        normalized_path = self.normalize_path_for_uuid_key(csd_path)

        # Only return cached UUID, don't generate new ones
        # New UUIDs should be generated by PrefabGenerator.get_prefab_uuid_by_name
        if normalized_path in self.csd_cache:
            cached_uuid = self.csd_cache[normalized_path]
            print(f"CSD Using cached UUID for {Path(csd_path).name}: {cached_uuid}")
            return cached_uuid

        # Don't generate new UUID here - leave that to PrefabGenerator
        return None

    def create_prefab_reference(self, csd_path):
        """Create a prefab reference for the given CSD path."""
        # Check if path starts with "Default/" - these represent non-existent resources
        if csd_path and csd_path.startswith("Default/"):
            print(f"Skip Skipping Default resource CSD: {csd_path}")
            return None

        prefab_uuid = self.get_csd_uuid(csd_path)
        if prefab_uuid:
            return {
                "__uuid__": prefab_uuid
            }
        else:
            print(f"WARNING Prefab referˇˇence could not be created for: {csd_path}")
            return None

    def calculate_image_trim(self, image_path):
        """Calculate trim information for an image by removing transparent borders."""
        if image_path in self.trim_info_cache:
            return self.trim_info_cache[image_path]

        try:
            from PIL import Image

            with Image.open(image_path) as img:
                # Convert to RGBA if not already
                if img.mode != "RGBA":
                    img = img.convert("RGBA")

                # Get image dimensions
                width, height = img.size

                # Find bounding box of non-transparent pixels
                bbox = img.getbbox()

                if bbox:
                    # bbox is (left, upper, right, lower)
                    left, upper, right, lower = bbox
                    trim_x = left
                    trim_y = upper
                    trim_width = right - left
                    trim_height = lower - upper

                    # Calculate offset from center
                    original_center_x = width / 2
                    original_center_y = height / 2
                    trim_center_x = (left + right) / 2
                    trim_center_y = (upper + lower) / 2

                    offset_x = trim_center_x - original_center_x
                    offset_y = (height - trim_center_y) - (
                        height - original_center_y
                    )  # Flip Y for Cocos
                else:
                    # If no non-transparent pixels, use original size
                    trim_x = 0
                    trim_y = 0
                    trim_width = width
                    trim_height = height
                    offset_x = 0
                    offset_y = 0

                trim_info = {
                    "originalWidth": width,
                    "originalHeight": height,
                    "trimX": trim_x,
                    "trimY": trim_y,
                    "trimWidth": trim_width,
                    "trimHeight": trim_height,
                    "offsetX": offset_x,
                    "offsetY": offset_y,
                }

                self.trim_info_cache[image_path] = trim_info
                return trim_info

        except (ImportError, Exception) as e:
            # Fallback: no trim, use original size
            try:
                from PIL import Image

                with Image.open(image_path) as img:
                    width, height = img.size
            except:
                width, height = 100, 100

            trim_info = {
                "originalWidth": width,
                "originalHeight": height,
                "trimX": 0,
                "trimY": 0,
                "trimWidth": width,
                "trimHeight": height,
                "offsetX": 0,
                "offsetY": 0,
            }

            self.trim_info_cache[image_path] = trim_info
            return trim_info

    def detect_image_alpha(self, image_path):
        """Detect if an image has transparency/alpha channel."""
        try:
            from PIL import Image

            with Image.open(image_path) as img:
                # Special handling based on image filename/type
                filename = Path(image_path).name.lower()

                # For CheckBox_Disable.png specifically, it should be False based on reference
                if "checkbox_disable.png" in filename:
                    return False

                # Check if image has alpha channel
                if img.mode in ("RGBA", "LA") or "transparency" in img.info:
                    # Convert to RGBA to check transparency
                    if img.mode != "RGBA":
                        img = img.convert("RGBA")

                    # Check if any pixel is actually transparent
                    alpha_channel = img.split()[-1]  # Get alpha channel
                    min_alpha = alpha_channel.getextrema()[0]  # Get minimum alpha value
                    return min_alpha < 255  # Has transparency if minimum alpha < 255
                else:
                    return False  # No alpha channel

        except (ImportError, Exception):
            return True  # Default to True if can't detect

        return False

    def get_trimmed_size(self, image_path):
        """Get the trimmed size of an image for UITransform."""
        # First try to find the image using existing mapping
        actual_image = self.find_image_file(image_path)

        # If not found, try using the path directly if it exists
        if not actual_image and image_path:
            # Try various path combinations
            possible_paths = [
                image_path,
                f"../input/{image_path}",
                f"../input/Work/res/BasicResources/{Path(image_path).name}",
                f"../input/Work/res/{Path(image_path).name}",
            ]

            for path in possible_paths:
                if Path(path).exists():
                    actual_image = str(Path(path))
                    break

        if not actual_image:
            print(f"ERROR Cannot find image: {image_path}")
            return 100, 100  # Default size

        trim_info = self.calculate_image_trim(actual_image)
        return trim_info["trimWidth"], trim_info["trimHeight"]

    def get_original_size(self, image_path):
        """Get the original size of an image (without trimming)."""
        # First try to find the image using existing mapping
        actual_image = self.find_image_file(image_path)

        # If not found, try using the path directly if it exists
        if not actual_image and image_path:
            # Try various path combinations
            possible_paths = [
                image_path,
                f"../input/{image_path}",
                f"../input/Work/res/BasicResources/{Path(image_path).name}",
                f"../input/Work/res/{Path(image_path).name}",
            ]

            for path in possible_paths:
                if Path(path).exists():
                    actual_image = str(Path(path))
                    break

        if not actual_image:
            print(f"ERROR Cannot find image: {image_path}")
            return 100, 100  # Default size

        trim_info = self.calculate_image_trim(actual_image)
        return trim_info["originalWidth"], trim_info["originalHeight"]

    def add_scale9_info(self, image_path, scale9_data):
        """Add scale9 information for an image path."""
        if not image_path or not scale9_data:
            return

        # Use normalized path as cache key to ensure consistency
        normalized_path = self.normalize_path_for_uuid_key(image_path)
        if not normalized_path:
            normalized_path = image_path

        # Store scale9 info for the image
        new_scale9_info = {
            "leftEage": int(scale9_data.get("LeftEage", 0)),
            "rightEage": int(scale9_data.get("RightEage", 0)),
            "topEage": int(scale9_data.get("TopEage", 0)),
            "bottomEage": int(scale9_data.get("BottomEage", 0)),
        }
        
        # Keep history of scale9 settings for the same image
        if normalized_path not in self.scale9_info_cache:
            self.scale9_info_cache[normalized_path] = []
        
        # Add to history list
        self.scale9_info_cache[normalized_path].append(new_scale9_info)

    def get_scale9_info(self, image_path, image_width=None, image_height=None):
        """Get scale9 information for an image path.
        
        Validates scale9 settings against image dimensions:
        - If topEdge + bottomEdge > height, set both to 0
        - If leftEdge + rightEdge > width, set both to 0
        - Tries to find valid settings from history if current one fails
        """
        # Use normalized path as cache key to ensure consistency
        normalized_path = self.normalize_path_for_uuid_key(image_path)
        if not normalized_path:
            normalized_path = image_path
        
        default_info = {"leftEage": 0, "rightEage": 0, "topEage": 0, "bottomEage": 0}
        
        # Get scale9 history list
        scale9_history = self.scale9_info_cache.get(normalized_path, [])
        if not scale9_history:
            return default_info
        
        # If no dimensions provided, return the last setting without validation
        if image_width is None or image_height is None:
            # Return last setting in history (for backward compatibility)
            if isinstance(scale9_history, list):
                return scale9_history[-1] if scale9_history else default_info
            else:
                # Old format (single dict), convert to new format
                return scale9_history
        
        # Try to find a valid scale9 setting from history (newest first)
        for scale9_info in reversed(scale9_history):
            validated_info = scale9_info.copy()
            
            # Validate vertical edges
            if validated_info["topEage"] + validated_info["bottomEage"] > image_height:
                print(f"WARNING: Scale9 vertical edges invalid for {Path(image_path).name}: "
                      f"top({validated_info['topEage']}) + bottom({validated_info['bottomEage']}) > height({image_height})")
                validated_info["topEage"] = 0
                validated_info["bottomEage"] = 0
            
            # Validate horizontal edges
            if validated_info["leftEage"] + validated_info["rightEage"] > image_width:
                print(f"WARNING: Scale9 horizontal edges invalid for {Path(image_path).name}: "
                      f"left({validated_info['leftEage']}) + right({validated_info['rightEage']}) > width({image_width})")
                validated_info["leftEage"] = 0
                validated_info["rightEage"] = 0
            
            # Check if this setting has any valid edges
            if any(validated_info[key] > 0 for key in ["leftEage", "rightEage", "topEage", "bottomEage"]):
                return validated_info
        
        # If no valid setting found in history, return default
        return default_info

    def has_scale9_info(self, image_path):
        """Check if an image has scale9 information."""
        # Use normalized path as cache key to ensure consistency
        normalized_path = self.normalize_path_for_uuid_key(image_path)
        if not normalized_path:
            normalized_path = image_path
            
        scale9_history = self.scale9_info_cache.get(normalized_path, [])
        if not scale9_history:
            return False
        
        # Handle both list (new format) and dict (old format)
        if isinstance(scale9_history, list):
            # Check if any setting in history has non-zero edges
            for scale9_info in scale9_history:
                if any(scale9_info.get(key, 0) > 0 for key in ["leftEage", "rightEage", "topEage", "bottomEage"]):
                    return True
            return False
        else:
            # Old format (single dict)
            return any(
                scale9_history.get(key, 0) > 0
                for key in ["leftEage", "rightEage", "topEage", "bottomEage"]
            )

    def get_sprite_frame_uuid(self, image_path):
        """Generate or retrieve UUID for a sprite frame.

        重要：每個實際檔案路徑都應該有唯一的UUID，
        使用正規化路徑作為cache key確保同一檔案只有一個UUID。
        """
        if not image_path:
            return None

        # Use normalized path as cache key to ensure consistency
        normalized_path = self.normalize_path_for_uuid_key(image_path)
        
        if normalized_path in self.image_cache:
            return self.image_cache[normalized_path]

        # Generate new unique sprite frame UUID using UUID manager
        sprite_frame_uuid = self.uuid_manager.generate_unique_uuid("sprite_frame")
        self.image_cache[normalized_path] = sprite_frame_uuid
        print(f"UUID Generated UUID for normalized path {normalized_path}: {sprite_frame_uuid}")
        return sprite_frame_uuid

    def should_filter_image(self, image_path):
        """Check if an image should be filtered out based on filename.
        
        Returns True if the image filename (case-insensitive) is:
        - empty.png, empty.jpg, empty.jpeg
        - BlankPNG.png
        """
        if not image_path:
            return False
        
        # Get filename without path
        filename = Path(image_path).name.lower()
        
        # Check for empty.* patterns
        if filename in ['empty.png', 'empty.jpg', 'empty.jpeg']:
            return True
        
        # Check for BlankPNG.png
        if filename == 'blankpng.png':
            return True
        
        return False
    
    def create_sprite_frame_reference(self, img_path):
        """Create a sprite frame reference from CSD path."""
        # Check if path starts with "Default/" - these represent non-existent resources
        if img_path and img_path.startswith("Default/"):
            print(f"Skip Skipping Default resource sprite frame: {img_path}")
            return None

        # Check if this is a filtered image (empty.*, BlankPNG.png)
        if self.should_filter_image(img_path):
            print(f"Skip Filtering out blank image: {img_path}")
            return None

        actual_image = self.find_image_file(img_path)
        if not actual_image:
            print(f"WARNING  Cannot create sprite frame reference for: {img_path}")
            return None

        # Double-check the actual image path as well
        if self.should_filter_image(actual_image):
            print(f"Skip Filtering out blank image (actual path): {actual_image}")
            return None

        # Track that this image is used
        self.used_images.add(actual_image)
        print(f"Success Image marked as used: {Path(actual_image).name}")

        # Use the actual normalized path as UUID key, not the original CSD path
        # This ensures the same file always gets the same UUID regardless of path format
        sprite_uuid = self.get_sprite_frame_uuid(actual_image)
        if not sprite_uuid:
            return None

        return {"__uuid__": sprite_uuid, "__expectedType__": "cc.SpriteFrame"}

    def parse_fnt_texture_files(self, fnt_path):
        """Parse FNT file to extract referenced texture files."""
        texture_files = []

        try:
            with open(fnt_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("page id="):
                        # Extract file name from line like: page id=0 file="Num_GetFreeBig_0.png"
                        file_match = re.search(r'file="([^"]+)"', line)
                        if file_match:
                            texture_file = file_match.group(1)
                            texture_files.append(texture_file)
                            print(
                                f"Font Found texture reference in {Path(fnt_path).name}: {texture_file}"
                            )

        except Exception as e:
            print(f"WARNING Error parsing FNT file {fnt_path}: {str(e)}")

        return texture_files

    def generate_image_meta_file(self, source_image, dest_path):
        """Generate .meta file for an image with correct UUID, matching engine format."""
        # Get the main texture UUID (without @f9941 suffix)
        sprite_uuid = self.get_sprite_frame_uuid(source_image)
        if not sprite_uuid:
            return

        # Extract base UUID (remove @f9941 suffix)
        base_uuid = sprite_uuid.split("@")[0]

        # Get trim information for the image
        trim_info = self.calculate_image_trim(source_image)
        width = trim_info["originalWidth"]
        height = trim_info["originalHeight"]
        trim_width = trim_info["trimWidth"]
        trim_height = trim_info["trimHeight"]
        trim_x = trim_info["trimX"]
        trim_y = trim_info["trimY"]
        offset_x = trim_info["offsetX"]
        offset_y = trim_info["offsetY"]

        # Detect if image has alpha channel
        has_alpha = self.detect_image_alpha(source_image)

        # Calculate half dimensions for vertices (use trimmed size)
        half_width = trim_width / 2
        half_height = trim_height / 2

        # Get scale9 information for this image with validation
        # Pass original image dimensions for validation
        scale9_info = self.get_scale9_info(source_image, width, height)

        # Generate meta file content matching engine format
        meta_content = {
            "ver": "1.0.26",
            "importer": "image",
            "imported": True,
            "uuid": base_uuid,
            "files": [".json", ".png"],
            "subMetas": {
                "6c48a": {
                    "importer": "texture",
                    "uuid": f"{base_uuid}@6c48a",
                    "displayName": dest_path.stem,
                    "id": "6c48a",
                    "name": "texture",
                    "userData": {
                        "wrapModeS": "clamp-to-edge",
                        "wrapModeT": "clamp-to-edge",
                        "imageUuidOrDatabaseUri": base_uuid,
                        "isUuid": True,
                        "visible": False,
                        "minfilter": "linear",
                        "magfilter": "linear",
                        "mipfilter": "none",
                        "anisotropy": 0,
                    },
                    "ver": "1.0.22",
                    "imported": True,
                    "files": [".json"],
                    "subMetas": {},
                },
                "f9941": {
                    "importer": "sprite-frame",
                    "uuid": f"{base_uuid}@f9941",
                    "displayName": dest_path.stem,
                    "id": "f9941",
                    "name": "spriteFrame",
                    "userData": {
                        "trimType": "auto",
                        "trimThreshold": 1,
                        "rotated": False,
                        "offsetX": int(offset_x) if offset_x.is_integer() else offset_x,
                        "offsetY": int(offset_y) if offset_y.is_integer() else offset_y,
                        "trimX": trim_x,
                        "trimY": trim_y,
                        "width": trim_width,
                        "height": trim_height,
                        "rawWidth": width,
                        "rawHeight": height,
                        "borderTop": scale9_info["topEage"],
                        "borderBottom": scale9_info["bottomEage"],
                        "borderLeft": scale9_info["leftEage"],
                        "borderRight": scale9_info["rightEage"],
                        "packable": True,
                        "pixelsToUnit": 100,
                        "pivotX": 0.5,
                        "pivotY": 0.5,
                        "meshType": 0,
                        "vertices": {
                            "rawPosition": [
                                (
                                    int(-half_width)
                                    if (-half_width).is_integer()
                                    else -half_width
                                ),
                                (
                                    int(-half_height)
                                    if (-half_height).is_integer()
                                    else -half_height
                                ),
                                0,
                                (
                                    int(half_width)
                                    if half_width.is_integer()
                                    else half_width
                                ),
                                (
                                    int(-half_height)
                                    if (-half_height).is_integer()
                                    else -half_height
                                ),
                                0,
                                (
                                    int(-half_width)
                                    if (-half_width).is_integer()
                                    else -half_width
                                ),
                                (
                                    int(half_height)
                                    if half_height.is_integer()
                                    else half_height
                                ),
                                0,
                                (
                                    int(half_width)
                                    if half_width.is_integer()
                                    else half_width
                                ),
                                (
                                    int(half_height)
                                    if half_height.is_integer()
                                    else half_height
                                ),
                                0,
                            ],
                            "indexes": [0, 1, 2, 2, 1, 3],
                            "uv": [
                                trim_x,
                                trim_y + trim_height,
                                trim_x + trim_width,
                                trim_y + trim_height,
                                trim_x,
                                trim_y,
                                trim_x + trim_width,
                                trim_y,
                            ],
                            "nuv": [
                                trim_x / width,
                                (trim_y + trim_height) / height,
                                (trim_x + trim_width) / width,
                                (trim_y + trim_height) / height,
                                trim_x / width,
                                trim_y / height,
                                (trim_x + trim_width) / width,
                                trim_y / height,
                            ],
                            "minPos": [
                                (
                                    int(-half_width)
                                    if (-half_width).is_integer()
                                    else -half_width
                                ),
                                (
                                    int(-half_height)
                                    if (-half_height).is_integer()
                                    else -half_height
                                ),
                                0,
                            ],
                            "maxPos": [
                                (
                                    int(half_width)
                                    if half_width.is_integer()
                                    else half_width
                                ),
                                (
                                    int(half_height)
                                    if half_height.is_integer()
                                    else half_height
                                ),
                                0,
                            ],
                        },
                        "isUuid": True,
                        "imageUuidOrDatabaseUri": f"{base_uuid}@6c48a",
                        "atlasUuid": "",
                    },
                    "ver": "1.0.12",
                    "imported": True,
                    "files": [".json"],
                    "subMetas": {},
                },
            },
            "userData": {
                "type": "sprite-frame",
                "hasAlpha": has_alpha,
                "fixAlphaTransparencyArtifacts": False,
                "redirect": f"{base_uuid}@f9941",
            },
        }

        # Write .meta file
        meta_path = Path(str(dest_path) + ".meta")
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta_content, f, indent=2, ensure_ascii=False)

    def parse_plist_properties(self, plist_path):
        """Parse plist file to extract particle properties for userData."""
        try:
            import plistlib

            with open(plist_path, "rb") as f:
                plist_data = plistlib.load(f)

            # Extract key properties from plist
            user_data = {
                "totalParticles": int(plist_data.get("maxParticles", 26)),
                "life": float(plist_data.get("particleLifespan", 0.7)),
                "lifeVar": float(plist_data.get("particleLifespanVariance", 0.3)),
                "emissionRate": float(plist_data.get("maxParticles", 26))
                / float(plist_data.get("particleLifespan", 0.7))
                * 37.142857142857146,
                "duration": float(plist_data.get("duration", -1)),
                "srcBlendFactor": int(plist_data.get("blendFuncSource", 770)),
                "dstBlendFactor": int(plist_data.get("blendFuncDestination", 771)),
                "startColor": {
                    "_val": self.color_to_uint32(
                        float(plist_data.get("startColorRed", 1)),
                        float(plist_data.get("startColorGreen", 1)),
                        float(plist_data.get("startColorBlue", 1)),
                        float(plist_data.get("startColorAlpha", 1)),
                    )
                },
                "startColorVar": {
                    "_val": self.color_to_uint32(
                        0, 0, 0, float(plist_data.get("startColorVarianceAlpha", 0.05))
                    )
                },
                "endColor": {
                    "_val": self.color_to_uint32(
                        float(plist_data.get("finishColorRed", 1)),
                        float(plist_data.get("finishColorGreen", 0.68)),
                        float(plist_data.get("finishColorBlue", 0)),
                        float(plist_data.get("finishColorAlpha", 0.6)),
                    )
                },
                "endColorVar": {"_val": 0},
                "startSize": float(plist_data.get("startParticleSize", 35)),
                "startSizeVar": float(plist_data.get("startParticleSizeVariance", 10)),
                "endSize": float(plist_data.get("finishParticleSize", 10)),
                "endSizeVar": float(plist_data.get("finishParticleSizeVariance", 5)),
                "positionType": 0,
                "sourcePos": {
                    "x": float(plist_data.get("sourcePositionx", 0)),
                    "y": float(plist_data.get("sourcePositiony", 0)),
                },
                "posVar": {
                    "x": float(plist_data.get("sourcePositionVariancex", 10)),
                    "y": float(plist_data.get("sourcePositionVariancey", 10)),
                },
                "angle": float(plist_data.get("angle", 90)),
                "angleVar": float(plist_data.get("angleVariance", 180)),
                "startSpin": float(plist_data.get("rotationStart", 0)),
                "startSpinVar": float(plist_data.get("rotationStartVariance", 0)),
                "endSpin": float(plist_data.get("rotationEnd", 0)),
                "endSpinVar": float(plist_data.get("rotationEndVariance", 0)),
                "emitterMode": int(plist_data.get("emitterType", 0)),
                "gravity": {
                    "x": float(plist_data.get("gravityx", 0)),
                    "y": float(plist_data.get("gravityy", 0)),
                },
                "speed": float(plist_data.get("speed", 10)),
                "speedVar": float(plist_data.get("speedVariance", 86)),
                "radialAccel": float(plist_data.get("radialAcceleration", 35)),
                "radialAccelVar": float(plist_data.get("radialAccelVariance", 0)),
                "tangentialAccel": float(plist_data.get("tangentialAcceleration", 0)),
                "tangentialAccelVar": float(
                    plist_data.get("tangentialAccelVariance", 0)
                ),
                "rotationIsDir": bool(plist_data.get("rotationIsDir", False)),
                "startRadius": float(plist_data.get("minRadius", 0)),
                "startRadiusVar": float(plist_data.get("minRadiusVariance", 0)),
                "endRadius": float(plist_data.get("maxRadius", 0)),
                "endRadiusVar": float(plist_data.get("maxRadiusVariance", 0)),
                "rotatePerS": float(plist_data.get("rotatePerSecond", 0)),
                "rotatePerSVar": float(plist_data.get("rotatePerSecondVariance", 0)),
                "spriteFrameUuid": "",
            }
            return user_data

        except Exception as e:
            print(
                f"WARNING Failed to parse plist properties from {plist_path}: {str(e)}"
            )
            # Return default userData if parsing fails
            return {
                "totalParticles": 26,
                "life": 0.7,
                "lifeVar": 0.3,
                "emissionRate": 37.142857142857146,
                "duration": -1,
                "srcBlendFactor": 770,
                "dstBlendFactor": 771,
                "startColor": {"_val": 4294967295},
                "startColorVar": {"_val": 201326592},
                "endColor": {"_val": 2566958591},
                "endColorVar": {"_val": 0},
                "startSize": 35,
                "startSizeVar": 10,
                "endSize": 10,
                "endSizeVar": 5,
                "positionType": 0,
                "sourcePos": {"x": 0, "y": 0},
                "posVar": {"x": 10, "y": 10},
                "angle": 90,
                "angleVar": 180,
                "startSpin": 0,
                "startSpinVar": 0,
                "endSpin": 0,
                "endSpinVar": 0,
                "emitterMode": 0,
                "gravity": {"x": 0, "y": 0},
                "speed": 10,
                "speedVar": 86,
                "radialAccel": 35,
                "radialAccelVar": 0,
                "tangentialAccel": 0,
                "tangentialAccelVar": 0,
                "rotationIsDir": False,
                "startRadius": 0,
                "startRadiusVar": 0,
                "endRadius": 0,
                "endRadiusVar": 0,
                "rotatePerS": 0,
                "rotatePerSVar": 0,
                "spriteFrameUuid": "",
            }

    def color_to_uint32(self, r, g, b, a):
        """Convert RGBA color components to uint32 value."""
        return (
            int(a * 255) << 24 | int(r * 255) << 16 | int(g * 255) << 8 | int(b * 255)
        )

    def extract_texture_from_plist(self, plist_path, output_dir=None):
        """
        Extract texture from a .plist file containing base64 encoded texture data.
        Returns (modified_plist_path, texture_path) or (None, None) if extraction fails
        """
        plist_path = Path(plist_path)
        if not plist_path.exists():
            print(f"ERROR Plist file not found: {plist_path}")
            self.not_found_files.add(f"Plist: {plist_path}")
            return None, None

        if output_dir is None:
            output_dir = plist_path.parent
        else:
            output_dir = Path(output_dir)
            output_dir.mkdir(parents=True, exist_ok=True)

        try:
            # Read and parse the plist file
            with open(plist_path, "rb") as f:
                plist_data = plistlib.load(f)

            # Check if textureImageData exists
            if "textureImageData" not in plist_data:
                print(f"WARNING  No textureImageData found in {plist_path}")
                return str(plist_path), None

            texture_data = plist_data["textureImageData"]
            texture_filename = plist_data.get(
                "textureFileName", "extracted_texture.png"
            )

            print(f"Processing Extracting texture: {texture_filename}")

            # Decode base64
            try:
                decoded_data = base64.b64decode(texture_data)
            except Exception as e:
                print(f"ERROR Base64 decode failed: {e}")
                return None, None

            # Try to decompress gzip, if it fails, use decoded data directly
            try:
                decompressed_data = gzip.decompress(decoded_data)
            except Exception as e:
                print(f"WARNING  Gzip decompression failed ({e}), trying direct decode")
                decompressed_data = decoded_data

            # Create image from decompressed data
            try:
                image = Image.open(io.BytesIO(decompressed_data))

                # Save the texture image
                texture_path = output_dir / texture_filename
                image.save(texture_path)
                print(f"Success Texture saved: {texture_path}")

            except Exception as e:
                print(f"ERROR Image creation failed: {e}")
                return None, None

            # Remove textureImageData from plist
            del plist_data["textureImageData"]

            # Save modified plist
            modified_plist_path = output_dir / plist_path.name
            with open(modified_plist_path, "wb") as f:
                plistlib.dump(plist_data, f)

            print(f"Success Modified plist saved: {modified_plist_path}")
            return str(modified_plist_path), str(texture_path)

        except Exception as e:
            print(f"ERROR Error processing {plist_path}: {e}")
            return None, None

    def is_texture_atlas_plist(self, plist_path):
        """
        檢查 .plist 文件是否為合圖(texture atlas)用途。
        合圖的 .plist 文件會包含 frames 和 metadata 字典。

        Returns True if it's a texture atlas plist, False if it's a particle plist
        """
        try:
            with open(plist_path, "rb") as f:
                plist_data = plistlib.load(f)

            # 合圖 plist 會包含 frames 和 metadata 字典
            has_frames = "frames" in plist_data and isinstance(
                plist_data["frames"], dict
            )
            has_metadata = "metadata" in plist_data and isinstance(
                plist_data["metadata"], dict
            )

            if has_frames and has_metadata:
                metadata = plist_data["metadata"]
                # 檢查是否有 textureFileName 或 realTextureFileName
                has_texture_ref = (
                    "textureFileName" in metadata or "realTextureFileName" in metadata
                )
                return has_texture_ref

            return False

        except Exception as e:
            print(f"ERROR Error reading plist {plist_path}: {str(e)}")
            # 如果無法讀取，預設當作粒子效果處理
            return False

    def get_texture_filename_from_plist(self, plist_path):
        """
        Get the texture filename referenced in a plist file.
        Returns texture_filename or None if not found.
        """
        try:
            with open(plist_path, "rb") as f:
                plist_data = plistlib.load(f)

            texture_filename = plist_data.get("textureFileName")
            return texture_filename
        except Exception as e:
            print(f"ERROR Error reading plist {plist_path}: {str(e)}")
            return None

    def copy_external_particle_texture(self, plist_path, output_dir, input_path):
        """
        Copy external texture file referenced by plist if it exists.
        Returns (texture_path, copied) tuple.
        """
        texture_filename = self.get_texture_filename_from_plist(plist_path)
        if not texture_filename:
            return None, False

        # Try to find texture in the path mapping first
        if texture_filename in self.path_mapping:
            texture_source_path = self.path_mapping[texture_filename]
            if Path(texture_source_path).exists():
                output_texture_path = output_dir / texture_filename
                shutil.copy2(texture_source_path, output_texture_path)
                print(
                    f"Success Copied external texture from mapping: {texture_filename}"
                )
                return str(output_texture_path), True

        # Try to find texture by searching in input directory
        for texture_file in input_path.rglob(texture_filename):
            output_texture_path = output_dir / texture_filename
            shutil.copy2(texture_file, output_texture_path)
            print(f"Success Copied external texture from search: {texture_filename}")
            return str(output_texture_path), True

        # Fallback: Look for texture file in the same directory as plist (output dir)
        plist_dir = Path(plist_path).parent
        texture_path = plist_dir / texture_filename

        if texture_path.exists():
            # Copy texture to output directory
            output_texture_path = output_dir / texture_filename
            shutil.copy2(texture_path, output_texture_path)
            print(f"Success Copied external texture: {texture_filename}")
            return str(output_texture_path), True

        print(f"WARNING  External texture not found: {texture_filename}")
        self.not_found_files.add(f"Texture: {texture_filename}")
        return None, False

    def generate_particle_meta_file(self, source_particle, dest_path):
        """Generate .meta file for a particle system with correct UUID."""
        # Get the particle UUID
        particle_uuid = self.get_particle_uuid(source_particle)
        if not particle_uuid:
            return

        # Parse plist file to extract particle properties
        particle_properties = self.parse_plist_properties(source_particle)

        # Generate meta file content for particle asset
        meta_content = {
            "ver": "1.0.2",
            "importer": "particle",
            "imported": True,
            "uuid": particle_uuid,
            "files": [".json", ".plist"],
            "subMetas": {},
            "userData": particle_properties,
        }

        # Write .meta file
        meta_path = Path(str(dest_path) + ".meta")
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta_content, f, indent=2, ensure_ascii=False)

    def parse_fnt_config(self, fnt_path):
        """Parse .fnt file to extract font configuration."""
        try:
            with open(fnt_path, "r", encoding="utf-8") as f:
                content = f.read()

            # Parse common line
            common_height = 47  # default
            common_match = re.search(
                r"common lineHeight=(\d+) base=(\d+) scaleW=(\d+) scaleH=(\d+)", content
            )
            if common_match:
                common_height = int(common_match.group(1))

            # Parse page line to get texture filename
            texture_filename = ""
            page_match = re.search(r'page id=0 file="([^"]+)"', content)
            if page_match:
                texture_filename = page_match.group(1)

            # Parse chars
            chars = {}
            char_matches = re.findall(
                r"char id=(\d+)\s+x=(\d+)\s+y=(\d+)\s+width=(\d+)\s+height=(\d+)\s+xoffset=(-?\d+)\s+yoffset=(-?\d+)\s+xadvance=(\d+)",
                content,
            )

            for match in char_matches:
                char_id = int(match[0])
                chars[str(char_id)] = {
                    "rect": {
                        "x": int(match[1]),
                        "y": int(match[2]),
                        "width": int(match[3]),
                        "height": int(match[4]),
                    },
                    "xOffset": int(match[5]),
                    "yOffset": int(match[6]),
                    "xAdvance": int(match[7]),
                }

            return {
                "commonHeight": common_height,
                "fontSize": 48,
                "atlasName": texture_filename,
                "fontDefDictionary": chars,
                "kerningDict": {},
            }

        except Exception as e:
            print(f"WARNING Failed to parse fnt config from {fnt_path}: {str(e)}")
            return {
                "commonHeight": 47,
                "fontSize": 48,
                "atlasName": "Num_GetFree.png",
                "fontDefDictionary": {},
                "kerningDict": {},
            }

    def find_font_texture(self, fnt_path):
        """Find the texture file associated with a font file."""
        try:
            with open(fnt_path, "r", encoding="utf-8") as f:
                content = f.read()

            # Parse page line to get texture filename
            page_match = re.search(r'page id=0 file="([^"]+)"', content)
            if page_match:
                texture_filename = page_match.group(1)
                # Find the texture file in the same directory or input folder
                fnt_dir = Path(fnt_path).parent
                texture_path = fnt_dir / texture_filename

                # Check if texture exists in the same directory
                if texture_path.exists():
                    return str(texture_path)

                # Check in input folder
                for img_path in self.available_images:
                    if Path(img_path).name == texture_filename:
                        return img_path

        except Exception as e:
            print(f"WARNING Failed to find texture for font {fnt_path}: {str(e)}")

        return None

    def generate_font_meta_file(self, source_font, dest_path):
        """Generate .meta file for a font file with correct UUID."""
        # Get the font UUID
        font_uuid = self.get_font_uuid(source_font)
        if not font_uuid:
            return

        # Parse fnt file to extract font configuration
        fnt_config = self.parse_fnt_config(source_font)

        # Generate meta file content for font asset
        meta_content = {
            "ver": "1.0.6",
            "importer": "bitmap-font",
            "imported": True,
            "uuid": font_uuid,
            "files": [".json"],
            "subMetas": {},
            "userData": {
                "_fntConfig": fnt_config,
                "fontSize": 48,
                "textureUuid": "",  # Will be set later if texture is found
            },
        }

        # Find associated texture file
        texture_path = self.find_font_texture(source_font)
        if texture_path:
            texture_uuid = self.get_sprite_frame_uuid(texture_path)
            if texture_uuid:
                # Extract base UUID (remove @f9941 suffix if present)
                base_uuid = texture_uuid.split("@")[0]
                meta_content["userData"]["textureUuid"] = base_uuid

        # Write .meta file
        meta_path = Path(str(dest_path) + ".meta")
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta_content, f, indent=2, ensure_ascii=False)

    def validate_image_references(self, prefab_objects):
        """Validate that all image references in prefab are correct."""
        print(f"\nDEBUG Validating image references...")
        print("=" * 50)

        validation_results = {
            "total_references": 0,
            "valid_references": 0,
            "invalid_references": 0,
            "missing_images": [],
            "valid_images": [],
        }

        # Extract all UUID references from prefab objects
        def extract_uuids(obj):
            uuids = []
            if isinstance(obj, dict):
                for key, value in obj.items():
                    if key == "__uuid__" and isinstance(value, str):
                        uuids.append(value)
                    elif isinstance(value, (dict, list)):
                        uuids.extend(extract_uuids(value))
            elif isinstance(obj, list):
                for item in obj:
                    uuids.extend(extract_uuids(item))
            return uuids

        # Get all UUIDs from prefab
        all_uuids = extract_uuids(prefab_objects)
        sprite_frame_uuids = [uuid for uuid in all_uuids if uuid.endswith("@f9941")]

        validation_results["total_references"] = len(sprite_frame_uuids)

        # Check each UUID
        for uuid_ref in sprite_frame_uuids:
            # Find corresponding image using normalized path
            normalized_path = None
            for image_path, cached_uuid in self.image_cache.items():
                if cached_uuid == uuid_ref:
                    normalized_path = image_path
                    break

            if normalized_path:
                # 現在 path_mapping 的鍵與 image_cache 的鍵一致，可以直接查找
                actual_file_path = self.path_mapping.get(normalized_path)
                
                # 如果直接查找失敗，嘗試備用匹配
                if not actual_file_path:
                    normalized_filename = Path(normalized_path).name
                    for mapped_path, actual_path in self.path_mapping.items():
                        if Path(mapped_path).name == normalized_filename:
                            actual_file_path = actual_path
                            break
                
                if actual_file_path:
                    validation_results["valid_references"] += 1
                    validation_results["valid_images"].append(
                        {
                            "uuid": uuid_ref,
                            "image": Path(normalized_path).name,
                            "normalized_path": normalized_path,
                            "mapped_path": actual_file_path,
                        }
                    )
                    print(
                        f"Success Valid: {uuid_ref} -> {Path(normalized_path).name} (mapped to {actual_file_path})"
                    )
                else:
                    validation_results["invalid_references"] += 1
                    validation_results["missing_images"].append(
                        {
                            "uuid": uuid_ref,
                            "image": Path(normalized_path).name,
                            "normalized_path": normalized_path,
                            "reason": "Path mapping not found",
                        }
                    )
                    print(
                        f"ERROR Missing: {uuid_ref} -> {Path(normalized_path).name} (no path mapping found)"
                    )
            else:
                validation_results["invalid_references"] += 1
                validation_results["missing_images"].append(
                    {
                        "uuid": uuid_ref,
                        "image": "Unknown",
                        "reason": "UUID not found in cache",
                    }
                )
                print(f"ERROR Invalid: {uuid_ref} -> Unknown image")

        print("=" * 50)
        print(f"Stats Validation Summary:")
        print(f"  DEBUG Total references: {validation_results['total_references']}")
        print(f"  Success Valid references: {validation_results['valid_references']}")
        print(f"  ERROR Invalid references: {validation_results['invalid_references']}")
        print(f"  Folder Images ready: {len(self.copied_images)}")

        return validation_results

    def print_image_mapping_report(self):
        """Print a report of image mappings and resource usage for debugging."""
        print("\n=== Stats Resource Usage Report ===")
        print(f"DEBUG Found {len(self.available_images)} available images")
        print(f"Success Used {len(self.used_images)} images in prefabs")
        print(f"Folder Copied {len(self.copied_images)} images to output")
        print(f"MOVED Images moved to Font/Particle: {len(self.moved_images)}")

        # Calculate unused images
        unused_images = self.available_images - self.used_images
        print(f"Skip Unused images (not copied): {len(unused_images)}")

        if self.used_images:
            print(f"\nSuccess Used images in prefabs:")
            for img in sorted(self.used_images):
                print(f"  [EMOJI] {Path(img).name}")

        if self.moved_images:
            print(f"\nMOVED Images moved to Font/Particle directories:")
            for img in sorted(self.moved_images):
                print(f"  MOVED {Path(img).name}")

        if unused_images:
            print(f"\nSkip Unused images (skipped):")
            for img in sorted(unused_images):
                print(f"  - {Path(img).name}")

        # Resource efficiency metrics
        usage_percentage = (
            (len(self.used_images) / len(self.available_images) * 100)
            if self.available_images
            else 0
        )
        print(f"\n[EMOJI] Resource Efficiency:")
        print(
            f"  Stats Usage rate: {usage_percentage:.1f}% ({len(self.used_images)}/{len(self.available_images)})"
        )
        print(f"  Save Saved space: {len(unused_images)} unused files not copied")
        print(
            f"  Skip Avoided duplicates: {len(self.moved_images)} images moved to specific directories"
        )
        print("=" * 50)

    def save_resources_to_json(self, output_path=OUTPUT_RESOURCES_JSON):
        """Save resource UUID mappings to a JSON file for future reuse."""
        try:
            # 只保存必要的UUID映射資訊
            resources_data = {
                "version": "1.0",
                "timestamp": str(Path(__file__).stat().st_mtime),
                "image_cache": self.image_cache,  # 路徑 -> UUID 映射
                "particle_cache": self.particle_cache,  # 路徑 -> UUID 映射
                "font_cache": self.font_cache,  # 路徑 -> UUID 映射
                "csd_cache": self.csd_cache,  # 路徑 -> UUID 映射
                "path_mapping": self.path_mapping,  # 路徑映射，用於查找
            }

            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(resources_data, f, indent=2, ensure_ascii=False)

            total_resources = (
                len(self.image_cache) + len(self.particle_cache) + len(self.font_cache)
            )
            print(f"Save Resource UUID mappings saved to {output_path}")
            print(f"  Stats Total cached resources: {total_resources}")
            print(f"  Image  Images: {len(self.image_cache)}")
            print(f"  [EMOJI] Particles: {len(self.particle_cache)}")
            print(f"  [EMOJI] Fonts: {len(self.font_cache)}")

        except Exception as e:
            print(f"ERROR Failed to save resources to {output_path}: {str(e)}")

    def load_resources_from_json(self, input_path="resources.json"):
        """Load resource UUID mappings from a JSON file."""
        try:
            if not Path(input_path).exists():
                print(f"WARNING  Resources file not found: {input_path}")
                return False

            with open(input_path, "r", encoding="utf-8") as f:
                resources_data = json.load(f)

            # Validate version compatibility
            version = resources_data.get("version", "1.0")
            if version != "1.0":
                print(
                    f"WARNING  Resources file version {version} may not be compatible"
                )

            # Load image cache and filter to only include input directory entries
            raw_image_cache = resources_data.get("image_cache", {})
            self.image_cache = self._filter_input_paths(raw_image_cache)
            
            # Load other caches and filter to only include input directory entries
            raw_particle_cache = resources_data.get("particle_cache", {})
            self.particle_cache = self._filter_input_paths(raw_particle_cache)
            
            raw_font_cache = resources_data.get("font_cache", {})
            self.font_cache = self._filter_input_paths(raw_font_cache)
            
            raw_csd_cache = resources_data.get("csd_cache", {})
            self.csd_cache = self._filter_input_paths(raw_csd_cache)
            # Load path mapping and filter to only include input directory entries
            raw_path_mapping = resources_data.get("path_mapping", {})
            filtered_path_mapping = self._filter_input_paths_mapping(raw_path_mapping)
            
            # 確保 path_mapping 中的路徑使用正確的分隔符，鍵和值都使用標準化路徑
            normalized_path_mapping = {}
            for key, value in filtered_path_mapping.items():
                normalized_key = key.replace("\\", "/")
                # 對值也進行標準化處理，與 create_path_mapping_part 邏輯一致
                normalized_value = self.normalize_path_for_uuid_key(value) or value.replace("\\", "/")
                normalized_path_mapping[normalized_key] = normalized_value
            self.path_mapping = normalized_path_mapping

            # 將所有載入的UUID註冊到UUID管理器中，避免重複
            for uuid_str in self.image_cache.values():
                self.uuid_manager.register_existing_uuid(uuid_str)
            for uuid_str in self.particle_cache.values():
                self.uuid_manager.register_existing_uuid(uuid_str)
            for uuid_str in self.font_cache.values():
                self.uuid_manager.register_existing_uuid(uuid_str)
            for uuid_str in self.csd_cache.values():
                self.uuid_manager.register_existing_uuid(uuid_str)

            total_resources = (
                len(self.image_cache) + len(self.particle_cache) + len(self.font_cache) + len(self.csd_cache)
            )
            uuid_stats = self.uuid_manager.get_usage_stats()
            print(f"[EMOJI] Resource UUID mappings loaded from {input_path}")
            print(f"  Stats Total cached resources: {total_resources}")
            print(f"  Image  Images: {len(self.image_cache)}")
            print(f"  [EMOJI] Particles: {len(self.particle_cache)}")
            print(f"  [EMOJI] Fonts: {len(self.font_cache)}")
            print(f"  CSD CSDs: {len(self.csd_cache)}")
            print(f"  ID Registered UUIDs: {uuid_stats['total_uuids']}")

            return True

        except Exception as e:
            print(f"ERROR Failed to load resources from {input_path}: {str(e)}")
            return False

    def save_not_found_list(self, output_path="NotFoundList.txt"):
        """Save list of not found files to a text file."""
        try:
            if not self.not_found_files:
                print(
                    "Success No missing files found - all resources located successfully!"
                )
                return

            output_file = Path(output_path)
            with open(output_file, "w", encoding="utf-8") as f:
                f.write("# NotFoundList - Missing Resource Files\n")
                f.write("# Generated during CSD to Prefab conversion\n")
                f.write(f"# Total missing files: {len(self.not_found_files)}\n")
                f.write("# Format: Type: path/to/file\n\n")

                # Sort files by type and path for better organization
                sorted_files = sorted(self.not_found_files)
                for missing_file in sorted_files:
                    f.write(f"{missing_file}\n")

            print(f"[EMOJI] NotFoundList saved to: {output_file}")
            print(f"   Stats Total missing files: {len(self.not_found_files)}")

            # Show breakdown by type
            image_count = sum(1 for f in self.not_found_files if f.startswith("Image:"))
            particle_count = sum(
                1 for f in self.not_found_files if f.startswith("Particle:")
            )
            font_count = sum(1 for f in self.not_found_files if f.startswith("Font:"))
            plist_count = sum(1 for f in self.not_found_files if f.startswith("Plist:"))
            texture_count = sum(
                1 for f in self.not_found_files if f.startswith("Texture:")
            )

            print(f"   Image  Missing images: {image_count}")
            print(f"   [EMOJI] Missing particles: {particle_count}")
            print(f"   [EMOJI] Missing fonts: {font_count}")
            print(f"   [EMOJI] Missing plists: {plist_count}")
            print(f"   Color Missing textures: {texture_count}")

        except Exception as e:
            print(f"ERROR Failed to save NotFoundList to {output_path}: {str(e)}")

    def save_uuid_cache_to_json(self):
        """Save UUID cache to JSON file after all operations are complete."""
        try:
            # Check if there are any new UUIDs to save
            total_cached = (
                len(self.image_cache) + len(self.particle_cache) + len(self.font_cache) + len(self.csd_cache)
            )
            if total_cached == 0:
                print("Font No UUIDs to save")
                return

            # Save the UUID mappings
            if DO_OUTPUT_RESOURCES_JSON:
                self.save_resources_to_json()
                print(
                    f"Save UUID cache saved after processing: {total_cached} resources"
                )
            else:
                print(
                    f"Save UUID cache not saved after processing: {total_cached} resources"
                )

        except Exception as e:
            print(f"ERROR Failed to save UUID cache: {str(e)}")


class FileIdManager:
    """管理 fileId 的分配，確保同一個 prefab 內的 fileId 唯一且有序。"""

    def __init__(self):
        self.file_ids = []
        self.current_index = 0
        self.load_file_id_pool()

    def load_file_id_pool(self, pool_path="file_id_pool.json"):
        """從配置文件載入 fileId 池。"""
        try:
            with open(pool_path, "r", encoding="utf-8") as f:
                config = json.load(f)
            self.file_ids = config.get("file_ids", [])
            print(f"[EMOJI] 載入了 {len(self.file_ids)} 個 fileId")
        except FileNotFoundError:
            print(f"WARNING  fileId 池文件不存在: {pool_path}，將使用備用生成方法")
            self.file_ids = []
        except Exception as e:
            print(f"ERROR 載入 fileId 池時發生錯誤: {str(e)}，將使用備用生成方法")
            self.file_ids = []

    def get_next_file_id(self):
        """獲取下一個 fileId。"""
        if self.current_index < len(self.file_ids):
            file_id = self.file_ids[self.current_index]
            self.current_index += 1
            return file_id
        else:
            # 如果池用完了，生成新的 ID（備用方案）
            print(f"WARNING  fileId 池已用完，使用備用生成方法")
            chars = string.ascii_letters + string.digits
            return "".join(random.choice(chars) for _ in range(18))

    def reset_for_new_prefab(self):
        """為新的 prefab 重置 fileId 計數器。"""
        self.current_index = 0
        print(f"Processing 為新 prefab 重置 fileId 計數器")

    def get_usage_stats(self):
        """獲取 fileId 使用統計。"""
        return {
            "total_available": len(self.file_ids),
            "used_count": self.current_index,
            "remaining": max(0, len(self.file_ids) - self.current_index),
        }


class PrefabGenerator:
    """
    Generates Cocos Creator 3.8.1 compatible prefab files from CSD data.
    Enhanced with image resource management, validation, and animation support.
    """

    def __init__(
        self,
        input_folder=INPUT_FOLDER,
        shared_file_id_manager=None,
        shared_uuid_manager=None,
    ):
        self.objects = []  # All objects in the prefab
        self.current_id = 0  # Current ID counter
        self.root_name = "Prefab"
        self.prefab_uuid = None  # Will be set later when root_name is known
        # UUID 管理器 - 共用或建立新的
        self.uuid_manager = shared_uuid_manager or UUIDManager()
        self.image_manager = ImageResourceManager(self.uuid_manager)
        self.image_manager.scan_for_images(input_folder)
        self.material_manager = MaterialManager()
        self.material_manager.load_material_config()
        self.input_folder = input_folder
        # UUID mapping for prefabs to ensure consistent references
        self.prefab_uuid_mapping = {}
        # Animation clips to be exported as separate .anim files
        self.animation_clips = []
        self.animation_clip_uuids = {}
        # fileId 管理器
        if shared_file_id_manager:
            self.file_id_manager = shared_file_id_manager
        else:
            self.file_id_manager = FileIdManager()
        # Current prefab relative path for UUID collision prevention
        self.current_relative_path = None
        
        # Store PropertyGroup type for coordinate system handling
        self.property_group_type = "Node"  # Default to Node (Node/Layer/Scene)
        self.root_layer_size = {"width": 0, "height": 0}  # For Layer/Scene types
        
        # Store node information for animation coordinate conversion
        # {node_path: {"anchor": {...}, "size": {...}, "parent_path": ...}}
        self.node_info_map = {}

    def generate_uuid(self):
        """Generate a UUID in the format used by Cocos Creator."""
        return self.uuid_manager.generate_unique_uuid("base")

    def generate_file_id(self):
        """Generate a file ID for PrefabInfo objects using the managed pool."""
        return self.file_id_manager.get_next_file_id()

    def get_prefab_uuid_by_name(self, prefab_name, relative_path=None):
        """Get the UUID for a prefab by its name and optional relative path."""
        # Create a unique key that includes both name and path for collision prevention
        if relative_path:
            # Use relative path to create unique key for same-named prefabs in different locations
            prefab_key = f"{relative_path}#{prefab_name}"
        else:
            # Fallback to just name for backward compatibility
            prefab_key = prefab_name

        # First check if we already have this UUID in our mapping
        if prefab_key in self.prefab_uuid_mapping:
            return self.prefab_uuid_mapping[prefab_key]

        # Check ImageResourceManager's CSD cache if available and relative_path exists
        if relative_path and self.image_manager:
            # Try to get UUID from CSD cache using relative path
            csd_path = relative_path.replace(".prefab", ".csd")
            cached_uuid = self.image_manager.get_csd_uuid(csd_path)
            if cached_uuid:
                print(f"CSD Using ImageResourceManager cached UUID for {prefab_key}: {cached_uuid}")
                self.prefab_uuid_mapping[prefab_key] = cached_uuid
                return cached_uuid

        # Predefined UUIDs for known prefabs to match reference versions
        known_prefab_uuids = {
            "CheckBox": "47861887-5bbd-47a6-a760-919a7b7603a0",
            "ListViewCell": "430ad994-828d-4b42-84cb-cfd696001395",
            # Add more known UUIDs as needed
        }

        # Use known UUID if available (only for prefabs without path)
        if not relative_path and prefab_name in known_prefab_uuids:
            prefab_uuid = known_prefab_uuids[prefab_name]
            self.prefab_uuid_mapping[prefab_key] = prefab_uuid
            return prefab_uuid

        # Try to read from existing .meta file in output directory (only for prefabs without path)
        if not relative_path:
            meta_file_paths = []

            for meta_path in meta_file_paths:
                try:
                    if Path(meta_path).exists():
                        with open(meta_path, "r", encoding="utf-8") as f:
                            meta_data = json.load(f)
                            prefab_uuid = meta_data.get("uuid", "")
                            if prefab_uuid:
                                self.prefab_uuid_mapping[prefab_key] = prefab_uuid
                                return prefab_uuid
                except Exception as e:
                    continue

        # Generate a deterministic UUID based on the unique key (name + path)
        # This ensures consistent UUIDs across runs for the same prefab name+path combination
        import hashlib

        key_hash = hashlib.md5(prefab_key.encode("utf-8")).hexdigest()
        # Convert hash to UUID format
        prefab_uuid = f"{key_hash[:8]}-{key_hash[8:12]}-{key_hash[12:16]}-{key_hash[16:20]}-{key_hash[20:32]}"

        # Store in both local mapping and ImageResourceManager cache
        self.prefab_uuid_mapping[prefab_key] = prefab_uuid
        
        # Also store in ImageResourceManager's CSD cache for cross-file reference
        if relative_path and self.image_manager:
            csd_path = relative_path.replace(".prefab", ".csd")
            # Use normalized path as cache key for consistency
            normalized_csd_path = self.image_manager.normalize_path_for_uuid_key(csd_path)
            self.image_manager.csd_cache[normalized_csd_path] = prefab_uuid
            print(f"CSD Cached UUID in ImageResourceManager for normalized path {normalized_csd_path}: {prefab_uuid}")
        
        print(
            f"[EMOJI] Generated UUID for prefab '{prefab_name}' with key '{prefab_key}': {prefab_uuid}"
        )
        return prefab_uuid

    def get_next_id(self):
        """Get the next available ID."""
        id_val = self.current_id
        self.current_id += 1
        return id_val

    def add_object(self, obj):
        """Add an object to the prefab and assign it an ID."""
        obj_id = self.get_next_id()
        self.objects.append(obj)
        return obj_id

    def create_prefab_info(self, root_id, asset_id, file_id, instance=None):
        """Create a PrefabInfo object."""
        return {
            "__type__": "cc.PrefabInfo",
            "root": {"__id__": root_id},
            "asset": {"__id__": asset_id},
            "fileId": file_id,
            "instance": instance,
            "targetOverrides": None,
            "nestedPrefabInstanceRoots": None,
        }

    def create_comp_prefab_info(self, file_id):
        """Create a CompPrefabInfo object."""
        return {"__type__": "cc.CompPrefabInfo", "fileId": file_id}

    def create_prefab_object(self, name, data_id):
        """Create the main Prefab object."""
        return {
            "__type__": "cc.Prefab",
            "_name": name,
            "_objFlags": 0,
            "__editorExtras__": {},
            "_native": "",
            "data": {"__id__": data_id},
            "optimizationPolicy": 0,
            "persistent": False,
        }

    def create_node(
        self,
        name,
        parent_id=None,
        position=None,
        scale=None,
        rotation=0,
        is_root=False,
        active=True,
    ):
        """Create a Node object."""
        if position is None:
            position = {"x": 0, "y": 0, "z": 0}
        if scale is None:
            scale = {"x": 1, "y": 1, "z": 1}

        # 傳進來的 rotation 是角度(順時針)
        # 需要轉換成四元數
        eularRot = float(rotation)
        if eularRot.is_integer():
            eularRot = int(eularRot)
        while eularRot > 360:
            eularRot -= 360
        while eularRot < -360:
            eularRot += 360
        if eularRot != 0:
            # 只處理 Z 軸旋轉（2D UI）
            z_rad = math.radians(-eularRot if eularRot is not None else 0)
            cz = math.cos(z_rad * 0.5)
            if cz.is_integer():
                cz = int(cz)
            else:
                cz = float(cz)
            sz = math.sin(z_rad * 0.5)
            if sz.is_integer():
                sz = int(sz)
            else:
                sz = float(sz)
            rot = {"x": 0, "y": 0, "z": sz, "w": cz}
        else:
            rot = {"x": 0, "y": 0, "z": 0, "w": 1}

        node = {
            "__type__": "cc.Node",
            "_name": name,
            "_objFlags": 0,
            "__editorExtras__": {},
            "_parent": {"__id__": parent_id} if parent_id is not None else None,
            "_children": [],
            "_active": active,
            "_components": [],
            "_prefab": None,  # Will be set later
            "_lpos": {
                "__type__": "cc.Vec3",
                "x": (
                    int(position["x"])
                    if float(position["x"]).is_integer()
                    else float(position["x"])
                ),
                "y": (
                    int(position["y"])
                    if float(position["y"]).is_integer()
                    else float(position["y"])
                ),
                "z": (
                    int(position["z"])
                    if float(position["z"]).is_integer()
                    else float(position["z"])
                ),
            },
            "_lrot": {
                "__type__": "cc.Quat",
                "x": rot["x"],
                "y": rot["y"],
                "z": rot["z"],
                "w": rot["w"],
            },
            "_lscale": {
                "__type__": "cc.Vec3",
                "x": (
                    int(scale["x"])
                    if float(scale["x"]).is_integer()
                    else float(scale["x"])
                ),
                "y": (
                    int(scale["y"])
                    if float(scale["y"]).is_integer()
                    else float(scale["y"])
                ),
                "z": (
                    int(scale["z"])
                    if float(scale["z"]).is_integer()
                    else float(scale["z"])
                ),
            },
            "_mobility": 0,
            "_layer": 1073741824,  # DEFAULT layer for all UI nodes (2D layer)
            "_euler": {"__type__": "cc.Vec3", "x": 0, "y": 0, "z": -eularRot},
            "_id": "",
        }

        return node

    def create_button_component(self, node_id, node_dict=None):
        """Create a custom Button component (e2406ON2hRFILHcZ+8ustI9)."""
        button_component = {
            "__type__": "e2406ON2hRFILHcZ+8ustI9",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": {"__id__": node_id},
            "_enabled": True,
            "__prefab": None,  # Will be set later
            "m_tag": 0,
            "m_touchEnabled": True,
            "m_swallowTouch": True,
            "m_nodeEventEnabled": True,
            "m_coolTime": 125,
            "m_longTouchEnabled": False,
            "m_longTouchStartTime": 1,
            "m_longTouchIntervalTime": 0.1,
            "m_eventTouchSource": None,
            "m_eventTouchSenders": [],
            "m_eventTouchReceivers": [],
            "m_clickSoundType": 1,
            "m_normalNodes": [],
            "m_pressedNodes": [],
            "m_disabledNodes": [],
            "m_colorMode": 0,
            "m_coloringSelf": False,
            "m_coloringDuration": 0.125,
            "m_normalColor": {
                "__type__": "cc.Color",
                "r": 255,
                "g": 255,
                "b": 255,
                "a": 255,
            },
            "m_pressedColor": {
                "__type__": "cc.Color",
                "r": 200,
                "g": 200,
                "b": 200,
                "a": 255,
            },
            "m_disabledColor": {
                "__type__": "cc.Color",
                "r": 150,
                "g": 150,
                "b": 150,
                "a": 255,
            },
            "m_coloringTargets": [],
            "m_sizeMode": 0,
            "m_scalingSelf": False,
            "m_scalingDuration": 0.125,
            "m_normalSize": 1,
            "m_pressedSize": 1.05,
            "m_disabledSize": 1,
            "m_scalingTargets": [],
            "_id": "",
        }

        return button_component

    def create_label_component(
        self,
        node_id,
        text="",
        font_size=20,
        color=None,
        font_path=None,
        node_dict=None,
        inherited_color=None,
    ):
        """Create a Label component."""
        # Use specified color or default white
        if color is None:
            color = {"r": 255, "g": 255, "b": 255, "a": 255}

        # Apply color inheritance if inherited_color is provided
        final_color = color

        # Handle font reference
        font_ref = None
        is_system_font = True
        font_family = "Arial"

        if font_path:
            font_ref = self.image_manager.create_font_reference(font_path)
            if font_ref:
                is_system_font = False
                print(f"Font Using bitmap font: {Path(font_path).name}")
            else:
                print(
                    f"WARNING  Font not found, falling back to system font: {font_path}"
                )

        # Determine overflow mode based on IsCustomSize
        overflow_mode = 0  # Default: NONE
        if node_dict and node_dict.get("@IsCustomSize", "").lower() == "true":
            overflow_mode = 3  # CLAMP if IsCustomSize is true
            node_name = node_dict.get("@Name", "Unknown")
            print(
                f"[EMOJI] Label {node_name} has IsCustomSize=True, setting overflow to CLAMP (3)"
            )

        return {
            "__type__": "cc.Label",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": {"__id__": node_id},
            "_enabled": True,
            "__prefab": None,  # Will be set later
            "_customMaterial": None,
            "_srcBlendFactor": 2,
            "_dstBlendFactor": 4,
            "_color": {
                "__type__": "cc.Color",
                "r": final_color["r"],
                "g": final_color["g"],
                "b": final_color["b"],
                "a": final_color["a"],
            },
            "_string": text,
            "_horizontalAlign": 0,
            "_verticalAlign": 1,
            "_actualFontSize": font_size,
            "_fontSize": font_size,
            "_fontFamily": font_family,
            "_lineHeight": font_size,
            "_overflow": overflow_mode,
            "_enableWrapText": True,
            "_font": font_ref,
            "_isSystemFontUsed": is_system_font,
            "_spacingX": 0,
            "_isItalic": False,
            "_isBold": False,
            "_isUnderline": False,
            "_underlineHeight": 2,
            "_cacheMode": 0,
            "_id": "",
        }

    def create_sprite_component(self, node_id, node_dict=None, inherited_color=None):
        """Create a Sprite component with image reference and custom material support."""
        # Use inherited color if provided, otherwise use default white
        r, g, b = 255, 255, 255
        alpha_value = 255

        if inherited_color:
            # Use the inherited color (already calculated with Studio's color multiplication)
            r, g, b = inherited_color["r"], inherited_color["g"], inherited_color["b"]
            alpha_value = inherited_color.get("a", 255)
        elif node_dict:
            node_name = node_dict.get("@Name", "Unknown")

            # Extract RGB values from CColor if available (fallback for when inherited_color is not provided)
            if "CColor" in node_dict:
                ccolor_data = node_dict["CColor"]
                if isinstance(ccolor_data, dict):
                    r = int(ccolor_data.get("@R", 255))
                    g = int(ccolor_data.get("@G", 255))
                    b = int(ccolor_data.get("@B", 255))
                    print(f"Color Sprite color for {node_name}: R{r} G{g} B{b}")

        _ctype = node_dict.get("@ctype", "")

        if node_dict:
            node_name = node_dict.get("@Name", "Unknown")

            # Extract alpha from node Alpha attribute if available
            if "@Alpha" in node_dict:
                alpha_value = int(node_dict.get("@Alpha", 255))
                if alpha_value != 255:
                    print(
                        f"DEBUG Alpha transparency for sprite {node_name}: {alpha_value}/255"
                    )

        # Determine if this is a SpriteObjectData (which affects default sizeMode)
        is_sprite_object_data = node_dict and "SpriteObjectData" in _ctype

        # Check if Scale9Enable is true to determine if trimmed mode should be used
        is_scale9_enabled = (
            node_dict and node_dict.get("@Scale9Enable", "").lower() == "true"
        )

        # Check for FlipX and FlipY attributes
        flip_x = node_dict and node_dict.get("@FlipX", "").lower() == "true"
        flip_y = node_dict and node_dict.get("@FlipY", "").lower() == "true"
        has_flip = flip_x or flip_y

        # Set default sizeMode based on whether it's SpriteObjectData
        default_size_mode = 0

        if is_scale9_enabled:
            default_size_mode = 1

        if is_sprite_object_data:
            default_size_mode = 2

        default_type = 1 if is_scale9_enabled else 0

        # Use custom sprite type if FlipX or FlipY is enabled
        sprite_type = "14f89QfkBhP+J05UuPVB4yn" if has_flip else "cc.Sprite"

        sprite_component = {
            "__type__": sprite_type,
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": {"__id__": node_id},
            "_enabled": True,
            "__prefab": None,  # Will be set later
            "_customMaterial": None,
            "_srcBlendFactor": 2,
            "_dstBlendFactor": 4,
            "_color": {
                "__type__": "cc.Color",
                "r": r,
                "g": g,
                "b": b,
                "a": alpha_value,
            },
            "_spriteFrame": None,
            "_type": default_type,
            "_fillType": 0,
            "_sizeMode": default_size_mode,
            "_fillCenter": {"__type__": "cc.Vec2", "x": 0, "y": 0},
            "_fillStart": 0,
            "_fillRange": 0,
            "_isTrimmedMode": is_scale9_enabled,  # Only true when Scale9Enable="True"
            "_useGrayscale": False,
            "_atlas": None,
            "_id": "",
        }

        # Add flip properties if using custom sprite type
        if has_flip:
            sprite_component["m_isFlipX"] = flip_x
            sprite_component["m_isFlipY"] = flip_y
            if node_dict:
                node_name = node_dict.get("@Name", "Unknown")
                print(f"Color Sprite {node_name} using custom flip type: FlipX={flip_x}, FlipY={flip_y}")

        # Handle BlendFunc for custom materials (don't set blend factors directly, let material handle it)
        if node_dict and "BlendFunc" in node_dict:
            blend_func = node_dict["BlendFunc"]
            if isinstance(blend_func, dict):
                src = blend_func.get("@Src", "")
                dst = blend_func.get("@Dst", "")

                if src and dst:
                    try:
                        src_val = int(src)
                        dst_val = int(dst)

                        if (src == 1 or dst == 771):
                            # Get custom material reference (don't set blend factors directly)
                            material_ref = (
                                self.material_manager.create_material_reference(
                                    src_val, dst_val
                                )
                            )
                            if material_ref:
                                sprite_component["_customMaterial"] = material_ref
                                node_name = node_dict.get("@Name", "Unknown")
                                print(
                                    f"Color Applied custom material to {node_name}: BlendFunc({src_val}, {dst_val})"
                                )
                            else:
                                print(
                                    f"WARNING No material found for BlendFunc({src_val}, {dst_val})"
                                )

                    except ValueError:
                        print(f"WARNING Invalid BlendFunc values: Src={src}, Dst={dst}")

        # Extract image reference from CSD node data
        if node_dict:
            image_path = None

            # For Button nodes, use NormalFileData as the sprite frame
            if "NormalFileData" in node_dict:
                image_path = node_dict["NormalFileData"].get("@Path", "")
            # For regular Sprite/ImageView nodes, use FileData
            elif "FileData" in node_dict:
                image_path = node_dict["FileData"].get("@Path", "")

            if image_path:
                # Check if path starts with "Default/" - these represent non-existent resources
                if image_path.startswith("Default/"):
                    print(f"Skip Skipping Default resource for sprite: {image_path}")
                else:
                    sprite_frame = self.image_manager.create_sprite_frame_reference(
                        image_path
                    )
                    if sprite_frame:
                        sprite_component["_spriteFrame"] = sprite_frame

                        # Check if this image has scale9 information
                        actual_image = self.image_manager.find_image_file(image_path)
                        if actual_image and self.image_manager.has_scale9_info(
                            actual_image
                        ):
                            sprite_component["_type"] = 1  # Sliced mode for scale9
                            sprite_component["_sizeMode"] = (
                                0  # Custom mode for sliced sprites
                            )
                            print(
                                f"[EMOJI] Set sliced mode for sprite with scale9: {image_path}"
                            )

        return sprite_component

    def create_background_sprite_if_needed(self, node_id, node_dict, node_name):
        """Create background sprite for Panel/ScrollView based on ComboBoxIndex."""
        # Check for background based on ComboBoxIndex only
        has_background = False
        combo_box_index = node_dict.get("@ComboBoxIndex", "")

        if combo_box_index in ["1", "2"]:
            has_background = True
            print(
                f"Color {node_name} has ComboBoxIndex={combo_box_index}, creating background"
            )
        else:
            print(
                f"Skip {node_name} has no ComboBoxIndex, skipping background creation"
            )

        if not has_background:
            return None

        # Set color from SingleColor and BackColorAlpha
        r, g, b = 255, 255, 255  # Default white
        a = 255  # Default alpha

        if "SingleColor" in node_dict:
            single_color = node_dict["SingleColor"]
            if isinstance(single_color, dict):
                r = int(single_color.get("@R", 255))
                g = int(single_color.get("@G", 255))
                b = int(single_color.get("@B", 255))

        # Use BackColorAlpha for transparency, not SingleColor A value
        if "@BackColorAlpha" in node_dict:
            a = int(node_dict.get("@BackColorAlpha", 255))
            print(f"DEBUG Using BackColorAlpha for {node_name}: {a}/255")

        background_color = {"r": r, "g": g, "b": b, "a": a}

        # Create white background sprite
        bg_sprite = self.create_white_background_sprite(node_id, background_color)
        bg_sprite_id = self.add_object(bg_sprite)

        # Create CompPrefabInfo for background sprite
        bg_sprite_prefab_info = self.create_comp_prefab_info(self.generate_file_id())
        bg_sprite_prefab_info_id = self.add_object(bg_sprite_prefab_info)

        # Set references
        bg_sprite["__prefab"] = {"__id__": bg_sprite_prefab_info_id}

        print(
            f"Color Added background sprite to {node_name} (R:{r}, G:{g}, B:{b}, A:{a})"
        )

        return {"sprite": bg_sprite, "sprite_id": bg_sprite_id}

    def create_filedata_background_node(
        self, parent_id, node_dict, panel_size, panel_anchor
    ):
        """Create a background Sprite node from FileData for PanelObjectData."""
        if "FileData" not in node_dict:
            return None

        file_data = node_dict["FileData"]
        image_path = file_data.get("@Path", "")

        if not image_path:
            return None

        print(f"Image  Creating FileData background sprite for image: {image_path}")

        # Get the original image size instead of using panel size or trimmed size
        image_width, image_height = self.image_manager.get_original_size(image_path)
        print(f"[EMOJI] Background image original size: {image_width}x{image_height}")

        # Calculate position based on panel anchor
        # Background sprite anchor is always (0.5, 0.5) and positioned at panel center
        panel_width = panel_size["width"]
        panel_height = panel_size["height"]
        anchor_x = panel_anchor["x"]
        anchor_y = panel_anchor["y"]

        # Calculate position to center the background sprite in the panel
        # If panel anchor is (0.5, 0.5), sprite position should be (0, 0)
        # If panel anchor is (0, 0), sprite position should be (width/2, height/2)
        bg_x = (0.5 - anchor_x) * panel_width
        bg_y = (0.5 - anchor_y) * panel_height

        # Create background node with center anchor
        bg_node = self.create_node(
            "Panel_BG_Image",
            parent_id,
            {"x": bg_x, "y": bg_y, "z": 0},
            {"x": 1.0, "y": 1.0, "z": 1.0},
            0,
            False,  # Not root
            True,  # Active
        )
        bg_node_id = self.add_object(bg_node)

        # Create PrefabInfo for background node
        bg_prefab_info = self.create_prefab_info(1, 0, self.generate_file_id())
        bg_prefab_info_id = self.add_object(bg_prefab_info)
        bg_node["_prefab"] = {"__id__": bg_prefab_info_id}

        # Create UITransform for background node with center anchor using image size
        bg_ui_transform = self.create_ui_transform_component(
            bg_node_id, image_width, image_height, 0.5, 0.5
        )
        bg_ui_transform_id = self.add_object(bg_ui_transform)

        # Create CompPrefabInfo for UITransform
        bg_ui_prefab_info = self.create_comp_prefab_info(self.generate_file_id())
        bg_ui_prefab_info_id = self.add_object(bg_ui_prefab_info)
        bg_ui_transform["__prefab"] = {"__id__": bg_ui_prefab_info_id}
        bg_node["_components"].append({"__id__": bg_ui_transform_id})

        # Create Sprite component for background with specific settings
        # _sizeMode = 2, _type = 0 as required
        sprite_frame_ref = self.image_manager.create_sprite_frame_reference(image_path)

        bg_sprite_component = {
            "__type__": "cc.Sprite",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": {"__id__": bg_node_id},
            "_enabled": True,
            "__prefab": None,  # Will be set later
            "_customMaterial": None,
            "_srcBlendFactor": 2,
            "_dstBlendFactor": 4,
            "_color": {"__type__": "cc.Color", "r": 255, "g": 255, "b": 255, "a": 255},
            "_spriteFrame": sprite_frame_ref,
            "_type": 0,
            "_fillType": 0,
            "_sizeMode": 2,
            "_fillCenter": {"__type__": "cc.Vec2", "x": 0, "y": 0},
            "_fillStart": 0,
            "_fillRange": 0,
            "_isTrimmedMode": True,
            "_useGrayscale": False,
            "_atlas": None,
            "_id": "",
        }
        bg_sprite_component_id = self.add_object(bg_sprite_component)

        # Create CompPrefabInfo for Sprite component
        bg_sprite_prefab_info = self.create_comp_prefab_info(self.generate_file_id())
        bg_sprite_prefab_info_id = self.add_object(bg_sprite_prefab_info)
        bg_sprite_component["__prefab"] = {"__id__": bg_sprite_prefab_info_id}
        bg_node["_components"].append({"__id__": bg_sprite_component_id})

        print(
            f"Success Created FileData background node at position ({bg_x:.1f}, {bg_y:.1f}) with size {image_width}x{image_height}"
        )

        return bg_node_id

    def create_background_color_node(
        self, parent_id, node_dict, panel_size, panel_anchor, background_result
    ):
        """Create a Panel_BG_Color node from background_result for PanelObjectData."""
        if not background_result:
            return None

        print(f"Color Creating Panel_BG_Color background node")

        # Use panel size (not image size like create_filedata_background_node)
        panel_width = panel_size["width"]
        panel_height = panel_size["height"]
        anchor_x = panel_anchor["x"]
        anchor_y = panel_anchor["y"]

        # Calculate position to center the background sprite in the panel
        # If panel anchor is (0.5, 0.5), sprite position should be (0, 0)
        # If panel anchor is (0, 0), sprite position should be (width/2, height/2)
        bg_x = (0.5 - anchor_x) * panel_width
        bg_y = (0.5 - anchor_y) * panel_height

        # Create background color node with center anchor
        bg_node = self.create_node(
            "Panel_BG_Color",
            parent_id,
            {"x": bg_x, "y": bg_y, "z": 0},
            {"x": 1.0, "y": 1.0, "z": 1.0},
            0,
            False,  # Not root
            True,  # Active
        )
        bg_node_id = self.add_object(bg_node)

        # Create PrefabInfo for background node
        bg_prefab_info = self.create_prefab_info(1, 0, self.generate_file_id())
        bg_prefab_info_id = self.add_object(bg_prefab_info)
        bg_node["_prefab"] = {"__id__": bg_prefab_info_id}

        # Create UITransform for background node with center anchor using panel size
        bg_ui_transform = self.create_ui_transform_component(
            bg_node_id, panel_width, panel_height, 0.5, 0.5
        )
        bg_ui_transform_id = self.add_object(bg_ui_transform)

        # Create CompPrefabInfo for UITransform
        bg_ui_prefab_info = self.create_comp_prefab_info(self.generate_file_id())
        bg_ui_prefab_info_id = self.add_object(bg_ui_prefab_info)
        bg_ui_transform["__prefab"] = {"__id__": bg_ui_prefab_info_id}
        bg_node["_components"].append({"__id__": bg_ui_transform_id})

        # Use the existing background sprite but attach it to the background node instead
        background_sprite = background_result["sprite"]
        background_sprite["node"] = {"__id__": bg_node_id}  # Change the node reference
        sprite_id = self.add_object(background_sprite)

        # Create CompPrefabInfo for Sprite component
        bg_sprite_prefab_info = self.create_comp_prefab_info(self.generate_file_id())
        bg_sprite_prefab_info_id = self.add_object(bg_sprite_prefab_info)
        background_sprite["__prefab"] = {"__id__": bg_sprite_prefab_info_id}
        bg_node["_components"].append({"__id__": sprite_id})

        print(
            f"Success Created Panel_BG_Color node at position ({bg_x:.1f}, {bg_y:.1f}) with size {panel_width}x{panel_height}"
        )

        return bg_node_id

    def create_block_input_events_component(self, node_id):
        """Create a BlockInputEvents component for touch blocking."""
        return {
            "__type__": "cc.BlockInputEvents",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": {"__id__": node_id},
            "_enabled": True,
            "__prefab": None,  # Will be set later
            "_id": "",
        }

    def create_scrollview_component(self, node_id, content_node_id, node_dict=None):
        """Create a ScrollView component."""
        # Extract scroll direction from CSD data
        scroll_direction = (
            node_dict.get("@ScrollDirectionType", "Vertical")
            if node_dict
            else "Vertical"
        )
        horizontal = scroll_direction.lower() in ["horizontal", "both"]
        vertical = scroll_direction.lower() in ["vertical", "both"]
        elastic = node_dict.get("@IsBounceEnabled", "False") if node_dict else "False"
        if elastic.lower() == "true":
            elastic = True
        else:
            elastic = False

        return {
            "__type__": "cc.ScrollView",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": {"__id__": node_id},
            "_enabled": True,
            "__prefab": None,  # Will be set later
            "bounceDuration": 1,
            "brake": 0.5,
            "elastic": elastic,
            "inertia": True,
            "horizontal": horizontal,
            "vertical": vertical,
            "cancelInnerEvents": True,
            "scrollEvents": [],
            "_content": {"__id__": content_node_id},
            "_horizontalScrollBar": None,
            "_verticalScrollBar": None,
            "_id": "",
        }

    def create_mask_component(self, node_id, enabled=True):
        """Create a Mask component for ScrollView content."""
        return {
            "__type__": "cc.Mask",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": {"__id__": node_id},
            "_enabled": enabled,
            "__prefab": None,  # Will be set later
            "_type": 0,
            "_inverted": False,
            "_segments": 64,
            "_alphaThreshold": 0.1,
            "_id": "",
        }

    def create_graphics_component(self, node_id):
        """Create a Graphics component for ScrollView content background."""
        return {
            "__type__": "cc.Graphics",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": {"__id__": node_id},
            "_enabled": True,
            "__prefab": None,  # Will be set later
            "_customMaterial": None,
            "_srcBlendFactor": 2,
            "_dstBlendFactor": 4,
            "_color": {"__type__": "cc.Color", "r": 255, "g": 255, "b": 255, "a": 255},
            "_lineWidth": 1,
            "_strokeColor": {"__type__": "cc.Color", "r": 0, "g": 0, "b": 0, "a": 255},
            "_lineJoin": 2,
            "_lineCap": 0,
            "_fillColor": {
                "__type__": "cc.Color",
                "r": 255,
                "g": 255,
                "b": 255,
                "a": 0,
            },
            "_miterLimit": 10,
            "_id": "",
        }

    def create_uiskew_component(self, node_id, skew_x=0, skew_y=0, rotational=True):
        """Create a UISkew component for nodes with different RotationSkewX and RotationSkewY."""
        return {
            "__type__": "cc.UISkew",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": {"__id__": node_id},
            "_enabled": True,
            "__prefab": None,  # Will be set later
            "_skew": {
                "__type__": "cc.Vec2",
                "x": skew_x,
                "y": skew_y,
            },
            "_rotational": rotational,
            "_id": "",
        }

    def create_particle_system_component(self, node_id, node_dict=None):
        """Create a ParticleSystem2D component with BlendFunc support."""
        particle_component = {
            "__type__": "cc.ParticleSystem2D",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": {"__id__": node_id},
            "_enabled": True,
            "__prefab": None,  # Will be set later
            "_customMaterial": None,
            "_srcBlendFactor": 2,
            "_dstBlendFactor": 4,
            "_color": {"__type__": "cc.Color", "r": 255, "g": 255, "b": 255, "a": 255},
            "duration": -1,
            "emissionRate": 37.142857142857146,
            "life": 0.7,
            "lifeVar": 0.3,
            "angle": 90,
            "angleVar": 180,
            "startSize": 35,
            "startSizeVar": 10,
            "endSize": 10,
            "endSizeVar": 5,
            "startSpin": 0,
            "startSpinVar": 0,
            "endSpin": 0,
            "endSpinVar": 0,
            "sourcePos": {"__type__": "cc.Vec2", "x": 0, "y": 0},
            "posVar": {"__type__": "cc.Vec2", "x": 10, "y": 10},
            "emitterMode": 0,
            "gravity": {"__type__": "cc.Vec2", "x": 0, "y": 0},
            "speed": 10,
            "speedVar": 86,
            "tangentialAccel": 0,
            "tangentialAccelVar": 0,
            "radialAccel": 35,
            "radialAccelVar": 0,
            "rotationIsDir": False,
            "startRadius": 0,
            "startRadiusVar": 0,
            "endRadius": 0,
            "endRadiusVar": 0,
            "rotatePerS": 0,
            "rotatePerSVar": 0,
            "playOnLoad": True,
            "autoRemoveOnFinish": False,
            "_preview": True,
            "preview": True,
            "_custom": False,
            "_file": None,
            "_spriteFrame": None,
            "_totalParticles": 26,
            "_startColor": {
                "__type__": "cc.Color",
                "r": 255,
                "g": 255,
                "b": 255,
                "a": 255,
            },
            "_startColorVar": {"__type__": "cc.Color", "r": 0, "g": 0, "b": 0, "a": 12},
            "_endColor": {"__type__": "cc.Color", "r": 255, "g": 173, "b": 0, "a": 153},
            "_endColorVar": {"__type__": "cc.Color", "r": 0, "g": 0, "b": 0, "a": 0},
            "_positionType": 0,
            "_id": "",
        }

        # Handle BlendFunc for custom materials (don't set blend factors directly, let material handle it)
        if node_dict and "BlendFunc" in node_dict:
            blend_func = node_dict["BlendFunc"]
            if isinstance(blend_func, dict):
                src = blend_func.get("@Src", "")
                dst = blend_func.get("@Dst", "")

                if src and dst:
                    try:
                        src_val = int(src)
                        dst_val = int(dst)

                        if src_val == 775 and dst_val == 1:
                            src_val = 770
                            dst_val = 772

                        # Apply custom material for this BlendFunc (don't set blend factors directly)
                        material_ref = self.material_manager.create_material_reference(
                            src_val, dst_val
                        )
                        if material_ref:
                            particle_component["_customMaterial"] = material_ref
                            node_name = node_dict.get("@Name", "Unknown")
                            print(
                                f"Color Applied custom material to particle {node_name}: BlendFunc({src_val}, {dst_val})"
                            )
                        else:
                            print(
                                f"WARNING No material found for particle BlendFunc({src_val}, {dst_val})"
                            )

                    except ValueError:
                        print(
                            f"WARNING Invalid BlendFunc values for particle: Src={src}, Dst={dst}"
                        )
        else:
            # Apply default material for default BlendFunc (1, 771)
            material_ref = self.material_manager.create_material_reference(770, 772)
            if material_ref:
                particle_component["_customMaterial"] = material_ref

        # Extract particle file reference from CSD node data
        if node_dict and "FileData" in node_dict:
            particle_path = node_dict["FileData"].get("@Path", "")
            if particle_path:
                # Check if path starts with "Default/" - these represent non-existent resources
                if particle_path.startswith("Default/"):
                    print(
                        f"Skip Skipping Default resource for particle: {particle_path}"
                    )
                else:
                    particle_ref = self.image_manager.create_particle_reference(
                        particle_path
                    )
                    if particle_ref:
                        particle_component["_file"] = particle_ref

        return particle_component

    def create_white_background_sprite(self, node_id, color=None):
        """Create a white background sprite using white.png."""
        # Default color is white if not specified
        if color is None:
            color = {"r": 255, "g": 255, "b": 255, "a": 255}

        # Apply default material for white background sprites
        material_ref = self.material_manager.create_material_reference(1, 771)

        sprite_component = {
            "__type__": "cc.Sprite",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": {"__id__": node_id},
            "_enabled": True,
            "__prefab": None,  # Will be set later
            "_customMaterial": material_ref,
            "_srcBlendFactor": 2,
            "_dstBlendFactor": 4,
            "_color": {
                "__type__": "cc.Color",
                "r": color["r"],
                "g": color["g"],
                "b": color["b"],
                "a": color["a"],
            },
            "_spriteFrame": None,
            "_type": 0,
            "_fillType": 0,
            "_sizeMode": 0,
            "_fillCenter": {"__type__": "cc.Vec2", "x": 0, "y": 0},
            "_fillStart": 0,
            "_fillRange": 0,
            "_isTrimmedMode": True,
            "_useGrayscale": False,
            "_atlas": None,
            "_id": "",
        }

        # Try to find white image - only add if it actually exists
        # Try multiple possible paths for white background image

        white_sprite_frame = {
            "__uuid__": "a517507e-1608-4ba1-b411-c5106e24d65f@f9941",
            "__expectedType__": "cc.SpriteFrame",
        }

        if white_sprite_frame:
            sprite_component["_spriteFrame"] = white_sprite_frame
        else:
            print(
                f"WARNING  No white background image found, sprite will use solid color only"
            )

        return sprite_component

    def process_animation_data(self, animation_element, node_tag_mapping, content=None):
        """Process animation data from CSD and create animation clips using new track format."""
        if not animation_element:
            return []

        timelines = animation_element.get("Timeline", [])

        # Convert single timeline to list for consistent processing
        if not isinstance(timelines, list):
            timelines = [timelines] if timelines else []

        if not timelines:
            return []

        # Group timelines by animation (assuming all timelines belong to same animation for now)
        duration_str = animation_element.get("@Duration", "0")
        speed_str = animation_element.get("@Speed", "1")

        # Calculate duration based on the last keyframe time instead of Duration attribute
        # Find the maximum frame index across all timelines
        max_frame = 0
        for timeline in timelines:
            if isinstance(timeline, dict):
                frames = []
                property_name = timeline.get("@Property", "")

                # Get frames based on property type
                if property_name == "Scale":
                    scale_frames = timeline.get("ScaleFrame", [])
                    if not isinstance(scale_frames, list):
                        scale_frames = [scale_frames] if scale_frames else []
                    frames = scale_frames
                elif property_name == "Position":
                    point_frames = timeline.get("PointFrame", [])
                    if not isinstance(point_frames, list):
                        point_frames = [point_frames] if point_frames else []
                    frames = point_frames
                elif property_name == "RotationSkew":
                    scale_frames = timeline.get("ScaleFrame", [])
                    if not isinstance(scale_frames, list):
                        scale_frames = [scale_frames] if scale_frames else []
                    frames = scale_frames
                elif property_name == "Alpha":
                    int_frames = timeline.get("IntFrame", [])
                    if not isinstance(int_frames, list):
                        int_frames = [int_frames] if int_frames else []
                    frames = int_frames
                elif property_name == "VisibleForFrame":
                    bool_frames = timeline.get("BoolFrame", [])
                    if not isinstance(bool_frames, list):
                        bool_frames = [bool_frames] if bool_frames else []
                    frames = bool_frames
                elif property_name == "FileData":
                    texture_frames = timeline.get("TextureFrame", [])
                    if not isinstance(texture_frames, list):
                        texture_frames = [texture_frames] if texture_frames else []
                    frames = texture_frames
                elif property_name == "CColor":
                    color_frames = timeline.get("ColorFrame", [])
                    if not isinstance(color_frames, list):
                        color_frames = [color_frames] if color_frames else []
                    frames = color_frames

                # Find the maximum frame index
                for frame in frames:
                    if isinstance(frame, dict):
                        frame_index = int(frame.get("@FrameIndex", 0))
                        if property_name == "FileData":
                            frame_index = frame_index + 1
                        max_frame = max(max_frame, frame_index)

        # Calculate duration based on the last keyframe
        total_duration = max_frame / 60.0  # Convert frames to seconds (60fps)

        if total_duration <= 0:
            return []

        animation_clip_uuids = []

        # 1. Create the full animation clip FIRST (put it at the beginning of the list)
        print(f"[EMOJI] Creating full animation clip (0 to auto-detected end)")
        tracks_data, total_objects = self.create_tracks_data(
            timelines, node_tag_mapping
        )

        if tracks_data:
            clip_name = f"{self.root_name}__anim__"  # Match new naming convention

            # Create complete animation clip with all objects
            animation_clip_objects = []

            # First object: the main AnimationClip
            animation_clip = self.create_animation_clip(
                clip_name, total_duration, tracks_data, speed_str
            )

            # Set correct AdditiveSettings ID (it's the last object in the array)
            # Since we add the clip first (index 0), then all track objects, AdditiveSettings is at the end
            additive_settings_id = (
                1 + len(total_objects) - 1
            )  # -1 because AdditiveSettings is already in total_objects
            animation_clip["_additiveSettings"]["__id__"] = additive_settings_id

            animation_clip_objects.append(animation_clip)

            # Add all track objects
            animation_clip_objects.extend(total_objects)

            # Generate UUID for the animation clip file
            anim_file_uuid = self.generate_uuid()

            # Store the complete animation structure for separate file export
            self.animation_clips.append(
                {
                    "name": clip_name,
                    "data": animation_clip_objects,  # Array of all objects, not just the clip
                    "uuid": anim_file_uuid,
                    "source_path": getattr(self, 'current_relative_path', None),  # Store source file path for directory structure
                }
            )

            # Store UUID mapping for this animation
            self.animation_clip_uuids[clip_name] = anim_file_uuid

            # Add to UUID list for Animation component FIRST
            animation_clip_uuids.append(
                {"__uuid__": anim_file_uuid, "__expectedType__": "cc.AnimationClip"}
            )

            print(
                f"[EMOJI] Created full animation clip: {clip_name} (UUID: {anim_file_uuid})"
            )

        # Check if there are AnimationInfo elements for segmented animations
        animation_list = animation_element.get("AnimationList")
        if not animation_list and content:
            # AnimationList might be in the parent content
            animation_list = content.get("AnimationList")

        if animation_list:
            print(f"[EMOJI] AnimationList found: {type(animation_list)}")

            # AnimationInfo might be directly under AnimationList
            animation_infos = animation_list.get("AnimationInfo", [])

            print(
                f"[EMOJI] AnimationInfo from .get(): {type(animation_infos)} - {len(animation_infos) if isinstance(animation_infos, list) else 'not list'}"
            )

            # If AnimationInfo is not found, check if it's directly in the dict
            if not animation_infos:
                if isinstance(animation_list, list):
                    # AnimationInfo might be the direct content of AnimationList
                    animation_infos = animation_list
                elif isinstance(animation_list, dict):
                    # Check if AnimationInfo is a direct child
                    for key, value in animation_list.items():
                        if key == "AnimationInfo":
                            animation_infos = value
                            break

            print(
                f"[EMOJI] Final AnimationInfo: {type(animation_infos)} - {len(animation_infos) if isinstance(animation_infos, list) else 'not list'}"
            )

            # Convert single AnimationInfo to list for consistent processing
            if not isinstance(animation_infos, list):
                animation_infos = [animation_infos] if animation_infos else []

            print(f"[EMOJI] Processing {len(animation_infos)} AnimationInfo segments")

            # 2. Create animation clips for each AnimationInfo segment
            print(f"[EMOJI] Creating segmented animation clips")
            for anim_info in animation_infos:
                if anim_info:
                    anim_name = anim_info.get("@Name", "Unknown")
                    start_index = int(anim_info.get("@StartIndex", "0"))
                    end_index = int(anim_info.get("@EndIndex", "0"))

                    print(
                        f"[EMOJI] Processing segment: {anim_name} (Frames: {start_index}-{end_index})"
                    )

                    if end_index >= start_index:
                        # Calculate duration for this segment
                        segment_duration = (end_index - start_index + 1) / 60.0

                        # Create clip name with new naming convention
                        clip_name = f"{self.root_name}__anim__{anim_name}"

                        # Create tracks data for this specific frame range
                        print(
                            f"[EMOJI] Creating tracks data for segment {anim_name} (frames {start_index}-{end_index})"
                        )
                        segment_tracks_data, segment_total_objects = (
                            self.create_tracks_data(
                                timelines, node_tag_mapping, start_index, end_index
                            )
                        )

                        if segment_tracks_data:
                            # Create complete animation clip with segment objects
                            animation_clip_objects = []

                            # First object: the main AnimationClip
                            animation_clip = self.create_animation_clip(
                                clip_name,
                                segment_duration,
                                segment_tracks_data,
                                speed_str,
                            )

                            # Set correct AdditiveSettings ID
                            additive_settings_id = 1 + len(segment_total_objects) - 1
                            animation_clip["_additiveSettings"][
                                "__id__"
                            ] = additive_settings_id

                            animation_clip_objects.append(animation_clip)

                            # Add segment track objects
                            animation_clip_objects.extend(segment_total_objects)

                            # Generate UUID for the animation clip file
                            anim_file_uuid = self.generate_uuid()

                            # Store the complete animation structure for separate file export
                            self.animation_clips.append(
                                {
                                    "name": clip_name,
                                    "data": animation_clip_objects,
                                    "uuid": anim_file_uuid,
                                    "source_path": getattr(self, 'current_relative_path', None),  # Store source file path for directory structure
                                }
                            )

                            # Store UUID mapping for this animation
                            self.animation_clip_uuids[clip_name] = anim_file_uuid

                            # Add to UUID list for Animation component AFTER the full animation
                            animation_clip_uuids.append(
                                {
                                    "__uuid__": anim_file_uuid,
                                    "__expectedType__": "cc.AnimationClip",
                                }
                            )

                            print(
                                f"[EMOJI] Created segmented animation clip: {clip_name} (Frames: {start_index}-{end_index}, Duration: {segment_duration:.2f}s, UUID: {anim_file_uuid})"
                            )
                        else:
                            print(f"WARNING No tracks found for segment: {anim_name}")
                    else:
                        print(
                            f"WARNING Invalid segment range for {anim_name}: {start_index}-{end_index}"
                        )

        return animation_clip_uuids

    def normalize_animation_time(self, frame_index):
        """Convert frame index to precise time using exact fraction arithmetic."""
        if frame_index == 0:
            return 0

        # Use exact fraction arithmetic for precision
        from fractions import Fraction

        time_fraction = Fraction(frame_index, 60)

        # Convert to float for JSON serialization but with maximum precision
        time_float = float(time_fraction)

        # For common frame rates, use exact decimal representations
        exact_times = {
            Fraction(1, 12): 0.08333333333333333,  # 5 frames
            Fraction(1, 6): 0.16666666666666666,  # 10 frames
            Fraction(1, 4): 0.25,  # 15 frames
            Fraction(1, 3): 0.3333333333333333,  # 20 frames
            Fraction(5, 12): 0.4166666666666667,  # 25 frames
            Fraction(1, 2): 0.5,  # 30 frames
        }

        if time_fraction in exact_times:
            return exact_times[time_fraction]

        return time_float

    def create_tracks_data(
        self, timelines, node_tag_mapping, start_index=0, end_index=None
    ):
        """Create tracks data structure for new animation format within specified frame range using correct index management."""
        tracks = []
        all_objects = []
        current_index = 1  # Start from 1 since 0 is the main AnimationClip

        # If end_index is not specified, calculate it from the total duration
        if end_index is None:
            max_frame = 0
            for timeline in timelines:
                if isinstance(timeline, dict):
                    frames = []
                    property_name = timeline.get("@Property", "")

                    # Get frames based on property type
                    if property_name == "Scale":
                        scale_frames = timeline.get("ScaleFrame", [])
                        if not isinstance(scale_frames, list):
                            scale_frames = [scale_frames] if scale_frames else []
                        frames = scale_frames
                    elif property_name == "Position":
                        point_frames = timeline.get("PointFrame", [])
                        if not isinstance(point_frames, list):
                            point_frames = [point_frames] if point_frames else []
                        frames = point_frames
                    elif property_name == "RotationSkew":
                        scale_frames = timeline.get("ScaleFrame", [])
                        if not isinstance(scale_frames, list):
                            scale_frames = [scale_frames] if scale_frames else []
                        frames = scale_frames
                    elif property_name == "Alpha":
                        int_frames = timeline.get("IntFrame", [])
                        if not isinstance(int_frames, list):
                            int_frames = [int_frames] if int_frames else []
                        frames = int_frames
                    elif property_name == "VisibleForFrame":
                        bool_frames = timeline.get("BoolFrame", [])
                        if not isinstance(bool_frames, list):
                            bool_frames = [bool_frames] if bool_frames else []
                        frames = bool_frames
                    elif property_name == "FileData":
                        texture_frames = timeline.get("TextureFrame", [])
                        if not isinstance(texture_frames, list):
                            texture_frames = [texture_frames] if texture_frames else []
                        frames = texture_frames

                    # Find the maximum frame index
                    for frame in frames:
                        if isinstance(frame, dict):
                            frame_index = int(frame.get("@FrameIndex", 0))
                            max_frame = max(max_frame, frame_index)

            end_index = max_frame

        print(f"[EMOJI] Processing animation frames {start_index}-{end_index}")

        # Group timelines by ActionTag and Property, but combine CColor and Alpha for same node
        timeline_groups = {}
        color_related_groups = {}  # Special handling for CColor and Alpha combination

        for timeline in timelines:
            action_tag = timeline.get("@ActionTag", "")
            property_name = timeline.get("@Property", "")

            # Get node path from action tag
            node_path = self.get_node_path_from_action_tag(action_tag, node_tag_mapping)
            if not node_path:
                continue

            # Special handling for color-related properties (CColor and Alpha should be combined)
            if property_name in ["CColor", "Alpha"]:
                color_key = (action_tag, "Color")  # Use 'Color' as combined key
                if color_key not in color_related_groups:
                    color_related_groups[color_key] = []
                color_related_groups[color_key].append(timeline)
            else:
                # Other properties are grouped normally
                key = (action_tag, property_name)
                if key not in timeline_groups:
                    timeline_groups[key] = []
                timeline_groups[key].append(timeline)

        # Process color-related groups first (CColor + Alpha combined)
        for (action_tag, color_type), group_timelines in color_related_groups.items():
            node_path = self.get_node_path_from_action_tag(action_tag, node_tag_mapping)
            if not node_path:
                continue

            # Use current length of all_objects as the base index for this track
            track_base_index = len(all_objects) + 1
            self._append_color_track_for_color(
                tracks,
                all_objects,
                node_path,
                group_timelines,
                track_base_index,
                start_index,
                end_index,
            )

        # Process other timeline groups separately
        for (action_tag, property_name), group_timelines in timeline_groups.items():
            node_path = self.get_node_path_from_action_tag(action_tag, node_tag_mapping)
            if not node_path:
                continue

            # Use current length of all_objects as the base index for this track
            track_base_index = len(all_objects) + 1

            if property_name == "Scale":
                self._append_vector_track_for_scale(
                    tracks,
                    all_objects,
                    node_path,
                    group_timelines,
                    track_base_index,
                    start_index,
                    end_index,
                )

            elif property_name == "Position":
                self._append_vector_track_for_position(
                    tracks,
                    all_objects,
                    node_path,
                    group_timelines,
                    track_base_index,
                    start_index,
                    end_index,
                )

            elif property_name == "RotationSkew":
                self._append_vector_track_for_rotation(
                    tracks,
                    all_objects,
                    node_path,
                    group_timelines,
                    track_base_index,
                    start_index,
                    end_index,
                )

            elif property_name == "VisibleForFrame":
                self._append_object_track_for_visibility(
                    tracks,
                    all_objects,
                    node_path,
                    group_timelines,
                    track_base_index,
                    start_index,
                    end_index,
                )

            elif property_name == "FileData":
                self._append_object_track_for_sprite_frame(
                    tracks,
                    all_objects,
                    node_path,
                    group_timelines,
                    track_base_index,
                    start_index,
                    end_index,
                )

            elif property_name == "BlendFunc":
                # BlendFunc is usually handled with FileData, skip separate processing
                continue

            else:
                print(
                    f"WARNING  Skipping unsupported property: {property_name} for ActionTag: {action_tag}"
                )

        # Add AdditiveSettings at the end
        additive_settings_index = len(all_objects) + 1
        additive_settings = {
            "__type__": "cc.AnimationClipAdditiveSettings",
            "enabled": False,
            "refClip": None,
        }
        all_objects.append(additive_settings)

        print(
            f"[EMOJI] Created {len(tracks)} tracks with {len(all_objects)} total objects for frames {start_index}-{end_index}"
        )
        return tracks, all_objects

    def _append_vector_track_for_scale(
        self,
        tracks,
        all_objects,
        node_path,
        group_timelines,
        current_index,
        start_index=0,
        end_index=None,
    ):
        """Append VectorTrack for scale animation with correct index management."""
        if not group_timelines:
            return

        # Create VectorTrack object
        vector_track = {
            "__type__": "cc.animation.VectorTrack",
            "_binding": {
                "__type__": "cc.animation.TrackBinding",
                "path": {"__id__": current_index + 1},
                "proxy": None,
            },
            "_channels": [
                {"__id__": current_index + 3},  # X component
                {"__id__": current_index + 5},  # Y component
                {"__id__": current_index + 7},  # Z component
            ],
            "_nComponents": 3,
        }

        # Create TrackPath for scale property
        track_path = {
            "__type__": "cc.animation.TrackPath",
            "_paths": [{"__id__": current_index + 2}, "scale"],
        }

        # Create HierarchyPath
        hierarchy_path = {"__type__": "cc.animation.HierarchyPath", "path": node_path}

        # Process keyframes and create channels
        r_keyframes = []
        g_keyframes = []
        b_keyframes = []

        for timeline in group_timelines:
            if timeline.get("@Property") == "Scale":
                frames = timeline.get("ScaleFrame", [])
                if not isinstance(frames, list):
                    frames = [frames] if frames else []

                for frame in frames:
                    frame_index = int(frame.get("@FrameIndex", 0))

                    # Skip frames outside the specified range
                    if end_index is not None and (
                        frame_index < start_index or frame_index > end_index
                    ):
                        continue

                    # Calculate time
                    if end_index is not None:
                        adjusted_frame_index = frame_index - start_index
                        time_float32 = self.normalize_animation_time(
                            adjusted_frame_index
                        )
                    else:
                        time_float32 = self.normalize_animation_time(frame_index)

                    x_value = float(frame.get("@X", 1.0))
                    y_value = float(frame.get("@Y", 1.0))

                    # Check Tween setting
                    tween_setting = frame.get("@Tween", "True")
                    interpolation_mode = 1 if tween_setting.lower() == "false" else 0

                    # Convert to float32 precision and round to reasonable precision
                    import struct

                    x_float32 = struct.unpack("f", struct.pack("f", x_value))[0]
                    y_float32 = struct.unpack("f", struct.pack("f", y_value))[0]

                    # Round to 6 decimal places to avoid excessive precision
                    x_float32 = round(x_float32, 6)
                    y_float32 = round(y_float32, 6)

                    if x_float32.is_integer():
                        x_float32 = int(x_float32)
                    if y_float32.is_integer():
                        y_float32 = int(y_float32)

                    # Create keyframes for X and Y channels
                    for channel, value, keyframes_list in [
                        ("x", x_float32, r_keyframes),
                        ("y", y_float32, g_keyframes),
                    ]:
                        keyframe = {
                            "__type__": "cc.RealKeyframeValue",
                            "interpolationMode": interpolation_mode,
                            "tangentWeightMode": 0,
                            "value": value,
                            "rightTangent": 0,
                            "rightTangentWeight": 1,
                            "leftTangent": 0,
                            "leftTangentWeight": 1,
                            "easingMethod": 0,
                            "__editorExtras__": {"tangentMode": 0},
                        }
                        keyframes_list.append((time_float32, keyframe))

        # Sort keyframes by time
        r_keyframes.sort(key=lambda x: x[0])
        g_keyframes.sort(key=lambda x: x[0])

        # Check if we have any actual keyframe data
        has_keyframes = bool(r_keyframes) or bool(g_keyframes)
        if not has_keyframes:
            print(f"WARNING Skipping empty scale track for {node_path}")
            return

        # Create channels with curves
        channels_data = [
            ("X", r_keyframes, 1.0),
            ("Y", g_keyframes, 1.0),
            ("Z", [], 1.0),  # Z channel is empty for 2D scale
        ]

        channels_objects = []
        for i, (channel_name, keyframes, default_value) in enumerate(channels_data):
            channel_index = current_index + 3 + (i * 2)
            curve_index = channel_index + 1

            # Channel
            channel = {
                "__type__": "cc.animation.Channel",
                "_curve": {"__id__": curve_index},
            }

            # Curve
            if keyframes:
                times = [kf[0] for kf in keyframes]
                values = [kf[1] for kf in keyframes]
            else:
                times = [0]
                default_keyframe = {
                    "__type__": "cc.RealKeyframeValue",
                    "interpolationMode": 0,
                    "tangentWeightMode": 0,
                    "value": default_value,
                    "rightTangent": 0,
                    "rightTangentWeight": 1,
                    "leftTangent": 0,
                    "leftTangentWeight": 1,
                    "easingMethod": 0,
                    "__editorExtras__": {"tangentMode": 0},
                }
                values = [default_keyframe]

            curve = {
                "__type__": "cc.RealCurve",
                "_times": times,
                "_values": values,
                "preExtrapolation": 1,
                "postExtrapolation": 1,
            }

            channels_objects.extend([channel, curve])

        # Append objects in correct order
        all_objects.append(vector_track)  # current_index
        all_objects.append(track_path)  # current_index + 1
        all_objects.append(hierarchy_path)  # current_index + 2
        all_objects.extend(channels_objects)  # current_index + 3 onwards

        # Add track reference to tracks list
        tracks.append({"__id__": current_index})

    def _append_vector_track_for_rotation(
        self,
        tracks,
        all_objects,
        node_path,
        group_timelines,
        current_index,
        start_index=0,
        end_index=None,
    ):
        """Append VectorTrack for rotation animation with correct index management."""
        if not group_timelines:
            return

        # Create VectorTrack object for rotation (using eulerAngles property)
        vector_track = {
            "__type__": "cc.animation.VectorTrack",
            "_binding": {
                "__type__": "cc.animation.TrackBinding",
                "path": {"__id__": current_index + 1},
                "proxy": None,
            },
            "_channels": [
                {"__id__": current_index + 3},  # X component (rotation around X axis)
                {"__id__": current_index + 5},  # Y component (rotation around Y axis)
                {
                    "__id__": current_index + 7
                },  # Z component (rotation around Z axis, main 2D rotation)
            ],
            "_nComponents": 3,
        }

        # Create TrackPath for eulerAngles property (rotation property in Cocos Creator)
        track_path = {
            "__type__": "cc.animation.TrackPath",
            "_paths": [{"__id__": current_index + 2}, "eulerAngles"],
        }

        # Create HierarchyPath
        hierarchy_path = {"__type__": "cc.animation.HierarchyPath", "path": node_path}

        # Process keyframes and create channels
        x_rotation_keyframes = []  # Rotation around X axis
        y_rotation_keyframes = []  # Rotation around Y axis
        z_rotation_keyframes = []  # Rotation around Z axis (main 2D rotation)

        for timeline in group_timelines:
            if timeline.get("@Property") == "RotationSkew":
                frames = timeline.get("ScaleFrame", [])
                if not isinstance(frames, list):
                    frames = [frames] if frames else []

                for frame in frames:
                    frame_index = int(frame.get("@FrameIndex", 0))

                    # Skip frames outside the specified range
                    if end_index is not None and (
                        frame_index < start_index or frame_index > end_index
                    ):
                        continue

                    # Calculate time
                    if end_index is not None:
                        adjusted_frame_index = frame_index - start_index
                        time_float32 = self.normalize_animation_time(
                            adjusted_frame_index
                        )
                    else:
                        time_float32 = self.normalize_animation_time(frame_index)

                    # Get rotation values (in CSD RotationSkew, X and Y usually have same value)
                    x_rotation = float(frame.get("@X", 0.0))
                    y_rotation = float(frame.get("@Y", 0.0))

                    # For 2D rotation, we typically use the Z component
                    # Use X rotation value as the main rotation (RotationSkewX)
                    z_rotation = -x_rotation

                    # Check Tween setting
                    tween_setting = frame.get("@Tween", "True")
                    interpolation_mode = 1 if tween_setting.lower() == "false" else 0

                    # Convert to float32 precision
                    import struct

                    x_float32 = struct.unpack("f", struct.pack("f", 0.0))[
                        0
                    ]  # X rotation is 0 for 2D
                    y_float32 = struct.unpack("f", struct.pack("f", 0.0))[
                        0
                    ]  # Y rotation is 0 for 2D
                    z_float32 = struct.unpack("f", struct.pack("f", z_rotation))[
                        0
                    ]  # Main 2D rotation

                    if z_float32.is_integer():
                        z_float32 = int(z_float32)

                    # Create keyframes for rotation channels
                    for channel, value, keyframes_list in [
                        ("x", x_float32, x_rotation_keyframes),
                        ("y", y_float32, y_rotation_keyframes),
                        ("z", z_float32, z_rotation_keyframes),
                    ]:
                        keyframe = {
                            "__type__": "cc.RealKeyframeValue",
                            "interpolationMode": interpolation_mode,
                            "tangentWeightMode": 0,
                            "value": value,
                            "rightTangent": 0,
                            "rightTangentWeight": 1,
                            "leftTangent": 0,
                            "leftTangentWeight": 1,
                            "easingMethod": 0,
                            "__editorExtras__": {"tangentMode": 0},
                        }
                        keyframes_list.append((time_float32, keyframe))

        # Sort keyframes by time
        x_rotation_keyframes.sort(key=lambda x: x[0])
        y_rotation_keyframes.sort(key=lambda x: x[0])
        z_rotation_keyframes.sort(key=lambda x: x[0])

        # Check if we have any actual keyframe data
        has_keyframes = bool(
            z_rotation_keyframes
        )  # For 2D rotation, we only care about Z axis
        if not has_keyframes:
            print(f"WARNING Skipping empty rotation track for {node_path}")
            return

        # Create channels with curves
        channels_data = [
            ("X", x_rotation_keyframes, 0.0),
            ("Y", y_rotation_keyframes, 0.0),
            ("Z", z_rotation_keyframes, 0.0),  # Z channel contains the main 2D rotation
        ]

        channels_objects = []
        for i, (channel_name, keyframes, default_value) in enumerate(channels_data):
            channel_index = current_index + 3 + (i * 2)
            curve_index = channel_index + 1

            # Channel
            channel = {
                "__type__": "cc.animation.Channel",
                "_curve": {"__id__": curve_index},
            }

            # Curve
            if keyframes:
                times = [kf[0] for kf in keyframes]
                values = [kf[1] for kf in keyframes]
            else:
                times = [0]
                default_keyframe = {
                    "__type__": "cc.RealKeyframeValue",
                    "interpolationMode": 0,
                    "tangentWeightMode": 0,
                    "value": default_value,
                    "rightTangent": 0,
                    "rightTangentWeight": 1,
                    "leftTangent": 0,
                    "leftTangentWeight": 1,
                    "easingMethod": 0,
                    "__editorExtras__": {"tangentMode": 0},
                }
                values = [default_keyframe]

            curve = {
                "__type__": "cc.RealCurve",
                "_times": times,
                "_values": values,
                "preExtrapolation": 1,
                "postExtrapolation": 1,
            }

            channels_objects.extend([channel, curve])

        # Append objects in correct order
        all_objects.append(vector_track)  # current_index
        all_objects.append(track_path)  # current_index + 1
        all_objects.append(hierarchy_path)  # current_index + 2
        all_objects.extend(channels_objects)  # current_index + 3 onwards

        # Add track reference to tracks list
        tracks.append({"__id__": current_index})

    def _append_vector_track_for_position(
        self,
        tracks,
        all_objects,
        node_path,
        group_timelines,
        current_index,
        start_index=0,
        end_index=None,
    ):
        """Append VectorTrack for position animation with correct index management."""
        if not group_timelines:
            return

        # Create VectorTrack object
        vector_track = {
            "__type__": "cc.animation.VectorTrack",
            "_binding": {
                "__type__": "cc.animation.TrackBinding",
                "path": {"__id__": current_index + 1},
                "proxy": None,
            },
            "_channels": [
                {"__id__": current_index + 3},  # X component
                {"__id__": current_index + 5},  # Y component
                {"__id__": current_index + 7},  # Z component
            ],
            "_nComponents": 3,
        }

        # Create TrackPath for position property
        track_path = {
            "__type__": "cc.animation.TrackPath",
            "_paths": [{"__id__": current_index + 2}, "position"],
        }

        # Create HierarchyPath
        hierarchy_path = {"__type__": "cc.animation.HierarchyPath", "path": node_path}

        # Process keyframes and create channels
        r_keyframes = []
        g_keyframes = []
        b_keyframes = []

        for timeline in group_timelines:
            if timeline.get("@Property") == "Position":
                frames = timeline.get("PointFrame", [])
                if not isinstance(frames, list):
                    frames = [frames] if frames else []

                for frame in frames:
                    frame_index = int(frame.get("@FrameIndex", 0))

                    # Skip frames outside the specified range
                    if end_index is not None and (
                        frame_index < start_index or frame_index > end_index
                    ):
                        continue

                    # Calculate time
                    if end_index is not None:
                        adjusted_frame_index = frame_index - start_index
                        time_float32 = self.normalize_animation_time(
                            adjusted_frame_index
                        )
                    else:
                        time_float32 = self.normalize_animation_time(frame_index)

                    # Get CSD position values
                    csd_x = float(frame.get("@X", 0.0))
                    csd_y = float(frame.get("@Y", 0.0))
                    
                    # Apply coordinate conversion using stored node info
                    x_value = csd_x
                    y_value = csd_y
                    
                    # Animation paths are relative to root, but node_info_map uses full paths
                    # Try to find the node with full path (root_name/node_path)
                    full_node_path = f"{self.root_name}/{node_path}" if node_path else self.root_name
                    
                    if full_node_path in self.node_info_map:
                        node_info = self.node_info_map[full_node_path]
                        parent_path = node_info.get("parent_path")
                        parent_id = node_info.get("parent_id")
                        
                        # Apply coordinate conversion if not root
                        if not node_info.get("is_root", False):
                            # Determine effective parent anchor and size
                            if parent_path and parent_path in self.node_info_map:
                                parent_info = self.node_info_map[parent_path]
                                effective_parent_anchor = parent_info["anchor"]
                                effective_parent_size = parent_info["size"]
                            else:
                                effective_parent_anchor = {"x": 0, "y": 0}
                                effective_parent_size = {"width": 0, "height": 0}
                            
                            # Special handling for direct children of root in Layer/Scene types
                            if parent_id == 1 and self.property_group_type in ["Layer", "Scene"]:
                                effective_parent_anchor = {"x": 0.5, "y": 0.5}
                                effective_parent_size = self.root_layer_size
                            
                            # Apply universal coordinate conversion
                            x_value = csd_x - (effective_parent_size["width"] * effective_parent_anchor["x"])
                            y_value = csd_y - (effective_parent_size["height"] * effective_parent_anchor["y"])

                    # Check Tween setting
                    tween_setting = frame.get("@Tween", "True")
                    interpolation_mode = 1 if tween_setting.lower() == "false" else 0

                    # Convert to float32 precision and round to reasonable precision
                    import struct

                    x_float32 = struct.unpack("f", struct.pack("f", x_value))[0]
                    y_float32 = struct.unpack("f", struct.pack("f", y_value))[0]

                    # Round to 6 decimal places to avoid excessive precision
                    x_float32 = round(x_float32, 6)
                    y_float32 = round(y_float32, 6)

                    if x_float32.is_integer():
                        x_float32 = int(x_float32)
                    if y_float32.is_integer():
                        y_float32 = int(y_float32)

                    # Create keyframes for X and Y channels
                    for channel, value, keyframes_list in [
                        ("x", x_float32, r_keyframes),
                        ("y", y_float32, g_keyframes),
                    ]:
                        keyframe = {
                            "__type__": "cc.RealKeyframeValue",
                            "interpolationMode": interpolation_mode,
                            "tangentWeightMode": 0,
                            "value": value,
                            "rightTangent": 0,
                            "rightTangentWeight": 1,
                            "leftTangent": 0,
                            "leftTangentWeight": 1,
                            "easingMethod": 0,
                            "__editorExtras__": {"tangentMode": 0},
                        }
                        keyframes_list.append((time_float32, keyframe))

        # Sort keyframes by time
        r_keyframes.sort(key=lambda x: x[0])
        g_keyframes.sort(key=lambda x: x[0])

        # Check if we have any actual keyframe data
        has_keyframes = bool(r_keyframes) or bool(g_keyframes)
        if not has_keyframes:
            print(f"WARNING Skipping empty position track for {node_path}")
            return

        # Create channels with curves
        channels_data = [
            ("X", r_keyframes, 0.0),
            ("Y", g_keyframes, 0.0),
            ("Z", [], 0.0),  # Z channel is empty for 2D position
        ]

        channels_objects = []
        for i, (channel_name, keyframes, default_value) in enumerate(channels_data):
            channel_index = current_index + 3 + (i * 2)
            curve_index = channel_index + 1

            # Channel
            channel = {
                "__type__": "cc.animation.Channel",
                "_curve": {"__id__": curve_index},
            }

            # Curve
            if keyframes:
                times = [kf[0] for kf in keyframes]
                values = [kf[1] for kf in keyframes]
            else:
                times = [0]
                default_keyframe = {
                    "__type__": "cc.RealKeyframeValue",
                    "interpolationMode": 0,
                    "tangentWeightMode": 0,
                    "value": default_value,
                    "rightTangent": 0,
                    "rightTangentWeight": 1,
                    "leftTangent": 0,
                    "leftTangentWeight": 1,
                    "easingMethod": 0,
                    "__editorExtras__": {"tangentMode": 0},
                }
                values = [default_keyframe]

            curve = {
                "__type__": "cc.RealCurve",
                "_times": times,
                "_values": values,
                "preExtrapolation": 1,
                "postExtrapolation": 1,
            }

            channels_objects.extend([channel, curve])

        # Append objects in correct order
        all_objects.append(vector_track)  # current_index
        all_objects.append(track_path)  # current_index + 1
        all_objects.append(hierarchy_path)  # current_index + 2
        all_objects.extend(channels_objects)  # current_index + 3 onwards

        # Add track reference to tracks list
        tracks.append({"__id__": current_index})

    def _append_color_track_for_color(
        self,
        tracks,
        all_objects,
        node_path,
        group_timelines,
        current_index,
        start_index=0,
        end_index=None,
    ):
        """Append ColorTrack for color animation with correct index management."""
        if not group_timelines:
            return

        # Determine component type based on node ctype
        # Animation paths are relative to root, but node_info_map uses full paths
        full_node_path = f"{self.root_name}/{node_path}" if node_path else self.root_name
        
        component_type = "cc.Sprite"  # Default to Sprite
        if full_node_path in self.node_info_map:
            node_info = self.node_info_map[full_node_path]
            ctype = node_info.get("ctype", "")
            
            # Determine component type based on ctype
            if "TextObjectData" in ctype or "TextBMFontObjectData" in ctype:
                component_type = "cc.Label"
            elif "SpriteObjectData" in ctype or "ImageViewObjectData" in ctype or "ButtonObjectData" in ctype:
                component_type = "cc.Sprite"
            # For other types (Panel, Node, etc.), default to Sprite

        # Create ColorTrack object
        color_track = {
            "__type__": "cc.animation.ColorTrack",
            "_binding": {
                "__type__": "cc.animation.TrackBinding",
                "path": {"__id__": current_index + 1},
                "proxy": None,
            },
            "_channels": [
                {"__id__": current_index + 4},  # R component
                {"__id__": current_index + 6},  # G component
                {"__id__": current_index + 8},  # B component
                {"__id__": current_index + 10},  # A component
            ],
        }

        # Create TrackPath for color property
        track_path = {
            "__type__": "cc.animation.TrackPath",
            "_paths": [
                {"__id__": current_index + 2},
                {"__id__": current_index + 3},
                "color",
            ],
        }

        # Create HierarchyPath
        hierarchy_path = {"__type__": "cc.animation.HierarchyPath", "path": node_path}

        # Create ComponentPath with determined component type
        component_path = {
            "__type__": "cc.animation.ComponentPath",
            "component": component_type,
        }

        # Process keyframes from both CColor and Alpha timelines, organized by frameIndex
        frame_data = (
            {}
        )  # frame_index -> {'color': (r,g,b,a), 'alpha': alpha_value, 'tween': tween_setting}

        for timeline in group_timelines:
            property_type = timeline.get("@Property", "")

            if property_type == "CColor":
                frames = timeline.get("ColorFrame", [])
                if not isinstance(frames, list):
                    frames = [frames] if frames else []

                for frame in frames:
                    frame_index = int(frame.get("@FrameIndex", 0))

                    # Skip frames outside the specified range
                    if end_index is not None and (
                        frame_index < start_index or frame_index > end_index
                    ):
                        continue

                    if frame_index not in frame_data:
                        frame_data[frame_index] = {
                            "color": None,
                            "alpha": None,
                            "tween": "True",
                        }

                    # Get color values from Color element
                    color_element = frame.get("Color", {})
                    if isinstance(color_element, dict):
                        r_value = float(color_element.get("@R", 255))
                        g_value = float(color_element.get("@G", 255))
                        b_value = float(color_element.get("@B", 255))
                        a_value = float(
                            color_element.get("@A", 255)
                        )  # Color element has its own alpha

                        frame_data[frame_index]["color"] = (
                            r_value,
                            g_value,
                            b_value,
                            a_value,
                        )
                        frame_data[frame_index]["tween"] = frame.get("@Tween", "True")

            elif property_type == "Alpha":
                frames = timeline.get("IntFrame", [])
                if not isinstance(frames, list):
                    frames = [frames] if frames else []

                for frame in frames:
                    frame_index = int(frame.get("@FrameIndex", 0))

                    # Skip frames outside the specified range
                    if end_index is not None and (
                        frame_index < start_index or frame_index > end_index
                    ):
                        continue

                    if frame_index not in frame_data:
                        frame_data[frame_index] = {
                            "color": None,
                            "alpha": None,
                            "tween": "True",
                        }

                    alpha_value = float(frame.get("@Value", 255))
                    frame_data[frame_index]["alpha"] = alpha_value
                    frame_data[frame_index]["tween"] = frame.get("@Tween", "True")

        # Convert frame data to channel keyframes
        r_keyframes = []
        g_keyframes = []
        b_keyframes = []
        a_keyframes = []

        import struct

        # Sort frames by frame_index to maintain order
        for frame_index in sorted(frame_data.keys()):
            data = frame_data[frame_index]

            # Calculate time
            if end_index is not None:
                adjusted_frame_index = frame_index - start_index
                time_float32 = self.normalize_animation_time(adjusted_frame_index)
            else:
                time_float32 = self.normalize_animation_time(frame_index)

            tween_setting = data["tween"]
            interpolation_mode = 1 if tween_setting.lower() == "false" else 0

            # Handle RGB channels (from CColor)
            if data["color"] is not None:
                r_value, g_value, b_value, color_alpha = data["color"]

                for channel, value, keyframes_list in [
                    ("r", r_value, r_keyframes),
                    ("g", g_value, g_keyframes),
                    ("b", b_value, b_keyframes),
                ]:
                    value_float32 = struct.unpack("f", struct.pack("f", value))[0]
                    if value_float32.is_integer():
                        value_float32 = int(value_float32)

                    keyframe = {
                        "__type__": "cc.RealKeyframeValue",
                        "interpolationMode": interpolation_mode,
                        "tangentWeightMode": 0,
                        "value": value_float32,
                        "rightTangent": 0,
                        "rightTangentWeight": 1,
                        "leftTangent": 0,
                        "leftTangentWeight": 1,
                        "easingMethod": 0,
                        "__editorExtras__": {"tangentMode": 0},
                    }
                    keyframes_list.append((time_float32, keyframe))

                # Handle A channel from CColor (only if no separate Alpha timeline overrides it)
                if data["alpha"] is None:
                    value_float32 = struct.unpack("f", struct.pack("f", color_alpha))[0]
                    if value_float32.is_integer():
                        value_float32 = int(value_float32)

                    keyframe = {
                        "__type__": "cc.RealKeyframeValue",
                        "interpolationMode": interpolation_mode,
                        "tangentWeightMode": 0,
                        "value": value_float32,
                        "rightTangent": 0,
                        "rightTangentWeight": 1,
                        "leftTangent": 0,
                        "leftTangentWeight": 1,
                        "easingMethod": 0,
                        "__editorExtras__": {"tangentMode": 0},
                    }
                    a_keyframes.append((time_float32, keyframe))

            # Handle A channel from separate Alpha timeline (overrides CColor alpha if both exist)
            if data["alpha"] is not None:
                alpha_value = data["alpha"]
                value_float32 = struct.unpack("f", struct.pack("f", alpha_value))[0]
                if value_float32.is_integer():
                    value_float32 = int(value_float32)

                keyframe = {
                    "__type__": "cc.RealKeyframeValue",
                    "interpolationMode": interpolation_mode,
                    "tangentWeightMode": 0,
                    "value": value_float32,
                    "rightTangent": 0,
                    "rightTangentWeight": 1,
                    "leftTangent": 0,
                    "leftTangentWeight": 1,
                    "easingMethod": 0,
                    "__editorExtras__": {"tangentMode": 0},
                }
                a_keyframes.append((time_float32, keyframe))

        # Sort all keyframes by time
        r_keyframes.sort(key=lambda x: x[0])
        g_keyframes.sort(key=lambda x: x[0])
        b_keyframes.sort(key=lambda x: x[0])
        a_keyframes.sort(key=lambda x: x[0])

        # Create channels with curves
        channels_data = [
            ("R", r_keyframes, 255),
            ("G", g_keyframes, 255),
            ("B", b_keyframes, 255),
            ("A", a_keyframes, 255),
        ]

        channels_objects = []
        for i, (channel_name, keyframes, default_value) in enumerate(channels_data):
            channel_index = current_index + 4 + (i * 2)
            curve_index = channel_index + 1

            # Channel
            channel = {
                "__type__": "cc.animation.Channel",
                "_curve": {"__id__": curve_index},
            }

            # Curve
            if keyframes:
                times = [kf[0] for kf in keyframes]
                values = [kf[1] for kf in keyframes]
            else:
                times = []
                values = []

            curve = {
                "__type__": "cc.RealCurve",
                "_times": times,
                "_values": values,
                "preExtrapolation": 1,
                "postExtrapolation": 1,
            }

            channels_objects.extend([channel, curve])

        # Append objects in correct order
        all_objects.append(color_track)  # current_index
        all_objects.append(track_path)  # current_index + 1
        all_objects.append(hierarchy_path)  # current_index + 2
        all_objects.append(component_path)  # current_index + 3
        all_objects.extend(channels_objects)  # current_index + 4 onwards

        # Add track reference to tracks list (only the reference, not the full object)
        tracks.append({"__id__": current_index})

    def _append_object_track_for_visibility(
        self,
        tracks,
        all_objects,
        node_path,
        group_timelines,
        current_index,
        start_index=0,
        end_index=None,
    ):
        """Append ObjectTrack for visibility animation with correct index management."""
        if not group_timelines:
            return

        # Create ObjectTrack object
        object_track = {
            "__type__": "cc.animation.ObjectTrack",
            "_binding": {
                "__type__": "cc.animation.TrackBinding",
                "path": {"__id__": current_index + 1},
                "proxy": None,
            },
            "_channel": {"__id__": current_index + 3},
        }

        # Create TrackPath for active property
        track_path = {
            "__type__": "cc.animation.TrackPath",
            "_paths": [{"__id__": current_index + 2}, "active"],
        }

        # Create HierarchyPath
        hierarchy_path = {"__type__": "cc.animation.HierarchyPath", "path": node_path}

        # Process keyframes from VisibleForFrame timeline
        keyframes = []

        for timeline in group_timelines:
            if timeline.get("@Property") == "VisibleForFrame":
                frames = timeline.get("BoolFrame", [])
                if not isinstance(frames, list):
                    frames = [frames] if frames else []

                for frame in frames:
                    frame_index = int(frame.get("@FrameIndex", 0))

                    # Skip frames outside the specified range
                    if end_index is not None and (
                        frame_index < start_index or frame_index > end_index
                    ):
                        continue

                    # Calculate time
                    if end_index is not None:
                        adjusted_frame_index = frame_index - start_index
                        time_float32 = self.normalize_animation_time(
                            adjusted_frame_index
                        )
                    else:
                        time_float32 = self.normalize_animation_time(frame_index)

                    value = frame.get("@Value", "True").lower() == "true"

                    keyframes.append((time_float32, value))

        # Sort keyframes by time
        keyframes.sort(key=lambda x: x[0])

        # Create channel with curve
        channel_index = current_index + 3
        curve_index = current_index + 4

        channel = {
            "__type__": "cc.animation.Channel",
            "_curve": {"__id__": curve_index},
        }

        if keyframes:
            times = [kf[0] for kf in keyframes]
            values = [kf[1] for kf in keyframes]
        else:
            times = [0]
            values = [True]  # Default to visible

        curve = {"__type__": "cc.ObjectCurve", "_times": times, "_values": values}

        # Append objects in correct order
        all_objects.append(object_track)  # current_index
        all_objects.append(track_path)  # current_index + 1
        all_objects.append(hierarchy_path)  # current_index + 2
        all_objects.append(channel)  # current_index + 3
        all_objects.append(curve)  # current_index + 4

        # Add track reference to tracks list
        tracks.append({"__id__": current_index})

    def _append_object_track_for_sprite_frame(
        self,
        tracks,
        all_objects,
        node_path,
        group_timelines,
        current_index,
        start_index=0,
        end_index=None,
    ):
        """Append ObjectTrack for sprite frame animation with correct index management."""
        if not group_timelines:
            return

        # Create ObjectTrack object
        object_track = {
            "__type__": "cc.animation.ObjectTrack",
            "_binding": {
                "__type__": "cc.animation.TrackBinding",
                "path": {"__id__": current_index + 1},
                "proxy": None,
            },
            "_channel": {"__id__": current_index + 4},
        }

        # Create TrackPath for spriteFrame property
        track_path = {
            "__type__": "cc.animation.TrackPath",
            "_paths": [
                {"__id__": current_index + 2},
                {"__id__": current_index + 3},
                "spriteFrame",
            ],
        }

        # Create HierarchyPath
        hierarchy_path = {"__type__": "cc.animation.HierarchyPath", "path": node_path}

        # Create ComponentPath for cc.Sprite
        component_path = {
            "__type__": "cc.animation.ComponentPath",
            "component": "cc.Sprite",
        }

        # Process keyframes from FileData timeline
        keyframes = []

        for timeline in group_timelines:
            if timeline.get("@Property") == "FileData":
                frames = timeline.get("TextureFrame", [])
                if not isinstance(frames, list):
                    frames = [frames] if frames else []

                for frame in frames:
                    frame_index = int(frame.get("@FrameIndex", 0))

                    # Skip frames outside the specified range
                    if end_index is not None and (
                        frame_index < start_index or frame_index > end_index
                    ):
                        continue

                    # Calculate time
                    if end_index is not None:
                        adjusted_frame_index = frame_index - start_index
                        time_float32 = self.normalize_animation_time(
                            adjusted_frame_index
                        )
                    else:
                        time_float32 = self.normalize_animation_time(frame_index)

                    # Get texture file path
                    texture_file = frame.get("TextureFile", {})
                    if isinstance(texture_file, dict):
                        path = texture_file.get("@Path", "")
                        plist = texture_file.get("@Plist", "")

                        # Create sprite frame reference using image manager
                        sprite_frame_ref = (
                            self.image_manager.create_sprite_frame_reference(path)
                        )

                        if sprite_frame_ref:
                            keyframes.append((time_float32, sprite_frame_ref))

        # Sort keyframes by time
        keyframes.sort(key=lambda x: x[0])

        # Create channel with curve
        channel_index = current_index + 4
        curve_index = current_index + 5

        channel = {
            "__type__": "cc.animation.Channel",
            "_curve": {"__id__": curve_index},
        }

        if keyframes:
            times = [kf[0] for kf in keyframes]
            values = [kf[1] for kf in keyframes]
        else:
            times = [0]
            # Use white background as default sprite frame
            default_sprite_ref = self.image_manager.create_sprite_frame_reference(
                "white.png"
            )
            if not default_sprite_ref:
                # Fallback to white.png if not found
                default_sprite_ref = {
                    "__uuid__": "a517507e-1608-4ba1-b411-c5106e24d65f@f9941",
                    "__expectedType__": "cc.SpriteFrame",
                }
            values = [default_sprite_ref]

        curve = {"__type__": "cc.ObjectCurve", "_times": times, "_values": values}

        # Append objects in correct order
        all_objects.append(object_track)  # current_index
        all_objects.append(track_path)  # current_index + 1
        all_objects.append(hierarchy_path)  # current_index + 2
        all_objects.append(component_path)  # current_index + 3
        all_objects.append(channel)  # current_index + 4
        all_objects.append(curve)  # current_index + 5

        # Add track reference to tracks list
        tracks.append({"__id__": current_index})

    def find_node_by_action_tag(self, action_tag, node_dict=None):
        """根據 ActionTag 查找節點資訊。"""
        if node_dict is None:
            # 如果沒有提供節點，從根節點開始查找
            if not hasattr(self, "root_csd_data"):
                return None
            node_dict = self.root_csd_data

        # 檢查當前節點的 ActionTag
        if node_dict.get("@ActionTag") == action_tag:
            return node_dict

        # 遞歸查找子節點
        if "Children" in node_dict and node_dict["Children"]:
            children = node_dict["Children"].get("AbstractNodeData", [])
            if not isinstance(children, list):
                children = [children]

            for child in children:
                result = self.find_node_by_action_tag(action_tag, child)
                if result:
                    return result

        return None

    def get_node_path_from_action_tag(self, action_tag, node_tag_mapping):
        """Get node path from action tag using the node mapping."""
        full_path = node_tag_mapping.get(action_tag, None)
        if full_path and "/" in full_path:
            # Remove the root node prefix (e.g., "XYZnumEditField/BG" -> "BG")
            return full_path.split("/", 1)[1]
        return full_path

    def create_animation_component(self, node_id, animation_clip_uuids=[]):
        """Create an Animation component with UUID references to .anim files."""
        # Set default clip to first clip if available
        default_clip = animation_clip_uuids[0] if animation_clip_uuids else None

        return {
            "__type__": "cc.Animation",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": {"__id__": node_id},
            "_enabled": True,
            "__prefab": None,  # Will be set later
            "playOnLoad": False,
            "_clips": animation_clip_uuids,  # List of {"__uuid__": "...", "__expectedType__": "cc.AnimationClip"}
            "_defaultClip": default_clip,  # Same as first clip
            "_id": "",
        }

    def create_animation_clip(self, name, duration, tracks_data, speed_str):
        """Create an AnimationClip asset with new track-based format."""
        # Generate a random hash (in reality this should be computed from content)
        import random

        clip_hash = random.randint(100000000, 999999999)

        speed = float(speed_str)
        if speed.is_integer():
            speed = int(speed)

        return {
            "__type__": "cc.AnimationClip",
            "_name": name,
            "_objFlags": 0,
            "__editorExtras__": {"embeddedPlayerGroups": []},
            "_native": "",
            "sample": 60,
            "speed": speed,
            "wrapMode": 2,
            "enableTrsBlending": False,
            "_duration": float(duration),
            "_hash": clip_hash,
            "_tracks": tracks_data,
            "_exoticAnimation": None,
            "_events": [],
            "_embeddedPlayers": [],
            "_additiveSettings": {
                "__id__": None  # Will be set when creating the complete object array
            },
            "_auxiliaryCurveEntries": [],
        }

    def create_ui_transform_component(
        self, node_id, width=100, height=100, anchor_x=0.5, anchor_y=0.5
    ):
        """Create a UITransform component."""
        return {
            "__type__": "cc.UITransform",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": {"__id__": node_id},
            "_enabled": True,
            "__prefab": None,  # Will be set later
            "_contentSize": {
                "__type__": "cc.Size",
                "width": int(width) if float(width).is_integer() else float(width),
                "height": int(height) if float(height).is_integer() else float(height),
            },
            "_anchorPoint": {
                "__type__": "cc.Vec2",
                "x": int(anchor_x) if float(anchor_x).is_integer() else float(anchor_x),
                "y": int(anchor_y) if float(anchor_y).is_integer() else float(anchor_y),
            },
            "_id": "",
        }

    def has_alpha_animation(self, node_dict, animation_data):
        """Check if a node has alpha animation."""
        if not animation_data:
            return False

        action_tag = node_dict.get("@ActionTag", "")
        if not action_tag:
            return False

        timelines = animation_data.get("Timeline", [])
        if not isinstance(timelines, list):
            timelines = [timelines] if timelines else []

        for timeline in timelines:
            if (
                timeline.get("@ActionTag") == action_tag
                and timeline.get("@Property") == "Alpha"
            ):
                return True

        return False

    def calculate_inherited_color(self, node_dict, parent_color=None):
        """Calculate the inherited color for a node by multiplying with parent color.

        Args:
            node_dict: The node dictionary from CSD
            parent_color: Parent node's color (dict with 'r', 'g', 'b', 'a' keys)

        Returns:
            dict with 'r', 'g', 'b', 'a' keys representing the final color
        """
        # Default color (white with full alpha)
        default_color = {"r": 255, "g": 255, "b": 255, "a": 255}

        # Get this node's color from CColor
        node_color = default_color.copy()
        if "CColor" in node_dict:
            ccolor_data = node_dict["CColor"]
            if isinstance(ccolor_data, dict):
                node_color["r"] = int(ccolor_data.get("@R", 255))
                node_color["g"] = int(ccolor_data.get("@G", 255))
                node_color["b"] = int(ccolor_data.get("@B", 255))
                # Note: CColor A value is usually for alpha, but we prefer node Alpha attribute for consistency
                node_color["a"] = int(ccolor_data.get("@A", 255))

        # Handle alpha from @Alpha attribute if available
        if "@Alpha" in node_dict:
            node_color["a"] = int(node_dict.get("@Alpha", 255))

        # If no parent color, return this node's color
        if parent_color is None:
            return node_color

        # Multiply with parent color to simulate Studio's color inheritance
        result_color = node_color

        node_name = node_dict.get("@Name", "Unknown")
        print(
            f"Color Color inheritance for {node_name}: Parent({parent_color['r']},{parent_color['g']},{parent_color['b']},{parent_color.get('a', 255)}) × Node({node_color['r']},{node_color['g']},{node_color['b']},{node_color['a']}) = Result({result_color['r']},{result_color['g']},{result_color['b']},{result_color['a']})"
        )

        return result_color

    def process_node(
        self,
        node_dict,
        parent_id=None,
        is_root=False,
        node_path="",
        parent_anchor=None,
        parent_size=None,
        animation_data=None,
        parent_color=None,
    ):
        """Process a CSD node and create corresponding objects."""
        # Extract node information
        name = node_dict.get("@Name", "UnnamedNode")
        if is_root:
            name = self.root_name

        # Build node path for animation mapping
        if node_path:
            current_node_path = f"{node_path}/{name}"
        else:
            current_node_path = name

        # Check if RotationSkewX and RotationSkewY are different
        rotation_skew_x = float(node_dict.get("@RotationSkewX", 0))
        rotation_skew_y = float(node_dict.get("@RotationSkewY", 0))
        
        # Flag to indicate if we need to add UISkew component
        needs_uiskew = False
        skew_x = 0
        skew_y = 0
        rotation = 0
        
        if rotation_skew_x != rotation_skew_y:
            # When RotationSkewX != RotationSkewY, use UISkew component
            needs_uiskew = True
            skew_x = rotation_skew_x
            skew_y = -rotation_skew_y
            rotation = 0  # Keep rotation as 0
            print(f"[SKEW] Node {name} has different RotationSkewX({rotation_skew_x}) and RotationSkewY({rotation_skew_y}), will add UISkew component")
        else:
            # When RotationSkewX == RotationSkewY, use normal rotation
            rotation = rotation_skew_x

        # Store action tag mapping for animation processing
        action_tag = node_dict.get("@ActionTag", "")
        if action_tag:
            if not hasattr(self, "node_tag_mapping"):
                self.node_tag_mapping = {}
            self.node_tag_mapping[action_tag] = current_node_path

        # Extract position
        position = {"x": 0, "y": 0, "z": 0}
        
        # Determine source position (from Position tag or default to 0,0)
        studio_x = 0
        studio_y = 0
        has_position = False
        
        if "Position" in node_dict and node_dict["Position"]:
            pos_data = node_dict["Position"]
            if pos_data and isinstance(pos_data, dict):
                studio_x = float(pos_data.get("@X", 0))
                studio_y = float(pos_data.get("@Y", 0))
                has_position = True
        
        # Universal coordinate conversion formula: position = position - parent.anchor * parent.size
        # This applies even when Position is not specified (defaults to 0,0)
        creator_x = studio_x
        creator_y = studio_y

        if not is_root:
            # Determine the effective parent anchor and size for coordinate conversion
            effective_parent_anchor = parent_anchor if parent_anchor else {"x": 0, "y": 0}
            effective_parent_size = parent_size if parent_size else {"width": 0, "height": 0}
            
            # Special handling for direct children of root in Layer/Scene types
            if parent_id == 1 and self.property_group_type in ["Layer", "Scene"]:
                # Direct children of root Layer/Scene use root_layer_size with anchor (0.5, 0.5)
                effective_parent_anchor = {"x": 0.5, "y": 0.5}
                effective_parent_size = self.root_layer_size
                print(f"[Root Child] Using Layer/Scene root size: {effective_parent_size}")
            
            # Apply universal coordinate system conversion
            creator_x = studio_x - (effective_parent_size["width"] * effective_parent_anchor["x"])
            creator_y = studio_y - (effective_parent_size["height"] * effective_parent_anchor["y"])
            
            if has_position or (effective_parent_anchor["x"] != 0 or effective_parent_anchor["y"] != 0):
                print(
                    f"MOVED Coordinate conversion for {name}: CSD({studio_x}, {studio_y}) → Creator({creator_x:.1f}, {creator_y:.1f}) [Parent Anchor: ({effective_parent_anchor['x']}, {effective_parent_anchor['y']}), Size: {effective_parent_size['width']}x{effective_parent_size['height']}]"
                )

        position["x"] = creator_x
        position["y"] = creator_y

        # Special handling for ProjectNodeObjectData (sub-CSD) with SIZE
        ctype = node_dict.get("@ctype", "")
        if "ProjectNodeObjectData" in ctype and "Size" in node_dict and node_dict["Size"]:
            size_data = node_dict["Size"]
            if size_data and isinstance(size_data, dict):
                width = float(size_data.get("@X", 0))
                height = float(size_data.get("@Y", 0))
                
                if width > 0 or height > 0:
                    # Apply coordinate offset: x = x + width/2, y = y + height/2
                    position["x"] += width / 2
                    position["y"] += height / 2
                    print(f"[SUB-CSD] Coordinate offset applied to {name}: +({width/2}, {height/2}) -> final position=({position['x']}, {position['y']})")

        # Extract scale
        scale = {"x": 1, "y": 1, "z": 1}
        if "Scale" in node_dict and node_dict["Scale"]:
            scale_data = node_dict["Scale"]
            if scale_data and isinstance(scale_data, dict):
                scale["x"] = float(scale_data.get("@ScaleX", 1))
                scale["y"] = float(scale_data.get("@ScaleY", 1))

        # Extract size
        size = {"width": 100, "height": 100}  # Default size
        if "Size" in node_dict and node_dict["Size"]:
            size_data = node_dict["Size"]
            if size_data and isinstance(size_data, dict):
                extracted_width = float(size_data.get("@X", 100))
                extracted_height = float(size_data.get("@Y", 100))

                # Keep original CSD size for coordinate calculations (including 0x0 for root)
                size["width"] = extracted_width
                size["height"] = extracted_height
        elif is_root:
            # Root node keeps 0x0 for coordinate calculations
            size = {"width": 0, "height": 0}

        # Extract anchor point if available
        # CSD default anchor behavior: if not specified, defaults to (0, 0) for most nodes
        # Special case: Panel nodes default to (0.5, 0.5) if not explicitly set
        anchor_x, anchor_y = 0.0, 0.0  # CSD default anchor is bottom-left (0, 0)
        
        if "AnchorPoint" in node_dict and node_dict["AnchorPoint"]:
            anchor_data = node_dict["AnchorPoint"]
            if anchor_data and isinstance(anchor_data, dict):
                # Only override defaults if explicitly set in CSD
                anchor_x = float(
                    anchor_data.get("@ScaleX", 0.0)
                )  # CSD default is 0.0, not 0.5
                anchor_y = float(
                    anchor_data.get("@ScaleY", 0.0)
                )  # CSD default is 0.0, not 0.5
        elif is_root:
            # Root nodes typically use center anchor
            anchor_x, anchor_y = 0.5, 0.5
        elif "PanelObjectData" in ctype:
            # Panel nodes without explicit AnchorPoint (or with empty <AnchorPoint />) default to center (0.5, 0.5)
            # Note: <AnchorPoint /> in XML is parsed as None, which is falsy in the first if condition
            if "AnchorPoint" not in node_dict or node_dict["AnchorPoint"] is None:
                anchor_x, anchor_y = 0, 0

        # Check VisibleForFrame attribute
        visible_for_frame = node_dict.get("@VisibleForFrame", "True")
        active = visible_for_frame.lower() != "false"

        # Create node with original transforms (wrapper node preserves original CSD parameters)
        node = self.create_node(
            name, parent_id, position, scale, rotation, is_root=is_root, active=active
        )

        node_id = self.add_object(node)

        # Store node for later reference
        if is_root:
            self.root_node_obj = node
        
        # Store node information for animation coordinate conversion
        # This includes anchor, size, parent path, and component type for later use in animation processing
        ctype = node_dict.get("@ctype", "")
        self.node_info_map[current_node_path] = {
            "anchor": {"x": anchor_x, "y": anchor_y},
            "size": {"width": size["width"], "height": size["height"]},
            "parent_path": node_path if node_path else None,
            "is_root": is_root,
            "parent_id": parent_id,
            "ctype": ctype  # Store ctype to determine component type for animations
        }

        # Calculate inherited color for Studio color multiplication
        inherited_color = self.calculate_inherited_color(node_dict, parent_color)

        # Create UITransform component for non-root UI nodes (required in Cocos Creator 3.8.1)
        # Root node's UITransform will be created at the end
        # Skip UITransform for ProjectNodeObjectData (nested prefab nodes)
        ctype = node_dict.get("@ctype", "")

        if not is_root and "ProjectNodeObjectData" not in ctype:
            # Check if this is a sprite node that needs trimmed size
            ui_width, ui_height = size["width"], size["height"]

            # 特殊處理：GameNodeObjectData 和 GameLayerObjectData 統一使用 0, 0 尺寸
            if "GameNodeObjectData" in ctype or "GameLayerObjectData" in ctype:
                ui_width, ui_height = 0, 0
                print(
                    f"Found Game object size override for {ctype.replace('ObjectData', '')} {name}: forced to 0x0"
                )

            # For nodes with Scale9 enabled, use trimmed size (but not for GameNode/GameLayer)
            scale9_enable = node_dict.get("@Scale9Enable", "False").lower() == "true"

            if scale9_enable:
                # Apply trim when Scale9 is enabled for any node type that has FileData
                if "FileData" in node_dict:
                    image_path = node_dict["FileData"].get("@Path", "")
                    if image_path:
                        # Check if path starts with "Default/" - these represent non-existent resources
                        if image_path.startswith("Default/"):
                            print(
                                f"Skip Skipping Default resource for Scale9 trim: {image_path}"
                            )
                        else:
                            trim_width, trim_height = (
                                self.image_manager.get_trimmed_size(image_path)
                            )
                            print(
                                f"Color Using trimmed size for {ctype.replace('ObjectData', '')} {name} (Scale9 enabled): {trim_width}x{trim_height}"
                            )
                elif "NormalFileData" in node_dict:
                    # For Button nodes, use NormalFileData
                    image_path = node_dict["NormalFileData"].get("@Path", "")
                    if image_path:
                        # Check if path starts with "Default/" - these represent non-existent resources
                        if image_path.startswith("Default/"):
                            print(
                                f"Skip Skipping Default resource for Scale9 trim: {image_path}"
                            )
                        else:
                            trim_width, trim_height = (
                                self.image_manager.get_trimmed_size(image_path)
                            )
                            print(
                                f"Color Using trimmed size for {ctype.replace('ObjectData', '')} {name} (Scale9 enabled): {trim_width}x{trim_height}"
                            )

            # Button, Panel, ImageView 保留原始手動設定的尺寸
            if (
                "ButtonObjectData" in ctype
                or "PanelObjectData" in ctype
                or "ImageViewObjectData" in ctype
            ):
                print(
                    f"[EMOJI] Preserving original size for {ctype.replace('ObjectData', '')} {name}: {ui_width}x{ui_height}"
                )

            ui_transform = self.create_ui_transform_component(
                node_id, ui_width, ui_height, anchor_x, anchor_y
            )
            ui_transform_id = self.add_object(ui_transform)

            # Create CompPrefabInfo for UITransform
            ui_transform_prefab_info = self.create_comp_prefab_info(
                self.generate_file_id()
            )
            ui_transform_prefab_info_id = self.add_object(ui_transform_prefab_info)

            # Set references for UITransform
            ui_transform["__prefab"] = {"__id__": ui_transform_prefab_info_id}
            node["_components"].append({"__id__": ui_transform_id})
        else:
            # Store root node sizing information for later UITransform creation
            ui_width, ui_height = size["width"], size["height"]
            if ui_width == 0 or ui_height == 0:
                ui_width, ui_height = (
                    100,
                    100,
                )  # Reasonable default for root node display
                print(
                    f"[EMOJI] Root node UI size set to default: {ui_width}x{ui_height} (coordinate calculation remains 0x0)"
                )
            self.root_ui_size = {"width": ui_width, "height": ui_height}
            self.root_anchor = {"x": anchor_x, "y": anchor_y}

        # Check for Scale9 settings and collect information for all images used by this node
        scale9_enable = node_dict.get("@Scale9Enable", "False")
        if scale9_enable.lower() == "true":
            scale9_data = {
                "LeftEage": node_dict.get("@LeftEage", "0"),
                "RightEage": node_dict.get("@RightEage", "0"),
                "TopEage": node_dict.get("@TopEage", "0"),
                "BottomEage": node_dict.get("@BottomEage", "0"),
            }
            print(
                f"[EMOJI] Found Scale9 node {name}: L={scale9_data['LeftEage']}, R={scale9_data['RightEage']}, T={scale9_data['TopEage']}, B={scale9_data['BottomEage']}"
            )

            # Apply scale9 to all images used by this node
            images_to_process = []

            # Collect all image paths from this node
            if "NormalFileData" in node_dict:
                images_to_process.append(node_dict["NormalFileData"].get("@Path", ""))
            if "PressedFileData" in node_dict:
                images_to_process.append(node_dict["PressedFileData"].get("@Path", ""))
            if "DisabledFileData" in node_dict:
                images_to_process.append(node_dict["DisabledFileData"].get("@Path", ""))
            if "FileData" in node_dict:
                images_to_process.append(node_dict["FileData"].get("@Path", ""))

            # Apply scale9 info to all found images
            for img_path in images_to_process:
                if img_path:
                    # Check if path starts with "Default/" - these represent non-existent resources
                    if img_path.startswith("Default/"):
                        print(
                            f"Skip Skipping Default resource for Scale9 info: {img_path}"
                        )
                        continue

                    actual_image = self.image_manager.find_image_file(img_path)
                    if actual_image:
                        self.image_manager.add_scale9_info(actual_image, scale9_data)
                        print(f"  Success Applied scale9 to: {Path(actual_image).name}")

        # Create components based on ctype
        ctype = node_dict.get("@ctype", "")

        if "ButtonObjectData" in ctype:
            # Create button component with image references
            button_component = self.create_button_component(node_id, node_dict)
            button_id = self.add_object(button_component)

            # Create CompPrefabInfo for button
            comp_prefab_info = self.create_comp_prefab_info(self.generate_file_id())
            comp_prefab_info_id = self.add_object(comp_prefab_info)

            # Set references
            button_component["__prefab"] = {"__id__": comp_prefab_info_id}
            node["_components"].append({"__id__": button_id})

            # Create sprite component for button background image
            sprite_component = self.create_sprite_component(
                node_id, node_dict, inherited_color
            )
            sprite_id = self.add_object(sprite_component)

            # Create CompPrefabInfo for sprite
            sprite_comp_prefab_info = self.create_comp_prefab_info(
                self.generate_file_id()
            )
            sprite_comp_prefab_info_id = self.add_object(sprite_comp_prefab_info)

            # Set references for sprite
            sprite_component["__prefab"] = {"__id__": sprite_comp_prefab_info_id}
            node["_components"].append({"__id__": sprite_id})

            # Create label child node for button text
            button_text = node_dict.get("@ButtonText", "")
            if button_text:
                # Calculate label position to center it within the button
                # Based on button's anchor point
                button_width = size["width"]
                button_height = size["height"]

                # Formula: label_pos = (0.5 - anchor) * button_size
                label_x = (0.5 - anchor_x) * button_width
                label_y = (0.5 - anchor_y) * button_height

                print(
                    f"MOVED Button text positioning for {name}: anchor({anchor_x}, {anchor_y}), size({button_width}x{button_height}) → label pos({label_x:.1f}, {label_y:.1f})"
                )

                label_node = self.create_node(
                    "Label",
                    node_id,
                    {"x": label_x, "y": label_y, "z": 0},
                    {"x": 1, "y": 1, "z": 1},
                )
                label_node_id = self.add_object(label_node)

                # Create PrefabInfo for label node
                label_prefab_info = self.create_prefab_info(
                    1, 0, self.generate_file_id()
                )
                label_prefab_info_id = self.add_object(label_prefab_info)

                # Set the prefab reference for label node
                label_node["_prefab"] = {"__id__": label_prefab_info_id}

                # Create UITransform for label node
                label_ui_transform = self.create_ui_transform_component(
                    label_node_id, 100, 30
                )
                label_ui_transform_id = self.add_object(label_ui_transform)

                # Create CompPrefabInfo for label UITransform
                label_ui_prefab_info = self.create_comp_prefab_info(
                    self.generate_file_id()
                )
                label_ui_prefab_info_id = self.add_object(label_ui_prefab_info)

                # Set references for label UITransform
                label_ui_transform["__prefab"] = {"__id__": label_ui_prefab_info_id}
                label_node["_components"].append({"__id__": label_ui_transform_id})

                # Extract text color from TextColor if available (for Button text)
                button_text_color = None
                if "TextColor" in node_dict:
                    text_color_data = node_dict["TextColor"]
                    if isinstance(text_color_data, dict):
                        button_text_color = {
                            "r": int(text_color_data.get("@R", 255)),
                            "g": int(text_color_data.get("@G", 255)),
                            "b": int(text_color_data.get("@B", 255)),
                            "a": int(text_color_data.get("@A", 255)),
                        }
                        print(
                            f"Color Button text color for {name}: R{button_text_color['r']} G{button_text_color['g']} B{button_text_color['b']} A{button_text_color['a']}"
                        )

                # Extract font size from Button FontSize attribute
                button_font_size = int(node_dict.get("@FontSize", 14))

                # Create label component
                label_component = self.create_label_component(
                    label_node_id,
                    button_text,
                    button_font_size,
                    button_text_color,
                    None,
                    node_dict,
                    button_text_color,
                )
                label_component_id = self.add_object(label_component)

                # Create CompPrefabInfo for label component
                label_comp_prefab_info = self.create_comp_prefab_info(
                    self.generate_file_id()
                )
                label_comp_prefab_info_id = self.add_object(label_comp_prefab_info)

                # Set references for label component
                label_component["__prefab"] = {"__id__": label_comp_prefab_info_id}
                label_node["_components"].append({"__id__": label_component_id})

                # Add label node as child of button
                node["_children"].append({"__id__": label_node_id})

        elif "ParticleObjectData" in ctype:
            # Create ParticleSystem2D component
            particle_component = self.create_particle_system_component(
                node_id, node_dict
            )
            particle_id = self.add_object(particle_component)

            # Create CompPrefabInfo for particle system
            particle_prefab_info = self.create_comp_prefab_info(self.generate_file_id())
            particle_prefab_info_id = self.add_object(particle_prefab_info)

            # Set references
            particle_component["__prefab"] = {"__id__": particle_prefab_info_id}
            node["_components"].append({"__id__": particle_id})

            print(f"[EMOJI] Added ParticleSystem2D component to {name}")

        elif "TextObjectData" in ctype:
            # Create label component
            text_content = node_dict.get("@LabelText", "")
            font_size = int(node_dict.get("@FontSize", 20))

            # Extract text color from CColor if available
            text_color = None
            if "CColor" in node_dict:
                ccolor_data = node_dict["CColor"]
                if isinstance(ccolor_data, dict):
                    text_color = {
                        "r": int(ccolor_data.get("@R", 255)),
                        "g": int(ccolor_data.get("@G", 255)),
                        "b": int(ccolor_data.get("@B", 255)),
                        "a": int(ccolor_data.get("@A", 255)),
                    }
                    print(
                        f"Color Text color for {name}: R{text_color['r']} G{text_color['g']} B{text_color['b']} A{text_color['a']}"
                    )

            # Extract font path from LabelBMFontFile_CNB if available
            font_path = None
            if "LabelBMFontFile_CNB" in node_dict:
                font_file_data = node_dict["LabelBMFontFile_CNB"]
                if isinstance(font_file_data, dict):
                    font_path = font_file_data.get("@Path", "")
                    if font_path:
                        print(f"Font Found bitmap font reference: {font_path}")

            label_component = self.create_label_component(
                node_id,
                text_content,
                font_size,
                text_color,
                font_path,
                node_dict,
                inherited_color,
            )
            label_id = self.add_object(label_component)

            # Create CompPrefabInfo for label
            comp_prefab_info = self.create_comp_prefab_info(self.generate_file_id())
            comp_prefab_info_id = self.add_object(comp_prefab_info)

            # Set references
            label_component["__prefab"] = {"__id__": comp_prefab_info_id}
            node["_components"].append({"__id__": label_id})

        elif "TextBMFontObjectData" in ctype:
            # Handle TextBMFontObjectData (bitmap font text)
            print(f"[EMOJI] Processing TextBMFontObjectData for {name}")

            # Extract text content and font size
            text_content = node_dict.get("@LabelText", "")
            font_size = int(
                node_dict.get("@FontSize", 32)
            )  # Default to 32 for bitmap fonts

            # Extract text color from CColor if available
            text_color = None
            if "CColor" in node_dict:
                ccolor_data = node_dict["CColor"]
                if isinstance(ccolor_data, dict):
                    text_color = {
                        "r": int(ccolor_data.get("@R", 255)),
                        "g": int(ccolor_data.get("@G", 255)),
                        "b": int(ccolor_data.get("@B", 255)),
                        "a": int(ccolor_data.get("@A", 255)),
                    }
                    print(
                        f"Color Bitmap text color for {name}: R{text_color['r']} G{text_color['g']} B{text_color['b']} A{text_color['a']}"
                    )

            # Extract font path from LabelBMFontFile_CNB (required for bitmap fonts)
            font_path = None
            if "LabelBMFontFile_CNB" in node_dict:
                font_file_data = node_dict["LabelBMFontFile_CNB"]
                if isinstance(font_file_data, dict):
                    font_path = font_file_data.get("@Path", "")
                    if font_path:
                        print(f"Font Found bitmap font file for {name}: {font_path}")
                    else:
                        print(f"WARNING  No font path found for bitmap text {name}")
            else:
                print(f"WARNING  No LabelBMFontFile_CNB found for bitmap text {name}")

            # Create label component with bitmap font
            label_component = self.create_label_component(
                node_id,
                text_content,
                font_size,
                text_color,
                font_path,
                node_dict,
                inherited_color,
            )
            label_id = self.add_object(label_component)

            # Create CompPrefabInfo for label
            comp_prefab_info = self.create_comp_prefab_info(self.generate_file_id())
            comp_prefab_info_id = self.add_object(comp_prefab_info)

            # Set references
            label_component["__prefab"] = {"__id__": comp_prefab_info_id}
            node["_components"].append({"__id__": label_id})

            print(
                f"Success Created bitmap font label for {name}: '{text_content}' with font size {font_size}"
            )

        elif "SpriteObjectData" in ctype:
            # Create sprite component with image reference
            sprite_component = self.create_sprite_component(
                node_id, node_dict, inherited_color
            )

            # For Sprite nodes, always use Custom size mode to maintain exact CSD dimensions
            sprite_id = self.add_object(sprite_component)

            # Create CompPrefabInfo for sprite
            comp_prefab_info = self.create_comp_prefab_info(self.generate_file_id())
            comp_prefab_info_id = self.add_object(comp_prefab_info)

            # Set references
            sprite_component["__prefab"] = {"__id__": comp_prefab_info_id}
            node["_components"].append({"__id__": sprite_id})

        elif "ImageViewObjectData" in ctype:
            # Create sprite component with image reference
            sprite_component = self.create_sprite_component(
                node_id, node_dict, inherited_color
            )

            sprite_id = self.add_object(sprite_component)

            # Create CompPrefabInfo for sprite
            comp_prefab_info = self.create_comp_prefab_info(self.generate_file_id())
            comp_prefab_info_id = self.add_object(comp_prefab_info)

            # Set references
            sprite_component["__prefab"] = {"__id__": comp_prefab_info_id}
            node["_components"].append({"__id__": sprite_id})

            # Check if ImageView needs BlockInputEvents
            touch_enable = node_dict.get("@TouchEnable", "False")
            if touch_enable.lower() == "true":
                # Create BlockInputEvents component
                block_input = self.create_block_input_events_component(node_id)
                block_input_id = self.add_object(block_input)

                # Create CompPrefabInfo for BlockInputEvents
                block_input_prefab_info = self.create_comp_prefab_info(
                    self.generate_file_id()
                )
                block_input_prefab_info_id = self.add_object(block_input_prefab_info)

                # Set references
                block_input["__prefab"] = {"__id__": block_input_prefab_info_id}
                node["_components"].append({"__id__": block_input_id})
                print(f"Block Added BlockInputEvents to ImageView {name}")

        elif "PanelObjectData" in ctype:
            current_anchor = {"x": anchor_x, "y": anchor_y}
            current_size = {"width": size["width"], "height": size["height"]}
            # Second: Check for background color node (Panel_BG_Color) - this should come after image
            background_result = self.create_background_sprite_if_needed(
                node_id, node_dict, f"Panel {name}"
            )
            if background_result:
                bg_color_node_id = self.create_background_color_node(
                    node_id, node_dict, current_size, current_anchor, background_result
                )
                if bg_color_node_id is not None:
                    node["_children"].append({"__id__": bg_color_node_id})
                    print(
                        f"Color Added Panel_BG_Color as background child of Panel {name}"
                    )
            # First: Check for FileData background (Panel_BG_Image)
            if "FileData" in node_dict:
                bg_image_node_id = self.create_filedata_background_node(
                    node_id, node_dict, current_size, current_anchor
                )
                if bg_image_node_id is not None:
                    node["_children"].append({"__id__": bg_image_node_id})
                    print(
                        f"Image  Added Panel_BG_Image as background child of Panel {name}"
                    )
            # Check ClipAble setting to determine if mask should be enabled (same as ScrollView)
            clip_able = node_dict.get("@ClipAble", "True")  # Default to True
            mask_enabled = clip_able.lower() == "true"
            print(f"Mask Panel ClipAble={clip_able}, Mask enabled={mask_enabled}")

            if mask_enabled:
                # Create Mask component for Panel (same as ScrollView content)
                mask_component = self.create_mask_component(node_id, mask_enabled)
                mask_component_id = self.add_object(mask_component)

                # Create CompPrefabInfo for Mask
                mask_prefab_info = self.create_comp_prefab_info(self.generate_file_id())
                mask_prefab_info_id = self.add_object(mask_prefab_info)
                mask_component["__prefab"] = {"__id__": mask_prefab_info_id}
                node["_components"].append({"__id__": mask_component_id})

                print(f"Mask Added Mask component to Panel {name}")

            # Check if Panel needs BlockInputEvents
            touch_enable = node_dict.get("@TouchEnable", "False")
            if touch_enable.lower() == "true":
                # Create BlockInputEvents component
                block_input = self.create_block_input_events_component(node_id)
                block_input_id = self.add_object(block_input)

                # Create CompPrefabInfo for BlockInputEvents
                block_input_prefab_info = self.create_comp_prefab_info(
                    self.generate_file_id()
                )
                block_input_prefab_info_id = self.add_object(block_input_prefab_info)

                # Set references
                block_input["__prefab"] = {"__id__": block_input_prefab_info_id}
                node["_components"].append({"__id__": block_input_id})
                print(f"Block Added BlockInputEvents to Panel {name}")

        elif "ScrollViewObjectData" in ctype:
            # Create ScrollView component and ScrollViewContent child node
            print(f"[EMOJI] Processing ScrollView: {name}")
            current_anchor = {"x": anchor_x, "y": anchor_y}
            current_size = {"width": size["width"], "height": size["height"]}
            # Second: Check for background color node (Panel_BG_Color) - this should come after image
            background_result = self.create_background_sprite_if_needed(
                node_id, node_dict, f"Panel {name}"
            )
            if background_result:
                bg_color_node_id = self.create_background_color_node(
                    node_id, node_dict, current_size, current_anchor, background_result
                )
                if bg_color_node_id is not None:
                    node["_children"].append({"__id__": bg_color_node_id})
                    print(
                        f"Color Added Panel_BG_Color as background child of Panel {name}"
                    )
            # First: Check for FileData background (Panel_BG_Image)
            if "FileData" in node_dict:
                bg_image_node_id = self.create_filedata_background_node(
                    node_id, node_dict, current_size, current_anchor
                )
                if bg_image_node_id is not None:
                    node["_children"].append({"__id__": bg_image_node_id})
                    print(
                        f"Image  Added Panel_BG_Image as background child of Panel {name}"
                    )

            # Extract inner content size from CSD
            inner_width = 200  # Default
            inner_height = 300  # Default
            if "InnerNodeSize" in node_dict:
                inner_data = node_dict["InnerNodeSize"]
                if isinstance(inner_data, dict):
                    inner_width = float(inner_data.get("@Width", 200))
                    inner_height = float(inner_data.get("@Height", 300))
                    print(
                        f"[EMOJI] ScrollView inner size: {inner_width}x{inner_height}"
                    )

            # Create ScrollViewMask node first (using ScrollView's original size)
            # Mask node position should be centered in ScrollView
            scrollview_width = size["width"]
            scrollview_height = size["height"]

            # Calculate mask position to center it in ScrollView
            # If ScrollView anchor is (0.5, 0.5), mask position should be (0, 0)
            # If ScrollView anchor is (0, 0), mask position should be (width/2, height/2)
            mask_x = (0.5 - anchor_x) * scrollview_width
            mask_y = (0.5 - anchor_y) * scrollview_height

            print(f"MOVED ScrollView structure:")
            print(
                f"   ScrollView size: {scrollview_width}x{scrollview_height}, anchor: ({anchor_x}, {anchor_y})"
            )
            print(f"   Mask position (anchor 0.5,0.5): ({mask_x:.1f}, {mask_y:.1f})")

            # Create Mask node with ScrollView's original size
            mask_node = self.create_node(
                "ScrollViewMask", node_id, {"x": mask_x, "y": mask_y, "z": 0}
            )
            mask_node_id = self.add_object(mask_node)

            # Create PrefabInfo for Mask node
            mask_node_prefab_info = self.create_prefab_info(
                1, 0, self.generate_file_id()
            )
            mask_node_prefab_info_id = self.add_object(mask_node_prefab_info)
            mask_node["_prefab"] = {"__id__": mask_node_prefab_info_id}

            # Create UITransform for Mask node (using ScrollView's original size)
            mask_ui_transform = self.create_ui_transform_component(
                mask_node_id, scrollview_width, scrollview_height, 0.5, 0.5
            )
            mask_ui_transform_id = self.add_object(mask_ui_transform)

            # Create CompPrefabInfo for mask UITransform
            mask_ui_prefab_info = self.create_comp_prefab_info(self.generate_file_id())
            mask_ui_prefab_info_id = self.add_object(mask_ui_prefab_info)
            mask_ui_transform["__prefab"] = {"__id__": mask_ui_prefab_info_id}
            mask_node["_components"].append({"__id__": mask_ui_transform_id})

            # Create Mask component for ScrollViewMask
            # Check ClipAble setting to determine if mask should be enabled
            clip_able = node_dict.get("@ClipAble", "True")  # Default to True
            mask_enabled = clip_able.lower() == "true"
            print(f"Mask ScrollView ClipAble={clip_able}, Mask enabled={mask_enabled}")

            mask_component = self.create_mask_component(mask_node_id, mask_enabled)
            mask_component_id = self.add_object(mask_component)

            # Create CompPrefabInfo for Mask
            mask_prefab_info = self.create_comp_prefab_info(self.generate_file_id())
            mask_prefab_info_id = self.add_object(mask_prefab_info)
            mask_component["__prefab"] = {"__id__": mask_prefab_info_id}
            mask_node["_components"].append({"__id__": mask_component_id})

            # Create Graphics component for ScrollViewMask
            graphics_component = self.create_graphics_component(mask_node_id)
            graphics_component_id = self.add_object(graphics_component)

            # Create CompPrefabInfo for Graphics
            graphics_prefab_info = self.create_comp_prefab_info(self.generate_file_id())
            graphics_prefab_info_id = self.add_object(graphics_prefab_info)
            graphics_component["__prefab"] = {"__id__": graphics_prefab_info_id}
            mask_node["_components"].append({"__id__": graphics_component_id})

            # Now create ScrollViewContent as child of ScrollViewMask
            # Content position should be calculated relative to the mask
            # Content should align its left-top corner to Mask's left-top corner
            # Calculate Mask's left-top corner relative to Mask's center anchor (0.5, 0.5)
            mask_left_top_x = -scrollview_width / 2
            mask_left_top_y = scrollview_height / 2

            # Content position: align content's left-top to Mask's left-top
            # Since content anchor is (0,0) (bottom-left), subtract content height from Y
            content_x = mask_left_top_x
            content_y = mask_left_top_y - inner_height

            print(f"   Content size: {inner_width}x{inner_height}")
            print(
                f"   Content position relative to mask (anchor 0,0): ({content_x:.1f}, {content_y:.1f})"
            )

            content_node = self.create_node(
                "ScrollViewContent",
                mask_node_id,
                {"x": content_x, "y": content_y, "z": 0},
            )
            content_node_id = self.add_object(content_node)

            # Create PrefabInfo for ScrollViewContent node
            content_prefab_info = self.create_prefab_info(1, 0, self.generate_file_id())
            content_prefab_info_id = self.add_object(content_prefab_info)
            content_node["_prefab"] = {"__id__": content_prefab_info_id}

            # Create UITransform for ScrollViewContent (using inner size)
            content_ui_transform = self.create_ui_transform_component(
                content_node_id, inner_width, inner_height, 0, 0
            )
            content_ui_transform_id = self.add_object(content_ui_transform)

            # Create CompPrefabInfo for content UITransform
            content_ui_prefab_info = self.create_comp_prefab_info(
                self.generate_file_id()
            )
            content_ui_prefab_info_id = self.add_object(content_ui_prefab_info)
            content_ui_transform["__prefab"] = {"__id__": content_ui_prefab_info_id}
            content_node["_components"].append({"__id__": content_ui_transform_id})

            # Add ScrollViewContent as child of ScrollViewMask
            mask_node["_children"].append({"__id__": content_node_id})

            # Add ScrollViewMask as child of ScrollView node
            node["_children"].append({"__id__": mask_node_id})

            # Create ScrollView component for the main node
            scrollview_component = self.create_scrollview_component(
                node_id, content_node_id, node_dict
            )
            scrollview_component_id = self.add_object(scrollview_component)

            # Create CompPrefabInfo for ScrollView
            scrollview_prefab_info = self.create_comp_prefab_info(
                self.generate_file_id()
            )
            scrollview_prefab_info_id = self.add_object(scrollview_prefab_info)
            scrollview_component["__prefab"] = {"__id__": scrollview_prefab_info_id}
            node["_components"].append({"__id__": scrollview_component_id})

            print(f"Success Created complete ScrollView structure for {name}")
            print(
                f"   [EMOJI] ScrollView component: {scrollview_component['horizontal']=}, {scrollview_component['vertical']=}"
            )
            print(f"   Folder ScrollViewContent size: {inner_width}x{inner_height}")

            # Handle children: separate content children vs UI control children
            if "Children" in node_dict and node_dict["Children"]:
                children = node_dict["Children"].get("AbstractNodeData", [])
                if not isinstance(children, list):
                    children = [children]

                print(
                    f"[EMOJI] Processing {len(children)} children for ScrollView {name}"
                )

                # Process content children (go to ScrollViewContent)
                if children:
                    # Prepare ScrollViewContent's anchor and size for children coordinate conversion
                    # ScrollViewContent uses anchor (0,0) and inner content size
                    content_anchor = {"x": 0.0, "y": 0.0}
                    content_size = {"width": inner_width, "height": inner_height}

                    for child in children:
                        child_id = self.process_node(
                            child,
                            content_node_id,
                            False,
                            current_node_path,
                            content_anchor,
                            content_size,
                            animation_data,
                            inherited_color,
                        )
                        content_node["_children"].append({"__id__": child_id})

        elif "ProjectNodeObjectData" in ctype:
            if "FileData" in node_dict:
                file_path = node_dict["FileData"].get("@Path", "")
                if file_path and file_path.endswith(".csd"):
                    # Check if path starts with "Default/" - these represent non-existent resources
                    if file_path.startswith("Default/"):
                        print(
                            f"Skip Skipping Default resource for nested prefab: {file_path}"
                        )
                        # Skip the entire prefab creation for Default resources
                        pass
                    else:
                        # Extract prefab name from CSD path
                        prefab_name = Path(file_path).stem

                        # Use the actual UUID of the referenced prefab from its meta file
                        # Include the file path to prevent UUID collisions for same-named prefabs in different locations
                        prefab_asset_uuid = self.get_prefab_uuid_by_name(
                            prefab_name, file_path
                        )

                        # Create a child node that will hold the actual prefab reference
                        # This child node uses default transforms (relative to wrapper node)
                        child_node = self.create_node(
                            prefab_name,  # Use prefab name as child node name
                            node_id,  # Parent is the wrapper node
                            {
                                "x": 0,
                                "y": 0,
                                "z": 0,
                            },  # Default position (relative to wrapper)
                            {"x": 1, "y": 1, "z": 1},  # Default scale
                            0,  # Default rotation
                            False,  # Not root
                            True,  # Active
                        )
                        child_node_id = self.add_object(child_node)

                        # Add child to wrapper node
                        node["_children"].append({"__id__": child_node_id})

                        # Generate unique fileId for nested prefab
                        nested_file_id = self.generate_file_id()

                        # Create nested PrefabInfo for the child node (not the wrapper)
                        nested_prefab_info = {
                            "__type__": "cc.PrefabInfo",
                            "root": {"__id__": child_node_id},  # Point to child node
                            "asset": {
                                "__uuid__": prefab_asset_uuid,
                                "__expectedType__": "cc.Prefab",
                            },
                            "fileId": nested_file_id,
                            "instance": None,  # Will be set after PrefabInstance creation
                            "targetOverrides": None,
                        }
                        nested_prefab_info_id = self.add_object(nested_prefab_info)

                        # Create property override target info
                        target_info = {
                            "__type__": "cc.TargetInfo",
                            "localID": [nested_file_id],
                        }
                        target_info_id = self.add_object(target_info)

                        # Create property overrides only for the child node name
                        property_overrides = []

                        # Override _name property for child node
                        name_override = {
                            "__type__": "CCPropertyOverrideInfo",
                            "targetInfo": {"__id__": target_info_id},
                            "propertyPath": ["_name"],
                            "value": prefab_name,
                        }
                        name_override_id = self.add_object(name_override)
                        property_overrides.append({"__id__": name_override_id})

                        # Create PrefabInstance with property overrides
                        prefab_instance = {
                            "__type__": "cc.PrefabInstance",
                            "fileId": self.generate_file_id(),  # Generate unique fileId
                            "prefabRootNode": {
                                "__id__": 1
                            },  # Points to main prefab root
                            "mountedChildren": [],
                            "mountedComponents": [],
                            "propertyOverrides": property_overrides,
                            "removedComponents": [],
                        }
                        prefab_instance_id = self.add_object(prefab_instance)

                        # Update PrefabInfo's instance reference
                        nested_prefab_info["instance"] = {"__id__": prefab_instance_id}

                        # Set the child node's prefab reference to PrefabInfo
                        child_node["_prefab"] = {"__id__": nested_prefab_info_id}

                        # Store the nested prefab reference in the root for tracking
                        if not hasattr(self, "nested_prefab_roots"):
                            self.nested_prefab_roots = []
                        self.nested_prefab_roots.append({"__id__": child_node_id})

                        print(
                            f"[EMOJI] Created wrapper node structure for nested prefab:"
                        )
                        print(f"   [EMOJI] Wrapper node: {name} (ID: {node_id})")
                        print(
                            f"   Found Child prefab node: {prefab_name} (ID: {child_node_id})"
                        )
                        print(f"   Folder Asset UUID: {prefab_asset_uuid}")
                        print(
                            f"   MOVED Wrapper Position: ({position['x']}, {position['y']})"
                        )
                        print(
                            f"   Processing Wrapper Scale: ({scale['x']}, {scale['y']})"
                        )

        # Check if this node has alpha animation and needs an empty sprite component for color animation
        has_alpha_anim = self.has_alpha_animation(node_dict, animation_data)
        if has_alpha_anim and not is_root:
            # Check if node already has a sprite or label component (both have color channels, don't add duplicate)
            has_color_component = any(
                self.objects[comp["__id__"]].get("__type__")
                in ["cc.Sprite", "cc.Label"]
                for comp in node.get("_components", [])
                if "__id__" in comp and comp["__id__"] < len(self.objects)
            )
            if not has_color_component:
                print(
                    f"Color Adding empty sprite component to {name} for alpha animation support"
                )

                # Create empty sprite component (no spriteFrame, just for color animation)
                empty_sprite = self.create_sprite_component(
                    node_id, node_dict, inherited_color
                )
                empty_sprite["_spriteFrame"] = (
                    None  # Explicitly set to None for empty sprite
                )
                empty_sprite["_type"] = 0  # Simple type
                empty_sprite["_sizeMode"] = 0  # Custom mode for empty sprite

                empty_sprite_id = self.add_object(empty_sprite)

                # Create CompPrefabInfo for empty sprite
                empty_sprite_prefab_info = self.create_comp_prefab_info(
                    self.generate_file_id()
                )
                empty_sprite_prefab_info_id = self.add_object(empty_sprite_prefab_info)

                # Set references
                empty_sprite["__prefab"] = {"__id__": empty_sprite_prefab_info_id}
                node["_components"].append({"__id__": empty_sprite_id})
            else:
                print(
                    f"[EMOJI] Node {name} already has sprite component, skipping empty sprite for alpha animation"
                )

        # Add UISkew component if needed (when RotationSkewX != RotationSkewY)
        if needs_uiskew:
            uiskew_component = self.create_uiskew_component(
                node_id, skew_x, skew_y, True
            )
            uiskew_component_id = self.add_object(uiskew_component)

            # Create CompPrefabInfo for UISkew component
            uiskew_prefab_info = self.create_comp_prefab_info(self.generate_file_id())
            uiskew_prefab_info_id = self.add_object(uiskew_prefab_info)

            # Set references
            uiskew_component["__prefab"] = {"__id__": uiskew_prefab_info_id}
            node["_components"].append({"__id__": uiskew_component_id})
            print(f"[SKEW] Added UISkew component to {name} with x={skew_x}, y={skew_y}")

        # Create PrefabInfo for this node after all its components are created (but before processing children)
        if not is_root:
            prefab_info = self.create_prefab_info(
                1, 0, self.generate_file_id()
            )  # Root=1, Asset=0
            prefab_info_id = self.add_object(prefab_info)

            # Set the prefab reference
            node["_prefab"] = {"__id__": prefab_info_id}

        if (
            "Children" in node_dict
            and node_dict["Children"]
            and "ScrollViewObjectData" not in ctype
        ):
            children = node_dict["Children"].get("AbstractNodeData", [])
            if not isinstance(children, list):
                children = [children]

            # Prepare current node's anchor and size for children coordinate conversion
            # Use original size for coordinate calculation, not UI display size
            current_anchor = {"x": anchor_x, "y": anchor_y}
            current_size = {"width": size["width"], "height": size["height"]}

            for child in children:
                child_id = self.process_node(
                    child,
                    node_id,
                    False,
                    current_node_path,
                    current_anchor,
                    current_size,
                    animation_data,
                    inherited_color,
                )
                node["_children"].append({"__id__": child_id})

        return node_id

    def generate_prefab(self, csd_dict):
        """Generate the complete prefab structure with animation support."""
        # Extract PropertyGroup name and type
        try:
            property_group = csd_dict["GameFile"]["PropertyGroup"]
            self.root_name = property_group.get("@Name", "Prefab")
            self.property_group_type = property_group.get("@Type", "Node")
            print(f"PropertyGroup Type: {self.property_group_type}")
        except KeyError:
            print("Warning: Could not find PropertyGroup, using default name 'Prefab'")
            self.root_name = "Prefab"
            self.property_group_type = "Node"

        # Set prefab UUID based on name and path for consistency
        self.prefab_uuid = self.get_prefab_uuid_by_name(
            self.root_name, self.current_relative_path
        )

        # Get root ObjectData and Animation
        try:
            content = csd_dict["GameFile"]["Content"]["Content"]
            root_node = content["ObjectData"]
            animation_data = content.get("Animation")

            # 儲存根節點數據供動畫查找使用
            self.root_csd_data = root_node
            
            # For Layer/Scene types, store root size for child coordinate conversion
            if self.property_group_type in ["Layer", "Scene"]:
                if "Size" in root_node and root_node["Size"]:
                    size_data = root_node["Size"]
                    if size_data and isinstance(size_data, dict):
                        self.root_layer_size["width"] = float(size_data.get("@X", 0))
                        self.root_layer_size["height"] = float(size_data.get("@Y", 0))
                        print(f"Root Layer/Scene Size: {self.root_layer_size['width']}x{self.root_layer_size['height']}")
        except KeyError:
            raise ValueError(
                "Invalid CSD structure: Missing expected 'GameFile/Content/Content/ObjectData' path."
            )

        # Create main prefab object (will be at ID 0)
        prefab_obj = self.create_prefab_object(
            self.root_name, 1
        )  # Data points to root node (ID 1)
        self.add_object(prefab_obj)

        # Build node tag mapping for animation processing
        self.node_tag_mapping = {}

        # Initialize nested prefab roots tracking
        self.nested_prefab_roots = []

        # Process the root node (will be at ID 1)
        root_node_id = self.process_node(
            root_node, None, True, animation_data=animation_data, parent_color=None
        )

        # Process animation data if available
        if animation_data and float(animation_data.get("@Duration", "0")) > 0:
            print(
                f"[EMOJI] Processing animation data (Duration: {animation_data.get('@Duration', '0')} frames)"
            )
            print(f"[EMOJI] Animation data keys: {list(animation_data.keys())}")

            # Check if AnimationList is in content or animation_data
            animation_list = animation_data.get("AnimationList")
            if animation_list:
                print(
                    f"[EMOJI] Found AnimationList in animation_data: {type(animation_list)}"
                )
                print(f"[EMOJI] AnimationList content: {animation_list}")
            else:
                print(f"[EMOJI] AnimationList not found in animation_data")
                # Check if AnimationList is in the parent content
                if "AnimationList" in content:
                    print(
                        f"[EMOJI] Found AnimationList in content: {type(content['AnimationList'])}"
                    )
                    animation_list = content["AnimationList"]

            animation_clip_uuids = self.process_animation_data(
                animation_data, self.node_tag_mapping, content
            )

            if animation_clip_uuids:
                # Add Animation component to root node with UUID references
                root_node_obj = self.objects[root_node_id]
                animation_component = self.create_animation_component(
                    root_node_id, animation_clip_uuids
                )
                animation_id = self.add_object(animation_component)

                # Create CompPrefabInfo for animation component
                animation_prefab_info = self.create_comp_prefab_info(
                    self.generate_file_id()
                )
                animation_prefab_info_id = self.add_object(animation_prefab_info)

                # Set references
                animation_component["__prefab"] = {"__id__": animation_prefab_info_id}
                root_node_obj["_components"].append({"__id__": animation_id})

                print(
                    f"Success Added Animation component with {len(animation_clip_uuids)} clip reference(s)"
                )

        # Child nodes' PrefabInfo are now created immediately after their components
        # This ensures the correct ID sequence matching the reference structure

        # Create root node's UITransform and PrefabInfo at the end (matching engine structure)
        if hasattr(self, "root_node_obj") and self.root_node_obj:
            # Create UITransform for root node (placed at the end before final PrefabInfo)
            ui_width = (
                self.root_ui_size["width"] if hasattr(self, "root_ui_size") else 100
            )
            ui_height = (
                self.root_ui_size["height"] if hasattr(self, "root_ui_size") else 100
            )
            anchor_x = self.root_anchor["x"] if hasattr(self, "root_anchor") else 0.5
            anchor_y = self.root_anchor["y"] if hasattr(self, "root_anchor") else 0.5

            root_ui_transform = self.create_ui_transform_component(
                1, ui_width, ui_height, anchor_x, anchor_y
            )  # Root node is ID 1
            root_ui_transform_id = self.add_object(root_ui_transform)

            # Create CompPrefabInfo for root UITransform
            root_ui_prefab_info = self.create_comp_prefab_info(self.generate_file_id())
            root_ui_prefab_info_id = self.add_object(root_ui_prefab_info)

            # Set references for root UITransform
            root_ui_transform["__prefab"] = {"__id__": root_ui_prefab_info_id}
            self.root_node_obj["_components"].append({"__id__": root_ui_transform_id})

            # Create final root PrefabInfo with nestedPrefabInstanceRoots
            # Collect all nested prefab root references

            final_root_prefab_info = {
                "__type__": "cc.PrefabInfo",
                "root": {"__id__": 1},
                "asset": {"__id__": 0},
                "fileId": self.generate_file_id(),
                "instance": None,
                "targetOverrides": None,
            }
            if (
                hasattr(self, "nested_prefab_roots")
                and len(self.nested_prefab_roots) > 0
            ):
                final_root_prefab_info["nestedPrefabInstanceRoots"] = (
                    self.nested_prefab_roots
                )

            print(f"[EMOJI] Added final root PrefabInfo (root-specific structure)")
            final_prefab_info_id = self.add_object(final_root_prefab_info)

            # Set the root node's prefab reference to point to the final PrefabInfo
            self.root_node_obj["_prefab"] = {"__id__": final_prefab_info_id}

        return self.objects

    def generate_meta_file(self, prefab_name):
        """Generate the .meta file for the prefab."""
        return {
            "ver": "1.1.49",
            "importer": "prefab",
            "imported": True,
            "uuid": self.prefab_uuid,
            "files": [".json"],
            "subMetas": {},
            "userData": {"syncNodeName": prefab_name},
        }

    def print_image_mapping_report(self):
        """Print a report of image mappings for debugging."""
        print("\n=== Image Mapping Report ===")
        print(f"Found {len(self.image_manager.available_images)} available images:")
        for img in sorted(self.image_manager.available_images):
            print(f"  - {img}")

        print(f"\nGenerated {len(self.image_manager.image_cache)} sprite frame UUIDs:")
        for path, uuid in self.image_manager.image_cache.items():
            print(f"  - {Path(path).name} -> {uuid}")

        print(f"\nPath mappings: {len(self.image_manager.path_mapping)}")
        for key, value in sorted(self.image_manager.path_mapping.items()):
            if key != Path(value).name:  # Don't show filename->fullpath mappings
                print(f"  - {key} -> {Path(value).name}")
        print("=" * 30)


def parse_csd_to_prefab(
    csd_path,
    output_path,
    image_manager=None,
    shared_prefab_uuid_mapping=None,
    shared_file_id_manager=None,
    shared_uuid_manager=None,
    max_depth=4,
    input_folder=INPUT_FOLDER,
):
    """
    Parses a Cocos Studio CSD XML file and converts it to a Cocos Creator 3.8.1 Prefab JSON.
    Now includes image resource management and validation.

    Args:
        csd_path (str): Path to the input CSD file.
        output_path (str): Path to save the output Prefab JSON.
        image_manager (ImageResourceManager): Shared image manager for consistent UUIDs.
        shared_prefab_uuid_mapping (dict): Shared UUID mapping for consistent prefab references.
        shared_file_id_manager (FileIdManager): Shared fileId manager for consistent ID allocation.
        max_depth (int): Maximum allowed node depth before flattening (default: 4).

    Returns:
        PrefabGenerator: The generator instance for later processing.
        None: If the file should be skipped (e.g., Scene3D files).
    """
    print(f"[EMOJI] Converting CSD to Prefab: {csd_path}")
    print("=" * 60)

    # Step 1: Load and parse CSD XML (check for enhanced version first)
    actual_csd_path = csd_path
    
    # Check if there's an enhanced version in temp_enhanced_csd
    try:
        csd_file_path = Path(csd_path).resolve()
        input_path = Path(input_folder).resolve()
        relative_path = csd_file_path.relative_to(input_path)
        
        # Construct potential enhanced CSD path
        temp_enhanced_dir = input_path.parent / "temp_enhanced_csd"
        enhanced_csd_path = temp_enhanced_dir / relative_path
        
        if enhanced_csd_path.exists():
            actual_csd_path = str(enhanced_csd_path)
            print(f"[EMOJI] Using enhanced CSD: {enhanced_csd_path.name}")
        else:
            print(f"[EMOJI] Using original CSD: {Path(csd_path).name}")
            
    except Exception as e:
        print(f"WARNING  Could not check for enhanced CSD, using original: {e}")
    
    with open(actual_csd_path, "r", encoding="utf-8") as f:
        xml_content = f.read()
    
    csd_dict = xmltodict.parse(xml_content)

    # Step 1.5: Check if this is a Scene3D file that should be skipped
    try:
        property_group = csd_dict["GameFile"]["PropertyGroup"]
        file_type = property_group.get("@Type", "")
        if file_type == "Scene3D":
            print(f"Skip Skipping Scene3D file: {Path(csd_path).name}")
            print("   This is a 3D scene file, not a 2D UI prefab")
            print("=" * 60)
            return None
    except KeyError:
        # If PropertyGroup is missing, continue with normal processing
        pass

    # Step 2: Use provided input folder for image scanning (and UUID path calculation)
    # input_folder parameter is already provided to this function

    # Step 3: Generate prefab using shared image manager, UUID mapping, and fileId manager
    if image_manager is None:
        generator = PrefabGenerator(
            str(input_folder), shared_file_id_manager, shared_uuid_manager
        )
    else:
        generator = PrefabGenerator(
            str(input_folder), shared_file_id_manager, shared_uuid_manager
        )
        generator.image_manager = image_manager  # Use shared image manager

    # Use shared UUID mapping for consistent prefab references
    if shared_prefab_uuid_mapping is not None:
        generator.prefab_uuid_mapping = shared_prefab_uuid_mapping

    # Calculate relative path from input folder to the CSD file for UUID collision prevention
    try:
        csd_file_path = Path(csd_path).resolve()
        input_path = Path(input_folder).resolve()
        relative_path = csd_file_path.relative_to(input_path)
        generator.current_relative_path = str(relative_path)
        print(
            f"Processing Set relative path for UUID generation: {generator.current_relative_path}"
        )
    except ValueError:
        # If CSD path is not relative to input folder, create a unique path based on file structure
        csd_file_path = Path(csd_path).resolve()

        # Try to find a parent directory that contains common paths like "input" or project structure
        # This creates a more unique identifier than just filename
        path_parts = csd_file_path.parts

        # Look for meaningful directory structure (like "Lua", "LuaResource", etc.)
        meaningful_parts = []
        found_meaningful = False

        for part in reversed(path_parts[:-1]):  # Exclude filename
            meaningful_parts.insert(0, part)
            if part.lower() in [
                "lua",
                "luaresource",
                "common",
                "commonresource",
                "input",
            ]:
                found_meaningful = True
                break
            # Limit to last 4 directory levels to keep keys reasonable
            if len(meaningful_parts) >= 4:
                break

        if meaningful_parts:
            dir_path = "/".join(meaningful_parts)
            generator.current_relative_path = f"{dir_path}/{csd_file_path.name}"
        else:
            # Ultimate fallback: use absolute path hash to ensure uniqueness
            import hashlib

            path_hash = hashlib.md5(str(csd_file_path).encode()).hexdigest()[:8]
            generator.current_relative_path = f"{path_hash}_{csd_file_path.name}"

        print(
            f"Processing Fallback relative path for UUID generation: {generator.current_relative_path}"
        )

    prefab_objects = generator.generate_prefab(csd_dict)

    # Step 4: Write prefab JSON directly to specified output path
    output_file = Path(output_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(prefab_objects, f, indent=2, ensure_ascii=False)

    # Step 5: Generate .meta file for prefab
    meta_path = str(output_file) + ".meta"
    meta_data = generator.generate_meta_file(generator.root_name)

    # Update shared UUID mapping with this prefab's UUID for future references
    if shared_prefab_uuid_mapping is not None:
        # Use full relative path as key to prevent UUID conflicts for same-named files in different locations
        mapping_key = (
            f"{generator.current_relative_path}#{generator.root_name}"
            if generator.current_relative_path
            else generator.root_name
        )
        shared_prefab_uuid_mapping[mapping_key] = generator.prefab_uuid

    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta_data, f, indent=2, ensure_ascii=False)

    # Step 6: Return generator for later resource processing
    return generator


def batch_convert_csd_to_prefab(input_folder=INPUT_FOLDER, output_folder=OUTPUT_FOLDER):
    """
    Batch convert all CSD files from input folder to output folder while maintaining directory structure.
    Now includes comprehensive image resource management and validation.

    Args:
        input_folder (str): Path to the input folder containing CSD files.
        output_folder (str): Path to the output folder for generated Prefab files.
        resources_json (str): Path to the resources.json file for caching resource mappings.

    Returns:
        dict: Summary of batch conversion results.
    """
    input_path = Path(input_folder)
    output_path = Path(output_folder)

    # Check if input folder exists
    if not input_path.exists():
        print(f"ERROR: Input folder '{input_folder}' does not exist!")
        return {"error": f"Input folder '{input_folder}' does not exist"}

    # Find all CSD files recursively
    csd_files = list(input_path.rglob("*.csd"))

    if not csd_files:
        print(f"ERROR: No CSD files found in '{input_folder}' folder!")
        return {"error": f"No CSD files found in '{input_folder}' folder"}

    print(f"Found {len(csd_files)} CSD files in '{input_folder}' folder")
    print("=" * 80)

    # Step 0: Pre-process CSD files with CSDReader before conversion
    print(f"Pre-processing CSD files with CSDReader...")
    print("=" * 80)

    try:
        csd_reader = CSDReader()

        # Create temporary output directory for enhanced CSD files
        temp_enhanced_dir = input_path.parent / "temp_enhanced_csd"
        temp_enhanced_dir.mkdir(parents=True, exist_ok=True)

        # Process each CSD file with CSDReader
        enhanced_csd_files = []
        for csd_file in csd_files:
            try:
                # Calculate relative path from input folder
                relative_path = csd_file.relative_to(input_path)

                # Create corresponding output path in temp directory
                enhanced_file = temp_enhanced_dir / relative_path
                enhanced_file.parent.mkdir(parents=True, exist_ok=True)

                print(f"Processing Processing: {csd_file.name}")

                # Use enhanced mode for better animation processing
                result = csd_reader.process_file(
                    str(csd_file), str(enhanced_file), enhanced_mode=True
                )

                if result and result.get("success", False):
                    enhanced_csd_files.append(enhanced_file)
                    print(f"Success Enhanced: {csd_file.name}")
                else:
                    # If enhancement fails, use original file
                    enhanced_csd_files.append(csd_file)
                    print(
                        f"WARNING  Enhancement failed, using original: {csd_file.name}"
                    )

            except Exception as e:
                print(f"ERROR Error processing {csd_file.name}: {str(e)}")
                # If processing fails, use original file
                enhanced_csd_files.append(csd_file)

        print(
            f"Success CSDReader preprocessing completed. {len(enhanced_csd_files)} files ready for conversion."
        )
        print("=" * 80)

        # Keep csd_files and input_path unchanged
        # Enhanced CSD files will be checked individually in parse_csd_to_prefab

    except Exception as e:
        print(f"ERROR Error during CSDReader preprocessing: {str(e)}")
        print("WARNING  Continuing with original CSD files...")
        print("=" * 80)

    # Create unified output structure with Common folder
    prefabs_dir = output_path / "Common" / "Prefab"
    images_dir = output_path / "Common" / "Img"
    prefabs_dir.mkdir(parents=True, exist_ok=True)
    images_dir.mkdir(parents=True, exist_ok=True)

    # Create shared UUID manager for global UUID uniqueness
    print("ID Initializing shared UUID manager...")
    shared_uuid_manager = UUIDManager()

    # Create shared image manager for consistent UUIDs
    print("Folder Initializing shared image resource manager...")
    shared_image_manager = ImageResourceManager(shared_uuid_manager)
    
    # Try to load existing resources cache first to reuse path_mapping
    if USE_INPUT_RESOURCES_JSON:
        try:
            shared_image_manager.load_resources_from_json(INPUT_RESOURCES_JSON)
            print(f"Loaded Loaded cached path mappings: {len(shared_image_manager.path_mapping)} entries")
        except Exception as e:
            print(f"WARNING Failed to load input resources cache: {str(e)}")
    else:
        try:
            shared_image_manager.load_resources_from_json(OUTPUT_RESOURCES_JSON)
            print(f"Loaded Loaded cached path mappings: {len(shared_image_manager.path_mapping)} entries")
        except Exception as e:
            print(f"INFO No existing resources cache found, starting fresh")
    
    # Scan for available images/resources (this will update path_mapping with new discoveries)
    shared_image_manager.scan_for_images(str(input_path))
    print(
        f"Success Found {len(shared_image_manager.available_images)} available images"
    )

    print("=" * 80)

    # Create shared UUID mapping for consistent prefab references
    shared_prefab_uuid_mapping = {}

    # Create shared fileId manager for consistent ID allocation
    print("ID Initializing shared fileId manager...")
    shared_file_id_manager = FileIdManager()
    stats = shared_file_id_manager.get_usage_stats()
    print(f"Success Loaded {stats['total_available']} fileId entries")

    # Pre-scan all CSD files for Scale9 information
    print("[EMOJI] Pre-scanning for Scale9 information...")
    scan_scale9_info_from_csd_files(csd_files, shared_image_manager)
    total_scale9_images = len(shared_image_manager.scale9_info_cache)
    print(f"Success Found {total_scale9_images} images with Scale9 settings")

    # Batch conversion statistics
    batch_stats = {
        "total_files": len(csd_files),
        "success_count": 0,
        "error_count": 0,
        "skipped_count": 0,
        "total_images_copied": 0,
        "total_image_errors": 0,
        "total_animations_exported": 0,
        "total_valid_references": 0,
        "total_invalid_references": 0,
        "processed_files": [],
        "all_generators": [],
    }

    # First pass: convert all CSD files with shared image manager
    for i, csd_file in enumerate(csd_files, 1):
        try:
            print(f"\n[EMOJI] Processing file {i}/{len(csd_files)}: {csd_file.name}")
            print("-" * 60)

            # Calculate relative path from input folder
            relative_path = csd_file.relative_to(input_path)

            # Create corresponding output path in Common/Prefab directory
            output_file = prefabs_dir / relative_path.with_suffix(".prefab")

            # Reset fileId manager for new prefab
            shared_file_id_manager.reset_for_new_prefab()

            # Convert the CSD file with shared image manager, UUID mapping, and fileId manager
            generator = parse_csd_to_prefab(
                str(csd_file),
                str(output_file),
                shared_image_manager,
                shared_prefab_uuid_mapping,
                shared_file_id_manager,
                shared_uuid_manager,
                max_depth=4,
                input_folder=str(input_path),
            )

            # Check if file was skipped (returns None)
            if generator is None:
                batch_stats["skipped_count"] += 1
                batch_stats["processed_files"].append(
                    {
                        "file": str(relative_path),
                        "status": "skipped",
                        "reason": "Scene3D file - not a 2D UI prefab",
                    }
                )
                print(f"SKIP  SKIPPED: {relative_path}")
            else:
                batch_stats["all_generators"].append(generator)
                batch_stats["success_count"] += 1
                batch_stats["processed_files"].append(
                    {
                        "file": str(relative_path),
                        "status": "success",
                        "generator": generator,
                    }
                )
                print(f"Success SUCCESS: {relative_path}")

        except Exception as e:
            traceback.print_exc()
            batch_stats["error_count"] += 1
            batch_stats["processed_files"].append(
                {
                    "file": str(csd_file.relative_to(input_path)),
                    "status": "error",
                    "error": str(e),
                }
            )
            print(
                f"ERROR ERROR converting {csd_file.relative_to(input_path)}: {str(e)}"
            )

    # Second pass: process fonts and particles FIRST to mark moved images
    if OUTPUT_ANYWAY:
        # When OUTPUT_ANYWAY is True, copy all available resources
        all_used_images = shared_image_manager.available_images
        all_used_particles = shared_image_manager.available_particles
        all_used_fonts = shared_image_manager.available_fonts
        print(f"Processing OUTPUT_ANYWAY enabled: copying ALL available resources")
    else:
        # When OUTPUT_ANYWAY is False, copy only used resources
        all_used_images = shared_image_manager.used_images
        all_used_particles = shared_image_manager.used_particles
        all_used_fonts = shared_image_manager.used_fonts

    # STEP 1: Copy fonts to Common/Font directory and their referenced images
    if all_used_fonts:
        fonts_dir = output_path / "Common" / "Font"
        fonts_dir.mkdir(parents=True, exist_ok=True)

        print(f"\nFont Copying {len(all_used_fonts)} used fonts to Common/Font")
        print("=" * 80)

        font_texture_count = 0

        for source_font in all_used_fonts:
            try:
                source_path = Path(source_font)

                # Calculate relative path from input_path
                if source_path.is_relative_to(input_path):
                    relative_font_path = source_path.relative_to(input_path)
                else:
                    relative_font_path = (
                        source_path.name
                    )  # Fallback to filename if not relative

                dest_path = (
                    fonts_dir / relative_font_path.name
                )  # Use just filename for fonts

                # Copy font file
                shutil.copy2(source_path, dest_path)
                print(f"Success Copied: {relative_font_path.name}")
                batch_stats[
                    "total_images_copied"
                ] += 1  # Count fonts as part of resources

                # Parse FNT file to find referenced texture files
                texture_files = shared_image_manager.parse_fnt_texture_files(
                    source_font
                )

                # Copy referenced texture files
                for texture_filename in texture_files:
                    try:
                        # texture path is the same as font path only replace filename
                        texture_file = Path(source_font).with_name(texture_filename)

                        # Copy texture file to fonts directory
                        texture_dest = fonts_dir / texture_filename
                        shutil.copy2(texture_file, texture_dest)

                        # Mark texture as used and copied
                        shared_image_manager.used_images.add(str(texture_file))
                        shared_image_manager.copied_images[str(texture_file)] = str(
                            texture_dest
                        )

                        # Mark this image as moved to avoid duplicating in Img directory
                        moved_path = str(texture_file)
                        shared_image_manager.moved_images.add(moved_path)
                        print(f"MOVED: {texture_file.name} to Font directory")
                        print(f"DEBUG: Added to moved_images: {moved_path}")

                        # Generate .meta file for the texture
                        shared_image_manager.generate_image_meta_file(
                            str(texture_file), texture_dest
                        )

                        font_texture_count += 1
                        print(f"  Texture Copied texture: {texture_file}")
                        batch_stats["total_images_copied"] += 1

                    except Exception as e:
                        print(f"  ERROR Error copying texture {texture_file}: {str(e)}")

            except Exception as e:
                batch_stats["total_image_errors"] += 1
                print(f"ERROR Error copying {source_path.name}: {str(e)}")

        print(
            f"Texture Total font texture files copied to Common/Font: {font_texture_count}"
        )

        # Generate .meta files for all copied fonts using shared image manager
        print(f"\nFont Generating .meta files for {len(all_used_fonts)} fonts")
        print("=" * 80)

        for source_font in all_used_fonts:
            try:
                source_path = Path(source_font)
                dest_path = fonts_dir / source_path.name

                # Generate meta file using shared image manager
                shared_image_manager.generate_font_meta_file(source_font, dest_path)
                print(f"Success Meta: {source_path.name}.meta")

            except Exception as e:
                print(f"ERROR Error generating meta for {source_path.name}: {str(e)}")

    # STEP 2: Copy particles to Common/Particle directory
    if all_used_particles:
        particles_dir = output_path / "Common" / "Particle"
        particles_dir.mkdir(parents=True, exist_ok=True)

        print(
            f"\n[EMOJI] Copying {len(all_used_particles)} used particles to Common/Particle"
        )
        print("=" * 80)

        for source_particle in all_used_particles:
            try:
                source_path = Path(source_particle)

                # Calculate relative path from input_path
                if source_path.is_relative_to(input_path):
                    relative_particle_path = source_path.relative_to(input_path)
                else:
                    relative_particle_path = (
                        source_path.name
                    )  # Fallback to filename if not relative

                dest_path = (
                    particles_dir / relative_particle_path.name
                )  # Use just filename for particles

                # Copy particle file
                shutil.copy2(source_path, dest_path)
                print(f"Success Copied: {relative_particle_path.name}")
                batch_stats[
                    "total_images_copied"
                ] += 1  # Count particles as part of resources

            except Exception as e:
                batch_stats["total_image_errors"] += 1
                print(f"ERROR Error copying {source_path.name}: {str(e)}")

        # Generate .meta files for all copied particles using shared image manager
        print(f"\nFont Generating .meta files for {len(all_used_particles)} particles")
        print("=" * 80)

        for source_particle in all_used_particles:
            try:
                source_path = Path(source_particle)
                dest_path = particles_dir / source_path.name

                # Generate meta file using shared image manager
                shared_image_manager.generate_particle_meta_file(
                    source_particle, dest_path
                )
                print(f"Success Meta: {source_path.name}.meta")

            except Exception as e:
                print(f"ERROR Error generating meta for {source_path.name}: {str(e)}")

        # Post-processing: Handle particle textures in output/Common/Particle
        print(f"\nProcessing Post-processing particle textures in {particles_dir}")
        print("=" * 80)

        particle_texture_count = 0
        processed_particles = []  # List to track (plist_path, texture_path) pairs

        for plist_file in particles_dir.glob("*.plist"):
            try:
                print(f"DEBUG Processing: {plist_file.name}")

                # First, try to extract embedded texture
                texture_path, was_embedded = (
                    shared_image_manager.extract_texture_from_plist(
                        str(plist_file), particles_dir
                    )
                )
                if texture_path and was_embedded:
                    particle_texture_count += 1
                    processed_particles.append((str(plist_file), str(texture_path)))
                    print(f"  Texture Extracted embedded texture: {texture_path.name}")
                else:
                    # No embedded texture, check for external texture reference
                    texture_path, was_copied = (
                        shared_image_manager.copy_external_particle_texture(
                            str(plist_file), particles_dir, input_path
                        )
                    )
                    if texture_path and was_copied:
                        particle_texture_count += 1
                        processed_particles.append((str(plist_file), str(texture_path)))
                        print(f"  Texture Copied external texture: {texture_path.name}")

            except Exception as e:
                print(f"ERROR Error processing {plist_file.name}: {str(e)}")

        print(
            f"Texture Total particle texture files processed: {particle_texture_count}"
        )

        # Generate .meta files for all processed textures
        if particle_texture_count > 0:
            print(
                f"\nFont Generating .meta files for {particle_texture_count} particle textures"
            )
            print("=" * 80)

            for plist_path, texture_path in processed_particles:
                try:
                    texture_path_obj = Path(texture_path)
                    # Mark this texture as moved to avoid duplicating in Img directory
                    shared_image_manager.moved_images.add(str(texture_path))
                    print(
                        f"MOVED Marked {texture_path_obj.name} as moved to Particle directory"
                    )

                    # Generate meta file for the texture
                    shared_image_manager.generate_image_meta_file(
                        str(texture_path), texture_path_obj
                    )
                    print(f"Success Meta: {texture_path_obj.name}.meta")

                except Exception as e:
                    print(
                        f"ERROR Error generating meta for texture {Path(texture_path).name}: {str(e)}"
                    )

        # Update plist .meta files with spriteFrameUuid
        if particle_texture_count > 0:
            print(f"\nProcessing Updating plist .meta files with spriteFrameUuid")
            print("=" * 80)

            for plist_path, texture_path in processed_particles:
                try:
                    plist_path_obj = Path(plist_path)

                    # Get the UUID for the texture
                    texture_uuid = shared_image_manager.get_sprite_frame_uuid(
                        str(texture_path)
                    )
                    if texture_uuid:
                        # Find the corresponding .meta file for the plist
                        meta_path = plist_path_obj.with_suffix(".plist.meta")

                        if meta_path.exists():
                            with open(meta_path, "r", encoding="utf-8") as f:
                                meta_data = json.load(f)

                            if "userData" in meta_data:
                                meta_data["userData"]["spriteFrameUuid"] = texture_uuid
                                print(
                                    f"Success Updated spriteFrameUuid: {texture_uuid} for {plist_path_obj.name}"
                                )

                                # Write updated meta file
                                with open(meta_path, "w", encoding="utf-8") as f:
                                    json.dump(
                                        meta_data, f, indent=2, ensure_ascii=False
                                    )
                            else:
                                print(f"WARNING  No userData found in {meta_path.name}")
                        else:
                            print(
                                f"WARNING  Failed to generate UUID for {Path(texture_path).name}"
                            )

                except Exception as e:
                    print(
                        f"ERROR Error updating meta for {Path(plist_path).name}: {str(e)}"
                    )

    # STEP 3: Now copy remaining images to Common/Img (excluding those moved to Font/Particle)

    if all_used_images:
        print(
            f"\nFolder Copying {len(all_used_images)} used images to Common/Img, preserving relative paths"
        )
        print("=" * 80)

        for source_image in all_used_images:
            try:
                source_path = Path(source_image)

                # Skip images that have been moved to font/particle directories
                # Use Path.resolve() to normalize paths for comparison
                source_resolved = str(source_path.resolve())
                moved_resolved = {
                    str(Path(p).resolve()) for p in shared_image_manager.moved_images
                }

                if source_resolved in moved_resolved:
                    print(
                        f"SKIP: {source_path.name} (already moved to Font/Particle directory)"
                    )
                    continue

                # Calculate relative path from input_path
                if source_path.is_relative_to(input_path):
                    relative_image_path = source_path.relative_to(input_path)
                else:
                    relative_image_path = (
                        source_path.name
                    )  # Fallback to filename if not relative

                dest_path = images_dir / relative_image_path
                dest_path.parent.mkdir(parents=True, exist_ok=True)

                # Copy image file
                shutil.copy2(source_path, dest_path)
                print(f"Success Copied: {relative_image_path}")
                batch_stats["total_images_copied"] += 1

            except Exception as e:
                batch_stats["total_image_errors"] += 1
                print(f"ERROR Error copying {source_path.name}: {str(e)}")

        # Generate .meta files for all copied images using shared image manager
        print(f"\nFont Generating .meta files for {len(all_used_images)} images")
        print("=" * 80)

        for source_image in all_used_images:
            try:
                source_path = Path(source_image)

                # Skip images that have been moved to font/particle directories
                # Use Path.resolve() to normalize paths for comparison
                source_resolved = str(source_path.resolve())
                moved_resolved = {
                    str(Path(p).resolve()) for p in shared_image_manager.moved_images
                }

                if source_resolved in moved_resolved:
                    print(
                        f"SKIP  Skipping meta for {source_path.name} (already moved to Font/Particle directory)"
                    )
                    continue

                # Calculate same relative path
                if source_path.is_relative_to(input_path):
                    relative_image_path = source_path.relative_to(input_path)
                else:
                    relative_image_path = source_path.name

                dest_path = images_dir / relative_image_path

                # Generate meta file using shared image manager
                shared_image_manager.generate_image_meta_file(source_image, dest_path)
                print(f"Success Meta: {relative_image_path}.meta")

            except Exception as e:
                print(f"ERROR Error generating meta for {source_path.name}: {str(e)}")

    # Third pass: export all animation clips from all generators
    print(f"\n[EMOJI] Exporting animation clips from all prefabs")
    print("=" * 80)

    all_animation_clips = []
    for processed_file in batch_stats["processed_files"]:
        if processed_file["status"] == "success":
            generator = processed_file["generator"]
            all_animation_clips.extend(generator.animation_clips)

    # Export all animation clips with directory structure matching prefabs
    if all_animation_clips:
        anim_exported_count = 0
        print(
            f"Folder Exporting {len(all_animation_clips)} animation clips with organized structure"
        )

        # First pass: collect all animation names and count occurrences
        name_counts = {}
        for anim_info in all_animation_clips:
            anim_name = anim_info["name"]
            name_counts[anim_name] = name_counts.get(anim_name, 0) + 1

        # Identify which names need UUID suffix (duplicates)
        names_need_uuid = {name for name, count in name_counts.items() if count > 1}

        if names_need_uuid:
            print(
                f"WARNING  Found {len(names_need_uuid)} duplicate animation names, will add UUID suffix"
            )
            for duplicate_name in names_need_uuid:
                print(
                    f"   - {duplicate_name} ({name_counts[duplicate_name]} occurrences)"
                )

        # Second pass: export files with appropriate naming and directory structure
        for anim_info in all_animation_clips:
            try:
                anim_name = anim_info["name"]
                anim_data = anim_info["data"]
                anim_uuid = anim_info["uuid"]
                source_path = anim_info.get("source_path")

                # Determine the output directory based on source path
                if source_path:
                    # Convert source path from .csd to animation directory structure
                    # e.g., "Lua/BattlePassRCResource/Csd/GuideRCBP/GuideRCBP_Role.csd"
                    # becomes "Common/Animation/Lua/BattlePassRCResource/Csd/GuideRCBP/"
                    source_path_obj = Path(source_path)
                    # Get directory without the filename
                    relative_dir = source_path_obj.parent
                    anim_dir = output_path / "Common" / "Animation" / relative_dir
                else:
                    # Fallback to original behavior if source_path is missing
                    anim_dir = output_path / "Common" / "Animation"
                
                # Create directory if it doesn't exist
                anim_dir.mkdir(parents=True, exist_ok=True)

                # Determine final filename - add UUID suffix only if duplicate
                if anim_name in names_need_uuid:
                    uuid_suffix = anim_uuid[-4:]  # Get last 4 characters of UUID
                    final_filename = f"{anim_name}_{uuid_suffix}"
                else:
                    final_filename = anim_name

                # Export .anim file
                anim_file = anim_dir / f"{final_filename}.anim"
                with open(anim_file, "w", encoding="utf-8") as f:
                    json.dump(anim_data, f, indent=2, ensure_ascii=False)

                # Generate .meta file for animation
                meta_data = {
                    "ver": "2.0.3",
                    "importer": "animation-clip",
                    "imported": True,
                    "uuid": anim_uuid,
                    "files": [".cconb"],
                    "subMetas": {},
                    "userData": {"name": anim_name},
                }

                meta_file = anim_dir / f"{final_filename}.anim.meta"
                with open(meta_file, "w", encoding="utf-8") as f:
                    json.dump(meta_data, f, indent=2, ensure_ascii=False)

                anim_exported_count += 1
                
                # Show relative path for better clarity
                relative_anim_path = anim_file.relative_to(output_path)
                print(f"Success Exported: {relative_anim_path}")

            except Exception as e:
                print(f"ERROR Error exporting animation {anim_name}: {str(e)}")

        batch_stats["total_animations_exported"] = anim_exported_count
        print(
            f"Stats Animation export summary: {anim_exported_count}/{len(all_animation_clips)} clips exported"
        )
    else:
        batch_stats["total_animations_exported"] = 0
        print("[EMOJI] No animation clips found to export")

    # Fourth pass: validate all references using shared image manager
    print(f"\nDEBUG Validating image references across all prefabs")
    print("=" * 80)

    # Create a combined list of all prefab objects for validation
    all_prefab_objects = []
    for processed_file in batch_stats["processed_files"]:
        if processed_file["status"] == "success":
            generator = processed_file["generator"]
            all_prefab_objects.extend(generator.objects)

    # Validate all references using shared image manager
    validation_results = shared_image_manager.validate_image_references(
        all_prefab_objects
    )

    batch_stats["total_valid_references"] = validation_results.get(
        "valid_references", 0
    )
    batch_stats["total_invalid_references"] = validation_results.get(
        "invalid_references", 0
    )

    # Print final batch summary
    print("\n" + "=" * 80)
    print("[EMOJI] BATCH CONVERSION COMPLETED!")
    print("=" * 80)
    # Get UUID manager statistics
    uuid_stats = shared_uuid_manager.get_usage_stats()

    print(f"Stats Overall Statistics:")
    print(f"  Folder Total files processed: {batch_stats['total_files']}")
    print(f"  Success Successfully converted: {batch_stats['success_count']}")
    print(f"  SKIP  Skipped files (Scene3D): {batch_stats['skipped_count']}")
    print(f"  ERROR Conversion errors: {batch_stats['error_count']}")
    print(f"  Image Total images copied: {batch_stats['total_images_copied']}")
    print(f"  WARNING Image copy errors: {batch_stats['total_image_errors']}")
    print(
        f"  [EMOJI] Total animations exported: {batch_stats['total_animations_exported']}"
    )
    print(f"  DEBUG Valid image references: {batch_stats['total_valid_references']}")
    print(
        f"  ERROR Invalid image references: {batch_stats['total_invalid_references']}"
    )
    print(f"  ID Total unique UUIDs generated: {uuid_stats['total_uuids']}")
    print(f"  Processing Base UUIDs created: {uuid_stats['unique_base_uuids']}")
    print(f"  Skip Missing resource files: {len(shared_image_manager.not_found_files)}")
    print(
        f"  MOVED Images moved to Font/Particle: {len(shared_image_manager.moved_images)}"
    )
    print(f"  [EMOJI] Output folder: {output_folder}")

    # Show unified directory structure
    print(f"\nFolder Unified directory structure:")
    print(f"  {output_folder}/")
    print(f"  ├── NotFoundList.txt   # List of missing resource files")
    print(f"  └── Common/")
    print(f"      ├── Prefab/        # All prefab files (.prefab + .meta)")
    print(f"      ├── Img/           # All image resources (.png + .meta)")
    print(f"      ├── Particle/      # All particle files (.plist + .meta)")
    print(f"      └── Animation/     # All animation clips (.anim + .meta)")

    # Print shared image manager report
    shared_image_manager.print_image_mapping_report()

    # Print fileId usage report
    final_stats = shared_file_id_manager.get_usage_stats()
    print(f"\nID FileId Usage Report:")
    print(f"  Stats Total available IDs: {final_stats['total_available']}")
    print(f"  Success IDs used: {final_stats['used_count']}")
    print(f"  [EMOJI] IDs remaining: {final_stats['remaining']}")
    if final_stats["total_available"] > 0:
        usage_percentage = (
            final_stats["used_count"] / final_stats["total_available"]
        ) * 100
        print(f"  [EMOJI] Usage rate: {usage_percentage:.1f}%")

    # Save UUID cache after all processing is complete
    print(f"\nSave Saving UUID cache...")
    shared_image_manager.save_uuid_cache_to_json()

    # Save NotFoundList for reference
    print(f"\n[EMOJI] Generating NotFoundList...")
    output_not_found_path = Path(output_folder) / "NotFoundList.txt"
    shared_image_manager.save_not_found_list(output_not_found_path)

    # Cleanup: Remove temporary enhanced CSD directory if it was created
    temp_enhanced_dir = Path(input_folder).parent / "temp_enhanced_csd"
    if temp_enhanced_dir.exists():
        try:
            # shutil.rmtree(temp_enhanced_dir)
            print(f"[EMOJI] Cleaned up temporary enhanced CSD directory")
        except Exception as e:
            print(
                f"WARNING  Warning: Could not clean up temporary directory {temp_enhanced_dir}: {str(e)}"
            )

    return batch_stats


class MaterialManager:
    """
    Manages material resources for BlendFunc support.
    Loads material UUIDs from pre-generated config.json for fast lookup.
    """

    def __init__(self):
        self.material_map = {}  # Nested map: {"src": {"dst": "uuid"}}

    def load_material_config(self, config_path="material_config.json"):
        """Load material configuration from pre-generated config.json."""
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                self.material_map = json.load(f)

            # Count total materials
            total_materials = sum(
                len(dst_map) for dst_map in self.material_map.values()
            )
            print(
                f"Color Loaded {total_materials} material configurations from {config_path}"
            )

            # Show some sample mappings
            sample_count = 0
            for src, dst_map in self.material_map.items():
                for dst, uuid in dst_map.items():
                    if sample_count < 3:
                        print(f"  BlendFunc({src}, {dst}) -> {uuid}")
                        sample_count += 1
                    else:
                        break
                if sample_count >= 3:
                    break

            return True

        except FileNotFoundError:
            print(f"WARNING Material config not found: {config_path}")
            print("   Run 'python generate_material_config.py' to create it")
            return False
        except Exception as e:
            print(f"ERROR Error loading material config: {str(e)}")
            return False

    def get_material_uuid_for_blend_func(self, src, dst):
        """Get material UUID for BlendFunc Src and Dst values using config map."""
        # Convert to string for JSON key lookup
        src_str = str(src)
        dst_str = str(dst)

        # Look up in material map
        if src_str in self.material_map and dst_str in self.material_map[src_str]:
            material_uuid = self.material_map[src_str][dst_str]
            print(f"Color Found material for BlendFunc({src}, {dst}): {material_uuid}")
            return material_uuid

        print(f"WARNING Material not found for BlendFunc({src}, {dst}) in config")
        return None

    def create_material_reference(self, src, dst):
        """Create a material reference from BlendFunc Src and Dst values."""
        material_uuid = self.get_material_uuid_for_blend_func(src, dst)
        if not material_uuid:
            return None

        return {"__uuid__": material_uuid, "__expectedType__": "cc.Material"}


def scan_scale9_info_from_csd_files(csd_files, shared_image_manager):
    """
    Pre-scan all CSD files to collect Scale9 information and apply it to images.
    This must be done before conversion to ensure proper meta file generation.
    """

    def scan_node_for_scale9(node_dict, image_manager):
        """Recursively scan a node for Scale9 settings."""
        if not isinstance(node_dict, dict):
            return

        # Check if this node has Scale9 enabled
        scale9_enable = node_dict.get("@Scale9Enable", "False")
        if scale9_enable.lower() == "true":
            scale9_data = {
                "LeftEage": node_dict.get("@LeftEage", "0"),
                "RightEage": node_dict.get("@RightEage", "0"),
                "TopEage": node_dict.get("@TopEage", "0"),
                "BottomEage": node_dict.get("@BottomEage", "0"),
            }

            # Collect all image paths from this node
            images_to_process = []
            if "NormalFileData" in node_dict:
                images_to_process.append(node_dict["NormalFileData"].get("@Path", ""))
            if "PressedFileData" in node_dict:
                images_to_process.append(node_dict["PressedFileData"].get("@Path", ""))
            if "DisabledFileData" in node_dict:
                images_to_process.append(node_dict["DisabledFileData"].get("@Path", ""))
            if "FileData" in node_dict:
                images_to_process.append(node_dict["FileData"].get("@Path", ""))

            # Apply scale9 info to all found images
            for img_path in images_to_process:
                if img_path:
                    # Check if path starts with "Default/" - these represent non-existent resources
                    if img_path.startswith("Default/"):
                        print(
                            f"Skip Skipping Default resource for Scale9 scan: {img_path}"
                        )
                        continue

                    actual_image = image_manager.find_image_file(img_path)
                    if actual_image:
                        image_manager.add_scale9_info(actual_image, scale9_data)

        # Recursively process children
        if "Children" in node_dict and node_dict["Children"]:
            children = node_dict["Children"].get("AbstractNodeData", [])
            if not isinstance(children, list):
                children = [children]

            for child in children:
                scan_node_for_scale9(child, image_manager)

    # Scan each CSD file
    for csd_file in csd_files:
        try:
            # Parse CSD file
            with open(csd_file, "r", encoding="utf-8") as f:
                xml_content = f.read()
            csd_dict = xmltodict.parse(xml_content)

            # Check if this is a Scene3D file that should be skipped
            try:
                property_group = csd_dict["GameFile"]["PropertyGroup"]
                file_type = property_group.get("@Type", "")
                if file_type == "Scene3D":
                    print(
                        f"SKIP  Skipping Scene3D file in Scale9 scan: {csd_file.name}"
                    )
                    continue
            except KeyError:
                pass  # Continue if PropertyGroup is missing

            # Get root node and scan for Scale9
            try:
                content = csd_dict["GameFile"]["Content"]["Content"]
                root_node = content["ObjectData"]
                scan_node_for_scale9(root_node, shared_image_manager)
            except KeyError:
                continue  # Skip invalid CSD files

        except Exception as e:
            print(f"WARNING  Error scanning {csd_file.name} for Scale9: {str(e)}")
            continue


def print_version():
    """列印版本資訊"""
    print("doit.py - CSD to Prefab Converter")
    print("Version: 1.0")
    print("Build: Standalone Executable")

def print_help():
    """列印詳細的幫助資訊"""
    print("doit.py - Convert Cocos Studio CSD files to Cocos Creator Prefab files")
    print("")
    print("Usage:")
    print("  doit.exe                                      # Batch convert input/ -> output/")
    print("  doit.exe --batch                              # Batch convert input/ -> output/")
    print("  doit.exe --batch <input_dir> <output_dir>     # Batch convert custom directories")
    print("  doit.exe <input_csd_file>                     # Single file (auto output)")
    print("  doit.exe <input_csd_file> <output_file>       # Single file (custom output)")
    print("")
    print("Options:")
    print("  --help, -h     Show this help message")
    print("  --version, -v  Show version information")
    print("  --batch        Batch convert mode")
    print("")
    print("Examples:")
    print("  doit.exe                                      # Convert all CSD files in input/ to output/")
    print("  doit.exe MainScene.csd                        # Convert MainScene.csd to MainScene.prefab")
    print("  doit.exe UI/Dialog.csd output/Dialog.prefab   # Convert with custom output path")
    print("  doit.exe --batch ./input ./output             # Convert custom directories")


def print_version():
    """列印版本資訊"""
    print("doit.py - CSD to Prefab Converter")
    print("Version: 1.0")
    print("Build: Standalone Executable")

def print_help():
    """列印詳細的幫助資訊"""
    print("doit.py - Convert Cocos Studio CSD files to Cocos Creator Prefab files")
    print("")
    print("Usage:")
    print("  doit.exe                                      # Batch convert input/ -> output/")
    print("  doit.exe --batch                              # Batch convert input/ -> output/")
    print("  doit.exe --batch <input_dir> <output_dir>     # Batch convert custom directories")
    print("  doit.exe <input_csd_file>                     # Single file (auto output)")
    print("  doit.exe <input_csd_file> <output_file>       # Single file (custom output)")
    print("")
    print("Options:")
    print("  --help, -h     Show this help message")
    print("  --version, -v  Show version information")
    print("  --batch        Batch convert mode")
    print("")
    print("Examples:")
    print("  doit.exe                                      # Convert all CSD files in input/ to output/")
    print("  doit.exe MainScene.csd                        # Convert MainScene.csd to MainScene.prefab")
    print("  doit.exe UI/Dialog.csd output/Dialog.prefab   # Convert with custom output path")
    print("  doit.exe --batch ./input ./output             # Convert custom directories")

if __name__ == "__main__":
    try:
        if len(sys.argv) == 1:
            # No arguments - batch convert from input to output folder
            print("Starting batch conversion (input/ -> output/)")
            batch_convert_csd_to_prefab()
        elif len(sys.argv) == 2:
            arg = sys.argv[1]
            if arg in ["--help", "-h"]:
                print_help()
            elif arg in ["--version", "-v"]:
                print_version()
            elif arg == "--batch":
                # Batch convert with explicit --batch flag
                print("Starting batch conversion (input/ -> output/)")
                batch_convert_csd_to_prefab()
            else:
                # Single file conversion with auto-generated output name
                csd_path = sys.argv[1]
                if not os.path.exists(csd_path):
                    print(f"ERROR: Input file '{csd_path}' not found")
                    sys.exit(1)
                base_name = os.path.splitext(csd_path)[0]
                output_path = base_name + ".prefab"
                print(f"Converting single file: {csd_path} -> {output_path}")
                generator = parse_csd_to_prefab(csd_path, output_path, input_folder=INPUT_FOLDER)
                # Export animation clips if any
                if generator and generator.animation_clips:
                    anim_dir = Path(OUTPUT_FOLDER) / "Common" / "Animation"
                    anim_dir.mkdir(parents=True, exist_ok=True)
                    for anim_info in generator.animation_clips:
                        anim_name = anim_info["name"]
                        anim_data = anim_info["data"]
                        anim_uuid = anim_info["uuid"]
                        anim_file = anim_dir / f"{anim_name}.anim"
                        with open(anim_file, "w", encoding="utf-8") as f:
                            json.dump(anim_data, f, indent=2, ensure_ascii=False)
                        meta_data = {
                            "ver": "2.0.3",
                            "importer": "animation-clip",
                            "imported": True,
                            "uuid": anim_uuid,
                            "files": [".cconb"],
                            "subMetas": {},
                            "userData": {"name": anim_name},
                        }
                        meta_file = anim_dir / f"{anim_name}.anim.meta"
                        with open(meta_file, "w", encoding="utf-8") as f:
                            json.dump(meta_data, f, indent=2, ensure_ascii=False)
                        print(f"Success Exported animation: {anim_name}.anim")
        elif len(sys.argv) == 3:
            # Single file conversion with specified output path
            csd_path, output_path = sys.argv[1], sys.argv[2]
            if not os.path.exists(csd_path):
                print(f"ERROR: Input file '{csd_path}' not found")
                sys.exit(1)
            print(f"Converting single file: {csd_path} -> {output_path}")
            generator = parse_csd_to_prefab(csd_path, output_path, input_folder=INPUT_FOLDER)
            # Export animation clips if any
            if generator and generator.animation_clips:
                anim_dir = Path(OUTPUT_FOLDER) / "Common" / "Animation"
                anim_dir.mkdir(parents=True, exist_ok=True)
                for anim_info in generator.animation_clips:
                    anim_name = anim_info["name"]
                    anim_data = anim_info["data"]
                    anim_uuid = anim_info["uuid"]
                    anim_file = anim_dir / f"{anim_name}.anim"
                    with open(anim_file, "w", encoding="utf-8") as f:
                        json.dump(anim_data, f, indent=2, ensure_ascii=False)
                    meta_data = {
                        "ver": "2.0.3",
                        "importer": "animation-clip",
                        "imported": True,
                        "uuid": anim_uuid,
                        "files": [".cconb"],
                        "subMetas": {},
                        "userData": {"name": anim_name},
                    }
                    meta_file = anim_dir / f"{anim_name}.anim.meta"
                    with open(meta_file, "w", encoding="utf-8") as f:
                        json.dump(meta_data, f, indent=2, ensure_ascii=False)
                    print(f"Success Exported animation: {anim_name}.anim")
        elif len(sys.argv) == 4 and sys.argv[1] == "--batch":
            # Batch convert with custom input/output folders
            input_dir, output_dir = sys.argv[2], sys.argv[3]
            if not os.path.exists(input_dir):
                print(f"ERROR: Input directory '{input_dir}' not found")
                sys.exit(1)
            print(f"Starting batch conversion: {input_dir} -> {output_dir}")
            batch_convert_csd_to_prefab(input_dir, output_dir)
        else:
            print("ERROR: Invalid arguments")
            print("")
            print_help()
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\nOperation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: {str(e)}")
        print("Use --help for usage information")
        sys.exit(1)
    
    print("Operation completed successfully!")
