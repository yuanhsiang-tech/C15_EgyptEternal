///////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////// 以下為　ＴａｂｌｅＶｉｅｗ　事件方法 ////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////

// TableView DataSource 物件需實做的方法(不是繼承此物件！)
// 注意：必須至少使用一次 TableView 實體物件的 SetDataSource 方法該實體物件才會正常運作
export interface TableViewDataSource {
   /**
    * 回傳 TableView 位於特定索引的 Cell 大小
    * @param tableView 
    * @param index 
    * 注意：若有使用 TableViewCellPrototype 並勾選 "Fix To Default Prototype Cell Size" 則可不用實作此方法
    */
   TableCellSizeForIndex ( tableView: TableView, index: number ): Size;

   /**
    * 回傳 TableView 位於特定索引的 Cell
    * @param tableView 呼叫此方法的 TableView
    * @param index Cell 索引
    */
   TableCellAtIndex ( tableView: TableView, index: number ): Node;

   /**
    * 回傳 TableView 中會有多少個 Cell
    * @param tableView 
    */
   NumberOfCellsInTableView ( tableView: TableView ): number;

   /*
   //////////////////////////////////////////////////////////////
   //////////////////////  ＥＸＡＭＰＬＥ ////////////////////////
   //////////////////////////////////////////////////////////////

   public TableCellSizeForIndex(tableView, index:number): Size
   {
       return size(0, 0);
   }

   public TableCellAtIndex(tableView, index:number): TableViewCell
   {
       let cell = tableView.DequeueCell();

       if (!isValid(cell))
       {
           // 創一個新的 cell
       }

       return cell;
   }

   public NumberOfCellsInTableView(tableView): number
   {
       return 0;
   }
   */
}

export interface TableViewDelegate {
   // @optional
   TableViewHeaderSize ( tableView: TableView ): Size;
   TableViewHeaderView ( tableView: TableView ): Node;

   // @optional
   TableViewFooterSize ( tableView: TableView ): Size;
   TableViewFooterView ( tableView: TableView ): Node;

   // @optional
   // TableView 事件
   TableViewScrollBegin ( tableView: TableView ): void;
   TableViewScroll ( tableView: TableView ): void;
   TableViewScrollStop ( tableView: TableView, reason: TABLEVIEW_SCROLL_STOP_REASON ): void; // 滾動被中斷觸發
   TableViewScrollFinish ( tableView: TableView ): void;                                    // 滾動減速至自動停止觸發
   TableViewScrollEnd ( tableView: TableView ): void;                                       // 滾動結束，不管是被中斷或是減速至停止
   TableViewMouseIn ( tableView: TableView ): void;
   TableViewMouseOut ( tableView: TableView ): void;
   TableViewDragBegin ( tableView: TableView ): void;
   TableViewDragEnd ( tableView: TableView ): void;

   // @optional
   // TableViewCell 事件
   TableViewCellHighlightAtIndex ( tableView: TableView, index: number, cell: Node ): void;
   TableViewCellUnHighlightAtIndex ( tableView: TableView, index: number, cell: Node ): void;
   TableViewCellTouchAtIndex ( tableView: TableView, index: number, cell: Node ): void;
   TableViewCellWillRecycle ( tableView: TableView, index: number, cell: Node ): void;
   TableViewCellDidAppear ( tableView: TableView, index: number, cell: Node ): void;
}

///////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////// 以下為　ＴａｂｌｅＶｉｅｗ　列舉項目 ////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////

// TableView 滾動方向定義
export enum TABLEVIEW_DIRECTION {
   HORIZONTAL = 1,// 水平滾動
   VERTICAL = 2,// 垂直滾動
};

// TableView 滾動方向為 VERTICAL 時的 Cell 排列順序
export enum TABLEVIEW_FILL_MODE {
   TOP_DOWN = 0,// 由上往下排列
   BOTTOM_UP = 1 // 由下往上排列
};

// TableView 選取模式
export enum TABLEVIEW_SELECTION {
   NONE = 0,    // 無選取
   SINGLE = 1,    // 單取
   MULTIPLE = 2     // 多選
};

// TableView ReloadData 時的移動位置
export enum TABLEVIEW_RELOAD_RELOCATE {
   NONE = 0,    // 維持原有位置
   BACK = 1,    // 回到初始位置
   NEW = 2      // 移置最新位置
}

// TableView Header 凍結模式
export enum TABLEVIEW_HEADER_FREEZE_MODE {
   /**
    * 不凍結，跟著內容移動
    */
   NONE = 0,
   /**
    * 跟著被拉動
    */
   PULL = 1,
   /**
    * 跟著被推動
    */
   PUSH = 2,
   /**
    * 完全不動
    */
   FIXED = 3
}

// TableView 滾動中斷原因
export enum TABLEVIEW_SCROLL_STOP_REASON {
   TOUCH = 0,
   MOUSE_SCROLL = 1,
   RELOAD_DATA = 2
}

// Cell 排序模式
enum TABLEVIEW_CELL_SORT_MODE {
   NONE        = 0,     // 依照 Cell 加入的順序顯示
   ASCENDING   = 1,     // Cell 索引越大的越上面
   DESCENDING  = 2      // Cell 索引越小的越上面
}
ccenum(TABLEVIEW_CELL_SORT_MODE);

// Header 排序模式
enum TABLEVIEW_DECORATIVE_SORT_MODE {
   ALWAYS_TOP = 0,
   ALWAYS_BOTTOM = 1
}
ccenum(TABLEVIEW_DECORATIVE_SORT_MODE);

// Header 最大 ZIndex
const DECORATIVE_MAX_ZINDEX:number = 2^31-1;
// Header 最小 ZIndex
const DECORATIVE_MIN_ZINDEX:number = -2^31;

///////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////// 以下為　ＴａｂｌｅＶｉｅｗ　實做內容 ////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////
import {
   _decorator, NodePool, Touch, Component, UITransform, isValid, Size, sys, view, 
   Layout, Widget, Node, CCFloat, Enum, tween, warn, ScrollBar, js, v3, Graphics, Scene, EventMouse, EventTouch, Color, size,
   TweenSystem, Vec3, Vec2, TransformBit, ScrollView,
   ccenum
} from "cc";
import { EDITOR, JSB } from "cc/env";
import { TableViewCellSelectionMask } from "./TableViewCellSelectionMask";
import { TableViewCell } from "./TableViewCell";
import TableViewCellProtoType from "./TableViewCellPrototype";

const { ccclass, property, menu, executeInEditMode } = _decorator;

function convertDistanceFromPointToInch( pointDis: number ): number {
   const factor:number = ( view.getScaleX() + view.getScaleY() ) / 2;
   return ( pointDis * factor );
};

function IsUltraWideScreen() {
   const RATIO = 2.2
   let width = view.getFrameSize().width;
   let height = view.getFrameSize().height;
   let ratio = height > width ? (height / width) : (width / height);
   let isUltraWideScreen = ratio >= RATIO;
   return isUltraWideScreen;
 }

const moveDensity:number = sys.os == sys.OS.ANDROID ? 1.6 : 1.0;
const density = sys.os != sys.OS.ANDROID ? 1.6 : (()=>{
   const baseDPI:number = 320;
   const baseDensity:number = 2;
   const myDpi:number = jsb["Device"].getDPI();
   const myDensity:number = (myDpi > baseDPI) ? baseDensity : myDpi / 160;
   const ratio:number = (myDpi > baseDPI) ? (baseDPI / myDpi) : 1;
   return myDensity * ratio * (IsUltraWideScreen() ? 0.5 : 1);
 })();

const MAIN_VIEW_NAME:string = "view";

const SCROLL_DEACCEL_BOUNCE_RATE:number = 0.63;
const SCROLL_DEACCEL_RATE:number = 0.948;
const SCROLL_DEACCEL_DIST:number = 1.0;
const BOUNCE_DURATION:number = 0.15;
const INSET_RATIO:number = 0.2;
const MOVE_INCH:number = 2.0;
const BOUNCE_BACK_FACTOR:number = 0.35;
const iOS_RETINA_SCALE:Vec2 = new Vec2(2, 2);

const SCROLL_BAR_HORIZONTAL:number = 0;
const SCROLL_BAR_VERTICAL:number = 1;

const SCROLL_MIN_AMOUNT:number = 0.1;
const SCROLL_MAX_AMOUNT:number = 1;
const SCROLL_AMOUNT_STEP:number = 0.01;

const CELL_SELECTION_MASK_NAME:string = "TableViewCellSelectionMask";
const CELL_SELECTION_COLOR:Color = new Color( 51, 143, 255, 150 );

const MOUSE_SCROLL_RATIO:number = 120; // web 上的 event.getScrollY() 值與原生相差 120 倍 
const MOUSE_SCROLL_CONST:number = 100;
const MOUSE_SCROLL_MAX_RATIO:number = 0.9;

const tmpPoint:Vec2 = new Vec2();

class TableViewCellArray {
   private static Sort(cell1:TableViewCell, cell2:TableViewCell): number { return cell1.Idx - cell2.Idx; }

   public get Count(): number { return this.m_list.length; }
   public get First(): TableViewCell { return this.m_list.length <= 0 ? null : this.m_list[0]; }
   public get Last(): TableViewCell { return this.m_list.length <= 0 ? null : this.m_list[this.m_list.length-1]; }

   constructor(private m_list:TableViewCell[] = []) {}

   public Add(cell:TableViewCell) {
      this.m_list.push(cell);
      this.m_list.sort(TableViewCellArray.Sort);
   }

   public Insert(cell:TableViewCell) {
      this.InsertAtIndex(cell, this.FindIndex(cell));
   }

   public InsertAtIndex(cell:TableViewCell, idx:number) {
      this.m_list.splice(idx, 0, cell);
      this.m_list.sort(TableViewCellArray.Sort);
   }

   public Remove(cell:TableViewCell) {
      const idx:number = this.FindIndex(cell);
      if (idx >= 0) {
         const targetCell:TableViewCell = this.FindByIndex(idx);
         if ( targetCell.Idx === cell.Idx ) {
            this.RemoveAtIndex(idx);
         }
      }
   }

   public RemoveAtIndex(idx:number) {
      this.m_list.splice(idx, 1);
      this.m_list.sort(TableViewCellArray.Sort);
   }

   public FindWithIndex(idx:number): TableViewCell {
      const cell:TableViewCell = new TableViewCell();
      cell.Idx = idx;
      const foundCell:TableViewCell = this.FindByIndex(this.FindIndex(cell));
      return foundCell?.Idx !== idx ? null : foundCell;
   }

   public FindIndex(cell:TableViewCell): number {
      let idx:number = 0;
      if (cell) {
         let lastIdx:number = 0;
         for (let curCell of this.m_list) {
            const curIdx:number = curCell.Idx;
            if ( ( cell.Idx === curIdx ) || ( cell.Idx >= lastIdx && cell.Idx < curIdx ) ) {
               break;
            }
            lastIdx = curIdx;
            idx++;
         }
      }
      return idx;
   }   

   public FindByIndex(idx:number): TableViewCell { 
      return this.m_list[idx]; 
   }

   public Destroy () {
      if( this.m_list == null ){
         return
      }

      for (let cell of this.m_list) {
         cell?.node?.destroy();
      }
      this.m_list = null;
   }

   public Clear () {
      this.m_list.length = 0;
   }
}

