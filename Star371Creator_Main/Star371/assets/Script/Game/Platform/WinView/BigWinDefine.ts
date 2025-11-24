import { NumberUtils } from "db://assets/Stark/FuncUtils/NumberUtils";
import { AudiosDefine } from "../../../Define/AudiosDefine";
import { ThemeType } from "../../../Proto/gt2/basicTypes/basicTypes_pb";

export namespace BigWinDefine
{
    //----------------------------------------------------------------
    export enum BigWinType
    {
        NONE        = 0,
        BIG         = 1,
        MEGA        = 2,
        SUPER       = 3,
    }

    //----------------------------------------------------------------

    class BigWinEffectData
    {
        public Ratio:           number;
        public LoopSound:       string;

        constructor( ratio : number, loopSound : string)
        {
            this.Ratio      = ratio;
            this.LoopSound  = loopSound;
        }
    }

    export const SOUND_ROOT = "Sound/";

    export const Animation = {
        [BigWinType.BIG]: "big_anim__anim__",
        [BigWinType.MEGA]: "mega_anim__anim__",
        [BigWinType.SUPER]: "super_anim__anim__",
    }

    export const LabelAnimation = {
        Start: "awardBoard__anim__main_800b",
        End: "awardBoard__anim__ending_8d00"
    }
    
    export const BigWinEffectDataSetting: {[tpye in BigWinDefine.BigWinType]: Readonly<BigWinEffectData>} =
    {
        [BigWinDefine.BigWinType.NONE]:     new BigWinEffectData(0, ""),
        [BigWinDefine.BigWinType.BIG]:      new BigWinEffectData(10, AudiosDefine.FRAMEWORK_SLOT_BIGWIN.BIG_WIN),
        [BigWinDefine.BigWinType.MEGA]:     new BigWinEffectData(30, AudiosDefine.FRAMEWORK_SLOT_BIGWIN.MEGA_WIN),
        [BigWinDefine.BigWinType.SUPER]:    new BigWinEffectData(50, AudiosDefine.FRAMEWORK_SLOT_BIGWIN.SUPER_WIN),
    };

    //----------------------------------------------------------------
    /**
     * 檢查特定倍率回傳的BigWinType
     */
    export function CheckBigWinType( ratio : number | BigNumber ): BigWinType
    {
        ratio = NumberUtils.ParseBigNumber(ratio);
        for( let i = BigWinType.SUPER; i >= BigWinType.BIG; i-- ){
            if( ratio.gte(BigWinEffectDataSetting[i].Ratio) ){
                return i;
            }
        }
        return BigWinType.NONE;
    }

    //----------------------------------------------------------------
    /**
     * @interface WinEpisodeData
     * @description 贏分資料
     * @param delegate          WinViewDelegate
     * @param betValue          押注金額
     * @param finalWinValue     贏得金額
     * @param endCallback       動畫撥完、截圖後會回call
     * @param rollingDuration   分數滾動時間(秒)
     * @param formatFn          數字格式化函式
     * @param themeType         廳館類型
     */
    export interface WinEpisodeData
    {
        betValue:           BigValuable;
        finalWinValue:      BigValuable;
        endCallback?:       Function;
        rollingDuration?:   number;
        formatFn?:         (value: number|BigNumber) => string;
        themeType?:        ThemeType;
    }
    //----------------------------------------------------------------

    export const DEFAULT_ROLLING_DURATION = {
        [BigWinType.BIG]:      5,
        [BigWinType.MEGA]:     5,
        [BigWinType.SUPER]:    5,
    }

}