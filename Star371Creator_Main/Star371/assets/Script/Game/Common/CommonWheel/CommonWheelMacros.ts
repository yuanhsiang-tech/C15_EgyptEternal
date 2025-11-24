
/**
 * CommonWheel 共用參數
 */
export namespace CommonWheel { }

//================================================================================================
// Constants
//================================================================================================

export namespace CommonWheel
{
   /**
    * 一圈幾度 (角度)
    */
   export const DEGREE_IN_CIRCLE = 360;
}

export namespace CommonWheel
{
   /**
    * 預設參數
    */
   export namespace DEFAULTS
   {
      /**
       * 預設 Cell 節點池最大儲存數量
       */
      export const CELL_POOL_SIZE_MAX = 20;

      /**
       * 是否順時針轉動
       */
      export const CLOCKWISE = true;

      /**
       * 角度每秒取樣次數
       * @range [1, 60]
       */
      export const SAMPLE_RATE = 5;

      /**
       * 至少完整轉動幾圈
       * @range [0, +∞)
       */
      export const SPIN_ROUNDS = 6;

      /**
       * 角度偏移量，0 為無偏移，+-1 為扇形區域前後邊界
       * @range [-1, 1]
       */
      export const SPIN_BIAS_RATE = 0;

      /**
       * 轉動總時間 (秒)
       * @description `[MinSec, MaxSec]`
       */
      export const SPIN_DURATION: VarNum = [ 18, 22 ];

      /**
       * 起始轉速比例，超過 1 可能會發生倒轉
       * @range [0, +∞]
       */
      export const SPEED_RATE: VarNum = [ 0.6, 0.8 ];

      /**
       * Skip 要跳到的時間軸比例
       * @range [0, 1]
       */
      export const SKIP_TIMELINE = 0.9;

      /**
       * Skip 時間軸速率，越小越快
       * @range [0, +∞]
       */
      export const SKIP_TIME_SCALE = 0;

      /**
       * 轉盤晃動角度
       * @range [0, +∞]
       */
      export const WHEEL_VIBRATE_ANGLE = 5;

      /**
       * 轉盤晃動總時間 (秒)
       * @range [0, +∞]
       */
      export const WHEEL_VIBRATE_DURATION = 3;

      /**
       * 轉盤晃動幅度
       */
      export const WHEEL_VIBRATE_SCALES = [
         0.3,
         0.35,
         0.4,
         0.45,
         0.5,
         0.6,
         0.8,
         0.9,
         1.0,
         1.0,
         0.9,
         0.7,
         0.5,
         0.3,
         0.2
      ];

      /**
       * 轉盤移動到最終位置時間 (秒)
       * @range [0, +∞]
       */
      export const WHEEL_FINALIZE_TIME = 1.2;
   }
}

//================================================================================================
// Enums
//================================================================================================

export namespace CommonWheel
{
   /**
    * Cell 資源類型
    */
   export enum CellResourceType
   {
      /** 自訂 */
      CUSTOM = 0,
      /** 節點 */
      NODE = 1,
      /** 預製 */
      PREFAB = 2,
   }

   /**
    * 狀態
    */
   export enum STATE
   {
      /** 無 */
      NONE,
      /** 閒置 */
      IDLE,
      /** 轉動 */
      SPIN,
      /** 停止 */
      STOP,
      /** 加速 */
      FAKESPIN_START,
      /** 等待停止 */
      FAKESPIN_WAIT_STOP,
      /** 停止 */
      FAKESPIN_PLAY_STOP,
   }

   /**
    * Tween Key
    */
   export enum TWEEN
   {
      /** CommonWheel: 軸心轉動 */
      CWC_AXIS_SPIN = "COMMON_WHEEL_CONTROL_AXIS_SPIN",
      /** CommonWheel: View 本身 */
      CWC_SELF_VIEW = "COMMON_WHEEL_CONTROL_SELF_VIEW",
      /** CommonWheel: 點擊保護 */
      CWC_TOUCH_GUARD = "COMMON_WHEEL_CONTROL_TOUCH_GUARD",
      /** VibrateWheel: 轉盤前後晃動 */
      VWC_VIBRATE = "VIBRATE_WHEEL_CONTROL_VIBRATE",
      /** VibrateWheel: 轉到最後角度 */
      VWC_FINALIZE = "VIBRATE_WHEEL_CONTROL_FINALIZE",
   }
}

//================================================================================================
// Utility
//================================================================================================

export namespace CommonWheel
{
   /**
    * 可變數值類型
    */
   export type VarNum = number | [ number, number ];

   /**
    * 是否為數值
    * @param input 輸入值
    */
   export function IsNumber ( input: any ): input is number
   {
      return typeof input == "number" && !isNaN( input );
   }

   /**
    * 限制數值在指定範圍內
    * @param input 輸入數值
    * @param limit1 範圍限制1
    * @param limit2 範圍限制2
    */
   export function ClampNum ( input: any, limit1: number, limit2: number ): number
   {
      const value = Number( input ) ?? 0;
      const min = Math.min( limit1, limit2 );
      const max = Math.max( limit1, limit2 );
      return Math.min( Math.max( min, value ), max );
   }

   /**
    * 線性插值
    * @param a 起始值
    * @param b 結束值
    * @param r 比例值
    */
   export function LerpNum ( a: number, b: number, r: number ): number
   {
      return a + ( b - a ) * r;
   }

   /**
    * 可變數值收斂為固定數值
    * @param input 輸入數值
    * @param limitMin 最小限制
    * @param limitMax 最大限制
    * @returns 
    */
   export function CollapseVarNum ( input: VarNum, limitMin?: number, limitMax?: number ): number
   {
      const LIMIT_MIN = IsNumber( limitMin ) ? limitMin : Number.NEGATIVE_INFINITY;
      const LIMIT_MAX = IsNumber( limitMax ) ? limitMax : Number.POSITIVE_INFINITY;

      let output: number = 0;

      // 固定數值，檢查範圍限制
      if ( IsNumber( input ) && input != 0 )
      {
         output = ClampNum( input, LIMIT_MIN, LIMIT_MAX );
      }
      // 可變區間收斂並檢查範圍限制
      else if ( Array.isArray( input ) )
      {
         const a = ClampNum( input[ 0 ] ?? 0, LIMIT_MIN, LIMIT_MAX );
         const b = ClampNum( input[ 1 ] ?? 0, LIMIT_MIN, LIMIT_MAX );
         output = LerpNum( a, b, Math.random() );
      }

      return IsNumber( output ) ? output : 0;
   }

}