@ccclass
@menu( "Extension/TableView/TableView" )
@executeInEditMode
export class TableView extends Component {
   private m_tag: number = 0;
   private m_protoCells:Map<string,TableViewCellProtoType> = new Map;
   private m_touchBegin: boolean = false;
   private m_touchMoving: boolean = false;
   private m_maxInset: Vec3 = new Vec3( 0, 0, 0 );
   private m_minInset: Vec3 = new Vec3( 0, 0, 0 );
   private m_scrollDistance: Vec3 = new Vec3( 0, 0, 0 );
   private m_canScroll: boolean = true;
   private m_touchEnabled: boolean = true;
   private m_cellsAvailable: TableViewCellArray = null;
   private m_cellsFreed: TableViewCellArray = null;
   private m_cellsUsed: TableViewCellArray = null;
   private m_cellsIndices:number[] = [];
   private m_cellsPositions:number[] = [];
   private m_delegate: Partial<TableViewDelegate> = null;
   private m_dataSource: Partial<TableViewDataSource> = null;
   private m_didInit: boolean = false;
   private m_autoEnableScrollBar: number = 0;
   private m_didScroll: boolean = false;
   private m_cellSelectionMaskPool: NodePool = new NodePool( "TableViewCellSelectionMask" );
   private m_selectedCellIndex: number[] = [];
   private m_hasSelectedCell: boolean = false;
   private m_startScroll: boolean = false;
   private m_deaccelerating:boolean = false;
   private m_notifyTargetCancelEventMap: any = {};
   private m_notifyTargetCancelEvent: boolean = false;
   private m_header: Node = null;
   private m_footer: Node = null;
   private m_fixedCellSize: Size = null;
   private m_cellTouching:TableViewCell = null;

   public get Tag(): number { return this.m_tag; }
   public set Tag(value: number) { this.m_tag = value; }
   public get Bounceable(): boolean { return this.m_bounceable; }
   public set Bounceable(value:boolean) { this.m_bounceable = value; }
   
   public get Header() { return this.m_header; }
   public get Footer() { return this.m_footer; }

   public set DataSource ( source: Partial<TableViewDataSource> ) { this.m_dataSource = source; }
   public get DataSource (): Partial<TableViewDataSource> { return this.m_dataSource; }
   public set Delegate ( source: Partial<TableViewDelegate> ) { this.m_delegate = source; }
   public get Delegate (): Partial<TableViewDelegate> { return this.m_delegate; }

   @property( {
      type: Node,
      visible: false
   } )
   private m_container: Node = null;

   /**
    * @deprecated 相容型別使用，請勿直接使用
    */
   @property( {
      type: Node,
      visible: false
   } )
   public get content (): Node {
      return this.m_container;
   }

   @property( {
      type: Node,
      displayName: "Container",
      tooltip: "主要裝載 Cell 的容器"
   } )
   public get Container (): Node {
      return this.m_container;
   }
   public set Container ( value: Node ) {
      if ( EDITOR && this.m_container != value && isValid( this.m_container ) ) {
         this.m_container.getComponent(Layout).destroy();
         this.m_container.getComponent(Widget).destroy();
      }

      this.m_container = value;
      if ( EDITOR && this.m_container && this.m_container.isValid ) {
         const widget: Widget = this.m_container.getComponent( Widget ) || this.m_container.addComponent( Widget );
         widget.isAlignLeft = widget.isAlignRight = widget.isAlignTop = widget.isAlignBottom = true;
         widget.left = widget.right = widget.top = widget.bottom = 0;

         const layout: Layout = this.m_container.getComponent( Layout ) || this.m_container.addComponent( Layout );
         layout.affectedByScale = true;
         if (this.m_direction == TABLEVIEW_DIRECTION.HORIZONTAL) {
            layout.type = Layout.Type.HORIZONTAL;
         } else if ( this.m_vOrdering == TABLEVIEW_FILL_MODE.TOP_DOWN ) {
            layout.type = Layout.Type.VERTICAL;
            layout.verticalDirection = Layout.VerticalDirection.TOP_TO_BOTTOM;
         } else if ( this.m_vOrdering == TABLEVIEW_FILL_MODE.BOTTOM_UP ) {
            layout.type = Layout.Type.VERTICAL;
            layout.verticalDirection = Layout.VerticalDirection.BOTTOM_TO_TOP;
         }
      }
   }

   @property( {
      visible: false
   } )
   private m_direction: TABLEVIEW_DIRECTION = TABLEVIEW_DIRECTION.VERTICAL;

   @property( {
      type: Enum( TABLEVIEW_DIRECTION ),
      tooltip: "TableView 滾動方向",
      displayName: "Direction",
   } )
   public get Direction (): TABLEVIEW_DIRECTION {
      return this.m_direction;
   }
   public set Direction ( value: TABLEVIEW_DIRECTION ) {
      this.m_direction = value;
      if ( EDITOR ) {
         const layout:Layout = this.m_container?.getComponent( Layout );
         if (value == TABLEVIEW_DIRECTION.VERTICAL) {
            layout.type = Layout.Type.VERTICAL;
         } else {
            layout.type = Layout.Type.HORIZONTAL;
         }
      }
   }

   @property( {
      visible: false
   } )
   private m_vOrdering: TABLEVIEW_FILL_MODE = TABLEVIEW_FILL_MODE.TOP_DOWN;

   @property( {
      type: Enum( TABLEVIEW_FILL_MODE ),
      tooltip: "TableView Cell 垂直排序模式",
      displayName: "Cell Order",
      visible: function () { return this.m_direction == TABLEVIEW_DIRECTION.VERTICAL; }
   } )
   public get VOrdering (): TABLEVIEW_FILL_MODE {
      return this.m_vOrdering;
   }
   public set VOrdering ( value: TABLEVIEW_FILL_MODE ) {
      this.m_vOrdering = value;
      if ( EDITOR ) {
         const layout:Layout = this.m_container.getComponent( Layout );
         if ( value == TABLEVIEW_FILL_MODE.TOP_DOWN ) {
            layout.verticalDirection = Layout.VerticalDirection.TOP_TO_BOTTOM;
         } else {
            layout.verticalDirection = Layout.VerticalDirection.BOTTOM_TO_TOP;
         }
      }
   }

   @property( {
      displayName: "Bounceable",
      tooltip: "是否啟用反彈效果",
   } )
   private m_bounceable: boolean = true;

   @property( {
      tooltip: "是否啟用內容小於顯示範圍時鎖定滑動",
      displayName: "Lock Scroll on Smaller"
   } )
   private m_lockScrollOnSmaller: boolean = false;

   @property( {
      type: Enum( TABLEVIEW_HEADER_FREEZE_MODE ),
      tooltip: "標頭凍結模式",
      displayName: "Header Freeze"
   } )
   private m_headerFreeze: TABLEVIEW_HEADER_FREEZE_MODE = TABLEVIEW_HEADER_FREEZE_MODE.NONE;

   @property( {
      type: ScrollBar,
      displayName: "Vertical Scroll Bar",
      tooltip: "垂直方向的卷軸",
      group: "Scroll Bar"
   } )
   private m_verticalScrollBar: ScrollBar = null;

   @property( {
      type: ScrollBar,
      displayName: "Horizontal Scroll Bar",
      tooltip: "水平方向的卷軸",
      group: "Scroll Bar"
   } )
   private m_horizontalScrollBar: ScrollBar = null;

   @property( {
      type: [ TableViewCellProtoType ],
      visible: false,
      group: "Prototype"
   } )
   private m_cellPrototypes: TableViewCellProtoType[] = [];

   @property( {
      type: [ TableViewCellProtoType ],
      displayName: "Cell Prototypes",
      group: "Prototype"
   } )
   get CellPrototypes (): TableViewCellProtoType[] {
      return this.m_cellPrototypes;
   }
   set CellPrototypes ( value: TableViewCellProtoType[] ) {
      if ( EDITOR && this.m_cellPrototypes.length != value.length)
      {
         this.m_cellPrototypes = value;

         if ( isValid( this.m_container ) )
         {
            const newLength:number = value.length;
            let oldLength:number = 0;
            if ( this.m_container.children && Array.isArray( this.m_container.children ) ) {
               oldLength = this.m_container.children.length;
            }

            if ( newLength > oldLength ) {
               // [新增]
               const defaultSize:number = 60;
               const protoCellNode: Node = new Node( "Prototype" );
               const protoCell: TableViewCellProtoType = protoCellNode.addComponent( TableViewCellProtoType );
               const protoCellNodeTrans = protoCellNode.getComponent( UITransform );
               const containerNodeTrans = this.m_container.getComponent( UITransform );
               const anyProtoCell = protoCell as any;
               anyProtoCell.m_identifier = protoCell.uuid;

               if ( this.m_direction == TABLEVIEW_DIRECTION.VERTICAL ) {
                  anyProtoCell.m_fitWidth = true;
                  protoCellNodeTrans.width = containerNodeTrans.width;
                  protoCellNodeTrans.height = defaultSize;
               } else {
                  anyProtoCell.m_fitHeight = true;
                  protoCellNodeTrans.width = defaultSize;
                  protoCellNodeTrans.height = containerNodeTrans.height;
               }

               this.m_cellPrototypes[this.m_cellPrototypes.length-1] = protoCell;
               this.m_container.addChild( protoCellNode );
            }

            if ( this.m_cellPrototypes.length <= 0 ) {
               this.m_defaultProtoypeCell = null;
               this.m_fixToDefaultProtoCellSize = false;
            } else if ( this.m_defaultProtoypeCell == null ) {
               this.m_defaultProtoypeCell = this.m_cellPrototypes[ 0 ];
               this.m_fixToDefaultProtoCellSize = true;
            }
         }
      }
   }

   @property( {
      type: TableViewCellProtoType,
      displayName: "Default Prototype Cell",
      tooltip: "預設 Cell",
      group: "Prototype"
   } )
   private m_defaultProtoypeCell: TableViewCellProtoType = null;

   @property( {
      tooltip: "限制所有 Cell 大小與特定預制 Cell 大小相同",
      displayName: "Fix To Default Prototype Cell Size",
      visible: function () { return isValid( this.m_defaultProtoypeCell ); },
      group: "Prototype"
   } )
   private m_fixToDefaultProtoCellSize: boolean = true;

   @property( {
      type: Enum( TABLEVIEW_SELECTION ),
      displayName: "Selection",
      tooltip: "選取模式",
      group: "Selection"
   } )
   private m_selectionMode: TABLEVIEW_SELECTION = TABLEVIEW_SELECTION.NONE;

   @property( {
      tooltip: "TableView Cell 選取顏色",
      displayName: "Cell Selection Color",
      visible: function () { return this.m_selectionMode != TABLEVIEW_SELECTION.NONE; },
      group: "Selection"
   } )
   private m_selectionColor: Color = CELL_SELECTION_COLOR;

   @property( {
      type: CCFloat,
      tooltip: "開始拖曳的最小門檻值",
      displayName: "Min Scroll Threshould",
      group: "Mouse Config"
   } )
   private m_scrollThreshold: number = 10;

   @property( {
      type: CCFloat,
      tooltip: "滑鼠滾輪滾動倍率",
      displayName: "Mouse Scroll Amout",
      range: [ SCROLL_MIN_AMOUNT, SCROLL_MAX_AMOUNT, SCROLL_AMOUNT_STEP ],
      slide: true,
      group: "Mouse Config"
   } )
   private m_scrollAmount: number = 0.1;

   @property({
      type: TABLEVIEW_CELL_SORT_MODE,
      tooltip: `Cell 排序模式
      NONE：依照 Cell 加入的順序顯示
      ASCENDING：Cell 索引越大的越上面
      DESCENDING：Cell 索引越小的越上面`,
      displayName: "Cell",
      group: "Sort"
   })
   private m_cellSortMode: TABLEVIEW_CELL_SORT_MODE = TABLEVIEW_CELL_SORT_MODE.NONE;

