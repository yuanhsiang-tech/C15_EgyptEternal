import { _decorator, sp, isValid, Animation, Node, Vec3, Vec2, Component, Prefab, Tween, tween, instantiate } from "cc";
import FxCell, { IFxCellCommon } from "./FxCell";
import FxAnimator from "./FxAnimator";
import { GameCommonCommand } from "../../GameCommonCommand";
import { CommonSpinner } from "../../SlotSpinner/CommonSpinnerMacros";
import { UIOpacity } from "cc";
import GameResourceManager from "../../GameResourceManager";
import CommonSpinnerControl from "../../SlotSpinner/CommonSpinnerControl";
import { v3 } from "cc";
import CabrioNodePoolManager from "db://assets/Stark/NodePool/CommonNodePoolManager";
import CommonNodePool from "db://assets/Stark/NodePool/CommonNodePool";


const { ccclass, property, requireComponent } = _decorator;

let SP_OPACITY = {
   HIDE: 0,
   FADE: 80,
   DARK: 180,
   LIGHT: 255,
};

interface __CofferOption
{
   nodeCreator?: () => Node,
   maxSize?: number,
   initCount?: number,
   takeHandler?: ( node: Node ) => void;
   backHandler?: ( node: Node ) => void;
   deadHandler?: ( node: Node ) => void;
   poolHandlerComp?: string | { prototype: Component; };
   afterNodeCreate?: ( node: Node ) => void;
}



export interface FxSlotReelSetting
{
   PlateCount: number[],

   LineAwardIndexList?: number[][], //線獎資訊
   INDEX_MAP?: { c: number, r: number; }[],
   INDEX_MAP_INDEX_START?: number, //index 從多少開始

   ScatterSymbolId?: number, //Scatter id    
   WildSymbolId?: number,

   SymbolidEndNum: number,//max 

   GetOrder: ( symbold: number, c: number, r: number, isAnim: boolean ) => number;
   GetAward?: () => boolean[][];


   GetLines?: () => number[];
   GetLineAwardA?: ( line: number ) => boolean[];
   GetLineAwardB?: ( c: number, r: number ) => boolean[];

   PrefabAwardAnimName?: string;
   SpineAwardAnimName?: string;
   SpinePremultipliedAlpha?: boolean;
}



export interface FxNearWinSetting
{
   takeNearWinId: number, //從pool取表演的id
   nearWinAnimName: string, // 如果表演nearwin時，nearwin的 animName

   fadeInTime?: number, //大於0 表示需要淡入
   fadeOutTime?: number, //大於0 表示需要淡出

   offsetPos?: Vec2, //從pool取出，是否需要偏移設定    
   Key?: string, // 識別 兩個以上nearWin

   //未測試
   // hitSymbolId ?: number, // 如果表演nearwin時，此symbol是否要表演動畫    
   // hitSymbolAnimName ?: string, // scatter nearwin 表演的名稱
   // reachSymbolAnimName ?: string, // scatter 抵達的時候會撥放的動畫
   nearWinSoundList?: string[], //第一個撥放會從0開始
   playNearWinSoundCB?: ( trackIdx: number ) => void, //如果有CB什麼都不會判斷 直接丟回去

}

const PREFIX_PREFAB: string = "Fx_prefab_";
const PREFIX_SPINE: string = "Fx_spine_";

@ccclass
export default class FxCellController extends Component implements IFxCellCommon
{
   protected COFFER_MAX: number = 5; //COFFER 的最大值
   protected COFFER_DEFAULT_AMOUNT: number = 3; //預設產生數量

   protected MAX_SOCKET_AMOUNT: number = 0; // 需要透過setting 才會自動設定 所有symbol的總數量

   @property( { type: [ Prefab ], displayName: "Prefab" } ) protected m_resPrefabList: Prefab[] = [];
   @property( { type: [ sp.SkeletonData ], displayName: "Spine" } ) protected m_resSpineList: sp.SkeletonData[] = [];

   protected m_preSetting: __CofferOption[] = null;

   protected m_fxSetting: FxSlotReelSetting = null;
   protected m_nodeBank: CabrioNodePoolManager = null;
   protected m_effectNodeArr: FxCell[][] = null;

   protected m_baseSlotReel: CommonSpinnerControl = null;
   protected m_effectPanel: Node = null;

