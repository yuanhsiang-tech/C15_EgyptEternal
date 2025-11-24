import { Prize } from "../Proto/gt2/prize/prize_pb"
import { Type } from "../Proto/gt2/lct/lct_pb"

/**
 * 玩家道具管理器
 * 負責管理玩家持有的道具數量
 */
export class PlayerPrizeManager {
    private m_playerPrizes: Prize[] = []

    private static s_instance: PlayerPrizeManager = null
    
    /**
     * 取得單例實例
     */
    static get Instance(): PlayerPrizeManager {
        if (!this.s_instance) this.s_instance = new PlayerPrizeManager()
        return this.s_instance
    }

    private constructor() {
        // 私有構造函數，確保單例模式
    }

    //================================================================
    // 公共方法 - 數據管理
    //================================================================

    /**
     * 從伺服器數據初始化玩家道具
     * @param playerData 玩家數據數組
     */
    public InitializeFromServerData(playerData: any[]): void {
        this.m_playerPrizes = playerData.map(data => this.CreatePrizeFromData(data))
    }

    /**
     * 從數據創建 Prize 物件
     * @param data 伺服器數據
     */
    private CreatePrizeFromData(data: any): Prize {
        return {
            code: data.itemIndex || data.code,
            amount: typeof data.amount === 'number' ? BigInt(data.amount) : data.amount,
            logCoinType: data.logCoinType || Type.TYPE_UNKNOWN,
            extraNo: data.extraNo || 0
        } as Prize
    }

    /**
     * 添加道具
     * @param prize 道具數據
     */
    public AddPrize(prize: Prize): void {
        const existingPrize = this.FindPrize(prize.code, prize.extraNo)
        if (existingPrize) {
            existingPrize.amount += prize.amount
        } else {
            this.m_playerPrizes.push({ ...prize })
        }
    }

    /**
     * 減少道具數量
     * @param code 道具代碼
     * @param amount 減少數量
     * @param extraNo 額外編號
     * @returns 是否成功減少
     */
    public RemovePrize(code: string, amount: bigint, extraNo: number = 0): boolean {
        const prize = this.FindPrize(code, extraNo)
        if (!prize || prize.amount < amount) {
            return false
        }

        prize.amount -= amount
        if (prize.amount <= 0n) {
            this.DeletePrize(code, extraNo)
        }
        return true
    }

    /**
     * 設置道具數量
     * @param code 道具代碼
     * @param amount 設置數量
     * @param extraNo 額外編號
     * @param logCoinType 日誌幣種類型
     */
    public SetPrizeAmount(code: string, amount: bigint, extraNo: number = 0, logCoinType: Type = Type.TYPE_UNKNOWN): void {
        const existingPrize = this.FindPrize(code, extraNo)
        if (existingPrize) {
            if (amount <= 0n) {
                this.DeletePrize(code, extraNo)
            } else {
                existingPrize.amount = amount
            }
        } else if (amount > 0n) {
            this.m_playerPrizes.push({
                code: code,
                amount: amount,
                logCoinType: logCoinType,
                extraNo: extraNo
            } as Prize)
        }
    }

    /**
     * 刪除指定道具
     * @param code 道具代碼
     * @param extraNo 額外編號
     */
    public DeletePrize(code: string, extraNo: number = 0): void {
        const index = this.m_playerPrizes.findIndex(prize => 
            prize.code === code && prize.extraNo === extraNo
        )
        if (index >= 0) {
            this.m_playerPrizes.splice(index, 1)
        }
    }

    //================================================================
    // 公共方法 - 查詢功能
    //================================================================

    /**
     * 查找指定道具
     * @param code 道具代碼
     * @param extraNo 額外編號
     * @returns Prize 物件或 null
     */
    public FindPrize(code: string, extraNo: number = 0): Prize | null {
        return this.m_playerPrizes.find(prize => 
            prize.code === code && prize.extraNo === extraNo
        ) || null
    }

    /**
     * 取得道具數量
     * @param code 道具代碼
     * @param extraNo 額外編號
     * @returns 道具數量
     */
    public GetPrizeAmount(code: string, extraNo: number = 0): bigint {
        const prize = this.FindPrize(code, extraNo)
        return prize ? prize.amount : 0n
    }