   @property({
      type: TABLEVIEW_DECORATIVE_SORT_MODE,
      tooltip: "Header 排序模式",
      displayName: "Header",
      group: "Sort"
   })
   private m_headerSortMode: TABLEVIEW_DECORATIVE_SORT_MODE = TABLEVIEW_DECORATIVE_SORT_MODE.ALWAYS_TOP;

   @property({
      type: TABLEVIEW_DECORATIVE_SORT_MODE,
      tooltip: "Footer 排序模式",
      displayName: "Footer",
      group: "Sort"
   })
   private m_footerSortMode: TABLEVIEW_DECORATIVE_SORT_MODE = TABLEVIEW_DECORATIVE_SORT_MODE.ALWAYS_BOTTOM;

   protected onLoad() {
      super.onLoad && super.onLoad();
      if ( EDITOR ) return;

      if (this.m_container) {
         this.m_container.getComponent( Layout ).enabled = false;
         this.m_container.getComponent( Widget ).enabled = false;
         this.m_container.getComponent( Layout ).destroy();
         this.m_container.getComponent( Widget ).destroy();
      }

      this.m_cellPrototypes = null;
      const childrenCount:number = this.m_container?.children.length || 0;
      if (childrenCount > 0) {
         for (let proto of this.m_container.children) {
            const protoCell:TableViewCellProtoType = proto.getComponent( TableViewCellProtoType );
            protoCell && this.m_protoCells.set(protoCell.Identifier, protoCell);
         }
         this.m_container.removeAllChildren();
      }

      const transform:UITransform = this.node.getComponent( UITransform );
      if ( transform.anchorX !== 0 || transform.anchorY !== 0 )
         throw new Error( "TableView.start：請確認 TableView 元件的 anchor 為 (0, 0)" );

      if ( !this.m_container ) {
         throw new Error( "TableView.start：未指定 Container" );
      } else {
         const transform:UITransform = this.m_container.getComponent( UITransform );
         if ( transform.anchorX !== 0 || transform.anchorY !== 0 )
            throw new Error( "TableView.start：請確認 TableView 內的 Container 元件的 anchor 為 (0, 0)" );

         this.m_container.setPosition( v3( 0, 0, 0 ) );         
         transform.anchorX = 0;
         transform.anchorY = 0;
      }

      this.m_touchEnabled = true;
      this.m_cellsUsed = new TableViewCellArray();
      this.m_cellsFreed = new TableViewCellArray();
      this.m_cellsAvailable = new TableViewCellArray();

      if ( this.m_verticalScrollBar != null ) {
         this.m_verticalScrollBar.setScrollView(this as any);
         this.UpdateScrollBar(Vec3.ZERO);
      }

      if ( this.m_horizontalScrollBar != null ) {
         this.m_horizontalScrollBar.setScrollView(this as any);
         this.UpdateScrollBar(Vec3.ZERO);
      }
   }

   protected update(dt:number) {
      super.update && super.update( dt );

      if (EDITOR) {
         // 檢查是否有自行增減 ProtoCellNode 的行為
         if ( this.m_container ) {
            const childrenCount:number = this.m_container.children.length;
            if (childrenCount != this.m_cellPrototypes.length) {
               // [數量不齊] => 有自行增減 ProtoCellNode，沒有透過 CellPrototypes 增加
               for (let i = childrenCount - 1; i >= 0; i--) {
                  let found = false;

                  const child:Node = this.m_container.children[ i ];
                  for ( let j = this.m_cellPrototypes.length - 1; j >= 0; j-- ) {
                     const protoCell:TableViewCellProtoType = this.m_cellPrototypes[ j ];
                     if ( !isValid( protoCell ) ) {
                        js.array.removeAt( this.m_cellPrototypes, j );
                     } else if ( child == protoCell.node ) {
                        found = true;
                        break;
                     }
                  }

                  if ( found == false ) {
                     // [找到自行加入的 ProtoCellNode] => 強制刪除
                     child && child.destroy();
                     break;
                  }
               }
            }

            for ( let i = this.m_cellPrototypes.length - 1; i >= 0; i-- ) {
               if ( !isValid( this.m_cellPrototypes[ i ] ) ) {
                  // [發現有按叉叉刪掉的 proto cell]
                  js.array.removeAt(this.m_cellPrototypes, i);

                  for ( let j = 0; j < childrenCount; j++ ) {
                     let match:boolean = false;

                     const child:Node = this.m_container.children[ j ];
                     for ( let k = 0; k < this.m_cellPrototypes.length; k++ ) {
                        let eachProtoCellNode = this.m_cellPrototypes[ k ];
                        if ( eachProtoCellNode && child == eachProtoCellNode.node ) {
                           match = true;
                           break;
                        }
                     }

                     if ( match == false ) {
                        // [找到按下叉叉的 node]
                        child && child.destroy();
                        break;
                     }
                  }
               }
            }

            if ( this.m_defaultProtoypeCell && !isValid( this.m_defaultProtoypeCell.node.parent ) )
            {
               this.m_defaultProtoypeCell = null;
               this.m_fixToDefaultProtoCellSize = false;
            }
         }

         return;
      }

      !this.m_didInit && this.Initialize();
   }

   protected onEnable() {
      super.onEnable && super.onEnable();
      if ( EDITOR ) return;

      this.ScrollBarControl();
      this.m_touchEnabled &&  this.AddEvents();
      this.m_container.on(Node.EventType.TRANSFORM_CHANGED, this.OnContainerTransform, this);

      this.Initialize();
   }

   protected onDisable() {
      super.onDisable && super.onDisable();
      if ( EDITOR || !isValid( this, true ) ) return;

      this.RemoveEvents();
      this.unscheduleAllCallbacks();
      this.RelocateContainer(false);

      if (this.m_cellSelectionMaskPool != null) {
         while (this.m_cellSelectionMaskPool.size() > 0) {
            this.m_cellSelectionMaskPool.get().destroy();
         }
         this.m_cellSelectionMaskPool.clear();
      }
   }

   protected onDestroy() {
      super.onDestroy && super.onDestroy();
      this.m_header?.removeFromParent();
      this.m_footer?.removeFromParent();
      this.m_cellsFreed?.Destroy();
      this.m_cellsUsed?.Destroy();
      this.m_cellsAvailable?.Destroy();
      this.m_protoCells?.forEach((protoCell:TableViewCellProtoType)=>protoCell.node.destroy());
   }

   /**
    * 移動內容容器至指定目標位置
    * @param offset 目標位置
    * @param duration 移動時間(單位：秒)，設定 0 則沒有動畫效果
    * @param callback 移動完成回呼方法
    */
   public SetContentOffset ( offset: Vec3, duration: number, callback: Function = null ) {
      const minOffset:Vec3 = this.GetMinContainerOffset();
      const maxOffset:Vec3 = this.GetMaxContainerOffset();
      const _offset:Vec3 = offset.clone().set(Math.max( minOffset.x, Math.min( maxOffset.x, offset.x ) ), Math.max( minOffset.y, Math.min( maxOffset.y, offset.y ) ));

      TweenSystem.instance.ActionManager.removeAllActionsFromTarget( this.m_container );
      this.unscheduleAllCallbacks();

      this.m_didScroll = true;
      this.m_delegate?.TableViewScrollBegin?.( this );
      this._SetContentOffset( _offset, duration > 0, true, ()=>{
         this.ScrollEndEvent();
         callback?.();
      }, duration );
   }

   /**
    * 取得目前內容容器所在位置
    * @returns 內容容器所在位置
    */
   public GetContentOffset (): Vec3 {
      return this.m_container.getPosition();
   }

   /**
    * 取得內容容器最小可移動到的位置
    * @returns 內容容器最小可移動到的位置
    */
   public GetMinContainerOffset (): Vec3 {
      if (!isValid(this.m_container)) return Vec3.ZERO;

      let offset:Vec3;
      const container:Node = this.m_container;
      const transform:UITransform = container?.getComponent( UITransform );
      const contentSize:Size = transform ? transform.contentSize : Size.ZERO;
      const viewSize:Size = this.GetViewSize();
      const width:number = contentSize.width * container.scale.x;
      const height:number = contentSize.height * container.scale.y;

      if ( contentSize.width == 0 || contentSize.height == 0 ||
         ( this.m_direction == TABLEVIEW_DIRECTION.HORIZONTAL && width < viewSize.width ) ||
         ( this.m_direction == TABLEVIEW_DIRECTION.VERTICAL && this.m_vOrdering == TABLEVIEW_FILL_MODE.BOTTOM_UP && height < viewSize.height ) )
      {
         offset = Vec3.ZERO;
      } else
      {
         offset = new Vec3( viewSize.width - contentSize.width * container.scale.x, viewSize.height - contentSize.height * container.scale.y );
      }

      return offset;
   }

   /**
    * 取得內容容器最大可移動到的位置
    * @returns 內容容器最大可移動到的位置
    */
   public GetMaxContainerOffset (): Vec3 {
      return Vec3.ZERO;
   }

   /**
    * 向上捲動至最底處
    * @param animated 是否使用動畫效果
    * @param duration 動畫捲動時間(單位：秒)
    */
   public ScrollToTop ( animated:boolean=true, duration:number=BOUNCE_DURATION ) {
      this.ScrollTo(this.GetMinContainerOffset(), animated, duration);
   }

   /**
    * 向下捲動至最底處
    * @param animated 是否使用動畫效果
    * @param duration 動畫捲動時間(單位：秒)
    */
   public ScrollToBottom ( animated: boolean=true, duration:number=BOUNCE_DURATION ) {
      this.ScrollTo(this.GetMaxContainerOffset(), animated, duration);
   }

   /**
    * 向左捲動至最底處
    * @param animated 是否使用動畫效果
    * @param duration 動畫捲動時間(單位：秒)
    */
   public ScrollToLeft (animated: boolean=true, duration:number=BOUNCE_DURATION) {
      this.ScrollTo(this.GetMaxContainerOffset(), animated, duration);
   }

   /**
    * 向右捲動至最底處
    * @param animated 是否使用動畫效果
    * @param duration 動畫捲動時間(單位：秒)
    */
   public ScrollToRight (animated: boolean=true, duration:number=BOUNCE_DURATION) {
      this.ScrollTo(this.GetMinContainerOffset(), animated, duration);
   }

   /**
    * 使用者是否點住拖動中
    * @returns 是否點住拖動中
    */
   public IsDragging (): boolean {
      return this.m_touchBegin || this.m_touchMoving;
   }

   /**
    * 更新指定索引位置的 Cell 資料
    * @param idx 索引位置
    */
   public UpdateCellAtIndex ( idx: number ) {
      if (this.m_cellsUsed.Count > 0 && idx >= this.m_cellsUsed.First.Idx && idx <= this.m_cellsUsed.Last.Idx) {
         this.CellUpdateAtIndex(idx);
      }
   }

   /**
    * 取得指定索引位置的 Cell Node；若帶入的索引 Cell 不在目前畫面中則回傳 null
    * @param idx 索引位置
    * @returns 指定索引位置的 Cell Node
    */
   public CellAtIndex ( idx: number ): Node {
      if (this.m_cellsUsed.Count > 0 && idx >= this.m_cellsUsed.First.Idx && idx <= this.m_cellsUsed.Last.Idx) {
         return this._CellAtIndex( idx )?.node;
      }
      return null;
   }

