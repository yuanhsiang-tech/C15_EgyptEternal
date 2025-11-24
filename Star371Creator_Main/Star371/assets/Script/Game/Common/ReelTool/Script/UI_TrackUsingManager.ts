import { _decorator, Component, EditBox, instantiate, isValid, Label, Node, Prefab, UITransform } from 'cc';
import { UI_Collaspe_Icon } from './UI_Collaspe_Icon';
import { UI_WeightGroup } from './UI_WeightGroup';
import { WeightGroupType } from './UI_BaseShowDataDetail';
import { UI_TrackManager } from './UI_TrackManager';
import { UI_SelectBox } from './UI_SelectBox';

import { GOD_HAND } from 'db://assets/Script/Game/Component/GodHand/GodHandDefine';
import TrackManager from './BaseWeightGroup';
import { EventDispatcher } from 'db://assets/Stark/Utility/EventDispatcher';

const { ccclass, property } = _decorator;

@ccclass('UI_TrackUsingManager')
export class UI_TrackUsingManager extends Component {
    @property({ type: Prefab, displayName: "TrackUsingSetting Prefab" })
    private trackUsingSettingPrefab: Prefab = null;

    @property({ type: Prefab, displayName: "TrackCase Prefab" })
    private trackCasePrefab: Prefab = null;

    @property({ type: Node, displayName: "Bind TrackDataManager" })
    private trackDataManager: Node = null;

    private m_trackManager: TrackManager = null;
    set TrackManager(trackManager: TrackManager) {
        this.m_trackManager = trackManager;
    }

    private isNewBefore: boolean = false;

    private m_trackDataList: string[] = [];
    
    private m_trackSequenceNumber: number = 0;
    private m_caseSequenceNumber: number = 0;

    start() {
        EventDispatcher.Shared.On(GOD_HAND.CONFIRM, this.Output, this);
    }

    update(deltaTime: number) {
    }

    onDestroy() {
        EventDispatcher.Shared.Off(GOD_HAND.CONFIRM, this.Output, this);
    }

    onEnable() {
        if (isValid(this.trackDataManager)){
            this.UpdateTrackDataList()
        }
    }

