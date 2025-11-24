import {
    _decorator, Component, Node, Label, Sprite, ProgressBar,
    Vec3, Size, UITransform, log, Mask, director
} from 'cc'
import { FruitSliceGame } from './FruitSliceGame'
import {
    ViewType,
    DownloadType,
    TipType,
    LoadingViewConst,
    LoadingStrings,
    LoadLogoImg
} from './LoadingDefine'
import { Device } from '../Device/Device'
import { Define } from '../Define/GeneralDefine'
import { GameId } from '../Define/GameDefine'
import { PersistLayer } from '../Toolkit/PersistLayer'

const { ccclass, property, menu } = _decorator

@ccclass('LoadingView')
@menu('Loading/LoadingView')
export class LoadingView extends PersistLayer {
    @property({
        type: Node,
        displayName: "News Layer",
        group: "Main"
    })
    private m_newsLayer: Node = null
    @property({
        type: Sprite,
        displayName: "Ad Img",
        group: "Main"
    })
    private m_adImg: Sprite = null
    @property({
        type: Sprite,
        displayName: "Game Ad Image",
        group: "Game"
    })
    private m_gameAdImage: Sprite = null
    @property({
        type: Sprite,
        displayName: "Game Ad Image Portrait",
        group: "Game"
    })
    private m_gameAdImagePortrait: Sprite = null
    @property({
        type: Sprite,
        displayName: "Logo",
        group: "Game"
    })
    private m_logoImage: Sprite = null
    @property({
        type: ProgressBar,
        displayName: "Progress Bar",
        group: "Progress"
    })
    private m_progressBar: ProgressBar = null
    @property({
        type: Node,
        displayName: "Loading Bar Light Dot",
        group: "Progress"
    })
    private m_loadingBarLightDot: Node = null
    @property({
        type: Mask,
        displayName: "Loading Bar Light Mask",
        group: "Progress"
    })
    private m_loadingBarLightMask: Mask = null
    // Text Elements
    @property({
        type: Label,
        displayName: "Percent Text",
        group: "Text"
    })
    private m_percentText: Label = null
    @property({
        type: Label,
        displayName: "Loading Text",
        group: "Text"
    })
    private m_loadingText: Label = null
    @property({
        type: Label,
        displayName: "Loading Info Text",
        group: "Text"
    })
    private m_loadingInfoText: Label = null
    @property({
        type: Label,
        displayName: "Loading Tip Text",
        group: "Text"
    })
    private m_loadingTipText: Label = null
    @property({
        type: Node,
        displayName: "Loading Tip Background",
        group: "Text"
    })
    private m_loadingTipTextBg: Node = null
    @property({
        type: FruitSliceGame,
        displayName: "Fruit Slice Game",
        group: "SubSystem"
    })
    private m_fruitSliceGame: FruitSliceGame = null

    private m_isLoading: boolean = false
    private m_viewType: ViewType = ViewType.NEWS
    private m_downloadType: DownloadType = DownloadType.NORMAL
    private m_percentTimer: number = 0
    private m_percentTimerLimit: number = LoadingViewConst.PERCENT_TIMER_LIMIT
    private m_percent: number = 0
    private m_isInitView: boolean = false
    private m_loadingBarBg: Node = null

    // Loading messages for different languages
    private m_stringContent: string[] = []
    private m_loadingContent: string[] = []
    private m_loadingJsonContent: string[] = []

    private static m_instance: LoadingView = null
    public static get Instance(): LoadingView {
        if (!LoadingView.m_instance) {
            return null
        }
        return LoadingView.m_instance
    }

    protected onLoad(): void {
        this._initializeLoadingMessages()
        this.m_loadingBarBg = this.m_progressBar.node
        this.m_isInitView = true
        this.m_fruitSliceGame.StartGame()
        this.m_fruitSliceGame.node.active = false
        this.SiblingIndex = Define.ZIndex.Global.TRANSITION
        if (LoadingView.m_instance) {
            LoadingView.m_instance.node.destroy()
        }
        LoadingView.m_instance = this
        super.onLoad()
    }

    protected update(deltaTime: number): void {
        if (!this.m_isLoading) return
        this._updatePercent(deltaTime)
    }

    protected override OnOrientationChange(orientation: Device.Orientation): void {
        super.OnOrientationChange(orientation)
        this._updateLayoutPositions(orientation)
        this._configureViewVisibility(orientation)
    }

