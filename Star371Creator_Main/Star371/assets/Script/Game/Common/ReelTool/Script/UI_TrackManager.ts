import { _decorator, Component, EditBox, error, EventTouch, instantiate, isValid, Label, Node, Prefab, UITransform } from 'cc';
import { UI_Collaspe_Icon } from './UI_Collaspe_Icon';
import { UI_TrackData } from './UI_TrackData';
import { UI_BaseShowDataDetail, WeightGroupType } from './UI_BaseShowDataDetail';
import { UI_WeightGroup } from './UI_WeightGroup';
import { UI_TrackUsingManager } from './UI_TrackUsingManager';
import TrackManager, { ConditionData, GodHandTrackData, OverlayData, TrackData } from './BaseWeightGroup';
import { GOD_HAND } from 'db://assets/Script/Game/Component/GodHand/GodHandDefine';
import Touchable, { TouchableEvent } from 'db://assets/Stark/Interactive/Touchable';
import { EventDispatcher } from 'db://assets/Stark/Utility/EventDispatcher';

const { ccclass, property } = _decorator;

@ccclass('UI_TrackManager')
export class UI_TrackManager extends Component {
    @property({ type: Touchable, displayName: "Condition Toggle" })
    private conditionToggle: Touchable = null;

    @property({ type: Prefab, displayName: "Track Prefab" })
    private trackPrefab: Prefab = null;

    @property({ type: Prefab, tooltip: "BaseShowData Prefab" })
    private baseShowDataPrefab: Prefab = null;

    @property({ type: Prefab, tooltip: "BaseShowDataDetail Prefab" })
    private baseShowDataDetailPrefab: Prefab = null;

    @property({ type: Touchable, displayName: "Track Add" })
    private trackAddBtn: Touchable = null;

    @property({ type: Touchable, displayName: "Track Remove" })
    private trackRemoveBtn: Touchable = null;

    /**
     * 輸出時使用
     */
    @property({ type: UI_TrackUsingManager, displayName: "Bind TrackUsingManager" })
    private trackUsingManager: UI_TrackUsingManager = null;

    private m_trackManager: TrackManager = null;
    set TrackManager(trackManager: TrackManager) {
        this.m_trackManager = trackManager;
    }

    private m_sequenceNumber: number = 0; //TrackData的序號

    start() {
        if (this.conditionToggle) {
            this.conditionToggle.On(TouchableEvent.Clicked, this.onConditionToggleClicked, this);
        }

        if (this.trackAddBtn) {
            this.trackAddBtn.On(TouchableEvent.Clicked, this.onTrackAddBtnClicked, this);
        }

        if (this.trackRemoveBtn) {
            this.trackRemoveBtn.On(TouchableEvent.Clicked, this.onTrackRemoveBtnClicked, this);
        }

        EventDispatcher.Shared.On(GOD_HAND.CONFIRM, this.Output, this);
    }

    update(deltaTime: number) {

    }

    onDestroy() {
        if (this.conditionToggle) {
            this.conditionToggle.Off(TouchableEvent.Clicked, this.onConditionToggleClicked, this);
        }

        if (this.trackAddBtn) {
            this.trackAddBtn.Off(TouchableEvent.Clicked, this.onTrackAddBtnClicked, this);
        }

        if (this.trackRemoveBtn) {
            this.trackRemoveBtn.Off(TouchableEvent.Clicked, this.onTrackRemoveBtnClicked, this);
        }

        EventDispatcher.Shared.Off(GOD_HAND.CONFIRM, this.Output, this);
    }