   /**
    * 刷新顯示資料
    * @param relocateMode 重置模式
    * @returns 是否執行成功
    */
   public ReloadData ( relocateMode: TABLEVIEW_RELOAD_RELOCATE = TABLEVIEW_RELOAD_RELOCATE.BACK ) {
      if (!isValid(this.m_container)) return false;

      if (this.m_didInit) {
         this.m_touchBegin && this.StopDeaccelerate(TABLEVIEW_SCROLL_STOP_REASON.RELOAD_DATA);
         this.ScrollBarControl();
         this.ClearAllSelectedCells();

         const oldContentOffset:Vec3 = this.GetContentOffset();
         const oldMinContainerOffset:Vec3 = this.GetMinContainerOffset();
         for (let i = 0, len = this.m_cellsUsed.Count; i < len; i++) {
            const cell:TableViewCell = this.m_cellsUsed.FindByIndex(i);

            if (this.m_selectionMode == TABLEVIEW_SELECTION.MULTIPLE)
               this.UnSelectCell( cell );

            this.m_delegate?.TableViewCellWillRecycle?.(this, cell.Idx, cell.node);

            this.m_cellsFreed.Add( cell );
            cell.Reset();

            if (cell.node.getParent() === this.m_container) {
               this.m_container.removeChild( cell.node );
            }
         }

         this.m_cellsIndices.length = 0;
         this.m_cellsUsed.Clear();

         this.UpdateCellPositions();
         this.UpdateContentSize();

         if ( relocateMode >= TABLEVIEW_RELOAD_RELOCATE.BACK ) {
            let relocatePos:Vec3 = new Vec3(0, 0, 0);

            if ( relocateMode == TABLEVIEW_RELOAD_RELOCATE.NEW ) {
               if ( this.m_direction == TABLEVIEW_DIRECTION.HORIZONTAL ) {
                  relocatePos = this.GetMinContainerOffset();
               } else if ( this.m_vOrdering == TABLEVIEW_FILL_MODE.TOP_DOWN ) {
                  relocatePos = this.GetMaxContainerOffset();
               } else {
                  relocatePos = this.GetMinContainerOffset();
               }
            } else if ( relocateMode == TABLEVIEW_RELOAD_RELOCATE.BACK ) {
               if ( this.m_direction == TABLEVIEW_DIRECTION.HORIZONTAL ) {
                  relocatePos = this.GetMaxContainerOffset();
               } else if ( this.m_vOrdering == TABLEVIEW_FILL_MODE.TOP_DOWN ) {
                  relocatePos = this.GetMinContainerOffset();
               } else {
                  relocatePos = this.GetMaxContainerOffset();
               }
            }

            this._SetContentOffset( relocatePos, false );
         } else {
            let newContentOffset:Vec3;
            const newMinContainerOffset:Vec3 = this.GetMinContainerOffset();
            const newMaxContainerOffset:Vec3 = this.GetMaxContainerOffset();

            switch ( this.Direction ) {
               case TABLEVIEW_DIRECTION.HORIZONTAL:
                  newContentOffset = oldContentOffset;
                  newContentOffset.set((newContentOffset.x < newMinContainerOffset.x) ? newMinContainerOffset.x : (newContentOffset.x > newMaxContainerOffset.x) ? newMaxContainerOffset.x : newContentOffset.x, 0);
                  break;

               default:
                  switch ( this.m_vOrdering ) {
                     case TABLEVIEW_FILL_MODE.TOP_DOWN:
                        newContentOffset = oldContentOffset.clone().add( newMinContainerOffset.clone().subtract( oldMinContainerOffset ) );
                        break;
                     case TABLEVIEW_FILL_MODE.BOTTOM_UP:
                        newContentOffset = oldContentOffset;
                        break;
                  }

                  let y:number = newContentOffset.y;
                  y = ( y < newMinContainerOffset.y ) ? newMinContainerOffset.y : y;
                  y = ( newMinContainerOffset.y < newMaxContainerOffset.y && y > newMaxContainerOffset.y ) ? newMaxContainerOffset.y : y;
                  y = y > newMaxContainerOffset.y && y > newMinContainerOffset.y ? newMinContainerOffset.y : y;
                  newContentOffset.set(0, y);
                  break;
            }

            this._SetContentOffset( newContentOffset );
         }

         this.ScrollViewDidScroll( false );
      }

      return this.m_didInit;
   }

   /**
    * 取得可使用的 TableView Cell
    * @returns 可使用的 Cell Node 或 null
    */
   public DequeueCell (): Node {
      if ( !this.m_didInit || this.m_cellsFreed.Count === 0 ) {
         return null;
      } else {
         const cell:TableViewCell = this.m_cellsFreed.FindByIndex(0);
         this.m_container.addChild( cell.node );
         this.m_cellsFreed.RemoveAtIndex(0);
         return cell.node;
      }
   }

   /**
    * 取得特定可重複使用的 Cell
    * @param identifer prototype cell 識別名稱
    * @returns 可使用的 Cell Node 或 null
    * 注意：需使用 TableViewCellPrototype 才可使用此方法
    */
   public DequeueCellWithIdentifier ( identifer: string, onCreateCallback?: ( tableView: TableView, cell: Node ) => void ): Node {
      let cellNode: Node = null;

      if ( this.m_didInit )
      {
         let newCreate:boolean = false;

         for (const source of [ this.m_cellsAvailable, this.m_cellsFreed ]) {
            for (let i = 0; i < source.Count; i++) {
               const cell:TableViewCell = source.FindByIndex(i);
               if (cell instanceof TableViewCellProtoType && cell.Identifier == identifer) {
                  cellNode = cell.node;
                  newCreate = source == this.m_cellsAvailable;
                  source.RemoveAtIndex(i);
                  break;
               }
            }
            if (cellNode) break;
         }

         if (!isValid(cellNode, true)) {
            // [沒找到可重複使用的 cell]
            const protoCell: TableViewCellProtoType = this.m_protoCells.get(identifer);
            if ( !protoCell ) {
               warn( "TableView DequeueCellWithIdentifier fail: Can't find cell with identifier", identifer );
            } else {
               cellNode = protoCell.Create();
               newCreate = true;
            }
         }

         newCreate && onCreateCallback?.( this, cellNode );
         this.m_container.addChild( cellNode );
      }

      return cellNode;
   }

   /**
    * 以預設 Cell 的 indentier 取得可重複使用 Cell
    * @returns 可使用的 Cell Node 或 null
    * 注意：需使用 TableViewCellPrototype 才可使用此方法
    */
   public DequeueDefaultCell ( onCreateCallback?: ( tableView: TableView, cell: Node ) => void ): Node {
      return this.m_didInit && this.m_defaultProtoypeCell ? this.DequeueCellWithIdentifier( this.m_defaultProtoypeCell.Identifier, onCreateCallback ) : null;
   }

   /**
    * 取得特定可重複使用的 Cell 大小
    * @param identifer prototype cell 識別名稱
    * @returns 特定識別名稱的 Cell 大小
    * 注意：需使用 TableViewCellPrototype 才可使用此方法
    */
   public GetCellSizeWithIdentifier ( identifer: string ): Size {
      let cellNode: Node = null;

      if ( this.m_didInit )
      {
         for ( const source of [ this.m_cellsAvailable, this.m_cellsFreed, this.m_cellsUsed ] ) {
            for ( let i = 0; i < source.Count; i++ ) {
               const cell:TableViewCell = source.FindByIndex( i );
               if ( cell instanceof TableViewCellProtoType && cell.Identifier == identifer ) {
                  cellNode = cell.node;
                  break;
               }
            }
            if ( cellNode ) break;
         }

         if ( !isValid( cellNode, true ) ) {
            // [沒找到可重複使用的 cell]
            const protoCell: TableViewCellProtoType = this.m_protoCells.get(identifer);
            if ( !protoCell ) {
               warn( "TableView GetCellSizeWithIdentifier fail: Can't find cell with identifier", identifer );
            } else {
               cellNode = protoCell.Create();
               this.m_cellsAvailable.Add( cellNode.getComponent( TableViewCell ) );
            }
         }
      }

      return cellNode.getComponent( UITransform ).contentSize;
   }

   /**
    * 取得預設 Cell 的大小
    * @returns 預設 Cell 的大小
    * 注意：需使用 TableViewCellPrototype 才可使用此方法
    */
   public GetDefaultCellSize (): Size {
      return this.m_didInit && this.m_defaultProtoypeCell ? this.GetCellSizeWithIdentifier( this.m_defaultProtoypeCell.Identifier ) : Size.ZERO;
   }

   /**
    * 取得已選取的 Cell 索引陣列
    * @returns 已選取的 TableView Cell 索引陣列
    */
   public GetAllSelectedCellsIndex (): number[] {
      return this.m_selectedCellIndex.sort();
   }

   /**
    * 清除所有已選取的 Cell
    */
   public ClearAllSelectedCells () {
      if ( this.m_didInit && this.m_selectedCellIndex.length > 0 ) {
         this.m_selectedCellIndex.length = 0;

         for ( let i = 0; i < this.m_cellsUsed.Count; i++ ) {
            const cell:TableViewCell = this.m_cellsUsed.FindByIndex( i );
            this.UnSelectCell( cell );
         }

         for ( let i = 0; i < this.m_cellsFreed.Count; i++ ) {
            const cell:TableViewCell = this.m_cellsFreed.FindByIndex( i );
            this.UnSelectCell( cell );
         }
      }
   }

   /**
    * 刷新目前可視範圍內的所有 Cell 資料
    */
   public UpdateCellsVisible (): void {
      for ( let i = 0; i < this.m_cellsUsed.Count; i++ ) {
         this.UpdateCellAtIndex( this.m_cellsUsed.FindByIndex( i ).Idx );
      }
   }

   /**
    * 取得可見範圍的大小
    * @returns 可見範圍大小
    */
   public GetViewSize (): Size {
      return this.GetView().getComponent( UITransform ).contentSize;
   }

   /**
    * 取得限制可見範圍的物件
    */
   public GetView (): Node {
      return this.node.getChildByName( MAIN_VIEW_NAME ) || this.node;
   }

   private GetHeaderSize(): Size {
      return this.m_delegate?.TableViewHeaderSize?.(this) || this.m_header?.getComponent(UITransform)?.contentSize || Size.ZERO;
   }

   private GetFooterSize(): Size {
      return this.m_delegate?.TableViewFooterSize?.(this) || this.m_footer?.getComponent(UITransform)?.contentSize || Size.ZERO;
   }

   private ScrollBarControl () {
      if ( isValid( this.m_verticalScrollBar ) ) {
         this.m_verticalScrollBar.node.active = true;
         this.m_verticalScrollBar.show();
      }

      if ( isValid( this.m_horizontalScrollBar ) ) {
         this.m_horizontalScrollBar.node.active = true;
         this.m_horizontalScrollBar.show();
      }

      if ( this.m_direction == TABLEVIEW_DIRECTION.VERTICAL ) {
         this.m_horizontalScrollBar && (this.m_horizontalScrollBar.node.active = false);
      } else {
         this.m_verticalScrollBar && (this.m_verticalScrollBar.node.active = false);
      }
   }

   private AddEvents () {
      const view:Node = this.GetView();
      view.on( Node.EventType.TOUCH_START, this.OnTouchBegan, this, true );
      view.on( Node.EventType.TOUCH_MOVE, this.onTouchMoved, this, true );
      view.on( Node.EventType.TOUCH_END, this.OnTouchEnded, this, true );
      view.on( Node.EventType.TOUCH_CANCEL, this.onTouchCancelled, this, true );

      !JSB && view.on( Node.EventType.MOUSE_ENTER, this.onMouseEnter, this, true );
      !JSB && view.on( Node.EventType.MOUSE_LEAVE, this.onMouseLeave, this, true );
      !JSB && view.on( Node.EventType.MOUSE_WHEEL, this.onMouseWheel, this, true );
   }

