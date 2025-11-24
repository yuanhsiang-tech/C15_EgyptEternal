import { _decorator, Node, UIOpacity } from 'cc';
import { TopBarView } from './TopBarView';
import { TopBarMode } from '../../Define/TopBarModeDefine';
import { EventDispatcher } from '../../../Stark/Utility/EventDispatcher';
import { EventDefine } from '../../Define/EventDefine';
import { UIButtonItem } from '../../UISystem/UIButtonItem';
import { MechanismType } from '../../Define/MechanismDefine';
import AudioManager from '../../Audio/Foundation/AudioManager';

export interface TopBarDataSource {
    TopBarLeftView(mode: TopBarMode): Node;
    TopBarRightView(mode: TopBarMode): Node;
}

export class TopBarController {
    private static s_instance: TopBarController = null;    

    /**
     * 取得 TopBarController 唯一實體
     */
    public static get Instance(): TopBarController { 
        return TopBarController.s_instance ?? (TopBarController.s_instance = new TopBarController()); 
    }
    
    private m_view: TopBarView = null;
    private m_dataSource: TopBarDataSource = null;

    public set DataSource(dataSource: TopBarDataSource) {
        this.m_dataSource = dataSource;
    }

    private constructor() {
    }

    /**
     * 設定 TopBarView 節點
     * @param viewNode TopBarView 節點
     * @returns 是否設定成功
     */
    public SetView(viewNode: Node|null) {
        if (viewNode == null) {
            this.UnRegisterEvent();
            this.m_view?.SetLeftView(null);
            this.m_view?.SetRightView(null);
            this.m_view = null;
            return;
        }

        this.RegisterEvent();
        this.m_view = viewNode.getComponent(TopBarView);
    }

    /**
     * 設定 TopBar 模式
     * @param mode 模式
     */
    public SetMode(mode: TopBarMode) {
        this.m_view?.SetMode(mode);
        this.m_view?.SetLeftView(this.m_dataSource?.TopBarLeftView(mode));
        this.m_view?.SetRightView(this.m_dataSource?.TopBarRightView(mode));
    }

    /**
     * 介面進入全畫面顯示
     */
    private OnViewEnterFullScreen() {
        const uiOpacity:UIOpacity = this.m_view?.getComponent(UIOpacity);
        if (uiOpacity) {
            uiOpacity.opacity = 0;
        }
    }

    /**
     * 介面退出全畫面顯示
     */
    private OnViewExitFullScreen() {
        const uiOpacity:UIOpacity = this.m_view?.getComponent(UIOpacity);
        if (uiOpacity) {
            uiOpacity.opacity = 255;
        }
    }

    /**
     * 系統按鈕點擊事件
     */
    private OnSystemClicked(): void {
        this.m_view.ToggleSystemPanel();
    }

    /**
     * 音樂按鈕點擊事件 
     */
    private OnMusicClicked(item: UIButtonItem): void {
        //目前是開著，代表目前是靜音，所以要把靜音節點關閉，讓正常節點顯示出來，並且播放音樂
        const closeIcon:Node = item.node.children[item.node.children.length-1];
        closeIcon.active = !closeIcon.active;
        AudioManager.Instance.SetGlobalVolumeBGM(closeIcon.active ? 0 : 1);
    }

    /**
     * 音效按鈕點擊事件 
     */
    private OnSoundClicked(item: UIButtonItem): void {
        //目前是開著，代表目前是靜音，所以要把靜音節點關閉，讓正常節點顯示出來，並且播放音樂
        const closeIcon:Node = item.node.children[item.node.children.length-1];
        closeIcon.active = !closeIcon.active;
        AudioManager.Instance.SetGlobalVolumeSFX(closeIcon.active ? 0 : 1);
    }

    /**
     * 按鈕點擊事件
     * @param item 按鈕
     */
    private OnUIItemClicked(item: UIButtonItem): void {
        switch (item.Id) {
            case MechanismType.SYSTEM: {
                this.OnSystemClicked();
                break;
            }
            case MechanismType.MUSIC: {
                this.OnMusicClicked(item);
                break;
            }
            case MechanismType.SOUND: {
                this.OnSoundClicked(item);
                break;
            }
        }
    }

    /**
     * 註冊事件
     */
    private RegisterEvent() {
        EventDispatcher.Shared.On(EventDefine.System.ON_VIEW_ENTER_FULL_SCREEN, this.OnViewEnterFullScreen, this);
        EventDispatcher.Shared.On(EventDefine.System.ON_VIEW_EXIT_FULL_SCREEN, this.OnViewExitFullScreen, this);
        EventDispatcher.Shared.On(EventDefine.System.UI_ITEM_EVENT_CLICKED, this.OnUIItemClicked, this);
    }

    /**
     * 取消註冊事件
     */
    private UnRegisterEvent() {
        EventDispatcher.Shared.Off(EventDefine.System.ON_VIEW_ENTER_FULL_SCREEN, this.OnViewEnterFullScreen, this);
        EventDispatcher.Shared.Off(EventDefine.System.ON_VIEW_EXIT_FULL_SCREEN, this.OnViewExitFullScreen, this);
        EventDispatcher.Shared.Off(EventDefine.System.UI_ITEM_EVENT_CLICKED, this.OnUIItemClicked, this);
    }
}