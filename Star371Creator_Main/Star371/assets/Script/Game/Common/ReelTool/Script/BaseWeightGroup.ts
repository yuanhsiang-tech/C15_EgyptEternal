import { _decorator, log, error, v3, isValid } from 'cc';
import { EnvConfig } from 'db://assets/Script/Define/ConfigDefine';

export enum TRACK_MODE {
    MODE_NORMAL_REEL = 0,
    MODE_777 = 1,
    MODE_MAX = 2
}

export const MODE_777_EMPTY_SYMBOL = -1;
export const ERROR_SYMBOL = -999;

export type ValueType = string | number;

export class WeightGroup {
    private valueList: ValueType[]; //抽取值
    private weightList: number[]; //抽取值對應權重

    public GetWeight(index: number): number {
        return this.weightList[index];
    }

    private totalWeight: number; //總權重
    private highestWeight: number; //機率最高的項目(用在例外狀況)
    private highestValue: ValueType; //機率最高的項目(用在例外狀況)

    private skipList: boolean[]; //跳過列表
    private skipTotalWeight: number; //跳過列表總權重

    /**
     * 初始化
     * @param valueList 值列表
     * @param weightList 權重列表
     */
    constructor(valueList: ValueType[], weightList: number[]) {
        if (valueList.length != weightList.length) {
            error("[WeightGroup] valueList.length != weightList.length!!!(" + valueList.length + " != " + weightList.length + ")");
            return;
        }

        if (valueList.length == 0) {
            error("[WeightGroup] valueList.length == 0!!!");
            return;
        }

        this.valueList = new Array(valueList.length);
        this.weightList = new Array(weightList.length);
        this.totalWeight = 0;
        this.highestWeight = 0;
        this.highestValue = null;
        this.skipList = new Array(valueList.length);
        this.skipTotalWeight = 0;

        for (let i = 0; i < valueList.length; i++) {
            if (weightList[i] < 0) {
                error("[WeightGroup] weightList[" + i + "] = " + weightList[i] + " < 0!!!");
                return;
            }

            if (!Number.isInteger(weightList[i])) {
                error("[WeightGroup] weightList[" + i + "] = " + weightList[i] + " must be integer!!!");
                return;
            }

            this.valueList[i] = valueList[i];
            this.weightList[i] = weightList[i];
            this.totalWeight = this.totalWeight + weightList[i];
            if (this.highestWeight < weightList[i]) {
                this.highestWeight = weightList[i];
                this.highestValue = this.valueList[i];
            }

            this.skipList[i] = false;
        }
        this.skipTotalWeight = 0;
    }

    /**
     * 跳過指定值(如果有多個相同的值也會一起跳過)
     * 指定值不存在不會有任何反應
     * @param value 指定值
     * @returns 是否有資料被影響
     */
    public SetSkip(value: ValueType): boolean {
        let isFind = false;
        if (typeof value === typeof this.valueList[0]) { //要先確定型別一致
            for (let i = 0; i < this.valueList.length; i++) {
                if (this.valueList[i] == value && !this.skipList[i]) { //還沒被跳過的才能跳
                    this.skipList[i] = true;
                    this.skipTotalWeight = this.skipTotalWeight + this.weightList[i];
                    isFind = true;
                }
            }
        } else {
            error("[WeightGroup] SetSkip(value) type is not match weightGroup valueList type!!!(" + typeof value + " !== " + typeof this.valueList[0] + ")");
        }

        return isFind;
    }

    /**
     * 重置指定值的跳過設定(如果有多個相同的值也會一起重置)
     * 指定值不存在不會有任何反應
     * @param value 指定值
     * @returns 是否有資料被影響
     */
    public UnsetSkip(value: ValueType): boolean {
        let isFind = false;
        if (typeof value === typeof this.valueList[0]) { //要先確定型別一致
            for (let i = 0; i < this.valueList.length; i++) {
                if (this.valueList[i] == value && this.skipList[i]) { //有被跳過的才需要重置
                    this.skipList[i] = false;
                    this.skipTotalWeight = this.skipTotalWeight - this.weightList[i];
                    isFind = true;
                }
            }
        } else {
            error("[WeightGroup] ResetSkip(value) type is not match weightGroup valueList type!!!(" + typeof value + " !== " + typeof this.valueList[0] + ")");
        }

        return isFind;
    }

    /**
     * 重置所有跳過設定
     */
    public Reset() {
        if (this.skipTotalWeight > 0) { //有用過才要重置(省效能)
            for (let i = 0; i < this.skipList.length; i++) {
                this.skipList[i] = false;
            }
            this.skipTotalWeight = 0;
        }
    }

    /**
     * 依照權重和跳過設定抽一個值
     * @param isTakeOut 是否取後不放回(預設為否)
     * @returns 抽一個值
     */
    public Generate(isTakeOut: boolean = false): ValueType {
        let newTotalWeight = this.totalWeight - this.skipTotalWeight;

        if (newTotalWeight <= 0) {
            error("[WeightGroup] Generate(" + isTakeOut + ") " + this.totalWeight + " - " + this.skipTotalWeight + " = " + newTotalWeight + " <= 0!!!");
            return this.highestValue;
        }

        let random = Math.floor(Math.random() * newTotalWeight);
        let oriRandom = random;
        for (let i = 0; i < this.weightList.length; i++) {
            if (!this.skipList[i]) { //沒被跳過才能算
                if (random >= this.weightList[i]) { //還沒到
                    random = random - this.weightList[i];
                } else { //到了
                    if (isTakeOut) { //如果要取出, 則移除此選項
                        this.skipList[i] = true;
                        this.skipTotalWeight = this.skipTotalWeight + this.weightList[i];
                    }

                    return this.valueList[i];
                }
            }
        }

        error("[WeightGroup] Generate(" + isTakeOut + ") not found!!!(oriRandom = " + oriRandom + ", newTotalWeight = " + newTotalWeight + ", skipList = " + this.skipList + ")");

        return this.highestValue;
    }
}

//一次抽取時產出的資料
class OnePackageData {
    public baseShowIndex: number;
    public stackAmount: number;
    public totalStack: number;
    public overlayValues: string[][];

    /**
     * 初始化
     * @param baseShowIndex 基礎顯示值
     * @param stackAmount 堆疊數量
     * @param totalStack 總堆疊數量
     * @param overlayValues 額外資訊
     */
    constructor(baseShowIndex: number, stackAmount: number, totalStack: number, overlayValues: string[][]) {
        this.baseShowIndex = baseShowIndex;
        this.stackAmount = stackAmount;
        this.totalStack = totalStack;
        this.overlayValues = overlayValues;
    }
}

