import { _decorator, Enum, Component, Vec2, v2, v3, instantiate, sp, UITransform, CCClass, Director, math, Node, isValid } from 'cc';
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

function LocalToWorldRotation ( a: number, b: number, c: number, d: number, localRotation: number ) {
   const sin: number = Math.sin( math.toRadian( localRotation ) ), cos: number = Math.cos( math.toRadian( localRotation ) );
   return math.toDegree( Math.atan2( cos * c + sin * d, cos * a + sin * b ) );
}

@ccclass
@menu( "Cabrio/Spine/BoneFollow" )
@executeInEditMode
@disallowMultiple
export default class BoneFollow extends Component
{
   /**
    * 目標 Spine 骨架
    */
   get Skeleton (): sp.Skeleton { return this.m_skeleton; }
   set Skeleton ( value: sp.Skeleton ) { this.ApplySkeleton( value ); }

   /**
    * 目標同步骨骼名稱
    */
   get BoneName (): string { return this.m_boneName; }
   set BoneName ( value: string ) { this.m_boneName = value; }

   /**
    * 是否快取旋轉及縮放的上層資料，預設開啟。如果父層以上會有動態調整旋轉及縮放則需取消勾選此選項，或是維持啟用狀態但於需要的時刻呼叫 CacheUpdate 方法
    */
   get CacheAncestors (): boolean { return this.m_cacheAncestors; }
   set CacheAncestors ( value: boolean ) { this.m_cacheAncestors = value; }

   /**
    * 是否同步位置
    */
   get FollowPosition (): boolean { return this.m_followPosition; }
   set FollowPosition ( value: boolean ) { this.m_followPosition = value; }

   /**
    * 是否同步旋轉
    */
   get FollowRotation (): boolean { return this.m_followRotation; }
   set FollowRotation ( value: boolean ) { this.m_followRotation = value; }

   /**
    * 是否將目標旋轉角度轉換成區域旋轉角度
    */
   get RotationLocalization (): boolean { return this.m_rotationLocalization; }
   set RotationLocalization ( value: boolean ) { this.m_rotationLocalization = value; }

   /**
    * 是否同步縮放
    */
   get FollowScale (): boolean { return this.m_followScale; }
   set FollowScale ( value: boolean ) { this.m_followScale = value; }

   /**
    * 是否將目標縮放量轉換成區域縮放量
    */
   get ScaleLocalization (): boolean { return this.m_scaleLocalization; }
   set ScaleLocalization ( value: boolean ) { this.m_scaleLocalization = value; }

   private m_oldAngle: number = 0;
   private m_oldScaleX: number = 1;
   private m_oldScaleY: number = 1;
   private m_isCached: boolean = false;
   private m_cachedRotation: number = 0;
   private m_cachedScaleX: number = 1;
   private m_cachedScaleY: number = 1;

   @property( {
      displayName: "Preview",
      displayOrder: 0
   } )
   private m_preview: boolean = true;

   @property( { visible: false } )
   private m_skeleton: sp.Skeleton = null;

   @property( {
      type: sp.Skeleton,
      displayName: "Skeleton",
      tooltip: "目標 Spine 骨架",
      visible: true,
      displayOrder: 1
   } )
   private get _skeleton (): sp.Skeleton { return this.m_skeleton; };
   private set _skeleton ( skeleton: sp.Skeleton )
   {
      this.ApplySkeleton( skeleton );
      this.UpdateBoneEnum?.();
      this._boneIndex = 0;
   }

   @property( { visible: false } )
   private m_boneName: string = "";

   @property( {
      type: DefaultEnum,
      displayName: "Bone",
      tooltip: "目標同步骨骼",
      visible: true,
      displayOrder: 2
   } )
   private get _boneIndex (): number { 
      const index:number = this.m_skeleton?._skeleton?.bones?.findIndex( b => b.data.name == this.m_boneName );
      return isNaN(index) || index < 0 ? DefaultEnum.None : index;
   }
   private set _boneIndex ( value ) {
      const bones: sp.spine.Bone[] = this.m_skeleton?._skeleton?.bones;
      this.m_boneName = !bones ? "" : bones[ value ].data.name;
   }

