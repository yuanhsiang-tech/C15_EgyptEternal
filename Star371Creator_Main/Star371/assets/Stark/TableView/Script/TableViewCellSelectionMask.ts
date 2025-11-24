import { _decorator, Component, UITransform, Size } from "cc";

const { ccclass, property, menu } = _decorator;

@ccclass
@menu( "Extension/TableView/TableViewCellSelectionMask" )
export class TableViewCellSelectionMask extends Component {
   public unuse () {
      this.node.removeFromParent();
   }

   public reuse ( args:any[] ) {
      args.length > 0 && this.node.getComponent( UITransform )?.setContentSize(args[0]);
   }
}
