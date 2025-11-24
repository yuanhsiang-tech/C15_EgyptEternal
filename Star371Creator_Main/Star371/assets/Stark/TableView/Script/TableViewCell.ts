import { _decorator, Component } from "cc";
const { ccclass, menu } = _decorator;

@ccclass
@menu( "Extension/TableView/TableViewCell" )
export class TableViewCell extends Component {
   public static get INVALID_IDX():number { return -1; }
   public Idx: number = 0;
   public Reset() { this.Idx = TableViewCell.INVALID_IDX; }
}
