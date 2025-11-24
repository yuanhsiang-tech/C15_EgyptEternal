import { CommonSpinner } from "../CommonSpinnerMacros";

/**
 * 通用滾輪速度設定
 */
export class CommonSpinnerSpeedConfig
{

   //----------------------------------------------------------------

   private m_beginInterval: number = 0;

   /** 每輪間啟動間隔 (秒) */
   public get beginInterval (): number
   {
      return this.m_beginInterval;
   }
   public set beginInterval ( value: number )
   {
      this.m_beginInterval = CommonSpinner.Clamp( value );
   }

   //----------------------------------------------------------------

   private m_chargeDist: number = 0;

   /** 拉回距離 (像素) */
   public get chargeDist (): number
   {
      return this.m_chargeDist;
   }
   public set chargeDist ( value: number )
   {
      this.m_chargeDist = CommonSpinner.Clamp( value );
   }

   //----------------------------------------------------------------

   private m_chargeTime: number = 0;

   /** 拉回時間 (秒) */
   public get chargeTime (): number
   {
      return this.m_chargeTime;
   }
   public set chargeTime ( value: number )
   {
      this.m_chargeTime = CommonSpinner.Clamp( value );
   }

   //----------------------------------------------------------------

   private m_moveSpeed: number = 0;

   /** 移動速度 (像素/秒) */
   public get moveSpeed (): number
   {
      return this.m_moveSpeed;
   }
   public set moveSpeed ( value: number )
   {
      this.m_moveSpeed = CommonSpinner.Clamp( value, CommonSpinner.MINIMUM_SPEED );
   }

   //----------------------------------------------------------------

   private m_stopTriggerTime: number = 0;

   /** 自動觸發停輪時間 (秒) */
   public get stopTriggerTime (): number
   {
      return this.m_stopTriggerTime;
   }
   public set stopTriggerTime ( value: number )
   {
      this.m_stopTriggerTime = CommonSpinner.Clamp( value );
   }

   //----------------------------------------------------------------

   private m_endedDelay: number = 0;

   /** 停輪延遲 (秒) */
   public get endedDelay (): number
   {
      return this.m_endedDelay;
   }
   public set endedDelay ( value: number )
   {
      this.m_endedDelay = CommonSpinner.Clamp( value );
   }

   //----------------------------------------------------------------

   private m_endedInterval: number = 0;

   /** 每輪間停輪間隔 (秒) */
   public get endedInterval (): number
   {
      return this.m_endedInterval;
   }
   public set endedInterval ( value: number )
   {
      this.m_endedInterval = CommonSpinner.Clamp( value );
   }

   //----------------------------------------------------------------

   private m_nearWinSpeed: number = 0;

   /** Near Win 速度 (像素/秒) */
   public get nearWinSpeed (): number
   {
      return this.m_nearWinSpeed;
   }
   public set nearWinSpeed ( value: number )
   {
      this.m_nearWinSpeed = CommonSpinner.Clamp( value, CommonSpinner.MINIMUM_SPEED );
   }

   //----------------------------------------------------------------

   private m_nearWinTime: number = 0;

   /** Near Win 持續時間 (秒) */
   public get nearWinTime (): number
   {
      return this.m_nearWinTime;
   }
   public set nearWinTime ( value: number )
   {
      this.m_nearWinTime = CommonSpinner.Clamp( value );
   }

   //----------------------------------------------------------------

   private m_stopSpeed: number = 0;

   /** 觸發停輪後速度 (像素/秒) */
   public get stopSpeed (): number
   {
      return this.m_stopSpeed;
   }
   public set stopSpeed ( value: number )
   {
      this.m_stopSpeed = CommonSpinner.Clamp( value, CommonSpinner.MINIMUM_SPEED );
   }

   //----------------------------------------------------------------

   private m_stopMode: CommonSpinner.STOP_MODE = CommonSpinner.STOP_MODE.FIXED_TIME;

   /** 停輪模式 */
   public get stopMode (): CommonSpinner.STOP_MODE
   {
      return this.m_stopMode;
   }
   public set stopMode ( value: CommonSpinner.STOP_MODE )
   {
      switch ( value )
      {
         case CommonSpinner.STOP_MODE.FIXED_TIME:
         case CommonSpinner.STOP_MODE.FIXED_SPEED:
            this.m_stopMode = value;
            break;
         default:
            this.m_stopMode = CommonSpinner.STOP_MODE.FIXED_TIME;
            break;
      }
   }

   //----------------------------------------------------------------

   private m_reboundDist: number = 0;

   /** 回彈距離 (像素) */
   public get reboundDist (): number
   {
      return this.m_reboundDist;
   }
   public set reboundDist ( value: number )
   {
      this.m_reboundDist = CommonSpinner.Clamp( value );
   }

   //----------------------------------------------------------------

   private m_reboundTime: number = 0;

   /** 回彈時間 (秒) */
   public get reboundTime (): number
   {
      return this.m_reboundTime;
   }
   public set reboundTime ( value: number )
   {
      this.m_reboundTime = CommonSpinner.Clamp( value );
   }

