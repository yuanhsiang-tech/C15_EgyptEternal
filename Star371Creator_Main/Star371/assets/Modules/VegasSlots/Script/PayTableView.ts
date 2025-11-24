
import { _decorator, CCInteger, Node, Input, EventTouch, v3, tween, Prefab, Label, instantiate, SpriteFrame, Sprite, isValid, warn, error } from 'cc';
import { ViewPop } from '../../../Script/ViewManage/Foundation/ViewPop';
import { Device } from '../../../Script/Device/Device';
import { Identifier } from '../../../Script/Define/IdentifierDefine';
import CommonButton from 'db://assets/Stark/Interactive/CommonButton';
import { TouchableEvent } from 'db://assets/Stark/Interactive/Touchable';


const { ccclass, property } = _decorator;

const CENTER_X: number = 0;
const SENSITIVITY: number = 50;

interface LayoutSetting
{
    WIDTH: number;
    HEIGHT: number;
    INNERWIDTH: number;
    INNERHEIGHT: number;
}

const VIEW_SETTING: {[type in Device.Orientation]: LayoutSetting} =
{
    [Device.Orientation.LANDSCAPE]: {
        WIDTH:          950,
        HEIGHT:         566,
        INNERWIDTH:     908,
        INNERHEIGHT:    414,
    },

    [Device.Orientation.PORTRAIT]: {
        WIDTH:          582,
        HEIGHT:         714,
        INNERWIDTH:     540,
        INNERHEIGHT:    562,
    },
}

@ccclass('PayTableView')
export default class PayTableView extends ViewPop
{
    @property({
        type: Node,
        displayName: "觸控滑動"
    })
    private m_swipeNode: Node = null;

    @property({
        type: Node,
        displayName: "內容頁容器"
    })
    private m_content: Node = null;

    @property({
        type: Node,
        displayName: "頁數指標容器"
    })
    private m_indicator: Node = null;

    @property({
        type: Label,
        displayName: "頁數指標數字"
    })
    private m_indicatorNum: Label = null;

    @property({
        type: CCInteger,
        displayName: "最大頁數指標數量",
        tooltip: "超過會顯示成數字, 0為不限制"
    })
    private m_pointMaxCount: number = 0;

    @property({
        type: Prefab,
        displayName: "頁數圓點 Prefab"
    })
    private m_pointPrefab: Prefab = null;

    @property({
        type: CommonButton,
        displayName: "向左按鈕"
    })
    private m_leftBtn: CommonButton = null;

    @property({
        type: CommonButton,
        displayName: "向右按鈕"
    })
    private m_rightBtn: CommonButton = null;

    @property({
        type: CommonButton,
        displayName: "關閉按鈕"
    })
    private m_closeBtn: CommonButton = null;

    // @property({
    //     type: VersionChain,
    //     displayName: "版本號"
    // })
    // private m_versionChain: VersionChain = null;

    private m_touchStartX: number = null;
    private m_pageIndex: number = 0;
    private m_totalPage: number = 0;
    private m_pages: Node[] = [];
    private m_points: Node[] = [];
    private m_showPoints: boolean = true;
    private m_changePageEndCb: Function = null;
    private m_isMoving: boolean = false;
    private m_isOnePage: boolean = false;
    private m_bundleName: string = "";
    private m_version: string = "";
    private m_resDir: string = "";
    private m_isInit: boolean = false;
    private m_usingLayoutSetting: Readonly<LayoutSetting> = null;

    protected onEnable(): void {
        super.onEnable?.();

        this.m_swipeNode.on(Input.EventType.TOUCH_START, this.OnSwipeTouchStart, this);
        this.m_swipeNode.on(Input.EventType.TOUCH_MOVE, this.OnSwipeTouchMove, this);
        this.m_swipeNode.on(Input.EventType.TOUCH_END, this.OnSwipeTouchEnd, this);
        this.m_swipeNode.on(Input.EventType.TOUCH_CANCEL, this.OnSwipeTouchEnd, this);

        this.m_leftBtn.On(TouchableEvent.Clicked, this.OnLeftBtnClicked, this);
        this.m_rightBtn.On(TouchableEvent.Clicked, this.OnRightBtnClicked, this);
        this.m_closeBtn.On(TouchableEvent.Clicked, this.OnCloseBtnClicked, this);
    }