//一個額外資訊的資料
export class OverlayData {
    private isSameOnStack: boolean;
    get IsSameOnStack(): boolean {
        return this.isSameOnStack;
    }

    private overlayValue: string[];
    get OverlayValue(): string[] {
        return this.overlayValue;
    }
    private overlayWeight: number[];
    get OverlayWeight(): number[] {
        return this.overlayWeight;
    }

    /**
     * 初始化
     * @param isSameOnStack 是否在堆疊時相同(例如同時出現三個相連金幣時, 三個金幣的額外資訊是否相同)
     * @param overlayValue 額外資訊值列表
     * @param overlayWeight 額外資訊權重列表
     */
    constructor(isSameOnStack: boolean, overlayValue: string[], overlayWeight: number[]) {
        if (overlayValue.length != overlayWeight.length) {
            error("[OverlayData] overlayValue.length != overlayWeight.length!!!(" + overlayValue.length + " != " + overlayWeight.length + ")");
            return;
        }

        this.isSameOnStack = isSameOnStack;
        this.overlayValue = overlayValue;
        this.overlayWeight = overlayWeight;
    }
}

export class GodHandTrackData {
    private oriBaseShowDataValue: number[]|number;
    get OriBaseShowDataValue(): number[]|number {
        return this.oriBaseShowDataValue;
    }
    set OriBaseShowDataValue(value: number[]|number) {
        this.oriBaseShowDataValue = value;
    }

    private baseShowValueList: number[]; //各Index顯示的值(透過baseShowData轉換)
    get BaseShowValueList(): number[] {
        return this.baseShowValueList;
    }

    private baseShowValueDisplayList: string[]; //各Index在工具上顯示的值(給企劃用)
    get BaseShowValueDisplayList(): string[] {
        return this.baseShowValueDisplayList;
    }

    private baseShowDataWeight: number[];
    get BaseShowDataWeight(): number[] {
        return this.baseShowDataWeight;
    }

    private baseShowDataStackSetting: Map<number, Map<number, number>>;
    get BaseShowDataStackSetting(): Map<number, Map<number, number>> {
        return this.baseShowDataStackSetting;
    }

    private overlayData: Map<number, OverlayData[]>;
    get OverlayData(): Map<number, OverlayData[]> {
        return this.overlayData;
    }

    private groupDistance: Map<number, Map<number, number>>;
    get GroupDistance(): Map<number, Map<number, number>> {
        return this.groupDistance;
    }

    constructor(
        oriBaseShowDataValue: number[]|number,
        baseShowValueList: number[],
        baseShowValueDisplayList: string[],
        baseShowDataWeight: number[],
        baseShowDataStackSetting: Map<number, Map<number, number>>,
        overlayData: Map<number, OverlayData[]>,
        groupDistance: Map<number, Map<number, number>>
    ) {
        this.oriBaseShowDataValue = oriBaseShowDataValue;
        this.baseShowValueList = baseShowValueList;
        this.baseShowValueDisplayList = baseShowValueDisplayList;
        this.baseShowDataWeight = baseShowDataWeight;
        this.baseShowDataStackSetting = baseShowDataStackSetting;
        this.overlayData = overlayData;
        this.groupDistance = groupDistance;
    }
}

export class ConditionData {
    private focusOneBlockLength: number;
    get FocusOneBlockLength(): number {
        return this.focusOneBlockLength;
    }

    private focusShowValueStackAmount: Map<number, number>;
    get FocusShowValueStackAmount(): Map<number, number> {
        return this.focusShowValueStackAmount;
    }

    constructor(focusOneBlockLength: number, focusShowValueStackAmount: Map<number, number>) {
        this.focusOneBlockLength = focusOneBlockLength;
        this.focusShowValueStackAmount = focusShowValueStackAmount;
    }
}

export class TrackData {
    private baseShowData: WeightGroup;    //各Value出現機率(抽出來會是index, 實際值還要再轉換)
    private baseShowValueList: number[]; //各Index的值(透過baseShowData轉換)
    get BaseShowValueList(): number[] {
        return this.baseShowValueList;
    }
    private stackAmountData: WeightGroup[];     //各Value堆疊數量[baseShowData]
    private minStackAmount: number[]; //各Value的最小堆疊數量[baseShowData]
    public GetMinStackAmount(baseShowIndex: number): number {
        return this.minStackAmount[baseShowIndex];
    }
    private overlayIsSameOnStack: boolean[][];  //各value上的額外資訊在出現堆疊時是否相同[baseShowData][N]
    private overlayDatas: WeightGroup[][];  //各value上的額外資訊[baseShowData][N]
    public GetOverlayDataLength(baseShowIndex: number): number {
        if (isValid(this.overlayDatas[baseShowIndex])) { //沒有的話會是undefined
            return this.overlayDatas[baseShowIndex].length;
        }
        return 0;
    }
    private groupSkipDistance: number[][]; //valueA對valueB造成的間隔[baseShowData][value] = distance    

    /**
     * 取得來源Value對目標Value造成的間隔
     * @param indexLeft 來源Value
     * @param indexRight 目標Value
     * @returns 間隔
     */
    public GetGroupSkipDistance(indexLeft: number, indexRight: number): number {
        return this.groupSkipDistance[indexLeft][indexRight];
    }

    private groupSkip: number[][]; //當出現valueA, 有哪些Value不能接在後面(同一輪不能出現超過兩顆Scatter也是用這個設定)[baseShowData]->[value1, value2, ...]

    /**
     * 取得當出現來源Value時, 有哪些Value不能接在後面
     * @param baseShowIndex 來源Value
     * @returns 不能接在後面的Index列表
     */
    public GetGroupSkip(baseShowIndex: number): number[] {
        return this.groupSkip[baseShowIndex];
    }

    /**
     * 給GodHand設定用的資料
     */
    private godHandData: GodHandTrackData;
    get GodHandData(): GodHandTrackData {
        return this.godHandData;
    }

    /**
     * 取得Value總數
     * @returns Value總數
     */
    public ShowDataLength(): number {
        return this.baseShowValueList.length;
    }

