import { CommonWheel } from "./CommonWheelMacros";

export namespace CommonWheelDefine
{
   /**
    * 轉盤動作配置
    */
   export interface ActionConfig
   {
      /**
       * 至少轉幾圈
       */
      SpinRounds: CommonWheel.VarNum;

      /**
       * 轉動持續時間 (秒)
       */
      SpinDuration: CommonWheel.VarNum;

      /**
       * 一開始要快一點還是慢一點 (0.0 ~ 1.0)
       */
      SpeedRate: CommonWheel.VarNum;

      /**
       * 固定速度的時間段(%)
       */
      FakeSpinTimeInterval?: number;
   }
}

export namespace CommonWheelDefine
{
   /**
    * 預設轉盤動作配置
    */
   export namespace PRESET
   {
      /**
       * 很快 (6~8 秒轉 2+ 圈)
       */
      export const RAPID: ActionConfig = {
         SpinRounds: 2,
         SpinDuration: [ 6, 8 ],
         SpeedRate: [ 0.8, 1.0 ],
         FakeSpinTimeInterval: 0.19,
      };

      /**
       * 較快 (12~15 秒轉 4+ 圈)
       */
      export const SWIFT: ActionConfig = {
         SpinRounds: 4,
         SpinDuration: [ 12, 15 ],
         SpeedRate: [ 0.7, 0.9 ],
         FakeSpinTimeInterval: 0.19,
      };

      /**
       * 一般 (18~22 秒轉 6+ 圈)
       */
      export const STEADY: ActionConfig = {
         SpinRounds: 6,
         SpinDuration: [ 18, 22 ],
         SpeedRate: [ 0.6, 0.8 ],
         FakeSpinTimeInterval: 0.19,
      };

      /**
       * 預設配置
       */
      export const DEFAULT = STEADY;
   }
}