   private RemoveEvents () {
      this.m_touchBegin = false;
      this.m_touchMoving = false;

      view.off( Node.EventType.TOUCH_START, this.OnTouchBegan, this );
      view.off( Node.EventType.TOUCH_MOVE, this.onTouchMoved, this );
      view.off( Node.EventType.TOUCH_END, this.OnTouchEnded, this );
      view.off( Node.EventType.TOUCH_CANCEL, this.onTouchCancelled, this );

      !JSB && view.off( Node.EventType.MOUSE_ENTER, this.onMouseEnter, this );
      !JSB && view.off( Node.EventType.MOUSE_LEAVE, this.onMouseLeave, this );
      !JSB && view.off( Node.EventType.MOUSE_WHEEL, this.onMouseWheel, this );
   }

   private CellUpdateAtIndex ( idx: number ) {
      const lastCellIndex:number = this.m_dataSource.NumberOfCellsInTableView( this ) - 1;

      if ( idx < 0 || idx > lastCellIndex || lastCellIndex + 1 <= 0 )
         return false;

      let cell:TableViewCell = this._CellAtIndex(idx);
      cell && this.MoveCellOutOfSight(cell);
      cell = this.ConvertCell( this.m_dataSource.TableCellAtIndex( this, idx ) );

      if ( cell.node.getComponent( UITransform ).anchorX !== 0 || cell.node.getComponent( UITransform ).anchorY !== 0 )
         throw new Error( "TableView.CellUpdateAtIndex：請確認 TableViewCell 元件的 anchor 為 (0, 0)。" );

      this.SetIndexForCell(idx, cell);
      this.AddCellIfNecessary(idx, cell);
      this.MultiSelectionCheck(cell);
   }

   private Initialize () {
      if ( !this.m_didInit && isValid( this.m_dataSource ) ) {
         this.m_didInit = true;

         if ( this.m_defaultProtoypeCell != null ) {
            const transform:UITransform = this.m_defaultProtoypeCell.node.getComponent( UITransform );
            this.m_fixedCellSize = size(transform.width, transform.height );
         } else {
            this.m_fixedCellSize = size( 0, 0 );
            this.m_fixToDefaultProtoCellSize = false;
         }

         if ( this.m_horizontalScrollBar ) {
            const enableAutoHide: boolean = this.m_horizontalScrollBar.enableAutoHide;
            this.m_autoEnableScrollBar |= ( (enableAutoHide ? 1 : 0) & 1 ) << SCROLL_BAR_HORIZONTAL;
            this.m_horizontalScrollBar.enableAutoHide = false;
            this.m_horizontalScrollBar.hide();
         }

         if ( this.m_verticalScrollBar ) {
            const enableAutoHide: boolean = this.m_verticalScrollBar.enableAutoHide;
            this.m_autoEnableScrollBar |= ( (enableAutoHide ? 1 : 0) & 1 ) << SCROLL_BAR_VERTICAL;
            this.m_verticalScrollBar.enableAutoHide = false;
            this.m_verticalScrollBar.hide();
         }

         this.UpdateCellPositions();
         this.UpdateContentSize();

         if ( this.m_horizontalScrollBar )
         {
            this.m_horizontalScrollBar.enableAutoHide = Boolean( this.m_autoEnableScrollBar & 1 << SCROLL_BAR_HORIZONTAL );
            !this.m_horizontalScrollBar.enableAutoHide && this.m_horizontalScrollBar.show();
         }
         if ( this.m_verticalScrollBar )
         {
            this.m_verticalScrollBar.enableAutoHide = Boolean( this.m_autoEnableScrollBar & 1 << SCROLL_BAR_VERTICAL );
            !this.m_verticalScrollBar.enableAutoHide && this.m_verticalScrollBar.show();
         }

         this.ScrollBarControl();
      }
   }

   private OnContainerTransform(type:TransformBit) {
      if (type == TransformBit.POSITION) {
         this.ScrollViewDidScroll();
      }
   }

   private ScrollViewDidScroll ( emitEvent: boolean=true ) {
      const cellsCount:number = this.m_dataSource?.NumberOfCellsInTableView?.( this ) || 0;

      if (cellsCount > 0) {
         if (emitEvent && this.m_cellTouching == null && this.m_didScroll) {
            this.m_delegate?.TableViewScroll?.(this);
         }

         let idx:number = 0;
         const viewSize:Size = this.GetViewSize();
         const offset:Vec3 = this.GetContentOffset().negative();
         const maxIdx:number = Math.max( cellsCount - 1, 0 );

         if ( this.m_vOrdering === TABLEVIEW_FILL_MODE.TOP_DOWN )
            offset.set(offset.x, offset.y + viewSize.height / this.m_container.scale.y);

         let startIdx:number = this._IndexFromOffset( offset );
         if ( startIdx === -1 )
            startIdx = cellsCount - 1;

         if ( this.m_vOrdering === TABLEVIEW_FILL_MODE.TOP_DOWN )
            offset.y -= viewSize.height / this.m_container.scale.x;
         else
            offset.y += viewSize.height / this.m_container.scale.y;
         offset.x += viewSize.width / this.m_container.scale.x;

         let endIdx:number = this._IndexFromOffset( offset );
         if ( endIdx < 0 )
            endIdx = cellsCount - 1;

         let cell:TableViewCell;
         if ( this.m_cellsUsed.Count > 0 ) {
            cell = this.m_cellsUsed.First;
            idx = cell.Idx;
            while ( idx < startIdx ) {
               this.MoveCellOutOfSight( cell );
               if ( this.m_cellsUsed.Count > 0 ) {
                  cell = this.m_cellsUsed.First;
                  idx = cell.Idx;
                  continue;
               }
               break;
            }
         }

         if ( this.m_cellsUsed.Count > 0 ) {
            cell = this.m_cellsUsed.Last;
            idx = cell.Idx;
            while ( idx <= maxIdx && idx > endIdx ) {
               this.MoveCellOutOfSight( cell );
               if ( this.m_cellsUsed.Count > 0 ) {
                  cell = this.m_cellsUsed.Last;
                  idx = cell.Idx;
                  continue;
               }
               break;
            }
         }

         for ( let i = startIdx; i <= endIdx; i++ ) {
            if ( this.m_cellsIndices.indexOf( i ) !== -1 )
               continue;
            this.CellUpdateAtIndex( i );
         }
      }

      if ( this.m_header != null ) {
         if ( this.m_direction == TABLEVIEW_DIRECTION.HORIZONTAL )
            {
               let headerX:number = 0;
               switch ( this.m_headerFreeze )
               {
                  case TABLEVIEW_HEADER_FREEZE_MODE.FIXED: {
                     headerX = this.m_container.position.x * -1;
                     break;
                  }
                  case TABLEVIEW_HEADER_FREEZE_MODE.PULL: {
                     if ( this.m_container.position.x >= 0 ) {
                        headerX = 0;
                     } else {
                        headerX = this.m_container.position.x * -1;
                     }
                     break;
                  }
                  case TABLEVIEW_HEADER_FREEZE_MODE.PUSH: {
                     if ( this.m_container.position.x >= 0 ) {
                        headerX = this.m_container.position.x * -1;
                     } else {
                        headerX = 0;
                     }
                     break;
                  }
               }
               this.m_header.setPosition( new Vec3( headerX, 0, 0 ) );
            } else if ( this.m_vOrdering == TABLEVIEW_FILL_MODE.BOTTOM_UP ) {
               let headerY = 0;
               switch ( this.m_headerFreeze )
               {
                  case TABLEVIEW_HEADER_FREEZE_MODE.FIXED: {
                     headerY = this.m_container.position.y * -1;
                     break;
                  }
                  case TABLEVIEW_HEADER_FREEZE_MODE.PULL: {
                     if ( this.m_container.position.y >= 0 ) {
                        headerY = 0;
                     } else {
                        headerY = this.m_container.position.y * -1;
                     }
                     break;
                  }
                  case TABLEVIEW_HEADER_FREEZE_MODE.PUSH: {
                     if ( this.m_container.position.y >= 0 ) {
                        headerY = this.m_container.position.y * -1;
                     } else {
                        headerY = 0;
                     }
                     break;
                  }
               }
               this.m_header.setPosition( new Vec3( 0, headerY, 0 ) );
            } else if ( this.m_vOrdering == TABLEVIEW_FILL_MODE.TOP_DOWN ) {
               let y:number = 0;
               const cacl1:number = this.GetViewSize().height - this.m_container.position.y - this.GetHeaderSize().height;
               const cacl2:number = this.m_container.getComponent( UITransform ).height - this.GetHeaderSize().height;
               const cacl3:number = ( -1 * this.GetMinContainerOffset().y ) + this.GetViewSize().height - this.GetHeaderSize().height;
               const cacl4:number = ( -1 * this.m_container.position.y ) + this.GetViewSize().height - this.GetHeaderSize().height;
               const cacl5:number = this.GetViewSize().height - this.GetHeaderSize().height - this.m_container.position.y;

               switch ( this.m_headerFreeze ) {
                  case TABLEVIEW_HEADER_FREEZE_MODE.FIXED: {
                     y = cacl1;
                     break;
                  }
                  case TABLEVIEW_HEADER_FREEZE_MODE.PULL: {
                     if ( this.m_container.getComponent( UITransform ).height < this.GetViewSize().height ) {
                        y = ( this.m_container.position.y >= this.GetMinContainerOffset().y ) ? cacl1 : cacl2;
                     } else {
                        y = ( this.m_container.position.y >= 0 ) ? cacl5 : ( ( this.m_container.position.y <= this.GetMinContainerOffset().y ) ? cacl3 : cacl4 );
                     }
                     break;
                  }
                  case TABLEVIEW_HEADER_FREEZE_MODE.PUSH: {
                     if ( this.m_container.getComponent( UITransform ).height < this.GetViewSize().height ) {
                        y = ( this.m_container.position.y >= this.GetMinContainerOffset().y ) ? cacl2 : cacl1;
                     } else {
                        y = ( this.m_container.position.y <= this.GetMinContainerOffset().y ) ? cacl4 : cacl3;
                     }
                     break;
                  }
               }

               this.m_header.setPosition( new Vec3( 0, y, 0 ) );
            }

            if ( this.m_headerFreeze == TABLEVIEW_HEADER_FREEZE_MODE.NONE || this.m_headerFreeze == TABLEVIEW_HEADER_FREEZE_MODE.PUSH ) {
               if ( this.m_direction == TABLEVIEW_DIRECTION.HORIZONTAL ) {
                  if ( this.GetContentOffset().x < -this.GetHeaderSize().width ) {
                     this.m_header.active = false;
                  } else {
                     this.m_header.active = true;
                  }
               } else if ( this.m_vOrdering == TABLEVIEW_FILL_MODE.BOTTOM_UP ) {
                  if ( this.GetContentOffset().y < -this.GetHeaderSize().height ) {
                     this.m_header.active = false;
                  } else {
                     this.m_header.active = true;
                  }
               } else {
                  this.m_header.setPosition( new Vec3( this.m_header.position.x, this.m_container.getComponent( UITransform ).height - this.GetHeaderSize().height ) )
                  if ( this.GetContentOffset().y - this.GetMinContainerOffset().y > this.GetHeaderSize().height ) {
                     this.m_header.active = false;
                  } else {
                     this.m_header.active = true;
                  }
               }
            }
      }

      if ( this.m_footer != null ) {
         if ( this.m_direction == TABLEVIEW_DIRECTION.HORIZONTAL ) {
            if ( this.GetContentOffset().x + this.m_footer.position.x < this.GetViewSize().width ) {
               this.m_footer.active = true;
            } else {
               this.m_footer.active = false;
            }
         } else if ( this.m_vOrdering == TABLEVIEW_FILL_MODE.BOTTOM_UP ) {
            if ( this.GetContentOffset().y + this.m_footer.position.y < this.GetViewSize().height ) {
               this.m_footer.active = true;
            } else {
               this.m_footer.active = false;
            }
         } else {
            if ( this.GetContentOffset().y > -this.GetFooterSize().height ) {
               this.m_footer.active = true;
            } else {
               this.m_footer.active = false;
            }
         }
      }

      this.CalculateScrollBar();
      this.ScrollBarControl();
   }