    public Output(isFromOther: boolean = false): string {
        if (this.node.parent.parent.parent.active == false && isFromOther == false){ 
            return
        }

        let outputContent: string = "[\n";

        let trackData: TrackData[] = [];
        let trackSequence: number = 0;

        for (let i = 0; i < this.node.children.length; i++) {
            if (this.node.children[i].name == "TrackData") {
                let hasDisplayValue: boolean = false;
                let oriBaseShowDataValue: number[]|number = this.node.children[i].getComponent(UI_TrackData).OriBaseShowDataValue;
                let baseShowDataValueDisplay: string[] = [];
                let baseShowDataWeight: number[] = [];
                let baseShowDataStackSetting: Map<number, Map<number, number>> = new Map<number, Map<number, number>>();
                let overlayData: Map<number, OverlayData[]> = new Map<number, OverlayData[]>();
                let groupDistance: Map<number, Map<number, number>> = new Map<number, Map<number, number>>();
                
                //先製作列表
                for (let j = 0; j < this.node.children[i].getChildByName("NextLayer").children.length; j++) {
                    if (this.node.children[i].getChildByName("NextLayer").children[j].name == "BaseShowData") {
                        baseShowDataValueDisplay.push(this.node.children[i].getChildByName("NextLayer").children[j].getChildByName("BaseShowDataValue").children[0].getComponent(Label).string)
                    }
                }

                baseShowDataWeight = new Array(this.node.children[i].getChildByName("NextLayer").children.length / 2)
                let baseShowDataIndex: number = 0;
                for (let j = 0; j < this.node.children[i].getChildByName("NextLayer").children.length; j++) {
                    if (this.node.children[i].getChildByName("NextLayer").children[j].name == "BaseShowData") {
                        let displayValue: string = this.node.children[i].getChildByName("NextLayer").children[j].getChildByName("BaseShowDataValue").children[0].getComponent(Label).string;
                        if (typeof oriBaseShowDataValue == "number") {
                            if (displayValue != baseShowDataIndex.toString()) { // 有設定顯示值
                                hasDisplayValue = true;
                            }
                        } else {
                            if (displayValue != oriBaseShowDataValue[baseShowDataIndex].toString()) { // 有設定顯示值
                                hasDisplayValue = true;
                            }
                        }

                        baseShowDataWeight[baseShowDataIndex] = parseInt(this.node.children[i].getChildByName("NextLayer").children[j].getChildByName("BaseShowDataWeight").getComponent(EditBox).string)
                        
                        const baseShowDataDetail = this.node.children[i].getChildByName("NextLayer").children[j].getChildByName("NextLayer")
                        const baseShowDataDetailLength = baseShowDataDetail.children.length / 2;
                        let baseShowDataDetailIndex = 0;
                        let overlayDataList: OverlayData[] = [];
                        for (let k = 0; k < baseShowDataDetail.children.length; k++) {
                            if (baseShowDataDetail.children[k].name == "BaseShowDataDetail") {
                                const weightGroup = baseShowDataDetail.children[k].getChildByName("WeightGroup")

                                if (baseShowDataDetailIndex == 0) { //符號堆疊權重
                                    for (let l = 0; l < weightGroup.children.length; l++){
                                        if (weightGroup.children[l].name == "Weight(keyinValue)"){
                                            if (!baseShowDataStackSetting.has(baseShowDataIndex)) {
                                                baseShowDataStackSetting.set(baseShowDataIndex, new Map<number, number>())
                                            }

                                            baseShowDataStackSetting.get(baseShowDataIndex).set(
                                                parseInt(weightGroup.children[l].getChildByName("BaseShowDataValue").getComponent(EditBox).string),
                                                parseInt(weightGroup.children[l].getChildByName("BaseShowDataWeight").getComponent(EditBox).string)
                                            )
                                        }
                                    }
                                } else if (baseShowDataDetailIndex == baseShowDataDetailLength - 1) { //各符號距離
                                    for (let l = 0; l < weightGroup.children.length; l++){
                                        if (weightGroup.children[l].name == "Weight(selectValue)"){
                                            if (!groupDistance.has(baseShowDataIndex)) {
                                                groupDistance.set(baseShowDataIndex, new Map<number, number>())
                                            }
                                            
                                            let targetIndex = baseShowDataValueDisplay.findIndex((element) => { return element == weightGroup.children[l].getChildByName("SelectBox").getChildByName("Target").getChildByName("Label").getComponent(Label).string });

                                            groupDistance.get(baseShowDataIndex).set(
                                                targetIndex,
                                                parseInt(weightGroup.children[l].getChildByName("BaseShowDataWeight").getComponent(EditBox).string)
                                            )
                                        }
                                    }
                                } else { //額外資訊
                                    let overlayIsSame: boolean = false;
                                    if (baseShowDataDetail.children[k].getChildByName("CheckBox").children[0].children[0].getComponent(Label).string == "V"){
                                        overlayIsSame = true;
                                    }
                                    let overlayValueList: string[] = [];
                                    let overlayWeightList: number[] = [];
                                    for (let l = 0; l < weightGroup.children.length; l++){
                                        if (weightGroup.children[l].name == "Weight(keyinValue)"){
                                            overlayValueList.push(weightGroup.children[l].getChildByName("BaseShowDataValue").getComponent(EditBox).string)
                                            overlayWeightList.push(parseInt(weightGroup.children[l].getChildByName("BaseShowDataWeight").getComponent(EditBox).string))
                                        }
                                    }      
                                    
                                    if (overlayValueList.length > 0) {
                                        overlayDataList.push(new OverlayData(
                                            overlayIsSame,
                                            overlayValueList,
                                            overlayWeightList
                                        ))
                                    }
                                }

                                baseShowDataDetailIndex++;
                            }
                        }

                        if (overlayDataList.length > 0) {
                            overlayData.set(baseShowDataIndex, overlayDataList)
                        }

                        baseShowDataIndex++;
                    }
                }

                if (hasDisplayValue) {
                    trackData.push(new TrackData(
                        oriBaseShowDataValue,
                        baseShowDataValueDisplay,
                        baseShowDataWeight,
                        baseShowDataStackSetting,
                        overlayData,
                        groupDistance,
                    ))
                }else{
                    trackData.push(new TrackData(
                        oriBaseShowDataValue,
                        [],
                        baseShowDataWeight,
                        baseShowDataStackSetting,
                        overlayData,
                        groupDistance,
                    ))
                }

                outputContent += "    //trackData" + trackSequence + "\n"
                outputContent += "    new TrackData(\n"
                if (typeof oriBaseShowDataValue == "number"){
                    outputContent += "        " + oriBaseShowDataValue + ",\n"
                }else{
                    outputContent += "        [" + oriBaseShowDataValue.join(", ") + "],\n"
                }
                if (hasDisplayValue) {
                    outputContent += "        [\"" + baseShowDataValueDisplay.join("\", \"") + "\"], //Symbol顯示值\n"
                }else{
                    outputContent += "        [],\n"
                }
                outputContent += "        [" + baseShowDataWeight.join(", ") + "], //Symbol權重\n"

                outputContent += "        //堆疊設定\n"
                if (baseShowDataStackSetting.size > 0){
                    outputContent += "        new Map([\n"
                    for (const key of baseShowDataStackSetting.keys()){
                        if (typeof oriBaseShowDataValue == "number"){
                            outputContent += "            [" + key + ", new Map(["
                        }else{
                            outputContent += "            [" + oriBaseShowDataValue[key] + ", new Map(["
                        }
                        for (const key2 of baseShowDataStackSetting.get(key).keys()){
                            outputContent += "[" + key2 + ", " + baseShowDataStackSetting.get(key).get(key2) + "], "
                        }
                        outputContent = outputContent.slice(0, -2)
                        outputContent += "])],\n"
                    }
                    outputContent += "        ]),\n"
                }else{
                    outputContent += "        null,\n"
                }

                outputContent += "        //額外資訊\n"
                if (overlayData.size > 0){
                    outputContent += "        new Map([\n"
                    for (const key of overlayData.keys()){
                        if (typeof oriBaseShowDataValue == "number"){
                            outputContent += "            [" + key + ", \n"
                        }else{
                            outputContent += "            [" + oriBaseShowDataValue[key] + ", \n"
                        }
                        outputContent += "                [\n"
                        for (let j = 0 ; j < overlayData.get(key).length; j++){
                            outputContent += "                    new OverlayData(" + 
                                overlayData.get(key)[j].IsSameOnStack + ", " + 
                                "[\"" + overlayData.get(key)[j].OverlayValue.join("\", \"") + "\"], " + 
                                "[" + overlayData.get(key)[j].OverlayWeight.join(", ") + "]),\n"
                        }
                        outputContent += "                ]\n"
                        outputContent += "            ],\n"
                    }
                    outputContent += "        ]),\n"
                }else{
                    outputContent += "        null,\n"
                }

                outputContent += "        //相互距離限制\n"
                if (groupDistance.size > 0){
                    outputContent += "        new Map([\n"
                    for (const key of groupDistance.keys()){
                        if (typeof oriBaseShowDataValue == "number"){
                            outputContent += "            [" + key + ", new Map([\n"
                        }else{
                            outputContent += "            [" + oriBaseShowDataValue[key] + ", new Map([\n"
                        }
                        for (const key2 of groupDistance.get(key).keys()){
                            if (typeof oriBaseShowDataValue == "number"){
                                outputContent += "                [" + key2 + ", " + groupDistance.get(key).get(key2) + "],\n"
                            }else{
                                outputContent += "                [" + oriBaseShowDataValue[key2] + ", " + groupDistance.get(key).get(key2) + "],\n"
                            }
                        }
                        outputContent += "            ])],\n"
                    }
                    outputContent += "        ]),\n"
                }else{
                    outputContent += "        null,\n"
                }
                outputContent += "    ),\n"

                trackSequence++;
            }
        }

        outputContent += "],\n";
        outputContent += "//各Track使用設定(預設使用第一組權重)(抽出的數字表示使用的trackIndex)\n"
        outputContent += "[\n"
        outputContent += "/*...*/\n"
        outputContent += "],\n"

        let focusOneBlockLength: number = -1;
        let focusStackSetting: Map<number, number>;

        if (this.node.getChildByName("conditionSetting").getChildByName("CheckBox").children[0].children[0].getComponent(Label).string == "V") { //有條件輪帶
            focusOneBlockLength = parseInt(this.node.getChildByName("conditionSetting").getChildByName("ConditionBlockSize").getComponent(EditBox).string)
            focusStackSetting = new Map<number, number>()
            const weightGroup = this.node.getChildByName("conditionSetting").getChildByName("WeightGroup")
            for (let i = 0; i < weightGroup.children.length; i++) {
                const weight = weightGroup.children[i]
                if (weight.name == "Weight(keyinValue)") {
                    focusStackSetting.set(
                        parseInt(weight.getChildByName("BaseShowDataValue").getComponent(EditBox).string),
                        parseInt(weight.getChildByName("BaseShowDataWeight").getComponent(EditBox).string)
                    )
                }
            }
        }

        if (focusOneBlockLength != -1) {
            this.m_trackManager.RefreshTrackDataByGodHand(
                trackData,
                focusOneBlockLength,
                focusStackSetting
            )
            outputContent += "//條件輪帶\n"
            outputContent += "" + focusOneBlockLength + ",\n"
            outputContent += "new Map([\n"
            for (const key of focusStackSetting.keys()){
                outputContent += "    [" + key + ", " + focusStackSetting.get(key) + "],\n"
            }
            outputContent += "]),\n"
        } else {
            this.m_trackManager.RefreshTrackDataByGodHand(
                trackData,
            )
        }

        if (!isFromOther) { //避免循環呼叫
            this.trackUsingManager.Output(true, outputContent)
        }

        return outputContent;
    }

