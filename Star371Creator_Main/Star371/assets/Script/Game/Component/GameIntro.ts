// 只有 SlotGame 能用
// 只適合簡單的開場動畫
// 開場動畫要要是spine動畫
// 新增TimeScale 可以調整動畫播放速度


import { Node, sp, _decorator, Vec3, log, Button, UIOpacity, tween, v3 } from "cc";
import AudioManager from "../../Audio/Foundation/AudioManager";
import { TouchableEvent } from "db://assets/Stark/Interactive/Touchable";
import EpisodeEntityBase from "../../Feature/Episode/EpisodeEntityBase";
import { Persist } from "../../Persist/Persist";
import { Device } from "../../Device/Device";
import { EpisodeMacro } from "../../Feature/Episode/EpisodeMacro";


const { ccclass, property } = _decorator;

const GAME_INTRO = "GAME_INTRO";

const DEFAULT_POS1 = v3(614, -140, 0);
const DEFAULT_POS2 = v3(290, -200, 0);

const BEFORE_END_FUNC_TIME = 1.0;

const DESTROY_DELAY = 0.5;

export const POS_TYPE = {
    /** 不使用預設位置(記得需自己帶入快轉按鈕位置) */
    NONE:0,
    /** 橫板 */
    LANDSCAPE: 1,
    /** 直板 */
    PORTRAIT: 2,
};

/** 開場動畫相關資料 */
export class GameIntroData {
    key:string;
    /** 動畫播放完畢的回調(必填) */
    endFunc: Function;
    /** spine 元件(必填) */
    spineComponent: sp.Skeleton;
    /** spine 動畫名稱(必填) */
    aniName: string;
    /** 開場動畫的音效路徑(必填) */
    audioPath: string;
    /** 快轉到第幾秒(必填) */
    fastForwardTimeSec: number;
    /** 快轉按鈕的位置（自定義） */
    skipBtnPos: Vec3;
    /** 動畫事件的回調 */
    eventFunc: Function;
    /** 動畫開始播放的回調 */
    startFunc: Function;
    /** 動畫播放速度 */
    timeScale: number;
    // -------------

   
    /** @deprecated 已棄用 會自動判斷直橫版 */
    skipBtnPositionType: number;
    /** @deprecated 已棄用 播放幾秒後隱藏快轉按鈕，請使用fastForwardTimeSec  */
    hideSkipBtnTimeSec: number;
}

@ccclass
export default class GameIntro extends EpisodeEntityBase<GameIntroData> {
    
    /** 進場動畫跳過按鈕 */
    @property({type: Button})
    private m_skipBtn: Button = null;

    /** 開場動畫spine */
    @property({type: Node})
    private m_spinNode: Node = null;

    /** 進場動畫音效 Key */
    private m_introSoundKey: number = -1;

    /** 進場動畫 TrackEntry */
    private m_introTrackEntry: sp.spine.TrackEntry = null;

    /** 開場動畫相關資料 */
    private m_introData: GameIntroData = null;
    
    /** 是否已觸發剩餘一秒回調 */
    private m_hasTriggeredBeforeEnd: boolean = false;

    public OnEpisodeLaunch(episodeData?: GameIntroData): void {
        this.Awake(episodeData);
    }

    protected onLoad(): void {
        log("[GameIntro] onLoad")
    }

    protected onDestroy(): void {
        log("[GameIntro] onDestroy")
        // 停止動畫時間監控
        this.unschedule(this.CheckAnimationTime);
    }

    /**
     * 是否播過開場動畫
     * @returns true 已經播過 / false 尚未播過
     */
    static IsIntroShown():boolean {
        let storagesData = this.GetStoragesData().storagesData
        let isIntroShown = storagesData.isIntroShown
        log("[GameIntro] isIntroShown:", isIntroShown)
        return isIntroShown
    }

    /** 清除紀錄 */
    static ClearGameIntroData(){
        log("[GameIntro][ClearGameIntroData]")
        this.SaveGameIntroData(false)
    }

