import { UITransform } from "cc";
import { _decorator, misc, Size, Vec2, Vec3, CCBoolean, CCInteger, Node } from "cc";

const { ccclass, property } = _decorator;

/**
 * 輪帶配置
 */
@ccclass( "CommonSpinnerTrackConfig" )
export default class CommonSpinnerTrackConfig
{

   //----------------------------------------------------------------

   @property( {
      type: Node,
      displayName: "顯示節點",
      tooltip: "要放置 Symbol節點 的根節點，沒設定預設會放置在掛載本組件的節點上",
   } )
   private m_viewNode: Node = null;

   /**
    * 顯示節點
    */
   public get ViewNode (): Node
   {
      return this.m_viewNode;
   }
   public set ViewNode ( value: Node )
   {
      this.m_viewNode = value;
   }

   //----------------------------------------------------------------

   @property( {
      type: CCBoolean,
      displayName: "使用參考節點",
      tooltip: "設定參考節點決定輪帶位置、高度和寬度",
   } )
   private m_useRefNode: boolean = true;

   /**
    * 使用參考節點
    */
   public get UseRefNode (): boolean
   {
      return this.m_useRefNode;
   }
   public set UseRefNode ( b: boolean )
   {
      this.m_useRefNode = b;
   }

   //----------------------------------------------------------------

   @property( {
      type: Node,
      displayName: "參考節點",
      tooltip: "決定輪帶位置、高度和寬度",
      visible: function () { return this.m_useRefNode; }
   } )
   private m_refNode: Node = null;

   /**
    * 參考節點
    */
   public get RefNode (): Node
   {
      return this.m_refNode;
   }
   public set RefNode ( n: Node )
   {
      this.m_refNode = n;
   }

   //----------------------------------------------------------------

   @property( {
      displayName: "輪帶位置",
      tooltip: "輪帶中心在顯示節點上的位置",
      visible: function () { return !this.m_useRefNode; }
   } )
   private m_customPos: Vec3 = Vec3.ZERO.clone();

   /**
    * 輪帶位置
    */
   public get CustomPos (): Vec3
   {
      return this.m_customPos;
   }
   public set CustomPos ( v: Vec3 )
   {
      this.m_customPos = v;
   }

   //----------------------------------------------------------------

   @property( {
      displayName: "輪帶尺寸",
      tooltip: "輪帶的高度和寬度 (px)",
      visible: function () { return !this.m_useRefNode; }
   } )
   private m_customSize: Size = Size.ZERO.clone();

   /**
    * 輪帶尺寸
    */
   public get CustomSize (): Size
   {
      return this.m_customSize;
   }
   public set CustomSize ( s: Size )
   {
      this.m_customSize = s;
   }

   //----------------------------------------------------------------

   @property( {
      type: CCInteger,
      displayName: "頂層插槽數量",
      min: 1,
   } )
   private m_loftSockets: number = 1;

   /**
    * 頂層插槽數量
    */
   public get LoftSockets (): number
   {
      return this.m_loftSockets;
   }
   public set LoftSockets ( n: number )
   {
      this.m_loftSockets = Math.floor( misc.clampf( n, 1, 10 ) );
   }

   //----------------------------------------------------------------

   @property( {
      type: CCInteger,
      displayName: "主要插槽數量",
      min: 1,
   } )
   private m_mainSockets: number = 1;

   /**
    * 主要插槽數量
    */
   public get MainSockets (): number
   {
      return this.m_mainSockets;
   }
   public set MainSockets ( n: number )
   {
      this.m_mainSockets = Math.floor( misc.clampf( n, 1, 10 ) );
   }

   //----------------------------------------------------------------

   @property( {
      type: CCInteger,
      displayName: "底層插槽數量",
      min: 1,
   } )
   private m_baseSockets: number = 1;

   /**
    * 底層插槽數量
    */
   public get BaseSockets (): number
   {
      return this.m_baseSockets;
   }
   public set BaseSockets ( n: number )
   {
      this.m_baseSockets = Math.floor( misc.clampf( n, 1, 10 ) );
   }

   //----------------------------------------------------------------

   /**
    * 寬度 (px)
    */
   public get Width (): number
   {
      return this.UseRefNode ? this.m_refNode.getComponent(UITransform).width : this.CustomSize.width;
   }

   /**
    * 高度 (px)
    */
   public get Height (): number
   {
      return this.UseRefNode ? this.m_refNode.getComponent(UITransform).height : this.CustomSize.height;
   }

   /**
    * 位置
    */
   public get Position (): Vec3
   {
      return new Vec3( this.UseRefNode ? this.m_refNode.position : this.CustomPos );
   }

   /**
    * 總插槽數量
    */
   public get TotalSockets (): number
   {
      return this.LoftSockets + this.MainSockets + this.BaseSockets;
   }

   /**
    * 插槽大小
    */
   public get SocketSize (): Vec2
   {
      return new Vec2( this.Width, this.Height / this.MainSockets );
   }

   /**
    * 插槽Y軸偏移 (正中央為0)
    */
   public get SocketBiasY (): number
   {
      return -( this.Height - this.SocketSize.y ) * 0.5;
   }

   /**
    * 上界
    */
   public get UpperBound (): number
   {
      return this.SocketSize.y * ( this.MainSockets + this.LoftSockets ) + this.SocketBiasY;
   }

   /**
    * 下界
    */
   public get LowerBound (): number
   {
      return -this.SocketSize.y * this.BaseSockets + this.SocketBiasY;
   }

   /**
    * 總高度 (px)
    * 包含頂層、主要和底層插槽
    */
   public get TotalHeight (): number
   {
      return this.SocketSize.y * this.TotalSockets;
   }

   //----------------------------------------------------------------

}
