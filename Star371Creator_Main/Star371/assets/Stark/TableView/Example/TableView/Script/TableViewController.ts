
import { TableView, TableViewDataSource, TABLEVIEW_RELOAD_RELOCATE, TABLEVIEW_SCROLL_STOP_REASON } from "../../../Script/TableView";
import { _decorator, Component, isValid, Size, Prefab, color, Node, size, instantiate, Label, log } from "cc";
const { ccclass, property } = _decorator;

var g_data = 0;


@ccclass
export default class TableViewManager extends Component implements TableViewDataSource {
   @property( {
      type: TableView,
      displayName: "Vertical TableView"
   } )
   public m_vTableView: TableView = null;

   @property( {
      type: TableView,
      displayName: "Horizontal TableView"
   } )
   public m_hTableView: TableView = null;

   @property( {
      type: Prefab,
      displayName: "Header Proto"
   } )
   private m_headerProto: Prefab = null;

   @property( {
      type: Prefab,
      displayName: "Cell Proto"
   } )
   private m_cellProto: Prefab = null;

   @property( {
      type: Prefab,
      displayName: "Footer Proto"
   } )
   private m_footerProto: Prefab = null;

   private m_headerView: Node[] = [];
   private m_footerView: Node[] = [];

   start ()
   {
      this.m_vTableView.Delegate = this;
      this.m_vTableView.DataSource = this;
      this.m_vTableView.Tag = 0;

      this.m_hTableView.Delegate = this;
      this.m_hTableView.DataSource = this;
      this.m_hTableView.Tag = 1;
   }

   onDestroy ()
   {
      if ( this.m_headerView.length > 0 )
      {
         for ( let i = 0; i < this.m_headerView.length; i++ )
         {
            this.m_headerView[ i ].destroy();
            this.m_headerView[ i ] = null;
         }
      }
      this.m_headerView = null;
   }

   AddData ()
   {
      g_data += 20;
      this.m_vTableView.ReloadData( TABLEVIEW_RELOAD_RELOCATE.NONE );
      this.m_hTableView.ReloadData( TABLEVIEW_RELOAD_RELOCATE.NEW );
   }

   DeleteData ()
   {
      g_data -= 20;
      if ( g_data < 0 )
      {
         g_data = 0;
      }
      this.m_vTableView.ReloadData();
      this.m_hTableView.ReloadData();
   }

   GetAllSelectedCellsIndex ()
   {
      log( this.m_vTableView.GetAllSelectedCellsIndex() );
   }

   ClearAllSelectedCells ()
   {
      this.m_vTableView.ClearAllSelectedCells();
   }

   onScrollToButtonTouch ( _pcsEvent )
   {
      var strButtonName = _pcsEvent.currentTarget.name;

      switch ( strButtonName )
      {
         case "Top":
            this.m_vTableView.ScrollToTop();
            break;

         case "Bottom":
            this.m_vTableView.ScrollToBottom();
            break;

         case "Left":
            this.m_hTableView.ScrollToLeft();
            break;

         case "Right":
            this.m_hTableView.ScrollToRight();
            break;
      }
   }

   // 以下為 TableView 資料來源
   TableCellSizeForIndex ( _pcsTableView, _iIndex )
   {
      return size( 245, 60 );
   }

   TableCellAtIndex ( _pcsTableView, _iIndex )
   {
      var cell = _pcsTableView.DequeueCell();

      if ( !isValid( cell ) )
      {
         // 創建的 cell 不需要自己釋放，tableView 被刪除時會執行 cell 的 destroy 方法
         cell = instantiate( this.m_cellProto );
      }

      cell.getChildByName( "tab" ).getComponent( Label ).string = _iIndex;
      cell.getChildByName( "New Sprite(Splash)" ).color = color( Math.floor( Math.random() * 255 ), Math.floor( Math.random() * 255 ), Math.floor( Math.random() * 255 ) );

      return cell;
   }

   NumberOfCellsInTableView ( _pcsTableView )
   {
      return g_data;
   }

   // 以下為 TableView 事件

   TableViewScrollBegin ( tableView: TableView ): void
   {
      log( "tableViewScrollBegin" );
   }

   TableViewScroll ( tableView: TableView ): void
   {
      log( "tableViewScroll" );
   }

   TableViewScrollStop ( tableView: TableView, reason: TABLEVIEW_SCROLL_STOP_REASON ): void
   {
      log( "tableViewScrollStop", reason );
   }

   TableViewScrollFinish ( tableView: TableView ): void
   {
      log( "tableViewScrollFinish" );
   }

   TableViewScrollEnd ( tableView: TableView ): void
   {
      log( "tableViewScrollEnd" );
   }

   TableViewMouseIn ( tableView: TableView ): void
   {
      log( "tableViewMouseIn" );
   }

   TableViewMouseOut ( tableView: TableView ): void
   {
      log( "tableViewMouseOut" );
   }

   TableViewCellHighlightAtIndex ( tableView: TableView, index: number, cell: any ): void
   {
      log( "tableViewCellHighlightAtIndex", index );
   }

   TableViewCellUnHighlightAtIndex ( tableView: TableView, index: number, cell: any ): void
   {
      log( "tableViewCellUnHighlightAtIndex", index );
   }

   TableViewCellTouchAtIndex ( tableView: TableView, index: number, cell: any ): void
   {
      log( "tableViewCellTouchAtIndex", index );
   }

   TableViewCellWillRecycle ( tableView: TableView, index: number, cell: any ): void
   {
      log( "tableViewCellWillRecycle", index );
   }

   TableViewHeaderSize (): Size
   {
      return size( 245, 60 );
   }

   TableViewHeaderView ( tableView: TableView ): Node
   {
      if ( this.m_headerView[ tableView.Tag ] == null )
      {
         // 創建的 header "需要"自己釋放，tableView 被刪除時"不會"執行 header 的 destroy 方法
         this.m_headerView[ tableView.Tag ] = instantiate( this.m_headerProto );
      }
      return this.m_headerView[ tableView.Tag ];
   }

   TableViewFooterSize (): Size
   {
      return size( 245, 60 );
   }

   TableViewFooterView ( tableView: TableView ): Node
   {
      if ( this.m_footerView[ tableView.Tag ] == null )
      {
         // 創建的 footer "需要"自己釋放，tableView 被刪除時"不會"執行 footer 的 destroy 方法
         this.m_footerView[ tableView.Tag ] = instantiate( this.m_footerProto );
      }
      return this.m_footerView[ tableView.Tag ];
   }
}
