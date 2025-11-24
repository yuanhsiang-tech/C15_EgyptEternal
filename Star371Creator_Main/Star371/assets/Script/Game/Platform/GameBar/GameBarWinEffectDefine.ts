import { isValid } from "cc";
import { AudiosDefine } from "../../../Define/AudiosDefine";


export namespace GameBarWinEffectDefine {

    //------------------------------------------------------------------------------------------------
    /** 贏分表演類型 */
    export enum WinEffectType {
        Normal,     // 普通跑分
        Expand,     // 擴展跑分
        Custom      // 客製化跑分
    }

    export enum AwardType{
        SMALL,
        MIDDLE,
        BIG,
        SUPER_BIG,
        FRENZY_WIN,
    }

    //================================================================================================
    /** 贏分表演設定 */
    //------------------------------------------------------------------------------------------------
    export class WinEffectSetting {
        
        //--------------------------------------------------------------------------------------------
        private m_ratio         :number = 0;
        private m_rollDuration  :number = 0;
        private m_effectType    :WinEffectType = WinEffectType.Normal;  
        private m_soundDuration :number = 0;
        private m_loopSound     :string = null;
        private m_finalSound    :string = null;
        private m_bgmVolume     :number = 0;
        private m_secondEffectPercent:number = 0;
        private m_secondRollDuration:number = 0;
        private m_awardType     :AwardType = AwardType.SMALL;
        private m_frenzyWinLoopSound:string = null;

        //============================================================================================
        /** 贏分表演設定
         * @param ratio         win / bet 比率
         * @param rollDuration  跑分時間 (秒)
         * @param effectType    表演類型
         * @param soundDuration 音效播放時間 (秒)
         * @param loopSound     循環音效路徑
         * @param finalSound    跑分結束音效路徑
         * @param bgmVolume     播放音效時背景音樂的音量 (使用 GameStage 上播放背景音樂功能時才會作用)
         * @param secondEffectPercent 第二段表演，第一段表演跑分至百分比後跑第二段(?)
         * @param secondRollDuration 第二段表演，第一段表演跑分至百分比後跑第二段(?)
         * @param awardType     獎項類型
         * @param frenzyWinLoopSound FrenzyWin循環音效路徑
         */
        //--------------------------------------------------------------------------------------------
        constructor (ratio:number, rollDuration:number, effectType?:WinEffectType, soundDuration?:number, loopSound?:string, 
                    finalSound?:string, bgmVolume?:number, secondEffectPercent?:number, secondRollDuration?:number, awardType?:AwardType , frenzyWinLoopSound?:string) {
            this.Ratio          = ratio;
            this.RollDuration   = rollDuration;
            this.EffectType     = isValid(effectType) ? effectType : WinEffectType.Normal;
            this.SoundDuration  = isValid(soundDuration) ? soundDuration : 0;
            this.LoopSound      = loopSound	 || null;
            this.FinalSound     = finalSound || null;
            this.BGMVolume      = isValid(bgmVolume) ? bgmVolume : 0.2;
            this.SecondEffectPercent = isValid(secondEffectPercent) ? secondEffectPercent : 0
            this.SecondRollDuration = isValid(secondRollDuration) ? secondRollDuration : 4
            this.AwardType = isValid(awardType) ? awardType : AwardType.SMALL
            this.FrenzyWinLoopSound = frenzyWinLoopSound || null;
        }

        //--------------------------------------------------------------------------------------------
        /** win / bet 比率 (幾倍以上(含)) */
        public get Ratio () :number { return this.m_ratio; }
        public set Ratio (r:number) { this.m_ratio = r; }

        /** 跑分時間 (秒) */
        public get RollDuration () :number { return this.m_rollDuration; }
        public set RollDuration (d:number) { this.m_rollDuration = Math.max(0, d); }

        /** 表演類型 */
        public get EffectType () :WinEffectType { return this.m_effectType; }
        public set EffectType (t:WinEffectType) { this.m_effectType = t; }

        /** 音效播放時間 (秒) */
        public get SoundDuration () :number { return this.m_soundDuration; }
        public set SoundDuration (d:number) { this.m_soundDuration = Math.max(0, d); }

        /** 循環音效路徑 */
        public get LoopSound () :string { return this.m_loopSound; }
        public set LoopSound (s:string) { this.m_loopSound = s; }

        /** 跑分結束音效路徑 */
        public get FinalSound () :string { return this.m_finalSound; }
        public set FinalSound (s:string) { this.m_finalSound = s; }

        /** 播放音效時背景音樂的音量 (使用 GameStage 上播放背景音樂功能時才會作用) */
        public get BGMVolume () :number { return this.m_bgmVolume; }
        public set BGMVolume (v:number) { this.m_bgmVolume = Math.min( Math.max( 0 , v ) , 1 ); }

        /** 第二段表演，第一段表演跑分至百分比後跑第二段 */
        public get SecondEffectPercent():number { return this.m_secondEffectPercent }
        public set SecondEffectPercent (v:number) { this.m_secondEffectPercent = Math.min( Math.max( 0 , v ) , 1 ); }