    /**
     * 初始化
     * @param baseShowDataValue 各Value顯示值; 如果輸入number則表示用0~N-1當作Value顯示值
     * @param baseShowDataValueDisplay 各Value在工具上顯示的值(給企劃用)(使用空陣列的話會直接顯示baseShowDataValue的值)
     * @param baseShowDataWeight 各Value出現權重
     * @param baseShowDataStackSetting 各Value的堆疊數量權重[baseShowData]
     * @param overlayData 各Value上的額外資訊[baseShowData][overlay種類]
     * @param groupDistance 各Value之間的間隔[valueA -> valueB] = distance(valueA對valueB造成的間隔)
     */
    constructor(
        baseShowDataValue: (number[] | number),
        baseShowDataValueDisplay: string[],
        baseShowDataWeight: number[],
        baseShowDataStackSetting: Map<number, Map<number, number>>,
        overlayData: Map<number, OverlayData[]>,
        groupDistance: Map<number, Map<number, number>>,
    ) {
        if (typeof baseShowDataValue === "number") { //用0~N-1當作valueList
            if (baseShowDataValue <= 0) {
                error("[WeightGroup] baseShowDataValue(" + baseShowDataValue + ") Count must > 0!!!");
                return;
            }

            this.baseShowValueList = new Array(baseShowDataValue);
            for (let i = 0; i < baseShowDataValue; i++) {
                this.baseShowValueList[i] = i;
            }
        } else { //用自定義的valueList
            this.baseShowValueList = baseShowDataValue;
        }

        //四個的長度需要一致
        if (this.baseShowValueList.length != baseShowDataWeight.length) {
            error("[WeightGroup] baseShowDataValue.length != baseShowDataWeight.length!!!(" + this.baseShowValueList.length + " != " + baseShowDataWeight.length + ")");
            return;
        }

        if (this.baseShowValueList.length != baseShowDataValueDisplay.length && baseShowDataValueDisplay.length > 0) {
            error("[WeightGroup] baseShowDataValue.length != baseShowDataValueDisplay.length!!!(" + this.baseShowValueList.length + " != " + baseShowDataValueDisplay.length + ")");
            return;
        }

        if (EnvConfig.IS_DEV) {
            this.godHandData = new GodHandTrackData(baseShowDataValue, this.baseShowValueList, baseShowDataValueDisplay, baseShowDataWeight, baseShowDataStackSetting, overlayData, groupDistance);
        }

        //開始轉換
        //baseShowData抽出來時會是index
        let indexList = new Array(this.baseShowValueList.length);
        for (let i = 0; i < this.baseShowValueList.length; i++) {
            indexList[i] = i;
        }

        let totalValueLength = indexList.length;
        this.baseShowData = new WeightGroup(indexList, baseShowDataWeight);
        this.stackAmountData = new Array(totalValueLength);
        this.minStackAmount = new Array(totalValueLength);
        this.overlayIsSameOnStack = new Array(totalValueLength);
        this.overlayDatas = new Array(totalValueLength);
        for (let k = 0; k < totalValueLength; k++) {
            if (baseShowDataWeight[k] == 0) { //權重為0的不用處理
                continue;
            }

            let minStackAmount = 1;

            if (isValid(baseShowDataStackSetting) && baseShowDataStackSetting.has(this.baseShowValueList[k])) { //有設定堆疊數量
                //檢查stack值都是整數
                for (const key of baseShowDataStackSetting.get(this.baseShowValueList[k]).keys()) {
                    if (!Number.isInteger(key)) {
                        error("[WeightGroup] stackSettingMap[" + this.baseShowValueList[k] + "]: stackAmount(" + key + ") must be integer!!!");
                        return;
                    }
                }

                this.stackAmountData[k] = new WeightGroup(Array.from(baseShowDataStackSetting.get(this.baseShowValueList[k]).keys()), Array.from(baseShowDataStackSetting.get(this.baseShowValueList[k]).values()));
                minStackAmount = Math.min(...Array.from(baseShowDataStackSetting.get(this.baseShowValueList[k]).keys()));
            }
            this.minStackAmount[k] = minStackAmount;

            if (isValid(overlayData) && overlayData.has(this.baseShowValueList[k])) { //有設定額外資訊
                this.overlayIsSameOnStack[k] = new Array(overlayData.get(this.baseShowValueList[k]).length);
                this.overlayDatas[k] = new Array(overlayData.get(this.baseShowValueList[k]).length);
                for (let j = 0; j < overlayData.get(this.baseShowValueList[k]).length; j++) {
                    this.overlayIsSameOnStack[k][j] = overlayData.get(this.baseShowValueList[k])[j].IsSameOnStack;
                    this.overlayDatas[k][j] = new WeightGroup(overlayData.get(this.baseShowValueList[k])[j].OverlayValue, overlayData.get(this.baseShowValueList[k])[j].OverlayWeight);
                }
            }
        }

        this.groupSkipDistance = new Array(totalValueLength);
        this.groupSkip = new Array(totalValueLength);
        for (let i = 0; i < this.groupSkipDistance.length; i++) {
            this.groupSkipDistance[i] = Array.from({ length: totalValueLength }, () => 0);
            this.groupSkip[i] = [];
        }

        if (isValid(groupDistance)) {
            for (let i = 0; i < this.groupSkip.length; i++) {
                //將每組之間的對照換成表格狀
                if (groupDistance.has(this.baseShowValueList[i]) && baseShowDataWeight[i] > 0) { //有設定且該Symbol有機會出現才處理
                    for (const key of groupDistance.get(this.baseShowValueList[i]).keys()) {
                        let leftValue = i;
                        let rightValue = this.baseShowValueList.findIndex((element) => { return element == key });

                        this.groupSkip[leftValue].push(rightValue);
                        if (groupDistance.get(this.baseShowValueList[i]).get(key) > this.groupSkipDistance[leftValue][rightValue]) { //比較大才要更新
                            this.groupSkipDistance[leftValue][rightValue] = groupDistance.get(this.baseShowValueList[i]).get(key);
                        }

                        this.groupSkip[rightValue].push(leftValue);
                        if (groupDistance.get(this.baseShowValueList[i]).get(key) > this.groupSkipDistance[rightValue][leftValue]) { //比較大才要更新
                            this.groupSkipDistance[rightValue][leftValue] = groupDistance.get(this.baseShowValueList[i]).get(key);
                        }
                    }
                }
            }
        }
    }

    /**
     * 啟動條件輪帶
     * @param focusShowDataValue 強調的符號
     * @returns 觸發的index, 沒有觸發則回傳-1
     */
    public SetFocus(focusShowDataValue: number): number {
        let baseShowIndex = this.baseShowValueList.findIndex((element) => { return element == focusShowDataValue });
        if (baseShowIndex != -1 && this.baseShowData.GetWeight(baseShowIndex) > 0) { //有權重且沒有跳過
            return baseShowIndex;
        }
        return -1;
    }

