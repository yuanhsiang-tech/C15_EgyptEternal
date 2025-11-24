import { _decorator, isValid, Enum, Component, Label, RichText } from "cc";
import { LocaleText } from "../../Locale/LocaleText";
import { LocaleMacro } from "../../Locale/LocaleMacro";
import { LazyUpdating } from "db://assets/Stark/Utility/LazyUpdating";
import { LocaleDefine } from "../../Locale/LocaleDefine";

const { ccclass, property} = _decorator;

export enum LocaleLabelMode
{
    NORMAL,
    FORMAT,
}

const PARAMETER_PATTERN = /%%[\w@]*%%/gi;

@ccclass
export default class LocaleLabel extends Component {

    //----------------------------------------------------------------

    @property({
        type: Enum(LocaleLabelMode),
        displayName: "Mode",
        tooltip: "多語系的設定模式",
    })
    private m_mode: LocaleLabelMode = LocaleLabelMode.NORMAL;

    @property({
        displayName: "Json key",
        tooltip: "用來向多語系取值的Key",
        visible: function() { return this.m_mode == LocaleLabelMode.NORMAL; }
    })
    private m_key: string = "";

    @property({
        displayName: "GroupName",
        tooltip: "給 LocaleText 用的 GroupName",
    })
    private m_groupName: string = LocaleDefine.Group.DEFAULT;

    @property({
        displayName: "Default String",
        tooltip: "預設的字串",
        visible: function() { return this.m_mode == LocaleLabelMode.NORMAL; }
    })
    private m_defaultString: string = "";

    @property({
        displayName: "Format String",
        tooltip: "格式化字串，詳見 FormatString 的說明",
        visible: function() { return this.m_mode == LocaleLabelMode.FORMAT; }
    })
    private m_formatString: string = "";

    //----------------------------------------------------------------
    /** 取得模式 */
    public get Mode(): LocaleLabelMode { return this.m_mode; }
    public set Mode(value: LocaleLabelMode) {
        if (this.m_mode !== value) {
            this.m_mode = value;
            this.Reload();
        }
    }

    //----------------------------------------------------------------
    /** StringKey，只有在 Mode 為 NORMAL 時有效 */
    public get Key(): string { return this.m_key; }
    public set Key(value: string) {
        if (this.m_key !== value) {
            this.m_key = value;
            if (this.m_mode == LocaleLabelMode.NORMAL) {
                this.Reload();
            }
        }
    }

    //----------------------------------------------------------------
    /** GroupName，作為 NORMAL 模式的參數或是 FORMAT 模式的預設值 */
    public get GroupName(): string { return this.m_groupName; }
    public set GroupName(value: string) {
        if (this.m_groupName !== value) {
            this.m_groupName = value;
            this.Reload();
        }
    }

    //----------------------------------------------------------------
    /** 預設字串，只有在 Mode 為 NORMAL 時有效 */
    public get DefaultString(): string { return this.m_defaultString; }
    public set DefaultString(value: string) {
        if (this.m_defaultString !== value) {
            this.m_defaultString = value;
            if (this.m_mode == LocaleLabelMode.NORMAL) {
                this.Reload();
            }
        }
    }

    //----------------------------------------------------------------
    /**
     * 格式化字串，只有在 Mode 為 FORMAT 時有效
     * - 格式化字串的格式為 `%%stringKey%%` 或 `%%stringKey@groupName%%`
     * - 範例: 
     * > - group[ default ] 中有 [ greeting ] = "Hello"
     * > - group[ default ] 中有 [ target ] = "World"
     * > - group[ system ] 中有 [ target ] = "Everyone"
     * - `%%greeting%%, %%target%%!` 會被格式化為 `Hello, World!`
     * - `%%greeting%%, %%target@system%%!` 會被格式化為 `Hello, Everyone!`
     */
    public get FormatString(): string { return this.m_formatString; }
    public set FormatString(value: string) {
        if (this.m_formatString !== value) {
            this.m_formatString = value;
            if (this.m_mode == LocaleLabelMode.FORMAT) {
                this.Reload();
            }
        }
    }