   protected m_syncAnim: Array<{ anim: Animation, playName: string; }> = [];
   protected m_syncSpine: Array<{ spine: sp.Skeleton, trackIndex: number, name: string, loop: boolean; }> = [];

   //---OneSpinData 每次spin都應該要被清空
   protected m_lineAwardTween: Tween<any> = null;
   protected m_lineData: GameCommonCommand.ILineAwardData[] = null;

   //-
   protected m_needClearNearWinAnim: boolean = false;
   protected m_nowNearWinSetting: FxNearWinSetting = null; //目前使用中的nearwinSetting
   protected m_isFirstNearWinTrackIdx: number = -1; //用來檢核是否要撥放 nearwin之前的動畫

   protected m_nearWinTween: Tween<any>[] = []; //處理淡出淡入 key:trackIdx
   protected m_nearWinFxAnim: FxAnimator[] = []; //每一輪的nearWin特效  key:trackIdx
   protected m_nearWinCount: number = 0;

   //---NearWin Start
   protected m_nearWinSetting: FxNearWinSetting[] = []; //[自訂key]
   protected m_nearWinDefault: string = null;
   protected m_checkReachSymbol: { id: number, reachAnimName: string; }[] = null; //在setting後 會被檢查 需要被檢查的symbolid

   //---NearWin End

   public get fxCells () { return this.m_effectNodeArr; }

