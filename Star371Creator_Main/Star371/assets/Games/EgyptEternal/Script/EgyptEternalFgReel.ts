
import { Font } from "cc";
import CommonSpinnerControl from "../../../Script/Game/Common/SlotSpinner/CommonSpinnerControl";
import { CommonSpinner } from "../../../Script/Game/Common/SlotSpinner/CommonSpinnerMacros";
import { CommonSpinnerSpeedConfig } from "../../../Script/Game/Common/SlotSpinner/Utility/CommonSpinnerSpeedConfig";
import GameBar from "../../../Script/Game/Platform/GameBar/GameBar";
import EgyptEternalDefine, { BONUS_TYPE } from "./EgyptEternalDefine";
import EgyptEternalEffectView from "./EgyptEternalEffectView";
import { PlateData, EgyptEternalProtocol, CreateRandomData, PhaseType } from "./EgyptEternalProtocol";
import { _decorator, instantiate, SpriteFrame, Node, tween, sp, Prefab, Label, Sprite } from 'cc';
import { UIOpacity } from "cc";
import { UITransform } from "cc";
import { NodeUtils } from "db://assets/Stark/FuncUtils/NodeUtils";
import { NumberUtils } from "db://assets/Stark/FuncUtils/NumberUtils";
import { EgyptEternalBind } from "./EgyptEternalBind";
import Touchable from "db://assets/Stark/Interactive/Touchable";




const { ccclass, property } = _decorator;
/**堆疊Symbol總個數 */
const FAKE_RANDOM: number[] = [12, 12, 12, 12, 12];

