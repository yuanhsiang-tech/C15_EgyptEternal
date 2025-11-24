import { _decorator, log, error } from 'cc'
import Stage from '../../../Script/Stage/Stage'
import { GameApp } from '../../../Script/App/GameApp'
import { Device } from '../../../Script/Device/Device'
import { GameId } from '../../../Script/Define/GameDefine'
import { LoginView, LoginViewDelegate } from './LoginView'
import FiniteState from '../../../Stark/Utility/FiniteState'
import { StageId } from '../../../Script/Define/StageDefine'
import { LoginVendor } from '../../../Script/SignIn/LoginVendor'
import { DeviceChecker } from '../../../Script/Device/DeviceChecker'
import { ViewManager } from '../../../Script/ViewManage/ViewManager'
import { AlphaLoading } from '../../../Script/Loading/AlphaLoadingView'
import { Connection } from '../../../Script/Service/Foundation/Connection'
import { VerifyCodeService } from '../../../Script/Service/VerifyCodeService'
import { WebDomainType } from '../../../Script/Proto/gt2/userTypes/userTypes_pb'
import { LoginAckData, PERMISSION_TYPE } from '../../../Script/Proto/service/login/login_pb'
import { BackKickedResult, ConnectionResult } from '../../../Script/Proto/service/appLife/appLife_pb'

const { ccclass } = _decorator

// 暫時跳過登入流程
const TEST_SKIP_LOGIN: boolean = false

// 階段等待逾時時間(單位：秒)
const STATE_TIMEOUT_TIME: number = 10 * 1000

enum State {
    NONE                            = 0,

    // 裝置識別碼初始化
    CHECK_DEVICE_ID                 = 1,

    // 等待玩家操作
    WAIT_PLAYER                     = 11,

    // 第三方 SDK 階段
    WAIT_SDK_AUTHENTICATE           = 21,
    WAIT_SDK_FAIL                   = 22,
    WAIT_SDK_TIMEOUT                = 23,

    // LC 階段
    WAIT_LC                         = 31,
    WAIT_LC_FAIL                    = 32,
    WAIT_LC_TIMEOUT                 = 33,

    // Login 階段
    WAIT_LOGIN                      = 41,
    LOGIN_FAIL                      = 42,
    LOGIN_TIMEOUT                   = 43,

    // 等待玩家資訊
    WAIT_USER_INFO                  = 51,
    WAIT_USER_INFO_NEED_KICK        = 52,
    WAIT_USER_INFO_KICK_FAIL        = 53,
    WAIT_USER_INFO_FAIL             = 54,
    WAIT_USER_INFO_FATAL_ERROR      = 55,
    WAIT_USER_INFO_TIMEOUT          = 56,

    // 登入完成
    LOGIN_FINISH                    = 61
}

@ccclass('LoginStage')
export class LoginStage extends Stage {
    private m_state: FiniteState<State>
    private m_vendor: LoginVendor.IVendor
    private m_tmpVendor: LoginVendor.IVendor
    private m_connection: Connection
    private m_loginView: LoginView
    private m_verifyService: VerifyCodeService

    protected override onLoad(): void {
        super.onLoad?.();

        this.m_loginView = this.getComponent(LoginView);
        this.m_loginView.Delegate = {
            OnLoginWithVendor: this.OnLoginWithVendor.bind(this)
        } as LoginViewDelegate

        this.m_connection = GameApp.Shared.Connection
        this.m_state = new FiniteState(State.CHECK_DEVICE_ID, STATE_TIMEOUT_TIME)
        this.m_verifyService = VerifyCodeService.Instance
    }

