import { Enum, Component, sp, _decorator, color, CCClass, instantiate, CCBoolean, Director, UIRenderer, UIOpacity, isValid } from 'cc';
import { EDITOR } from 'cc/env';
const { ccclass, property, menu, executeInEditMode, disallowMultiple } = _decorator;

function IsLegacy(): boolean { return !sp.Skeleton["CUSTOM_UPDATE"] }

const DefaultTemp = { None: 0 };
const DefaultEnum = Enum( DefaultTemp );
function SetEnumAttr ( obj, propName, enumDef ) {
   const enumList = Enum.getList( Enum( enumDef ) );
   CCClass.Attr.setClassAttr( obj, propName, "type", "Enum" );
   CCClass.Attr.setClassAttr( obj, propName, "enumList", enumList );
}

@ccclass
@menu( "Cabrio/Spine/SlotColorFollow" )
@executeInEditMode
@disallowMultiple
export default class SlotColorFollow extends Component
{
   /**
    * 目標 Spine 骨架
    */
   public get Skeleton (): sp.Skeleton { return this.m_skeleton; }
   public set Skeleton ( value: sp.Skeleton ) { this.ApplySkeleton( value ); }

   /**
    * 目標同步 slot 名稱
    */
   public get SlotName (): string { return this.m_slotName; }
   public set SlotName ( value: string ) { this.m_slotName = value; }

   private m_renderer: UIRenderer;
   private m_opacity: UIOpacity;

   @property( {
      type: CCBoolean,
      displayName: "Preview",
   } )
   private m_preview: boolean = true;

   @property( {
      type: sp.Skeleton,
      visible: false,
   } )
   private m_skeleton: sp.Skeleton = null;

   @property( {
      type: sp.Skeleton,
      visible: true,
      displayName: "Skeleton",
      tooltip: "目標 Spine 骨架",
   } )
   private get _skeleton (): sp.Skeleton { return this.m_skeleton; }
   private set _skeleton ( value: sp.Skeleton )
   {
      this.ApplySkeleton(value);
      this.UpdateSlotEnum?.();
      this._slotIndex = 0;
   }

   @property( {
      visible: false,
      tooltip: "目標同步 slot 名稱"
   } )
   private m_slotName: string = "";

   @property( {
      type: DefaultEnum,
      displayName: "Slot",
      tooltip: "目標同步 Slot",
      visible: true
   } )
   private get _slotIndex (): number { 
      const index:number = this.m_skeleton?._skeleton?.slots?.findIndex( s => s.data.name == this.m_slotName );
      return isNaN(index) || index < 0 ? DefaultEnum.None : index;
   }
   private set _slotIndex ( value: number ) {
      const slots: sp.spine.Slot[] = this.m_skeleton?._skeleton?.slots;
      this.m_slotName = !slots ? "" : slots[ value ].data.name;
   }

   protected onLoad () {
      this.UpdateSlotEnum?.();
      this.m_renderer = this.node.getComponent( UIRenderer );
      this.m_opacity = this.node.getComponent( UIOpacity );
   }

   protected Sync () {
      if ( EDITOR && !this.m_preview ) return;
      if ( !isValid(this.node, true) || !isValid(this, true) || !this.node.active || !this.enabled ) return;
      if ( this.m_slotName != "" )
      {
         const slot: sp.spine.Slot = this.m_skeleton?.findSlot( this.m_slotName );
         if ( slot )
         {
            const renderer: UIRenderer = this.m_renderer;
            const opacity: UIOpacity = this.m_opacity;

            if ( renderer )
            {
               const r: number = slot.color.r * 255;
               const g: number = slot.color.g * 255;
               const b: number = slot.color.b * 255;
               const a: number = opacity ? 255 : slot.color.a * 255;
               if (
                  renderer.color.r != r ||
                  renderer.color.g != g ||
                  renderer.color.b != b ||
                  renderer.color.a != a)
               {
                  renderer.color = color( r, g, b, a );
               }
            }

            if ( opacity )
            {
               const a: number = slot.color.a * 255;
               if ( opacity.opacity != a )
               {
                  opacity.opacity = a;
               }
            }
         }
      }
   }

   protected onEnable ()
   {
      this.Sync();
      this.ApplySkeleton( this.m_skeleton );
      IsLegacy() && Director.instance.on( Director.EVENT_BEFORE_DRAW, this.Sync, this );
   }

   protected onDisable ()
   {
      this.m_skeleton?.node?.off( "skeleton_sync", this.Sync, this);
      IsLegacy() && Director.instance.off( Director.EVENT_BEFORE_DRAW, this.Sync, this );
   }

   private UpdateSlotEnum: () => void = !EDITOR ? null : () => {
      const slotEnum: Object = this.m_skeleton ? {} : instantiate( DefaultTemp );
      const slots: sp.spine.Slot[] = this.m_skeleton?._skeleton?.slots || [];
      for ( let i = slots.length - 1; i >= 0; i-- ) slotEnum[ slots[ i ].data.name ] = i;
      SetEnumAttr( this, '_slotIndex', slotEnum || DefaultEnum );
   };

   private ApplySkeleton ( skeleton: sp.Skeleton ) {
      this.m_skeleton?.node?.off( "skeleton_sync", this.Sync, this);
      this.m_skeleton = skeleton;
      this.m_skeleton?.node?.on( "skeleton_sync", this.Sync, this);
   }
}
