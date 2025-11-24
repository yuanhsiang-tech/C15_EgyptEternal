import { _decorator, Component, Vec2, Color, Animation, AnimationClip, Label, log } from 'cc'
import { TimedBool } from '../../../Stark/Utility/TimedBool'
import CommonButton from '../../../Stark/Interactive/CommonButton';
import Touchable, { TouchableEvent } from '../../../Stark/Interactive/Touchable';
import { EventTouch } from 'cc';

const { ccclass, property } = _decorator

const SystemBtnType = {
    Menu: 0,
    Music: 1,
    Sound: 2,
    Quality: 3,
    Leave: 4,
    Gain: 5,
}

const SystemBtnColor = {
    ON: new Color(0xFF, 0xFF, 0xFF),
    OFF: new Color(0x4F, 0x4F, 0x4F),
}

@ccclass('FishCommSystemBtn')
export class FishCommSystemBtn extends Component {

    
    @property({
        type: CommonButton,
        tooltip: "系統按鈕"
    })
    public m_systemBtn: CommonButton = null


    @property({
        type: [CommonButton],
        tooltip: "圖鑑按鈕"
    })
    public m_menuBtn: CommonButton = null

    @property({
        type: [CommonButton],
        tooltip: "音樂按鈕"
    })
    public m_musicBtn: CommonButton = null

    @property({
        type: [CommonButton],
        tooltip: "音效按鈕"
    })
    public m_soundBtn: CommonButton = null

    @property({
        type: [CommonButton],
        tooltip: "陰影按鈕"
    })
    public m_qualityBtn: CommonButton = null

    @property({
        type: [CommonButton],
        tooltip: "離開按鈕"
    })
    public m_leaveBtn: CommonButton = null

    @property({
        type: [CommonButton],
        tooltip: "收穫按鈕"
    })
    public m_gainBtn: CommonButton = null


    @property({
        type: [Label],
        tooltip: "按鈕文字"
    })
    public m_btnTexts: Label[] = []


    public m_subSystemBtns: CommonButton[] = []
    private m_isOpen: boolean = false
    private m_btnCd: TimedBool = new TimedBool(0.2)
    private m_anim: Animation = null
    private m_animClips: AnimationClip[] = []
    private m_animPlaying: boolean = false

    public s_systemBtnType: typeof SystemBtnType = SystemBtnType

    public onLoad() {
        if (this.node.getComponent(Animation) == null) {
            return;
        }

        this.m_anim = this.node.getComponent(Animation);
        if (this.m_anim ) {
            this.m_animClips = this.m_anim.clips;
            for (let i = 0; i < this.m_animClips.length; i++) {
                // 設置播放一次
                const state = this.node.getComponent(Animation).getState(this.m_animClips[i].name || '');
                if (state) {
                    state.wrapMode = AnimationClip.WrapMode.Normal;
                    state.repeatCount = 1;
                }
            }
        }
        this.m_btnCd.Start()

        this.m_subSystemBtns[this.s_systemBtnType.Menu] = this.m_menuBtn;
        this.m_subSystemBtns[this.s_systemBtnType.Music] = this.m_musicBtn;
        this.m_subSystemBtns[this.s_systemBtnType.Sound] = this.m_soundBtn;
        this.m_subSystemBtns[this.s_systemBtnType.Quality] = this.m_qualityBtn;
        this.m_subSystemBtns[this.s_systemBtnType.Leave] = this.m_leaveBtn;
        this.m_subSystemBtns[this.s_systemBtnType.Gain] = this.m_gainBtn;

        this.m_systemBtn.node.on(TouchableEvent.Clicked, this.OnSystemClick, this);
        
    }

    protected onDisable(): void {
        this.m_systemBtn.node.off(TouchableEvent.Clicked, this.OnSystemClick, this);
    }

    /**
     * 圖鑑按鈕點擊
     */
    public OnMenuClick(target: Touchable, event: EventTouch): void {
    }

    /**
     * 音樂按鈕點擊
     */
    public OnMusicClick(target: Touchable, event: EventTouch): void {
    }

    /**
     * 音效按鈕點擊
     */
    public OnSoundClick(target: Touchable, event: EventTouch): void {
    }

    /**
     * 陰影按鈕點擊
     */
    public OnQualityClick(target: Touchable, event: EventTouch): void {
    }
    
    /**
     * 離開按鈕點擊
     */
    public OnLeaveClick(target: Touchable, event: EventTouch): void {
    }

    /**
     * 收穫按鈕點擊
     */
    public OnGainClick(target: Touchable, event: EventTouch): void {
    }


    private OnSystemClick(target: Touchable, event: EventTouch) {
        
        if ( this.m_btnCd.TakeAndRestart() == false || this.m_animPlaying == true ) {
            return
        }

        this.m_animPlaying = true;
        this.m_anim.off(Animation.EventType.FINISHED);
        if (this.m_isOpen == false) {
            //默認開啟動畫為[1]
            if (this.m_animClips[1]) {
                this.node.getComponent(Animation).play(this.m_animClips[1].name)
                this.m_anim.once(Animation.EventType.FINISHED, () => {
                    this.m_animPlaying = false;
                });
            }
        } else {
            //默認開啟動畫為[2]
            if (this.m_animClips[2]) {
                this.node.getComponent(Animation).play(this.m_animClips[2].name)
                this.m_anim.once(Animation.EventType.FINISHED, () => {
                    this.m_animPlaying = false;
                });
            }
        }
        this.m_isOpen = !this.m_isOpen

        
    }
}