   //---FxSetting
   public Init ( setting: FxSlotReelSetting, slot: CommonSpinnerControl, effectPanel: Node, fxCellType: typeof FxCell = FxCell )
   {
      ////---- 設定處理
      this.m_fxSetting = setting;
      let len: number = 0;

      ////---- init
      this.m_nodeBank = new CabrioNodePoolManager();
      this.m_baseSlotReel = slot;
      FxCell.COMMON = this;
      this.m_effectPanel = effectPanel;

      ////---- 資源處理
      if ( ( !isValid( this.m_resPrefabList ) || this.m_resPrefabList.length == 0 ) && isValid( GameResourceManager.RES_PREFAB_LIST ) )
      {
         this.m_resPrefabList = GameResourceManager.RES_PREFAB_LIST;
      }
      if ( ( !isValid( this.m_resSpineList ) || this.m_resSpineList.length == 0 ) && isValid( GameResourceManager.RES_SPINE_LIST ) )
      {
         this.m_resSpineList = GameResourceManager.RES_SPINE_LIST;
      }

      ////---- 建立Pools        
      if ( !isValid( this.m_preSetting ) )
      {
         this.m_preSetting = []; //省略檢查
      }
      //-- 單純 Symbol
      len = setting.SymbolidEndNum;
      for ( let i = 0; i < len; i++ )
      {
         let option: __CofferOption = null;
         //使用者自訂的清單
         if ( isValid( this.m_preSetting[ i ] ) )
         {
            option = this.m_preSetting[ i ];
         }
         if ( isValid( this.m_resPrefabList[ i ] ) )
         {
            this.ReedAddCoffer( i, this.GetPrefabCofferOption( i, this.m_resPrefabList[ i ], option ) );
            this.m_preSetting[ i ] = null;
         } else if ( isValid( this.m_resSpineList[ i ] ) )
         {
            this.ReedAddCoffer( i, this.GetSpineCofferOption( i, this.m_resSpineList[ i ], option ) );
            this.m_preSetting[ i ] = null;
         }
      }
      //-- 額外
      let keys = Object.keys( this.m_preSetting );
      len = keys.length;
      for ( let i = 0; i < len; i++ )
      {
         let key: number = Number( keys[ i ] );
         let option: __CofferOption = this.m_preSetting[ key ];
         if ( isValid( option ) )
         {
            if ( isValid( this.m_resPrefabList[ key ] ) )
            {
               this.ReedAddCoffer( key, this.GetPrefabCofferOption( key, this.m_resPrefabList[ key ], option ) );
               this.m_preSetting[ key ] = null;
            } else if ( isValid( this.m_resSpineList[ key ] ) )
            {
               this.ReedAddCoffer( key, this.GetSpineCofferOption( key, this.m_resSpineList[ key ], option ) );
               this.m_preSetting[ key ] = null;
            }
         }
      }
      this.m_preSetting = null;

      //NearWin Pool
      if ( isValid( this.m_nearWinSetting ) )
      {
         keys = Object.keys( this.m_nearWinSetting );
         len = keys.length;
         for ( let i = 0; i < len; i++ )
         {
            let data: FxNearWinSetting = this.m_nearWinSetting[ keys[ i ] ];
            if ( isValid( data ) && !isValid( this.m_nodeBank.GetPool( data.takeNearWinId ) ) )
            {
               let key: number = Number( data.takeNearWinId );
               if ( isValid( this.m_resPrefabList[ key ] ) )
               {
                  this.ReedAddCoffer( key, this.GetPrefabCofferOption( key, this.m_resPrefabList[ key ] ) );
               } else if ( isValid( this.m_resSpineList[ key ] ) )
               {
                  this.ReedAddCoffer( key, this.GetSpineCofferOption( key, this.m_resSpineList[ key ] ) );
               }
            }
            //未測試
            // if(isValid(data) && isValid(data.hitSymbolId) && data.hitSymbolId > -1 && isValid(data.reachSymbolAnimName)){
            //     if(!this.m_checkReachSymbol) this.m_checkReachSymbol = [];
            //     this.m_checkReachSymbol.push({id:data.hitSymbolId, reachAnimName:data.reachSymbolAnimName});
            // }
         }
      }

      ////---- 動畫插槽建立表演節點 (若在init之前有初始化 就吃遊戲初始化)
      if ( !isValid( this.m_effectNodeArr ) )
      {
         let rLen: number = 0;
         this.m_effectNodeArr = [];
         len = this.m_fxSetting.PlateCount.length;
         let index: number = 0;
         let last = null;
         for ( let i = 0; i < len; i++ )
         {
            this.m_effectNodeArr[ i ] = [];
            rLen = this.m_fxSetting.PlateCount[ i ];
            this.MAX_SOCKET_AMOUNT = this.MAX_SOCKET_AMOUNT + rLen;
            for ( let j = 0; j < rLen; j++ )
            {
               last = new fxCellType( slot.GetSocketPositionOnPlate( i, j ), index, i, j );
               this.m_effectNodeArr[ i ][ j ] = last;

               this.m_effectNodeArr[ i ][ j ].Before = last;
               last.After = this.m_effectNodeArr[ i ][ j ];

               index++;
            }
         }
         this.m_effectNodeArr[ 0 ][ 0 ].After = this.m_effectNodeArr[ 0 ][ 1 ];
         this.m_effectNodeArr[ len - 1 ][ rLen - 1 ].Before = this.m_effectNodeArr[ len - 1 ][ rLen - 2 ];
      } else
      {
         len = this.m_fxSetting.PlateCount.length;
         for ( let i = 0; i < len; i++ )
         {
            this.MAX_SOCKET_AMOUNT = this.MAX_SOCKET_AMOUNT + this.m_fxSetting.PlateCount[ i ];
         }
      }

      //----slot Reel        
      this.m_baseSlotReel.On( CommonSpinner.EVENT.TRACK_JUST_STOPPED, this.OnTrackStopped, this );
      this.m_baseSlotReel.On( CommonSpinner.EVENT.TRACK_START_NEAR_WIN, this.OnStartNearWin, this );



   }

   // 有多個盤面 創建完後 使用時 需要重新指定
   public ResetFxCellCommon ()
   {
      FxCell.COMMON = this;
   }

   protected ReedAddCoffer ( symbolIdOrKey: number, option: __CofferOption )
   {
      this.m_nodeBank.AddPool(
         symbolIdOrKey,
         new CommonNodePool(
            option.nodeCreator, {
            maxSize: option.maxSize,
            initCount: option.initCount,
            takeHandler: option.takeHandler,
            backHandler: option.backHandler,
            deadHandler: option.deadHandler,
            poolHandlerComp: option.poolHandlerComp,
         } )
      );
   }

