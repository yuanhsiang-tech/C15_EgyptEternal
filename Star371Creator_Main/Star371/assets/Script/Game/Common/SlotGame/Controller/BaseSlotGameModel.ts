import { GameCommonCommand } from "../../GameCommonCommand";

export default abstract class BaseSlotGameModel
{
   ////View
   //目前遊戲顯示狀態 不表示實際狀態，實際狀態請取Data資料
   protected m_isInBounsGame: boolean = false;
   protected m_isInFreeGame: boolean = false;
   protected m_isAutoPlay: boolean = false;
   protected m_runEffectAction: boolean = false; //現在有在播放中的特效
   protected m_isControllableFG: boolean = false;

   public get isControllableFG (): boolean { return this.m_isControllableFG; }
   public set isControllableFG ( value: boolean ) { this.m_isControllableFG = value; }

   public get isInFeatureGame (): boolean { return this.m_isInBounsGame || this.m_isInFreeGame; }
   public set isInBonusGame ( b: boolean ) { this.m_isInBounsGame = b; }
   public get isInBonusGame (): boolean { return this.m_isInBounsGame; }
   public set isInFreeGame ( b: boolean ) { this.m_isInFreeGame = b; }
   public get isInFreeGame (): boolean { return this.m_isInFreeGame; }
   public set isAutoPlay ( b: boolean ) { this.m_isAutoPlay = b; }
   public get isAutoPlay (): boolean { return this.m_isAutoPlay; }
   public set runEffectAction ( b: boolean ) { this.m_runEffectAction = b; }
   public get runEffectAction (): boolean { return this.m_runEffectAction; }

   public get isAutoContinue (): boolean { return this.m_isAutoPlay || ( this.isInFeatureGame && !this.m_isControllableFG ); }
   public get canChangeGameBarSpinState (): boolean { return !this.m_isAutoPlay || ( this.isInFeatureGame && !this.m_isControllableFG ); }
   public get canUpdateBetTable (): boolean { return !this.isInFeatureGame; } //是否可以刷新bet清單
   public get canGameBarToStop (): boolean { return true; } //Spin之後會切換成stop的狀態，在此會維持spin灰階

   abstract get plate (): number[][];
   abstract get enterFeatureGame (): boolean; //GAME_SPIN_WILL_FINISH
   abstract get win (): BigNumber; //單局贏分
   abstract get lineAwardData (): GameCommonCommand.ILineAwardData[];

}
