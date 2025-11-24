import { warn } from "cc"
import { Command } from "../Net/Command/Command"
import * as GoldenPig from "../Proto/service/goldenPig/goldenPig_pb"
import { ProtoService } from "./Foundation/ProtoService"
import { ServiceInstance } from "./Foundation/Service"
import { EventDispatcher } from "../../Stark/Utility/EventDispatcher"
import { ServerTime } from "../Time/ServerTimeCore"
import { TimeConverter } from "../Time/TimeDefine"

/** Golden Pig Service 事件 */
export enum GoldenPigServiceEvent {
    DataReceived = "GOLDEN_PIG_SERVICE_EVENT.data_received",
    PigBroken = "GOLDEN_PIG_SERVICE_EVENT.pig_broken",
    PigBreakFailed = "GOLDEN_PIG_SERVICE_EVENT.pig_break_failed",
    AdDataReceived = "GOLDEN_PIG_SERVICE_EVENT.ad_data_received",
    AdWatched = "GOLDEN_PIG_SERVICE_EVENT.ad_watched",
    AdWatchFailed = "GOLDEN_PIG_SERVICE_EVENT.ad_watch_failed",
    AutoBreakCompleted = "GOLDEN_PIG_SERVICE_EVENT.auto_break_completed",
    ReadyToShow = "GOLDEN_PIG_SERVICE_EVENT.ready_to_show"
}

/** Golden Pig Service 事件回調 */
export type GoldenPigServiceEventCallback = (eventData?: any, ...args: any[]) => void

@ServiceInstance
export class GoldenPigService extends ProtoService {
    public static readonly Instance: GoldenPigService

    // Cache response data
    private m_goldenPigInfo: GoldenPig.PlayerGoldenPigInfo = null
    private m_brokenPigResult: GoldenPig.BrokenGoldenPigResult = null
    private m_adData: GoldenPig.GoldenPigADData = null
    private m_watchAdResult: GoldenPig.BrokenGoldenPigAdResult = null

    private m_nextTreasureTime: Date = null

    // Event Dispatcher
    private m_dispatcher: EventDispatcher = null

    // ==================== Event System ====================

    private get Dispatcher(): EventDispatcher {
        return this.m_dispatcher || (this.m_dispatcher = new EventDispatcher())
    }

    /**
     * Register event listener
     */
    public On(event: GoldenPigServiceEvent, callback: GoldenPigServiceEventCallback, target?: any): void {
        this.Dispatcher.On(event, callback, target)
    }

    /**
     * Register one-time event listener
     */
    public Once(event: GoldenPigServiceEvent, callback: GoldenPigServiceEventCallback, target?: any): void {
        this.Dispatcher.Once(event, callback, target)
    }

    /**
     * Unregister event listener
     */
    public Off(event: GoldenPigServiceEvent, callback: GoldenPigServiceEventCallback, target?: any): void {
        this.Dispatcher.Off(event, callback, target)
    }

    /**
     * Dispatch event to all listeners
     */
    private Dispatch(event: GoldenPigServiceEvent, eventData?: any, ...args: any[]): void {
        this.Dispatcher.Dispatch(event, eventData, ...args)
    }

    protected OnCommand(cmd: Command.ProtoCommand) {
        switch (cmd.Type) {
            case GoldenPig.S2U.S2U_REPLY_NEW_GOLDEN_PIG: {
                this.m_goldenPigInfo = cmd.Parse(GoldenPig.PlayerGoldenPigInfoSchema)
                this._handleGoldenPigData()
                break
            }
            case GoldenPig.S2U.S2U_REPLY_BROKEN_GOLDEN_PIG_RESULT: {
                this.m_brokenPigResult = cmd.Parse(GoldenPig.BrokenGoldenPigResultSchema)
                this._handleBrokenPigResult()
                break
            }
            case GoldenPig.S2U.S2U_REPLY_AD_DATA: {
                this.m_adData = cmd.Parse(GoldenPig.GoldenPigADDataSchema)
                this._handleAdData()
                break
            }
            case GoldenPig.S2U.S2U_REPLY_WATCH_AD_RESULT: {
                this.m_watchAdResult = cmd.Parse(GoldenPig.BrokenGoldenPigAdResultSchema)
                this._handleWatchAdResult()
                break
            }
        }
    }

    // ==================== Business Logic ====================

    private _handleGoldenPigData() {
        warn("金豬資料:", this.m_goldenPigInfo)
        if (!this.m_goldenPigInfo?.dataList?.dataList) {
            return
        }
        let availablePigs = this.m_goldenPigInfo.dataList.dataList
        if (availablePigs.length <= 0) {
            this.RequestAdData()
            this.m_nextTreasureTime = null
        }
        else {
            this.m_nextTreasureTime = ServerTime.GetTime(availablePigs[0].needOnlineSeconds * 1000 - 50)
        }
        warn("下次可敲破時間:", this.NextTreasureTime)
        let nextResetTime = TimeConverter.TimestampToDate(this.m_goldenPigInfo.nextResetTime)
        warn("下次重置時間:", nextResetTime)
        warn("是否準備敲破:", this.IsReadyBroke)
        this.Dispatch(GoldenPigServiceEvent.DataReceived)
    }

