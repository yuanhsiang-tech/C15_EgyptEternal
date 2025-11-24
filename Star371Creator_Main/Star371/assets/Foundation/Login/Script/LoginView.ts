import { _decorator, Color, Component, EditBox, EventTouch, Graphics, Node, Sprite, UITransform, warn } from 'cc';
import { ViewDefine } from '../../../Script/Define/ViewDefine';
import { LoginVendor } from '../../../Script/SignIn/LoginVendor';
import CommonButton from '../../../Stark/Interactive/CommonButton';
import { ViewManager } from '../../../Script/ViewManage/ViewManager';
import { WebviewType } from '../../../Script/Feature/Webview/WebviewType';
import Touchable, { TouchableEvent } from '../../../Stark/Interactive/Touchable';
import { WebDomainType } from '../../../Script/Proto/gt2/userTypes/userTypes_pb';
const { ccclass, property } = _decorator;

enum PanelMode {
    BACK_TO_OPTION  = 0,
    GO_GT_LOGIN     = 1,
}

enum LoginMode {
    GUEST           = 0,
    GT              = 1,
    LINE            = 2,
    FB              = 3,
    GOOGLE          = 4,
    APPLE           = 5,
    YAHOO           = 6,
    WECHAT          = 7,
}

export interface LoginViewDelegate {
    OnLoginWithVendor(vendor:LoginVendor.IVendor);
}

@ccclass('LoginView')
export class LoginView extends Component {
    private m_delegate: LoginViewDelegate;

    @property({
        type: Node,
        displayName: "Login Form",
        group: "Login Form"
    })
    private m_loginFormNode: Node = null;

    @property({
        type: CommonButton,
        displayName: "Back Button",
        group: "Login Form"
    })
    private m_backButton: CommonButton = null;

    @property({
        type: CommonButton,
        displayName: "Forget Button",
        group: "Login Form"
    })
    private m_forgetButton: CommonButton = null;

    @property({
        type: EditBox,
        displayName: "Account",
        group: "Login Form"
    })
    private m_accountEditBox: EditBox = null;

    @property({
        type: EditBox,
        displayName: "Password",
        group: "Login Form"
    })
    private m_passwordEditBox: EditBox = null;

    @property({
        type: EditBox,
        displayName: "Verify Code",
        group: "Login Form"
    })
    private m_verifyCodeEditBox: EditBox = null;

    @property({
        type: Graphics,
        displayName: "Verify Code Sprite",
        group: "Login Form"
    })
    private m_verifyCodePic: Graphics = null;

    @property({
        type: CommonButton,
        displayName: "GT Register Button",
        group: "Login Form"
    })
    private m_gtRegisterButton: CommonButton = null;

    @property({
        type: CommonButton,
        displayName: "GT Login Button",
        group: "Login Form"
    })
    private m_gtLoginButton: CommonButton = null;

    @property({
        type: CommonButton,
        displayName: "LINE Button"
    })
    private m_lineButton: CommonButton = null;

    @property({
        type: CommonButton,
        displayName: "FB Button"
    })
    private m_fbButton: CommonButton = null;

    @property({
        type: CommonButton,
        displayName: "Google Button"
    })
    private m_googleButton: CommonButton = null;

    @property({
        type: CommonButton,
        displayName: "Apple Button"
    })
    private m_appleButton: CommonButton = null;

    @property({
        type: CommonButton,
        displayName: "Yahoo Button"
    })
    private m_yahooButton: CommonButton = null;

    @property({
        type: CommonButton,
        displayName: "WeChat Button"
    })
    private m_weChatButton: CommonButton = null;

    @property({
        type: CommonButton,
        displayName: "Report Button"
    })
    private m_reportButton: CommonButton = null;

    @property({
        type: CommonButton,
        displayName: "Privacy Policy Button"
    })
    private m_privacyPolicyButton: CommonButton = null;

    @property({
        type: CommonButton,
        displayName: "Terms of Service Button"
    })
    private m_termsOfServiceButton: CommonButton = null;

