import { _decorator, Component, Node } from 'cc';
import { PropertySet } from '../PropertySet/PropertySet';
import CommonButton from '../../../Stark/Interactive/CommonButton';
import { TouchableEvent } from '../../../Stark/Interactive/Touchable';
import { TabBar, TabBarDelegate } from '../../ViewManage/TabBar/TabBar';

const { ccclass, property } = _decorator;

export interface TabBarViewDelegate extends TabBarDelegate {
    OnBackClicked(): void;
}

@ccclass('TabBarView')
export class TabBarView extends TabBar<TabBarViewDelegate> {
    @property({
        type: Node,
        displayName: 'Left AddOn',
    })
    protected m_leftAddOn:Node;

    @property({
        type: Node,
        displayName: 'Right AddOn',
    })
    protected m_rightAddOn:Node;

    @property({
        type: PropertySet,
        displayName: 'Property Set',
    })
    protected m_propertySet:PropertySet;

    @property({
        type: CommonButton,
        displayName: 'Back Button',
    })
    protected m_back:CommonButton;

    /**
     * 設定左側附加顯示內容
     * @param view 附加顯示內容
     */
    public SetLeftView(view: Node) {
        this.SetAddOnView(this.m_leftAddOn, view);
    }

    /**
     * 設定右側附加顯示內容
     * @param view 附加顯示內容
     */
    public SetRightView(view: Node) {
        this.SetAddOnView(this.m_rightAddOn, view);
    }

    /**
     * 設定附加顯示內容
     * @param addOn 附加顯示節點
     * @param view 附加顯示內容
     */
    private SetAddOnView(addOn: Node, view: Node) {
        addOn.removeAllChildren();
        if (view) {
            view.parent = addOn;
        }
    }

    protected onEnable(): void {
        super.onEnable?.();
        this.m_back.On(TouchableEvent.Clicked, this.OnBackClicked, this);
    }

    protected onDisable(): void {
        super.onDisable?.();
        this.m_back.Off(TouchableEvent.Clicked, this.OnBackClicked, this);
    }

    /**
     * 設定金幣
     * @param coin 金幣
     */
    public SetCoin(coin: number) {
        this.m_propertySet.SetCoin(coin);
    }

    /**
     * 設定鑽石
     * @param diamond 鑽石
     */
    public SetDiamond(diamond: number) {
        this.m_propertySet.SetDiamond(diamond);
    }

    protected OnBackClicked(): void {
        this.Delegate?.OnBackClicked?.();
    }
}