   @property( {
      displayName: "Cache Ancestors",
      tooltip: "是否快取旋轉及縮放的上層資料，預設開啟。如果父層以上會有動態調整旋轉及縮放則需取消勾選此選項，或是維持啟用狀態但於需要的時刻呼叫 CacheUpdate 方法",
      displayOrder: 3
   } )
   private m_cacheAncestors: boolean = true;

   @property( {
      displayName: "Position",
      tooltip: "是否同步位置",
      displayOrder: 4
   } )
   private m_followPosition: boolean = false;

   @property( {
      displayName: "Position Offset",
      tooltip: "額外本體位置偏移",
      visible: function () { return this.m_followPosition; },
      displayOrder: 5
   } )
   private m_positionOffset: Vec2 = v2( 0, 0 );
   /**
    * 額外本體位置偏移
    */
   get PositionOffset (): Vec2 { return this.m_positionOffset; }
   set PositionOffset ( value: Vec2 ) { this.m_positionOffset = value; }

   @property( {
      displayName: "Rotation",
      tooltip: "是否同步旋轉",
      displayOrder: 6
   } )
   private m_followRotation: boolean = false;

   @property( {
      displayName: "Rotation Localization",
      tooltip: "是否將目標旋轉角度轉換成區域旋轉角度",
      visible: function () { return this.m_followRotation; },
      displayOrder: 7
   } )
   private m_rotationLocalization: boolean = false;

   @property( {
      displayName: "Rotation Factor",
      tooltip: "額外本體旋轉",
      visible: function () { return this.m_followRotation; },
      displayOrder: 8
   } )
   private m_rotationFactor: number = 0;

   @property( {
      displayName: "Scale",
      tooltip: "是否同步縮放",
      displayOrder: 9
   } )
   private m_followScale: boolean = false;

   @property( {
      displayName: "Scale Localization",
      tooltip: "是否將目標縮放量轉換成區域縮放量",
      visible: function () { return this.m_followScale; },
      displayOrder: 10
   } )
   private m_scaleLocalization: boolean = true;

   @property( {
      displayName: "Scale Factor",
      tooltip: "額外本體大小縮放",
      visible: function () { return this.m_followScale; },
      displayOrder: 11
   } )
   private m_scaleFactor: Vec2 = v2( 1, 1 );

   public CacheUpdate ()
   {
      this.m_isCached = false;
   }

   protected onLoad ()
   {
      this.UpdateBoneEnum?.();
      this.m_oldAngle = this.node.angle;
      this.m_oldScaleX = this.node.scale.x;
      this.m_oldScaleY = this.node.scale.y;
   }