   protected GetPrefabCofferOption ( symbolIdOrKey: number, data: Prefab, option?: __CofferOption ): __CofferOption
   {
      if ( !isValid( option ) ) option = {};
      if ( !isValid( option.nodeCreator ) )
      {
         option.nodeCreator = () =>
         {
            let node = instantiate( data );
            node.name = PREFIX_PREFAB + symbolIdOrKey;
            if ( isValid( option.afterNodeCreate ) )
            {
               option.afterNodeCreate( node );
            }
            return node;
         };
      }
      if ( !isValid( option.maxSize ) )
      {
         option.maxSize = this.COFFER_MAX;
      }
      if ( !isValid( option.initCount ) )
      {
         option.initCount = this.COFFER_DEFAULT_AMOUNT;
      }
      if ( !isValid( option.backHandler ) )
      {
         option.backHandler = ( node: Node ) =>
         {
            if ( isValid( node ) && isValid( node.getComponent( Animation ) ) )
            {
               node.getComponent( Animation ).stop();
            }
         };
      }
      return option;
   }

   protected GetSpineCofferOption ( symbolIdOrKey: number, data: sp.SkeletonData, option?: __CofferOption ): __CofferOption
   {
      if ( !isValid( option ) ) option = {};
      if ( !isValid( option.nodeCreator ) )
      {
         option.nodeCreator = () =>
         {
            let node = new Node();
            node.name = PREFIX_SPINE + symbolIdOrKey;
            let sklt = node.addComponent( sp.Skeleton );
            sklt.skeletonData = data;

            if ( this.m_fxSetting.SpinePremultipliedAlpha != undefined )
            {
               sklt.premultipliedAlpha = this.m_fxSetting.SpinePremultipliedAlpha;
            }

            if ( isValid( option.afterNodeCreate ) )
            {
               option.afterNodeCreate( node );
            }
            return node;
         };
      }
      if ( !isValid( option.maxSize ) )
      {
         option.maxSize = this.COFFER_MAX;
      }
      if ( !isValid( option.initCount ) )
      {
         option.initCount = this.COFFER_DEFAULT_AMOUNT;
      }
      if ( !isValid( option.backHandler ) )
      {
         option.backHandler = ( node: Node ) =>
         {
            if ( isValid( node ) && isValid( node.getComponent( sp.Skeleton ) ) )
            {
               node.getComponent( sp.Skeleton ).setToSetupPose();
            }
         };
      }
      return option;
   }

   /**
    * option如果沒有帶 就會放預設喔喔喔
    * @param symbolIdOrKey 
    * @param option 
    */
   public PreInitCreatePool ( symbolIdOrKey: number,
      option?: __CofferOption )
   {

      if ( !isValid( this.m_preSetting ) )
      {
         this.m_preSetting = [];
      }
      this.m_preSetting[ symbolIdOrKey ] = isValid( option ) ? option : {};
   }

   public PreInitSetNearWin ( setting: FxNearWinSetting )
   {
      //第一次新增
      if ( isValid( setting ) )
      {
         if ( !isValid( this.m_nearWinDefault ) )
         {
            if ( !isValid( setting.Key ) ) setting.Key = "Default";
            this.m_nearWinDefault = setting.Key;
         }
         if ( !isValid( setting.offsetPos ) ) setting.offsetPos = new Vec2();
         if ( !isValid( setting.fadeOutTime ) ) setting.fadeOutTime = 0;
         if ( !isValid( setting.fadeOutTime ) ) setting.fadeOutTime = 0;
         // if(!isValid(setting.hitSymbolId)) setting.hitSymbolId = -1;    
         this.m_nearWinSetting[ setting.Key ] = setting;
      }

   }

   ///---------------------

   public TakeNewEffectSymbolPrefab ( symbolId: number, c: number, r: number ): { node: Node, awardName: string; }
   {
      let symbol: Node = null;
      let animName = "";
      animName = isValid( this.m_resPrefabList[ symbolId ] ) ? this.m_fxSetting.PrefabAwardAnimName : animName;
      animName = isValid( this.m_resSpineList[ symbolId ] ) ? this.m_fxSetting.SpineAwardAnimName : animName;
      if ( isValid( this.m_nodeBank.GetPool( symbolId ) ) )
      {
         symbol = this.m_nodeBank.Take( symbolId );
      } else
      {
         symbol = new Node();
      }
      symbol.parent = this.m_effectPanel
      // this.m_effectPanel.addChild( symbol, this.m_fxSetting.GetOrder( symbolId, c, r, true ) );
      symbol.active = true;
      return { node: symbol, awardName: animName };
   }