    /**
     * 取得道具數量（數字形式）
     * @param code 道具代碼
     * @param extraNo 額外編號
     * @returns 道具數量的數字值
     */
    public GetPrizeAmountAsNumber(code: string, extraNo: number = 0): number {
        return Number(this.GetPrizeAmount(code, extraNo))
    }

    /**
     * 檢查是否擁有足夠的道具
     * @param code 道具代碼
     * @param requiredAmount 需要的數量
     * @param extraNo 額外編號
     * @returns 是否有足夠數量
     */
    public HasEnoughPrize(code: string, requiredAmount: bigint, extraNo: number = 0): boolean {
        return this.GetPrizeAmount(code, extraNo) >= requiredAmount
    }

    /**
     * 取得所有玩家道具
     * @returns 道具數組的拷貝
     */
    public GetAllPrizes(): Prize[] {
        return [...this.m_playerPrizes]
    }

    /**
     * 根據道具代碼取得所有相關道具
     * @param code 道具代碼
     * @returns 相關道具數組
     */
    public GetPrizesByCode(code: string): Prize[] {
        return this.m_playerPrizes.filter(prize => prize.code === code)
    }

    /**
     * 取得道具總數
     * @returns 道具種類數量
     */
    public GetPrizeCount(): number {
        return this.m_playerPrizes.length
    }

    //================================================================
    // 公共方法 - 排序和工具
    //================================================================

    /**
     * 按道具代碼排序
     * @returns 排序後的道具數組
     */
    public GetSortedPrizesByCode(): Prize[] {
        return [...this.m_playerPrizes].sort((a, b) => a.code.localeCompare(b.code))
    }

    /**
     * 按數量排序
     * @param descending 是否降序排列
     * @returns 排序後的道具數組
     */
    public GetSortedPrizesByAmount(descending: boolean = true): Prize[] {
        return [...this.m_playerPrizes].sort((a, b) => {
            const diff = Number(a.amount - b.amount)
            return descending ? -diff : diff
        })
    }

    /**
     * 按額外編號排序
     * @returns 排序後的道具數組
     */
    public GetSortedPrizesByExtraNo(): Prize[] {
        return [...this.m_playerPrizes].sort((a, b) => a.extraNo - b.extraNo)
    }

    //================================================================
    // 公共方法 - 批量操作
    //================================================================

    /**
     * 批量添加道具
     * @param prizes 道具數組
     */
    public BatchAddPrizes(prizes: Prize[]): void {
        prizes.forEach(prize => this.AddPrize(prize))
    }

    /**
     * 批量設置道具
     * @param prizeData 道具數據數組
     */
    public BatchSetPrizes(prizeData: { code: string; amount: bigint; extraNo?: number; logCoinType?: Type }[]): void {
        prizeData.forEach(data => this.SetPrizeAmount(
            data.code,
            data.amount,
            data.extraNo || 0,
            data.logCoinType || Type.TYPE_UNKNOWN
        ))
    }

    /**
     * 清除所有道具
     */
    public ClearAllPrizes(): void {
        this.m_playerPrizes.length = 0
    }

    /**
     * 清除數量為0的道具
     */
    public CleanupEmptyPrizes(): void {
        this.m_playerPrizes = this.m_playerPrizes.filter(prize => prize.amount > 0n)
    }

    //================================================================
    // 公共方法 - 調試和日志
    //================================================================

    /**
     * 打印所有道具信息（調試用）
     */
    public PrintAllPrizes(): void {
        console.log(`=== 玩家道具列表 (總計: ${this.GetPrizeCount()} 種) ===`)
        this.m_playerPrizes.forEach(prize => {
            console.log(`代碼: ${prize.code}, 數量: ${prize.amount}, 額外編號: ${prize.extraNo}, 類型: ${prize.logCoinType}`)
        })
    }

    /**
     * 取得道具摘要信息
     * @returns 摘要字符串
     */
    public GetPrizeSummary(): string {
        const totalTypes = this.GetPrizeCount()
        const totalAmount = this.m_playerPrizes.reduce((sum, prize) => sum + Number(prize.amount), 0)
        return `道具種類: ${totalTypes}, 總數量: ${totalAmount}`
    }
}
