import { _decorator, Component, log, Node, warn } from "cc";

const {ccclass, menu} = _decorator;

@ccclass
@menu("Cabrio/Animation/AnimationEventDetector")
export default class AnimationEventDetector extends Component
{
	private m_callback: Function;

	public static Pack( n:Node, cb:Function ):void{
		n.addComponent( AnimationEventDetector );
		n.getComponent( AnimationEventDetector ).SetCallback( cb );
	}

	AnimationEventDetector( evtName:string )
	{
		if ( this.m_callback )
		{
			log( `[Cabrio-AnimationEventDetector]`, evtName );
			this.m_callback( evtName );
		}
		else
		{
			warn( `[Cabrio-AnimationEventDetector] callback 沒有設定, 無法處理 event:`, evtName );
		}
	}

	triggerAnimationEvent( evtName:string )
	{
		if ( this.m_callback )
		{
			log( `[Cabrio-triggerAnimationEvent]`, evtName );
			this.m_callback( evtName );
		}
		else
		{
			warn( `[Cabrio-triggerAnimationEvent] callback 沒有設定, 無法處理 event:`, evtName );
		}
	}

	SetCallback( cb:Function )
	{
		this.m_callback = cb;
	}

	onDestroy()
	{
		this.m_callback = null;
	}

}