    /**
     * 依照設定產生一組資料
     * @param lastBaseShowIndex 上一個baseShowIndex(會被跳過)
     * @param skipBaseShowIndexList 跳過的baseShowData列表(存index)[N]
     * @param skipOverlayList 跳過的overlay列表[baseShowData][overlayIndex]->[skipValue]
     * @returns 產出的資料
    */
    public CreateOnePackage(lastBaseShowIndex: number, skipBaseShowIndexList: number[], skipOverlayList: Map<number, Map<number, string[]>>): OnePackageData {
        let data = new OnePackageData(ERROR_SYMBOL, 0, 0, []);
        
        //跳過上一個符號
        skipBaseShowIndexList.push(lastBaseShowIndex);

        //設定暫時跳過值
        let isSuccessList: boolean[] = new Array(skipBaseShowIndexList.length);
        for (let i = 0; i < skipBaseShowIndexList.length; i++) {
            isSuccessList[i] = this.baseShowData.SetSkip(skipBaseShowIndexList[i]);
        }

        data.baseShowIndex = this.baseShowData.Generate() as number; //抽出來的一定是index
        data.stackAmount = 1;
        if (this.stackAmountData[data.baseShowIndex] != undefined) { //有堆疊設定
            data.stackAmount = this.stackAmountData[data.baseShowIndex].Generate() as number;
        }

        data.totalStack = data.stackAmount;
        

        data.overlayValues = this.CreateOverlayDatas(data.baseShowIndex, data.stackAmount, skipOverlayList);

        //還原暫時跳過值
        for (let i = 0; i < skipBaseShowIndexList.length; i++) {
            if (isSuccessList[i]) { //有跳過才還原
                this.baseShowData.UnsetSkip(skipBaseShowIndexList[i]);
            }
        }

        return data;
    }

    /**
     * 產生符號額外資訊(不是透過CreateOnePackage生成baseShowValue時才需要呼叫)
     * @param baseShowIndex 要產生額外資訊的顯示值index
     * @param stackAmount 堆疊數量
     * @param skipOverlayList 跳過的overlay列表[baseShowData][overlayIndex]->[skipValue](如果baseShowIndex不一樣則不會有反應)
     * @returns 額外資訊(每個堆疊符號都有一份)
     */
    public CreateOverlayDatas(baseShowIndex: number, stackAmount: number, skipOverlayList: Map<number, Map<number, string[]>>): string[][] {
        let overlayDatas = new Array(stackAmount); //有幾個就要有幾份
        for (let i = 0; i < stackAmount; i++) { //每個都要產
            if (this.overlayDatas[baseShowIndex] != undefined) { //有額外資訊
                overlayDatas[i] = new Array(this.overlayDatas[baseShowIndex].length);
            } else {
                overlayDatas[i] = []; //沒有額外資訊需要初始化空陣列
            }
        }

        if (this.overlayDatas[baseShowIndex] != undefined) { //有額外資訊
            for (let j = 0; j < this.overlayDatas[baseShowIndex].length; j++) { //每個都要產
                let isSuccessList: boolean[] = []; //設定暫時跳過值
                if (isValid(skipOverlayList.get(baseShowIndex)) && isValid(skipOverlayList.get(baseShowIndex).get(j))) { //有跳過
                    let skipList = skipOverlayList.get(baseShowIndex).get(j)
                    for (let i = 0; i < skipList.length; i++) {
                        isSuccessList.push(this.overlayDatas[baseShowIndex][j].SetSkip(skipList[i]));
                    }
                }

                for (let i = 0; i < stackAmount; i++) { //每個都要產
                    if (i > 0 && this.overlayIsSameOnStack[baseShowIndex][j]) { //要一樣的話取第一個的值
                        overlayDatas[i][j] = overlayDatas[0][j];
                    } else {
                        overlayDatas[i][j] = this.overlayDatas[baseShowIndex][j].Generate();
                    }
                }

                for (let i = 0; i < isSuccessList.length; i++) {
                    if (isSuccessList[i]) { //有跳過才還原
                        this.overlayDatas[baseShowIndex][j].UnsetSkip(skipOverlayList.get(baseShowIndex).get(j)[i]);
                    }
                }
            }
        }

        return overlayDatas;
    }
}

export default class TrackManager {
    private trackMode: TRACK_MODE; //Track模式
    get TrackMode(): TRACK_MODE {
        return this.trackMode;
    }

    //輪帶設定資料
    private godHandTrackCaseSetting: Map<number, number>[][]; //金手指輪帶設定
    private trackCaseWeightGroup: WeightGroup[][]; //各track的各Case設定權重[trackIndex][caseIndex]

    private trackUsingType: number[]; //各track使用的type
    private trackData: TrackData[]; //所有種類輪帶的資料

    //條件輪帶相關設定
    private focusOneBlockLength: number; //一個區塊的長度
    private focusShowValueStackAmount: WeightGroup; //強調的值的堆疊數量權重
    private conditionData: ConditionData; //條件輪帶資料(顯示初始化用)(沒有設定不會初始化)
    get ConditionData(): ConditionData {
        return this.conditionData;
    }

    //抽取時資料
    private lastPackageData: OnePackageData[]; //各track上一個package的資料[trackIndex]
    private groupKeepSkip: number[][]; //各track的各Symbol還要幾顆才可繼續出現[trackIndex][baseShowData]
    private nowStackNumber: number[]; //各track產出符號的編號[trackIndex]
    private skipBaseShowDataList: number[][]; //跳過baseShowData列表(轉成index)[trackIndex]
    private skipOverlayList: Map<number, Map<number, string[]>>[]; //跳過overlay列表[trackIndex][baseShowData][overlayIndex]

    //新增：真實資料堆疊追蹤相關
    private isJustEnteredRealData: boolean[]; //各track是否剛進入真實資料[trackIndex]
    private realDataStackInfo: Map<number, { symbol: number, remainingStack: number }>[]; //各track的真實資料堆疊資訊[trackIndex]

    private isStartFocus: boolean[]; //是否觸發條件輪帶[trackIndex]
    private focusShowIndex: number[]; //條件輪帶觸發的index[trackIndex](因為各輪帶的TrackType可能不同, 符號總數可能不一樣)
    private focusShowStackAmount: number[]; //條件輪帶觸發的堆疊數量[trackIndex]
    private focusBlockRemain: number[]; //條件輪帶區塊剩餘符號數量[trackIndex]
    private focusTriggerRemain: number[]; //還需要幾個符號進入條件輪帶觸發的指定Stack(-1表示未觸發)[trackIndex]

