#!/usr/bin/env python3
"""
Sort input_resources.json cache sections (image_cache, font_cache, particle_cache, csd_cache).

This script reads an input_resources.json file and sorts all cache sections alphabetically
while preserving other sections like version, timestamp, and path mappings.

Usage:
    python sort_input_resources.py <input_file> [output_file]

Example:
    python sort_input_resources.py input_resources.json sorted_input_resources.json
    python sort_input_resources.py generated_input_resources.json
"""

import os
import json
import sys
from collections import OrderedDict


def sort_cache_sections(data):
    """
    Sort cache sections in the input_resources data.
    
    Args:
        data: Dictionary containing input_resources data
        
    Returns:
        dict: Data with sorted cache sections
    """
    # Cache section names that should be sorted
    cache_sections = ['image_cache', 'font_cache', 'particle_cache', 'csd_cache']
    
    # Create a new ordered dictionary to maintain structure
    sorted_data = OrderedDict()
    
    # First, add version and timestamp if they exist
    if 'version' in data:
        sorted_data['version'] = data['version']
    if 'timestamp' in data:
        sorted_data['timestamp'] = data['timestamp']
    
    # Sort and add cache sections
    for section_name in cache_sections:
        if section_name in data and isinstance(data[section_name], dict):
            print(f"Sorting {section_name}: {len(data[section_name])} items")
            # Sort by key (resource path) alphabetically
            sorted_cache = OrderedDict(sorted(data[section_name].items()))
            sorted_data[section_name] = sorted_cache
    
    # Add all remaining sections (path mappings, etc.) in sorted order
    remaining_keys = [k for k in data.keys() 
                     if k not in ['version', 'timestamp'] + cache_sections]
    
    if remaining_keys:
        print(f"Adding {len(remaining_keys)} path mapping entries")
        # Sort path mapping keys as well
        for key in sorted(remaining_keys):
            sorted_data[key] = data[key]
    
    return dict(sorted_data)


def sort_input_resources_file(input_file, output_file=None):
    """
    Sort an input_resources.json file.
    
    Args:
        input_file: Path to input JSON file
        output_file: Path to output JSON file (optional)
    """
    if output_file is None:
        # If no output file specified, add 'sorted_' prefix to input filename
        base_dir = os.path.dirname(input_file)
        base_name = os.path.basename(input_file)
        name_without_ext = os.path.splitext(base_name)[0]
        output_file = os.path.join(base_dir, f"sorted_{base_name}")
    
    # Read the input file
    print(f"Reading: {input_file}")
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: File '{input_file}' not found!")
        return False
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in '{input_file}': {e}")
        return False
    
    # Sort the data
    print("Sorting cache sections...")
    sorted_data = sort_cache_sections(data)
    
    # Write the sorted data
    print(f"Writing: {output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(sorted_data, f, ensure_ascii=False, indent=2)
    
    print(f"Successfully sorted {input_file} → {output_file}")
    
    # Show statistics
    cache_sections = ['image_cache', 'font_cache', 'particle_cache', 'csd_cache']
    for section in cache_sections:
        if section in sorted_data:
            print(f"  - {section}: {len(sorted_data[section])} items")
    
    return True


def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("Usage: python sort_input_resources.py <input_file> [output_file]")
        print("\nExample:")
        print("    python sort_input_resources.py input_resources.json sorted_input_resources.json")
        print("    python sort_input_resources.py generated_input_resources.json")
        print("\nThis will sort image_cache, font_cache, particle_cache, and csd_cache sections alphabetically.")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    if not os.path.exists(input_file):
        print(f"Error: Input file '{input_file}' does not exist!")
        sys.exit(1)
    
    success = sort_input_resources_file(input_file, output_file)
    if not success:
        sys.exit(1)


if __name__ == '__main__':
    main()
