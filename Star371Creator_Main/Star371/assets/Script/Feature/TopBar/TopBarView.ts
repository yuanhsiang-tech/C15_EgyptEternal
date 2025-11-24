import { _decorator, Component, error, Layout, Node, Prefab, Sprite, SpriteFrame, Vec3 } from 'cc';
import { MechanismType } from '../../Define/MechanismDefine';
import { Bundle } from '../../Bundle/Bundle';
import { Resource } from '../../Define/ResourceDefine';
import { TopBarMode, TopBarModeDefine } from '../../Define/TopBarModeDefine';
import CommonButton from '../../../Stark/Interactive/CommonButton';
import { PropertySet } from '../PropertySet/PropertySet';
import { UISystem } from '../../../Stark/UIKit/UISystem';
import { UIButtonItem } from '../../UISystem/UIButtonItem';
import { UIItem } from '../../UISystem/UIItem';
import { TweenPosition } from 'db://assets/Stark/TweenFunc/TweenPosition';

const { ccclass, property } = _decorator;

@ccclass('BarViewSection')
class BarViewSection {
    public Items:UISystem.UI[];

    @property({
        type: Node,
        displayName: 'Root',
    })
    public Root:Node;

    @property({
        type: Node,
        displayName: 'Group',
    })
    public Group:Node;

    @property({
        type: Node,
        displayName: 'AddOn',
    })
    public AddOn:Node; 
}

@ccclass('TopBarView')
export class TopBarView extends Component {
    private m_singleStore:boolean;
    protected m_itemMap:Map<MechanismType,UISystem.UI>;

    @property({
        type: BarViewSection,
        displayName: 'Left',
    })
    protected m_left:BarViewSection;

    @property({
        type: BarViewSection,
        displayName: 'Right',
    })
    protected m_right:BarViewSection;

    /**系統選單Prefab */
    @property({
        type: Node,
        displayName: 'System Panel',
    })
    protected m_systemPanel:Node;

    /**
     * 取得財產框
     */
    protected get m_propertySet(): PropertySet { 
        return this.FindItem(MechanismType.PROPERTY).node.getComponent(PropertySet) as PropertySet; 
    }

    /**
     * 取得返回按鈕
     */
    public get BackButton(): CommonButton { 
        return this.FindItem(MechanismType.BACK) as CommonButton; 
    }

    /**
     * 取得更多按鈕
     */
    public get MoreButton(): UIButtonItem { 
        return this.FindItem(MechanismType.MORE) as UIButtonItem; 
    }

    protected onLoad(): void {
        this.m_singleStore = true;
        this.m_systemPanel.active = false;
        this.m_itemMap = new Map<MechanismType,UISystem.UI>();
        this.m_left.Items = this.SetupItem(this.m_left.Root);
        this.m_right.Items = this.SetupItem(this.m_right.Root);
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

    /**
     * 取得按鈕
     * @param mechanismType 機制類型
     */
    public FindItem<T=UISystem.UI>(mechanismType: MechanismType): T {
        return this.m_itemMap?.get(mechanismType) as T;
    }

    /**
     * 設定VIP
     * @param vip VIP
     */
    public SetVip(vip: number) {
        const item:UIButtonItem = this.FindItem(MechanismType.VIP);
        item && Bundle.Resources.Load(Resource.Img.Vip.V11, SpriteFrame, (err: any,  spriteFrame:SpriteFrame) => {
            if (err) {
                error('載入 VIP 資源失敗:', err);
                return;
            }
            item.getComponent(Sprite).spriteFrame = spriteFrame;
        });
    }

    /**
     * 設定頭像
     * @param head 頭像
     */
    public SetHeadIcon() {
        const item:UIButtonItem = this.FindItem(MechanismType.PROFILE);
        // item && Bundle.Resources.Load("", SpriteFrame, (err: any,  spriteFrame:SpriteFrame) => {
        //     if (err) {
        //         error('載入頭像資源失敗:', err);
        //         return;
        //     }
        //     item.getComponentInChildren(Sprite).spriteFrame = spriteFrame;
        // });
    }

    /**
     * 設定模式
     * @param mode 模式
     */
    public SetMode(mode: TopBarMode) {
        const isGameMode:boolean = mode == TopBarMode.GAME;
        const itemsToShow:MechanismType[] = TopBarModeDefine[TopBarMode[mode]];

        if (Array.isArray(itemsToShow)) {
            this.m_itemMap.clear();
            [...this.m_left.Items, ...this.m_right.Items].forEach((item:UISystem.UI)=>{
                const index:number = itemsToShow.indexOf(item.Id);
                let active:boolean = index != -1;

                switch (item.Id) {
                    case MechanismType.PROPERTY: {
                        // [設定財產顯示]
                        const propertySet:PropertySet = item.getComponent(PropertySet);
                        active = isGameMode ? propertySet.IsSingle : !propertySet.IsSingle;
                        break;
                    }
                    case MechanismType.STORE: {
                        // [設定商城按鈕]
                        const isSingleStore:boolean = !!item.node.parent.getComponent(Layout);
                        active = this.m_singleStore ? isSingleStore : !isSingleStore;
                        break;
                    }
                    case MechanismType.GIFT_PACK: {
                        // [禮包]
                        active = !this.m_singleStore;
                        break;
                    }
                }

                item.node.active = active;
                active && this.m_itemMap.set(item.Id, item);
            });
        }

        if (this.BackButton) {
            this.BackButton.node.active = mode != TopBarMode.LOBBY;
        }
    }

    /**
     * 是否只顯示一顆大的儲值(商城)按鈕，而非儲值＋禮包按鈕
     * @param single 是否只顯示一顆儲值按鈕
     */
    public UseSingleStoreButton(single:boolean) {
        this.m_singleStore = single;
    }

    /**
     * 設定左側附加顯示內容
     * @param view 附加顯示內容
     */
    public SetLeftView(view: Node) {
        this.SetAddOnView(this.m_left.AddOn, view);
    }

    /**
     * 設定右側附加顯示內容
     * @param view 附加顯示內容
     */
    public SetRightView(view: Node) {
        this.SetAddOnView(this.m_right.AddOn, view);
    }

    /**
     * 開/關系統小面板
     */
    public ToggleSystemPanel() {
        const pos:Vec3 = this.m_systemPanel.position;
        if (this.m_systemPanel.active) {
            // [準備要關閉]
            this.m_systemPanel.setPosition(pos.x, -86, pos.z);
            TweenPosition.StartToY(this.m_systemPanel, 271, 0.2, ()=>{ this.m_systemPanel.active = false; });
        } else {
            // [準備要打開]
            this.m_systemPanel.active = true;
            this.m_systemPanel.setPosition(pos.x, 271, pos.z);
            TweenPosition.StartToY(this.m_systemPanel, -86, 0.2);
        }
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

    /**
     * 設定 UI 對象
     * @param container 容器
     * @param deep 深度
     */
    private SetupItem(container:Node, deep:number = 0): UISystem.UI[] {
        const items:UISystem.UI[] = [];
        for (let i = container.children.length-1; i >= 0; i--) {
            const child:Node = container.children[i];
            child.setSiblingIndex(i);
            const item:UISystem.UI = child.getComponent(UIItem) || child.getComponent(UIButtonItem);
            if (item) {
                items.push(item);
            } else {
                const retItems:UISystem.UI[] = this.SetupItem(child, ++deep);
                retItems && items.push(...retItems);
            }
        }
        return items;
    }
}