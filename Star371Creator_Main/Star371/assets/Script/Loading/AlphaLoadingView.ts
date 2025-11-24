import {
    _decorator, error
} from 'cc'
import { Define } from '../Define/GeneralDefine'
import { PersistLayer } from '../Toolkit/PersistLayer'

const { ccclass, menu } = _decorator

@ccclass('AlphaLoading')
@menu('Loading/AlphaLoading')
export class AlphaLoading extends PersistLayer {

    private m_showCounter: number = 0

    private static m_instance: AlphaLoading = null
    public static get Instance(): AlphaLoading {
        if (!AlphaLoading.m_instance) {
            return null
        }
        return AlphaLoading.m_instance
    }

    protected onLoad(): void {
        this.SiblingIndex = Define.ZIndex.Global.ALPHA_LOADING
        if (AlphaLoading.m_instance) {
            AlphaLoading.m_instance.node.destroy()
        }
        AlphaLoading.m_instance = this
        this.node.active = false
        super.onLoad()
    }

    public Show(): void {
        this.m_showCounter++
        if (this.m_showCounter === 1) {
            this._showLoading()
        }
    }

    public Hide(): void {
        this.m_showCounter--
        if (this.m_showCounter < 0) {
            this.m_showCounter = 0
        }
        if (this.m_showCounter === 0) {
            this.node.active = false
        }
    }

    private _showLoading(): void {
        this.node.active = true
    }
}