    @property({
        type: Node,
        displayName: "Login Option",
        group: "Login Option"
    })
    private m_loginOptionNode: Node = null;

    @property({
        type: CommonButton,
        displayName: "Guest Login Button",
        group: "Login Option"
    })
    private m_guestLoginButton: CommonButton = null;

    @property({
        type: CommonButton,
        displayName: "Go GT Login Button",
        group: "Login Option"
    })
    private m_goGtLoginButton: CommonButton = null;

    public set Delegate(deletage: LoginViewDelegate) {
        this.m_delegate = deletage;
    }

    public RefreshVerifyPic() {
        this.m_verifyCodePic.enabled = false;
    }

    public DidSetVerifyPic(): boolean {
        return this.m_verifyCodePic.enabled;
    }

    public SetVerifyPic(data:Uint8Array[]) {
        this.m_verifyCodePic.enabled = true
        this.DrawVerifyPic(this.m_verifyCodePic, data);
        this.m_verifyCodePic.node.setScale(2.3, 2.3, 1);
    }

    protected onLoad(): void {
        const gtVendor: LoginVendor.IVendor = LoginVendor.CreateVendor(WebDomainType.WEB_DOMAIN_GAMETOWER);
        this.m_accountEditBox.string = gtVendor.Account;
        this.m_passwordEditBox.string = gtVendor.Password;
    }

    protected onEnable(): void {
        super.onEnable?.();

        this.m_backButton.node.on(TouchableEvent.Clicked,            this.OnSwitchPanel, this);
        this.m_goGtLoginButton.node.on(TouchableEvent.Clicked,       this.OnSwitchPanel, this);

        this.m_lineButton.node.on(TouchableEvent.Clicked,            this.OnLogin, this);
        this.m_fbButton.node.on(TouchableEvent.Clicked,              this.OnLogin, this);
        this.m_googleButton.node.on(TouchableEvent.Clicked,          this.OnLogin, this);
        this.m_appleButton.node.on(TouchableEvent.Clicked,           this.OnLogin, this);
        this.m_yahooButton.node.on(TouchableEvent.Clicked,           this.OnLogin, this);
        this.m_weChatButton.node.on(TouchableEvent.Clicked,          this.OnLogin, this);
        this.m_guestLoginButton.node.on(TouchableEvent.Clicked,      this.OnLogin, this);
        this.m_gtLoginButton.node.on(TouchableEvent.Clicked,         this.OnLogin, this);

        this.m_forgetButton.node.on(TouchableEvent.Clicked,          this.OnForgetPassword, this);
        this.m_gtRegisterButton.node.on(TouchableEvent.Clicked,      this.OnRegisteGT, this);
        this.m_reportButton.node.on(TouchableEvent.Clicked,          this.OnReportBug, this);
        this.m_privacyPolicyButton.node.on(TouchableEvent.Clicked,   this.OnReviewPolicy, this);
        this.m_termsOfServiceButton.node.on(TouchableEvent.Clicked,  this.OnReviewPolicy, this);
    }

    protected onDisable(): void {
        this.m_backButton.node.off(TouchableEvent.Clicked,           this.OnSwitchPanel, this);
        this.m_goGtLoginButton.node.off(TouchableEvent.Clicked,      this.OnSwitchPanel, this);

        this.m_lineButton.node.off(TouchableEvent.Clicked,           this.OnLogin, this);
        this.m_fbButton.node.off(TouchableEvent.Clicked,             this.OnLogin, this);
        this.m_googleButton.node.off(TouchableEvent.Clicked,         this.OnLogin, this);
        this.m_appleButton.node.off(TouchableEvent.Clicked,          this.OnLogin, this);
        this.m_yahooButton.node.off(TouchableEvent.Clicked,          this.OnLogin, this);
        this.m_weChatButton.node.off(TouchableEvent.Clicked,         this.OnLogin, this);
        this.m_guestLoginButton.node.off(TouchableEvent.Clicked,     this.OnLogin, this);
        this.m_gtLoginButton.node.off(TouchableEvent.Clicked,        this.OnLogin, this);

        this.m_forgetButton.node.off(TouchableEvent.Clicked,         this.OnForgetPassword, this);
        this.m_gtRegisterButton.node.off(TouchableEvent.Clicked,     this.OnRegisteGT, this);
        this.m_reportButton.node.off(TouchableEvent.Clicked,         this.OnReportBug, this);
        this.m_privacyPolicyButton.node.off(TouchableEvent.Clicked,  this.OnReviewPolicy, this);
        this.m_termsOfServiceButton.node.off(TouchableEvent.Clicked, this.OnReviewPolicy, this);
    }

