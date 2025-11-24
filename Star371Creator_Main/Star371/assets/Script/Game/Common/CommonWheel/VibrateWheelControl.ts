import { _decorator, Tween, easing } from "cc";
import { CommonWheel } from "./CommonWheelMacros";
import CommonWheelControl, { CommonWheelControlDelegate } from "./CommonWheelControl";

const { ccclass } = _decorator;

//================================================================================================

export interface VibrateWheelControlDelegate extends CommonWheelControlDelegate
{
   /**
    * 轉盤晃動開始通知
    */
   OnVibrateWheelControlVibrateStart ( control: VibrateWheelControl ): void;

   /**
    * 轉盤晃動停止通知
    */
   OnVibrateWheelControlVibrateStop ( control: VibrateWheelControl ): void;

   /**
    * 移動到最終目標角度通知
    */
   OnVibrateWheelControlFinalized ( control: VibrateWheelControl ): void;

   /**
    * 全部動畫結束通知
    */
   OnVibrateWheelControlAllFinish ( control: VibrateWheelControl ): void;
}

//================================================================================================
//================================================================================================
/**
 * 晃動轉盤控制器
 * - 提供轉盤晃動功能
 * - 基本功能請參考 {@link CommonWheelControl}
 * 
 * @description
 * 操控流程
 * 1. {@link Spin} 時可額外帶入 `vibrateBias` 參數，決定是否需要晃動，以及停在前方或後方
 * 2. 轉動結束後，若 {@link AutoVibrateAndFinalize} 為 `true` 且需要晃動，則會自動開始晃動並移動到最終目標角度
 * 3. 手動呼叫 {@link Vibrate} 進行晃動，晃動結束後手動呼叫 {@link Finalize} 移動到最終目標角度
 * 4. 全部結束後必須呼叫 {@link Reload} 重置轉盤，才能再次使用 {@link Spin}
 */
//================================================================================================
//================================================================================================

@ccclass
export default abstract class VibrateWheelControl extends CommonWheelControl
{

   //----------------------------------------------------------------

   protected m_shouldVibrate: boolean = false;
   protected m_midwayOffset: number = 0;
   protected m_finalAngle: number = 0;

   //----------------------------------------------------------------

   //================================================================
   // Getter & Setter
   //================================================================

   //----------------------------------------------------------------

   public get Delegate (): Partial<VibrateWheelControlDelegate>
   {
      return this.m_delegate;
   }
   public set Delegate ( delegate: Partial<VibrateWheelControlDelegate> )
   {
      this.m_delegate = delegate;
   }

   //----------------------------------------------------------------

   /** 是否需要晃動 */
   public get ShouldVibrate (): boolean
   {
      return this.m_shouldVibrate;
   }

   //----------------------------------------------------------------

   //================================================================
   // 可選實作的方法
   //================================================================

   //----------------------------------------------------------------
   /**
    * 晃動開始通知
    */
   protected OnVibrateStart?(): void;

   //----------------------------------------------------------------
   /**
    * 晃動停止通知
    */
   protected OnVibrateStop?(): void;

   //----------------------------------------------------------------
   /**
    * 移動到最終目標角度通知
    */
   protected OnFinalized?(): void;

   //----------------------------------------------------------------
   /**
    * 全部動畫結束通知
    */
   protected OnAllFinish?(): void;

   //----------------------------------------------------------------

   //================================================================
   // 回傳參數，可覆寫
   //================================================================

   //----------------------------------------------------------------
   /**
    * 轉盤晃動角度
    */
   protected WheelVibrateAngle (): number
   {
      return CommonWheel.DEFAULTS.WHEEL_VIBRATE_ANGLE;
   }

   //----------------------------------------------------------------
   /**
    * 轉盤晃動總時間 (秒)
    */
   protected WheelVibrateDuration (): number
   {
      return CommonWheel.DEFAULTS.WHEEL_VIBRATE_DURATION;
   }

   //----------------------------------------------------------------
   /**
    * 轉盤晃動角度大小順序列
    */
   protected WheelVibrateScaleQueue (): number[]
   {
      return CommonWheel.DEFAULTS.WHEEL_VIBRATE_SCALES;
   }

   //----------------------------------------------------------------
   /**
    * 轉盤移動到最終位置時間 (秒)
    */
   protected WheelVibrateFinalizeTime (): number
   {
      return CommonWheel.DEFAULTS.WHEEL_FINALIZE_TIME;
   }

   //----------------------------------------------------------------
   /**
    * 是否自動開始晃動並移動到最終目標角度
    */
   protected AutoVibrateAndFinalize (): boolean
   {
      return true;
   }

   //----------------------------------------------------------------

   //================================================================
   // 回傳參數，可覆寫
   //================================================================