    protected onDisable(): void {
        super.onDisable?.();
        this.m_swipeNode.off(Input.EventType.TOUCH_START, this.OnSwipeTouchStart, this);
        this.m_swipeNode.off(Input.EventType.TOUCH_MOVE, this.OnSwipeTouchMove, this);
        this.m_swipeNode.off(Input.EventType.TOUCH_END, this.OnSwipeTouchEnd, this);
        this.m_swipeNode.off(Input.EventType.TOUCH_CANCEL, this.OnSwipeTouchEnd, this);

        this.m_leftBtn.Off(TouchableEvent.Clicked, this.OnLeftBtnClicked, this);
        this.m_rightBtn.Off(TouchableEvent.Clicked, this.OnRightBtnClicked, this);
        this.m_closeBtn.Off(TouchableEvent.Clicked, this.OnCloseBtnClicked, this);
    }

    private OnLeftBtnClicked(sender: CommonButton, event: EventTouch) {
        this.SwipePage(-1);
    }

    private OnRightBtnClicked(sender: CommonButton, event: EventTouch) {
        this.SwipePage(1);
    }

    private OnCloseBtnClicked(sender: CommonButton, event: EventTouch) {
        this.Dismiss();
    }

    /**
    * 初始設定
    * @param totalPage 總頁數
    * @param pagePrefab 內容頁 Prefab
    * @param changePageEndCb 換頁結束 callback
    */
    public Init(pageSprites: Array<SpriteFrame>, changePageEndCb?: Function, ver?: string)
    {
        if (this.m_isInit) {
            warn( "[PayTableView] 重複初始化" );
            return;
        }

        this.m_usingLayoutSetting = VIEW_SETTING[ SceneManager.Instance.CurrSceneOrientation ];

        const view = NodeUtils.Find(this.node, "view");
        NodeUtils.SetSize(view, this.m_usingLayoutSetting.INNERWIDTH, this.m_usingLayoutSetting.INNERHEIGHT);

        this.m_totalPage = pageSprites.length;
        this.m_isOnePage = (this.m_totalPage == 1);
        this.m_pageIndex = 0;
        this.m_changePageEndCb = changePageEndCb;

        if (this.m_versionChain) {
            this.m_versionChain.DefaultString = "VF-GAME";
            this.m_versionChain.SetVersionKeyList([ Identifier.VERSION.GAME_VERSION, Identifier.VERSION.GAME_CHECK ]);
        }

        this.m_leftBtn.node.active = !this.m_isOnePage;
        this.m_rightBtn.node.active = !this.m_isOnePage;

        this.m_content.destroyAllChildren();
        this.m_pages = [];
        let page: Node = null;
        for (let i = 0; i < this.m_totalPage; i++) {
            let sp = pageSprites[i];
            page = new Node("Page" + (i + 1))
            page.addComponent(Sprite).spriteFrame = sp
            this.m_content.addChild(page);
            this.m_pages.push(page);
        }

        this.InitIndicator();
        this.SetContent(this.m_pageIndex);

        this.m_isInit = true;
    }

    // 設定顯示內容頁
    private SetContent(index: number) {
        let page: Node = null;

        for (let i = 0; i < this.m_totalPage; i++) {
            page = this.m_pages[i];
            page.active = false;

            if (i == index) {
                // 當前頁
                page.active = true;
                page.setPosition(v3(0, this.m_usingLayoutSetting.INNERHEIGHT / 2, 0));
            }
            if (this.m_isOnePage) {
                // 只有一頁
                continue;
            }
            if (i == index - 1 || (index == 0 && i == this.m_totalPage - 1)) {
                // 前一頁
                page.active = true;
                page.setPosition(v3(-this.m_usingLayoutSetting.INNERWIDTH, this.m_usingLayoutSetting.INNERHEIGHT / 2, 0));
            }
            if ((i == index + 1 && i < this.m_totalPage) || (index == this.m_totalPage - 1 && i == 0)) {
                // 後一頁
                page.active = true;
                page.setPosition(v3(this.m_usingLayoutSetting.INNERWIDTH, this.m_usingLayoutSetting.INNERHEIGHT / 2, 0));
            }
        }
        this.m_content.setPosition(v3(0, 0, 0));
    }

    // 初始頁數指標
    private InitIndicator()
    {
        this.m_indicator.destroyAllChildren();
        this.m_points = [];

        this.m_showPoints = !(this.m_indicatorNum && this.m_pointMaxCount > 0 && this.m_totalPage > this.m_pointMaxCount);
        this.m_indicator.active = this.m_showPoints;

        if (this.m_indicatorNum?.node) {
            this.m_indicatorNum.node.active = !this.m_showPoints;
        }

        // 初始化圓點
        if (this.m_showPoints) {
            let point: Node = null;
            for (let i = 0; i < this.m_totalPage; i++) {
                point = instantiate(this.m_pointPrefab);
                this.m_indicator.addChild(point);
                this.m_points.push(point);
            }
        }

        this.SetIndicator(this.m_pageIndex);
    }

