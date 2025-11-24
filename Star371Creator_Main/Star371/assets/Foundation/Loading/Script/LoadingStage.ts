import { _decorator, EventTouch, Label, log, } from 'cc'
import Stage from '../../../Script/Stage/Stage'
import { GameApp } from '../../../Script/App/GameApp'
import { StageId } from '../../../Script/Define/StageDefine'
import Touchable, { TouchableEvent } from '../../../Stark/Interactive/Touchable'
import AudioManager from '../../../Script/Audio/Foundation/AudioManager'
import { BundleDefine } from '../../../Script/Define/BundleDefine'
import { Resource } from '../../../Script/Define/ResourceDefine'
import { EnvConfig } from '../../../Script/Define/ConfigDefine'
import { ServerTimeCore } from 'db://assets/Script/Time/ServerTimeCore'
import { TimeManager } from 'db://assets/Script/Time/TimeManager'
const { ccclass, property } = _decorator

@ccclass('LoadingStage')
export class LoadingStage extends Stage {
    @property({
        type: Label,
        displayName: "左下提示"
    })
    private m_reminds: Label = null

    @property({
        type: Touchable,
        displayName: "觸控區域"
    })
    private m_button: Touchable = null

    onLoad() {
        super.onLoad?.();
        AudioManager.Instance.LoadAssets(
            BundleDefine.Default.RESOURCES,
            Resource.Sound,
            {
                autoRelease: false,
                gamePausable: false,
                loadedCallback: (err, loadedRes) => {
                    AudioManager.Instance.PlaySceneBGM(Resource.Sound.THEME)
                },
            }
        )
        this.SetDeviceTip("onLoad")

        let connection = GameApp.Shared.Connection
        connection.Init(EnvConfig.Config.ENTRY_URL)

        // 初始化 TimeManager
        ServerTimeCore.Instance.InitializePlatformServiceDelegate()
        TimeManager.Instance.InitializeServerTimeSync()
    }

    start() {
        super.start?.();
        this.SetDeviceTip("start")
        GameApp.Shared.StageManager.Replace(StageId.LOGIN);

        this.m_button.On(TouchableEvent.Clicked, this.OnTestButtonClicked, this)
    }

    private OnTestButtonClicked(sender: Touchable, event: EventTouch): void {
        log("OnTestButtonClicked")
        this.LuaErrorTest()
    }

    private LoginTest() {
    }

    private LuaErrorTest() {
    }

    SetDeviceTip(tip: string): void {
        this.m_reminds.string = tip
    }
}
