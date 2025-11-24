
import EgyptEternalDefine from "./EgyptEternalDefine";
import EgyptEternalGameView from "./EgyptEternalGameView";
import { FRANKENSTEIN_U2G_PROTOCOL } from "./EgyptEternalProtocol";
import { _decorator, EventTouch } from 'cc';
import { Enum } from "cc";

import { GameMock } from "../../../Script/Game/Common/SlotGame/GameMock";
import { SlotGameOption } from "../../../Script/Game/Common/SlotGame/Data/SlotGameOption";
import { GameBarDefine } from "../../../Script/Game/Platform/GameBar/GameBarDefine";
import EgyptEternalEffectView from "./EgyptEternalEffectView";
import { StateManager } from "db://assets/Stark/Utility/StateManager/StateManager";
import { EnvConfig } from "db://assets/Script/Define/ConfigDefine";
import { Device } from "db://assets/Script/Device/Device";
import { EgyptEternalBind } from "./EgyptEternalBind";


let MAIN_STATE = Enum({
   JOIN: 1,
   INIT_GAME: 2,
   RES_CHECK: 3,
   GAME: 4,
});

const { ccclass, property } = _decorator;

@ccclass
export default class EgyptEternalMain extends GameMock.SlotGameBaseMock {

   @property({ type: EgyptEternalBind, tooltip: "Bind" })
   private m_bind: EgyptEternalBind = null;

   private m_gameView: EgyptEternalGameView = null;


   private m_state: StateManager = null;
   private m_isAudioReady: boolean = false;
   private m_EffrctView: EgyptEternalEffectView;
   //=========================================================================================================
   onLoad() {
      super.onLoad && super.onLoad();
      //Ide橫版遊戲會跑版
      // if (Device.Current.IsRegularScreen()) {
      //    this.node.setPosition(0, 75, 0);
      // }
      // else {
      //    this.node.setPosition(0, 75, 0);
      //    this.node.setScale(0.78, 0.78, 1);
      // }
      this.m_state = new StateManager(MAIN_STATE.JOIN);
   }

   public InitBind() {
      this.m_bind.InitBind(this);
      this.m_gameView = this.m_bind.GameView;
   }

   //=========================================================================================================
   // 資源載入完成通知
   public OnPlatformReady() {
      super.OnPlatformReady && super.OnPlatformReady();
      // this.m_isReady = true;
   }
   //=========================================================================================================
   update(dt: number) {
      super.update && super.update(dt);

      let currentState = this.m_state.Tick();

      switch (currentState) {
         case MAIN_STATE.JOIN: {
            // if (GamesChief.SlotGame.IsGameSessionReady && GamesChief.SlotGame.GameBar && GamesChief.SlotGame.IsPlatformReady) {
            //    this.m_state.NextState(MAIN_STATE.INIT_GAME);
            // }
            if (GamesChief.SlotGame.GameBar) {
               this.InitBind();
               this.m_bind.GameBar = GamesChief.SlotGame.GameBar;
               this.m_state.NextState(MAIN_STATE.INIT_GAME);
            }
            break;
         }

         case MAIN_STATE.INIT_GAME: {
            if (this.m_state.IsEntering) {
               this.m_gameView.Init(this);
               GamesChief.SlotGame.SessionQuery(FRANKENSTEIN_U2G_PROTOCOL.GAME_INFO_REQ);
               this.OnTransitionHide();
            }
            if (this.m_gameView.IsInit()) {
               this.m_state.NextState(MAIN_STATE.RES_CHECK);
            }
            this.m_gameView.MainProcess(dt);
            break;
         }

         case MAIN_STATE.RES_CHECK: {
            if (this.m_state.IsEntering) {
               this.LoadAudio();

               if (EnvConfig.IS_DEV) {
                  this.LoadGodHand();
               }
            }
            if (this.m_isAudioReady && this.m_gameView.IsResourceReady()) {
               this.m_state.NextState(MAIN_STATE.GAME);
               // this.SetSideBarPositionY( this.m_Hide );
               this.CustomSideBarButtonPositionY();
            }
            this.m_gameView.MainProcess(dt);
            break;
         }

         case MAIN_STATE.GAME: {
            if (this.m_state.IsEntering) {
               GamesChief.SlotGame.GameReady()
            }
            this.m_gameView.MainProcess(dt);
            break;
         }
      }
   }
   //=========================================================================================================
   // OnTouchEvent ( event: EventTouch )
   // {
   //    super.OnTouchEvent && super.OnTouchEvent( event );

