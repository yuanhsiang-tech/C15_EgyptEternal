import { _decorator, Component, js, Label, Node, ProgressBar, Sprite, SpriteFrame, isValid, CCObject, tween, UIOpacity, TweenSystem, easing, Tween } from 'cc';
import { GameIconDefine } from './GameIconDefine';
import { GameIconSource } from './GameIconSource';
import { Bundle } from '../../../../Script/Bundle/Bundle';
import { GameId } from '../../../../Script/Define/GameDefine';
import { EventDefine } from '../../../../Script/Define/EventDefine';
import { Resource } from '../../../../Script/Define/ResourceDefine';
import CommonButton from '../../../../Stark/Interactive/CommonButton';
import { TouchableEvent } from '../../../../Stark/Interactive/Touchable';
import { EventDispatcher } from '../../../../Stark/Utility/EventDispatcher';
const { ccclass, property } = _decorator;

// icon 名稱格式(如：2310_t0_s、2303_t0_s1...等)
const ICON_NAME_FORMAT:string = '%s_t%s_%s';

// 載入提示的透明度
const LOADING_OPACITY:number = 150;
// 顯示載入提示延遲時間(單位：秒)   
const SHOW_INDICATOR_DELAY:number = 0.5;

// 隱藏透明度
const OPACITY_HIDE:number = 0;
// 顯示透明度
const OPACITY_SHOW:number = 255;
// 透明度變化時間(單位：秒)
const OPACITY_DURATION:number = 0.5;

@ccclass('GameIcon')
export class GameIcon extends Component {
    private m_source:GameIconSource;
    private m_button:CommonButton;
    private m_iconSprites:Sprite[];
    private m_iconOpacity:UIOpacity;
    private m_tween:Tween<UIOpacity>;

    @property({
        type: Node,
        displayName: 'BG',
        group: 'General'
    })
    private m_bg:Node = null;

    @property({
        type: ProgressBar,
        displayName: 'Icon Progress',
        group: 'General'
    })
    private m_iconProgress:ProgressBar = null;

    @property({
        type: Node,
        displayName: 'Loading',
        group: 'General'
    })
    private m_loading:Node = null;

    @property({
        type: Label,
        displayName: 'Debug Label',
        group: 'General'
    })
    private m_debugLabel:Label = null;

    @property({
        type: Node,
        displayName: 'Shiny Card',
        group: 'Condition'
    })
    private m_shinyCard:Node = null;

    @property({
        type: Node,
        displayName: 'Download',
        group: 'Condition'
    })
    private m_download:Node = null;

    @property({
        type: Label,
        displayName: 'Jackpot',
        group: 'Condition'
    })
    private m_jackpot:Label = null;

    public get Type(): GameIconDefine.Type { return this.m_source.Type; }

    public Setup(source:GameIconSource) {
        this.m_source = source;
    }

    protected onLoad(): void {
        this.m_button = this.getComponent(CommonButton);
        this.m_iconSprites = this.m_iconProgress.getComponentsInChildren(Sprite);
        this.m_iconOpacity = this.m_iconProgress.getComponent(UIOpacity);
        this.m_loading.getComponent(UIOpacity).opacity = LOADING_OPACITY;

        tween(this.m_loading)
            .to( 1.5, { angle: -360 })
            .set({ angle: 0 })
            .union()
            .repeatForever()
            .start();
    }

    protected onEnable(): void {
        this.m_loading.active = false;
        this.LoadIcon(false);
        this.SetupDebugLabel();
        this.m_button.On(TouchableEvent.Clicked, this.OnClick, this);
    }

    protected onDisable(): void {
        this.m_source = null;
        this.m_button.Off(TouchableEvent.Clicked, this.OnClick, this);
        this.m_tween?.stop();
    }

    private OnClick() {
        EventDispatcher.Shared.Dispatch(EventDefine.System.GAME_ICON_CLICK, this.m_source);
    }

    private SetupDebugLabel() {
        this.m_debugLabel.node.active = true;
        this.m_debugLabel.string = this.m_source.GameId != GameId.UNDEF ? this.m_source.GameId.toString() : this.m_source.Res;
    }

    /**
     * 載入遊戲 icon
     * @param force 
     */
    public LoadIcon(force:boolean=true) {
        const gameId:number = this.m_source.GameId;
        const themeType:number = this.m_source.ThemeType;
        const iconScale:number = GameIconDefine.IconScale[themeType]?.[this.m_source.Type] || 1.0;
        const symbol:string = GameIconDefine.Type[this.m_source.Type][0].toLowerCase();
        const iconName:string = gameId != GameId.UNDEF ? js.formatStr(ICON_NAME_FORMAT, gameId, themeType, `${symbol}${this.m_source.Res}`) : this.m_source.Res;
        const iconPath:string = js.formatStr(Resource.Img.GameIcon, iconName);
        const asset:SpriteFrame = Bundle.Resources.Get(iconPath, SpriteFrame);

        this.m_bg.active = true;
        this.m_iconSprites.forEach(s=>s.spriteFrame=null);
        this.m_iconOpacity.opacity = OPACITY_HIDE;
        
        this.m_tween?.stop();
        TweenSystem.instance.ActionManager.removeAllActionsFromTarget(this.node);

        if (asset) {
            this.m_loading.active = false;
            this.m_bg.active = false;
            this.m_iconOpacity.opacity = OPACITY_SHOW;
            this.m_iconSprites.forEach(s=>s.spriteFrame=asset);
            this.m_iconSprites[0].node.setScale(iconScale, iconScale, 1.0);
        } else {
            this.ShowIndicators();

            force && Bundle.Resources.Load(iconPath, SpriteFrame, (err:Error, spriteFrame:SpriteFrame)=>{
                if (!err &&
                    isValid(this) && 
                    this.node.activeInHierarchy && 
                    this.m_source && 
                    spriteFrame.name.indexOf(iconName) >= 0) {
                    this.m_iconSprites.forEach(s=>s.spriteFrame=spriteFrame);
                    this.m_iconSprites[0].node.setScale(iconScale, iconScale, 1.0);

                    TweenSystem.instance.ActionManager.removeAllActionsFromTarget(this.node);
                    if (this.m_tween) {
                        this.m_tween.start();
                    } else {
                        this.m_tween = 
                            tween(this.m_iconOpacity)
                                .to(OPACITY_DURATION, { opacity: OPACITY_SHOW }, { easing: easing.circOut })
                                .call(()=>{
                                    this.m_loading.active = false;
                                    this.m_bg.active = false;
                                })
                                .start();
                    }
                }
            });
        }
    }

    /**
     * 顯示載入提示
     */
    private ShowIndicators() {
        TweenSystem.instance.ActionManager.removeAllActionsFromTarget(this.node);
        tween(this.node)
            .delay(SHOW_INDICATOR_DELAY)
            .call(()=>{ 
                isValid(this, true) && (this.m_loading.active = true); 
            })
            .start();
    }
}