    //----------------------------------------------------------------

    private m_textComponent: Label | RichText = null;
    public get TextComponent(): Label | RichText {
        return this.m_textComponent || (this.m_textComponent = this.getComponent(Label) || this.getComponent(RichText));
    }

    //----------------------------------------------------------------

    private m_lazyReloading: LazyUpdating = null;
    private get LazyReloading(): LazyUpdating {
        return this.m_lazyReloading || (this.m_lazyReloading = new LazyUpdating(() => this.ReloadNow()));
    }

    //----------------------------------------------------------------

    protected __preload(): void {
        this.LazyReloading.Update();
    }

    protected onDestroy(): void {
        this.m_lazyReloading?.Cancel();
        this.m_lazyReloading = null;
    }

    //----------------------------------------------------------------
    /** 重新載入文本 */
    public Reload(immediately: boolean = false): void {
        this.LazyReloading.Update( immediately );
    }

    //----------------------------------------------------------------
    /** 立即重新載入文本 */
    private ReloadNow(): void {
        if (!isValid(this.TextComponent, true)) {
            return;
        }

        switch (this.m_mode)
        {
            case LocaleLabelMode.NORMAL:{
                const stringKey = this.m_key;
                const groupName = this.m_groupName;
                this.LoadString(stringKey, groupName, (str)=>{
                    if (isValid(this, true) && stringKey == this.m_key && groupName == this.m_groupName) {
                        if (LocaleMacro.IsValidText( str )) {
                            this.TextComponent.string = str;
                        } else {
                            this.TextComponent.string = this.m_defaultString;
                        }
                    }
                });
                break;
            }

            case LocaleLabelMode.FORMAT:{
                const formatStr = this.m_formatString;
                const parameters = formatStr.match(PARAMETER_PATTERN) ?? [];
                this.BatchLoadParameter(parameters, (strMap)=>{
                    if (isValid(this, true) && formatStr == this.m_formatString) {
                        let formattedStr = formatStr;
                        for (const [parameter, str] of strMap) {
                            formattedStr = formattedStr.replace(parameter, str);
                        }
                        this.TextComponent.string = formattedStr;
                    }
                });
                break;
            }

            default:{
                this.TextComponent.string = this.m_defaultString ?? '';
                break;
            }
        }
    }

    //----------------------------------------------------------------
    /** 載入字串 */
    private LoadString(stringKey: string, groupName: string, callback: (str: string)=>void): void
    {
        if (LocaleText.IsJsonLoaded(groupName)) {
            callback(LocaleText.GetString(stringKey, groupName));
        } else {
            LocaleText.LoadJson(groupName, null, (success)=>{
                if (!isValid(this, true)) {
                    return;
                }

                if (success) {
                    callback(LocaleText.GetString(stringKey, groupName));
                } else {
                    callback(null);
                }
            });
        }
    }

    //----------------------------------------------------------------
    /** 載入參數字串 */
    private LoadParameter(parameter: string, callback: (str: string)=>void): void
    {
        const paramPair = parameter.replace(/%%/g, "").split("@");
        const stringKey = paramPair[0];
        const groupName = paramPair[1] ?? this.m_groupName;

        this.LoadString(stringKey, groupName, callback);
    }

    //----------------------------------------------------------------
    /** 批次載入字串 */
    private BatchLoadParameter(parameters: string[], callback: (strMap: Map<string, string>)=>void): void
    {
        const strMap = new Map<string, string>();
        const loadSet = new Set<string>();

        const onLoaded = (parameter: string, str: string) => {
            strMap.set(parameter, str);
            loadSet.delete(parameter);

            if (loadSet.size == 0) {
                callback(strMap);
            }
        };

        parameters.forEach((parameter)=>{
            loadSet.add(parameter);
            this.LoadParameter(parameter, (str)=>{ onLoaded(parameter, str); });
        });
    }

    //----------------------------------------------------------------

}