    // 設定頁數指標
    private SetIndicator(index: number)
    {
        // 顯示圓點
        if (this.m_showPoints) {
            for (let i = 0; i < this.m_totalPage; i++) {
                if (i == index) {
                    this.m_points[i].getChildByName("Selected").active = true;
                }
                else {
                    this.m_points[i].getChildByName("Selected").active = false;
                }
            }
        }
        // 顯示數字
        else if (this.m_indicatorNum) {
            this.m_indicatorNum.string = `${index + 1} / ${this.m_totalPage}`;
        }
    }

    private OnSwipeTouchStart(event: EventTouch) {
        if (this.m_isMoving || this.m_isOnePage) return;

        this.m_touchStartX = event.getLocation().x;
    }

    private OnSwipeTouchMove(event: EventTouch) {
        if (this.m_isMoving || this.m_isOnePage) return;

        let touchMoveX: number = event.getLocation().x;
        this.m_content.setPosition(v3(CENTER_X + (touchMoveX - this.m_touchStartX), 0, 0));
    }

    private OnSwipeTouchEnd(event: EventTouch) {
        if (this.m_isMoving || this.m_isOnePage) return;

        let touchEndX: number = event.getLocation().x;

        if (touchEndX - this.m_touchStartX < -SENSITIVITY) {
            // 往左滑，下一頁
            this.SwipePage(1);
        }
        else if (touchEndX - this.m_touchStartX > SENSITIVITY) {
            // 往右滑，上一頁
            this.SwipePage(-1);
        }
        else {
            // 回原位
            this.SwipePage(0);
        }
    }

    private SwipePage(direction: number)
    {
        if (this.m_isMoving || this.m_isOnePage) {
            return;
        }

        let targetX: number = 0;
        if (direction > 0) {
            // 往左滑，下一頁
            targetX = -this.m_usingLayoutSetting.INNERWIDTH;
            this.m_pageIndex++;
        }
        else if (direction < 0) {
            // 往右滑，上一頁
            targetX = this.m_usingLayoutSetting.INNERWIDTH;
            this.m_pageIndex--;
        } else {
            // 回原位
            targetX = CENTER_X;
        }

        if (this.m_pageIndex < 0) {
            this.m_pageIndex = this.m_totalPage - 1;
        }
        else if (this.m_pageIndex >= this.m_totalPage) {
            this.m_pageIndex = 0;
        }

        // 需要移動動畫
        if (this.m_content.position.x != targetX)
        {
            const pageChanged = direction != 0;
            this.m_isMoving = true;
            tween(this.m_content)
                .to(0.2, { position: v3(targetX, 0, 0) })
                .call(() => {
                    this.SetContent(this.m_pageIndex);
                    this.SetIndicator(this.m_pageIndex);
                    this.m_isMoving = false;

                    if (pageChanged) {
                        this.m_changePageEndCb?.(this.m_pageIndex, this.m_pages[this.m_pageIndex]);
                    }
                })
                .start();
        }
    }

    //----------------------------------------------------------------

    protected LaunchOption(bundleName: string, version: string, resDir?: string): void
    {
        this.m_bundleName = bundleName;
        this.m_version = version;

        // 決定資源目錄
        if (typeof resDir === "string" && resDir.length > 0) {
            this.m_resDir = resDir;
        } else {
            this.m_resDir = `Locale/${LocaleVar.Language}/Img/Paytable`;
        }
    }

    protected OnAwake(reused: boolean) {
        super.OnAwake?.(reused);

        if (!this.m_isInit)
        {
            const dirPath = this.m_resDir;

            BundleLoader.Load(this.m_bundleName, (err, bundle)=>
            {
                if (!isValid(this, true)) {
                    return;
                }

                if (err || !bundle) {
                    error("PayTableView load failed.", err);
                    return;
                }

                bundle.loadDir(dirPath, SpriteFrame, (err: Error, data: SpriteFrame[])=>
                {
                    if (!isValid(this, true)) {
                        return;
                    }

                    if (err) {
                        error("PayTableView loadDir failed.", err);
                        return;
                    }

                    if (dirPath !== this.m_resDir) {
                        warn("PayTableView loadDir resDir has changed");
                        return;
                    }

                    data.sort((a, b) => {
                        return a.name.localeCompare(b.name);
                    });

                    this.Init(data, ()=>{}, this.m_version);
                    this.Present();
                })
            });
        }
        else {
            this.Present();
        }
    }

}