        /** 第二段表演，第一段表演跑分至百分比後跑第二段 */
        public get SecondRollDuration():number { return this.m_secondRollDuration }
        public set SecondRollDuration (v:number) { this.m_secondRollDuration = Math.max( v , 4 ); }
        
        /** 獎項類型 */
        public get AwardType () :AwardType { return this.m_awardType; }
        public set AwardType (t:AwardType) { this.m_awardType = t; }

        /**FrenzyWin循環音效路徑 */
        public get FrenzyWinLoopSound():string { return this.m_frenzyWinLoopSound; }
        public set FrenzyWinLoopSound(s:string) { this.m_frenzyWinLoopSound = s; }

        //============================================================================================
        /** 拷貝一份設定 */
        //--------------------------------------------------------------------------------------------
        public Clone () :WinEffectSetting {
            return new WinEffectSetting(
                this.Ratio,
                this.RollDuration,
                this.EffectType,            
                this.SoundDuration,
                this.LoopSound,
                this.FinalSound,
                this.BGMVolume,
                this.SecondEffectPercent,
                this.SecondRollDuration,
                this.AwardType,
                this.FrenzyWinLoopSound,
            );
        }
        //--------------------------------------------------------------------------------------------
    }

    //------------------------------------------------------------------------------------------------
    export type ReadableWinEffectSetting     = (WinEffectSetting | Readonly<WinEffectSetting>);
    export type ReadableWinEffectSettingList = (ReadableWinEffectSetting[] | Readonly<ReadableWinEffectSetting[]>);

    //================================================================================================
    /** 贏分表演設定群組 */
    //------------------------------------------------------------------------------------------------
    export class WinEffectSettingGroup {

        private m_default :ReadableWinEffectSetting   = null;
        private m_setting :ReadableWinEffectSetting[] = [];

        //--------------------------------------------------------------------------------------------
        constructor (setting:ReadableWinEffectSettingList, defaultSetting?:ReadableWinEffectSetting) {
            this.Default = defaultSetting;
            this.Setting = setting;
        }

        //--------------------------------------------------------------------------------------------
        /** Select 找不到時使用的預設設定 */
        public get Default () :ReadableWinEffectSetting { return this.m_default; }
        public set Default (d:ReadableWinEffectSetting) { this.m_default = d;    }

        /** 贏分表演設定清單 */
        public get Setting () :ReadableWinEffectSettingList { return this.m_setting; }
        public set Setting (s:ReadableWinEffectSettingList) {
            let arr = [];
            for (let _s of s) {
                arr.push(_s.Clone());
            }
            this.m_setting = arr;
            this.Sort();
        }

        //============================================================================================
        /** 根據倍率選擇一份設定 */
        //--------------------------------------------------------------------------------------------
        public SelectByRatio (ratio:number) :ReadableWinEffectSetting {
            let setting:ReadableWinEffectSetting = null;
            for (let i = 0; i < this.m_setting.length; i++) {
                if (ratio >= this.m_setting[i].Ratio) {
                    setting = this.m_setting[i];
                    break;
                }
            }
            if (!setting) {
                setting = this.m_default;
            }
            return setting;
        }

        //============================================================================================
        /** 根據倍率進行排序 (大到小) */
        //--------------------------------------------------------------------------------------------
        public Sort () {
            this.m_setting.sort((a, b) => (b.Ratio - a.Ratio));
        }

        //============================================================================================
        /** 拷貝設定群組 */
        //--------------------------------------------------------------------------------------------
        public Clone () :WinEffectSettingGroup {
            return new WinEffectSettingGroup(this.m_setting, this.m_default);
        }
        //--------------------------------------------------------------------------------------------
    }

    //------------------------------------------------------------------------------------------------
    /** 預設贏分設定表 */
    export const DefaultWinEffectSettingGroup = Object.freeze(new WinEffectSettingGroup([
        // 註解: WinEffectSetting          (倍率, 跑分時間, 表演類型,  音效播放時間,    循環音效路徑,                         跑分結束音效路徑, 背景音樂音量 , 獎項類型)
        Object.freeze(new WinEffectSetting(0, 1, WinEffectType.Normal ,1, AudiosDefine.FRAMEWORK_SLOT.COIN_WIN, null, 0.3, AwardType.SMALL)),
        Object.freeze(new WinEffectSetting(1, 2, WinEffectType.Normal, 3, AudiosDefine.FRAMEWORK_SLOT.COIN_WIN, null, AwardType.SMALL)),
        Object.freeze(new WinEffectSetting(5, 3, WinEffectType.Normal, 5, AudiosDefine.FRAMEWORK_SLOT.COIN_WIN, null, AwardType.SMALL)),
    ],  Object.freeze(new WinEffectSetting(0, 1, WinEffectType.Normal, 1, AudiosDefine.FRAMEWORK_SLOT.COIN_WIN, null, AwardType.SMALL))));
}

export type ReadableWinEffectSetting     = (GameBarWinEffectDefine.WinEffectSetting | Readonly<GameBarWinEffectDefine.WinEffectSetting>);
export type ReadableWinEffectSettingList = (ReadableWinEffectSetting[] | Readonly<ReadableWinEffectSetting[]>);