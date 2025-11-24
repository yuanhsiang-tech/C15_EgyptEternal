import { log } from "cc"
import { Command } from '../Net/Command/Command'
import { GetServerTimeAckSchema, GetServerTimeAck } from '../Proto/service/platformApi/platformApi_pb'
import { RESTfulService } from './Foundation/RESTfulService'
import { ServiceInstance } from './Foundation/Service'
import { TimeConverter } from '../Time/TimeDefine'
import { MicroServiceProtocol } from "../Net/Service/MicroService"

enum ApiPath {
    GET_SERVER_TIME = "GetServerTime",
}

/**
 * Platform Service Delegate Interface
 * All methods are optional - only implement what you need
 */
export interface IPlatformServiceDelegate {
    OnGetServerTimeAck?(serverDate: Date): void
}

@ServiceInstance
export class PlatformService extends RESTfulService {
    public static readonly Instance: PlatformService

    // Cache response data
    private m_serverTimeData: GetServerTimeAck = null

    // Delegate
    private m_delegate: IPlatformServiceDelegate = null

    // ==================== Delegate ====================

    public constructor(type: number, delegate: Partial<MicroServiceProtocol>) {
        super(type, delegate)
    }

    /**
     * Set delegate to receive service callbacks
     */
    public SetDelegate(delegate: IPlatformServiceDelegate): void {
        this.m_delegate = delegate
    }

    protected OnCommand(cmd: Command.RESTfulCommand): void {
        switch (cmd.Type) {
            case ApiPath.GET_SERVER_TIME: {
                this.m_serverTimeData = cmd.Parse(GetServerTimeAckSchema)
                log("PlatformService:OnCommand:GET_SERVER_TIME", this.m_serverTimeData)
                
                if (this.m_serverTimeData.serverTime) {
                    // 將 Protobuf Timestamp 轉換為 Date 目標
                    const serverDate: Date = TimeConverter.TimestampToDate(this.m_serverTimeData.serverTime)
                    
                    // 通知 delegate
                    this.m_delegate?.OnGetServerTimeAck?.(serverDate)
                }
                break
            }
        }
    }

    // ==================== Request Methods ====================

    /**
     * Request server time synchronization
     * 請求伺服器時間同步
     */
    public SyncTime(): void {
        this.SendCommand(ApiPath.GET_SERVER_TIME)
    }

    // ==================== Getter Methods ====================

    /**
     * Get cached server time data
     * 取得緩存的伺服器時間數據
     */
    public GetServerTimeData(): GetServerTimeAck {
        return this.m_serverTimeData
    }

    protected override Reconnect(): boolean {
        // Clear cached data on reconnect
        this.m_serverTimeData = null
        return super.Reconnect()
    }
}