   protected Sync ()
   {
      if ( EDITOR && !this.m_preview ) return;
      if ( !isValid(this.node, true) || !isValid(this, true) || !this.node.active || !this.enabled ) return;
      if ( this.m_boneName != "" && ( this.m_followPosition || this.m_followRotation || this.m_followScale ) )
      {
         const bone: sp.spine.Bone = this.m_skeleton?.findBone( this.m_boneName );
         if ( bone )
         {
            const factor = { angle: 0, scaleX: 1, scaleY: 1 };

            // 檢查是否已經 cache 過資料
            if ( !this.m_cacheAncestors || !this.m_isCached )
            {
               // [還沒 cache 資料] => 計算旋轉及縮放資料
               const data = { spineAngle: 0, selfAngle: 0, spineScaleX: 1, spineScaleY: 1, selfScaleX: 1, selfScaleY: 1 };

               // 同步目標對象的旋轉及縮放資料
               let parent: Node = this.m_skeleton.node;
               while ( parent )
               {
                  data.spineScaleX *= parent.scale.x;
                  data.spineScaleY *= parent.scale.y;
                  data.spineAngle += parent.angle;
                  parent = parent.parent;
               }

               // 自己的旋轉及縮放資料
               parent = this.node.parent;
               while ( parent )
               {
                  data.selfScaleX *= parent.scale.x;
                  data.selfScaleY *= parent.scale.y;
                  data.selfAngle -= parent.angle;
                  parent = parent.parent;
               }

               // 計算轉換成自己的旋轉及縮放
               this.m_cachedRotation = data.spineAngle + data.selfAngle;
               this.m_cachedScaleX = data.selfScaleX == 0 ? 0 : data.spineScaleX / data.selfScaleX;
               this.m_cachedScaleY = data.selfScaleY == 0 ? 0 : data.spineScaleY / data.selfScaleY;

               // 標註 cache 完成
               this.m_isCached = true;
            }

            // 取出旋轉及縮放資料
            factor.angle = this.m_rotationLocalization ? this.m_cachedRotation : this.m_oldAngle;
            factor.scaleX = this.m_scaleLocalization ? this.m_cachedScaleX : this.m_oldScaleX;
            factor.scaleY = this.m_scaleLocalization ? this.m_cachedScaleY : this.m_oldScaleY;

            // 檢查是否啟用旋轉同步
            if ( this.m_followRotation )
            {
               // [啟用旋轉同步]
               const parentBone: sp.spine.Bone = bone.parent;
               const arotation: number = bone.arotation;
               this.node.angle = factor.angle +
                  ( !parentBone ? bone.arotation : LocalToWorldRotation( parentBone.a, parentBone.b, parentBone.c, parentBone.d, arotation ) )
                  + this.m_rotationFactor;
            }

            // 檢查是否啟用縮放同步
            if ( this.m_followScale )
            {
               // [啟用縮放同步]
               this.node.setScale( factor.scaleX * bone.getWorldScaleX() * this.m_scaleFactor.x, factor.scaleY * bone.getWorldScaleY() * this.m_scaleFactor.y );
            }

            // 檢查是否啟用位置同步
            if ( this.m_followPosition )
            {
               // [啟用位置同步]
               const worldPos: math.Vec3 = this.m_skeleton.node.getComponent( UITransform ).convertToWorldSpaceAR( v3( bone.worldX, bone.worldY, 0 ) );
               const localPos: math.Vec3 = this.node.parent.getComponent( UITransform ).convertToNodeSpaceAR( worldPos );
               this.node.setPosition( v3( localPos.x + this.m_positionOffset.x, localPos.y + this.m_positionOffset.y ) );
            }
         }
      }
   }

   protected onEnable ()
   {
      this.Sync();
      this.ApplySkeleton(this.m_skeleton);
      IsLegacy() && Director.instance.on( Director.EVENT_BEFORE_DRAW, this.Sync, this );
   }

   protected onDisable ()
   {
      this.m_skeleton?.node?.off( "skeleton_sync", this.Sync, this);
      IsLegacy() && Director.instance.off( Director.EVENT_BEFORE_DRAW, this.Sync, this );
   }

   private UpdateBoneEnum: () => void = !EDITOR ? null : () =>
   {
      const boneEnum: Object = this.m_skeleton ? {} : instantiate( DefaultTemp );
      const bones: sp.spine.Bone[] = this.m_skeleton?._skeleton?.bones || [];
      for ( let i = bones.length - 1; i >= 0; i-- ) boneEnum[ bones[ i ].data.name ] = i;
      SetEnumAttr( this, "_boneIndex", boneEnum || DefaultEnum );
   };

   private ApplySkeleton ( skeleton: sp.Skeleton ) {
      this.m_skeleton?.node?.off( "skeleton_sync", this.Sync, this);
      this.m_skeleton = skeleton;
      this.m_skeleton?.node?.on( "skeleton_sync", this.Sync, this);
   }
}