    private m_finalData:number[][]; //最終實際盤面
    get FinalData(): number[][] {
        return this.m_finalData;
    }
    set FinalData(value: number[][]) {
        this.m_finalData = value;
    }

    /**
     * 初始化
     * @param trackMode 輪帶模式
     * @param trackSize 輪帶數量
     * @param trackData 輪帶資料
     * @param trackCaseSetting 各track的各Case設定權重[trackIndex][caseIndex](Map中的key對應trackData的index)
     * @param focusOneBlockLength 條件輪帶觸發時, 一個區塊的長度(需大於條件輪帶堆疊中, 最大可出現的堆疊數量)
     * @param focusStackSetting 條件輪帶堆疊數量權重
     */
    constructor(
        trackMode: TRACK_MODE,
        trackSize: number,
        trackData: TrackData[],
        trackCaseSetting: Map<number, number>[][],
        focusOneBlockLength?: number,
        focusStackSetting?: Map<number, number>,
    ) {
        this.trackMode = trackMode;
        this.trackData = trackData;

        if (isValid(focusStackSetting)) { //有設定條件堆疊
            let maxStack = Math.max(...Array.from(focusStackSetting.keys()));
            if (focusOneBlockLength < maxStack) {
                error("[TrackManager] focusOneBlockLength(" + focusOneBlockLength + ") < focusStackSetting(" + maxStack + ")!!!");
                return;
            }

            this.focusOneBlockLength = focusOneBlockLength;
            this.focusShowValueStackAmount = new WeightGroup(Array.from(focusStackSetting.keys()), Array.from(focusStackSetting.values()));

            this.conditionData = new ConditionData(focusOneBlockLength, focusStackSetting);
        }

        if (trackCaseSetting.length != trackSize) {
            error("[TrackManager] trackCaseSetting.length(" + trackCaseSetting.length + ") != trackSize(" + trackSize + ")!!!");
            return;
        }

        if (EnvConfig.IS_DEV) {
            this.godHandTrackCaseSetting = trackCaseSetting;
        }
        this.trackCaseWeightGroup = new Array(trackSize);
        this.trackUsingType = new Array(trackSize)
        this.groupKeepSkip = new Array(trackSize);
        this.lastPackageData = new Array(trackSize);
        this.nowStackNumber = new Array(trackSize);
        this.skipBaseShowDataList = new Array(trackSize);
        this.skipOverlayList = new Array(trackSize);
        this.isJustEnteredRealData = new Array(trackSize);
        this.realDataStackInfo = new Array(trackSize);
        for (let t = 0; t < this.trackUsingType.length; t++) {
            this.trackCaseWeightGroup[t] = new Array(trackCaseSetting[t].length);
            for (let c = 0; c < trackCaseSetting[t].length; c++) {
                //檢查key值是否正確
                for (const key of trackCaseSetting[t][c].keys()) {
                    if (key < 0 || key >= this.trackData.length) {
                        error("[TrackManager] trackCaseSetting key(" + key + ") out of range!!!");
                    }
                }
                this.trackCaseWeightGroup[t][c] = new WeightGroup(Array.from(trackCaseSetting[t][c].keys()), Array.from(trackCaseSetting[t][c].values()));
            }
            this.trackUsingType[t] = 0; //預設用第一個
            this.groupKeepSkip[t] = Array.from({ length: this.trackData[this.trackUsingType[t]].ShowDataLength() }, () => 0);
            this.lastPackageData[t] = new OnePackageData(MODE_777_EMPTY_SYMBOL, 0, 0, []); //初始化
            this.nowStackNumber[t] = 0;
            this.skipBaseShowDataList[t] = [];
            this.skipOverlayList[t] = new Map<number, Map<number, string[]>>();
            this.isJustEnteredRealData[t] = false;
            this.realDataStackInfo[t] = new Map<number, { symbol: number, remainingStack: number }>();
        }

        this.isStartFocus = Array.from({ length: trackSize }, () => false);
        this.focusShowIndex = Array.from({ length: trackSize }, () => -1);
        this.focusShowStackAmount = Array.from({ length: trackSize }, () => 0);
        this.focusBlockRemain = Array.from({ length: trackSize }, () => -1);
        this.focusTriggerRemain = Array.from({ length: trackSize }, () => -1);
    }

    public RefreshTrackDataByGodHand(
        trackData: TrackData[],
        focusOneBlockLength?: number,
        focusStackSetting?: Map<number, number>,
    ){
        if (EnvConfig.IS_DEV){
            this.trackData = trackData;

            if (isValid(focusStackSetting)) { //有設定條件堆疊
                let maxStack = Math.max(...Array.from(focusStackSetting.keys()));
                if (focusOneBlockLength < maxStack) {
                    error("[TrackManager] focusOneBlockLength(" + focusOneBlockLength + ") < focusStackSetting(" + maxStack + ")!!!");
                    return;
                }
    
                this.focusOneBlockLength = focusOneBlockLength;
                this.focusShowValueStackAmount = new WeightGroup(Array.from(focusStackSetting.keys()), Array.from(focusStackSetting.values()));
    
                this.conditionData = new ConditionData(focusOneBlockLength, focusStackSetting);
            }
        }
    }

    public RefreshTrackCaseByGodHand(
        trackCaseSetting: Map<number, number>[][],
    ){
        if (EnvConfig.IS_DEV){
            for (let t = 0; t < this.trackCaseWeightGroup.length; t++) {
                for (let c = 0; c < this.trackCaseWeightGroup[t].length; c++) {
                    this.trackCaseWeightGroup[t][c] = new WeightGroup(Array.from(trackCaseSetting[t][c].keys()), Array.from(trackCaseSetting[t][c].values()));
                }
            }
        }
    }

    /**
     * 取得假輪帶設定工具需要的資料
     * @returns (符號值列表, 各符號額外資訊數量)[trackIndex]
     */
    public GodHandData(): {trackData: GodHandTrackData[], trackCaseSetting: Map<number, number>[][]} {
        let returnList: GodHandTrackData[] = [];
        for (let i = 0; i < this.trackData.length; i++) {
            returnList.push(this.trackData[i].GodHandData);
        }
        return {trackData: returnList, trackCaseSetting: this.godHandTrackCaseSetting};
    }