   public BackEffectSymbolPrefab ( node: Node )
   {
      let isBack: boolean = false;
      let key: string = node.name.replace( PREFIX_PREFAB, "" );
      key = key.replace( PREFIX_SPINE, "" );
      let keyNum: number = Number( key );
      if ( String( keyNum ) == key )
      {
         if ( isValid( this.m_nodeBank.GetPool( keyNum ) ) )
         {
            this.m_nodeBank.Back( keyNum, node );
            isBack = true;
         }
      }

      if ( !isBack )
      {
         node.removeFromParent();
      }
   }
   public GetSlotReelSymbolNode ( c: number, r: number ): Node
   {
      return this.m_baseSlotReel.GetSymbolNode( c, r );
   }
   public SyncAnim ( animComp: Animation, playName: string )
   {
      this.m_syncAnim.push( { anim: animComp, playName: playName } );
   }

   public SyncSpine ( spine: sp.Skeleton, trackIndex: number, name: string, loop: boolean )
   {
      this.m_syncSpine.push( {
         spine: spine,
         trackIndex: trackIndex,
         name: name,
         loop: loop
      } );
   }

   public PlaySyncAnimAndSpine ()
   {
      let len = this.m_syncAnim.length;
      for ( let i = 0; i < len; i++ )
      {
         let data = this.m_syncAnim.pop();
         data.anim.play( data.playName );
      }
      len = this.m_syncSpine.length;
      for ( let i = 0; i < len; i++ )
      {
         let data = this.m_syncSpine.pop();
         data.spine.setAnimation( data.trackIndex, data.name, data.loop );
      }
   }

   ///---------------------
   ///---------------------


   ///---------------------
   public SetCellData ( plate: number[][], lineAward?: GameCommonCommand.ILineAwardData[] )
   {
      this.ClearOneSpin();
      this.m_lineData = lineAward;
      let iLen = this.m_effectNodeArr.length;
      for ( let i = 0; i < iLen; i++ )
      {
         let jLen = this.m_effectNodeArr[ i ].length;
         for ( let j = 0; j < jLen; j++ )
         {
            this.m_effectNodeArr[ i ][ j ].SetData( plate[ i ][ j ] );
         }
      }

      if ( isValid( lineAward ) && lineAward.length > 0 )
      {
         let len = lineAward.length;
         for ( let i = 0; i < len; i++ )
         {
            let lineData = lineAward[ i ];
            let lineSymbolIndexList: number[] = this.m_fxSetting.LineAwardIndexList[ lineData.GetIndex() ];
            let len = lineData.GetCount();
            for ( let j = 0; j < len; j++ )
            {
               let map = this.m_fxSetting.INDEX_MAP[ lineSymbolIndexList[ j ] - this.m_fxSetting.INDEX_MAP_INDEX_START ];
               this.m_effectNodeArr[ map.c ][ map.r ].AddLineAward( lineData.GetIndex() );
            }
         }
      }
   }

   public ExecCellFn ( fnName: string, ...args: any[] )
   {
      let iLen = this.m_effectNodeArr.length;
      for ( let i = 0; i < iLen; i++ )
      {
         let jLen = this.m_effectNodeArr[ i ].length;
         for ( let j = 0; j < jLen; j++ )
         {
            this.m_effectNodeArr[ i ][ j ].ExecFn( fnName, ...args );
         }
      }
   }

   public ForEachCell<T extends FxCell> ( fun: ( cell: T ) => void )
   {
      let iLen = this.m_effectNodeArr.length;
      for ( let i = 0; i < iLen; i++ )
      {
         let jLen = this.m_effectNodeArr[ i ].length;
         for ( let j = 0; j < jLen; j++ )
         {
            fun( this.m_effectNodeArr[ i ][ j ] as T );
         }
      }
   }

