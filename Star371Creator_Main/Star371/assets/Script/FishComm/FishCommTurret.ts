import { Button, Component, Label, Node, Sprite, UIOpacity, UITransform, Vec2, Vec3, _decorator, clamp, color, macro, sys, v2, v3 } from 'cc'
import { Trans3DPos, TransUIPos, Get3Dto2DPos, Get2Dto3DPos } from './Helper'
import LockTargetHint from './Component/LockTargetHint'

export enum eState {
    NoPlayer,
    MainPlayer,
    OtherPlayer,
}

const tmp_v2 = v2();
class BulletInfo {
    id: number
    bet: number
    cost: number
    node: Node
}

const abbrDigit: number = 1  // 縮寫保留長度
const { ccclass, property } = _decorator

@ccclass
export default class Turret extends Component {

    @property({
        tooltip: '砲台旋轉點',
        type: Node
    })
    pivot: Node = null

    @property({
        tooltip: '啟用砲台時要打開的節點',
        type: [Node]
    })
    activeNodes: Node[] = []

    @property({
        tooltip: '消耗數字',
        type: Label
    })
    betText: Label = null

    @property({
        tooltip: '自己的財產數字',
        type: Label
    })
    selfCoinText: Label = null


    @property({
        tooltip: '金額加錢的節點',
        type: Node
    })
    coinAddPosNode: Node = null

    @property({
        tooltip: '獎圈的位置節點',
        type: Node
    })
    rewardPosNode: Node = null

    @property({
        tooltip: '玩家位置提示',
        type: Node
    })
    locationTip: Node = null

    @property({
        tooltip: '增加 bet 按鈕',
        type: Button
    })
    plusBtn: Button = null

    @property({
        tooltip: '減少 bet 按鈕',
        type: Button
    })
    minusBtn: Button = null

    @property({
        tooltip: '金幣獎勵文字淡出起始點',
        type: Node
    })
    coinFade: Node = null

    @property({
        type: Node,
        tooltip: "砲台按鈕根節點",
        group: { name: "Optional", style: "section" }
    })
    cannonBtnRoot: Node = null

    @property({
        tooltip: '其他人的財產背景',
        type: Node,
        group: { name: "Optional", style: "section" }
    })
    otherCoinBg: Node = null
    
    @property({
        tooltip: '攻擊力框',
        type: Node,
        group: { name: "Optional", style: "section" }
    })
    betBox: Node = null

    @property({
        type: Node,
        tooltip: "砲台按鈕要掛的節點",
        group: { name: "Optional", style: "section" }
    })
    btnRootParent: Node = null

    @property({
        tooltip: '鎖定目標提示元件',
        type: LockTargetHint,
        group: { name: "Optional", style: "section" }
    })
    lockTargetHint: LockTargetHint = null

    @property({
        tooltip: '金幣數字節點',
        type: Node,
        group: { name: "Optional", style: "section" }
    })
    coinNumNode: Node = null

    @property({
        tooltip: '空座位提示',
        type: Node,
        group: { name: "Optional", style: "section" }
    })
    waitTip: Node = null

    seat: number = -1                                  // 座位編號
    // cannon: IBaseCannon = null                         // 砲台
    cannon: Node = null
    goldCoinPosEL: Vec3 = null                         // 金幣圖示的位置 (EffectLayer 的座標系)
    coinText: Label = null                             // 金幣文字

    static eState = eState                             // 砲台狀態 (enum)
    protected cannonType: number = -1                     // 當前砲台種類
    private state: eState = 0                          // 玩家狀態
    private bet: number = 0
    private pivotPosBL: Vec3 = null                    // 砲台旋轉點位置
    private lockFlg: boolean = false                  // 是否禁止射擊
    private playerUsedFlg: boolean = false            // 是否玩家有過操作
    private lockTimer: Function = null                 // 鎖定射擊的計時器
    private bltList: BulletInfo[] = []