    public SetTrackUsingManager(trackUsingManager: UI_TrackUsingManager) {
        this.trackUsingManager = trackUsingManager;
    }

    public CreateNewTrackData(parent: Node, godHandData: GodHandTrackData) {
        const nextLayer = this.NewTrackData(parent)
        nextLayer.parent.getComponent(UI_TrackData).OriBaseShowDataValue = godHandData.OriBaseShowDataValue
        let baseShowValueStrList: string[] = godHandData.BaseShowValueDisplayList;
        if (baseShowValueStrList.length == 0) { //沒有設定顯示值, 則使用baseShowValueList的值
            baseShowValueStrList = godHandData.BaseShowValueList.map(v => v.toString());
        }

        for (let i = 0; i < baseShowValueStrList.length; i++) {
            const nextNextLayer = this.NewBaseShowData(nextLayer, baseShowValueStrList[i], godHandData.BaseShowDataWeight[i])

            let stackValueList: string[] = [];
            let stackWeightList: string[] = [];
            if (isValid(godHandData.BaseShowDataStackSetting) && godHandData.BaseShowDataStackSetting.has(godHandData.BaseShowValueList[i])) {
                const stackSetting = godHandData.BaseShowDataStackSetting.get(godHandData.BaseShowValueList[i])
                for (const key of stackSetting.keys()) {
                    stackValueList.push(key.toString())
                    stackWeightList.push(stackSetting.get(key).toString())
                }
            }
            this.NewBaseShowDataDetail(nextNextLayer, "符號堆疊權重", WeightGroupType.KEYIN_WEIGHT, null, stackValueList, stackWeightList)

            if (isValid(godHandData.OverlayData) && godHandData.OverlayData.has(godHandData.BaseShowValueList[i])) {
                const overlayData = godHandData.OverlayData.get(godHandData.BaseShowValueList[i])
                for (let j = 0; j < overlayData.length; j++) {
                    const overlayValueList: string[] = overlayData[j].OverlayValue;
                    const overlayWeightList: string[] = overlayData[j].OverlayWeight.map(v => v.toString());
                    this.NewBaseShowDataDetail(nextNextLayer, "額外資訊" + (j + 1), WeightGroupType.KEYIN_WEIGHT, null, overlayValueList, overlayWeightList, overlayData[j].IsSameOnStack)
                }
            }

            const groupDistanceValueList: string[] = [];
            const groupDistanceWeightList: string[] = [];
            if (isValid(godHandData.GroupDistance) && godHandData.GroupDistance.has(godHandData.BaseShowValueList[i])) {
                for (const key of godHandData.GroupDistance.get(godHandData.BaseShowValueList[i]).keys()) {
                    groupDistanceValueList.push(key.toString())
                    groupDistanceWeightList.push(godHandData.GroupDistance.get(godHandData.BaseShowValueList[i]).get(key).toString())
                }
            }
            this.NewBaseShowDataDetail(nextNextLayer, "各符號距離", WeightGroupType.DROPDOWN_WEIGHT, baseShowValueStrList, groupDistanceValueList, groupDistanceWeightList)
        }

        //更新BaseShowData的%
        if (godHandData.BaseShowValueList.length > 0) {
            //觸發第一個值輸入時的更新
            nextLayer.parent.getComponent(UI_TrackData).OnEditBoxChange(nextLayer.children[0], "")
        }
    }

