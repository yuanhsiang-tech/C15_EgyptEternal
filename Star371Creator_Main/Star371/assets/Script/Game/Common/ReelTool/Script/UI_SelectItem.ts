import { _decorator, Component, EventTouch, Label } from 'cc';
import { ReelTool_UI } from './UI_DispatcherDefine';
import Touchable, { TouchableEvent } from 'db://assets/Stark/Interactive/Touchable';
import { EventDispatcher } from 'db://assets/Stark/Utility/EventDispatcher';
const { ccclass, property } = _decorator;

@ccclass('UI_SelectItem')
export class UI_SelectItem extends Component {
    @property({ type: Touchable, displayName: "SelectBox" })
    private m_selectBox: Touchable = null;

    start() {
        if (this.m_selectBox) {
            this.m_selectBox.On(TouchableEvent.Clicked, this.onSelectBoxClicked, this);
        }
    }

    update(deltaTime: number) {
        
    }

    onDestroy() {
        if (this.m_selectBox) {
            this.m_selectBox.Off(TouchableEvent.Clicked, this.onSelectBoxClicked, this);
        }
    }

    public onSelectBoxClicked(sender: Touchable, event?: EventTouch) {
        EventDispatcher.Shared.Dispatch(ReelTool_UI.SELECTBOX_CHANGE, this.node, this.node.getChildByName("Label").getComponent(Label).string);
    }
}