   private _OnTouchMoved ( touch: Touch ) {
      if ( !this.node.active ) return;
      const moveDistance:Vec2 = touch.getDelta().divide2f(moveDensity, moveDensity);
      sys.os === sys.OS.IOS && moveDistance.divide(iOS_RETINA_SCALE);

      if ( this.m_bounceable == false ) {
         const offset:Vec3 = this.GetContentOffset();
         const tmpX:number = offset.x + moveDistance.x;
         const tmpY:number = offset.y + moveDistance.y;

         if ( this.m_direction == TABLEVIEW_DIRECTION.VERTICAL ) {
            if ( moveDistance.y < 0 && tmpY <= this.GetMinContainerOffset().y ) {
               // [往下拉]
               return;
            } else if ( moveDistance.y > 0 && tmpY >= this.GetMaxContainerOffset().y ) {
               // [往上拉]
               return;
            }
         } else if ( this.m_direction == TABLEVIEW_DIRECTION.HORIZONTAL ) {
            if ( moveDistance.x < 0 && tmpX <= this.GetMinContainerOffset().x ) {
               // [往左拉]
               return;
            } else if ( moveDistance.x > 0 && tmpX >= this.GetMaxContainerOffset().x ) {
               // [往右拉]
               return;
            }
         }
      }

      let dis:number = 0;
      let pos:number = 0;
      if ( this.m_direction === TABLEVIEW_DIRECTION.VERTICAL ) {
         dis = moveDistance.y;
         pos = this.m_container.position.y;
         if ( !( this.GetMinContainerOffset().y <= pos && pos <= this.GetMaxContainerOffset().y ) )
            moveDistance.y *= BOUNCE_BACK_FACTOR;
      } else if ( this.m_direction === TABLEVIEW_DIRECTION.HORIZONTAL ) {
         dis = moveDistance.x;
         pos = this.m_container.position.x;
         if ( !( this.GetMinContainerOffset().x <= pos && pos <= this.GetMaxContainerOffset().x ) )
            moveDistance.x *= BOUNCE_BACK_FACTOR;
      } else {
         dis = Math.sqrt( moveDistance.x * moveDistance.x + moveDistance.y * moveDistance.y );

         pos = this.m_container.position.y;
         let _minOffset = this.GetMinContainerOffset(), _maxOffset = this.GetMaxContainerOffset();
         if ( !( _minOffset.y <= pos && pos <= _maxOffset.y ) )
            moveDistance.y *= BOUNCE_BACK_FACTOR;

         pos = this.m_container.position.x;
         if ( !( _minOffset.x <= pos && pos <= _maxOffset.x ) )
            moveDistance.x *= BOUNCE_BACK_FACTOR;
      }

      if ( !this.m_touchMoving && Math.abs( convertDistanceFromPointToInch( dis ) ) < MOVE_INCH ) {
         return;
      }

      if (!this.m_touchMoving) {
         this.m_delegate?.TableViewDragBegin?.( this );
         this.m_delegate?.TableViewScrollBegin?.( this );
         this.m_horizontalScrollBar?.onTouchBegan();
         this.m_verticalScrollBar?.onTouchBegan();
      }
      this.m_didScroll = true;
      this.m_touchMoving = true;

      switch ( this.m_direction ) {
         case TABLEVIEW_DIRECTION.VERTICAL:
            moveDistance.set(0, moveDistance.y);
            break;
         case TABLEVIEW_DIRECTION.HORIZONTAL:
            moveDistance.set(moveDistance.x, 0);
            break;
         default:
            break;
      }

      this.m_scrollDistance = new Vec3( moveDistance.x, moveDistance.y );
      this._SetContentOffset( new Vec3( this.m_container.getPosition().x + moveDistance.x, this.m_container.getPosition().y + moveDistance.y ) );
   }

   private _OnTouchEnded ( touch: Touch ) {
      if ( !this.node.active ) return;

      this.m_scrollDistance.multiplyScalar(density);
      this.StopDeaccelerate();
      this.m_touchMoving && this.StartDeaccelerate();

      this.m_startScroll = false;
      this.m_touchBegin = false;
      this.m_touchMoving = false;

      this.m_delegate?.TableViewDragEnd?.( this );
      this.m_horizontalScrollBar?.onTouchEnded();
      this.m_verticalScrollBar?.onTouchEnded();
   }
   
   private StartDeaccelerate() {
      this.m_deaccelerating = true;
      this.schedule( this.DeaccelerateScrolling, 0 );
   }
   
   private StopDeaccelerate(reason:TABLEVIEW_SCROLL_STOP_REASON=null) {
      TweenSystem.instance.ActionManager.removeAllActionsFromTarget( this.m_container );
      this.unschedule( this.DeaccelerateScrolling );

      if (this.m_deaccelerating && reason != null) {
         this.m_delegate?.TableViewScrollStop?.( this, reason );
         this.m_delegate?.TableViewScrollEnd?.( this );
      }

      this.m_deaccelerating = false;
   }

   private RelocateContainer ( animated: boolean, callback?: Function ): boolean {
      if ( !isValid( this.m_container, true ) ) return false;

      const min:Vec3 = this.GetMinContainerOffset();
      const max:Vec3 = this.GetMaxContainerOffset();
      const oldPoint:Vec3 = this.m_container.getPosition();

      let needRelocate:boolean = false;
      let newX:number = oldPoint.x;
      let newY:number = oldPoint.y;

      if ( this.m_direction === TABLEVIEW_DIRECTION.HORIZONTAL ) {
         newX = Math.max( newX, min.x );
         newX = Math.min( newX, max.x );
      } else if ( this.m_direction === TABLEVIEW_DIRECTION.VERTICAL ) {
         newY = Math.min( newY, max.y );
         newY = Math.max( newY, min.y );
      }

      if ( newY !== oldPoint.y || newX !== oldPoint.x ) {
         this._SetContentOffset( new Vec3( newX, newY ), animated, null, callback );
         needRelocate = true;
      }

      return needRelocate;
   }

   private DeaccelerateScrolling () {
      const oldPosition:Vec3 = this.m_container.getPosition();
      const scrollDistance:Vec3 = this.m_scrollDistance;
      this.m_container.setPosition( oldPosition.x + scrollDistance.x, oldPosition.y + scrollDistance.y );

      const newX:number = this.m_container.position.x;
      const newY:number = this.m_container.position.y;

      if (newY < this.GetMinContainerOffset().y || newY > this.GetMaxContainerOffset().y ||
          newX < this.GetMinContainerOffset().x || newX > this.GetMaxContainerOffset().x){
         scrollDistance.multiplyScalar(SCROLL_DEACCEL_BOUNCE_RATE);
      } else {
         scrollDistance.multiplyScalar(SCROLL_DEACCEL_RATE);
      }

      this._SetContentOffset( new Vec3( newX, newY ) );

      if ( this.m_bounceable == false ) {
         const offset:Vec3 = this.GetContentOffset();
         if ( this.m_direction == TABLEVIEW_DIRECTION.VERTICAL ) {
            if ( offset.y >= this.GetMaxContainerOffset().y || offset.y <= this.GetMinContainerOffset().y ) {
               scrollDistance.set(SCROLL_DEACCEL_DIST, SCROLL_DEACCEL_DIST);
            }
         } else if ( this.m_direction == TABLEVIEW_DIRECTION.HORIZONTAL ) {
            if ( offset.x >= this.GetMaxContainerOffset().x || offset.x <= this.GetMinContainerOffset().x ) {
               scrollDistance.set(SCROLL_DEACCEL_DIST, SCROLL_DEACCEL_DIST);
            }
         }
      }

      if ( ( Math.abs( scrollDistance.x ) <= SCROLL_DEACCEL_DIST &&
         Math.abs( scrollDistance.y ) <= SCROLL_DEACCEL_DIST ) ||
         newY > this.m_maxInset.y || newY < this.m_minInset.y ||
         newX > this.m_maxInset.x || newX < this.m_minInset.x ||
         newX === this.m_maxInset.x || newX === this.m_minInset.x ||
         newY === this.m_maxInset.y || newY === this.m_minInset.y )
      {
         this.StopDeaccelerate();
         if ( !this.RelocateContainer( true, () => { this.ScrollEndEvent(); } ) ) {
            this.ScrollEndEvent();
         }
      }
   }

   private ScrollEndEvent () {
      this.m_delegate?.TableViewScrollFinish?.( this );
      this.m_delegate?.TableViewScrollEnd?.( this );
      this.m_didScroll = false;
   }

   private _SetContentOffsetInDuration ( offset: Vec3, duration: number, callback?: Function ) {
      TweenSystem.instance.ActionManager.removeAllActionsFromTarget( this.m_container );

      const minOffset:Vec3 = this.GetMinContainerOffset();
      const maxOffset:Vec3 = this.GetMaxContainerOffset();
      offset.set(Math.max( minOffset.x, Math.min( maxOffset.x, offset.x ) ), Math.max( minOffset.y, Math.min( maxOffset.y, offset.y ) ));
      
      tween( this.m_container )
         .to( duration, { position: new Vec3( offset.x, offset.y, 0 ) } )            
         .delay( 0.1 )
         .call( () => {
            this.m_container.setPosition( new Vec3( offset.x, offset.y, 0 ) );
            this.ScrollViewDidScroll();
            callback && callback();
         } )
         .start();
   }

   private SetContentSize ( size: ( Size | number ), height?: number ) {
      const transform:UITransform = this.m_container.getComponent( UITransform );
      if ( size instanceof Size ) {
         transform.setContentSize( size );
      } else {
         transform.setContentSize( size, height ? height : 0 );
      }
      this.UpdateInset();
   }

   private _SetContentOffset ( offset: Vec3, animated?: boolean, forceInRange?: boolean, callback?: Function, animateDuration: number = BOUNCE_DURATION ) {
      if (!this.m_didInit || isValid( this.m_container ) == false) return false;

      if (animated) {
         this._SetContentOffsetInDuration( offset, animateDuration, callback );
      } else {
         if ( forceInRange === true ||                                           // 外部呼叫使用強制限定在範圍內 
            ( !isValid( forceInRange ) && !this.m_bounceable )                   // 內部呼叫使用檢查是否有啟用反彈效果 
         ) {
            const minOffset:Vec3 = this.GetMinContainerOffset();
            const maxOffset:Vec3 = this.GetMaxContainerOffset();
            offset.set(Math.max( minOffset.x, Math.min( maxOffset.x, offset.x ) ), Math.max( minOffset.y, Math.min( maxOffset.y, offset.y ) ));
         }
         this.m_container.setPosition( new Vec3( offset.x, offset.y, 0 ) );            

         this.ScrollViewDidScroll();

         callback && callback();
      }
   }