    private pressSubbetButton: boolean = false         // 減少bet按鈕
    private pressSubbetFast: boolean = false           // 減少按鈕長壓加速
    private pressSubTime: number = 0                   // 減少bet按鈕長壓時間
    private pressAddbetButton: boolean = false         // 增加bet按鈕
    private pressAddbetFast: boolean = false           // 增加按鈕長壓加速
    private pressAddTime: number = 0                   // 增加bet按鈕長壓時間

    private lockIDCounter: number = 0                  // 用於追蹤當前正在進行的表演數量
    private lockScheduleMap: Map<number, Function> = new Map<number, Function>()    // 用於追蹤當前正在進行的表演數量
    private accountId: number = -1                     // 玩家account id
    private shootCdExtraRateList: number[] = []        // 射擊冷卻時間加成
    private characterId: number = -1                    // 玩家角色 id
    private replaceCannonTypeMap: Map<number, number> = new Map<number, number>
    
    private _nonAimShootEnable: boolean = true      // 是否可用非鎖定射擊
    get nonAimShootEnable(): boolean {
        return this._nonAimShootEnable
    }
    set nonAimShootEnable(b: boolean) {
        this._nonAimShootEnable = b
    }

    public get AccountId(): number {
        return this.accountId
    }



    onLoad() {
        if(this.plusBtn){
            this.plusBtn.node.on(Node.EventType.TOUCH_START, () => { this.clickbetBtn(null, '+') })
            this.plusBtn.node.on(Node.EventType.TOUCH_END, () => { this.pressAddbetButton = false; this.pressAddTime = 0; this.pressAddbetFast = false })
            this.plusBtn.node.on(Node.EventType.TOUCH_CANCEL, () => { this.pressAddbetButton = false; this.pressAddTime = 0; this.pressAddbetFast = false })
        }

        if(this.minusBtn){
            this.minusBtn.node.on(Node.EventType.TOUCH_START, () => { this.clickbetBtn(null, '-') })
            this.minusBtn.node.on(Node.EventType.TOUCH_END, () => { this.pressSubbetButton = false; this.pressSubTime = 0; this.pressSubbetFast = false })
            this.minusBtn.node.on(Node.EventType.TOUCH_CANCEL, () => { this.pressSubbetButton = false; this.pressSubTime = 0; this.pressSubbetFast = false })
        }

    }

    start() {
        // this.pivotPosBL = Trans3DPos(FishComm.node.bulletLayer, this.pivot)  // 砲管旋轉點轉換到子彈圖層的座標系
        this.scheduleOnce(() => this.updatePositions())
    }

    update(dt: number) {
        if (this.pressAddbetButton === true) {
            this.pressAddTime += dt
            let bFast = this.pressAddbetFast ? .05 : .5
            if (this.pressAddTime >= bFast) {
                this.pressAddbetFast = true
                this.clickbetBtn(null, '+')
                this.pressAddTime = 0
            }
        }

        if (this.pressSubbetButton === true) {
            this.pressSubTime += dt
            let bFast = this.pressSubbetFast ? .05 : .5
            if (this.pressSubTime >= bFast) {
                this.pressSubbetFast = true
                this.clickbetBtn(null, '-')
                this.pressSubTime = 0
            }
        }
    }

    onDestroy() {
        if (this.lockTimer) this.lockTimer = null
       
    }

    private onCanvasResize() {
        this.scheduleOnce(() => this.updatePositions())
    }

    /**
     * 砲口對準指定點
     */
    aimAt(posBL: Vec3) {
        let a = posBL, b = this.pivotPosBL
        let v = tmp_v2.set(a.x - b.x, a.y - b.y)
        if (v.lengthSqr() > 0) {
            let r = Vec2.UNIT_Y.signAngle(v) * macro.DEG
            this.pivot.setWorldRotationFromEuler(0, 0, r)
            this.pivot.angle = clamp(this.pivot.eulerAngles.z, -87, 87)
        }
    }