    protected update(dt: number): void {
        super.update?.(dt);

        switch (this.m_state.Tick()) {
//#region 裝置識別碼初始化 ====================================================================================================
            case State.CHECK_DEVICE_ID: {
                if (DeviceChecker.Check()) {
                    // [註冊完成]
                    this.m_state.Transit(State.WAIT_PLAYER);
                } else if (this.m_state.IsEntering) {
                    // [尚未註冊] => 開始註冊處理
                    DeviceChecker.Regist();
                } else if (this.m_state.IsTimeout) {
                    // [註冊處理逾時]
                    if (this.m_state.Prev != State.WAIT_PLAYER) {
                        // [開啟 app 自動執行註冊，但註冊等待逾時] => 直接進入玩家操作階段，等待之後按下登入後的註冊處理
                        this.m_state.Transit(State.WAIT_PLAYER);
                    } else {
                        // [玩家按下登入後發現沒有註冊過，但註冊等待逾時]
                        this.m_tmpVendor = null;
                        this.PresetFail(State.WAIT_PLAYER, 0, true);
                    }
                }

                break;
            }
//#endregion

//#region 等待玩家操作 =======================================================================================================
            case State.WAIT_PLAYER: {
                if (this.m_state.IsEntering) {
                    this.Reset();
                    this.m_verifyService.FetchPic();
                }

                // 設定驗證碼圖片
                if (!this.m_loginView.DidSetVerifyPic() && this.m_verifyService.GetPic()) {
                    this.m_loginView.SetVerifyPic(this.m_verifyService.GetPic());
                }

                if (this.m_vendor) {
                    AlphaLoading.Instance.Show();
                    if (!Device.Current.HasNetwork()) {
                        // [沒有網路] => 跳提示並等待重新選擇
                        this.PresetFail(State.WAIT_PLAYER, 0, true);
                    } else if (this.m_vendor.NeedDeviceId && !DeviceChecker.Check()) {
                        // [需要裝置識別碼但裝置識別碼尚未註冊完成] => 重新回到裝置識別碼初始化階段
                        this.m_tmpVendor = this.m_vendor;
                        this.m_state.Transit(State.CHECK_DEVICE_ID, STATE_TIMEOUT_TIME);
                    } else if (this.m_vendor.AutoLogin && this.m_vendor.ValidatePasscode()) {
                        // [有開啟自動登入且有有效的登入密鑰]
                        // ＊這裡不加上 Timeout 時間，改由檢查連線狀態來決定是否逾時
                        this.m_state.Transit(State.WAIT_LOGIN);
                    } else {
                        // [等待第三方 SDK 登入]
                        this.m_state.Transit(State.WAIT_SDK_AUTHENTICATE);
                    }
                }

                break;
            }
//#endregion

//#region 第三方 SDK 階段 ====================================================================================================
            case State.WAIT_SDK_AUTHENTICATE: {
                if (this.m_state.IsEntering) {
                    this.m_vendor.SdkAuthenticate()
                } 

                switch (this.m_vendor.SdkAuthResult()) {
                    case LoginVendor.SdkAuthResult.SUCCESS: {
                        this.m_state.Transit(State.WAIT_LC, STATE_TIMEOUT_TIME);
                        break;
                    }
                    case LoginVendor.SdkAuthResult.FAIL: {
                        this.m_state.Transit(State.WAIT_SDK_FAIL);
                        break;
                    }
                    case LoginVendor.SdkAuthResult.CANCEL: {
                        this.m_state.Transit(State.WAIT_PLAYER);
                        break;
                    }
                    default: {
                        this.m_state.IsTimeout && this.m_state.Transit(State.WAIT_SDK_TIMEOUT);
                        break;
                    }
                }

                break;
            }
            case State.WAIT_SDK_TIMEOUT: {
                if (this.m_state.IsEntering) {
                    this.PresetFail(State.WAIT_PLAYER);
                }

                break;
            }
            case State.WAIT_SDK_FAIL: {
                if (this.m_state.IsEntering) {
                    this.PresetFail(State.WAIT_PLAYER);
                }

                break;
            }
//#endregion

//#region LC 階段 ==========================================================================================================
            case State.WAIT_LC: {
                if (this.m_state.IsEntering) {
                    this.m_vendor.RequestLC();
                }
                if (this.m_state.IsTimeout) {
                    this.m_state.Transit(State.WAIT_LC_TIMEOUT);
                } else if (this.m_vendor.IsViolationLC()) {
                    this.m_state.Transit(State.WAIT_LC_FAIL);
                } else if (this.m_vendor.ValidateLC()) {
                    // ＊這裡不加上 Timeout 時間，改由檢查連線狀態來決定是否逾時
                    this.m_state.Transit(State.WAIT_LOGIN);
                }

                break;
            }
            case State.WAIT_LC_TIMEOUT: {
                if (this.m_state.IsEntering) {
                    this.PresetFail(State.WAIT_PLAYER);
                }

                break;
            }
            case State.WAIT_LC_FAIL: {
                if (this.m_state.IsEntering) {
                    this.PresetFail(State.WAIT_PLAYER);
                }

                break;
            }
//#endregion

//#region Login 階段 =======================================================================================================
            case State.WAIT_LOGIN: {
                if (this.m_state.IsEntering && (this.m_vendor.ValidatePasscode() || this.m_vendor.ValidateLC())) {
                    log("LC 取得完成，跟 LoginServer 做登入", WebDomainType[this.m_vendor.Type], this.m_vendor.Account, this.m_vendor.Password, this.m_vendor.VerifyCode);
                    this.m_connection.Login(this.m_vendor);
                }

                const ackData: LoginAckData = this.m_connection.GetLoginAckData();
                const permission: PERMISSION_TYPE = ackData ? ackData.permission : PERMISSION_TYPE.NOT_READY;

                if (TEST_SKIP_LOGIN) {
                    // [測試] => 直接跳過登入
                    GameApp.Shared.StageManager.Replace(StageId.LOBBY);
                } else if (permission > PERMISSION_TYPE.OK) {
                    // [登入失敗] => 收到失敗回應
                    this.m_state.Transit(State.LOGIN_FAIL);
                } else if (this.m_connection.IsConnectionClosed()) {
                    // [連線關閉] => Retry 到上限沒收到回應 => 相當於逾時
                    this.m_state.Transit(State.LOGIN_TIMEOUT);
                } else if (permission === PERMISSION_TYPE.OK) {
                    // [登入成功]
                    this.m_state.Transit(State.WAIT_USER_INFO);
                } 

                break;
            }
            case State.LOGIN_FAIL: {
                if (this.m_state.IsEntering) {
                    this.PresetFail(State.WAIT_PLAYER);
                }
                break;
            }
            case State.LOGIN_TIMEOUT: {
                if (this.m_state.IsEntering) {
                    this.PresetFail(State.WAIT_PLAYER);
                }

                break;
            }
//#endregion

//#region 等待玩家資料=======================================================================================================
            case State.WAIT_USER_INFO: {
                if (this.m_connection.GetSocketError()) {
                    // [發生連線上的致命錯誤]
                    this.m_state.Transit(State.WAIT_USER_INFO_FATAL_ERROR);
                } else if (this.m_connection.ReplyKickDecision) {
                    // [回應後踢前] => 不處理事情，只做等待
                } else if (this.m_connection.NeedUserConfirmKick) {
                    // [需要玩家做後踢前抉擇]
                    this.m_state.Transit(State.WAIT_USER_INFO_NEED_KICK);
                } else if (this.m_connection.GetKickResult() == BackKickedResult.BK_USER_NOT_FOUND) {
                    // [後踢前失敗]
                    this.m_state.Transit(State.WAIT_USER_INFO_KICK_FAIL);
                } else if (this.m_connection.GetConnectResult() > ConnectionResult.SUCCESS) {
                    // [登入失敗] => 收到失敗回應
                    this.m_state.Transit(State.WAIT_USER_INFO_FAIL);
                } else if (this.m_connection.IsConnectionClosed()) {
                    // [連線關閉] => Retry 到上限沒收到回應 => 相當於逾時
                    this.m_state.Transit(State.WAIT_USER_INFO_TIMEOUT);
                } else if (this.m_connection.IsConnected()) {
                    // [登入完成]
                    this.m_state.Transit(State.LOGIN_FINISH);
                }

                break;
            }
            case State.WAIT_USER_INFO_NEED_KICK: {
                if (this.m_state.IsEntering) {
                    ViewManager.Alert(`是否要執行後踢前處理？`)
                        .ActionPositive(()=>{
                            this.m_connection.DecideToKick(true);
                            this.m_state.Transit(State.WAIT_USER_INFO);
                        })
                        .ActionNegative(()=>{
                            this.m_connection.DecideToKick(false);
                            this.m_state.Transit(State.WAIT_PLAYER);
                        })
                }
                break;
            }
            case State.WAIT_USER_INFO_KICK_FAIL: {
                if (this.m_state.IsEntering) {
                    this.PresetFail(State.WAIT_PLAYER)
                }
                break;
            }
            case State.WAIT_USER_INFO_FAIL: {
                if (this.m_state.IsEntering) {
                    this.PresetFail(State.WAIT_PLAYER)
                }
                break;
            }
            case State.WAIT_USER_INFO_FATAL_ERROR: {
                if (this.m_state.IsEntering) {
                    this.PresetFail(State.WAIT_PLAYER)
                }
                break;
            }
            case State.WAIT_USER_INFO_TIMEOUT: {
                if (this.m_state.IsEntering) {
                    this.PresetFail(State.WAIT_PLAYER)
                }
                break;
            }
//#endregion

            case State.LOGIN_FINISH: {
                if (this.m_state.IsEntering) {
                    GameApp.Shared.StageManager.Replace(StageId.LOBBY);
                }
            }
        }
    }

