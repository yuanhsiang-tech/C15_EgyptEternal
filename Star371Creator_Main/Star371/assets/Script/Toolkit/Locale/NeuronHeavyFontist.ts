import { _decorator, isValid, Component, Label, TTFFont } from "cc";
import { EDITOR } from "cc/env";
import { assetManager } from "cc";
import { LocaleMacro } from "../../Locale/LocaleMacro";
import { LocaleVar } from "../../Locale/LocaleVar";
import { NodeUtils } from "db://assets/Stark/FuncUtils/NodeUtils";

const { ccclass, property, executeInEditMode } = _decorator;

const FONT_UUID = "45ce3245-4313-4647-bf8d-70dc47d9e1f8";

const TOOLTIP = "在編輯器自動套用 NeuronHeavy 字型\n" +
                "並且在 runtime 語系為英文時自動關閉粗體\n" +
                "語系為中文或其他非英語時自動套用粗體";

//================================================================================================
/**
 * 在編輯器自動套用 NeuronHeavy 字型
 * 並且在 runtime 語系為英文時自動關閉粗體
 * 語系為中文或其他非英語時自動套用粗體
 */
//================================================================================================

@ccclass
@executeInEditMode
export default class NeuronHeavyFontist extends Component
{

    //----------------------------------------------------------------

    @property({
        type: Label,
        displayName: "Label",
        readonly: true,
        visible: function() { return !!this.m_label; }
    })
    private m_label: Label = null;

    //----------------------------------------------------------------

    protected onLoad(): void {
        if (EDITOR && !this.m_label) {
            this.Reload();
        }
    }

    //----------------------------------------------------------------

    protected onEnable(): void {
        if (!EDITOR && isValid(this.m_label, true)) {
            this.m_label.isBold = LocaleVar.GetLanguage() !== LocaleMacro.LANGUAGE.EN;
        }
    }

    //----------------------------------------------------------------
    // 以下只在編輯器執行
    //----------------------------------------------------------------

    @property({ editorOnly: true })
    private _reloading: boolean = false;

    @property({
        displayName: "重讀設定",
        tooltip: TOOLTIP
    })
    private get triggerReload(): boolean { return this._reloading; }
    private set triggerReload(b: boolean) {
        if (EDITOR && !this._reloading) {
            this.Reload();
        }
    }

    private Reload(): void {
        if (!EDITOR) {
            return;
        }

        this._reloading = true;

        assetManager.loadAny({ uuid: FONT_UUID }, (err, asset) => {
            if (!isValid(this, true)) {
                return;
            }

            this._reloading = false;

            if (err) {
                EditorUtils.Error("NeuronHeavyFontist: ", err);
                return;
            }

            if (asset instanceof TTFFont === false) {
                EditorUtils.Error("NeuronHeavyFontist: Invalid font asset", asset);
                return;
            }

            this.m_label = NodeUtils.SearchComponent(this.node, Label);
            if (isValid(this.m_label, true)) {
                this.m_label.useSystemFont = false;
                this.m_label.font = asset;
            }
        });
    }

    //----------------------------------------------------------------

}