    /**
     * 設定各track的使用的case(同時會立刻抽一次TrackUsingType)
     * @param trackIndex 要設定的track索引
     * @param caseIndex 要使用的case(對應trackCaseWeightGroup的index)
     */
    public SetTrackUsingCase(trackIndex: number, caseIndex: number){
        if (trackIndex < 0 || trackIndex >= this.trackUsingType.length) {
            error("[TrackManager] SetTrackUsingCase trackIndex(" + trackIndex + ") out of range!!!");
            return;
        }

        if (caseIndex < 0 || caseIndex >= this.trackCaseWeightGroup[trackIndex].length) {
            error("[TrackManager] SetTrackUsingCase caseIndex(" + caseIndex + ") out of range!!!");
            return;
        }

        this.SetTrackUsingType(trackIndex, this.trackCaseWeightGroup[trackIndex][caseIndex].Generate() as number);
    }

    /**
     * 設定各track的使用的trackType(由trackUsingCase決定)
     * @param trackIndex 要設定的track索引
     * @param trackType 要使用的type(對應TrackData的index)
     */
    private SetTrackUsingType(trackIndex: number, trackType: number) {
        if (trackIndex < 0 || trackIndex >= this.trackUsingType.length) {
            error("[TrackManager] SetTrackUsingType trackIndex(" + trackIndex + ") out of range!!!");
            return;
        }

        if (trackType < 0 || trackType >= this.trackData.length) {
            error("[TrackManager] SetTrackUsingType trackType(" + trackType + ") out of range!!!");
            return;
        }

        if (trackType != this.trackUsingType[trackIndex]) { //不一樣才要換
            //換新的輪帶
            this.trackUsingType[trackIndex] = trackType;

            //中途換type時, group保留期要延續
        }
    }

    /**
     * 設定baseShowData的跳過值(例如在特定情況下不會出某符號)
     * @param trackIndex 要設定的track索引
     * @param skipValue 跳過值
     */
    public SetBaseShowDataSkip(trackIndex: number, skipValue: number) {
        let trackType = this.trackUsingType[trackIndex];
        let skipIndex = this.trackData[trackType].BaseShowValueList.findIndex((element) => { return element == skipValue });
        if (skipIndex == -1) {
            error("[TrackManager] SetBaseShowDataSkip skipValue(" + skipValue + ") not found!!!");
            return;
        }

        //沒有才新增
        if (this.skipBaseShowDataList[trackIndex].findIndex((element) => { return element == skipIndex }) == -1) {
            this.skipBaseShowDataList[trackIndex].push(skipIndex);
        }
    }

    /**
     * 取消某個baseShowData的跳過值
     * @param trackIndex 要取消的track索引
     * @param skipValue 取消目標值
     */
    public UnsetBaseShowDataSkip(trackIndex: number, skipValue: number) {
        let trackType = this.trackUsingType[trackIndex];
        let skipIndex = this.trackData[trackType].BaseShowValueList.findIndex((element) => { return element == skipValue });
        if (skipIndex == -1) {
            error("[TrackManager] SetBaseShowDataSkip skipValue(" + skipValue + ") not found!!!");
            return;
        }

        let index = this.skipBaseShowDataList[trackIndex].findIndex((element) => { return element == skipIndex });
        if (index != -1) {
            this.skipBaseShowDataList[trackIndex].splice(index, 1);
        }
    }

    /**
     * 重置baseShowData的跳過值
     * @param trackIndex 要重置的track索引
    */
    public ResetBaseShowDataSkip(trackIndex: number) {
        this.skipBaseShowDataList[trackIndex] = [];
    }

    /**
     * 設定某個Track的額外資訊的跳過值
     * 過程中如果切換trackType, 已設定過的OverlaySkip也會被帶過去
     * 如果不希望被帶過去, 要呼叫ResetOverlaySkip清除
     * @param trackIndex 要設定的track索引
     * @param baseShowDataValue 要跳過的顯示值
     * @param overlayIndex 要跳過的額外資訊索引
     * @param skipValue 要跳過的值
     */
    public SetOverlaySkip(trackIndex: number, baseShowDataValue: number, overlayIndex: number, skipValue: string) {
        let trackType = this.trackUsingType[trackIndex];
        let baseValueIndex = this.trackData[trackType].BaseShowValueList.findIndex((element) => { return element == baseShowDataValue });
        if (baseValueIndex == -1) {
            error("[TrackManager] SetOverlaySkip baseShowDataValue(" + baseShowDataValue + ") not found!!!");
            return;
        }

        if (!this.skipOverlayList[trackIndex].has(baseValueIndex)) {
            this.skipOverlayList[trackIndex].set(baseValueIndex, new Map<number, string[]>());
        }

        if (!this.skipOverlayList[trackIndex].get(baseValueIndex).has(overlayIndex)) {
            this.skipOverlayList[trackIndex].get(baseValueIndex).set(overlayIndex, []);
        }

        if (this.skipOverlayList[trackIndex].get(baseValueIndex).get(overlayIndex).findIndex((element) => { return element == skipValue }) == -1) {
            this.skipOverlayList[trackIndex].get(baseValueIndex).get(overlayIndex).push(skipValue);
        }
    }

    /**取消某個overlaySkip
     * @param trackIndex 要取消的track索引
     * @param baseShowDataValue 要取消跳過的顯示值
     * @param overlayIndex 額外資訊索引
     * @param skipValue 取消目標值
    */
    public UnsetOverlaySkip(trackIndex: number, baseShowDataValue: number, overlayIndex: number, skipValue: string) {    
        let trackType = this.trackUsingType[trackIndex];
        let baseValueIndex = this.trackData[trackType].BaseShowValueList.findIndex((element) => { return element == baseShowDataValue });
        if (baseValueIndex == -1) {
            error("[TrackManager] UnsetOverlaySkip baseShowDataValue(" + baseShowDataValue + ") not found!!!");
            return;
        }

        if (this.skipOverlayList[trackIndex].has(baseValueIndex) && 
            this.skipOverlayList[trackIndex].get(baseValueIndex).has(overlayIndex)) {
            let index = this.skipOverlayList[trackIndex].get(baseValueIndex).get(overlayIndex).findIndex((element) => { return element == skipValue })  
            if (index != -1) {
                this.skipOverlayList[trackIndex].get(baseValueIndex).get(overlayIndex).splice(index, 1);
            }
        }
    }