    /**
     * 更換砲台 (若該類型砲台有額外砲衣)
     */
    switchCannon(type: number) {
        if (this.pivot.activeInHierarchy === false)
            return

        // 替換cannon type
        if (this.replaceCannonTypeMap.has(type)) {
            type = this.replaceCannonTypeMap.get(type)
        }

        // 砲衣有所改變才需要轉換砲台
        if (!this.cannon || this.cannonType !== type) {
            this.cannonType = type
            let pivot = this.pivot
            let cannNode = null as Node
            let cannon: Node = null


            // 回收舊砲台
            // for (let i = pivot.children.length - 1; i >= 0; --i) {
            //     cannon = getComponentByName(pivot.children[i], IBaseCannon)
            //     if(cannon == null) {
            //         continue
            //     }

            //     cannNode = pivot.children[i]
            //     cannon.remove()
            //     this.isMe ? FishComm.dataMgr.setTurretCannon(cannNode) : FishComm.dataMgr.setTurretCannon_2(cannNode)
            // }

            // 取得新砲台
            // cannNode = this.isMe ? FishComm.dataMgr.getTurretCannon(type) : FishComm.dataMgr.getTurretCannon_2(type)
            // this.cannon = getComponentByName(cannNode, IBaseCannon)
            // cannNode.setParent(pivot)
            // this.cannon.equip(this.seat)
            // this.cannon.setCharacterId(this.characterId)


            // 是否將固定 Favors 以下的魚透明度減半
            if (this.isMe) {
                FishComm.fishMgr.setFavorsThreshold(this.getFavorsThreshold())
            }

            this.setWeakCannon(this.state == Turret.eState.NoPlayer)
        }
        // this.cannon.updateSkin()
    }

    /**
     * 設定 bet
     */
    setbet(bet: number) {
        this.bet = bet
        this.betText.string = bet.toString()
        this.setbetEnable()
    }
    
    /**
     * 取得消耗
     */
    getbet(): number {
        return this.bet
    }

    /**
     * 切換 bet (提供給 Button 元件使用)
     */
    clickbetBtn(e: Event, data: string) {
        if(data === '+' && !this.plusBtn.interactable) return
        if(data === '-' && !this.minusBtn.interactable) return

        if (data === '+') {
            this.pressAddbetButton = true
        }
        else if (data === '-') {
            this.pressSubbetButton = true
        }

        // let beforeIdx = FishComm.gameCtrl.betIndex
        // let newIdx = beforeIdx + (data === '+' ? 1 : -1)
        // newIdx = clamp(newIdx, 0, FishComm.gameCtrl.betList.length - 1)

        // if (beforeIdx !== newIdx) {
        //     FishComm.gameCtrl.changebet(FishComm.gameCtrl.betList[newIdx])
        // }

        // 記錄玩家的 bet
        sys.localStorage.setItem(`bet${FishComm.gameCtrl.theme}`, this.bet.toString()) 
    }

    setbetEnable(b: boolean = true){
        if(!this.isMe) return
        // let idx = FishComm.gameCtrl.betIndex
        let plus = this.plusBtn
        let minus = this.minusBtn
        if (plus) {
            let toggle = b
            // if (b) toggle = idx < FishComm.gameCtrl.betList.length - 1 ? true : false
            if (plus.interactable !== toggle) {
                plus.interactable = toggle
                plus.target.getComponent(Sprite).color = toggle? color(255, 255, 255, 255) : color(100, 100, 100, 255)
            }
        }
        if (minus) {
            let toggle = b
            // if (b) toggle = idx > 0 ? true : false
            if (minus.interactable !== toggle) {
                minus.interactable = toggle
                minus.target.getComponent(Sprite).color = toggle? color(255, 255, 255, 255) : color(100, 100, 100, 255)
            }
        }
    }