    /**
     * 處理敲破金豬結果
     */
    private _handleBrokenPigResult(): void {
        warn("敲破金豬結果:", this.m_brokenPigResult)
        let result = this.m_brokenPigResult
        if (!result) {
            return
        }

        if (result.result === GoldenPig.GoldenPigResult.SUCCESS) {
            warn("金豬敲破成功！獎勵:", result)
            this.Dispatch(GoldenPigServiceEvent.PigBroken, result)
            this.m_goldenPigInfo.dataList.dataList.splice(0, 1)
            this._handleGoldenPigData()
        } else {
            warn("金豬敲破失敗，結果:", result)
            this.Dispatch(GoldenPigServiceEvent.PigBreakFailed, result)
            this.RequestGoldenPigData()
        }
    }

    private _handleAdData(): void {
        warn("廣告資料:", this.m_adData)
        if (!this.m_adData) {
            return
        }
        let adData = this.m_adData
        // client 倒數稍稍快一些
        if (adData.remainingTimes <= 0) {
            this.m_nextTreasureTime = null
        } else {
            this.m_nextTreasureTime = ServerTime.GetTime(adData.cdSecond * 1000 - 50)
        }
        this.Dispatch(GoldenPigServiceEvent.AdDataReceived, adData)
        warn("下次可敲破時間:", this.NextTreasureTime)
        warn("是否準備敲破:", this.IsReadyBroke)
        warn("是否可以看廣告:", this.IsNextTreasureAd)
    }

    /**
     * 處理看廣告結果
     */
    private _handleWatchAdResult(): void {
        warn("看廣告結果:", this.m_watchAdResult)
        if (!this.m_watchAdResult) {
            return
        }
        let result = this.m_watchAdResult
        if (!result) {
            return
        }

        this.RequestAdData()
        if (result.result === GoldenPig.GoldenPigAdResult.SUCCESS) {
            warn("看廣告成功！獎勵:", result)
            this.m_nextTreasureTime = null
            this.Dispatch(GoldenPigServiceEvent.AdWatched, result)
        } else {
            warn("看廣告失敗，結果:", result)
            this.Dispatch(GoldenPigServiceEvent.AdWatchFailed, result)
        }
    }

    // ==================== Request Methods ====================

    /**
     * Request golden pig data
     * 請求金豬資料
     */
    public RequestGoldenPigData(): void {
        warn("請求金豬資料")
        this.SendCommand(GoldenPig.U2S.U2S_REQUEST_GOLDEN_PIG)
    }

    /**
     * Request to break golden pig and get reward
     * 請求殺豬取錢
     */
    public RequestBrokenGoldenPig(): void {
        let level = this.m_goldenPigInfo.dataList.dataList[0].level
        warn("請求殺豬取錢, 金豬等級:", level)
        const request = ProtoCreate(GoldenPig.BrokenGoldenPigRequestSchema, { level: level })
        this.SendCommand(GoldenPig.U2S.U2S_REQUEST_BROKEN_GOLDEN_PIG, request)
    }

    /**
     * Request advertisement data
     * 請求看廣告資料
     */
    public RequestAdData(): void {
        warn("請求看廣告資料")
        this.SendCommand(GoldenPig.U2S.U2S_REQUEST_AD_DATA)
    }

    /**
     * Request to watch advertisement and get reward
     * 請求看廣告取錢
     */
    public RequestWatchAd(): void {
        warn("請求看廣告取錢")
        this.SendCommand(GoldenPig.U2S.U2S_REQUEST_WATCH_AD)
    }

    // ==================== Getter Methods ====================

    /**
     * Get cached golden pig info data
     * 獲取緩存的金豬資料
     */
    public get GoldenPigInfo(): GoldenPig.PlayerGoldenPigInfo {
        return this.m_goldenPigInfo
    }

    /**
     * Get cached advertisement data
     * 獲取緩存的廣告資料
     */
    public get AdData(): GoldenPig.GoldenPigADData {
        return this.m_adData
    }

    public get IsReadyBroke(): boolean {
        return this.m_nextTreasureTime && this.m_nextTreasureTime <= ServerTime.Now
    }

    public get NextTreasureTime(): Date {
        return this.m_nextTreasureTime
    }

    public get HasNextTreasure(): boolean {
        return !!this.m_nextTreasureTime
    }

    public get IsNextTreasureAd(): boolean {
        if (this.m_goldenPigInfo?.dataList?.dataList?.length > 0) {
            return false
        }
        if (this.m_adData?.remainingTimes <= 0) {
            return false
        }
        return true
    }

    protected OnDestroy(): void {
        // Clear event dispatcher
        this.m_dispatcher?.Clear?.()
        this.m_dispatcher = null
        super.OnDestroy?.()
    }
}