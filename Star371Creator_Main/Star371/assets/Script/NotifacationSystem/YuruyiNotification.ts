import {
    _decorator, Label, log, Node, Sprite, tween, Tween, isValid, Vec2, Widget, Color, resources, SpriteFrame, js
} from "cc"
import { NotificationBase } from "./NotificationBase"
import {
    YuruyiMessageType, IconType, YuruyiData, YURUYI_CONSTANTS, YuruyiDataHelper
} from "./YuruyiDefine"
import { NotificationSystem } from "./NotificationSystem"
import { NodeUtils } from "../../Stark/FuncUtils/NodeUtils"
import { PersistLayer } from "../Toolkit/PersistLayer"
import { Define } from "../Define/GeneralDefine"
import { PrizeItem } from "../Prize/PrizeItem"
import { Resource } from "../Define/ResourceDefine"
import { VersionedDownloadCategory } from "../VersionedDownloader/VersionedDownloaderDefine"
import { Bundle } from "../Bundle/Bundle"

const { ccclass, property, menu } = _decorator


/**
 * 玉如意通知視圖
 * 用於顯示系統獎勵通知
 */
@ccclass('YuruyiNotificationView')
@menu('NotifacationSystem/Yuruyi')
export class YuruyiNotificationView extends PersistLayer {
    @property({
        type: Sprite,
        displayName: "背景圖片"
    })
    private m_messageBgSprite: Sprite = null

    @property({
        type: PrizeItem,
        displayName: "左側圖標"
    })
    private m_messageIconLeft: PrizeItem = null

    @property({
        type: PrizeItem,
        displayName: "右側圖標"
    })
    private m_messageIconRight: PrizeItem = null

    @property({
        type: PrizeItem,
        displayName: "其他圖標"
    })
    private m_messageIconOther: PrizeItem = null

    @property({
        type: Label,
        displayName: "中央文字"
    })
    private m_messageCentral: Label = null

    @property({
        type: Label,
        displayName: "描述文字（左）"
    })
    private m_messageDesc: Label = null

    @property({
        type: Label,
        displayName: "狀態文字（右）"
    })
    private m_messageState: Label = null

    private m_currentEntry: YuruyiData = null
    private m_onCompleteCallback: (() => void) | null = null

    private m_messageBg: Node = null

    protected onLoad(): void {
        this.SiblingIndex = Define.ZIndex.Global.YURUYI
        this._initView()
        super.onLoad()
        this.node.active = false

        // 向通知系統註冊視圖實例
        NotificationSystem.SetYuruyiViewInstance(this)
    }

    public get Offset(): Vec2 {
        let component = this.node.getComponent(Widget)
        return new Vec2(component.left, component.top)
    }

    public set Offset(value: Vec2) {
        let component = this.node.getComponent(Widget)
        component.left = value.x
        component.top = value.y
    }

    /**
     * 初始化視圖
     */
    private _initView(): void {
        if (this.m_messageBgSprite) {
            this.m_messageBg = this.m_messageBgSprite.node
        }

        // 設置初始位置（參考 C++ ActivityMessageView 構造函數）
        if (this.m_messageIconLeft && this.m_messageBg) {
            NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconLeft.node, this.m_messageBg, 0.085, 0.50)
        }