    /**
     * 重置全部TrackData的額外資訊的跳過值
     * @param trackIndex 要重置的track索引
     * @param baseShowDataValue 要重置的顯示值(不輸入則重置全部有overlay的Skip)
     * @param index 要重置的額外資訊索引(不輸入則重置全部有overlay的Skip)
     */
    public ResetOverlaySkip(trackIndex: number, baseShowDataValue?: number, index?: number) {
        if (isValid(baseShowDataValue) && isValid(index)) {
            let trackType = this.trackUsingType[trackIndex];
            let baseValueIndex = this.trackData[trackType].BaseShowValueList.findIndex((element) => { return element == baseShowDataValue });
            if (baseValueIndex == -1) {
                error("[TrackManager] ResetOverlaySkip baseShowDataValue(" + baseShowDataValue + ") not found!!!");
                return;
            }

            if (this.skipOverlayList[trackIndex].has(baseValueIndex) && this.skipOverlayList[trackIndex].get(baseValueIndex).has(index)) {
                this.skipOverlayList[trackIndex].get(baseValueIndex).get(index).splice(0, this.skipOverlayList[trackIndex].get(baseValueIndex).get(index).length);
            }
        } else {
            this.skipOverlayList[trackIndex].clear();
        }
    }

    /**
     * 重置此設定的所有Skip
     */
    public ResetAllSkip() {
        for (let i = 0; i < this.trackUsingType.length; i++) {
            this.ResetBaseShowDataSkip(i);
            this.ResetOverlaySkip(i);
        }
    }

    /**
     * 啟動條件輪帶
     * @param baseShowDataValue 強調的符號
     */
    public StartFocus(trackIndex: number, baseShowDataValue: number) {
        if (isValid(this.focusShowValueStackAmount)) { //有設定條件堆疊才可以開始
            this.isStartFocus[trackIndex] = true;
            
            if (this.skipBaseShowDataList[trackIndex].findIndex((element) => { return element == baseShowDataValue }) == -1) { //有跳過不能觸發
                this.focusShowIndex[trackIndex] = this.trackData[this.trackUsingType[trackIndex]].SetFocus(baseShowDataValue)
                if (this.focusShowIndex[trackIndex] != -1) { //可出現才設定
                    this.NextFocus(trackIndex);
                    this.focusBlockRemain[trackIndex] = this.focusOneBlockLength;
                }
            }                
        }
    }

    /**
     * 生成下一個強調符號的資料(在Block的哪裡出現)
     * @param trackIndex 要生成的track索引
     */
    private NextFocus(trackIndex: number) {
        if (this.isStartFocus[trackIndex]) { //有開始才會生成
            this.focusShowStackAmount[trackIndex] = this.focusShowValueStackAmount.Generate() as number;
            this.focusTriggerRemain[trackIndex] = Math.floor(Math.random() * (this.focusOneBlockLength - this.focusShowStackAmount[trackIndex])); //不能超過區塊長度
        }
    }

    /**
     * 停止條件輪帶
     */
    public EndFocus(trackIndex: number) { //停止條件輪帶時, 如果有還沒跑完的, 還是要跑完
        this.isStartFocus[trackIndex] = false;
    }

    /**
     * 產生一個track的隨機符號
     * @param trackIndex 要產生的track
     * @returns 產生的符號資訊(符號本身, 額外資訊, 為堆疊符號中的第幾個); 如果沒有額外資料, 則額外資料=[]; 如果不是堆疊, 則stackNumber=0, 堆疊中的第一個出現的符號(最下面的)為1
     */
    public CreateRandomSymbol(trackIndex: number): { baseShowValue: number, overlayValues: string[], stackNumber: number , totalStack:number } {
        let trackType = this.trackUsingType[trackIndex];
   
        //新增：檢查是否剛從真實資料轉換到假資料
        if (this.isJustEnteredRealData[trackIndex]) {
            //剛從真實資料轉換到假資料，需要根據真實資料的堆疊情況來調整
            this.AdjustFakeDataBasedOnRealData(trackIndex);
            this.isJustEnteredRealData[trackIndex] = false; //重置flag
        } 

        //如果舊的沒了才會產
        if (this.lastPackageData[trackIndex].stackAmount == 0) { //上一個結束了
            if (this.trackMode == TRACK_MODE.MODE_777 && this.lastPackageData[trackIndex].baseShowIndex != MODE_777_EMPTY_SYMBOL) { //如果是777模式且上一個有符號, 則下一個必為空
                this.lastPackageData[trackIndex] = new OnePackageData(MODE_777_EMPTY_SYMBOL, 1, 1, []);
            } else if (this.isStartFocus[trackIndex] && this.focusTriggerRemain[trackIndex] == 0) {  //條件輪帶觸發
                
                //log( "trackIndex: " + trackIndex + " ENTER Focus")
                
                //下一個變成指定觸發的值
                this.lastPackageData[trackIndex] = new OnePackageData(
                    this.focusShowIndex[trackIndex],
                    this.focusShowStackAmount[trackIndex],
                    this.focusShowStackAmount[trackIndex],
                    this.trackData[trackType].CreateOverlayDatas(this.focusShowIndex[trackIndex], this.focusShowStackAmount[trackIndex], this.skipOverlayList[trackIndex])
                );

                //生成下一個
                this.NextFocus(trackIndex);

                //調整觸發位置(要等這個區塊播完)
                this.focusTriggerRemain[trackIndex] = this.focusTriggerRemain[trackIndex] + this.focusBlockRemain[trackIndex];

                //如果區塊剩餘符號數量小於堆疊數量, 則要多延後一個區塊(覆蓋到下一個區塊了)
                if (this.focusBlockRemain[trackIndex] < this.lastPackageData[trackIndex].stackAmount) {
                    this.focusTriggerRemain[trackIndex] = this.focusTriggerRemain[trackIndex] + this.focusOneBlockLength;
                }

                if (this.focusTriggerRemain[trackIndex] == this.focusBlockRemain[trackIndex]) { //剛好在前一個尾巴觸發, 且下一個在開頭觸發, 則要延後一個
                    this.focusTriggerRemain[trackIndex] = this.focusTriggerRemain[trackIndex] + 1;
                }
            } else { //生成一個新的
                
                //log("trackIndex: " + trackIndex + " ENTER CreateOnePackage")
                
                //標記哪些要跳過
                let skipIndexList = new Set<number>();
                for (let i = 0; i < this.skipBaseShowDataList[trackIndex].length; i++) { //使用者設定要跳過的
                    skipIndexList.add(this.skipBaseShowDataList[trackIndex][i]);
                }

                for (let i = 0; i < this.groupKeepSkip[trackIndex].length; i++) {
                    if (this.groupKeepSkip[trackIndex][i] > 0) { //group保留期還沒結束
                        skipIndexList.add(i);
                    }
                }

                this.lastPackageData[trackIndex] = this.trackData[trackType].CreateOnePackage(this.lastPackageData[trackIndex].baseShowIndex, Array.from(skipIndexList), this.skipOverlayList[trackIndex]);
            }

            if (this.lastPackageData[trackIndex].stackAmount > 1) { //堆疊符號
                this.nowStackNumber[trackIndex] = 1;
            } else {
                this.nowStackNumber[trackIndex] = 0;
            }
        } else { //上一個還沒結束    
            
            //log( "trackIndex: " + trackIndex + " ENTER 上一個還沒結束" + "StackAmount: " + this.lastPackageData[trackIndex].stackAmount)
            
            this.nowStackNumber[trackIndex] = this.nowStackNumber[trackIndex] + 1;
        }

        //儲存結果
        let returnValue = {
            baseShowValue: this.trackData[trackType].BaseShowValueList[this.lastPackageData[trackIndex].baseShowIndex], //只有輸出時才轉成顯示值
            overlayValues: this.lastPackageData[trackIndex].overlayValues[0].slice(),
            stackNumber: this.nowStackNumber[trackIndex],
            totalStack: this.lastPackageData[trackIndex].totalStack
        };

        //當前package取用
        this.lastPackageData[trackIndex].stackAmount = this.lastPackageData[trackIndex].stackAmount - 1;
        this.lastPackageData[trackIndex].overlayValues.shift();

        this.UpdateGroupKeepSkipData(trackIndex, returnValue.baseShowValue);

    //    log('trackIndex: ' + trackIndex + 
    //     'baseShowIndex: ' + this.lastPackageData[trackIndex].baseShowIndex + 
    //     " stackAmount: " + this.lastPackageData[trackIndex].stackAmount + 
    //     " totalStack: " + this.lastPackageData[trackIndex].totalStack + 
    //     " overlayValues : " + this.lastPackageData[trackIndex].overlayValues.length)
        
        return returnValue;
    }

