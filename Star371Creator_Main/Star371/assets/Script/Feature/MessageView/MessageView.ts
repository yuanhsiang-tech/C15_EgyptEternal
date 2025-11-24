import { _decorator, Label, TweenSystem, tween, director, Director, Sprite } from 'cc';
import { MessageViewTypes as MVT } from './MessageViewTypes';
import { ViewPop } from '../../ViewManage/Foundation/ViewPop';
import CommonButton from '../../../Stark/Interactive/CommonButton';
import { TouchableEvent } from '../../../Stark/Interactive/Touchable';

const { ccclass, property } = _decorator;

interface __private_Config {
    readonly ActionMap:Map<MVT.Action, MVT.Button>;
    readonly Style:MVT.Style;
    readonly NavigateRevearse:boolean;
    Dispose();
}

function GetButtonTextConfirm():string {
    return "確定";
}

function GetButtonTextCancel():string {
    return "取消";
}

function GetButtonTextYes():string {
    return "是";
}

function GetButtonTextNo():string {
    return "否";
}

@ccclass('MessageView')
export class MessageView extends ViewPop
{
    @property({
        type: Label,
        tooltip: "文字內容",
        displayName: "Content"
    })
    private m_content: Label = null;

    @property({
        type: CommonButton,
        tooltip: "正向(確認、是)按鈕",
        displayName: "Positive Button"
    })
    private m_btnPositive: CommonButton = null;

    @property({
        type: CommonButton,
        tooltip: "負向(取消、否)按鈕",
        displayName: "Negative Button"
    })
    private m_btnNegative: CommonButton = null;

    private m_message:string;
    private m_config:__private_Config;
    private m_positiveLabel:Label;
    private m_negativeLabel:Label;

    protected LaunchOption(message:string, config:__private_Config) {
        this.m_message = message;
        this.m_config = config;
    }

    protected onLoad(): void {
        super.onLoad?.();
        this.m_positiveLabel = this.m_btnPositive.getComponentInChildren(Label);
        this.m_negativeLabel = this.m_btnNegative.getComponentInChildren(Label);

        for (let sprite of this.getComponentsInChildren(Sprite)) {
            sprite.spriteFrame.addRef();
            sprite.spriteFrame.texture.addRef();
        }
    }

    protected onEnable(): void {
        super.onEnable?.();
        this.m_btnPositive.On(TouchableEvent.Clicked, this.OnPositive, this);
        this.m_btnNegative.On(TouchableEvent.Clicked, this.OnNegative, this);
    }

    protected onDisable(): void {
        super.onDisable?.();
        this.m_btnPositive.Off(TouchableEvent.Clicked, this.OnPositive, this);
        this.m_btnNegative.Off(TouchableEvent.Clicked, this.OnNegative, this);
    }

    protected OnAwake(reused: boolean) {
        super.OnAwake?.(reused);

        this.m_btnNegative.node.active = false;
        this.m_btnPositive.node.active = true;
        this.m_content.string = this.m_message;

        {
            const negative:MVT.Button = this.m_config?.ActionMap.get(MVT.Action.NEGATIVE);
            const text:string = negative?.Title != null ? negative.Title : this.m_config?.Style == MVT.Style.CONFIRM_CANCEL ? GetButtonTextCancel() : GetButtonTextNo();
            this.m_negativeLabel.string = text;
            if (negative) {
                this.m_btnNegative.node.active = true;
                this.CountDown(this.m_btnNegative, this.m_negativeLabel, text, negative.CountDown, negative.CountHandler);
            }
        }

        {
            const positive:MVT.Button = this.m_config?.ActionMap.get(MVT.Action.POSITIVE);
            const text:string = positive?.Title != null ? positive.Title : this.m_config?.Style == MVT.Style.CONFIRM_CANCEL ? GetButtonTextConfirm() : GetButtonTextYes();
            this.m_positiveLabel.string = text;
            if (positive) {
                this.CountDown(this.m_btnPositive, this.m_positiveLabel, text, positive.CountDown, positive.CountHandler);
            }
        }

        this.Present();
    }

    protected OnPositive(): void {
        this.OnClick(MVT.Action.POSITIVE);
    }

    protected OnNegative(): void {
        this.OnClick(MVT.Action.NEGATIVE);
    }

    protected OnNavigateBack(): boolean {
        const hasNegative:boolean = !!this.m_config?.ActionMap.get(MVT.Action.NEGATIVE);
        const hasPositive:boolean = !!this.m_config?.ActionMap.get(MVT.Action.POSITIVE);

        if (hasNegative && hasPositive) {
            // [有確認也有取消]
            this.m_config?.NavigateRevearse ? this.OnPositive() : this.OnNegative();
        } else {
            // [保底執行確認]
            this.OnPositive();
        }
        
        return false;
    }

    protected ShouldAnimMinimize(): boolean {
        return false;
    }

    private OnClick(action:MVT.Action): void {
        TweenSystem.instance.ActionManager.removeAllActionsFromTarget(this.m_btnNegative.node);
        TweenSystem.instance.ActionManager.removeAllActionsFromTarget(this.m_btnPositive.node);
        this.Dismiss();
        director.once(Director.EVENT_AFTER_UPDATE, ()=>{
            this.m_config?.ActionMap.get(action)?.Handler?.();
            this.m_config?.Dispose();
        });
    }

    private CountDown(button:CommonButton, label:Label, text:string, countDown:number, handler:(countDown:number)=>void): void {
        if (countDown > 0) {
            button.TouchEnabled = false;
            handler?.(countDown);
            tween(button.node)
                .sequence(
                    tween().call(()=>{
                        label.string = text + (countDown > 0 ? `(${countDown})` : "")
                    }),
                    tween().delay(1),
                    tween().call(()=>{
                        countDown--;
                        handler?.(countDown);
                        if (countDown <= 0) {
                            TweenSystem.instance.ActionManager.removeAllActionsFromTarget(button.node);
                            button.TouchEnabled = true;
                        }
                    })
                )
                .repeatForever()
                .start();
        }
    }
}