    /**
     * 即將開始載入 Stage
     */
    public override WillBeginTransition(stageId:StageId|GameId): void {
        super.WillBeginTransition(stageId);
        AlphaLoading.Instance.Hide();
    }

    /**
     * 顯示失敗訊息
     * @param nextState 視窗關閉後前往的 State
     * @param timeout 目標 State 停等逾時時間
     */
    private PresetFail(nextState:State, timeout:number=0, immediately:boolean=false) {
        let message:string;
        let code:number;

        switch (this.m_state.Current) {
            case State.CHECK_DEVICE_ID: {
                error("[登入失敗] 裝置註冊逾時");
                message = "裝置註冊逾時，請確認網路狀態後重新嘗試";
                break;
            }
            case State.WAIT_PLAYER: {
                error("[登入失敗] 沒有網路");
                message = "沒有網路，請確認網路狀態後重新嘗試";
                break;
            }
            case State.WAIT_SDK_TIMEOUT: {
                error("[登入失敗] 等候 SDK 授權逾時");
                message = "等候 SDK 授權逾時，請確認網路狀態後重新嘗試"
                break;
            }
            case State.WAIT_SDK_FAIL: {
                error("[登入失敗] SDK 授權失敗");
                message = "SDK 授權失敗，請確認網路狀態後重新嘗試";
                break;
            }
            case State.WAIT_LC_TIMEOUT: {
                error("[登入失敗] 等候 LC 逾時");
                message = "等候 LC 逾時，請確認網路狀態後重新嘗試";
                break;
            }
            case State.WAIT_LC_FAIL: {
                error("[登入失敗] LC 取得失敗");
                message = "LC 取得失敗，請確認網路狀態後重新嘗試";
                break;
            }
            case State.LOGIN_FAIL: {
                const ackData: LoginAckData = this.m_connection.GetLoginAckData();
                const permission:PERMISSION_TYPE = ackData.permission;
                error(`[登入失敗] 登入失敗：${permission}, PERMISSION_TYPE.${PERMISSION_TYPE[permission]}`)
                message = `登入失敗\n請確認網路狀態後重新嘗試`;
                code = permission;
                break;
            }
            case State.LOGIN_TIMEOUT: {
                error("[登入失敗] 登入逾時");
                message = "登入逾時，請確認網路狀態後重新嘗試";
                break;
            }
            case State.WAIT_USER_INFO_KICK_FAIL: {
                error("[登入失敗] 後踢前失敗");
                message = "後踢前失敗";
                break;
            }
            case State.WAIT_USER_INFO_FAIL: {
                const result:ConnectionResult = this.m_connection.GetConnectResult();
                error(`[登入失敗] 玩家資料取得失敗：${result}, AppLife.ConnectionResult.${ConnectionResult[result]}`);
                message = "玩家資料取得失敗";
                code = result;
                break;
            }
            case State.WAIT_USER_INFO_FATAL_ERROR: {
                error("[登入失敗] 連線嚴重錯誤");
                message = "線嚴重錯誤";
                break;
            }
            case State.WAIT_USER_INFO_TIMEOUT: {
                error("[登入失敗] 玩家資料等待逾時");
                message = "玩家資料等待逾時";
                break;
            }
        }

        immediately && this.m_state.Transit(nextState, timeout);
        AlphaLoading.Instance.Hide();

        if (message != null) {
            message = `${message}\n(${this.m_state.Current}${code!=null ? `:${code}` : ""})`
            ViewManager.Alert(message)
                .ActionPositive(() => {
                    !immediately && this.m_state.Transit(nextState, timeout);
                });
        }
    }

    /**
     * 介面端通知選擇的登入方式
     * @param vendor 登入廠商
     */
    private OnLoginWithVendor(vendor: LoginVendor.IVendor) {
        if (vendor && !this.m_vendor) {
            this.m_vendor = vendor;
        }
    }

    /**
     * 重置登入資訊
     */
    private Reset() {
        this.m_vendor?.ClearData();
        this.m_vendor = this.m_tmpVendor;
        this.m_tmpVendor = null;
        this.m_connection.Reset();
        this.m_loginView.RefreshVerifyPic();
    }
}