    /**
     * 設定砲台的使用狀態
     */
    setPlayer(state: eState, accountId: number = -1) {
        this.state = state
        this.accountId = accountId
        this.shootCdExtraRateList.length = 0
        switch (state) {
            case Turret.eState.NoPlayer: {
                // 無玩家使用, 顯示等待加入
                this.setPlayerDisplay(false)
                this.setCoinText(false, false)
                this.setLocationHint(false)
                this.setWaitingDisplay(true)
                this.setWeakDisplay(true)
                this.setWeakCannon(true)
                this.setbetDisplay(false, false)
                this.lockTargetHint?.hide()
                break
            }
            case Turret.eState.MainPlayer: {
                // 玩家本人使用, 顯示全部
                // 提示玩家位置
                this.setPlayerDisplay(true)
                this.setCoinText(true, true)
                this.setLocationHint(true)
                this.setWaitingDisplay(false)
                this.setWeakDisplay(false)
                this.setbetDisplay(true, true)
                this.setWeakCannon(false)
                break
            }
            case Turret.eState.OtherPlayer: {
                // 其他玩家使用, 半透明化
                this.setPlayerDisplay(true)
                this.setCoinText(true, false)
                this.setLocationHint(false)
                this.setWaitingDisplay(false)
                this.setWeakDisplay(false)
                this.setbetDisplay(true, false)
                this.setWeakCannon(false)
                this.lockTargetHint?.hide()
                break
            }
        }
    }

    /**
     * 禁止射擊 (上鎖後預設 30 秒會自動解鎖)
     * @param lockSec 鎖定秒數
     * @returns 鎖定 ID
     */
    lock(lockSec: number = 30): number {
        this.lockIDCounter++
        const timeout = this.unlock.bind(this, this.lockIDCounter)
        this.scheduleOnce(timeout, lockSec)
        this.lockScheduleMap.set(this.lockIDCounter, timeout)
        this.lockFlg = true
        FishComm.shootMgr.resetPressing()  // 重置點擊狀態，避免解鎖後立即發射
        return this.lockIDCounter
    }

    unlock(id: number) {
        if(this.isValid == false) {
            return
        }
        
        const timeout = this.lockScheduleMap.get(id)
        if(timeout == null) {
            return
        }

        this.unschedule(timeout)
        this.lockScheduleMap.delete(id)
        if(this.lockScheduleMap.size <= 0) {
            this.lockFlg = false
        }
    }

    /**
     * 關閉玩家位置提示
     */
    setPlayerUsedFlg(toggle: boolean) {
        if (this.playerUsedFlg !== toggle) {
            if (toggle === true) {
                this.setLocationHint(false)
            }
            this.playerUsedFlg = toggle
        }
    }

    /**
     * 是否禁止射擊
     */
    isLocked(): boolean {
        return this.lockFlg
    }

    /**
     * 語系變更，更新金額顯示
     */
    private onLangChanged() {
        // this.setCoin(walletManager.getPlayerRemains(this.seat))
        this.setbet(this.bet)
    }

    /**
     * 設定砲台金額
     */
    setCoin(coin: number) {
        // 滾錢中不更新
        if(FishComm.commonUI.isCoinScrolling()) {
            return
        }
        if (this.coinText == null) {
            return
        }
        // this.coinText.string = walletManager.FormatCoinNum(coin, true)
    }

    /**
     * 砲台位置提示
     */
    setLocationHint(toggle: boolean) {
        if (this.locationTip !== null)
            this.locationTip.active = toggle
    }

    /**
     * 設置玩家座位的介面顯示
     */
    setPlayerDisplay(toggle: boolean) {
        this.activeNodes.forEach(node => node.active = toggle)
    }

    /**
     * 顯示消耗按鈕
     */
    setbetDisplay(showBox: boolean, showBtn: boolean) {
        if(this.plusBtn){
            this.plusBtn.node.active = showBtn
            this.plusBtn.target.active = showBtn
            this.plusBtn.interactable = showBtn
            this.minusBtn.node.active = showBtn
            this.minusBtn.target.active = showBtn
            this.minusBtn.interactable = showBtn
        }
        if(this.betBox) {
            this.betBox.active = showBox
        }
    }

