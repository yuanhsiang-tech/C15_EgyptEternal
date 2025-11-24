import { _decorator, isValid } from "cc";
import BaseSlotGameModel from "./BaseSlotGameModel";
import { EventDefine } from "../../../../Define/EventDefine";
import GameBar from "../../../Platform/GameBar/GameBar";
import SlotGameBase from "../SlotGameBase";
import { EventDispatcher } from "db://assets/Stark/Utility/EventDispatcher";

/***
 * 
 * 
 * 有串的event
 * 1. GAME_ENTER_IDLE
 * 2. GAME_SPIN_START
 * 10. GAME_LEAVE_FEATURE_TO_MAIN_IDLE
 * 
 * 
 */
export default class SlotCommonAdapter
{

   private m_gameScene: SlotGameBase = undefined;
   private m_gameBar: GameBar = undefined;

   private m_gameModel: BaseSlotGameModel = null;

   private m_lastIdleFeature: boolean = false;
   private m_leaveFeature: boolean = false;
   set lastIdleFeature ( b: boolean ) { this.m_lastIdleFeature = b; }
   get lastIdleFeature (): boolean { return this.m_lastIdleFeature; }

   constructor ( gameStage: SlotGameBase, gameBar: GameBar, gameModel: BaseSlotGameModel )
   {
      this.m_gameScene = gameStage;
      this.m_gameBar = gameBar;
      this.m_gameModel = gameModel;
   }

   ////// MG
   public OnIDLE ( isFeature: boolean )
   {
      if ( ( this.m_lastIdleFeature === true && isFeature === false ) || ( this.m_leaveFeature === true ) )
      {
         this.m_leaveFeature = false;
         EventDispatcher.Shared.Dispatch( EventDefine.Game.LEAVE_FEATURE_TO_MAIN_IDLE );
      }
      this.m_lastIdleFeature = isFeature;
      EventDispatcher.Shared.Dispatch( EventDefine.Game.ENTER_IDLE ); // 機台進入 IDLE 狀態 (可以下一次Spin)
   }

   public OnSPIN ( pay: boolean )
   {
      if ( pay )
      {
         GamesChief.SlotGame.SetSaveBetValue(this.m_gameBar.BetValue); // bet 記憶
         this.m_gameBar.SetBetBtnDisable();
      }
      
      EventDispatcher.Shared.Dispatch( EventDefine.Game.SPIN_START ); // 按下 SPIN 按鈕
   }

   public OnSpinAckSuccess ( pay: boolean, enterFeature: boolean )
   {
      EventDispatcher.Shared.Dispatch( EventDefine.Game.SPIN_WILL_FINISH, enterFeature );
   }

   public OnOneSpinEnd ( model: BaseSlotGameModel, lineMaxCount: number )
   {
      if ( isValid( model ) )
      {
         if ( isValid( model.win ) && lineMaxCount > 0 && model.win.gte( 0 ) && isValid( model.lineAwardData ) && model.lineAwardData.length > 0 )
         {
            let len = model.lineAwardData.length;
            for ( let i = 0; i < len; i++ )
            {
               if ( model.lineAwardData[ i ].GetCount() == lineMaxCount )
               {
                  EventDispatcher.Shared.Dispatch( EventDefine.Game.LINES_OF_A_KIND, this.m_gameBar.BetValue, model.win );
                  break;
               }
            }
         }

         if ( !model.isAutoPlay && !model.isInFeatureGame )
         {
            this.m_gameBar.SetBetBtnEnable();
         }

         EventDispatcher.Shared.Dispatch( EventDefine.Game.SPIN_FINISH ); // 停輪後檢查有無大獎特效結束後 (不管 MG, FG, BG)    
      }

   }


   ////// FG
   public OnStartEnterFeatureGame ()
   {
      GamesChief.SlotGame.SetBackButtonEnabled(false);
      this.m_gameBar.SetBetBtnDisable();

      !this.m_gameModel.isControllableFG && this.m_gameBar.LockAutoPlayMenu();
   }

   public OnToFeatureGameChangeView ( isFree: boolean )
   {
      this.m_gameBar.SetDeviationEnable( true );
      EventDispatcher.Shared.Dispatch( isFree ? EventDefine.Game.ENTER_FREE_GAME : EventDefine.Game.ENTER_BONUS_GAME ); // 遊戲進入 FreeGame or BonusGame
   }

   public OnFromFeatureGameChangeView ( isFree: boolean )
   {
      this.m_gameBar.UnlockAutoPlayMenu();
      this.m_gameBar.SetDeviationEnable( false );
      GamesChief.SlotGame.SetBackButtonEnabled(true);
      EventDispatcher.Shared.Dispatch( isFree ? EventDefine.Game.LEAVE_FREE_GAME : EventDefine.Game.LEAVE_BONUS_GAME ); // 遊戲離開 FreeGame or BonusGame
      this.m_leaveFeature = true;
   }
}
