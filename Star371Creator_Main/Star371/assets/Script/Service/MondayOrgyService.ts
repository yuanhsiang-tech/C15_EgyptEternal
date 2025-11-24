import { Command } from "../Net/Command/Command"
import * as MondayOrgy from "../Proto/service/mondayOrgy/mondayOrgy_pb"
import { ProtoService } from "./Foundation/ProtoService"
import { ServiceInstance } from "./Foundation/Service"

/**
 * Monday Orgy Service Delegate Interface
 * All methods are optional - only implement what you need
 */
export interface IMondayOrgyServiceDelegate {
    OnIsOrgyAck?(data: MondayOrgy.MondayOrgyIsStartToC): void
    OnDataAck?(data: MondayOrgy.MondayOrgyInterfaceDataToC): void
    OnGetKeyAck?(data: MondayOrgy.MondayOrgyGetKeyAckToC): void
    OnOpenTreasureAck?(data: MondayOrgy.MondayOrgyPrizeAckToC): void
    OnAccumulationTreasureAck?(data: MondayOrgy.MondayOrgyAccumulationPrizeAckToC): void
}

@ServiceInstance
export class MondayOrgyService extends ProtoService {
    public static readonly Instance: MondayOrgyService

    // Cache response data
    private m_isStartData: MondayOrgy.MondayOrgyIsStartToC = null
    private m_interfaceData: MondayOrgy.MondayOrgyInterfaceDataToC = null
    private m_getKeyAckData: MondayOrgy.MondayOrgyGetKeyAckToC = null
    private m_prizeAckData: MondayOrgy.MondayOrgyPrizeAckToC = null
    private m_accumulationPrizeAckData: MondayOrgy.MondayOrgyAccumulationPrizeAckToC = null

    // Delegate
    private m_delegate: IMondayOrgyServiceDelegate = null

    // ==================== Delegate ====================

    /**
     * Set delegate to receive service callbacks
     */
    public SetDelegate(delegate: IMondayOrgyServiceDelegate): void {
        this.m_delegate = delegate
    }

    protected OnEnable() {
        super.OnEnable?.()
        this.RequestIsOrgy()
    }

    protected OnCommand(cmd: Command.ProtoCommand) {
        switch (cmd.Type) {
            case MondayOrgy.S2U.S2U_IS_ORGY_ACK: {
                this.m_isStartData = cmd.Parse(MondayOrgy.MondayOrgyIsStartToCSchema)
                this.RequestDataReq()
                this.m_delegate?.OnIsOrgyAck?.(this.m_isStartData)
                break
            }
            case MondayOrgy.S2U.S2U_DATA_ACK: {
                this.m_interfaceData = cmd.Parse(MondayOrgy.MondayOrgyInterfaceDataToCSchema)
                this.m_delegate?.OnDataAck?.(this.m_interfaceData)
                break
            }
            case MondayOrgy.S2U.S2U_GET_KEY_ACK: {
                this.m_getKeyAckData = cmd.Parse(MondayOrgy.MondayOrgyGetKeyAckToCSchema)
                this.m_delegate?.OnGetKeyAck?.(this.m_getKeyAckData)
                break
            }
            case MondayOrgy.S2U.S2U_OPEN_TREASURE_ACK: {
                this.m_prizeAckData = cmd.Parse(MondayOrgy.MondayOrgyPrizeAckToCSchema)
                this.m_delegate?.OnOpenTreasureAck?.(this.m_prizeAckData)
                break
            }
            case MondayOrgy.S2U.S2U_ACCUMULATION_TREASURE_ACK: {
                this.m_accumulationPrizeAckData = cmd.Parse(MondayOrgy.MondayOrgyAccumulationPrizeAckToCSchema)
                this.m_delegate?.OnAccumulationTreasureAck?.(this.m_accumulationPrizeAckData)
                break
            }
        }
    }

    // ==================== Request Methods ====================

    /**
     * Request if Monday Orgy event is active
     * 请求是否有狂欢活动
     */
    public RequestIsOrgy(): void {
        this.SendCommand(MondayOrgy.U2S.U2S_IS_ORGY, null)
    }

    /**
     * Request Monday Orgy interface data
     * 请求狂欢数据
     */
    public RequestDataReq(): void {
        this.SendCommand(MondayOrgy.U2S.U2S_DATA_REQ, null)
    }

    /**
     * Request to get key
     * 请求获得钥匙
     */
    public RequestGetKey(): void {
        this.SendCommand(MondayOrgy.U2S.U2S_GET_KEY, null)
    }

    /**
     * Request to open treasure chest
     * 请求打开宝箱
     */
    public RequestOpenTreasure(): void {
        this.SendCommand(MondayOrgy.U2S.U2S_OPEN_TREASURE, null)
    }

    /**
     * Request to open accumulation treasure chest
     * 请求打开累积宝箱
     */
    public RequestOpenAccumulationTreasure(): void {
        this.SendCommand(MondayOrgy.U2S.U2S_ACCUMULATION_TREASURE, null)
    }

    // ==================== Getter Methods ====================

    /**
     * Get cached interface data
     * 获取缓存的界面数据（主要数据源）
     */
    public GetInterfaceData(): MondayOrgy.MondayOrgyInterfaceDataToC {
        return this.m_interfaceData
    }

    protected override Reconnect(): boolean {
        // Clear cached data on reconnect
        this.m_isStartData = null
        this.m_interfaceData = null
        this.m_getKeyAckData = null
        this.m_prizeAckData = null
        this.m_accumulationPrizeAckData = null
        return super.Reconnect()
    }
}
