import { _decorator, sp, isValid, Animation, Node, Vec3, UIOpacity, UITransform} from "cc";
import FxAnimator from "./FxAnimator";


export interface IFxCellCommon
{
   TakeNewEffectSymbolPrefab: ( symbolId: number, c: number, r: number ) => { node: Node, awardName: string; };
   BackEffectSymbolPrefab: ( node: Node ) => void;
   GetSlotReelSymbolNode: ( c: number, r: number ) => Node;
   SyncAnim: ( animComp: Animation, playName: string ) => void;
   SyncSpine: ( spine: sp.Skeleton, trackIndex: number, name: string, loop: boolean ) => void;
}


//================================================================================================
// 特效插槽
//------------------------------------------------------------------------------------------------
export default class FxCell
{
   //staic
   public static COMMON: IFxCellCommon = null;

   //--固定不變------------------------------------------------------------------------------------------    
   protected m_index: number = -1;
   protected m_track: number = -1;
   protected m_row: number = -1;
   protected m_pos: Vec3 = null;
   protected m_before: FxCell = null;
   protected m_after: FxCell = null;

   //--------------------------------------------------------------------------------------------    
   protected m_lineList: boolean[] = [];
   protected m_id: number = -1;
   protected m_isAward: boolean = false;
   //--------------------------------------------------------------------------------------------
   protected m_node: Node = null;
   protected m_mainAnimator: FxAnimator = null;

   protected m_defaultClipName: string = null;
   //--------------------------------------------------------------------------------------------
   constructor ( pos: Vec3, index: number, c: number, r: number, id: number = -1, node: Node = null )
   {
      this.InitFunc();
      this.m_pos = pos;
      this.m_index = index;
      this.m_track = c;
      this.m_row = r;

      this.Set( id, node );
   }
   protected InitFunc ()
   {
   }
   //--------------------------------------------------------------------------------------------
   public set Before ( fx: FxCell ) { this.m_before = fx; }
   public set After ( fx: FxCell ) { this.m_after = fx; }
   //--------------------------------------------------------------------------------------------
   public get ID (): number { return this.m_id; } //symbol id
   public get Track (): number { return this.m_track; }
   public get Row (): number { return this.m_row; }
   public get Pos (): Vec3 { return this.m_pos; }
   public get Node (): Node { return this.m_node; }
   public get Anim (): Animation { return isValid( this.m_mainAnimator ) ? this.m_mainAnimator.Anim : null; }
   public get Spine (): sp.Skeleton { return isValid( this.m_mainAnimator ) ? this.m_mainAnimator.Spine : null; }
   public get isAward (): boolean { return this.m_isAward; }

   //--------------------------------------------------------------------------------------------
   /** 有特效正在插槽裡 */
   public IsValid (): boolean
   {
      return this.m_id != -1 && isValid( this.m_mainAnimator, true );
   }
   //--------------------------------------------------------------------------------------------
   /** 清空特效資訊 */
   public Reset ()
   {
      if ( this.m_id != -1 )
      {
         let reelStaticSymbol: Node = FxCell.COMMON.GetSlotReelSymbolNode( this.m_track, this.m_row );
         reelStaticSymbol.active = true;
      }
      this.m_mainAnimator = null;
      this.m_node && FxCell.COMMON.BackEffectSymbolPrefab( this.m_node );
      this.m_node = null;
      this.m_lineList.length = 0;

      this.m_id = -1;
      this.m_isAward = false;
   }
   //--------------------------------------------------------------------------------------------
   public SetId ( id: number )
   {
      this.m_id = id;
   }
   public SetNode ( node: Node )
   {
      this.m_node = node;
      if ( isValid( this.m_node, true ) )
      {
         this.m_node.setPosition( this.m_pos );
         this.m_mainAnimator = FxAnimator.Pack( this.m_node );
      } else
      {
         this.m_mainAnimator = null;
      }
   }
   /** 設定特效 ID 和 節點 */
   public Set ( id: number, node: Node )
   {
      this.SetId( id );
      this.SetNode( node );
   }
   //--------------------------------------------------------------------------------------------
   /** 播放節點上的動畫 */
   public PlayAnim ( clip?: string, onFinish?: Function )
   {
      if ( isValid( this.m_mainAnimator, true ) )
      {
         this.m_mainAnimator.PlayAnim( clip, onFinish );
      }
   }
   //--------------------------------------------------------------------------------------------
   /** 停止節點上的動畫 */
   public StopAnim ()
   {
      if ( isValid( this.m_mainAnimator, true ) )
      {
         this.m_mainAnimator.StopAnim();
      }
   }
   //--------------------------------------------------------------------------------------------   
   /** 設定節點上的 Spine 動畫 */
   public SpineSet ( clip: string, loop: boolean, onFinish?: Function ): FxCell
   {
      if ( isValid( this.m_mainAnimator, true ) && isValid( clip ) )
      {
         this.m_mainAnimator.SpineSet( clip, loop, onFinish );
      }
      return this;
   }
   //--------------------------------------------------------------------------------------------
   /** 增加節點上的 Spine 動畫 */
   public SpineAdd ( clip: string, loop: boolean, onFinish?: Function ): FxCell
   {
      if ( isValid( this.m_mainAnimator, true ) )
      {
         this.m_mainAnimator.SpineAdd( clip, loop, onFinish );
      }
      return this;
   }
   //--------------------------------------------------------------------------------------------
   /** 停止節點上的 Spine 動畫 */
   public StopSpine (): FxCell
   {
      if ( isValid( this.m_mainAnimator, true ) )
      {
         this.m_mainAnimator.StopSpine();
      }
      return this;
   }
   //--------------------------------------------------------------------------------------------
   //--------------------------------------------------------------------------------------------
   public RunActionName ( animName: string, isLoop: boolean = true, createmainNode: boolean = true, hideStaticSymbol: boolean = true, onFinish: Function = null )
   {
      if ( createmainNode ) this.CreateMainNode();
      if ( animName && this.m_mainAnimator )
      {
         this.m_mainAnimator.Play( animName, isLoop, onFinish );
         if ( hideStaticSymbol )
         {
            let reelStaticSymbol: Node = FxCell.COMMON.GetSlotReelSymbolNode( this.m_track, this.m_row );
            reelStaticSymbol.active = false;
         }
      }
   }
   //--------------------------------------------------------------------------------------------
   //--------------------------------------------------------------------------------------------
   protected CreateMainNode ()
   {
      if ( !isValid( this.m_node ) )
      {
         let take = FxCell.COMMON.TakeNewEffectSymbolPrefab( this.m_id, this.m_track, this.m_row );
         this.SetNode( take.node );
         this.m_defaultClipName = take.awardName;
      }
   }