   //    if ( this.m_gameView )
   //    {
   //       this.m_gameView.OnTouchEvent( event );
   //    }
   // }
   public GameOption(): SlotGameOption {
      const option: SlotGameOption = {
         GameVersion: EgyptEternalDefine.VERSION,
         GameCheckVersion: 0,
         AudioLoadingProfile: EgyptEternalDefine.AudioFilePath,
         CommandRetryable: true,
      }
      return option
   }

   public OnGameSessionReady(): void {

   }
   //=========================================================================================================
   OnSessionResponse(type: number, content: Uint8Array) {
      this.m_gameView.OnCommand(type, content);
   }
   //=========================================================================================================
   SendGameCommand(cmdType: number, content?: any) {
      GamesChief.SlotGame.SessionQuery(cmdType, content);
   }
   //=========================================================================================================
   private LoadAudio() {
      let audioFirstList = {};

      let copyValue = (target, give) => {
         let keys = Object.keys(give);
         for (let k of keys) {
            target[k] = give[k];
         }
      };

      copyValue(audioFirstList, EgyptEternalDefine.AudioFilePath);
      this.m_isAudioReady = true;
   }
   //=========================================================================================================
   public onDisable() {
      super.onDisable && super.onDisable();
   }
   //=========================================================================================================
   /**
   * 是否啟用側邊欄隱藏模式
   */
   protected SideBarInvisibleMode(): boolean {
      return false;
   }
   //=========================================================================================================
   // public GameLanguage ( currLang: string ): string
   // {
   //    switch ( currLang )
   //    {
   //       case LocaleMacro.LANGUAGE.CN:
   //       case LocaleMacro.LANGUAGE.TW:
   //       case LocaleMacro.LANGUAGE.EN:
   //          return currLang;
   //    }

   //    return super.GameLanguage( currLang );
   // }
   //=========================================================================================================
   private LoadGodHand(): void {
      /*   Bundle.resources.load( AssetsDefine.PREFAB_SLOT_GOD_HAND, Prefab, ( err: Error, res: Prefab ) =>
         {
            if ( err )
            {
               err && error( "LOAD GOD HAND ERROR ::: ", err.message );
            } else
            {
               let node = instantiate( res );
               let comp = node.getComponent( SlotGameGodHand );
               SlotGameGodHand.instance = comp;
               SlotGameGodHand.instance.Init( this.m_gameView.SlotReel, this.m_controlBar, {
                  cheat: false,
                  slotFast: true,
                  slotNormal: true,
                  slotReelFastSetting: FASTER_SPIN_SETTING,
                  slotReelNormalSetting: NORMAL_SPIN_SETTING
               } );
               node.x = 400;
               node.y = 200;
               FullFrame.GetInstance().addChild( node );
            }
         } );*/
   }
   //=========================================================================================================

   // protected EnableHUDArea (): boolean
   // {
   //    return false;
   // }
   //=========================================================================================================

   // public OnLoadingViewHide ()
   // {
   //    super.OnLoadingViewHide && super.OnLoadingViewHide();
   //    //  this.m_gameView.Run();
   // }
   //=========================================================================================================

   // public get ThemeType ()
   // {
   //    return this.m_themeType;
   // }

   // public OnGameBarSpinButtonClicked(state: GameBarDefine.SpinButtonState): void {
   //    // if (state == GameBarDefine.SpinButtonState.SPIN) {
   //    //     this.m_gameView.StartSpin();
   //    // } else if (state == GameBarDefine.SpinButtonState.STOP) {
   //    //     this.m_gameView.ClickStop();
   //    // }
   //    this.m_gameView.OnSpinBtnClick();
   // }

   public OnGameBarSpinButtonClicked(state: GameBarDefine.SpinButtonState): void {
      switch (state) {
         case GameBarDefine.SpinButtonState.SPIN:
            this.m_gameView.OnSpinBtnClick()
            break
         case GameBarDefine.SpinButtonState.STOP:
            this.m_gameView.OnStopBtnClick()
            break
      }
   }

   public OnGameBarEventTouch(event: EventTouch): void {

   }

   public OnBetInfoUpdate(): void {
      if (this.m_gameView?.IsInit() && this.m_gameView?.IsBetChangeable()) {
         GamesChief.SlotGame.CheckAndUpdateBetList();
      }
   }

   public OnTransitionHide(): void {
      this.m_gameView.MgOpening(() => { });
   }
}