    private OnLogin(target: Touchable, event: EventTouch): void {
        let vendor: LoginVendor.IVendor = null;

        switch (target.Tag) {
            case LoginMode.GUEST: {
                vendor = LoginVendor.CreateVendor(WebDomainType.WEB_DOMAIN_AP);
                break;
            }
            case LoginMode.GT: {
                if (this.m_accountEditBox.string.length < 1 || this.m_passwordEditBox.string.length < 1) {
                    warn("GT 登入必須要有帳號密碼");
                    return;
                }
                vendor = LoginVendor.CreateVendor(WebDomainType.WEB_DOMAIN_GAMETOWER);
                vendor.SetPasscode(this.m_accountEditBox.string, this.m_passwordEditBox.string, this.m_verifyCodeEditBox.string);
                break;
            }
            case LoginMode.LINE: {
                break;
            }
            case LoginMode.FB: {
                break;
            }
            case LoginMode.GOOGLE: {
                break;
            }
            case LoginMode.APPLE: {
                break;
            }
            case LoginMode.YAHOO: {
                break;
            }
            case LoginMode.WECHAT: {
                break;
            }
        }

        vendor && this.m_delegate.OnLoginWithVendor(vendor);
    }

    private OnSwitchPanel(target: Touchable, event: EventTouch): void {
        const activeForm:boolean = target.Tag == PanelMode.GO_GT_LOGIN;
        this.m_loginFormNode.active = activeForm;
        this.m_loginOptionNode.active = !activeForm;
    }

    private OnForgetPassword(target: Touchable, event: EventTouch): void {
    }

    private OnRegisteGT(target: Touchable, event: EventTouch): void {
    }

    private OnReportBug(target: Touchable, event: EventTouch): void {
        ViewManager.Open(ViewDefine.WEBVIEW, WebviewType.CUSTOM.Maximize().Landscape(), "https://www.gametower.com.tw/Games/FreePlay/Mj/star31/InGame/ibig2/data/menu.aspx");
    }

    private OnReviewPolicy(target: Touchable, event: EventTouch): void {
        ViewManager.Alert("test123");
    }

    private DrawVerifyPic(graphic:Graphics, picData:Uint8Array[]) {
        const PIC_WIDTH:number  = 16;
        const PIC_HEIGHT:number = 24;
        const ENCODE_NUM:number = 4;

        const width:number = PIC_WIDTH * ENCODE_NUM;
        const height:number = PIC_HEIGHT;

        // 設定尺寸
        graphic.node.getComponent(UITransform).setContentSize(width, height);

        // 畫每個數字
        for (let m = 0; m < ENCODE_NUM; m++) {
            const offsetX = m * PIC_WIDTH;
            for (let y = 0; y < PIC_HEIGHT; y++) {
                for (let x = 0; x < PIC_WIDTH; x++) {
                    const val:number = picData[m][y * PIC_WIDTH + x];
                    const color: Color = val == 255 ? Color.BLACK : val == 254 ? Color.WHITE : Color.GRAY;
                    graphic.fillColor = color;
                    graphic.fillRect(offsetX + x, PIC_HEIGHT-y, 1, 1);
                }
            }
        }
    }
}