    setCoinText(active: boolean, isMe: boolean) {
        if(isMe) {
            this.coinText = this.selfCoinText
            this.coinAddPosNode.active = false
            if(this.otherCoinBg) {
                this.otherCoinBg.active = false
            }
        }
        else {
            this.coinAddPosNode.active = active  // 只有別家需要顯示
        }
        this.coinText.node.active = active
    }

    /**
     * 弱化機台顯示
     */
    setWeakDisplay(toggle: boolean) {
        let opa = toggle ? 127 : 255
        this.activeNodes.forEach(node => {
            node.getComponentsInChildren(UIOpacity).forEach(child => {
                child.opacity = opa
            })
        })
    }

    /**
     * 機台是否等待中
     */
    setWaitingDisplay(toggle: boolean) {
        this.coinText.node.active = !toggle
        this.betText.node.active = !toggle
        if(this.waitTip) this.waitTip.active = toggle
    }

    private setWeakCannon(toggle: boolean) {
        if(this.cannon == null) {
            return
        }
        const opa: number = toggle ? 127 : 255
        this.cannon.getComponentsInChildren(UIOpacity).forEach(child => {
            if(child.getComponent(Sprite) != null) {
                child.opacity = opa
            }
        })
    }

    /**
     * 取得砲台的使用狀態
     */
    getState(): eState {
        return this.state
    }

    /**
     * 取得砲台的編號
     */
    getType(): number {
        return this.cannonType
    }

    /**
     * 砲台是否有玩家
     */
    hasPlayer(): boolean {
        return this.state != eState.NoPlayer
    }

    /**
     * 取得獎圈的位置節點
     */
    getRewardPosNode(): Node {
        return this.rewardPosNode
    }

    /**
     * 本地端發射子彈
     */
    shoot(touchPosFL: Vec3, bltId: number, fishId: number): boolean {
        if (!this.cannon)
            return false


        if (this.state === eState.OtherPlayer) {
            if(fishId > 0){
                let fish = FishComm.fishMgr.getFishById(fishId)
                // 其他家如果目標不存在就不發射
                if (!fish) return false
                // 修正touchPosFL  避免其他家aimAt方向錯誤
                touchPosFL = FishComm.shootMgr.getLockPosition(fish.node)
                if(!FishComm.shootMgr.checkRange(touchPosFL)) return false
                this.lockTargetHint?.setTarget(fish.getFishNo())
            }
            else{
                // touchPosFL 針對對家修正
                if((FishComm.gameCtrl.getPlayerSeat() >= FishComm.maxSidePlayerCnt) != (this.seat >= FishComm.maxSidePlayerCnt)){
                    touchPosFL = touchPosFL.multiplyScalar(-1)
                }
                this.lockTargetHint?.hide()
            }
        }
        else {
            if(fishId > 0){
                let fish = FishComm.fishMgr.getFishById(fishId)
                // if (fish) 
                    this.lockTargetHint?.setTarget(fish.getFishNo())
            }
            else {
                this.lockTargetHint?.hide()
            }
        }

        // 關閉玩家提示資訊
        if (!this.playerUsedFlg) {
            this.setLocationHint(false)
            this.playerUsedFlg = true
        }

        // 更新砲台角度
        this.aimAt(touchPosFL)

        // 執行射擊
        // this.cannon.shoot(touchPosFL, bltId, fishId, this.bet)
        return true
    }

    /**
     * 記錄發射的子彈資訊
     */
    addBulletList(bltId: number, bet: number, cost: number, bulletNode: Node) {
        this.bltList.push({
            id: bltId,
            bet: bet,
            cost: cost,
            node: bulletNode,
        })
    }

    /**
     * 取得發射的子彈資訊
     */
    getBulletFromList(bltId: number): BulletInfo {
        let bltList = this.bltList
        let lastIdx = bltList.length - 1
        for (let i = 0; i <= lastIdx; ++i) {
            if (bltList[i].id === bltId) {
                [bltList[i], bltList[lastIdx]] = [bltList[lastIdx], bltList[i]]
                return bltList.pop()
            }
        }
        return null
    }