   public ClearOneSpin ()
   {
      this.m_nearWinCount = 0;
      this.m_lineAwardTween && this.m_lineAwardTween.stop();
      this.m_lineAwardTween = null;
      let iLen = this.m_effectNodeArr.length;
      for ( let i = 0; i < iLen; i++ )
      {
         let jLen = this.m_effectNodeArr[ i ].length;
         for ( let j = 0; j < jLen; j++ )
         {
            this.m_effectNodeArr[ i ][ j ].Reset();
         }
      }


      iLen = isValid( this.m_nearWinTween ) ? this.m_nearWinTween.length : 0;
      for ( let i = 0; i < iLen; i++ )
      {
         this.m_nearWinTween[ i ] && this.m_nearWinTween[ i ].stop();
         this.m_nearWinTween[ i ] = null;
      }
      iLen = isValid( this.m_nearWinFxAnim ) ? this.m_nearWinFxAnim.length : 0;
      for ( let i = 0; i < iLen; i++ )
      {
         this.m_nearWinFxAnim[ i ] && this.BackEffectSymbolPrefab( this.m_nearWinFxAnim[ i ].Node );
         this.m_nearWinFxAnim[ i ] = null;
      }
      this.m_nowNearWinSetting = null;
      this.m_isFirstNearWinTrackIdx = -1;
   }

   public OnAward ( playLine: boolean = false )
   {
      let iLen = this.m_effectNodeArr.length;
      for ( let i = 0; i < iLen; i++ )
      {
         let jLen = this.m_effectNodeArr[ i ].length;
         for ( let j = 0; j < jLen; j++ )
         {
            this.m_effectNodeArr[ i ][ j ].PlayNormalSymbolAward();
         }
      }
      if ( playLine && isValid( this.m_lineData ) && this.m_lineData.length > 1 )
      {
         let seq: Tween<any> = tween( this.node );
         for ( let i = 0; i < this.m_lineData.length; i++ )
         {
            let data = this.m_lineData[ i ];
            seq = seq.call( () => this.ShowSymbolLine( data ) )
               .delay( 1.5 );
            //  .call(() => this.TurnOffSymbol())
            //  .delay(0.3);
         }

         seq = seq.call( () => this.ShowAllSymbol() )
            .delay( 1.5 );
         //  .call(() => this.TurnOffSymbol())
         //  .delay(0.3);

         this.m_lineAwardTween && this.m_lineAwardTween.stop();
         this.m_lineAwardTween = tween( this.node )
            // .call(() => this.ShowSymbolLoop())
            .delay( 1.5 * 2 )
            // .call(() => this.TurnOffSymbol())
            // .delay(0.3)
            .repeatForever( seq )
            .start();
      }
   }

   protected ShowAllSymbol ()
   {
      let iLen = this.m_effectNodeArr.length;
      for ( let i = 0; i < iLen; i++ )
      {
         let jLen = this.m_effectNodeArr[ i ].length;
         for ( let j = 0; j < jLen; j++ )
         {
            this.m_effectNodeArr[ i ][ j ].PlayNormalSymbolAward();
         }
      }
   }

   protected ShowSymbolLine ( data: GameCommonCommand.ILineAwardData )
   {
      let iLen = this.m_effectNodeArr.length;
      for ( let i = 0; i < iLen; i++ )
      {
         let jLen = this.m_effectNodeArr[ i ].length;
         for ( let j = 0; j < jLen; j++ )
         {
            this.m_effectNodeArr[ i ][ j ].CheckAndPlayLine( data.GetIndex() );
         }
      }
   }


   ///---------------------
   public SetNearWinKey ( key: string )
   {
      if ( isValid( this.m_nearWinSetting[ key ] ) )
      {
         this.m_nowNearWinSetting = this.m_nearWinSetting[ key ];
      }
   }
   ///---------------------


   protected OnTrackStopped ( trackIdx: number )
   {
      //NearWin結束
      if ( isValid( this.m_nearWinTween[ trackIdx ] ) )
      {
         this.m_nearWinTween[ trackIdx ].stop();
      }
      //清除NearWin長框
      if ( isValid( this.m_nowNearWinSetting ) && isValid( this.m_nearWinFxAnim[ trackIdx ] ) )
      {
         let node = this.m_nearWinFxAnim[ trackIdx ].Node;
         if ( this.m_nowNearWinSetting.fadeOutTime > 0 )
         {
            this.m_nearWinTween[ trackIdx ] = tween( node.getComponent( UIOpacity ) )
               .to( this.m_nowNearWinSetting.fadeOutTime, { opacity: SP_OPACITY.HIDE } )
               .call( () =>
               {
                  node.getComponent( UIOpacity ).opacity = SP_OPACITY.HIDE;
                  this.m_nearWinTween[ trackIdx ] = null;
                  this.m_nearWinFxAnim[ trackIdx ] = null;
                  this.BackEffectSymbolPrefab( node );
               } ).start();
         } else
         {
            this.m_nearWinTween[ trackIdx ] = null;
            this.m_nearWinFxAnim[ trackIdx ] = null;
            this.BackEffectSymbolPrefab( node );
         }
      }
   }