   private __IndexFromOffset ( offset:Vec3 ): number {
      let low:number = 0;
      let high:number = this.m_dataSource.NumberOfCellsInTableView( this ) - 1;
      let search:number;

      if ( high + 1 <= 0 )
         return -1;

      switch ( this.Direction )
      {
         case TABLEVIEW_DIRECTION.HORIZONTAL:
            search = offset.x;
            break;
         default:
            search = offset.y;
            break;
      }

      while ( high >= low ) {
         const index:number = 0 | ( low + ( high - low ) / 2 );
         const start:number = this.m_cellsPositions[ index ];
         const end:number = this.m_cellsPositions[ index + 1 ];

         if ( search >= start && search <= end ) {
            return index;
         } else if ( search < start ) {
            high = index - 1;
         } else {
            low = index + 1;
         }
      }

      return low <= 0 ? 0 : -1;
   }

   private _IndexFromOffset ( offset:Vec3 ): number {
      const maxIdx:number = this.m_dataSource.NumberOfCellsInTableView( this ) - 1;

      if ( maxIdx + 1 <= 0 )
         return -1;

      let _offset:Vec3 = offset.clone();
      if ( this.m_vOrdering === TABLEVIEW_FILL_MODE.TOP_DOWN )
         _offset.set(_offset.x, this.m_container.getComponent( UITransform ).contentSize.height - _offset.y);

      let index:number = this.__IndexFromOffset( _offset );
      if ( index !== -1 ) {
         index = Math.max( 0, index );
         if ( index > maxIdx )
            index = -1;
      }

      return index;
   }

   private __OffsetFromIndex ( index:number ): Vec3 {
      let offset:Vec3 = new Vec3( 0, this.m_cellsPositions[ index ] );
      if ( this.m_direction == TABLEVIEW_DIRECTION.HORIZONTAL ) {
         offset = new Vec3( this.m_cellsPositions[ index ], 0 );
      }
      return offset;
   }

   private _OffsetFromIndex ( index ): Vec3 {
      const offset:Vec3 = this.__OffsetFromIndex( index );

      let cellSize: Size = size( 0, 0 );
      if ( this.m_fixToDefaultProtoCellSize ) {
         cellSize = this.m_fixedCellSize;
      } else if ( typeof ( this.m_dataSource.TableCellSizeForIndex ) == "function" ) {
         cellSize = this.m_dataSource.TableCellSizeForIndex( this, index );
      }

      if ( this.m_direction == TABLEVIEW_DIRECTION.VERTICAL && this.m_vOrdering === TABLEVIEW_FILL_MODE.TOP_DOWN ) {
         offset.set(offset.x, this.m_container.getComponent( UITransform ).height - offset.y - cellSize.height);
      }

      return offset;
   }

   private UpdateCellPositions () {
      let isSuccess:boolean = false;
      let offset:number = 0;

      this.m_header?.removeFromParent();
      this.m_header = this.m_delegate?.TableViewHeaderView?.(this);
      if (this.m_header) {
         if ( this.m_header.getComponent( UITransform ).anchorX != 0 || this.m_header.getComponent( UITransform ).anchorY != 0 )
            throw new Error( "TableView.UpdateCellPositions error: headerView node anchor should be (0, 0)." );

         this.m_container.addChild( this.m_header );
         this.m_header.setSiblingIndex(this.m_headerSortMode==TABLEVIEW_DECORATIVE_SORT_MODE.ALWAYS_TOP?DECORATIVE_MAX_ZINDEX:DECORATIVE_MIN_ZINDEX);
      }

      const headerSize:Size = this.GetHeaderSize();
      if (headerSize) {
         switch (this.m_direction) {
            case TABLEVIEW_DIRECTION.HORIZONTAL: {
               offset = headerSize.width;
               break;
            }
            default: {
               offset = headerSize.height;
               break;
            }
         }
      }

      const cellsCount:number = this.m_dataSource?.NumberOfCellsInTableView?.(this) || 0;
      if (cellsCount > 0) {
         let currentPos:number = offset;
         let cellSize;

         for (let i = 0; i < cellsCount; i++) {
            this.m_cellsPositions[ i ] = currentPos;
            if ( this.m_fixToDefaultProtoCellSize ) {
               cellSize = this.m_fixedCellSize;
            } else if ( typeof ( this.m_dataSource?.TableCellSizeForIndex ) == "function" ) {
               cellSize = this.m_dataSource.TableCellSizeForIndex( this, i );
            }
            switch ( this.m_direction ) {
               case TABLEVIEW_DIRECTION.HORIZONTAL:
                  currentPos += cellSize.width;
                  break;
               default:
                  currentPos += cellSize.height;
                  break;
            }
         }
         this.m_cellsPositions[ cellsCount ] = currentPos;
         isSuccess = true;
      }

      return isSuccess;
   }

   private UpdateContentSize (): boolean {
      let isSuccess:boolean = false;
      let size:Size = this.GetHeaderSize().clone()

      const cellsCount:number = this.m_dataSource?.NumberOfCellsInTableView?.(this) || 0;
      if (cellsCount > 0) {
         const maxPosition:number = this.m_cellsPositions[cellsCount];
         switch ( this.Direction ) {
            case TABLEVIEW_DIRECTION.HORIZONTAL:
               size = new Size( maxPosition, this.GetViewSize().height );
               break;
            default:
               size = new Size( this.GetViewSize().width, maxPosition );
               break;
         }
         isSuccess = true;
      }

      const footerViewSize:Size = this.GetFooterSize();
      if (footerViewSize) {
         let keyValue:number = 0;
         switch ( this.m_direction ) {
            case TABLEVIEW_DIRECTION.HORIZONTAL: {
               keyValue = footerViewSize.width;
               size.width += keyValue;
               break;
            }
            default: {
               keyValue = footerViewSize.height;
               size.height += keyValue;
               break;
            }
         }

         if ( keyValue <= 0 ) {
            this.m_footer?.removeFromParent();
            this.m_footer = null;
         } else if ( this.m_footer == null &&
            typeof ( this.m_delegate?.TableViewFooterView ) == "function" )
         {
            const footerView:Node = this.m_delegate.TableViewFooterView( this );
            if ( footerView instanceof Node ) {
               if ( footerView.getComponent( UITransform ).anchorX != 0 || footerView.getComponent( UITransform ).anchorY != 0 ) {
                  throw new Error( "TableView.UpdateContentSize error: footerView node anchor should be (0, 0)." );
               }
               this.m_footer = footerView;
               this.m_container.addChild( this.m_footer );
               this.m_footer.setSiblingIndex(this.m_footerSortMode==TABLEVIEW_DECORATIVE_SORT_MODE.ALWAYS_BOTTOM?DECORATIVE_MIN_ZINDEX:DECORATIVE_MAX_ZINDEX);
            }
         }

         if ( this.m_footer != null ) {
            if ( this.m_direction == TABLEVIEW_DIRECTION.HORIZONTAL ) {
               this.m_footer.setPosition( new Vec3( size.width - this.GetFooterSize().width, 0, 0 ) );               
            } else if ( this.m_vOrdering == TABLEVIEW_FILL_MODE.BOTTOM_UP ) {
               this.m_footer.setPosition( new Vec3( 0, size.height - this.GetFooterSize().height, 0 ) );
            } else {
               this.m_footer.setPosition( Vec3.ZERO );
            }
         }
      }

      this.SetContentSize(size);
      if ( this.m_direction === TABLEVIEW_DIRECTION.HORIZONTAL || ( this.m_direction === TABLEVIEW_DIRECTION.VERTICAL && this.m_vOrdering == TABLEVIEW_FILL_MODE.BOTTOM_UP ) )
      {
         this._SetContentOffset(Vec3.ZERO);
      } else
      {
         this._SetContentOffset(new Vec3( 0, this.GetMinContainerOffset().y ));
      }

      return isSuccess;
   }

   private UpdateInset () {
      const viewSize:Size = this.GetViewSize();
         
      let offset:Vec3 = this.GetMaxContainerOffset();
      this.m_maxInset.set(offset.x + viewSize.width * INSET_RATIO, offset.y + viewSize.height * INSET_RATIO);

      offset = this.GetMinContainerOffset();
      this.m_minInset.set(offset.x - viewSize.width * INSET_RATIO, offset.y - viewSize.height * INSET_RATIO);
   }

   private MoveCellOutOfSight ( cell:TableViewCell ) {
      this.m_selectionMode == TABLEVIEW_SELECTION.MULTIPLE && this.UnSelectCell( cell );
      this.m_delegate?.TableViewCellWillRecycle?.(this, cell.Idx, cell.node);

      this.m_cellsFreed.Add( cell );
      this.m_cellsUsed.Remove( cell );
      js.array.remove(this.m_cellsIndices, cell.Idx);

      cell.Reset();
      if ( cell.node.getParent() === this.m_container ) {
         this.m_container.removeChild( cell.node );
      }
   }

   private SetIndexForCell ( idx:number, cell:TableViewCell ) {
      cell.node.getComponent( UITransform ).setAnchorPoint( Vec2.ZERO );
      cell.node.setPosition( this._OffsetFromIndex( idx ) );
      cell.Idx = idx;
   }

   private AddCellIfNecessary ( idx: number, cell: TableViewCell ) {
      if ( cell.node.getParent() !== this.m_container ) {
         this.m_container.addChild( cell.node );
      }

      if (this.m_cellSortMode == TABLEVIEW_CELL_SORT_MODE.DESCENDING ) {
         // [大到小]
         cell.node.setSiblingIndex(-idx);
      } else if (this.m_cellSortMode == TABLEVIEW_CELL_SORT_MODE.ASCENDING ) {
         // [小到大]
         cell.node.setSiblingIndex(idx);
      }
      this.m_delegate?.TableViewCellDidAppear?.( this, idx, cell.node );

      this.m_cellsUsed.Insert( cell );
      if ( this.m_cellsIndices.indexOf( cell.Idx ) === -1 ) {
         this.m_cellsIndices.push( cell.Idx );
         this.m_cellsIndices.sort( ( a, b ) => a - b );
      }
   }

   private ConvertCell ( cell: Node ): TableViewCell {
      return cell.getComponent( TableViewCell ) || cell.addComponent( TableViewCell );
   }

   private _CellAtIndex ( idx: number ): TableViewCell {
      return this.m_cellsIndices.indexOf( idx ) === -1 ? null : this.m_cellsUsed.FindWithIndex( idx );
   }

   private ScrollTo(offset:Vec3, animated:boolean, duration:number) {
      this.m_didScroll = true;
      this.m_delegate?.TableViewScrollBegin?.( this );
      if (animated === false) {
         this._SetContentOffset(offset, false, false, ()=>this.ScrollEndEvent());
      } else {
         this._SetContentOffsetInDuration(offset, duration, ()=>this.ScrollEndEvent() );
      }
   }

   private UpdateScrollBar ( outOfBoundary:Vec3 ) {
      const boundary:Vec2 = new Vec2(outOfBoundary.x, outOfBoundary.y);
      this.m_horizontalScrollBar?.onScroll(boundary);
      this.m_verticalScrollBar?.onScroll(boundary);
   }

   private CalculateScrollBar () {
      const minOffset:Vec3 = this.GetMinContainerOffset();
      const maxOffset:Vec3 = this.GetMaxContainerOffset();
      const offset:Vec3 = this.m_container.getPosition();
      const scrollBarPosition:Vec3 = new Vec3(0, 0);

      switch (this.Direction)
      {
         case TABLEVIEW_DIRECTION.HORIZONTAL: {
            if (offset.x > maxOffset.x) {
               scrollBarPosition.set(offset.x - maxOffset.x, scrollBarPosition.y);
            } else if (offset.x < minOffset.x) {
               scrollBarPosition.set(minOffset.x - offset.x, scrollBarPosition.y);
            }
            break;
         }
         default: {
            if (offset.y > maxOffset.y) {
               scrollBarPosition.set(scrollBarPosition.x, offset.y - maxOffset.y);
            } else if (offset.y < minOffset.y) {
               scrollBarPosition.set(scrollBarPosition.x, minOffset.y - offset.y);
            }
            break;
         }
      }

      this.UpdateScrollBar( scrollBarPosition );
   }