    // Public API Methods
    public Loading(gameId: GameId = GameId.UNDEF, extraIndex: number = 0): void {
        if (!this.m_isInitView || this.m_isLoading) {
            return
        }

        this.m_viewType = ViewType.NEWS
        this.m_downloadType = DownloadType.NORMAL
        this._showLoading()
        this._loadGameAdAndLogo(gameId, extraIndex)
    }

    public UnLoading(): void {
        if(!this.m_isLoading) {
            return
        }
        this.HideLoading()
    }

    public DownloadLoading(): void {
        if (!this.m_isInitView || (this.m_isLoading && this.m_downloadType === DownloadType.DOWNLOAD)) {
            return
        }

        this.HideLoading()
        this.m_viewType = ViewType.NEWS
        this.m_downloadType = DownloadType.DOWNLOAD
        this._showLoading()
        this.UpdateDownloadPercent(-1)
    }

    private HideLoading(): void {
        this.node.active = false
        this.m_isLoading = false
        this.m_downloadType = DownloadType.NORMAL
        this.m_fruitSliceGame.node.active = false
    }

    public UpdateDownloadPercent(percent: number): void {
        if (percent < 0) {
            this.m_percent = 0
        } else if (percent > LoadingViewConst.PERCENT_MAX) {
            this.m_percent = LoadingViewConst.PERCENT_MAX
        } else if (this.m_percent < percent) {
            this.m_percent = percent
        }
        this._updateProgressDisplay(0)
    }

    public SetDownloadTip(type: TipType, str: string = ""): void {
        let tipStr = ""
        switch (type) {
            case TipType.JOIN_GAME:
                tipStr = this.m_stringContent[0] || LoadingStrings.DEFAULT_MESSAGES.JOIN_GAME
                break
            case TipType.CHECK_UPDATE:
                tipStr = this.m_stringContent[1] || LoadingStrings.DEFAULT_MESSAGES.CHECK_UPDATE
                break
            case TipType.PRE_DOWNLOAD_FILE:
                tipStr = `${LoadingStrings.DEFAULT_MESSAGES.PRE_DOWNLOAD} ${str}`
                break
            case TipType.DOWNLOAD_FILE:
                tipStr = `${LoadingStrings.DEFAULT_MESSAGES.DOWNLOAD_COMPLETED} ${str}`
                break
            case TipType.VERIFY:
                tipStr = this.m_stringContent[2] || LoadingStrings.DEFAULT_MESSAGES.VERIFY
                break
        }

        this.SetLoadingText(tipStr)
    }

    public SetLoadingText(text: string): void {
        if (this.m_loadingText) {
            this.m_loadingText.string = text
        }
    }

    public IsLoadingComplete(): boolean {
        if (this.m_downloadType === DownloadType.DOWNLOAD) {
            return this.m_progressBar ? this.m_progressBar.progress >= 1.0 : false
        }
        return true
    }

    private _showLoading(): void {
        if (this.m_isLoading) return
        this.m_isLoading = true
        this.node.active = true
        // Set random loading tip
        this._setRandomLoadingTip()
        // Configure visibility based on view type
        this._configureViewVisibility()
        // Update positions based on view type and orientation
        this._updateLayoutPositions()
        // Set initial download tip
        this.SetDownloadTip(TipType.CHECK_UPDATE)
        this._resetGameId()
    }

    private _setRandomLoadingTip(): void {
        if (!this.m_loadingTipText) return
        let content = this.m_loadingJsonContent.length > 0
            ? this.m_loadingJsonContent : this.m_loadingContent
        if (content.length > 0) {
            const randomIndex = Math.floor(Math.random() * content.length)
            this.m_loadingTipText.string = content[randomIndex]
        }
    }

