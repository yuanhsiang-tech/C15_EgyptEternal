import { _decorator, isValid, assetManager, Component, Sprite, SpriteFrame } from "cc";
import { EDITOR } from "cc/env";
import { LocaleMacro } from "../../Locale/LocaleMacro";

const { ccclass, property, menu, requireComponent } = _decorator;

const LOCALE_DIR = "LocaleAtom";

@ccclass
@menu("Toolkit/LocaleSprite")
@requireComponent(Sprite)
export default class LocaleSprite extends Component
{
    //----------------------------------------------------------------
    // 各語系圖片
    //----------------------------------------------------------------

    @property({ type: SpriteFrame, displayName: "en" })
    private m_en: SpriteFrame = null;
    public get en(): SpriteFrame {
        return this.m_en;
    }

    @property({ type: SpriteFrame, displayName: "tw" })
    private m_tw: SpriteFrame = null;
    public get tw(): SpriteFrame {
        return this.m_tw;
    }

    @property({ type: SpriteFrame, displayName: "cn" })
    private m_cn: SpriteFrame = null;
    public get cn(): SpriteFrame {
        return this.m_cn;
    }

    //----------------------------------------------------------------
    // 唯讀屬性
    //----------------------------------------------------------------

    @property({ type: Sprite, displayName: "Sprite" })
    public get Sprite(){
        return this.getComponent(Sprite);
    }

    //----------------------------------------------------------------

    protected onLoad(): void {
        this.Reload();
    }

    //----------------------------------------------------------------
    /**
     * 重新設定語系圖片
     */
    public Reload(): void {
        if (isValid(this.Sprite, true)) {
            const spriteFrame: SpriteFrame = this[`m_${LocaleVar.ResLang}`];
            if (isValid(spriteFrame, true) && spriteFrame instanceof SpriteFrame) {
                this.Sprite.spriteFrame = spriteFrame;
            }
        }
    }

    //----------------------------------------------------------------
    // 以下只在編輯器執行
    //----------------------------------------------------------------

    @property({
        displayName: "重新載入",
        tooltip: "重新載入語系圖片，圖片路徑必須放在 LocaleAtom 目錄下的 en / tw / cn 子目錄中",
    })
    private get Refresh(): boolean { return false; }
    private set Refresh(b: boolean){
        EDITOR && refreshSpriteFrame( this );
    }

    //----------------------------------------------------------------
}



/**
 * 重新載入語系圖片
 * (Only available in Editor)
 */
const refreshSpriteFrame = (() => {
    if (!EDITOR) {
        return async function(localeSprite: LocaleSprite){};
    }

    async function loadImages(root: string, path: string, langList: string[], callback: (lang: string, spriteFrame: SpriteFrame) => void)
    {
        langList ??= [];
        for (const lang of langList) {
            const uuid = await EditorUtils.assetdb.urlToUuid(`${root}/${lang}/${path}/spriteFrame`);
            if (!(uuid?.length > 0)) {
                callback(lang, null);
                continue;
            }

            assetManager.loadAny({ uuid }, (err, loadedAsset) => {
                if (err) {
                    callback(lang, null);
                    return;
                }

                callback(lang, loadedAsset);
            });
        }
    }

    return async function(localeSprite: LocaleSprite): Promise<void>
    {
        const spriteFrame = localeSprite?.Sprite?.spriteFrame;
        if (isValid(spriteFrame, true))
        {
            const spriteFrameUrl = await EditorUtils.assetdb.uuidToUrl( spriteFrame.uuid );
            if (spriteFrameUrl?.length > 0)
            {
                const pureUrl       = spriteFrameUrl.replace(/@.*$/, '');
                const localeIdx     = pureUrl.lastIndexOf(LOCALE_DIR);
                const localeRoot    = pureUrl.substring(0, localeIdx + LOCALE_DIR.length);
                const localePath    = pureUrl.substring(localeIdx + LOCALE_DIR.length + 1);
                const imagePath     = localePath.split('/').slice(1).join('/');

                loadImages(
                    localeRoot,
                    imagePath,
                    [LocaleMacro.LANGUAGE.EN, LocaleMacro.LANGUAGE.TW, LocaleMacro.LANGUAGE.CN],
                    (lang, spriteFrame) => {
                        if (!isValid(localeSprite, true)) {
                            return;
                        }
                        if (isValid(spriteFrame, true)) {
                            localeSprite[`m_${lang}`] = spriteFrame;
                        } else {
                            EditorUtils.Warn(`LocaleSprite : Not Found - ${lang}`);
                        }
                    }
                );
            }
        }
    }
})();

