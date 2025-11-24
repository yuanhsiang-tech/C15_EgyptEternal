
//================================================================================================
/**
 * - 功能:
 * > Callback 會在所有標記都被移除後執行並只執行一次
 * 
 * - 用法:
 * > 1. 建立 CallbackBond 並設定 Callback
 * > 2. 使用 AddMark 新增標記並在適當時機移除標記 (DelMark)
 * > 3. 所有 AddMark 都執行後要先執行 StartUp 才會開始運作
 * > 4. CallbackBond 會在所有標記都被移除後執行並只執行一次
 * > 5. 若不再需要等待所有標記移除，可以直接呼叫 CloseDown 來強制執行 Callback 並結束運作
 * 
 * - 範例:
 * ```typescript
 * let cbBond = new CallbackBond( () => log("all timers are expired") );
 * for (let i = 0; i < 3; i++) {
 *     let mark = `timer${i}`;
 *     cbBond.AddMark(mark);
 *     setTimeout( () => cbBond.DelMark(mark), 1000 * (i + 1) );
 * );
 * cbBond.StartUp();
 * ```
 * 
 * - 注意:
 * > 1. 需要先呼叫 StartUp 是為了避免 AddMark 後立即 DelMark 直接執行 Callback，會造成後續的 AddMark 無效
 * > 2. 若可以確保所有的 DelMark 會在 AddMark 之後才做，建構時可以設定 quickStart 為 true 則不需呼叫 StartUp
 */
//================================================================================================

export default class CallbackBond
{

    //----------------------------------------------------------------

    public static readonly RESERVED_MARK = "callback_bond.reserved_mark";

    //----------------------------------------------------------------

    private m_isClosed  :boolean = false;
    private m_callback  :Function = null;
    private m_markSet   :Set<string> = null;

    //----------------------------------------------------------------
    /**
     * @param callback 最終執行的 Callback
     * @param quickStart 是否立即開始運作 (不需呼叫 StartUp)
     */
    constructor (callback :Function, quickStart :boolean = false) {
        this.m_isClosed = false;
        this.m_callback = callback;
        this.m_markSet  = new Set<string>();
        !quickStart && this.AddMark( CallbackBond.RESERVED_MARK );
    }

    //----------------------------------------------------------------
    /** 是否已結束 */
    public get IsClosed () :boolean {
        return this.m_isClosed;
    }

    //----------------------------------------------------------------
    /** 開始運作 */
    public StartUp(): void {
        this.DelMark( CallbackBond.RESERVED_MARK );
    }

    //----------------------------------------------------------------
    /** 結束運作並執行 Callback */
    public CloseDown (): void {
        if (!this.m_isClosed) {
            this.m_isClosed = true;
            this.m_markSet.clear();
            this.m_markSet  = null;
            const callback  = this.m_callback;
            this.m_callback = null;
            callback?.();
        }
    }

    //----------------------------------------------------------------
    /** 新增標記 */
    public AddMark (mark :string) :void {
        this.m_markSet?.add(mark);
    }

    //----------------------------------------------------------------
    /** 移除標記 */
    public DelMark (mark :string) :void {
        if (!this.m_isClosed) {
            this.m_markSet.delete(mark);
            this.m_markSet.size <= 0 && this.CloseDown();
        }
    }

    //----------------------------------------------------------------
    /** 是否有標記 */
    public HasMark (mark :string) :boolean {
        return this.m_markSet?.has(mark) ?? false;
    }

    //----------------------------------------------------------------

}