    private _configureViewVisibility(orientation: Device.Orientation = Device.Current.Orientation): void {
        const isGame = this.m_viewType === ViewType.GAME
        const isNews = this.m_viewType === ViewType.NEWS

        let isPortrait = orientation === Device.Orientation.PORTRAIT

        if (this.m_newsLayer) {
            this.m_newsLayer.active = isNews
            // TODO: Change by news
            // this.m_adImg.spriteFrame = null
        }
        if(this.m_gameAdImage)
        {
            this.m_gameAdImage.node.active = isGame && !isPortrait
        }
        if(this.m_gameAdImagePortrait)
        {
            this.m_gameAdImagePortrait.node.active = isGame && isPortrait
        }

        // Configure progress elements
        if (this.m_progressBar) {
            this.m_progressBar.node.active = true
        }
        if (this.m_loadingBarBg) {
            this.m_loadingBarBg.active = true
        }
        if (this.m_percentText) {
            this.m_percentText.node.active = true
        }

        // Configure text elements
        if (this.m_loadingText) {
            this.m_loadingText.node.active = true
        }
        if (this.m_loadingInfoText) {
            this.m_loadingInfoText.node.active = true
        }
        if (this.m_loadingTipTextBg) {
            this.m_loadingTipTextBg.active = true
        }

        this.m_fruitSliceGame.node.active = true
    }

    private _updateLayoutPositions(orientation: Device.Orientation = Device.Current.Orientation): void {
        this.m_loadingBarBg.setPosition(orientation === Device.Orientation.PORTRAIT
            ? LoadingViewConst.LOADING_VIEW_PORTRAIT_POSITION
            : LoadingViewConst.LOADING_VIEW_LANSCAPE_POSITION)
    }

    private _initializeLoadingMessages(): void {
        // Initialize based on language - simplified for now
        this.m_stringContent = [
            LoadingStrings.DEFAULT_MESSAGES.JOIN_GAME,
            LoadingStrings.DEFAULT_MESSAGES.CHECK_UPDATE,
            LoadingStrings.DEFAULT_MESSAGES.VERIFY
        ]
        this.m_loadingContent = LoadingStrings.DEFAULT_LOADING_TIPS
    }

    private _updatePercent(deltaTime: number): void {
        this.m_percentTimer += deltaTime
        if (this.m_percentTimer >= this.m_percentTimerLimit) {
            let currentPercent = this.m_progressBar ? this.m_progressBar.progress * LoadingViewConst.PERCENT_MAX : 0
            let targetPercent = Math.min(currentPercent + LoadingViewConst.PERCENT_INCREMENT, this.m_percent)
            targetPercent = Math.min(targetPercent, LoadingViewConst.PERCENT_MAX)
            this._updateProgressDisplay(targetPercent)
            this.m_percentTimer = 0
        }
    }

    private _updateProgressDisplay(percent: number = this.m_percent): void {
        if (this.m_progressBar) {
            this.m_progressBar.progress = percent / LoadingViewConst.PERCENT_MAX
        }

        if (this.m_percentText) {
            this.m_percentText.string = `${Math.floor(percent)}%`
        }

        // Update light effects
        this._updateLoadingBarLight(percent)
    }

    private _updateLoadingBarLight(percent: number): void {
        if (this.m_loadingBarLightMask) {
            const width = LoadingViewConst.LIGHT_MASK_MAX_WIDTH * (percent / LoadingViewConst.PERCENT_MAX)
            const uiTransform = this.m_loadingBarLightMask.node.getComponent(UITransform)
            const height = uiTransform.contentSize.height
            if (uiTransform) {
                uiTransform.setContentSize(new Size(width, height))
            }
        }

        if (this.m_loadingBarLightDot && this.m_progressBar) {
            const preferPosX = LoadingViewConst.LIGHT_DOT_MAX_OFFSET * (percent / LoadingViewConst.PERCENT_MAX)
            const pos = this.m_progressBar.node.getPosition()
            this.m_loadingBarLightDot.setPosition(new Vec3(pos.x + LoadingViewConst.LIGHT_DOT_START_OFFSET + preferPosX, pos.y, 0))
        }
    }

    // ==================== Game Ad and Logo Methods ====================

    /**
     * Load and display game ad and logo based on game ID
     * @param gameId The game ID
     * @param extraIndex Additional index for specific game variants
     */
    private _loadGameAdAndLogo(gameId: GameId, extraIndex: number): void {
        if (!this.m_gameAdImage || !this.m_logoImage) {
            log(`[LoadingView] GameAdImage or LogoImage not assigned`)
            return
        }

        // Change view type to GAME when a specific game is set
        this.m_viewType = ViewType.GAME

        // Load logo using global method
        // LoadLogoImg is a global function that loads logo based on game ID and extra index
        LoadLogoImg(gameId, extraIndex, this.m_logoImage)
    }

    private _resetGameId(): void {
        this.m_logoImage.spriteFrame = null
        this.m_logoImage.node.active = false
    }
}