   //----------------------------------------------------------------
   /**
    * 啟動轉盤
    * @param targetIndex 目標區塊索引
    * @param option 可選參數
    * - `biasRate` 角度偏移率 (介於 `-1` 與 `1` 之間)
    * - `callback` 動畫結束回呼
    * - `vibrateBias` 需要晃動時決定要停在前方 (-1) 還是後方 (1)，不需要晃動時為 0
    */
   public Spin (
      targetIndex: number,
      option?: {
         biasRate?: CommonWheel.VarNum;
         callback?: Function;
         vibrateBias?: number;
      }
   ): void
   {
      const vibrateBias = option?.vibrateBias ?? 0;
      const midwayBias = vibrateBias > 0 ? 1 : vibrateBias < 0 ? -1 : 0;
      this.m_shouldVibrate = midwayBias != 0;
      this.m_midwayOffset = this.GetAngleOffset( midwayBias );

      super.Spin( targetIndex, option );
   }

   //----------------------------------------------------------------
   /**
    * 前後晃動
    */
   public Vibrate ( callback?: Function ): void
   {
      this.StopTween( CommonWheel.TWEEN.VWC_VIBRATE );

      // 結束回呼
      const onFinish = () =>
      {
         this._onVibrateStop();
         typeof callback == "function" && callback();
      };

      // 取得晃動參數
      const angle = this.WheelVibrateAngle();
      const duration = this.WheelVibrateDuration();

      // 建立晃動動畫
      if ( duration > 0 )
      {
         const scaleQueue = this.WheelVibrateScaleQueue();
         const scaleCount = scaleQueue.length;
         const cycleSpan = duration / scaleCount;

         let vibrateTween = new Tween().call( () => this._onVibrateStart() );
         for ( let i = 0; i < scaleCount; i++ )
         {
            const angleStep = angle * scaleQueue[ i ];
            vibrateTween = vibrateTween.by( cycleSpan / 4, { AxisAngle: -angleStep } )
               .by( cycleSpan / 2, { AxisAngle: +angleStep * 2 } )
               .by( cycleSpan / 4, { AxisAngle: -angleStep } );
         }

         this.PlayTween( CommonWheel.TWEEN.VWC_VIBRATE, vibrateTween.target( this ), onFinish );
      }
      // 立即結束
      else
      {
         this._onVibrateStart();
         onFinish();
      }
   }

   //----------------------------------------------------------------
   /**
    * 移動到最終目標角度
    */
   public Finalize ( callback?: Function ): void
   {
      this.StopTween( CommonWheel.TWEEN.VWC_FINALIZE );

      // 結束回呼
      const onFinish = () =>
      {
         this._onFinalized();
         typeof callback == "function" && callback();
      };

      // 取得所需時間 (秒)
      const duration = this.WheelVibrateFinalizeTime();

      // 建立動畫
      if ( duration > 0 )
      {
         this.PlayTween(
            CommonWheel.TWEEN.VWC_FINALIZE,
            new Tween()
               .delay( duration * 0.4 )
               .to( duration * 0.6, { AxisAngle: this.m_finalAngle }, { easing: easing.elasticOut } )
               .target( this ),
            onFinish,
         );
      }
      // 立即結束
      else
      {
         this.AxisAngle = this.m_finalAngle;
         onFinish();
      }
   }

   //----------------------------------------------------------------

   //================================================================
   // 覆寫 CommonWheelControl
   //================================================================

   //----------------------------------------------------------------
   // 讓轉動後停止在兩個 Cell 之間，準備晃動
   //----------------------------------------------------------------
   protected PrepareEvaluateSamples (): void
   {
      super.PrepareEvaluateSamples();

      const lastFixedDeg = this.CalculateLastAngle( this.m_targetAngle, this.m_spinRounds );
      !this.m_shouldVibrate && ( this.m_midwayOffset = this.m_targetOffset );
      this.m_lastAngle = lastFixedDeg + this.m_midwayOffset;
      this.m_finalAngle = lastFixedDeg + this.m_targetOffset;
   }

   //----------------------------------------------------------------

   //================================================================
   // 事件通知
   //================================================================

   //----------------------------------------------------------------
   // 轉動結束，準備晃動
   protected OnSpinStop (): void
   {
      super.OnSpinStop?.();

      // 自動開始晃動並移動到最終目標角度
      if ( this.AutoVibrateAndFinalize() && this.m_shouldVibrate )
      {
         this.Vibrate( () => this.Finalize() );
      }

      // 不需要晃動時直接通知結束
      if ( !this.m_shouldVibrate )
      {
         this._onAllFinish();
      }
   }

   //----------------------------------------------------------------
   /**
    * 晃動開始通知
    */
   private _onVibrateStart (): void
   {
      this.OnVibrateStart?.();
      this.Delegate?.OnVibrateWheelControlVibrateStart?.( this );
   }

   //----------------------------------------------------------------
   /**
    * 晃動停止通知
    */
   private _onVibrateStop (): void
   {
      this.OnVibrateStop?.();
      this.Delegate?.OnVibrateWheelControlVibrateStop?.( this );
   }

   //----------------------------------------------------------------
   /**
    * 移動到最終目標角度通知
    */
   private _onFinalized (): void
   {
      this.OnFinalized?.();
      this.Delegate?.OnVibrateWheelControlFinalized?.( this );

      this._onAllFinish();
   }

   //----------------------------------------------------------------
   /**
    * 全部動畫結束通知
    */
   private _onAllFinish (): void
   {
      this.OnAllFinish?.();
      this.Delegate?.OnVibrateWheelControlAllFinish?.( this );
   }

   //----------------------------------------------------------------

}
