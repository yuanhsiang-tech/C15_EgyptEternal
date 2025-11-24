import { _decorator, Color, Component, instantiate, Label, Node, Prefab, Sprite, UITransform } from 'cc';
import { ReelTool_UI } from './UI_DispatcherDefine';
import { EventDispatcher } from 'db://assets/Stark/Utility/EventDispatcher';
const { ccclass, property } = _decorator;

@ccclass('UI_SelectBox')
export class UI_SelectBox extends Component {
    @property({ type: Prefab, tooltip: "Item Prefab" })
    private m_itemPrefab: Prefab = null;

    
    @property({ type: Node, displayName: "Item Container" })
    private m_itemContainer: Node = null;

    private m_selfHeight: number = 0;

    start() {
        EventDispatcher.Shared.On(ReelTool_UI.SELECTBOX_CHANGE, this.OnSelectBoxChange, this);
        this.m_selfHeight = this.node.parent.getComponent(UITransform).height;
    }

    update(deltaTime: number) {
        
    }

    onDestroy() {
        EventDispatcher.Shared.Off(ReelTool_UI.SELECTBOX_CHANGE, this.OnSelectBoxChange, this);
    }

    public InitItemList(itemList: string[]){
        //刪除多餘元件
        for (let j = itemList.length; j < this.m_itemContainer.children.length; j++) {
            this.m_itemContainer.children[j].destroy()
        }

        for (let i = 0 ; i < itemList.length ; i++){
            if (i < this.m_itemContainer.children.length){ //已經有了
                this.m_itemContainer.children[i].getChildByName("Label").getComponent(Label).string = itemList[i]
            }else{
                const item = instantiate(this.m_itemPrefab)
                item.parent = this.m_itemContainer
                item.getChildByName("Label").getComponent(Label).string = itemList[i]
            }
        }
    }

    public OnSelectBoxChange(targetItemNode: Node, selectValue: string) {
        if (targetItemNode.parent.name == "Other"){ // 下拉式選單的選項
            if (targetItemNode.parent.parent == this.node){ //是屬於這個選單的
                //將選擇的值放入目標區
                this.node.getChildByName("Target").getChildByName("Label").getComponent(Label).string = selectValue;
                this.node.getChildByName("Target").getComponent(Sprite).color = new Color(255, 255, 255, 255);
                this.m_itemContainer.active = false;
                this.node.parent.getComponent(UITransform).setContentSize(
                    this.node.parent.getComponent(UITransform).width, 
                    this.m_selfHeight
                );
            }
        }else{ // 選擇的那個
            if (targetItemNode.parent == this.node){ //是屬於這個選單的
                //開啟下拉式選單
                this.m_itemContainer.active = true;
                this.node.getChildByName("Target").getComponent(Sprite).color = new Color(255, 255, 255, 96);
                this.node.parent.getComponent(UITransform).setContentSize(
                    this.node.parent.getComponent(UITransform).width, 
                    this.m_selfHeight * (1+this.m_itemContainer.children.length) + 10
                );
            }
        }
    }
}


