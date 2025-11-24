import { _decorator, Sprite, log } from 'cc';
import { ViewPop } from '../../../Script/ViewManage/Foundation/ViewPop';
import CommonButton from '../../../Stark/Interactive/CommonButton';
import Touchable, { TouchableEvent } from '../../../Stark/Interactive/Touchable';
import { ResourceManager, CDNPathType } from '../../../Stark/ResourceLoader/ResourceManager';
const { ccclass, property } = _decorator;

enum ModeType {
    GIVE = 0,      //領取
    EXCHANGE = 1,  //兌換
    BOTH = 2       //領取和兌換
}

@ccclass('GodSend')
export class GodSend extends ViewPop {

    @property( {
        type: Sprite,
        displayName: "天降背景"
    })
    private m_background: Sprite = null;

    @property( {
        type: CommonButton,
        displayName: "領取"
    })
    private m_giveButton: CommonButton = null;

    @property( {
        type: CommonButton,
        displayName: "兌換"
    })
    private m_exchangeButton: CommonButton = null;

    protected OnAwake(reused: boolean): void {
        super.OnAwake?.(reused);

        // 使用新的 ResourceManager API 下載天降好禮背景圖
        ResourceManager.DownloadGodsendImage("ServantFight.png", this.m_background, (success: boolean, asset?: any, errorMsg?: string, sourceInfo?: { source: string; message: string; details: any }) => {
            if (success) {
                log("✅ 天降好禮背景載入成功");
                if (sourceInfo) {
                    log(`📊 資源來源: ${sourceInfo.message}`);
                }
            } else {
                log(`❌ 天降好禮背景載入失敗: ${errorMsg}`);
            }
        });


        this.Present();
    }

    start() {
        this.SetMode(ModeType.GIVE);
    }

    update(deltaTime: number) {
        
    }
    
    protected onEnable(): void {
        super.onEnable?.();

        this.m_giveButton.node.on(TouchableEvent.Clicked, this.OnGiveButtonClicked, this);
        this.m_exchangeButton.node.on(TouchableEvent.Clicked, this.OnExchangeButtonClicked, this);
    }

    protected onDisable(): void {
        super.onDisable?.();

        this.m_giveButton.node.off(TouchableEvent.Clicked, this.OnGiveButtonClicked, this);
        this.m_exchangeButton.node.off(TouchableEvent.Clicked, this.OnExchangeButtonClicked, this);
    }

    private OnGiveButtonClicked(): void {
        this.Dismiss();
    }

    private OnExchangeButtonClicked(): void {
        this.Dismiss();
    }

    private SetMode(mode: number){

        switch(mode){
            case ModeType.GIVE:
            {
                this.m_giveButton.node.active = true;
                this.m_exchangeButton.node.active = false;

                let pos = this.m_giveButton.node.position;
                this.m_giveButton.node.setPosition(0, pos.y, pos.z);
                break;
            }
            case ModeType.EXCHANGE:
            {
                this.m_giveButton.node.active = false;
                this.m_exchangeButton.node.active = true;

                let pos = this.m_exchangeButton.node.position;
                this.m_exchangeButton.node.setPosition(0, pos.y, pos.z);
                break;
            }

            case ModeType.BOTH:
            {
                this.m_giveButton.node.active = true;
                this.m_exchangeButton.node.active = true;
                break;
            }

        }

    }
    
}


