import { Color, color } from "cc"

//================================================================
/**
 * 通用按鈕宏定義
 */
//================================================================

export namespace CommonButtonMacro {

    /** 音效類型 */
    export enum SOUND_TYPE {
        /** 無 */
        NONE,
        /** DEFAULT */
        DEFAULT,
        /** 負向(取消、返回) */
        NEGATIVE,
        /** 旋轉 */
        SPIN,
    }

    /** 色彩變化類型 */
    export enum COLOR_TYPE {
        /** 無 */
        NONE,
        /** 預設 */
        DEFAULT,
        /** 自訂 */
        CUSTOM,
    }

    /** 尺寸變化類型 */
    export enum SIZE_TYPE {
        /** 無 */
        NONE,
        /** 預設 */
        DEFAULT,
        /** 自訂 */
        CUSTOM,
        /** 縮小 */
        SHRINK,
        /** 放大 */
        EXPAND,
    }

    /** 按鈕狀態 */
    export enum STATUS {
        /** 正常 */
        NORMAL,
        /** 按下 */
        PRESSED,
        /** 禁用 */
        DISABLED,
    }

    /** 預設動畫時長 */
    export const DEFAULT_DURATION = 0.125

    //================================================================
    // 狀態屬性接口
    //================================================================

    interface StatusProps<T> {
        readonly NORMAL: T
        readonly PRESSED: T
        readonly DISABLED: T
    }

    /** 根據狀態獲取屬性 */
    export function GetPropByStatus<T>(props: StatusProps<T>, status: CommonButtonMacro.STATUS): T {
        switch (status) {
            case CommonButtonMacro.STATUS.NORMAL: return props.NORMAL
            case CommonButtonMacro.STATUS.PRESSED: return props.PRESSED
            case CommonButtonMacro.STATUS.DISABLED: return props.DISABLED
        }
    }

    //================================================================
    // 色彩配置
    //================================================================

    /** 色彩配置集合 */
    export const COLOR_SETS: { [type in CommonButtonMacro.COLOR_TYPE]?: StatusProps<Color> } = {
        [CommonButtonMacro.COLOR_TYPE.DEFAULT]: {
            get NORMAL() { return color(255, 255, 255, 255) },
            get PRESSED() { return color(200, 200, 200, 255) },
            get DISABLED() { return color(150, 150, 150, 255) },
        },
    }

    /** 預設色彩配置 */
    export const DEFAULT_COLOR_SET = CommonButtonMacro.COLOR_SETS[CommonButtonMacro.COLOR_TYPE.DEFAULT]

    //================================================================
    // 尺寸配置
    //================================================================

    /** 尺寸配置集合 */
    export const SIZE_SETS: { [type in CommonButtonMacro.SIZE_TYPE]?: StatusProps<number> } = {
        [CommonButtonMacro.SIZE_TYPE.DEFAULT]: {
            NORMAL: 1,
            PRESSED: 1.05,
            DISABLED: 1,
        },

        [CommonButtonMacro.SIZE_TYPE.SHRINK]: {
            NORMAL: 1,
            PRESSED: 0.9,
            DISABLED: 1,
        },

        [CommonButtonMacro.SIZE_TYPE.EXPAND]: {
            NORMAL: 1,
            PRESSED: 1.1,
            DISABLED: 1,
        },
    }

    /** 預設尺寸配置 */
    export const DEFAULT_SIZE_SET = CommonButtonMacro.SIZE_SETS[CommonButtonMacro.SIZE_TYPE.DEFAULT]

    //================================================================
    // 聲音觸發事件
    //================================================================
    export const BUTTON_SOUND_EVENT: string = 'CommonButtonMacro.BUTTON_SOUND_EVENT';
}