    public SetConditionData(conditionData: ConditionData) {
        const conditionNode = this.node.getChildByName("conditionSetting")
        if (isValid(conditionData)) { //有設定
            this.SwitchConditionData(conditionNode, true);
            conditionNode.getChildByName("ConditionBlockSize").getComponent(EditBox).string = conditionData.FocusOneBlockLength.toString();
            const weightGroup = conditionNode.getChildByName("WeightGroup").getComponent(UI_WeightGroup)
            for (const key of conditionData.FocusShowValueStackAmount.keys()) {
                weightGroup.CreateNewWeight(key.toString(), conditionData.FocusShowValueStackAmount.get(key).toString());
            }
        } else { //沒有設定
            this.SwitchConditionData(conditionNode, false);
        }
    }

    public onConditionToggleClicked(sender: Touchable, event?: EventTouch) {
        if (this.node.getChildByName("conditionSetting").getChildByName("CheckBox").children[0].children[0].getComponent(Label).string == "") { //關變開
            this.SwitchConditionData(this.node.getChildByName("conditionSetting"), true);
        } else { //開變關
            this.SwitchConditionData(this.node.getChildByName("conditionSetting"), false);
        }
    }

    public SwitchConditionData(conditionNode: Node, open: boolean) {
        if (open) { //關變開
            conditionNode.getChildByName("CheckBox").children[0].children[0].getComponent(Label).string = "V"
            conditionNode.getChildByName("Collapse_Icon").active = true
            conditionNode.getChildByName("BlockSizeLabel").active = true
            conditionNode.getChildByName("ConditionBlockSize").active = true
            if (conditionNode.getChildByName("Collapse_Icon").children[0].children[0].getComponent(Label).string == "▼") { //有開才顯示
                conditionNode.getChildByName("WeightGroup").active = true
            }
        } else { //開變關
            conditionNode.getChildByName("CheckBox").children[0].children[0].getComponent(Label).string = ""
            //讓Padding先隱藏, 再關閉Collapse_Icon
            this.scheduleOnce(() => {
                conditionNode.getChildByName("Collapse_Icon").active = false
            })
            conditionNode.getChildByName("BlockSizeLabel").active = false
            conditionNode.getChildByName("ConditionBlockSize").active = false
            conditionNode.getChildByName("WeightGroup").active = false
        }
    }

