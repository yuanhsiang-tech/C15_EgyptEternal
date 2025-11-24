import { _decorator, sp, isValid, Animation, Node, Component, AnimationState, AnimationClip, error } from "cc";

const { ccclass, property, menu } = _decorator;


function AnimationMixing ( skeleton: sp.Skeleton, mixAnim: string[], mixTime: number )
{
   if ( skeleton && mixAnim && mixAnim.length > 1 )
   {
      for ( let i = 0; i < mixAnim.length - 1; i++ )
      {
         let anim1: string = mixAnim[ i ];
         for ( let j = i + 1; j < mixAnim.length; j++ )
         {
            let anim2: string = mixAnim[ j ];
            skeleton.setMix( anim1, anim2, mixTime );
            skeleton.setMix( anim2, anim1, mixTime );
         }
      }
   }
}

const FINISHED = Animation.EventType.FINISHED;          // Animation 動畫結束事件
const LASTFRAME = Animation.EventType.LASTFRAME;
const START = Animation.EventType.PLAY;

@ccclass
@menu( "Fx/FxAnimator" )
export default class FxAnimator extends Component
{
   public static Pack ( node: Node ): FxAnimator
   {
      if ( isValid( node ) )
      {
         let anim = node.getComponent( FxAnimator );
         if ( !isValid( anim ) )
         {
            anim = node.addComponent( FxAnimator );
         }
         anim.Reload();
         return anim;
      }
      return null;
   }

   //--------------------------------------------------------------------------------------------
   private m_spineCompleteFunc: Function = null; //OnSpineComplete每次都會呼叫
   set spineCompleteFunc ( func: Function ) { this.m_spineCompleteFunc = func; }
   private m_spineClearTrack: boolean = false; //是否需要在stop 清除 track
   set spineClearTrack ( b: boolean ) { this.m_spineClearTrack = b; }
   private m_spineToSetupPos: boolean = true; //是否需要在撥放spine前 呼叫toSetupPos
   set spineToSetupPos ( b: boolean ) { this.m_spineToSetupPos = b; }
   //--------------------------------------------------------------------------------------------        
   private m_anim: Animation = null;
   private m_func: Function = null;
   private m_animState: AnimationState = null;
   private m_endTime: number = -1;

   private m_spine: sp.Skeleton = null;
   private m_clips: string[] = [];
   private m_funcs: Function[] = [];
   //--------------------------------------------------------------------------------------------
   private m_ainmNowChain: ClipChain = null;
   private m_animWaitChain: ClipChain[] = [];
   //--------------------------------------------------------------------------------------------    
   private m_eventMap: _EventKeepData[][] = []; //Key:EventName
   //--------------------------------------------------------------------------------------------    

   public get Node (): Node { return this.node; }
   public set Anim ( v: Animation ) { this.m_anim = v; }
   public get Anim (): Animation { return this.m_anim; }
   public set Spine ( v: sp.Skeleton ) { this.m_spine = v; }
   public get Spine (): sp.Skeleton { return this.m_spine; }
   //--------------------------------------------------------------------------------------------    
   __preload ()
   {
      this.Reload();
   }

   public Reload ()
   {
      if ( !isValid( this.m_spine ) && !isValid( this.m_anim ) )
      {
         if ( isValid( this.node, true ) )
         {
            this.m_anim = this.node.getComponent( Animation );
            if ( isValid( this.m_anim ) )
            {
               this.m_anim.on( FINISHED, ( trackEntry => this.OnAnimComplete( trackEntry ) ), this );
            }
            this.m_spine = this.node.getComponent( sp.Skeleton );
            if ( isValid( this.m_spine, true ) )
            {
               this.m_spine.setCompleteListener( trackEntry => this.OnSpineComplete( trackEntry ) );
               this.m_spine.setEventListener( ( track, event ) => { this.OnSpineEvent( track, event ); } );
               this.m_spine.setBonesToSetupPose();
               this.m_spine.setSlotsToSetupPose();
            }
         } else
         {
            this.m_anim = null;
            this.m_spine = null;
         }
      }

      this.m_func = null;
      this.m_clips.length = 0;
      this.m_animWaitChain.length = 0;
   }