   public AddLineAward ( lineIndex: number )
   {
      this.m_lineList[ lineIndex ] = true;
      this.m_isAward = true;
   }

   protected SetStaticSymbolDark ( isDark: boolean ) { }

   //--------------------------------------------------------------------------------------------
   public SetData ( id: number, ...args: any[] )
   {
      this.m_id = id;
      this.m_isAward = false;
   }

   public PlayNormalSymbolAward ()
   {
      if ( this.m_isAward )
      {
         this.CreateMainNode();
         let reelStaticSymbol: Node = FxCell.COMMON.GetSlotReelSymbolNode( this.m_track, this.m_row );
         reelStaticSymbol.active = false;
         this.SetStaticSymbolDark( false );
         this.m_node.active = true;
         this.PlayAnim( this.m_defaultClipName );
         this.SpineSet( this.m_defaultClipName, true );
      }
   }
   public StopNormalSymbolAward ()
   {
      if ( isValid( this.m_node ) )
      {
         let reelStaticSymbol: Node = FxCell.COMMON.GetSlotReelSymbolNode( this.m_track, this.m_row );
         reelStaticSymbol.active = true;
         this.SetStaticSymbolDark( true );
         this.m_node.active = false;
      }
   }

   public CheckAndPlayLine ( lineIndex: number )
   {
      let isNeedPlay = false;
      if ( this.m_isAward && isValid( this.m_lineList ) && ( this.m_lineList[ lineIndex ] === true ) )
      {
         isNeedPlay = true;
      }
      if ( isNeedPlay )
      {
         this.PlayNormalSymbolAward();
      } else
      {
         this.StopNormalSymbolAward();
      }
   }

   public ExecFn ( fnName: string, ...args: any[] )
   {
      if ( isValid( this[ fnName ] ) && ( typeof this[ fnName ] == "function" ) )
      {
         this[ fnName ]( ...args );
      }
   }

   protected GetFollowStaticSymbolNewPos ( orgNode: Node ): Vec3
   {
      if ( isValid( orgNode, true ) && isValid( orgNode.parent, true ) && isValid( this.m_node, true ) && isValid( this.m_node.parent, true ) )
      {
         let worldPos = orgNode.parent.getComponent(UITransform).convertToWorldSpaceAR( orgNode.position );
         return this.m_node.parent.getComponent(UITransform).convertToNodeSpaceAR( worldPos );
      } else
      {
         return new Vec3( 0, 0 );
      }
   }

   //一定要回彈才可以取
   public FollowStaticSymbol ( open: boolean )
   {
      let reelStaticSymbol: Node = FxCell.COMMON.GetSlotReelSymbolNode( this.m_track, this.m_row );
      if ( open )
      {
         this.CreateMainNode();
         let newPos: Vec3 = this.GetFollowStaticSymbolNewPos( reelStaticSymbol );
         this.m_node.position = new Vec3( newPos.x, newPos.y );

         let opacityComp:UIOpacity = reelStaticSymbol.getComponent( UIOpacity );

         
         let deviation: number = newPos.y - reelStaticSymbol.getPosition().y;
         opacityComp.opacity = 1;
         reelStaticSymbol.on( 'position-changed', ( evt ) =>
         {
            let pos:Vec3;
            pos.x = reelStaticSymbol.getPosition().y + deviation;
            pos.y = reelStaticSymbol.getPosition().y
            this.m_node.position = pos 
         } );
      } else
      {
         if ( isValid( this.m_node ) )
         {
            this.m_node.position = this.m_pos;
            let opacityComp:UIOpacity = reelStaticSymbol.getComponent( UIOpacity );

            opacityComp.opacity = 255;
            reelStaticSymbol.off( 'position-changed' );
         }
      }

   }

}