   private OnStartNearWin ( trackIdx: number, sec: number )
   {

      if ( isValid( this.m_nearWinTween[ trackIdx ] ) )
      {
         this.m_nearWinTween[ trackIdx ].stop();
      }

      if ( !isValid( this.m_nowNearWinSetting ) && this.m_nearWinDefault )
      {
         this.m_nowNearWinSetting = this.m_nearWinSetting[ this.m_nearWinDefault ];
      }

      if ( isValid( this.m_nowNearWinSetting ) )
      {
         this.m_isFirstNearWinTrackIdx = trackIdx;
         // if(this.m_nearWinFirst && this.m_nowNearWinSetting.hitSymbolId != -1 && this.m_nowNearWinSetting.hitSymbolAnimName ){
         //     for (let i = 0; i < trackIdx; i++) {                    
         //         let jLen = this.m_effectNodeArr[i].length;
         //         for (let j = 0; j < jLen; j++) {
         //             if( this.m_effectNodeArr[i][j].ID == this.m_nowNearWinSetting.hitSymbolId){
         //                 this.m_effectNodeArr[i][j].RunActionName(this.m_nowNearWinSetting.hitSymbolAnimName);
         //             }
         //         }
         //     }
         // }

         //建立NearWin的長框
         let node: Node = this.TakeNewEffectSymbolPrefab( this.m_nowNearWinSetting.takeNearWinId, trackIdx, 0 ).node;
         let point = this.m_baseSlotReel.GetSocketPositionOnPlate( trackIdx, 0 );
        
         let pos:Vec3 = v3(0,0);
         pos.x = point.x + this.m_nowNearWinSetting.offsetPos.x;
         pos.y = this.m_nowNearWinSetting.offsetPos.y;
         node.position = pos
         
         this.m_nearWinFxAnim[ trackIdx ] = FxAnimator.Pack( node );

         let opacityComp:UIOpacity = node.getComponent( UIOpacity );

         if ( this.m_nowNearWinSetting.fadeInTime > 0 )
         {
            opacityComp.opacity = SP_OPACITY.FADE;
            this.m_nearWinTween[ trackIdx ] = tween( node.getComponent( UIOpacity ) )
               .to( this.m_nowNearWinSetting.fadeInTime, { opacity: SP_OPACITY.LIGHT } )
               .call( () =>
               {
                  opacityComp.opacity = SP_OPACITY.LIGHT;
                  this.m_nearWinTween[ trackIdx ] = null;
               } ).start();
         }
         //撥放nearWin
         if ( isValid( this.m_nowNearWinSetting.nearWinAnimName ) )
         {
            if ( this.m_nowNearWinSetting.playNearWinSoundCB )
            {
               this.m_nowNearWinSetting.playNearWinSoundCB( trackIdx );
            } else if ( this.m_nowNearWinSetting.nearWinSoundList && this.m_nowNearWinSetting.nearWinSoundList.length > 0 )
            {
               if ( this.m_nowNearWinSetting.nearWinSoundList.length > this.m_nearWinCount ){
                  GamesChief.SlotGame.GameAudio.Play( this.m_nowNearWinSetting.nearWinSoundList[ this.m_nearWinCount ] );
               } else {
                  GamesChief.SlotGame.GameAudio.Play( this.m_nowNearWinSetting.nearWinSoundList[ this.m_nowNearWinSetting.nearWinSoundList.length - 1 ] );
               }
               this.m_nearWinCount++;
            }

            this.m_nearWinFxAnim[ trackIdx ].PlayAnim( this.m_nowNearWinSetting.nearWinAnimName );
            this.m_nearWinFxAnim[ trackIdx ].SpineSet( this.m_nowNearWinSetting.nearWinAnimName, true );
         }
      }
   }


   protected onDestroy ()
   {
      super.onDestroy && super.onDestroy();
      this.m_nodeBank && this.m_nodeBank.ClearAllPools();
   }
}
