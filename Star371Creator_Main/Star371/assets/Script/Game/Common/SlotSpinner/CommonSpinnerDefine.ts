import { CommonSpinner } from "./CommonSpinnerMacros";
import { CommonSpinnerSpeedConfig } from "./Utility/CommonSpinnerSpeedConfig";

export namespace CommonSpinnerDefine
{
   //================================================================
   /**
    * 預設速度設定: 一般
    */
   export const DEFAULT_NORMAL_SPIN_SETTING = Object.freeze(
      new CommonSpinnerSpeedConfig(
         0,			// 每輪間啟動間隔 (秒)
         24,		// 拉回距離 (像素)
         0.06,		// 拉回時間 (秒)
         1500,		// 移動速度 (像素/秒)
         1.5,		// 自動觸發停輪時間 (秒)
         0,			// 停輪延遲 (秒)
         0.3,		// 每輪間停輪間隔 (秒)
         3000,		// Near Win 速度 (像素/秒)
         1.5,		// Near Win 持續時間 (秒)
         1500,		// 觸發停輪後速度 (像素/秒)
         CommonSpinner.STOP_MODE.FIXED_TIME,	// 停輪模式
         24,		// 回彈距離 (像素) 
         0.24,		// 回彈時間 (秒)
         1500,		// 強停速度 (像素/秒)
         24,		// 強停回彈距離 (像素) 
         0.24,		// 強停回彈時間 (秒)
      )
   );

   //================================================================
   /**
    * 預設速度設定: 加速
    */
   export const DEFAULT_FASTER_SPIN_SETTING = Object.freeze(
      new CommonSpinnerSpeedConfig(
         0,			// 每輪間啟動間隔 (秒)
         24,		// 拉回距離 (像素)
         0.06,		// 拉回時間 (秒)
         2000,		// 移動速度 (像素/秒)
         0.75,		// 自動觸發停輪時間 (秒)
         0,			// 停輪延遲 (秒)
         0.22,		// 每輪間停輪間隔 (秒)
         3000,		// Near Win 速度 (像素/秒)
         1.0,		// Near Win 持續時間 (秒)
         2000,		// 觸發停輪後速度 (像素/秒)
         CommonSpinner.STOP_MODE.FIXED_TIME,	// 停輪模式
         24,		// 回彈距離 (像素)
         0.2,		// 回彈時間 (秒)
         2000,		// 強停速度 (像素/秒)
         24,		// 強停回彈距離 (像素) 
         0.2,		// 強停回彈時間 (秒)
      )
   );

   //================================================================
   /**
    * 預設速度設定: Turbo
    */
   export const DEFAULT_TURBO_SPIN_SETTING = Object.freeze(
      DEFAULT_FASTER_SPIN_SETTING.Clone( {
         endedInterval: 0,	// 每輪間停輪間隔 (秒)
      } )
   );

   //================================================================
   /**
    * 預設速度設定
    */
   export const DEFAULT_SETTINGS = Object.freeze(
      {
         NORMAL: DEFAULT_NORMAL_SPIN_SETTING,
         FASTER: DEFAULT_FASTER_SPIN_SETTING,
         TURBO: DEFAULT_TURBO_SPIN_SETTING,
      }
   );

   //================================================================

}
