import { log, resources } from "cc";
import { _decorator, Component, sp, SpriteFrame, Prefab, isValid, error, Asset } from "cc";

const { ccclass, property } = _decorator;

enum RES_KEY
{
   SPRITE,
   PREFAB,
   SPINE,
   MAX,
}

@ccclass
export default class GameResourceManager extends Component
{
   public static get RES_SPRITE_LIST (): SpriteFrame[] { return this._resList[ RES_KEY.SPRITE ]; }
   public static get RES_PREFAB_LIST (): Prefab[] { return this._resList[ RES_KEY.PREFAB ]; }
   public static get RES_SPINE_LIST (): sp.SkeletonData[] { return this._resList[ RES_KEY.SPINE ]; }

   private static _resList: any[] = new Array( RES_KEY.MAX );
   private static _ins: GameResourceManager;
   private static _waitSpriteList: string[] = [];
   private static _waitPrefabList: string[] = [];
   private static _waitSpineList: string[] = [];
   private static _downloadTotalCount: number = 0;

   public static AddImg ( pathList: string[], root?: string, idMap?: number[] )
   {
      this.AddList( this._waitSpriteList, pathList, root, idMap );
   }

   public static AddPrefab ( pathList: string[], root?: string, idMap?: number[] )
   {
      this.AddList( this._waitPrefabList, pathList, root, idMap );
   }
   public static AddSpine ( pathList: string[], root?: string, idMap?: number[] )
   {
      this.AddList( this._waitSpineList, pathList, root, idMap );
   }

   private static AddList ( toArr: string[], fromList: string[], root: string, idMap: number[] )
   {
      if ( isValid( idMap ) && idMap.length > 0 )
      {
         if ( !isValid( root ) ) root = "";
         let len = fromList.length;
         let idMapLen = idMap.length;
         for ( let i = 0; i < len; i++ )
         {
            if ( idMapLen > i )
            {
               toArr[ idMap[ i ] ] = root + fromList[ i ];
            } else
            {
               toArr.push( root + fromList[ i ] );
            }

         }
      } else
      {
         if ( !isValid( root ) )
         {
            toArr = toArr.concat( fromList );
         } else
         {
            let len = fromList.length;
            for ( let i = 0; i < len; i++ )
            {
               toArr.push( root + fromList[ i ] );
            }
         }

      }
   }

   public static StartLoad ( endCb?: Function )
   {
      this._ins = new GameResourceManager();
      let _insb = this._ins;
      this._downloadTotalCount = 3;
      this.ReelLoadFile( this._waitSpriteList, _insb, SpriteFrame, RES_KEY.SPRITE, endCb );
      this.ReelLoadFile( this._waitPrefabList, _insb, Prefab, RES_KEY.PREFAB, endCb );
      this.ReelLoadFile( this._waitSpineList, _insb, sp.SkeletonData, RES_KEY.SPINE, endCb );
      this.ClearWaitList();
   }

   private static ClearWaitList ()
   {
      this._waitSpriteList = [];
      this._waitPrefabList = [];
      this._waitSpineList = [];
   }

   private static ReelLoadFile ( list: string[], _ins: GameResourceManager, type: typeof Asset, toListKey: number, endCb: Function )
   {
      log("[PG0723] ReelLoadFile > list:", list)
      if ( isValid( list ) && list.length > 0 )
      {
         let nowLoadedCount: number = 0;
         let downloadList: { startIdx: number, list: string[], downloadedFile?: Asset[]; }[] = [];
         let nowUse: number = 0;
         let needadd: boolean = false;
         let len: number = list.length;
         for ( let i = 0; i < len; i++ )
         {
            if ( list.hasOwnProperty( i ) )
            {
               if ( downloadList.length <= nowUse )
               {
                  downloadList[ nowUse ] = { startIdx: i, list: [] };
               }
               downloadList[ nowUse ].list.push( list[ i ] );
               needadd = true;
            } else
            {
               if ( needadd )
               {
                  nowUse++;
                  needadd = false;
               }
            }
         }

         len = downloadList.length;
         let bundle = isValid( GamesChief.SlotGame.Bundle ) ? GamesChief.SlotGame.Bundle : resources;
         for ( let i = 0; i < len; i++ )
         {
            bundle.load( downloadList[ i ].list, type, ( err, res ) =>
            {
               if ( err ) { error( "GameResourceManager load res failed : ", err.message || err ); return; }
               if ( _ins == this._ins )
               {
                  nowLoadedCount++;
                  downloadList[ i ].downloadedFile = res;

                  //全部下載完成
                  if ( nowLoadedCount == len )
                  {
                     this._resList[ toListKey ] = [];
                     for ( let j = 0; j < len; j++ )
                     {
                        let kLen = downloadList[ j ].downloadedFile.length;
                        for ( let k = 0; k < kLen; k++ )
                        {
                           this._resList[ toListKey ][ downloadList[ j ].startIdx + k ] = downloadList[ j ].downloadedFile[ k ];
                        }
                     }
                     this._downloadTotalCount = this._downloadTotalCount - 1;
                     if ( this._downloadTotalCount <= 0 )
                     {
                        endCb && endCb();
                     }

                     log("[PG0723] 全部下載完成 toListKey:", toListKey,  this._resList)
                  }
               }
            } );
         }


      } else
      {
         this._downloadTotalCount = this._downloadTotalCount - 1;
         if ( this._downloadTotalCount <= 0 )
         {
            endCb && endCb();
         }
      }
   }

   onDestroy ()
   {
      if ( GameResourceManager._ins )
      {
         GameResourceManager._resList = new Array( RES_KEY.MAX );
         GameResourceManager._waitSpriteList = [];
         GameResourceManager._waitPrefabList = [];
         GameResourceManager._waitSpineList = [];
         GameResourceManager._downloadTotalCount = 0;
      }
   }
}


