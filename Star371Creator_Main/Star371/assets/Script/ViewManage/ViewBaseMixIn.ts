import { _decorator, Component, Node } from 'cc'
import { Bundle } from '../Bundle/Bundle'
import { LocaleText } from '../Locale/LocaleText'
const { ccclass, property } = _decorator

@ccclass('ViewBaseMixIn')
export class ViewBaseMixIn extends Component {
    private m_bundleName:string

    /**
     * 取得所屬的 Bundle
     */
    protected get Bundle(): Bundle { return Bundle.Find(this.m_bundleName) }

    protected get BundleName(): string { return this.m_bundleName }

    /**
     * 設定所屬的 Bundle 名稱
     * @param name Bundle 名稱
     */
    private SetBundleName(name:string): void {
        this.m_bundleName = name
    }

    protected GetLocaleString(stringName:string, category?: string, defaultString?: string): string {
        return LocaleText.GetString(stringName, this.m_bundleName, category, defaultString)
    }
}


