import { _decorator, Component, Node, Label, warn } from "cc";
import { TableViewDataSource, TableView } from "../../../Script/TableView";

const { ccclass, property } = _decorator;

@ccclass
export default class TableViewCellPrototypeExample2 extends Component implements Partial<TableViewDataSource> {
   @property( {
      type: TableView,
      displayName: "VTableView"
   } )
   private m_vTableView: TableView = null;

   @property( {
      type: TableView,
      displayName: "HTableView"
   } )
   private m_hTableView: TableView = null;

   public onLoad ()
   {
      if ( this.m_vTableView )
      {
         this.m_vTableView.DataSource = this;
         this.m_vTableView.Tag = 0;
      }
      if ( this.m_hTableView )
      {
         this.m_hTableView.DataSource = this;
         this.m_hTableView.Tag = 1;
      }
   }

   // 設定 TableView Cell 時呼叫
   public TableCellAtIndex ( tableView: TableView, index: number ): Node
   {
      let identifier = "Cell" + ( index % 2 );
      let cell: Node = tableView.DequeueCellWithIdentifier( identifier );
      let label: Label = cell.getChildByName( "New Label" ).getComponent( Label );
      label.string = index.toString();
      warn( "TableViewCellPrototypeExample2::tableCellAtIndex", index, identifier );
      return cell;
   }

   // 取得 TableView 中會有多少個 Cell 時呼叫
   public NumberOfCellsInTableView ( tableView: TableView ): number
   {
      return 20;
   }

}
