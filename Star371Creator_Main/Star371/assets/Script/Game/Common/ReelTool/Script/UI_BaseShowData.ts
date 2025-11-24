import { _decorator, Component, EditBox, EventTouch, log, Node } from 'cc';
import { ReelTool_UI } from './UI_DispatcherDefine';
import Touchable, { TouchableEvent } from 'db://assets/Stark/Interactive/Touchable';
import { EventDispatcher } from 'db://assets/Stark/Utility/EventDispatcher';
const { ccclass, property } = _decorator;

@ccclass('UI_BaseShowData')
export class UI_BaseShowData extends Component {
    @property({ type: Touchable, displayName: "Copy" })
    private copyBtn: Touchable = null;

    @property({ type: Touchable, displayName: "Paste" })
    private pasteBtn: Touchable = null;

    start() {
        if (this.copyBtn) {
            this.copyBtn.On(TouchableEvent.Clicked, this.onCopyBtnClicked, this);
        }

        if (this.pasteBtn) {
            this.pasteBtn.On(TouchableEvent.Clicked, this.onPasteBtnClicked, this);
        }
    }

    update(deltaTime: number) {
        
    }

    onDestroy() {
        if (this.copyBtn) {
            this.copyBtn.Off(TouchableEvent.Clicked, this.onCopyBtnClicked, this);
        }

        if (this.pasteBtn) {
            this.pasteBtn.Off(TouchableEvent.Clicked, this.onPasteBtnClicked, this);
        }
    }

    public OnEditBoxUpdate(editBox: EditBox){
        EventDispatcher.Shared.Dispatch(ReelTool_UI.EDITBOX_CHANGE, this.node, editBox.string);
    }

    private onCopyBtnClicked(sender: Touchable, event?: EventTouch) {
        EventDispatcher.Shared.Dispatch(ReelTool_UI.COPY_CLICK, this.node);
    }

    private onPasteBtnClicked(sender: Touchable, event?: EventTouch) {
        EventDispatcher.Shared.Dispatch(ReelTool_UI.PASTE_CLICK, this.node);
    }
}


