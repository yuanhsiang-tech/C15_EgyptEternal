#!/usr/bin/env python3
"""
Reverse generate input_resources.json from Unity asset folder structure.

This script scans a Unity asset folder (like AIO_OLD_RES) and generates
an input_resources.json file that maps resources to Unity asset IDs.

Usage:
    python reverse_generate_input_resources.py <input_folder> [output_file]

Example:
    python reverse_generate_input_resources.py ../Ref/AIO_OLD_RES generated_input_resources.json
"""

import os
import json
import sys
import time
import hashlib
from pathlib import Path


def normalize_path(path_str):
    """Normalize path separators to forward slashes"""
    return path_str.replace('\\', '/')


def extract_uuid_from_meta_file(meta_file_path):
    """
    Extract UUID from Unity .meta file.
    
    Args:
        meta_file_path: Path to the .meta file
        
    Returns:
        str: UUID string, or None if not found
    """
    try:
        with open(meta_file_path, 'r', encoding='utf-8') as f:
            meta_data = json.load(f)
            return meta_data.get('uuid')
    except (FileNotFoundError, json.JSONDecodeError, UnicodeDecodeError):
        return None


def generate_unity_asset_id(uuid_str):
    """
    Generate Unity-style asset ID from UUID.
    
    Args:
        uuid_str: UUID string from .meta file
        
    Returns:
        str: Unity asset ID in format "uuid@fileID"
    """
    if not uuid_str:
        return None
    
    # Generate a file ID (usually a hash-based number)
    file_id = f"f{abs(hash(uuid_str)) % 99999}"
    return f"{uuid_str}@{file_id}"


def extract_resource_path_from_unity_structure(file_path, base_folder):
    """
    Extract the resource path from Unity asset folder structure.
    
    For example:
    - AIO_OLD_RES/Img/CommonResource/Button/btn.png → CommonResource/Button/btn.png
    - AIO_OLD_RES/Font/Arial.fnt → Arial.fnt  
    - AIO_OLD_RES/Particle/effect.plist → effect.plist
    - AIO_OLD_RES/Prefab/Lua/Scene.prefab → Lua/Scene.csd
    """
    rel_path = os.path.relpath(file_path, base_folder)
    rel_path = normalize_path(rel_path)
    
    # Remove the Unity asset category folder and .meta files
    path_parts = rel_path.split('/')
    if len(path_parts) < 2:
        return None
        
    category = path_parts[0]  # Img, Font, Particle, Prefab
    resource_path = '/'.join(path_parts[1:])
    
    # Skip .meta files
    if resource_path.endswith('.meta'):
        return None
    
    # For prefabs, convert .prefab extension to .csd
    if category == 'Prefab' and resource_path.endswith('.prefab'):
        resource_path = resource_path[:-7] + '.csd'  # Replace .prefab with .csd
    
    return resource_path


def scan_unity_assets(base_folder):
    """
    Scan Unity asset folder and categorize resources.
    
    Returns:
        dict: Categorized resources with their paths and generated asset IDs
    """
    categories = {
        'image_cache': {},
        'font_cache': {},
        'particle_cache': {},  
        'csd_cache': {},
        'path_mapping': {}
    }
    
    base_path = Path(base_folder)
    
    # Define file extensions for each category
    image_extensions = {'.png', '.jpg', '.jpeg'}
    font_extensions = {'.fnt'}
    particle_extensions = {'.plist'}
    csd_extensions = {'.prefab'}  # Will be converted to .csd
    
    # Scan all files
    for root, dirs, files in os.walk(base_folder):
        for file in files:
            file_path = os.path.join(root, file)
            rel_path = os.path.relpath(file_path, base_folder)
            rel_path = normalize_path(rel_path)
            
            # Skip .meta files
            if file.endswith('.meta'):
                continue
                
            # Determine category based on folder structure
            path_parts = rel_path.split('/')
            if len(path_parts) < 2:
                continue
                
            category_folder = path_parts[0]
            file_ext = os.path.splitext(file)[1].lower()
            
            # Extract resource path
            resource_path = extract_resource_path_from_unity_structure(file_path, base_folder)
            if not resource_path:
                continue
            
            # Find corresponding .meta file and extract UUID
            meta_file_path = file_path + '.meta'
            uuid_str = extract_uuid_from_meta_file(meta_file_path)
            if not uuid_str:
                print(f"Warning: Could not find UUID for {file_path}")
                continue
                
            # Generate Unity asset ID
            asset_id = generate_unity_asset_id(uuid_str)
            if not asset_id:
                print(f"Warning: Could not generate asset ID for {file_path}")
                continue
            
            # Categorize based on folder and file extension
            if category_folder == 'Img' and file_ext in image_extensions:
                categories['image_cache'][resource_path] = asset_id
                
            elif category_folder == 'Font' and file_ext in font_extensions:
                categories['font_cache'][resource_path] = asset_id
                
            elif category_folder == 'Particle' and file_ext in particle_extensions:
                categories['particle_cache'][resource_path] = asset_id
                
            elif category_folder == 'Prefab' and file_ext in csd_extensions:
                categories['csd_cache'][resource_path] = asset_id
    
    return categories


def generate_input_resources_json(asset_categories, output_file=None):
    """
    Generate the input_resources.json file.
    
    Args:
        asset_categories: Categorized resources from scan_unity_assets
        output_file: Output file path, defaults to 'generated_input_resources.json'
    """
    if output_file is None:
        output_file = 'generated_input_resources.json'
    
    # Create the JSON structure
    result = {
        "version": "1.0",
        "timestamp": str(time.time()),
    }
    
    # Add cache sections (only if they have content)
    if asset_categories['image_cache']:
        result['image_cache'] = asset_categories['image_cache']
        
    if asset_categories['font_cache']:
        result['font_cache'] = asset_categories['font_cache']
        
    if asset_categories['particle_cache']:
        result['particle_cache'] = asset_categories['particle_cache']
        
    if asset_categories['csd_cache']:
        result['csd_cache'] = asset_categories['csd_cache']
    
    # Write to file
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print(f"Generated {output_file} successfully!")
    print(f"Statistics:")
    print(f"  - Images: {len(asset_categories['image_cache'])}")
    print(f"  - Fonts: {len(asset_categories['font_cache'])}")
    print(f"  - Particles: {len(asset_categories['particle_cache'])}")
    print(f"  - CSDs: {len(asset_categories['csd_cache'])}")
    print(f"  - Path mappings: {len(asset_categories['path_mapping'])}")


def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("Usage: python reverse_generate_input_resources.py <input_folder> [output_file]")
        print("\nExample:")
        print("    python reverse_generate_input_resources.py ../Ref/AIO_OLD_RES generated_input_resources.json")
        sys.exit(1)
    
    input_folder = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'generated_input_resources.json'
    
    if not os.path.exists(input_folder):
        print(f"Error: Input folder '{input_folder}' does not exist!")
        sys.exit(1)
    
    if not os.path.isdir(input_folder):
        print(f"Error: '{input_folder}' is not a directory!")
        sys.exit(1)
    
    print(f"Scanning Unity asset folder: {input_folder}")
    print(f"Output will be saved to: {output_file}")
    print()
    
    # Scan the assets
    asset_categories = scan_unity_assets(input_folder)
    
    # Generate the JSON file
    generate_input_resources_json(asset_categories, output_file)


if __name__ == '__main__':
    main()