    //--------------------------------

    public NewTrackData(parent: Node, sourceNode?: Node): Node {
        //新增TrackData節點
        this.m_sequenceNumber++;

        let track: Node = null
        if (isValid(sourceNode)) {
            track = instantiate(sourceNode);
        } else {
            track = instantiate(this.trackPrefab);
        }
        track.parent = parent;
        track.getChildByName("Label").getComponent(Label).string = "Data" + this.m_sequenceNumber;

        //新增Padding節點
        const padding = instantiate(new Node("Padding"))
        padding.parent = parent;

        //新增padding大小屬性
        padding.addComponent(UITransform)
        const paddingTransform = padding.getComponent(UITransform)
        paddingTransform.setContentSize(track.getComponent(UITransform).width, 0);

        //將Padding節點設定到TrackData內的展開元件屬性上
        const ts = track.getChildByName("Collapse_Icon").getComponent(UI_Collaspe_Icon)
        ts.SetPaddingNode(paddingTransform)

        //調整地Bar的順序(固定在最後)
        this.trackAddBtn.node.parent.setSiblingIndex(this.trackAddBtn.node.parent.children.length - 1)

        if (!this.trackRemoveBtn.node.active) { //有新增就把刪除按鈕顯示出來
            this.trackRemoveBtn.node.active = true
        }

        if (isValid(sourceNode)) { //如果是複製的, 要補上設定值(程式碼內的設定值不會一起被複製)
            track.getComponent(UI_TrackData).OriBaseShowDataValue = sourceNode.getComponent(UI_TrackData).OriBaseShowDataValue;
            const sourceNextLayer = sourceNode.getChildByName("NextLayer")
            const targetNextLayer = track.getChildByName("NextLayer")
            for (let i = 0; i < targetNextLayer.children.length; i++) {
                if (targetNextLayer.children[i].name == "BaseShowData") {
                    const sourceBaseShowData = sourceNextLayer.children[i].getChildByName("NextLayer")
                    const targetBaseShowData = targetNextLayer.children[i].getChildByName("NextLayer")
                    for (let j = 0; j < targetBaseShowData.children.length; j++) {
                        if (targetBaseShowData.children[j].name == "BaseShowDataDetail") {
                            targetBaseShowData.children[j].getChildByName("WeightGroup").getComponent(UI_WeightGroup).SetType(sourceBaseShowData.children[j].getChildByName("WeightGroup").getComponent(UI_WeightGroup).GetType());
                            targetBaseShowData.children[j].getChildByName("WeightGroup").getComponent(UI_WeightGroup).SetItemList(sourceBaseShowData.children[j].getChildByName("WeightGroup").getComponent(UI_WeightGroup).GetItemList());
                        }
                    }
                }
            }
        }

        return track.getChildByName("NextLayer")
    }

