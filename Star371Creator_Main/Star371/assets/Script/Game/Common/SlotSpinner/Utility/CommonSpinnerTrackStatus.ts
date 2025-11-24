import { Tween } from "cc";
import { CommonSpinner } from "../CommonSpinnerMacros";

/**
 * 軌道狀態
 */
export default class CommonSpinnerTrackStatus
{

   //----------------------------------------------------------------
   /**
    * 軌道索引
    */
   public readonly Index: number = -1;

   //----------------------------------------------------------------
   /**
    * 啟動延遲時間 (秒)
    */
   public DelayToRun: number = 0;

   /**
    * 停輪延遲時間 (秒)
    */
   public DelayToStop: number = 0;

   /**
    * Near Win 延遲時間 (秒)
    */
   public DelayToNearWin: number = 0;

   /**
    * 是否 Near Win
    */
   public IsNearWin: boolean = false;

   /**
    * Near Win 持續時間 (秒)
    */
   public NearWinTime: number = 0;

   //----------------------------------------------------------------

   private m_speed: number = CommonSpinner.MINIMUM_SPEED;

   /**
    * 速度 (px/秒)
    */
   public get Speed (): number
   {
      return this.m_speed;
   }
   public set Speed ( value: number )
   {
      this.m_speed = Math.max( CommonSpinner.MINIMUM_SPEED, value );
   }

   //----------------------------------------------------------------

   private m_reboundDist: number = 0;

   /**
    * 回彈距離 (px)
    */
   public get ReboundDist (): number
   {
      return this.m_reboundDist;
   }
   public set ReboundDist ( value: number )
   {
      this.m_reboundDist = Math.max( 0, value );
   }

   //----------------------------------------------------------------

   private m_reboundTime: number = 0;

   /**
    * 回彈時間 (秒)
    */
   public get ReboundTime (): number
   {
      return this.m_reboundTime;
   }
   public set ReboundTime ( value: number )
   {
      this.m_reboundTime = Math.max( 0, value );
   }

   //----------------------------------------------------------------

   private m_speedTween: Tween<CommonSpinnerTrackStatus> = null;
   private m_endSpeed: number = CommonSpinner.MINIMUM_SPEED;

   //----------------------------------------------------------------

   constructor (
      index: number,
      speed: number = CommonSpinner.MINIMUM_SPEED,
      delayToRun: number = 0,
      delayToStop: number = 0,
      delayToNearWin: number = 0,
      isNearWin: boolean = false,
      nearWinTime: number = 0,
      reboundDist: number = 0,
      reboundTime: number = 0,
   )
   {
      this.Index = index;
      this.Speed = speed;
      this.DelayToRun = delayToRun;
      this.DelayToStop = delayToStop;
      this.DelayToNearWin = delayToNearWin;
      this.IsNearWin = isNearWin;
      this.NearWinTime = nearWinTime;
      this.ReboundDist = reboundDist;
      this.ReboundTime = reboundTime;
   }

   //----------------------------------------------------------------
   /**
    * 重置狀態
    */
   public Reset (): CommonSpinnerTrackStatus
   {
      this.Speed = CommonSpinner.MINIMUM_SPEED;
      this.DelayToRun = 0;
      this.DelayToStop = 0;
      this.DelayToNearWin = 0;
      this.IsNearWin = false;
      this.NearWinTime = 0;
      this.ReboundDist = 0;
      this.ReboundTime = 0;

      return this;
   }

   //----------------------------------------------------------------
   /**
    * 變換速度
    * @param speed 目標速度 (px/秒)
    * @param second 緩衝時間 (秒)
    */
   public SpeedTo ( speed: number, second: number = 0 ): this
   {
      const endSpeed = Math.max( CommonSpinner.MINIMUM_SPEED, speed );

      this.m_speedTween?.stop();
      this.m_speedTween = null;

      if ( endSpeed != this.Speed )
      {
         if ( second > 0 )
         {
            this.m_speedTween = new Tween<CommonSpinnerTrackStatus>( this )
               .to( second, { Speed: endSpeed } )
               .call( () => { this.m_speedTween = null; } )
               .start();
         }
         else
         {
            this.Speed = endSpeed;
         }

         this.m_endSpeed = endSpeed;
      }

      return this;
   }

   //----------------------------------------------------------------
   /**
    * 速度直接設成目標值 (無緩衝時間)
    */
   public SpeedEnd (): this
   {
      this.m_speedTween?.stop();
      this.m_speedTween = null;

      this.Speed = this.m_endSpeed;

      return this;
   }

   //----------------------------------------------------------------

}