   //----------------------------------------------------------------

   private m_hardStopSpeed: number = 0;

   /** 強停速度 (像素/秒) */
   public get hardStopSpeed (): number
   {
      return this.m_hardStopSpeed;
   }
   public set hardStopSpeed ( value: number )
   {
      this.m_hardStopSpeed = CommonSpinner.Clamp( value, CommonSpinner.MINIMUM_SPEED );
   }

   //----------------------------------------------------------------

   private m_hardReboundDist: number = 0;

   /** 強停回彈距離 (像素) */
   public get hardReboundDist (): number
   {
      return this.m_hardReboundDist;
   }
   public set hardReboundDist ( value: number )
   {
      this.m_hardReboundDist = CommonSpinner.Clamp( value );
   }

   //----------------------------------------------------------------

   private m_hardReboundTime: number = 0;

   /** 強停回彈時間 (秒) */
   public get hardReboundTime (): number
   {
      return this.m_hardReboundTime;
   }
   public set hardReboundTime ( value: number )
   {
      this.m_hardReboundTime = CommonSpinner.Clamp( value );
   }

   //----------------------------------------------------------------
   /**
    * @param beginInterval    每輪間啟動間隔 (秒)
    * @param chargeDist       拉回距離 (像素)
    * @param chargeTime       拉回時間 (秒)
    * @param moveSpeed        移動速度 (像素/秒)
    * @param stopTriggerTime  自動觸發停輪時間 (秒)
    * @param endedDelay       停輪延遲 (秒)
    * @param endedInterval    每輪間停輪間隔 (秒)
    * @param nearWinSpeed     Near Win 速度 (像素/秒)
    * @param nearWinTime      Near Win 持續時間 (秒)
    * @param stopSpeed        觸發停輪後速度 (像素/秒)
    * @param stopMode         停輪模式
    * @param reboundDist      回彈距離 (像素)
    * @param reboundTime      回彈時間 (秒)
    * @param hardStopSpeed    強停速度 (像素/秒)
    * @param hardReboundDist  強停回彈距離 (像素)
    * @param hardReboundTime  強停回彈時間 (秒)
    */
   constructor (
      beginInterval: number,
      chargeDist: number,
      chargeTime: number,
      moveSpeed: number,
      stopTriggerTime: number,
      endedDelay: number,
      endedInterval: number,
      nearWinSpeed: number,
      nearWinTime: number,
      stopSpeed: number,
      stopMode: CommonSpinner.STOP_MODE,
      reboundDist: number,
      reboundTime: number,
      hardStopSpeed: number,
      hardReboundDist: number,
      hardReboundTime: number,
   )
   {
      this.beginInterval = beginInterval;
      this.chargeDist = chargeDist;
      this.chargeTime = chargeTime;
      this.moveSpeed = moveSpeed;
      this.stopTriggerTime = stopTriggerTime;
      this.endedDelay = endedDelay;
      this.endedInterval = endedInterval;
      this.nearWinSpeed = nearWinSpeed;
      this.nearWinTime = nearWinTime;
      this.stopSpeed = stopSpeed;
      this.stopMode = stopMode;
      this.reboundDist = reboundDist;
      this.reboundTime = reboundTime;
      this.hardStopSpeed = hardStopSpeed;
      this.hardReboundDist = hardReboundDist;
      this.hardReboundTime = hardReboundTime;
   }

   //----------------------------------------------------------------
   /**
    * 複製
    * @param options 額外客製化設定
    */
   public Clone ( options?: {
      beginInterval?: number,
      chargeDist?: number,
      chargeTime?: number,
      moveSpeed?: number,
      stopTriggerTime?: number,
      endedDelay?: number,
      endedInterval?: number,
      nearWinSpeed?: number,
      nearWinTime?: number,
      stopSpeed?: number,
      stopMode?: CommonSpinner.STOP_MODE,
      reboundDist?: number,
      reboundTime?: number,
      hardStopSpeed?: number,
      hardReboundDist?: number,
      hardReboundTime?: number,
   } ): CommonSpinnerSpeedConfig
   {
      // 複製自身
      const config = new CommonSpinnerSpeedConfig(
         this.beginInterval,
         this.chargeDist,
         this.chargeTime,
         this.moveSpeed,
         this.stopTriggerTime,
         this.endedDelay,
         this.endedInterval,
         this.nearWinSpeed,
         this.nearWinTime,
         this.stopSpeed,
         this.stopMode,
         this.reboundDist,
         this.reboundTime,
         this.hardStopSpeed,
         this.hardReboundDist,
         this.hardReboundTime,
      );

      // 客製化設定
      if ( options && typeof options == "object" )
      {
         for ( const key in options )
         {
            if ( key in config )
            {
               config[ key ] = options[ key ];
            }
         }
      }

      return config;
   }

   //----------------------------------------------------------------

}

/**
 * 可讀取的通用滾輪速度設定
 */
export type ReadableCommonSpinnerSpeedConfig = Readonly<CommonSpinnerSpeedConfig> | CommonSpinnerSpeedConfig;