/** MG假輪帶會出現的Symbol */
const MG_RANDOM_SYMBOL_TRACK: number[][] = [
   [0, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
   [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
   [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
   [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
   [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
];
/** MG假輪帶會出現的Symbol權重 */
const MG_SYMBOL_WEIGHT_TRACK: number[][] = [
   [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
   [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
   [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
   [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
   [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];


/** FG假輪帶會出現的Symbol */
const FG_RANDOM_SYMBOL_TRACK: number[][] = [
   [0, 1, 2, 4, 5, 6, 7, 8, 9],
   [1, 2, 4, 5, 6, 7, 8, 9],
   [1, 2, 4, 5, 6, 7, 8, 9],
   [1, 2, 4, 5, 6, 7, 8, 9],
   [1, 2, 4, 5, 6, 7, 8, 9],
];
/** FG假輪帶會出現的Symbol權重 */
const FG_SYMBOL_WEIGHT_TRACK: number[][] = [
   [1, 1, 1, 1, 1, 1, 1, 1, 1],
   [1, 1, 1, 1, 1, 1, 1, 1],
   [1, 1, 1, 1, 1, 1, 1, 1],
   [1, 1, 1, 1, 1, 1, 1, 1],
   [1, 1, 1, 1, 1, 1, 1, 1],
];


/** MG FG雷電球JP種類 */
const MG_FG_IN_JP_TYPE: number[][] = [[0, 1, 2, 3, 4, 5]];
/** MG雷電球JP權重 */
const MG_THUNDER_BALL_JP_TYPE_WEIGHT: number[][] = [[1, 1, 1, 1, 1, 1]];

/** FG雷電球JP權重 */
const FG_THUNDER_BALL_JP_TYPE_WEIGHT: number[][] = [[1, 1, 1, 1, 1, 1]];



export let FASTER_SPIN_SETTING = new CommonSpinnerSpeedConfig(
   0, // 每輪間啟動間隔 (秒)
   20, // 拉回距離 (像素)
   0.05, // 拉回時間 (秒)
   2000, // 移動速度 (像素/秒)
   0.75, // 自動觸發停輪時間 (秒)
   0, // 停輪延遲 (秒)
   0.45, // 每輪間停輪間隔 (秒)
   3000, // Near Win 速度 (像素/秒)
   1.5, // Near Win 持續時間 (秒)
   2000, // 觸發停輪後速度 (像素/秒)
   CommonSpinner.STOP_MODE.FIXED_TIME, // 停輪模式
   35, // 回彈距離 (像素)
   0.2, // 回彈時間 (秒)
   2000, // 強停速度 (像素/秒)
   25, // 強停回彈距離 (像素)
   0.2 // 強停回彈時間 (秒)
);

export let TURBO_SPIN_SETTING = new CommonSpinnerSpeedConfig(
   0, // 每輪間啟動間隔 (秒)
   10, // 拉回距離 (像素)
   0.05, // 拉回時間 (秒)
   2000, // 移動速度 (像素/秒)
   0.75, // 自動觸發停輪時間 (秒)
   0, // 停輪延遲 (秒)
   0, // 每輪間停輪間隔 (秒)
   3000, // Near Win 速度 (像素/秒)
   1.5, // Near Win 持續時間 (秒)
   2000, // 觸發停輪後速度 (像素/秒)
   CommonSpinner.STOP_MODE.FIXED_TIME, // 停輪模式
   15, // 回彈距離 (像素)
   0.2, // 回彈時間 (秒)
   2000, // 強停速度 (像素/秒)
   15, // 強停回彈距離 (像素)
   0.2 // 強停回彈時間 (秒)
);

class SkinAttribute {
   ske: sp.Skeleton = null;
   type: EgyptEternalProtocol.JpType = EgyptEternalProtocol.JpType.MAX;
}

@ccclass
export default class EgyptEternalFgReel extends CommonSpinnerControl {
   /**Symbol靜態圖 */
   @property({ type: SpriteFrame })
   protected m_symbolSpriteFrames: SpriteFrame[] = [];

   private m_bind: EgyptEternalBind = null;

   private m_symbolids: number[][] = [[], [], [], [], []];

   protected m_effectView: EgyptEternalEffectView = null;
   protected m_gameBar: GameBar = null;
   /**MG、FG盤面點擊 */
   private m_spinButtonPlate: Touchable = null;
   private m_isTurbo: boolean = false;

   /**記錄輪帶節點上的Sprite Component */
   protected m_symbolSpriteComp: Sprite[][] = [];

   /**高分Font */
   @property({ type: Font, tooltip: "高分Font" }) private m_highValueFont: Font = null;
   /**普通Font */
   @property({ type: Font, tooltip: "普通Font" }) private m_normalValueFont: Font = null;

   //    /**要表演的假輪帶 */     //
   private m_fakePlateData: PlateData[][] = [];
   private m_fakePlateIndex: number[] = [0, 0, 0, 0, 0];
   private m_setFakeEnd: boolean = false;

   private m_typeWeight: number[] = [1, 1, 1, 1, 1, 1];
   private m_skinNode: SkinAttribute[] = [];

   /**用來計算以下規則: */
   // 1.雷電球與Scatter不相鄰
   // 2.雷電球或Scatter中間至少要隔兩個非雷電球或Scatter的symbol才能再出一次雷電球或Scatter
   private m_protectCount: number[] = [0, 0, 0, 0, 0];
   private m_isProtecting: boolean[] = [false, false, false, false, false];
   //=========================================================================================================
   onLoad() {
      this.m_spinButtonPlate = this.node.getChildByName("mgPlateTouch").getComponent(Touchable);
   }
   //=========================================================================================================
   public GameInit(gamebar: GameBar, effectView: EgyptEternalEffectView) {
      this.m_effectView = effectView;
      this.m_gameBar = gamebar;


      for (let t = 0; t < this.TotalTracks; t++) {
         this.m_symbolSpriteComp[t] = [];
      }

      // this.m_spinSettingMenu = instantiate(this.m_spinSettingMenuPrefab).getComponent(EgyptEternalSpinSettingMenu);
      // this.m_spinSettingMenu.node.parent = this.node.parent.parent
      // this.m_spinSettingMenu.node.setPosition(-30,50,0)
      // this.m_reelSettingMenu = instantiate(this.m_reelSettingMenuPrefab).getComponent(EgyptEternalReelSettingMenu);
      // this.m_reelSettingMenu.node.parent = this.node.parent.parent
      // this.m_reelSettingMenu.node.setPosition(-320,230,0)

      // this.m_spinSettingMenu.node.active = false
      // this.m_reelSettingMenu.node.active = false

      this.ConfigureSettings({ NORMAL: FASTER_SPIN_SETTING, FASTER: FASTER_SPIN_SETTING });


      this.On(CommonSpinner.EVENT.TRACK_START_NEAR_WIN, this.StartNearWin, this);
      this.On(CommonSpinner.EVENT.TRACK_JUST_STOPPED, this.ReelStop, this);
      this.On(CommonSpinner.EVENT.TRACK_REACH_BOTTOM, this.ReelReachBottom, this);

   }
   public get SpinButtonPlate(): Touchable {
      return this.m_spinButtonPlate;
   }

   onDestroy() {
      this.Off(CommonSpinner.EVENT.TRACK_START_NEAR_WIN, this.StartNearWin, this);
      this.Off(CommonSpinner.EVENT.TRACK_JUST_STOPPED, this.ReelStop, this);
      this.Off(CommonSpinner.EVENT.TRACK_REACH_BOTTOM, this.ReelReachBottom, this);
      super.onDestroy && super.onDestroy();
   }


   public Init(initData?: any[][], ...args: any[]) {
      this.IndexOrigin = CommonSpinner.ORIGIN.TOP_LEFT;
      if (initData) {
         super.Init(initData);
      } else {
         let noAwardPlate = this.InitialPlate();
         super.Init(noAwardPlate);
      }

      for (let t = 0; t < this.TotalTracks; t++) {
         for (let s = 0; s < this.m_totalSockets[t]; s++) {
            this.m_symbolNodes[t][s].setSiblingIndex(this.m_totalSockets[t] - s);
         }
      }
   }
   public InitBind(bind: EgyptEternalBind) {
      this.m_bind = bind;
   }

   //#region CommonSpinnerControl

   public ForceSetData(data: any[][]) {
      if (data) {
         super.ForceSetData(data);
      } else {
         let noAwardPlate = this.InitialPlate();
         super.ForceSetData(noAwardPlate);
      }
   }

   protected OnSymbolForceSetData(trackIdx: number, symbolIdx: number, node: Node, data: any): void {
      this.OnSymbolEntering(trackIdx, symbolIdx, node, data);
   }

   protected InitialPlate() {
      let initPlate: number[][] = [];

      initPlate[0] = [];
      initPlate[0][0] = EgyptEternalProtocol.Symbol.ANKH;
      initPlate[0][1] = EgyptEternalProtocol.Symbol.SCATTER;
      initPlate[0][2] = EgyptEternalProtocol.Symbol.WEDJAT;
      initPlate[0][3] = EgyptEternalProtocol.Symbol.SPHINX;

      initPlate[1] = [];
      initPlate[1][0] = EgyptEternalProtocol.Symbol.TEN;
      initPlate[1][1] = EgyptEternalProtocol.Symbol.JP;
      initPlate[1][2] = EgyptEternalProtocol.Symbol.Q;
      initPlate[1][3] = EgyptEternalProtocol.Symbol.K;

      initPlate[2] = [];
      initPlate[2][0] = EgyptEternalProtocol.Symbol.WILD;
      initPlate[2][1] = EgyptEternalProtocol.Symbol.WILD;
      initPlate[2][2] = EgyptEternalProtocol.Symbol.WILD;
      initPlate[2][3] = EgyptEternalProtocol.Symbol.WILD;

      initPlate[3] = [];
      initPlate[3][0] = EgyptEternalProtocol.Symbol.TEN;
      initPlate[3][1] = EgyptEternalProtocol.Symbol.JP;
      initPlate[3][2] = EgyptEternalProtocol.Symbol.A;
      initPlate[3][3] = EgyptEternalProtocol.Symbol.SCEPTER;

      initPlate[4] = [];
      initPlate[4][0] = EgyptEternalProtocol.Symbol.ANKH;
      initPlate[4][1] = EgyptEternalProtocol.Symbol.SCATTER;
      initPlate[4][2] = EgyptEternalProtocol.Symbol.CHEST;
      initPlate[4][3] = EgyptEternalProtocol.Symbol.WILD;

      return initPlate;
   }

   protected ReelReachBottom(idx: number) {
      this.m_effectView.ReelStopEffect(idx);
   }

   /** 產生 Symbol 隨機資料 */
   protected CreateRandomData(trackIdx?: number, symbolIdx?: number): CreateRandomData {
      let randomData = new CreateRandomData();
      let randomSymbol: number[] = []
      let symbolWeight: number[] = []
      let randomType: number[] = []
      let typeBallWeight: number[] = []

      if (this.m_effectView.IsInFg) {
         randomSymbol = FG_RANDOM_SYMBOL_TRACK[trackIdx];
         symbolWeight = FG_SYMBOL_WEIGHT_TRACK[trackIdx];
         randomType = MG_FG_IN_JP_TYPE[0];
         typeBallWeight = FG_THUNDER_BALL_JP_TYPE_WEIGHT[0];
      }
      else {
         randomSymbol = MG_RANDOM_SYMBOL_TRACK[trackIdx];
         symbolWeight = MG_SYMBOL_WEIGHT_TRACK[trackIdx];
         randomType = MG_FG_IN_JP_TYPE[0];
         typeBallWeight = MG_THUNDER_BALL_JP_TYPE_WEIGHT[0];
      }

      randomData.symbolId = this.PrizeWeighted(randomSymbol, symbolWeight);

      //randomData.symbolId = this.m_reelSettingMenu.GetRandomSymbol(trackIdx,this.m_effectView.IsInFg);

      return randomData
   }

   public CreateRandomValue(): BigNumber {
      let randomValue = new BigNumber(0);
      randomValue = new BigNumber(Math.floor(this.m_gameBar.BetValue / 100) * ((Math.floor(Math.random() * 10) + 1) * 10));
      return randomValue;
   }

   public SpinReel(isFastMode: boolean = false, spinSetting?: CommonSpinnerSpeedConfig, isInTurbo: boolean = false) {
      this.ResetParameter();
      this.m_isTurbo = isInTurbo;
      if (spinSetting == null) {
         if (isInTurbo) {
            spinSetting = TURBO_SPIN_SETTING;
         } else if (isFastMode) {
            spinSetting = FASTER_SPIN_SETTING;
         } else {
            spinSetting = FASTER_SPIN_SETTING;
         }
      }

      //判斷是否有JP鎖定
      let isJpLock = this.m_effectView.IsJpLock.slice();
      this.m_typeWeight = this.m_effectView.IsInFg ? FG_THUNDER_BALL_JP_TYPE_WEIGHT[0].slice() : MG_THUNDER_BALL_JP_TYPE_WEIGHT[0].slice();
      isJpLock.push(false); //為了對齊6個(多了jpmax)
      for (let i = 0; i < EgyptEternalProtocol.JpType.MAX; i++) {
         if (isJpLock[i]) {
            this.m_typeWeight[i] = 0;
         }
      }

      super.SpinReel(isFastMode, spinSetting);
   }

   public SetFinalData(data: any[][], isNearWin?: boolean[] | number[]) {
      //在MG且此轉進BG時，有50%機率出現預兆
      if (!this.m_effectView.IsInFg && this.m_effectView.Phase[PhaseType.GREEN] == 6 && Math.floor(Math.random() * 100) < 50) {
         this.m_effectView.ShowMGOmen(() => {
            super.SetFinalData(data, isNearWin);
         })
      }
      else {
         super.SetFinalData(data, isNearWin);
      }
   }

   /** 創建 Symbol 節點 */
   protected CreateSymbol(trackIdx: number, symbolIdx: number, data?: any): Node {
      //創立Symbol節點
      let node = new Node(trackIdx + "_" + symbolIdx);
      node.addComponent(UIOpacity);
      node.addComponent(UITransform);

      //增加Sprite組件
      let spriteComp = node.addComponent(Sprite);

      //當傳進來的data是PlateData結構時，代表是真實盤面資料，symbolId就以真實資料為主
      //當是一般number類型時，代表他是從CreateRandomData()按照權重隨機產出來的
      let symbolId = 0;
      let type = -1;
      if (data instanceof PlateData) {
         symbolId = data.symbolId;
         type = data.jpType;
      }
      else if (data instanceof CreateRandomData) {
         symbolId = data.symbolId;
         type = data.type;
      }
      else {
         symbolId = data;
         type = EgyptEternalProtocol.JpType.MAX;
      }

      spriteComp.spriteFrame = this.m_symbolSpriteFrames[symbolId];

      this.m_symbolSpriteComp[trackIdx][symbolIdx] = spriteComp;
      this.m_symbolids[trackIdx][symbolIdx] = symbolId;


      return node;
   }



   protected OnSymbolLeaving(trackIdx: number, symbolIdx: number, node: Node): void {
      this.m_symbolids[trackIdx].shift();
   }

   /** Symbol 正在進入盤面 */
   protected OnSymbolEntering(trackIdx: number, symbolIdx: number, node: Node, data?: any): void {
      //當傳進來的data是PlateData結構時，代表是真實盤面資料，symbolId就以真實資料為主
      //當是一般number類型時，代表他是從CreateRandomData()按照權重隨機產出來的
      let symbolId: number = null;
      let value: BigNumber = null;
      let type: number = null;
      if (data instanceof PlateData) {
         symbolId = data.symbolId;
         value = data.coinValue;
         type = data.jpType;
      }
      else if (data instanceof CreateRandomData) {
         symbolId = data.symbolId;
         value = data.value;
         type = data.type;
      }
      else {
         symbolId = data;
         value = new BigNumber(0);
         type = EgyptEternalProtocol.JpType.MAX;
      }

      if (symbolId == EgyptEternalProtocol.Symbol.SCATTER) {
         if (this.m_protectCount[trackIdx] == 0) {
            this.m_isProtecting[trackIdx] = true;
         }

         if (this.m_protectCount[trackIdx] > 0 && data instanceof CreateRandomData) {
            let withoutSymbol: number[] = [EgyptEternalProtocol.Symbol.SCATTER]
            let randomData = this.CreateRandomWithoutSymbol(withoutSymbol, trackIdx)
            symbolId = randomData.symbolId;
            value = randomData.value;
            type = randomData.type
         }
      }

      if (this.m_isProtecting[trackIdx]) {
         this.m_protectCount[trackIdx]++;
      }

      if (this.m_protectCount[trackIdx] > 2) {
         this.m_protectCount[trackIdx] = 0;
         this.m_isProtecting[trackIdx] = false;
      }



      this.m_symbolids[trackIdx].push(symbolId);
      this.m_symbolSpriteComp[trackIdx][symbolIdx].spriteFrame = this.m_symbolSpriteFrames[symbolId]

      //調整Symbol節點層級，不在盤面上的層級要較低，Wheel Scatter>其他，然後下蓋上
      for (let s = 0; s < this.m_totalSockets[trackIdx]; s++) {
         //層級順序:下蓋上
         let symbolIndex: number = this.m_symbolIndex[trackIdx][s];
         this.m_symbolNodes[trackIdx][symbolIndex].setSiblingIndex(this.m_totalSockets[trackIdx] - s);

         //層級順序:綠球 > Scatter > 其他在盤面上的 > 盤面外
         if (this.m_symbolids[trackIdx][s] == EgyptEternalProtocol.Symbol.SCATTER) {
            this.m_symbolNodes[trackIdx][symbolIndex].setSiblingIndex(this.m_symbolNodes[trackIdx][symbolIndex].getSiblingIndex() + 10);
         }

         //盤面外層級
         if (trackIdx == 0 || trackIdx == 4) {
            //最上跟最下沒露出的Symbol
            if (s == 0 || s == 4) {
               this.m_symbolNodes[trackIdx][symbolIndex].setSiblingIndex(this.m_symbolNodes[trackIdx][symbolIndex].getSiblingIndex() - 10);
            }
         }
      }
   }



   //region 自己的功能
   /**
    * 設定金幣或雷電球上的金額與Skin
    * @param node 要設定的節點
    * @param value 數值
    * @param type jpType
    */
   private SetCoinOrBallSkinValue(node: Node, value: BigNumber, type: number, isCreateSymbol: boolean = false) {
      let valueLabel: Label = NodeUtils.GetUI(node, "Value").getComponent(Label);
      valueLabel.string = NumberUtils.Format(value, EgyptEternalDefine.COIN_VALUE_ADDR);

      let ske = NodeUtils.GetUI(node, "Spine").getComponent(sp.Skeleton);
      ske.setSkin(EgyptEternalDefine.JP_SKIN_TYPE[type]);
      if (type == EgyptEternalProtocol.JpType.MAX) {
         valueLabel.node.active = true;
         if (value.dividedBy(this.m_bind.GameBar.BetValue).gte(EgyptEternalDefine.HIGH_VALUE)) {
            valueLabel.font = this.m_highValueFont;
         }
         else {
            valueLabel.font = this.m_normalValueFont;
         }
      }
      else {
         valueLabel.node.active = false;
         if (isCreateSymbol) {
            let tempSkin = new SkinAttribute();
            tempSkin.ske = ske;
            tempSkin.type = type;
            this.m_skinNode.push(tempSkin);
         }
      }
   }

   /**解決在createsymbol時還不能設定skin問題,只能等他node建好再設定skin */
   public SetSymbolSkin() {
      for (let i = 0; i < this.m_skinNode.length; i++) {
         this.m_skinNode[i].ske.setSkin(EgyptEternalDefine.JP_SKIN_TYPE[this.m_skinNode[i].type]);
      }
      this.m_skinNode = [];
   }


   /**打開盤面 */
   public Show() {
      this.node.active = true;
      this.SetSymbolSkin();
   }

   /**關閉盤面 */
   public Hide() {
      this.node.active = false;
   }

   /**
    * 設定盤面透明度
    * @param opacity 透明度
    * @param isTween 是否要Tween
    * @param duration 變透明度的時間
    */
   public SetReelOpacity(opacity: number, isTween: boolean = false, duration: number = 0.5) {
      if (isTween) {
         tween(this.node.getComponent(UIOpacity))
            .to(duration, { opacity: opacity })
            .start();
      }
      else {
         this.node.getComponent(UIOpacity).opacity = opacity;
      }
   }

   /**開始NearWin */
   private StartNearWin(idx: number) {
      this.m_effectView.StartNearWin(idx);
   }

   /**軌道完全停止*/
   protected ReelStop(idx: number) {
      this.m_effectView.StopNearWin(idx);
   }


   /**
   * 按照權重生成結果
   */
   private RandomResultByWeight(items: Array<number>, itemsWeight: Array<number>): number {
      let result = this.PrizeWeighted(items, itemsWeight);
      return result;
   }



   /**
    * 獎品權重
    * @param items 獎品
    * @param itemsWeight 權重
    */
   private PrizeWeighted(items: Array<number>, itemsWeight: Array<number>) {
      let randomCount: number = 0;
      let TotalWeight = eval(itemsWeight.join("+"));
      let randomSymbol: number = Math.floor(Math.random() * TotalWeight);

      for (let j = 0; j < itemsWeight.length; j++) {
         randomSymbol = randomSymbol - itemsWeight[j];

         if (randomSymbol < 0) {
            //是我
            randomCount = j;
            break;
         }
      }

      return items[randomCount];
   }

   public FgInitPlate() {
      let initPlate: number[][] = [];

      initPlate[0] = [];
      initPlate[0][0] = EgyptEternalProtocol.Symbol.ANKH;
      initPlate[0][1] = EgyptEternalProtocol.Symbol.SCATTER;
      initPlate[0][2] = EgyptEternalProtocol.Symbol.WEDJAT;
      initPlate[0][3] = EgyptEternalProtocol.Symbol.SPHINX;

      initPlate[1] = [];
      initPlate[1][0] = EgyptEternalProtocol.Symbol.TEN;
      initPlate[1][1] = EgyptEternalProtocol.Symbol.JP;
      initPlate[1][2] = EgyptEternalProtocol.Symbol.Q;
      initPlate[1][3] = EgyptEternalProtocol.Symbol.K;

      initPlate[2] = [];
      initPlate[2][0] = EgyptEternalProtocol.Symbol.WILD;
      initPlate[2][1] = EgyptEternalProtocol.Symbol.WILD;
      initPlate[2][2] = EgyptEternalProtocol.Symbol.WILD;
      initPlate[2][3] = EgyptEternalProtocol.Symbol.WILD;

      initPlate[3] = [];
      initPlate[3][0] = EgyptEternalProtocol.Symbol.TEN;
      initPlate[3][1] = EgyptEternalProtocol.Symbol.JP;
      initPlate[3][2] = EgyptEternalProtocol.Symbol.A;
      initPlate[3][3] = EgyptEternalProtocol.Symbol.SCEPTER;

      initPlate[4] = [];
      initPlate[4][0] = EgyptEternalProtocol.Symbol.ANKH;
      initPlate[4][1] = EgyptEternalProtocol.Symbol.SCATTER;
      initPlate[4][2] = EgyptEternalProtocol.Symbol.CHEST;
      initPlate[4][3] = EgyptEternalProtocol.Symbol.WILD;

      return initPlate;
   }

   /**
    * 排除特定Symbol,並產生隨機Symbol
    * @param withoutSymbol 要排除的symbol
    * @param trackIdx 第幾輪
    * @returns 產出的隨機Symbol
    */
   private CreateRandomWithoutSymbol(withoutSymbol: number[], trackIdx: number) {
      let randomData = new CreateRandomData();
      let randomSymbol: number[] = []
      let symbolWeight: number[] = []
      let randomType: number[] = []
      let typeBallWeight: number[] = []

      if (this.m_effectView.IsInFg) {
         randomSymbol = FG_RANDOM_SYMBOL_TRACK[trackIdx].slice();
         symbolWeight = FG_SYMBOL_WEIGHT_TRACK[trackIdx].slice();
         randomType = MG_FG_IN_JP_TYPE[0];
         typeBallWeight = FG_THUNDER_BALL_JP_TYPE_WEIGHT[0];
      }
      else {
         randomSymbol = MG_RANDOM_SYMBOL_TRACK[trackIdx].slice();
         symbolWeight = MG_SYMBOL_WEIGHT_TRACK[trackIdx].slice();
         randomType = MG_FG_IN_JP_TYPE[0];
         typeBallWeight = MG_THUNDER_BALL_JP_TYPE_WEIGHT[0];
      }

      //排除的symbol
      for (let i = 0; i < withoutSymbol.length; i++) {
         let index = randomSymbol.indexOf(withoutSymbol[i]);
         if (index != -1) {
            randomSymbol.splice(index, 1);
            symbolWeight.splice(index, 1);
         }
      }

      randomData.symbolId = this.PrizeWeighted(randomSymbol, symbolWeight);

      return randomData
   }

   /**
    * 設定BeforeData(下面那排)
    * @param resultPlate 停輪後盤面
    */
   public SetBeforeData(resultPlate?: PlateData[][]) {
      let canBallOrScatter: boolean[] = [true, true, true, true, true];
      for (let i = 0; i < resultPlate.length; i++) {
         for (let j = 1; j < resultPlate[i].length; j++) {
            if (resultPlate[i][j].symbolId == EgyptEternalProtocol.Symbol.SCATTER) {
               canBallOrScatter[i] = false;
               break;
            }
         }
      }

      let beforePlate: CreateRandomData[][] = [];
      let withoutSymbol: number[] = [EgyptEternalProtocol.Symbol.SCATTER]

      for (let i = 0; i < 5; i++) {
         beforePlate[i] = [];
         beforePlate[i][0] = new CreateRandomData();
         let randomDataWithout = this.CreateRandomWithoutSymbol(withoutSymbol, i);
         let randomData = this.CreateRandomData(i);
         beforePlate[i][0].symbolId = canBallOrScatter[i] ? randomData.symbolId : randomDataWithout.symbolId;
         beforePlate[i][0].type = canBallOrScatter[i] ? randomData.type : randomDataWithout.type;
         beforePlate[i][0].value = canBallOrScatter[i] ? randomData.value : randomDataWithout.value;
      }
      super.SetBeforeData(beforePlate)
   }

   public SetProtectSymbol() {
      for (let i = 0; i < this.m_protectCount.length; i++) {
         this.m_protectCount[i] = 0;
      }

      for (let i = 0; i < this.m_isProtecting.length; i++) {
         this.m_isProtecting[i] = true;
      }
   }

   public ChangeOutsideSymbol() {
      let withoutSymbol: number[] = [EgyptEternalProtocol.Symbol.SCATTER]
      for (let i = 0; i < EgyptEternalDefine.MAIN_COLUMN; i++) {
         let randomUpData = this.CreateRandomWithoutSymbol(withoutSymbol, i);
         let upNode = this.GetSymbolNode(i, -1);
         upNode.getChildByName("Symbol_10").active = false;
         upNode.getComponent(Sprite).spriteFrame = this.m_symbolSpriteFrames[randomUpData.symbolId];

         let randomDownData = this.CreateRandomWithoutSymbol(withoutSymbol, i);
         let downNode = this.GetSymbolNode(i, 3);
         downNode.getChildByName("Symbol_10").active = false;
         downNode.getComponent(Sprite).spriteFrame = this.m_symbolSpriteFrames[randomDownData.symbolId];
      }


   }

   /**每轉要Reset的變數 */
   private ResetParameter() {

   }
}