    public NewBaseShowData(parent: Node, baseShowValue: string, baseShowValueWeight: number): Node {
        const baseShowData = instantiate(this.baseShowDataPrefab)
        baseShowData.parent = parent
        baseShowData.getChildByName("BaseShowDataValue").children[0].getComponent(Label).string = baseShowValue
        baseShowData.getChildByName("BaseShowDataWeight").getComponent(EditBox).string = baseShowValueWeight.toString()

        const padding = instantiate(new Node("Padding"))
        padding.parent = parent

        padding.addComponent(UITransform)
        const paddingTransform = padding.getComponent(UITransform)
        paddingTransform.setContentSize(baseShowData.getComponent(UITransform).width, 0);

        const ts = baseShowData.getChildByName("Collapse_Icon").getComponent(UI_Collaspe_Icon)
        ts.SetPaddingNode(paddingTransform)

        return baseShowData.getChildByName("NextLayer")
    }

    public NewBaseShowDataDetail(parent: Node, title: string, weightGroupType: WeightGroupType, itemList?: string[], targetValueList?: string[], targetWeightList?: string[], isOverlaySame?: boolean): Node {
        const baseShowDataDetail = instantiate(this.baseShowDataDetailPrefab)
        baseShowDataDetail.parent = parent
        baseShowDataDetail.getChildByName("Title").getComponent(Label).string = title
        if (isValid(isOverlaySame)) {
            baseShowDataDetail.getChildByName("CheckBox").active = true
            baseShowDataDetail.getChildByName("Label").active = true
            baseShowDataDetail.getChildByName("CheckBox").children[0].children[0].getComponent(Label).string = (isOverlaySame ? "V" : "")
        }
        baseShowDataDetail.getComponent(UI_BaseShowDataDetail).SetWeightGroup(weightGroupType, itemList, targetValueList, targetWeightList)

        const padding = instantiate(new Node("Padding"))
        padding.parent = parent

        padding.addComponent(UITransform)
        const paddingTransform = padding.getComponent(UITransform)
        paddingTransform.setContentSize(baseShowDataDetail.getComponent(UITransform).width, 0);

        const ts = baseShowDataDetail.getChildByName("Collapse_Icon").getComponent(UI_Collaspe_Icon)
        ts.SetPaddingNode(paddingTransform)
        ts.SetCollaspeLayer(baseShowDataDetail.getChildByName("WeightGroup").getComponent(UITransform))


        return baseShowDataDetail.getChildByName("NextLayer")
    }

