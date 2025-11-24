# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Cocos Creator 3.x editor extension called "Skeleton Viewer" (骨骼查看器) that provides preview functionality for Spine skeleton animations (versions 3.5-4.0). The extension can run as both a standalone window and as a dockable panel within the Cocos Creator editor.

## Development Environment

- **Engine**: Cocos Creator 3.x  
- **Platform**: Windows, macOS
- **Language**: JavaScript (ES5/CommonJS)
- **Dependencies**: Electron, Vue.js, Spine Runtimes, node-fetch

## Project Structure

The extension follows Cocos Creator's standard extension structure:

- `src/main/` - Main process (Electron) logic
  - `index.js` - Extension lifecycle and message handling
  - `opener.js` - File opening and asset detection logic
  - `panel-manager.js` - Panel window management
- `src/renderer/` - Renderer process (UI) logic
  - `view/` - Main preview panel with WebGL Spine rendering
  - `settings/` - Settings panel for configuration
- `src/common/` - Shared utilities
  - `config-manager.js` - Configuration persistence
  - `spine-runtime.js` - Spine runtime version management
  - `editor-adapter.js` - Cocos Creator API abstraction
- `src/eazax/` - Utility framework by the author
- `src/editor/` - Editor integration (asset menu context)
- `lib/` - External libraries (Vue.js, Spine runtimes 3.5-4.0)

## Key Architecture Components

### Extension System
The extension uses Cocos Creator's package.json contribution system with:
- Menu contributions for panel access
- Message handlers for inter-process communication
- Asset menu integration for right-click preview
- Shortcut key support

### Spine Runtime Management
- Multiple Spine runtime versions (3.5, 3.6, 3.7, 3.8, 4.0) in `lib/spine-runtimes/`
- Dynamic runtime loading based on skeleton version detection
- WebGL rendering with debugging options (bones, bounding boxes, etc.)

### Panel Architecture
- Main preview panel with Vue.js frontend and WebGL canvas
- Settings panel for configuration (shortcuts, auto-update)
- Dockable panels that can attach to editor windows
- IPC communication between main and renderer processes

### Asset Detection
The extension automatically detects skeleton assets when:
- User selects assets in Asset Manager (.json, .skel files)
- User selects nodes with sp.Skeleton components in Hierarchy
- User right-clicks on skeleton-related assets

## Configuration

Configuration is managed through:
- `config.json` - User preferences (auto-update settings)
- `package.json` - Extension metadata and shortcuts
- Settings panel - UI for user configuration

The ConfigManager handles persistence and provides defaults for missing configuration.

## Development Workflow

This extension does not use standard npm/yarn build processes. Development workflow:

1. Make code changes directly to source files
2. Use Cocos Creator's extension reload functionality
3. Test in editor through Extension menu or asset context menus

## File Naming Conventions

- Chinese comments and documentation in source code
- Camelcase for JavaScript variables and functions
- Kebab-case for file names and CSS classes
- Extension follows Cocos Creator naming patterns

## Key Integration Points

- **Asset Selection**: Listens to editor selection events via `onSelectionSelect`
- **Menu Integration**: Asset context menu through `assets-menu.js`
- **Panel Management**: Window lifecycle through Electron IPC
- **Configuration**: Persistent settings through ConfigManager

## Spine Animation Features

- Preview of skeleton animations with playback controls
- Multiple skin support
- Animation loop/time scale controls
- Debug rendering options (bones, bounds, triangles, paths)
- External file loading support
- Asset information display