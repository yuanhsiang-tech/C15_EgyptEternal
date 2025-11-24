import { _decorator, Component, Sprite, Node, resources, SpriteFrame, error } from 'cc'
import { Resource } from '../Define/ResourceDefine'
const { ccclass, property, disallowMultiple, menu } = _decorator

@ccclass('UITitle')
@menu('UISystem/UITitle')
@disallowMultiple
export class UITitle extends Component {
    @property({
        type: Sprite,
        displayName: '一般稱號節點',
    })
    private m_normalTitle: Sprite = null
    @property({
        type: Node,
        displayName: '動態稱號節點',
    })
    private m_animatedTitleParent: Node = null

    private m_titleId: number = 0

    public get TitleId(): number {
        return this.m_titleId
    }
    public set TitleId(value: number) {
        this.m_titleId = value
        this.SetTitle(value)
    }

    protected onLoad(): void {
        this.m_animatedTitleParent.active = false
    }

    private SetTitle(titleId: number): void {
        if( this._hasAniamtedTitle(titleId)) {
            // TODO 動態稱號
            this.m_animatedTitleParent.active = true
        } else {
            this.m_animatedTitleParent.active = false
        }
    }

    private _hasAniamtedTitle(titleId: number): boolean {
        return false
    }
}