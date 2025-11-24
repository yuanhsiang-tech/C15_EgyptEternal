import { _decorator, Component, EventTouch } from 'cc';
import Touchable, { TouchableEvent } from 'db://assets/Stark/Interactive/Touchable';
const { ccclass, property } = _decorator;

@ccclass('UI_Weight')
export class UI_Weight extends Component {
    @property({ type: Touchable, displayName: "Delete Btn" })
    private deleteBtn: Touchable = null;

    start() {
        if (this.deleteBtn) {
            this.deleteBtn.On(TouchableEvent.Clicked, this.onDeleteBtnClicked, this);
        }
    }

    update(deltaTime: number) {
        
    }

    onDestroy() {
        if (this.deleteBtn) {
            this.deleteBtn.Off(TouchableEvent.Clicked, this.onDeleteBtnClicked, this);
        }
    }

    private onDeleteBtnClicked(sender: Touchable, event?: EventTouch) {
        this.node.destroy()
    }
}