   update ( dt )
   {
      if ( isValid( this.m_anim, true ) && isValid( this.m_animState, true ) && this.m_endTime > 0 )
      {
         if ( this.m_animState.time >= this.m_endTime )
         {
            this.m_anim.stop();
            this.m_animState = null;
            this.m_endTime = -1;
            this.OnAnimFinished();
         }
      }
   }
   //--------------------------------------------------------------------------------------------


   /** 設定特效 ID 和 節點 */
   // public Set (node:Node) {        
   //     this.m_node = node;
   //     if (isValid(this.m_node, true)) {            
   //         this.m_anim  = this.m_node.getComponent(Animation);
   //         this.m_spine = this.m_node.getComponent(sp.Skeleton);
   //         if (isValid(this.m_spine, true)) {
   //             this.m_spine.setCompleteListener(trackEntry => this.OnSpineComplete(trackEntry));
   //             this.m_spine.setBonesToSetupPose();
   //             this.m_spine.setSlotsToSetupPose();
   //         }
   //     } else {
   //         this.m_anim  = null;
   //         this.m_spine = null;
   //     }
   // }
   //--------------------------------------------------------------------------------------------
   /** 播放節點上的動畫 */
   public PlayAnim ( clip?: string, onFinish?: Function )
   {
      if ( isValid( this.m_anim, true ) )
      {
         this.StopAnim();
         this.m_func = onFinish;
         this.m_anim.once( FINISHED, this.OnAnimFinished, this );
         this.m_anim.play( clip );
      }
   }

   public PlayAnimTime ( startTime: number, endTime: number, clip: string, onFinish?: Function )
   {
      if ( isValid( this.m_anim, true ) )
      {
         this.AnimSetCurrentTime( startTime, clip );
         if ( startTime == endTime )
         {
            return;
         }
         this.m_func = onFinish;
         this.m_anim.play( clip );
         this.m_animState = this.m_anim.getState( clip );
         this.m_animState.setTime( startTime );
         this.m_endTime = endTime;
         // 超過動畫時間總長
         if ( endTime > this.m_animState.duration )
         {
            this.m_endTime = this.m_animState.duration;
         }
      }
   }

   //--------------------------------------------------------------------------------------------
   /** 停止節點上的動畫 */
   public StopAnim ()
   {
      if ( isValid( this.m_anim, true ) )
      {
         this.m_anim.stop();
         if ( this.m_anim.hasEventListener( FINISHED ) )
         {
            this.m_anim.off( FINISHED, this.OnAnimFinished, this );
            this.m_func = null;
         }
      }
   }
   //--------------------------------------------------------------------------------------------
   /** 節點上動畫播放完後觸發 */
   private OnAnimFinished ()
   {
      this.m_func && this.m_func();
      this.m_func = null;
   }
   //--------------------------------------------------------------------------------------------
   // public AnimSet(clip:string, loop:boolean, onFinish?:Function):FxAnimator{
   //     if(isValid(this.m_anim, true)){
   //         this.ClearChain();
   //         this.m_ainmNowChain = {
   //             clipName : clip,
   //             loop : loop,
   //             completeFunc: onFinish
   //         }
   //     }
   //     return this;
   // }
   // anim.play(clipName);
   // anim.pause(clipName);
   // anim.setCurrentTime(0,clipName);
   // anim.sample(clipName);

   public AnimSetCurrentTime ( time: number, clipName: string )
   {
      if ( isValid( this.m_anim, true ) )
      {
         this.m_anim.play( clipName );
         let state: AnimationState = this.m_anim.getState( clipName );
         state.setTime( time );
         state.sample();
      }
   }

   public AnimSet ( clip: string, onFinish?: Function ): FxAnimator
   {
      if ( isValid( this.m_anim, true ) )
      {
         this.ClearChain();
         this.PlayAnimByChain( {
            clipName: clip,
            loop: false,
            completeFunc: onFinish
         } );
      }
      return this;
   }
   public AnimAdd ( clip: string, onFinish?: Function ): FxAnimator
   {
      if ( isValid( this.m_anim, true ) && this.m_ainmNowChain )
      {
         this.m_animWaitChain.push( {
            clipName: clip,
            loop: false,
            completeFunc: onFinish
         } );
      }
      return this;
   }

