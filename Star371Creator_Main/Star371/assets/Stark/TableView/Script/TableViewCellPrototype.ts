import { _decorator, instantiate, Node, UITransform, isValid } from "cc";
import { TableViewCell } from "./TableViewCell";

const { ccclass, property, menu, executeInEditMode, requireComponent } = _decorator;

@ccclass
@menu( "Extension/TableView/TableViewCellPrototype" )
@executeInEditMode
@requireComponent( UITransform )
export default class TableViewCellProtoType extends TableViewCell {
   @property( {
      displayName: "Identifier",
      tooltip: "唯一識別名稱"
   } )
   private m_identifier: string = "default";
   get Identifier(): string { return this.m_identifier; }

   @property({visible: false})
   private m_fitWidth: boolean = false;

   @property({displayName: "Fit Width"})
   get FitWidth(): boolean { return this.m_fitWidth; }
   set FitWidth(value: boolean) {
      this.m_fitWidth = value;
      if (this.m_fitWidth == true) {
         let parent:Node = this.node;
         do {
            parent = parent.parent;
            let tableView = parent.getComponent( 'TableView' );
            if (tableView) {
               if ( tableView[ 'Container' ] )
               {
                  let uiTransform = this.node.getComponent( UITransform );
                  if ( isValid( uiTransform ) )
                  {
                     uiTransform.width = tableView[ 'Container' ].width;
                  }
               }
               break;
            }
         } while ( parent.parent );
      }
   }

   @property({visible: false})
   private m_fitHeight: boolean = false;

   @property({displayName: "Fit Height"})
   get FitHeight (): boolean {
      return this.m_fitHeight;
   }
   set FitHeight ( value: boolean ) {
      this.m_fitHeight = value;
      if (this.m_fitWidth == true) {
         let parent:Node = this.node;
         do {
            parent = parent.parent;
            let tableView = parent.getComponent( 'TableView' );
            if ( tableView )
            {
               if ( tableView[ 'Container' ] )
               {
                  let uiTransform = this.node.getComponent( UITransform );
                  if ( isValid( uiTransform ) )
                  {
                     uiTransform.height = tableView[ 'Container' ].height;
                  }
               }
               break;
            }
         } while ( parent.parent );
      }
   }

   public onLoad() {
      super.onLoad && super.onLoad();
      const transform:UITransform = this.node.getComponent(UITransform);
      transform.anchorX = 0;
      transform.anchorY = 0;
   }

   public Create(): Node {
      return instantiate(this.node);
   }
}