    /**
     * 更新group保留期
     * @param trackIndex 要更新的track索引
     * @param baseShowValue 要更新的baseShowValue
     */
    private UpdateGroupKeepSkipData(trackIndex: number, baseShowValue: number){
        //後處理
        let trackType = this.trackUsingType[trackIndex];

        let baseShowIndex = this.trackData[trackType].BaseShowValueList.findIndex((element) => { return element == baseShowValue });

        //更新group保留期
        for (let i = 0; i < this.groupKeepSkip[trackIndex].length; i++) {
            if (this.groupKeepSkip[trackIndex][i] > 0) {
                this.groupKeepSkip[trackIndex][i] = this.groupKeepSkip[trackIndex][i] - 1;
            }
        }

        //新增group保留期
        let temp = this.trackData[trackType].GetGroupSkip(baseShowIndex);
        for (let i = 0; i < temp.length; i++) {
            let groupIndex = temp[i]; //需要跳的Index
            this.groupKeepSkip[trackIndex][groupIndex] = this.trackData[trackType].GetGroupSkipDistance(baseShowIndex, groupIndex); //跳過幾顆
        }

        //更新focus
        if (this.isStartFocus[trackIndex]) {
            this.focusBlockRemain[trackIndex] = this.focusBlockRemain[trackIndex] - 1;
            if (this.focusBlockRemain[trackIndex] == 0) { //區塊結束
                this.focusBlockRemain[trackIndex] = this.focusOneBlockLength;
            }

            if (this.focusTriggerRemain[trackIndex] > 0) { //有設定觸發的才要減少
                this.focusTriggerRemain[trackIndex] = this.focusTriggerRemain[trackIndex] - 1;
            }
        }
    }

    /**
     * 更新group保留期(用於最終實際盤面)
     * @param trackIndex 要更新的track索引
     * @param baseShowValue 要更新的baseShowValue
     */
    public UpdateGroupKeepSkipDataForFinalData(trackIndex: number, baseShowValue: number){
        this.UpdateGroupKeepSkipData(trackIndex, baseShowValue);
        this.isJustEnteredRealData[trackIndex] = true;
    }

    /**
     * 根據真實資料的堆疊情況來調整假資料的產出(更新lastPackageData，這樣產出此假資料時就會根據實際堆疊情況來產出)
     * @param trackIndex 要調整的track索引
     */
    private AdjustFakeDataBasedOnRealData(trackIndex: number) {        
        //檢查 m_finalData 實際盤面中的堆疊情況
        if (this.m_finalData && this.m_finalData[trackIndex]) {     
            //注意：finalData位置順序是上下相反的
            //例如 finalData[0] = [1,1,3]，實際產出順序是 [3,1,1]
            //所以我們需要從後往前計算堆疊
            
            let trackData = this.m_finalData[trackIndex];
            let trackType = this.trackUsingType[trackIndex];
            
            //從後往前計算最大堆疊數量和符號
            let currentSymbol = -1;
            let currentStackCount = 0;
            
            for (let i = trackData.length - 1; i >= 0; i--) {
                let symbol = trackData[i];
                
                if (symbol === currentSymbol) {
                    //相同符號，堆疊數量+1
                    currentStackCount++;
                } else {
                    //不同符號，重置計數
                    currentSymbol = symbol;
                    currentStackCount = 1;
                }
            }
            
            //根據 finalData 更新 lastPackage 的所有資訊
            //更新堆疊數量相關資訊
            let totalStackAmount = this.trackData[trackType].GetMinStackAmount(currentSymbol);

            this.lastPackageData[trackIndex].stackAmount = totalStackAmount - currentStackCount;
            this.lastPackageData[trackIndex].totalStack = totalStackAmount;
            
            this.lastPackageData[trackIndex].baseShowIndex = currentSymbol;
            
            if(this.lastPackageData[trackIndex].stackAmount > 0){
                this.lastPackageData[trackIndex].overlayValues = this.trackData[trackType].CreateOverlayDatas(currentSymbol, this.lastPackageData[trackIndex].stackAmount, this.skipOverlayList[trackIndex])        
                this.nowStackNumber[trackIndex] = currentStackCount;
            }else{
                //要生成新的package
                this.lastPackageData[trackIndex].stackAmount = 0;
                this.lastPackageData[trackIndex].overlayValues = [];
                this.nowStackNumber[trackIndex] = 0;
            }
        }
    }
}