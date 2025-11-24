import { _decorator, Component, Node, Label } from "cc";
import { TableView, TableViewDataSource } from "../../../Script/TableView";

const { ccclass, property } = _decorator;

@ccclass
export default class TableViewCellPrototypeExample1 extends Component implements Partial<TableViewDataSource> {
   @property( {
      type: TableView,
      displayName: "TableView"
   } )
   private m_tableView: TableView = null;

   public onLoad ()
   {
      this.m_tableView.DataSource = this;
   }

   // 設定 TableView Cell 時呼叫
   public TableCellAtIndex ( tableView: TableView, index: number ): Node
   {
      let cell: Node = tableView.DequeueDefaultCell();
      let label: Label = cell.getChildByName( "New Label" ).getComponent( Label );
      label.string = index.toString();
      return cell;
   }

   // 取得 TableView 中會有多少個 Cell 時呼叫
   public NumberOfCellsInTableView ( tableView: TableView ): number
   {
      return 20;
   }
}
