
import { AudioMacro } from "../../../Audio/Foundation/AudioMacro";


export interface IGameOption
{
    /** 回傳遊戲版本號 */
    readonly GameVersion: string;

    /**
     * Join Game 時用來跟 Server 確認遊戲版本的檢查碼，預設值為`0`。
     * 當 Client 端的檢查碼小於 Server 端的檢查碼時，將會 `Join Fail`，
     * 接著跳出 MessageBox 告訴玩家重開遊戲，並在按下確認後自動重啟遊戲 App。
     */
    readonly GameCheckVersion?: number;

    /** 更新金流時使用的類型 */
    readonly ValutaType?: number;

    /** 贏分更新金流時所用的 LogCoinType */
    readonly LogCoinTypeOfWinning?: number;

    /** 是否使用全畫面的特效動畫 */
    readonly UsingFullScreenEffect?: boolean;

    /** 特色遊戲時是否暫停快訊彈出 */
    readonly PausePunchInFeatureGame?: boolean;

    /** 特色遊戲時是否暫停演出 */
    readonly PauseEpisodeInFeatureGame?: boolean;

    /** 是否自動載入語系文字 (預設 false) */
    readonly AutoLoadLocaleText?: boolean;

    /** 語系文字檔目錄 */
    readonly LocaleTextDirectory?: string;

    /** 載入音效資源的設定檔 */
    readonly AudioLoadingProfile?: AudioMacro.AssetsLoadProfile;

    /** 音效資源載入選項 */
    readonly AudioLoadingOptions?: AudioMacro.AssetsLoadOptions;

    /** 是否允許使用者隱藏側邊欄 */
    readonly HighlightUserHidable?: boolean;

    /** 側邊欄垂直偏移量 */
    readonly HighlightOffsetY?: number;

    /** 是否支援遊戲封包重發機制 */
    readonly CommandRetryable?: boolean;

    /**
     * JpRolling 元件的資料儲存前綴
     * 預設值為 `${GameId}_${ThemeType}`
     */
    readonly JpRollingRecordKeyPrefix?: string;
}