   private MultiSelectionCheck ( cell:TableViewCell ) {
      if ( this.m_selectionMode == TABLEVIEW_SELECTION.MULTIPLE && this.m_selectedCellIndex.length > 0 ) {
         if ( js.array.contains( this.m_selectedCellIndex, cell.Idx ) ) {
            this.SelectCell( cell );
         }
      }
   }

   private SelectCell ( cell:TableViewCell ) {
      const cellSize:Size = cell.node.getComponent(UITransform).contentSize;

      let mask:Node = this.m_cellSelectionMaskPool.get(cellSize);
      if ( !isValid( mask ) ) {
         const selectionMaskNode:Node = new Node( "TableView.SelectionMask" );
         selectionMaskNode.name = CELL_SELECTION_MASK_NAME;
         selectionMaskNode.addComponent( TableViewCellSelectionMask );
         const selectionMaskGraphic = selectionMaskNode.addComponent( Graphics );
         selectionMaskGraphic.fillColor = this.m_selectionColor;
         selectionMaskGraphic.fillRect( 0, 0, cellSize.width, cellSize.height );
         mask = selectionMaskNode;
      }

      cell.node.addChild( mask ), cell.node.setSiblingIndex(999);
   }

   private UnSelectCell(cell:TableViewCell) {
      const mask:Node = cell.node.getChildByName( CELL_SELECTION_MASK_NAME );
      isValid(mask, true) && this.m_cellSelectionMaskPool.put(mask);
   }

   private MultiCellSelect ( cell:TableViewCell ): boolean {
      if ( js.array.contains( this.m_selectedCellIndex, cell.Idx ) === false ) {
         // 加入選取
         this.m_selectedCellIndex.push( cell.Idx );
         this.SelectCell( cell );
         return true;
      }
      return false;
   }

   private MultiCellUnselect ( cell:TableViewCell ) {
      if ( js.array.contains( this.m_selectedCellIndex, cell.Idx ) === true ) {
         // 取消選取
         js.array.remove( this.m_selectedCellIndex, cell.Idx );
         this.UnSelectCell( cell );
      }
   }

   private OnTouchEnded ( event: EventTouch, captureListeners?: Node[] ) {
      if ( !this.enabledInHierarchy ) return;
      if (this.HasNestedViewGroup(event, captureListeners)) return;
      if ( event.currentTarget != this.GetView() ) return;

      if (this.m_notifyTargetCancelEvent) {
         event.propagationImmediateStopped = true;
         event.propagationStopped = true;
      }
      this.m_notifyTargetCancelEvent = false;
      this.m_notifyTargetCancelEventMap = {};
      
      if ( this.m_cellTouching ) {
         if ( this.m_selectionMode == TABLEVIEW_SELECTION.SINGLE ) {
            this.UnSelectCell( this.m_cellTouching );
         } else if ( this.m_selectionMode == TABLEVIEW_SELECTION.MULTIPLE ) {
            this.m_hasSelectedCell && this.MultiCellUnselect( this.m_cellTouching );
         }
         this.m_delegate?.TableViewCellUnHighlightAtIndex?.( this, this.m_cellTouching.Idx, this.m_cellTouching.node );
         this.m_delegate?.TableViewCellTouchAtIndex?.( this, this.m_cellTouching.Idx, this.m_cellTouching.node );
      }
      this.m_cellTouching = null;

      this._OnTouchEnded(event.touch);
   }

   private OnTouchBegan ( event: EventTouch, captureListeners?: Node[] ) {
      if ( !this.enabledInHierarchy ) return;
      if (this.HasNestedViewGroup(event, captureListeners)) return;
      if ( event.currentTarget != this.GetView() ) return;

      for ( let node = this.node; node != null; node = node.parent ) {
         if ( !( node instanceof Scene ) && !node.active ) return false;
      }

      this.StopDeaccelerate(TABLEVIEW_SCROLL_STOP_REASON.TOUCH);

      this.m_didScroll = false;
      this.m_canScroll = true;
      this.m_notifyTargetCancelEvent = false;
      this.m_notifyTargetCancelEventMap = {};
      this.m_hasSelectedCell = false;

      // 檢查是否有啟用內容物小於顯示範圍時鎖定滑動
      if ( this.m_lockScrollOnSmaller ) {
         if ( this.m_direction == TABLEVIEW_DIRECTION.HORIZONTAL ) {
            this.m_canScroll = this.m_container.getComponent( UITransform ).width > this.GetViewSize().width;
         } else {
            this.m_canScroll = this.m_container.getComponent( UITransform ).height > this.GetViewSize().height;
         }
      }

      this.m_touchBegin = true;
      this.m_touchMoving = false;
      this.m_scrollDistance.set(0, 0);

      event.getLocation(tmpPoint);
      for (let child of this.m_container.children) {
         const cell:TableViewCell = child.getComponent(TableViewCell);
         if (cell) {
            const transform:UITransform = cell.getComponent(UITransform);
            if (transform.hitTest(tmpPoint, event.windowId)) {
               this.m_cellTouching = cell;
               break;
            }
         }
      }

      if ( this.m_cellTouching ) {
         if ( this.m_selectionMode == TABLEVIEW_SELECTION.SINGLE ) {
            this.SelectCell( this.m_cellTouching );
         } else if ( this.m_selectionMode == TABLEVIEW_SELECTION.MULTIPLE ) {
            this.m_hasSelectedCell = !this.MultiCellSelect( this.m_cellTouching );
         }

         this.m_delegate?.TableViewCellHighlightAtIndex?.( this, this.m_cellTouching.Idx, this.m_cellTouching.node );
      }
   }

   private onTouchMoved ( event: EventTouch, captureListeners?: Node[] ) {
      if ( !this.enabledInHierarchy ) return;
      if (this.HasNestedViewGroup(event, captureListeners)) return;
      if ( !this.m_canScroll ) return;

      const touch = event.touch;
      if ( event.target != this.GetView() ) {
         if ( this.m_notifyTargetCancelEvent && !this.m_notifyTargetCancelEventMap[ event.target.uuid ] ) {
            const cancelEvent:EventTouch = new EventTouch( event.getTouches(), event.bubbles, Node.EventType.TOUCH_CANCEL );
            cancelEvent.type = Node.EventType.TOUCH_CANCEL;
            cancelEvent.touch = event.touch;
            cancelEvent[ "force" ] = true;
            event.target.dispatchEvent( cancelEvent );
            this.m_notifyTargetCancelEventMap[ event.target.uuid ] = event.target;
         }
         event.propagationStopped = true;
      }

      // 檢查目前是否已經可以拖曳
      if ( !this.m_startScroll ) {
         // [目前尚未可以拖動]
         event.getLocation(tmpPoint);

         // 依據目前拖動方向計算是否有大於最小可拖動門檻值
         if ( this.m_direction == TABLEVIEW_DIRECTION.HORIZONTAL ) {
            // [水平方向]
            this.m_startScroll = Math.abs( event.touch.getStartLocation().x - tmpPoint.x ) > this.m_scrollThreshold;
         } else if ( this.m_direction == TABLEVIEW_DIRECTION.VERTICAL ) {
            // [垂直方向]
            this.m_startScroll = Math.abs( event.touch.getStartLocation().y - tmpPoint.y ) > this.m_scrollThreshold;
         }

         if ( !this.m_startScroll ) return;
      }

      if (!touch.getPreviousLocation().equals(touch.getStartLocation())) {
         this.m_notifyTargetCancelEvent = true;
         if ( this.m_cellTouching ) {
            if ( this.m_selectionMode == TABLEVIEW_SELECTION.SINGLE ) {
               this.UnSelectCell( this.m_cellTouching );
            } else if ( this.m_selectionMode == TABLEVIEW_SELECTION.MULTIPLE ) {
               !this.m_hasSelectedCell && this.MultiCellUnselect( this.m_cellTouching );
            }
            this.m_delegate?.TableViewCellUnHighlightAtIndex?.( this, this.m_cellTouching.Idx, this.m_cellTouching.node );
            this.m_cellTouching = null;
         }
         this._OnTouchMoved( touch );
      }
   }

   private onTouchCancelled ( event: EventTouch, captureListeners?: Node[] ) {
      if ( !this.enabledInHierarchy ) return;
      if (this.HasNestedViewGroup(event, captureListeners)) return;
      if ( event[ "force" ] === true ) return;
      if ( event.currentTarget != this.GetView() ) return;

      if (this.m_notifyTargetCancelEvent) {
         event.propagationImmediateStopped = true;
         event.propagationStopped = true;
      }
      this.m_notifyTargetCancelEvent = false;
      this.m_notifyTargetCancelEventMap = {};
      this._OnTouchEnded( event.touch );

      if ( this.m_cellTouching ) {
         if ( this.m_selectionMode == TABLEVIEW_SELECTION.SINGLE ) this.UnSelectCell( this.m_cellTouching );
         this.m_delegate?.TableViewCellUnHighlightAtIndex?.( this, this.m_cellTouching.Idx, this.m_cellTouching.node );
         this.m_cellTouching = null;
      }
   }

   private onMouseWheel = JSB ? null : (event: EventMouse):void=> {
      if ( !this.m_canScroll ) return;
      if ( event.target != this.GetView() ) return;

      let scrollY:number = event.getScrollY() * this.m_scrollAmount;
      scrollY = scrollY / MOUSE_SCROLL_RATIO * MOUSE_SCROLL_CONST;

      if ( this.Direction == TABLEVIEW_DIRECTION.VERTICAL ) {
         if ( !sys.isNative ) scrollY *= -1;
         this.m_scrollDistance = new Vec3( 0, scrollY );

         if ( this.m_scrollDistance.y >= this.GetViewSize().height * MOUSE_SCROLL_MAX_RATIO )
            this.m_scrollDistance.set(this.m_scrollDistance.x, this.GetViewSize().height * MOUSE_SCROLL_MAX_RATIO);
      } else {
         this.m_scrollDistance = new Vec3( scrollY, 0 );

         if ( this.m_scrollDistance.x >= this.GetViewSize().width * MOUSE_SCROLL_MAX_RATIO )
            this.m_scrollDistance.set(this.GetViewSize().width * MOUSE_SCROLL_MAX_RATIO, this.m_scrollDistance.y);
      }

      this.StopDeaccelerate(TABLEVIEW_SCROLL_STOP_REASON.MOUSE_SCROLL);
      this.StartDeaccelerate();
   }

   private onMouseEnter = JSB ? null : ( event: EventMouse )=> {
      if ( event.target != this.GetView() ) return;
      this.m_delegate?.TableViewMouseIn?.( this );
   }

   private onMouseLeave = JSB ? null : ( event: EventMouse ) => {
      if ( event.target != this.GetView() ) return;
      this.m_delegate?.TableViewMouseOut?.( this );
   }

   private HasNestedViewGroup (event: EventTouch, captureListeners?: Node[]): boolean {
      if (!event || event.eventPhase !== Event.CAPTURING_PHASE) {
          return false;
      }

      if (captureListeners) {
          for (const listener of captureListeners) {
              const item = listener;

              if (this.GetView() === item) {
                  if (event.target && (event.target as any).getComponent(ScrollView)) {
                      return true;
                  }
                  return false;
              }

              if (item.getComponent(ScrollView)) {
                  return true;
              }
          }
      }
      return false;
   }
};