    //--------------------------------

    public onTrackAddBtnClicked(sender: Touchable, event?: EventTouch) {
        let targetIndex: number = -1
        for (let i = 0; i < this.node.children.length; i++) {
            if (this.node.children[i].name == "TrackData" && this.node.children[i].getChildByName("CheckBox").children[0].children[0].getComponent(Label).string == "V") { //有選擇
                if (targetIndex != -1) {
                    error("有兩個以上的TrackData被選擇!!!, 新增時只能選擇一個")
                    return;
                }

                targetIndex = i
                this.node.children[i].getChildByName("CheckBox").children[0].children[0].getComponent(Label).string = "" //把勾勾取消
            }
        }

        if (targetIndex != -1) {
            //複製trackData
            this.NewTrackData(this.node, this.node.children[targetIndex])
        } else {
            error("沒有TrackData被選擇!!!, 新增時必須選擇一個")
        }
    }

    public onTrackRemoveBtnClicked(sender: Touchable, event?: EventTouch) {
        let trackCount: number = 0;
        let trackIndex: number[] = [];
        for (let i = 0; i < this.node.children.length; i++) {
            if (this.node.children[i].name == "TrackData") { //有track
                trackCount++;
                if (this.node.children[i].getChildByName("CheckBox").children[0].children[0].getComponent(Label).string == "V") {//有選擇
                    trackIndex.push(i);
                }
            }
        }

        if (trackCount >= 2) { //有兩個以上的TrackData才能刪除
            if (trackCount == 2) { //只剩下兩個TrackData時, 把刪除按鈕隱藏(因為刪除後就剩一個了)
                this.trackRemoveBtn.node.active = false
            }

            for (let i = 0; i < trackIndex.length; i++) {
                const track = this.node.children[trackIndex[i]]
                const padding = this.node.children[trackIndex[i] + 1]
                track.destroy()
                padding.destroy()
            }
        }
    }
}


