// ==================== Enums ====================

import { error, Sprite, Vec3, SpriteFrame } from "cc"
import { GameBundle } from '../Bundle/Bundle'
import { GameId } from '../Define/GameDefine'

/**
 * Loading view display types
 */
export enum ViewType {
    NEWS = 0,
    GAME = 1,
}

/**
 * Download operation types
 */
export enum DownloadType {
    NORMAL = 0,
    DOWNLOAD = 1
}

/**
 * Loading tip message types
 */
export enum TipType {
    JOIN_GAME = 0,
    CHECK_UPDATE = 1,
    PRE_DOWNLOAD_FILE = 2,
    DOWNLOAD_FILE = 3,
    VERIFY = 4
}

/**
 * Touch event types
 */
export enum TouchEventType {
    BEGAN = 0,
    MOVED = 1,
    ENDED = 2,
    CANCELED = 3
}

// ==================== Interfaces ====================

/**
 * Callback interface for fruit lifecycle events
 */
export interface FruitGameCallBack {
    OnFruitEnd(fruit: any): void
}

// ==================== Constants ====================

/**
 * Fruit game related constants
 */
export namespace FruitGameConst {
    // Fruit types
    export const MIN_FRUIT_TYPE: number = 0
    export const MAX_FRUIT_TYPE: number = 6

    // Opacity values
    export const OPACITY_ZERO: number = 0x00
    export const OPACITY_FULL: number = 0xFF

    // Spawn settings
    export const DEFAULT_SPAWN_INTERVAL: number = 1.0
    export const SPAWN_POSITION_OFFSET: number = 300
    export const SPAWN_POSITION_MARGIN: number = 100

    // Score settings
    export const POINTS_PER_FRUIT: number = 1

    // Pool settings
    export const INITIAL_POOL_SIZE: number = 0

    // Debug settings
    export const MAX_DEBUG_LINES: number = 30

    // Score label position offset
    export const SCORE_LABEL_POSITION_OFFSET: number = 40
}

/**
 * Fruit physics constants
 */
export namespace FruitPhysicsConst {
    // Gravity
    export const DEFAULT_GRAVITY: number = -800.0

    // Velocity ranges
    export const VELOCITY_X_MIN: number = -50
    export const VELOCITY_X_MAX: number = 50
    export const VELOCITY_Y_MIN: number = 600
    export const VELOCITY_Y_MAX: number = 900

    // Rotation speed range
    export const ROTATION_SPEED_MIN: number = -180
    export const ROTATION_SPEED_MAX: number = 180

    // Scale
    export const DEFAULT_SCALE: number = 0.8
    export const SLICE_SCALE_MULTIPLIER: number = 1.2

    // Collision
    export const DEFAULT_COLLISION_RADIUS: number = 50
    export const COLLISION_RADIUS_MULTIPLIER: number = 0.4

    // Animation durations
    export const SLICE_DELAY_ANIMATION_DURATION: number = 1.5
    export const SLICE_ANIMATION_DURATION: number = 0.5
}

/**
 * Loading view constants
 */
export namespace LoadingViewConst {
    // Progress update settings
    export const PERCENT_TIMER_LIMIT: number = 0.05
    export const PERCENT_INCREMENT: number = 0.01
    export const PERCENT_MAX: number = 1

    // Progress bar light settings
    export const LIGHT_MASK_MAX_WIDTH: number = 200
    export const LIGHT_DOT_MAX_OFFSET: number = 590
    export const LIGHT_DOT_START_OFFSET: number = -295

    // Score display settings
    export const SCORE_DISPLAY_DELAY: number = 1.5
    export const SCORE_FADE_DURATION: number = 0.5
    export const SCORE_POSITION_Y_OFFSET: number = 50

    // Loading view position settings
    export const LOADING_VIEW_LANSCAPE_POSITION: Vec3 = new Vec3(-168, -257, 0)
    export const LOADING_VIEW_PORTRAIT_POSITION: Vec3 = new Vec3(0, -350, 0)
}

/**
 * Loading messages and strings
 */
export namespace LoadingStrings {
    // Default Chinese messages
    export const DEFAULT_MESSAGES = {
        JOIN_GAME: "進入遊戲",
        CHECK_UPDATE: "驗證資料，不消耗網路流量..",
        VERIFY: "驗證資料，不消耗網路流量...",
        PRE_DOWNLOAD: "PreDownload",
        DOWNLOAD_COMPLETED: "Download Completed"
    }

    // Default loading tips (Chinese)
    export const DEFAULT_LOADING_TIPS = [
        "大廳點擊頭像可以看到自己名片資訊",
        "每個帳號可更換一次遊戲暱稱",
        "遊戲大廳上方「聊天」可加入天團",
        "遊戲大廳點擊頭像可以更換照片",
        "遊玩鑽石遊戲就可以提升天團經驗值",
        "據說帶著某些稱號打牌氣場比較強"
    ]

    // Debug messages
    export const DEBUG_MESSAGES = {
        GAME_STARTED: "=== Fruit Slice Game Started ===",
        GAME_STARTING: "=== Starting Fruit Slice Game ===",
        GAME_SUCCESS: "Fruit Slice Game started successfully!",
        TOUCH_BEGAN: "Touch began at",
        TOUCH_ENDED: "Touch ended",
        TOUCH_CANCELED: "Touch cancelled",
        SPAWN_FRUIT: "Spawn fruit type",
        SLICED_FRUIT: "Sliced fruit type",
        OUT_OF_BOUNDS: "out of bounds",
        SCORE_PREFIX: "Score",
        CURRENT_SCORE: "Current score",
        UPDATING_LAYOUT: "Updating layout positions for view type"
    }
}

export function LoadLogoImg(gameId: GameId, extraIndex: number, logoImage: Sprite): void {
    GameBundle.Current && GameBundle.Current.Load("Locale/tw/Logo", SpriteFrame, (err: any, spriteFrame: SpriteFrame) => {
        if (err) {
            error('Logo 資源失敗:', err);
            return;
        }
        if (spriteFrame) {
            logoImage.spriteFrame = spriteFrame
            logoImage.node.active = true
        }
    })
}