    /**
     * 砲台當前的子彈命中次數
     */
    getCannonHitCount(): number {
        // return this.cannon?.getHitCount() ?? 1
        return 1
    }

    /**
     * 砲台當前的射擊favors門檻
     */
    getFavorsThreshold(): number {
        // return this.cannon?.getFavorsThreshold() ?? 1
        return 1
    }

    
    updatePositions(){
        this.updateCoinPosEL()
        this.updateCannonButtonRoot()
    }

    /**
     * 更新硬幣回收座標
     */
    updateCoinPosEL(){
        if(!this.coinAddPosNode) {
            this.goldCoinPosEL = v3()
            return
        }
        if(FishComm.is3DGame){
            let screenPos = FishComm.cam2.worldToScreen(this.coinAddPosNode.worldPosition)
            let uiTrans = FishComm.node.effectLayer.getComponent(UITransform)
            this.goldCoinPosEL = uiTrans.convertToNodeSpaceAR(Get2Dto3DPos(FishComm.cam3, screenPos))
        }
        else{
            this.goldCoinPosEL = TransUIPos(FishComm.node.effectLayer, this.coinAddPosNode)
        }
    }

    /**
     * 更新硬幣回收座標
     */
    getCoinPos2DEL(){
        return TransUIPos(FishComm.node.effectLayer, this.coinAddPosNode)
    }

    /**
     * 更新砲台按鈕根節點位置
     */
    protected updateCannonButtonRoot() {
        if(this.cannonBtnRoot == null) {
            return
        }

        if(this.isMe == false) {
            return
        }

        const root: Node = this.btnRootParent ?? this.pivot
        let worldPosition: Vec3 = root.worldPosition.clone()
        if(root.getComponent(UITransform) == null) {
            worldPosition = Get3Dto2DPos(FishComm.cam3, FishComm.cam2, worldPosition)
        }
        
        this.cannonBtnRoot.setWorldPosition(worldPosition)
    }

    get isMe(): boolean{
        return this.state === eState.MainPlayer
    }



    getShootCD(): number {
        // return (this.cannon?.getCooldown() ?? 0.5) * this.getShootCDExRate()
        return 0.5
    }

    // 加入射擊冷卻時間加成
    addShootCDExtraRate(rate: number) {
        this.shootCdExtraRateList.push(rate)
    }

    // 移除射擊冷卻時間加成
    removeShootCDExtraRate(rate: number) {
        let idx = this.shootCdExtraRateList.indexOf(rate)
        if (idx >= 0) {
            this.shootCdExtraRateList.splice(idx, 1)
        }
    }

    // 取得射擊冷卻時間加成, 所有加成相乘
    getShootCDExRate(): number {
        let exRate = 1
        this.shootCdExtraRateList.forEach(rate => exRate *= rate)
        return exRate
    }

    getAccountId(): number {
        return this.accountId
    }

    // 設定鎖定目標, fishNo沒有對應icon時中間icon會隱藏
    setLockTarget(fishNo: number) {
        this.lockTargetHint?.setTarget(fishNo)
    }

    hideLockTarget() {
        this.lockTargetHint?.hide()
    }

    /**
     * 修改砲台旋轉點位置
     */
    changePivotPos(pos: Vec3) {
        this.pivot.setPosition(pos)
        // this.pivotPosBL = Trans3DPos(FishComm.node.bulletLayer, this.pivot)  // 砲管旋轉點轉換到子彈圖層的座標系
    }

    /**
     * 設定砲台是否顯示
     * @param visible 是否顯示砲台
     */
    setCannonVisible(visible: boolean) {
        this.pivot.active = visible
    }

    setCharacterId(id: number) {
        this.characterId = id
        // this.cannon?.setCharacterId(this.characterId)
    }

    getCharacterId(): number {
        return this.characterId
    }

}