   private PlayAnimByChain ( toChain: ClipChain )
   {
      this.m_ainmNowChain = toChain;
      if ( isValid( this.m_anim, true ) && isValid( toChain ) && isValid( toChain.clipName ) )
      {
         this.m_anim.play( this.m_ainmNowChain.clipName );
         let animState = this.m_anim.getState( this.m_ainmNowChain.clipName );
         if ( animState && animState.wrapMode.valueOf() == AnimationClip.WrapMode.Loop )
         {
            if ( isValid( this.m_ainmNowChain.completeFunc ) && typeof this.m_ainmNowChain.completeFunc == "function" )
            {
               this.m_anim.once( LASTFRAME, ( trackEntry => this.OnLastFrame( trackEntry ) ), this );
            }
         }
         else if ( animState == null )
         {
            this.m_anim.once( START, () =>
            {
               if ( isValid( this.m_ainmNowChain.completeFunc ) && typeof this.m_ainmNowChain.completeFunc == "function" )
               {
                  this.m_anim.once( LASTFRAME, ( trackEntry => this.OnLastFrame( trackEntry ) ), this );
               }
            }, this );
         }

      }
   }
   private OnLastFrame ( trackEntry )
   {
      if ( LASTFRAME == trackEntry && isValid( this.m_ainmNowChain ) )
      {
         if ( isValid( this.m_ainmNowChain.completeFunc ) && typeof this.m_ainmNowChain.completeFunc == "function" )
         {
            this.m_ainmNowChain.completeFunc();
            this.m_ainmNowChain.completeFunc = null;
         }
      }
   }
   private OnAnimComplete ( trackEntry )
   {
      if ( FINISHED == trackEntry && isValid( this.m_ainmNowChain ) )
      {
         if ( isValid( this.m_ainmNowChain.completeFunc ) && typeof this.m_ainmNowChain.completeFunc == "function" )
         {
            this.m_ainmNowChain.completeFunc();
         }
         this.PlayAnimByChain( this.NextChain( this.m_animWaitChain ) );
      }
   }
   // animchain clip[] cb
   //--------------------------------------------------------------------------------------------
   /** 設定節點上的 Spine 動畫 */
   public SpineSet ( clip: string, loop: boolean, onFinish?: Function ): FxAnimator
   {
      if ( isValid( this.m_spine, true ) )
      {
         if ( !isValid( this.m_spine.findAnimation( clip ) ) )
         {
            error( "null", this );
         }

         this.m_spine.paused = false;
         this.StopSpine();
         if ( this.m_spineToSetupPos )
         {
            this.m_spine.setBonesToSetupPose();
            this.m_spine.setSlotsToSetupPose();
            this.m_spine.setToSetupPose();
         }
         this.m_spine.setAnimation( 0, clip, loop );
         this.m_clips.push( clip );
         this.m_funcs.push( onFinish ? onFinish : () => { } );



      }
      return this;
   }
   //--------------------------------------------------------------------------------------------
   /** 增加節點上的 Spine 動畫 */
   public SpineAdd ( clip: string, loop: boolean, onFinish?: Function ): FxAnimator
   {
      if ( isValid( this.m_spine, true ) )
      {
         if ( !isValid( this.m_spine.findAnimation( clip ) ) )
         {
            error( "null", this );
         }
         this.m_spine.paused = false;
         this.m_spine.addAnimation( 0, clip, loop );
         this.m_clips.push( clip );
         this.m_funcs.push( onFinish ? onFinish : () => { } );
      }
      return this;
   }
   //--------------------------------------------------------------------------------------------
   /** 停止節點上的 Spine 動畫 */
   public StopSpine (): FxAnimator
   {
      if ( isValid( this.m_spine, true ) )
      {
         if ( this.m_spineClearTrack ) this.m_spine.clearTracks();
         this.m_clips.length = 0;
         this.m_funcs.length = 0;
      }
      return this;
   }
   //--------------------------------------------------------------------------------------------
   /** 恢復成等待撥放的狀態 */
   public PauseSpineIDLE ( clip: string, loop: boolean = false, track: number = 0 )
   {
      if ( isValid( this.m_spine, true ) )
      {
         this.m_spine.setAnimation( track, clip, loop );
         this.m_spine.setBonesToSetupPose();
         this.m_spine.setSlotsToSetupPose();
         this.m_spine.setToSetupPose();
         this.m_spine.paused = true;
      }
      return this;
   }
   //--------------------------------------------------------------------------------------------
   /** 節點上 Spine 動畫播放完後觸發 */
   private OnSpineComplete ( trackEntry )
   {
      if ( trackEntry && trackEntry.animation && trackEntry.animation.name &&
         trackEntry.animation.name == this.m_spine.animation )
      {
         let clip: string;
         if ( this.m_clips.length > 0 )
         {
            clip = this.m_clips.shift();
         }

         let func: Function;
         if ( this.m_funcs.length > 0 )
         {
            func = this.m_funcs.shift();
         }
         func && func();
         this.m_spineCompleteFunc && this.m_spineCompleteFunc( trackEntry );
      }
   }
   private OnSpineEvent ( track, event )
   {
      let eventName = null;
      if ( event && event[ "data" ] && event[ "data" ][ "name" ] )
      {
         eventName = event[ "data" ][ "name" ];
         if ( isValid( eventName ) && eventName != "" && this.m_eventMap[ eventName ] && this.m_eventMap[ eventName ].length > 0 )
         {
            let removeIndex: number[] = [];
            let len = this.m_eventMap[ eventName ].length;
            for ( let i = 0; i < len; i++ )
            {
               let data: _EventKeepData = this.m_eventMap[ eventName ][ i ];
               let doCall: boolean = true;
               if ( isValid( data.clipName ) )
               {
                  //需要檢查是否是現在可以撥放的
                  doCall = track && track.animation && track.animation.name && track.animation.name == data.clipName;
               }
               if ( doCall )
               {
                  if ( data.callFunc )
                  {
                     data.callFunc( track, event );
                     if ( data.loop != true ) removeIndex.push( i );
                  } else
                  {
                     removeIndex.push( i );
                  }
               }
            }

            len = removeIndex.length;
            for ( let i = len - 1; i >= 0; i-- )
            {
               this.m_eventMap[ eventName ].splice( removeIndex[ i ], 1 );
            }
         }
      }
   }
   //--------------------------------------------------------------------------------------------    
   /**
    * @param eventName 收到此EventName會回呼
    * @param cb 回呼
    * @param once 是否只執行一次
    * @param playClickName 是否需要檢查目前撥放中的animationName 
    */
   public AddEventListener ( eventName: string, cb: Function, once: boolean = true, playClickName: string = undefined )
   {
      if ( eventName && eventName != "" )
      {
         if ( !isValid( this.m_eventMap[ eventName ] ) ) this.m_eventMap[ eventName ] = [];
         if ( !Array.isArray( this.m_eventMap[ eventName ] ) )
         {
            this.m_eventMap[ eventName ] = [];
         }
         this.m_eventMap[ eventName ].push( {
            eventName: eventName,
            callFunc: cb,
            clipName: playClickName,
            loop: once
         } );
      }
   }
   public RemoveEventListener ( eventName: string )
   {
      if ( isValid( this.m_eventMap[ eventName ] ) )
      {
         this.m_eventMap[ eventName ] = null;
      }
   }
   public RemoveAllEventListener ()
   {
      this.m_eventMap = [];
   }
   //--------------------------------------------------------------------------------------------    
   public Play ( animName: string, loop: boolean = true, onFinish: Function = null )
   {
      if ( animName )
      {
         this.PlayAnim( animName, onFinish );
         this.SpineSet( animName, loop, onFinish );
      }
   }
   //--------------------------------------------------------------------------------------------    
   //--------------------------------------------------------------------------------------------    
   private NextChain ( list: ClipChain[] ): ClipChain
   {
      if ( list.length > 0 ) return list.shift();
      return null;
   }
   public ClearChain ()
   {
      this.m_ainmNowChain = null;
      this.m_animWaitChain.length = 0;
   }
   //--------------------------------------------------------------------------------------------
   onDestroy ()
   {
      if ( isValid( this.m_spine, true ) )
      {
         this.m_spine.setCompleteListener( null );
         this.m_spine.setEventListener( null );
      }
      this.m_anim = null;
      this.m_func = null;
      this.m_spine = null;
      this.m_clips = null;
      this.m_funcs = null;
   }
}

interface ClipChain
{
   clipName: string,
   completeFunc?: Function,
   loop: boolean;
}

interface _EventKeepData
{
   eventName: string,
   callFunc: Function,
   clipName?: string,
   loop?: boolean;
}