    static SaveGameIntroData(isShown:boolean) {
        let data = GameIntro.GetStoragesData()
        let storagesData = data.storagesData
        storagesData.Time = data.timeNow;
        storagesData.isIntroShown = isShown;
        Persist.App.Set(data.key, JSON.stringify(storagesData));
    }

    /**
     * 播放開場動畫
     * @param data 開場動畫相關設定
     */
    public ShowGameIntro( data:GameIntroData ):void {
        GamesChief.SlotGame.BlockPlatformUI();
        this.m_introData = data
        if (this.m_introData.spineComponent) {
            this.m_introData.spineComponent.node.active = false;
            this.m_spinNode.addChild( this.m_introData.spineComponent.node )
            log("[GameIntro][ShowGameIntro] skipBtnPos:", this.m_introData.skipBtnPos)
            // 有自定義的位置
            if ( this.m_introData.skipBtnPos && this.m_introData.skipBtnPos != undefined ) {
                this.m_skipBtn.node.setPosition(this.m_introData.skipBtnPos)
            } else {
                if ( Device.Current.Orientation == Device.Orientation.PORTRAIT ){
                    this.m_skipBtn.node.setPosition(DEFAULT_POS2)
                } else {
                    this.m_skipBtn.node.setPosition(DEFAULT_POS1)
                }
            }
        }
        GamesChief.SlotGame.GameBar.node.active = false
        //VFTopBar.Instance.Visible = false;
        GamesChief.SlotGame.AttachEpisode(GAME_INTRO, this, EpisodeMacro.DEFAULT_TYPE);
        GamesChief.SlotGame.SubmitEpisode(GAME_INTRO, this.m_introData);
    }

    /** 取得本機紀錄的資料 */
    private static GetStoragesData(){        
        const nameKey:string = GamesChief.SlotGame.BundleName + "_INTRO_KEY" ;
        const timeNow:number = Date.now();
        // log("[GameIntro] nameKey:", nameKey)
        let storagesData:any = Persist.App.Get(nameKey);
        storagesData = !storagesData ? {
            Time: timeNow,
            isIntroShown: false
        } : JSON.parse(storagesData);

        const storeTimeDate: number = new Date(storagesData.Time).getDate();
        const nowTimeDate: number = new Date(timeNow).getDate();

        // log("[GameIntro] storeTimeDate:", storeTimeDate)
        // log("[GameIntro] nowTimeDate:", storeTimeDate)

        // 跨日重置
        if ( storeTimeDate != nowTimeDate ) {
            storagesData.isIntroShown = false;
        }

        let data:any = {}
        data.storagesData = storagesData
        data.key = nameKey
        data.timeNow = timeNow
        return data
    }

    /** 當跳過按鈕按下後處理的事件 */
    private OnSkipBtnClicked() {
        this.HideSkipButton()
        if ( this.m_introData.fastForwardTimeSec ) {
            this.m_introTrackEntry.trackTime = this.m_introData.fastForwardTimeSec;
            if (this.m_introSoundKey >= 0) {
                AudioManager.Instance.SetCurrentTime(this.m_introSoundKey, this.m_introData.fastForwardTimeSec);
            }
        }
    }

    /**
     * 開始監控動畫時間
     * 當動畫剩餘時間為 ? 秒時觸發回調
     */
    private StartAnimationTimeMonitoring(): void {
        this.m_hasTriggeredBeforeEnd = false;
        // 啟用 update 監控
        this.schedule(this.CheckAnimationTime, 0.1); // 每0.1秒檢查一次
    }

