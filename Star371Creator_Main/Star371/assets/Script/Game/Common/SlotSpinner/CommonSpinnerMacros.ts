
/**
 * CommonSpinner 共用參數
 */
export namespace CommonSpinner { }

//================================================================================================
// Constants
//================================================================================================

export namespace CommonSpinner
{
   /**
    * Runtime 允許的浮點數運算誤差量
    */
   export const EPSILON = 0.001;

   /**
    * 最低輪帶速度 (px/秒)
    */
   export const MINIMUM_SPEED = 60;
}

//================================================================================================
// Enums
//================================================================================================

export namespace CommonSpinner
{
   /**
    * 原點位置
    */
   export enum ORIGIN
   {
      TOP_LEFT = 0,		// 左上
      BOTTOM_LEFT = 1,	// 左下
   }

   /**
    * 停止模式
    */
   export enum STOP_MODE
   {
      FIXED_TIME = 0,	// 固定時間
      FIXED_SPEED = 1,	// 固定速度
   }

   /**
    * 速度模式
    */
   export enum SPEED_MODE
   {
      NORMAL = 0,      // 一般
      FAST = 1,        // 快速
      TURBO = 2,       // 超快
   }
}

//================================================================================================
// States
//================================================================================================

export namespace CommonSpinner
{
   // #tag::PLATE_STATE
   /**
    * 盤面狀態
    */
   export enum PLATE_STATE
   {
      /** 閒置中 */
      IDLE = 0,
      /** 轉動中 */
      SPINNING = 10,
      /** 依序停輪中 (可再快停) */
      GENTLY_STOP = 20,
      /** 停輪中 */
      STOPPING = 30,

      /** 未初始化 */
      UNKNOWN = 255,
   }

   /**
    * 軌道狀態
    */
   export enum TRACK_STATE
   {
      /** 閒置中 */
      IDLE = 0,
      /** 等待啟動 */
      WAIT_TO_RUN = 10,
      /** 拉回中 */
      CHARGING = 20,
      /** 轉動中 */
      SPINNING = 30,
      /** 等待停輪 */
      WAIT_TO_STOP = 40,
      /** 等待進入 Near Win */
      WAIT_TO_NEAR_WIN = 50,
      /** Near Win 中 */
      NEAR_WIN = 60,
      /** 停輪前置作業 */
      PRE_STOP = 70,
      /** 停輪中 */
      STOPPING = 80,
      /** 達到底部 */
      STOPPING_HARD = 90,
      /** 回彈中 */
      REBOUND = 100,

      /** 未初始化 */
      UNKNOWN = 255,
   }
}

//================================================================================================
// Events
//================================================================================================

export namespace CommonSpinner
{
   /** 事件 */
   export enum EVENT
   {
      //----------------------------------------------------------------
      // 盤面事件
      //----------------------------------------------------------------

      /** 盤面: 回到閒置狀態 */
      PLATE_ENTER_IDLE = "PLATE_ENTER_IDLE",
      /** 盤面: 開始轉動 */
      PLATE_START_SPINNING = "PLATE_START_SPINNING",
      /** 盤面: 開始停輪 */
      PLATE_START_STOPPING = "PLATE_START_STOPPING",
      /** 盤面: 完全停止 */
      PLATE_JUST_STOPPED = "PLATE_JUST_STOPPED",

      //----------------------------------------------------------------
      // 軌道事件
      //----------------------------------------------------------------

      /** 軌道: 回到閒置狀態 ( `index: number` *軌道索引* ) */
      TRACK_ENTER_IDLE = "TRACK_ENTER_IDLE",
      /** 軌道: 等待啟動 ( `index: number` *軌道索引*, `second: number` *狀態將持續時間(秒)* ) */
      TRACK_WAIT_TO_RUN = "TRACK_WAIT_TO_RUN",
      /** 軌道: 開始拉回 ( `index: number` *軌道索引*, `second: number` *狀態將持續時間(秒)* ) */
      TRACK_START_CHARGING = "TRACK_START_CHARGING",
      /** 軌道: 開始轉動 ( `index: number` *軌道索引* ) */
      TRACK_START_SPINNING = "TRACK_START_SPINNING",
      /** 軌道: 等待停輪 ( `index: number` *軌道索引*, `second: number` *狀態將持續時間(秒)* ) */
      TRACK_WAIT_TO_STOP = "TRACK_WAIT_TO_STOP",
      /** 軌道: 等待進入 Near Win ( `index: number` *軌道索引*, `second: number` *狀態將持續時間(秒)* ) */
      TRACK_WAIT_TO_NEAR_WIN = "TRACK_WAIT_TO_NEAR_WIN",
      /** 軌道: 開始 Near Win ( `index: number` *軌道索引*, `second: number` *狀態將持續時間(秒)* ) */
      TRACK_START_NEAR_WIN = "TRACK_START_NEAR_WIN",
      /** 軌道: 停輪前置作業 ( `index: number` *軌道索引* ) */
      TRACK_PREPARING_STOP = "TRACK_PREPARING_STOP",
      /** 軌道: 開始停輪 ( `index: number` *軌道索引*, `second: number` *狀態將持續時間(秒)* ) */
      TRACK_START_STOPPING = "TRACK_START_STOPPING",
      /** 軌道: 達到底部 ( `index: number` *軌道索引*, `second: number` *狀態將持續時間(秒)* ) */
      TRACK_REACH_BOTTOM = "TRACK_REACH_BOTTOM",
      /** 軌道: 完全停止 ( `index: number` *軌道索引* ) */
      TRACK_JUST_STOPPED = "TRACK_JUST_STOPPED",
   }
}

//================================================================================================
// Utility
//================================================================================================

export namespace CommonSpinner
{
   /**
    * 限制數值在指定範圍內
    * @param input 輸入數值
    * @param limit1 範圍限制1
    * @param limit2 範圍限制2
    */
   export function Clamp ( input: any, limit1: number = 0, limit2: number = Number.POSITIVE_INFINITY ): number
   {
      const value = Number( input ) ?? 0;
      const min = Math.min( limit1, limit2 );
      const max = Math.max( limit1, limit2 );
      return Math.min( Math.max( min, value ), max );
   }
}