        if (this.m_messageIconRight && this.m_messageBg) {
            NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconRight.node, this.m_messageBg, 0.915, 0.50)
        }

        if (this.m_messageIconOther && this.m_messageBg) {
            NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconOther.node, this.m_messageBg, 0.60, 0.50)
        }

        if (this.m_messageDesc && this.m_messageBg) {
            NodeUtils.PERCENT_CHILD_FIX(this.m_messageDesc.node, this.m_messageBg, 0.174, 0.500)
        }

        if (this.m_messageState && this.m_messageBg) {
            NodeUtils.PERCENT_CHILD_FIX(this.m_messageState.node, this.m_messageBg, 0.95, 0.500)
        }

        if (this.m_messageCentral && this.m_messageBg) {
            NodeUtils.PERCENT_CHILD_FIX(this.m_messageCentral.node, this.m_messageBg, 0.5, 0.5)
        }
    }

    /**
     * 更新函數已移除，改由隊列系統管理
     * 現在直接由 _showSingleMessage 處理消息顯示
     */

    /**
     * 準備視圖
     */
    private _prepareView(): void {
        // 隱藏所有非必顯示元件
        if (this.m_messageDesc) this.m_messageDesc.node.active = false
        if (this.m_messageState) this.m_messageState.node.active = false
        if (this.m_messageCentral) this.m_messageCentral.node.active = false
        if (this.m_messageIconRight) this.m_messageIconRight.node.active = false
        if (this.m_messageIconOther) this.m_messageIconOther.node.active = false
        if (this.m_messageIconLeft) this.m_messageIconLeft.node.active = true
    }

    /**
     * 設置文字內容
     */
    private _setText(): void {
        if (!this.m_currentEntry.message) {
            return
        }

        if (this.m_currentEntry.state) {
            // 有兩段文字就用左右分佈
            if (this.m_messageDesc) {
                this.m_messageDesc.node.active = true
                this.m_messageDesc.string = this.m_currentEntry.message
            }
            if (this.m_messageState) {
                this.m_messageState.node.active = true
                this.m_messageState.string = this.m_currentEntry.state
            }
        } else {
            // 只有一段文字就用居中
            if (this.m_messageCentral) {
                this.m_messageCentral.node.active = true
                this.m_messageCentral.string = this.m_currentEntry.message
            }
        }
    }

    /**
     * 設置圖標
     */
    private _setIcon(): void {
        let type: YuruyiMessageType = this.m_currentEntry.type || YuruyiMessageType.NONE_DEFINE
        let parent: Node = this.m_messageBg

        switch (type) {
            case YuruyiMessageType.BOX_MISSION:
                this._setIconByType(IconType.LEFT_ICON, Resource.Img.Activity.Button.BOXMISSION)
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconLeft.node, parent, 0.085, 0.50)
                break

            case YuruyiMessageType.PRIZE_ACTIVITY:
                this._setIconByType(IconType.LEFT_ICON, Resource.Img.Activity.Button.PRIZEACTIVITY)
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconLeft.node, parent, 0.085, 0.50)
                break

            case YuruyiMessageType.MISSION_COMPLETE:
                this._setIconByType(IconType.LEFT_ICON, Resource.Img.Activity.Button.MISSION_COMPLETE)
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconLeft.node, parent, 0.065, 0.50)
                break

            case YuruyiMessageType.GET_I_COINS:
                const paddedScore_icoin = String(7).padStart(2, '0'); // "07"
                this._setIconByType(IconType.ALL_ICON, js.formatStr(Resource.Img.Deposit.ICOIN, paddedScore_icoin))
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconLeft.node, parent, 0.085, 0.60)
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconRight.node, parent, 0.915, 0.60)
                break

            case YuruyiMessageType.GET_DIAMOND:
                const paddedScore_diamond = String(7).padStart(2, '0'); // "07"
                this._setIconByType(IconType.ALL_ICON, js.formatStr(Resource.Img.Deposit.DIAMOND, paddedScore_diamond))
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconLeft.node, parent, 0.085, 0.50)
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconRight.node, parent, 0.915, 0.50)
                break

            case YuruyiMessageType.GET_V_ITEM:
                this._setIconByType(IconType.ALL_ICON, Resource.Img.Activity.Button.BOXMISSION)
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconLeft.node, parent, 0.075, 0.50)
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconRight.node, parent, 0.935, 0.50)
                break

            case YuruyiMessageType.GET_GOLDEN_POINT:
                this._setIconByType(IconType.ALL_ICON, Resource.Img.Activity.GOLDEN_POINT)
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconLeft.node, parent, 0.075, 0.50)
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconRight.node, parent, 0.935, 0.50)
                break

            case YuruyiMessageType.STONE:
                this._setIconByType(IconType.ALL_ICON, Resource.Img.Activity.STONE)
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconLeft.node, parent, 0.085, 0.50)
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconRight.node, parent, 0.915, 0.50)
                break

            case YuruyiMessageType.WARHEAD:
                this._setIconByType(IconType.ALL_ICON, Resource.Img.Activity.WARHEAD)
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconLeft.node, parent, 0.085, 0.50)
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconRight.node, parent, 0.915, 0.50)
                break

            case YuruyiMessageType.CLUB_COIN:
                this._setIconByType(IconType.ALL_ICON, Resource.Img.Activity.CLUB_COIN)
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconLeft.node, parent, 0.085, 0.50)
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconRight.node, parent, 0.915, 0.50)
                break

            case YuruyiMessageType.SERVANT_COIN:
                this._setIconByType(IconType.ALL_ICON, Resource.Img.Activity.SERVANT_COIN)
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconLeft.node, parent, 0.085, 0.50)
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconRight.node, parent, 0.915, 0.50)
                break

            case YuruyiMessageType.SHINY_CARD:
                this._setIconByType(IconType.ALL_ICON, Resource.Img.Activity.SHINY_CARD)
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconLeft.node, parent, 0.085, 0.50)
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconRight.node, parent, 0.915, 0.50)
                break

            case YuruyiMessageType.SHINY_CARD_TICKET:
                this._setIconByType(IconType.ALL_ICON, Resource.Img.Activity.SHINY_CARD_TICKET)
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconLeft.node, parent, 0.085, 0.50)
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconRight.node, parent, 0.915, 0.50)
                break

            case YuruyiMessageType.FREE_GAME_CARD:
                this._setIconByType(IconType.ALL_ICON, Resource.Img.Activity.FREE_GAME_CARD)
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconLeft.node, parent, 0.085, 0.50)
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconRight.node, parent, 0.915, 0.50)
                break

            case YuruyiMessageType.LUCKY_SHIBA:
                this._setIconByType(IconType.ALL_ICON, Resource.Img.Activity.LUCKY_SHIBA)
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconLeft.node, parent, 0.085, 0.50)
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconRight.node, parent, 0.915, 0.50)
                break

            case YuruyiMessageType.LOTTERY:
                this._setIconByType(IconType.ALL_ICON, Resource.Img.Activity.LOTTERY_TICKET)
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconLeft.node, parent, 0.085, 0.50)
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconRight.node, parent, 0.915, 0.50)
                break

            case YuruyiMessageType.WORD_COLLECTION:
                // 現在必須使用新的資料結構
                if (this.m_currentEntry.imgSourceData) {
                    this._setIconByType(IconType.ALL_ICON, this.m_currentEntry)
                } else {
                    // 如果沒有圖片資料，使用預設圖片
                    this._setIconByType(IconType.ALL_ICON, Resource.Img.Activity.Button.BOXMISSION)
                }
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconLeft.node, parent, 0.085, 0.50)
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconRight.node, parent, 0.915, 0.50)
                break

            case YuruyiMessageType.TITLE_NOTIFY:
                this._setIconByType(IconType.LEFT_ICON, Resource.Img.CommonResource.IMG_CONTEST_NEW_PRIZE_TITLE)
                // 使用新的資料結構或預設圖片
                if (this.m_currentEntry.imgSourceData) {
                    // 建立臨時資料用於 OTHER_ICON
                    const tempData: YuruyiData = { ...this.m_currentEntry, type: YuruyiMessageType.NORMAL }
                    this._setIconByType(IconType.OTHER_ICON, tempData)
                } else {
                    this._setIconByType(IconType.OTHER_ICON, Resource.Img.Activity.Button.BOXMISSION)
                }
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconLeft.node, parent, 0.075, 0.50)
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconOther.node, parent, 0.60, 0.50)
                if (this.m_messageCentral) {
                    NodeUtils.PERCENT_CHILD_FIX(this.m_messageCentral.node, parent, 0.39, 0.50)
                }
                break

            case YuruyiMessageType.TITLE_NOTIFY_V2:
                this._setIconByType(IconType.LEFT_ICON, Resource.Img.CommonResource.IMG_CONTEST_NEW_PRIZE_TITLE)
                // 使用新的資料結構或預設圖片
                if (this.m_currentEntry.imgSourceData) {
                    // 建立臨時資料用於 RIGHT_ICON
                    const tempData: YuruyiData = { ...this.m_currentEntry, type: YuruyiMessageType.NORMAL }
                    this._setIconByType(IconType.RIGHT_ICON, tempData)
                } else {
                    this._setIconByType(IconType.RIGHT_ICON, Resource.Img.Activity.Button.BOXMISSION)
                }
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconLeft.node, parent, 0.075, 0.50)
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconRight.node, parent, 0.87, 0.50)
                if (this.m_messageCentral) {
                    NodeUtils.PERCENT_CHILD_FIX(this.m_messageCentral.node, parent, 0.46, 0.50)
                }
                break

            case YuruyiMessageType.NORMAL:
                // 使用新的資料結構或預設圖片
                if (this.m_currentEntry.imgSourceData) {
                    this._setIconByType(IconType.ALL_ICON, this.m_currentEntry)
                } else {
                    this._setIconByType(IconType.ALL_ICON, Resource.Img.Activity.Button.BOXMISSION)
                }
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconLeft.node, parent, 0.085, 0.50)
                NodeUtils.PERCENT_CHILD_FIX(this.m_messageIconRight.node, parent, 0.915, 0.50)
                break

            default:
                this._setIconByType(IconType.ALL_ICON, Resource.Img.Activity.Button.BOXMISSION)
                break
        }
    }

    /**
     * 根據類型設置圖標（使用 YuruyiData）
     */
    private _setIconByType(iconType: IconType, data: YuruyiData): void
    /**
     * 根據類型設置圖標（使用資源路徑）
     */
    private _setIconByType(iconType: IconType, picPath: string): void
    private _setIconByType(iconType: IconType, dataOrPath: YuruyiData | string): void {
        let useNewStructure = false
        let imgSourceData: any = null
        let imgSourceBundle: any = null
        let picPath: string = ""

        if (typeof dataOrPath === "string") {
            // 使用資源路徑
            picPath = dataOrPath
        } else {
            // 使用新的資料結構
            useNewStructure = true
            imgSourceData = YuruyiDataHelper.GetAutoLoadingData(dataOrPath)
            imgSourceBundle = YuruyiDataHelper.GetBundle(dataOrPath)
            picPath = YuruyiDataHelper.GetImagePath(dataOrPath)
        }

        if (iconType === IconType.LEFT_ICON || iconType === IconType.ALL_ICON) {
            if (this.m_messageIconLeft) {
                this.m_messageIconLeft.node.active = true
                if (useNewStructure) {
                    this._loadAndSetSpriteNew(this.m_messageIconLeft, imgSourceData, imgSourceBundle)
                } else {
                    this._loadAndSetSprite(this.m_messageIconLeft, picPath)
                }
            }
        }

        if (iconType === IconType.RIGHT_ICON || iconType === IconType.ALL_ICON) {
            if (this.m_messageIconRight) {
                this.m_messageIconRight.node.active = true
                if (useNewStructure) {
                    this._loadAndSetSpriteNew(this.m_messageIconRight, imgSourceData, imgSourceBundle)
                } else {
                    this._loadAndSetSprite(this.m_messageIconRight, picPath)
                }
            }
        }

        if (iconType === IconType.OTHER_ICON) {
            if (this.m_messageIconOther) {
                this.m_messageIconOther.node.active = true
                if (useNewStructure) {
                    this._loadAndSetSpriteNew(this.m_messageIconOther, imgSourceData, imgSourceBundle)
                } else {
                    this._loadAndSetSprite(this.m_messageIconOther, picPath)
                }
            }
        }
    }

    /**
     * 載入並設置精靈圖片
     */
    private _loadAndSetSprite(prizeItem: PrizeItem, picPath: string): void {
        if (!isValid(prizeItem, true) || !picPath) {
            return
        }

        // 直接使用 Bundle 載入資源路徑
        Bundle.Resources.Load(picPath, SpriteFrame, this._onLoadSprite.bind(this, prizeItem, picPath))
    }

    /**
     * 載入並設置精靈圖片（新版本，使用新資料結構）
     */
    private _loadAndSetSpriteNew(prizeItem: PrizeItem, imgSourceData?: any, imgSourceBundle?: any): void {
        if (!isValid(prizeItem, true)) {
            return
        }

        // 如果有 Bundle 資料，使用 Bundle 載入
        if (imgSourceBundle && imgSourceData?.filename) {
            Bundle.Find(imgSourceBundle).Load(imgSourceData.filename, SpriteFrame, this._onLoadSprite.bind(this, prizeItem, imgSourceData.filename))
        } 
        // 如果有 AutoLoading 資料，使用 AutoLoadingImg
        else if (imgSourceData) {
            let autoImg = prizeItem.AutoLoadingImgComponent
            if (isValid(autoImg, true)) {
                autoImg.SetImageData(imgSourceData)
            }
        }
    }

    private _onLoadSprite(prizeItem: PrizeItem, picPath: string, err?: Error, spriteFrame?: SpriteFrame): void {
        if (err) {
            log(`[YuruyiNotification] 載入圖片失敗: ${picPath}, 錯誤: ${err.message}`)
            return
        }
        let sprite = prizeItem.node.getComponent(Sprite)
        if (isValid(sprite, true)) {
            sprite.spriteFrame = spriteFrame
        }
    }
    /**
     * 隱藏消息
     */
    private _hideMessage(): void {
        if (this.node.active) {
            this.m_currentEntry = null
            this.node.active = false
            // 呼叫完成回調
            if (this.m_onCompleteCallback) {
                const callback = this.m_onCompleteCallback
                this.m_onCompleteCallback = null
                callback()
            }
        }
    }

    /**
     * 顯示單個消息（用於隊列系統）
     */
    public ShowMessage(data: YuruyiData, onComplete?: () => void): void {
        this.m_currentEntry = data
        this.m_onCompleteCallback = onComplete
        this._prepareView()
        this._setText()
        this._setIcon()

        this.m_messageBgSprite.color = YURUYI_CONSTANTS.HIDE_COLOR
        this.node.active = true
        tween(this.m_messageBgSprite)
            .to(YURUYI_CONSTANTS.ANIMATION_DURATION, { color: YURUYI_CONSTANTS.SHOW_COLOR })
            .delay(data.delayTime || YURUYI_CONSTANTS.DEFAULT_DELAY_TIME)
            .to(YURUYI_CONSTANTS.ANIMATION_DURATION, { color: YURUYI_CONSTANTS.HIDE_COLOR })
            .call(this._hideMessage.bind(this))
            .start()
    }
}

/**
 * 玉如意通知（用於佇列系統）
 * 用於顯示系統獎勵通知
 */
export class YuruyiNotification extends NotificationBase<YuruyiData> {
    constructor(data: YuruyiData) {
        super(data)
    }

    /**
     * 顯示玉如意通知
     */
    public Show(): void {
        if (this.m_isShowing) {
            return
        }

        this._setShowing(true)
        log(`[Yuruyi] 顯示玉如意通知: ${this.m_data.message}`)

        // 通過 Manager 顯示消息，並設置完成回調
        const viewInstance = NotificationSystem.GetYuruyiViewInstance()
        if (viewInstance) {
            viewInstance.ShowMessage(this.m_data, this.Hide.bind(this))
        }
    }

    /**
     * 隱藏玉如意通知
     */
    public Hide(): void {
        if (!this.m_isShowing) {
            return
        }

        log(`[Yuruyi] 隱藏玉如意通知`)
        this._complete()
    }
}