    public Output(isFromOther: boolean = false, continueContent?: string){
        if (this.node.parent.parent.parent.active == false && isFromOther == false){ 
            return
        }

        let outputContent: string = ""; //最後要輸出的檔案

        if (!isFromOther){ //避免循環呼叫
            outputContent = this.trackDataManager.getComponent(UI_TrackManager).Output(true)
        }else{
            outputContent = continueContent;
        }

        let outputTemp: string = ""; //TrackUsingSetting的輸出內容

        let index1: number = 0;
        let trackCaseSetting: Map<number, number>[][] = new Array(this.node.children.length / 2) //有一半是Padding
        for (let i = 0 ; i < this.node.children.length; i = i + 1){
            const child = this.node.children[i]
            if (child.name == "TrackUsingSetting"){
                trackCaseSetting[index1] = new Array(child.getChildByName("NextLayer").children.length / 2)
                let index2: number = 0;
                for (let j = 0 ; j < child.getChildByName("NextLayer").children.length; j = j + 1){
                    const trackCase = child.getChildByName("NextLayer").children[j]
                    if (trackCase.name == "TrackCase"){
                        trackCaseSetting[index1][index2] = new Map<number, number>()
                        for (let k = 0 ; k < trackCase.getChildByName("WeightGroup").children.length; k = k + 1){
                            const weight = trackCase.getChildByName("WeightGroup").children[k]
                            if (weight.name == "Weight(selectValue)"){
                                //要把selectBox的index算出來
                                let targetValue = weight.getChildByName("SelectBox").getChildByName("Target").getChildByName("Label").getComponent(Label).string
                                let targetIndex = this.m_trackDataList.findIndex((element) => { return element == targetValue });

                                trackCaseSetting[index1][index2].set(
                                    targetIndex,
                                    parseInt(weight.getChildByName("BaseShowDataWeight").getComponent(EditBox).string)
                                )
                            }
                        }
                        index2++;
                    }
                }
                index1++;
            }
        }

        this.m_trackManager.RefreshTrackCaseByGodHand(trackCaseSetting)

        for (let i = 0 ; i < trackCaseSetting.length; i = i + 1){
            outputTemp += "    ["
            for (let j = 0 ; j < trackCaseSetting[i].length; j = j + 1){
                outputTemp += "new Map(["
                for (const key of trackCaseSetting[i][j].keys()){
                    outputTemp += "[" + key + ", " + trackCaseSetting[i][j].get(key) + "], "
                }
                outputTemp = outputTemp.slice(0, -2)
                outputTemp += "]), "
            }
            outputTemp = outputTemp.slice(0, -2)
            outputTemp += "],\n"
        }

        //塞回outputContent
        outputContent = outputContent.replace("/*...*/", outputTemp)

        //輸出檔案
        const blob = new Blob([outputContent], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = this.node.parent.parent.parent.getChildByName("Title").getComponent(Label).string.replace("TrackUsingSetting\n", "") + ".txt";
        a.click();
        URL.revokeObjectURL(url);

        //刷新列表
        this.UpdateTrackDataList()
    }

    private UpdateTrackDataList(){
        this.m_trackDataList = []
        for (let i = 0 ; i < this.trackDataManager.children.length; i = i + 1){
            const child = this.trackDataManager.children[i]
            if (child.name == "TrackData"){
                this.m_trackDataList.push(child.getChildByName("Label").getComponent(Label).string)
            }
        }

        //更新全部
        if (this.isNewBefore){
            for (let i = 0 ; i < this.node.children.length; i = i + 1){
                const child = this.node.children[i]
                if (child.name == "TrackUsingSetting"){
                    for (let j = 0 ; j < child.getChildByName("NextLayer").children.length; j = j + 1){
                        const trackCase = child.getChildByName("NextLayer").children[j]
                        if (trackCase.name == "TrackCase"){
                            for (let k = 0 ; k < trackCase.getChildByName("WeightGroup").children.length; k = k + 1){
                                const weight = trackCase.getChildByName("WeightGroup").children[k]
                                if (weight.name == "Weight(selectValue)"){
                                    weight.getChildByName("SelectBox").getComponent(UI_SelectBox).InitItemList(this.m_trackDataList)
                                }
                            }
                        }
                    }
                }
            }    
        }
    }

    public SetTrackDataManager(trackDataManager: Node) {
        this.trackDataManager = trackDataManager;
        this.UpdateTrackDataList()
    }

    public CreateNewTrackUsingSetting(trackCaseSetting: Map<number, number>[][]){
        this.isNewBefore = true;
        let trackSize = trackCaseSetting.length
        this.m_trackSequenceNumber = 0;
        for (let t = 0 ; t < trackSize; t = t + 1){
            let nextLayer = this.NewTrackUsingSetting(this.node)
            let caseCount = trackCaseSetting[t].length
            this.m_caseSequenceNumber = 0;
            for (let i = 0 ; i < caseCount; i = i + 1){
                const trackCase = instantiate(this.trackCasePrefab)
                trackCase.parent = nextLayer
                trackCase.getChildByName("Title").getComponent(Label).string = "Case" + this.m_caseSequenceNumber;
                this.m_caseSequenceNumber++;

                trackCase.getChildByName("WeightGroup").getComponent(UI_WeightGroup).SetType(WeightGroupType.DROPDOWN_WEIGHT)
                trackCase.getChildByName("WeightGroup").getComponent(UI_WeightGroup).SetItemList(this.m_trackDataList)
                for (const key of trackCaseSetting[t][i].keys()){
                    trackCase.getChildByName("WeightGroup").getComponent(UI_WeightGroup).CreateNewWeight(this.m_trackDataList[key], trackCaseSetting[t][i].get(key).toString())
                }
    
                //新增Padding節點
                const padding = instantiate(new Node("Padding"))
                padding.parent = nextLayer;
    
                //新增padding大小屬性
                padding.addComponent(UITransform)
                const paddingTransform = padding.getComponent(UITransform)
                paddingTransform.setContentSize(trackCase.getComponent(UITransform).width, 0);
    
                //將Padding節點設定到TrackData內的展開元件屬性上
                const ts = trackCase.getChildByName("Collapse_Icon").getComponent(UI_Collaspe_Icon)
                ts.SetPaddingNode(paddingTransform)
            }
        }
    }

    public NewTrackUsingSetting(parent: Node): Node {
        //新增TrackUsingSetting節點
        this.m_trackSequenceNumber++;

        let track = instantiate(this.trackUsingSettingPrefab);
        track.parent = parent;
        track.getChildByName("Label").getComponent(Label).string = "" + this.m_trackSequenceNumber;

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

        return track.getChildByName("NextLayer")
    }
}