    /**
     * 檢查動畫時間，當剩餘時間約為 ? 秒時觸發回調
     */
    private CheckAnimationTime = (): void => {
        if (!this.m_introTrackEntry || !this.m_introData || this.m_hasTriggeredBeforeEnd) {
            return;
        }

        const animation = this.m_introTrackEntry.animation;
        if (!animation) return;

        const currentTime = this.m_introTrackEntry.trackTime;
        const totalDuration = animation.duration;
        const timeScale = this.m_introTrackEntry.timeScale || 1.0;
        
        // 計算剩餘時間（考慮播放速度）
        const remainingTime = (totalDuration - currentTime) / timeScale;

        log(`[GameIntro] 動畫監控 - 當前時間: ${currentTime.toFixed(2)}s, 總時長: ${totalDuration.toFixed(2)}s, 剩餘時間: ${remainingTime.toFixed(2)}s`);

        // 當剩餘時間 <= 1.0 秒且尚未觸發回調時
        if (remainingTime <= BEFORE_END_FUNC_TIME && !this.m_hasTriggeredBeforeEnd) {
            this.m_hasTriggeredBeforeEnd = true;
            log("[GameIntro] 觸發剩餘" + BEFORE_END_FUNC_TIME + "秒回調");            
            // 停止監控
            this.unschedule(this.CheckAnimationTime);            
            // 觸發回調
            this.HideSkipButton()
        }
    }

    // 實作 IEffector
    Awake(data?: GameIntroData) {
        this.AwakeGameIntro(data)
    }

    private AwakeGameIntro(data: GameIntroData) {
        const spine: sp.Skeleton = data.spineComponent;
        if (!spine || !spine.node) return;

        GameIntro.SaveGameIntroData(true)

        spine.node.active = true;
        GamesChief.SlotGame.GameExteriorLayer.addChild(this.node);
        this.m_skipBtn.node.active = true
        this.m_skipBtn.node.on(TouchableEvent.Clicked, this.OnSkipBtnClicked, this);

        // 播放進場音效
        if ( data.audioPath ) {
            this.m_introSoundKey = AudioManager.Instance.Play(data.audioPath, { gamePausable: false });
        }

        spine.setCompleteListener(( trackEntry: sp.spine.TrackEntry ) => {
            log("[GameIntro] setCompleteListener > animationName:", trackEntry.animation.name)
            spine.setCompleteListener(null);
            
            // 停止動畫時間監控
            this.unschedule(this.CheckAnimationTime);
            
            spine.node.destroy()
            this.FinishEpisode();
            this.node.active = false;
            this.m_introData.endFunc && this.m_introData.endFunc( trackEntry );
            GamesChief.SlotGame.UnblockPlatformUI()
            this.scheduleOnce(() => {
                this.destroy();
            }, DESTROY_DELAY );
        });

        spine.setEventListener(( trackEntry: sp.spine.TrackEntry, event: sp.spine.Event) => {
            // log("[GameIntro] setEventListener > animationName:", trackEntry.animation.name)
            log("[GameIntro] setEventListener > eventName:", event.data.name)
            spine.setEventListener(null)
            data.eventFunc && data.eventFunc( trackEntry, event );
        })

        spine.setStartListener(( trackEntry: sp.spine.TrackEntry ) => {
            log("[GameIntro] setStartListener > animationName:",  trackEntry.animation.name)
            spine.setStartListener(null)
            data.startFunc && data.startFunc( trackEntry );
        })

        // 設定動畫播放並監聽完成事件
        this.m_introTrackEntry = spine.setAnimation(0, data.aniName, false);

        // 設定動畫播放速度
        if( data.timeScale && data.timeScale > 0 ){
            this.m_introTrackEntry.timeScale = data.timeScale;
        }

        // 開始監控動畫時間
        this.StartAnimationTimeMonitoring();
    }
    
    private HideSkipButton() {
        log("[GameIntro][HideSkipButton]")
        // 移除快過按鈕的點擊事件監聽器
        this.m_skipBtn.node.off(TouchableEvent.Clicked, this.OnSkipBtnClicked, this);
        // 如果按鈕當前是可見的，執行隱藏動畫
        if (!this.m_skipBtn.node.active) return;

        // 恢復場景動畫
        this.ResumeScene()
        // 天地bar
           GamesChief.SlotGame.GameBar.node.active = true;
        // VFTopBar.Instance.Visible = true;

        const uiOpacity = this.m_skipBtn.node.getComponent(UIOpacity);
        tween(uiOpacity)
            .to(0.3, { opacity: 0 })
            .call(() => {
                if(this.m_skipBtn && this.m_skipBtn.node)
                    this.m_skipBtn.node.active = false;
            })
            .start();
    }  
}
