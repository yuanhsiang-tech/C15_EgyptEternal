import { GameCommonCommand } from "../../Common/GameCommonCommand";

export namespace GameBarDefine
{
	//--------------------------------------------------------------------------------------------
	/** Spin 按鈕開始閒置特效的時間 (秒) */
	export const SPIN_BTN_IDLE_FX_START_TIME = 3.0;

	//--------------------------------------------------------------------------------------------

	export enum UI_NAME
	{
		BTN_INFO			= "Btn_Info",
		BTN_MAX_BET			= "Btn_MaxBet",
		BTN_SPIN			= "Btn_Spin",
		BTN_SPINSTOP		= "Btn_StopSpin",
		AUTOPLAY			= "AutoPlay",
		BTN_AUTOSTOP		= "Btn_StopAuto",
		BTN_AUTOSTOP_C		= "Btn_StopAutoCount",
		BTN_INCREASE		= "Btn_Increase",
		BTN_REDUCE			= "Btn_Reduce",
		MASK_AUTO			= "CancelAuto",
		BTN_COUNT			= "Btn_Count",
		BTN_REWARDMULITPLE	= "Counter",
		AUTOPLAY_MENU		= "AutoPlayMenu",
	}

	//--------------------------------------------------------------------------------------------
	/**
	 * Spin 按鈕的狀態。只會改變顯示的圖層。
	 * @ `SPIN`                顯示 Spin 圖層且按鈕為 enable
	 * @ `SPIN_DISABLE`        顯示 Spin 圖層且按鈕被 disable
	 * @ `SPIN_FREESE`         顯示 Spin 圖層且按鈕被 disable 且鎖定點擊態
	 * @ `STOP`                顯示 Stop 圖層且按鈕為 enable
	 * @ `STOP_DISABLE`        顯示 Stop 圖層且按鈕被 disable
	 * @ `CANCEL_AUTO`         顯示 Auto 圖層和自動玩次數且按鈕為 enable
	 * @ `CANCEL_AUTO_DISABLE` 顯示 Auto 圖層和自動玩次數且按鈕被 disable
	 */
	export enum SpinButtonState
	{
		SPIN				= 0,
		SPIN_DISABLE		= 1,
		STOP				= 2,
		STOP_DISABLE		= 3,
		CANCEL_AUTO			= 4,
		CANCEL_AUTO_DISABLE	= 5,
		SPIN_FREEZE			= 6,
		MAX
	};

	//--------------------------------------------------------------------------------------------

	class SpinBtnViewSetting
	{
		readonly spinVisible	:boolean;
		readonly stopVisible	:boolean;
		readonly stopFooter		:boolean;
		readonly disabledView	:boolean;
		readonly clickable		:boolean;

		constructor(spinVisible:boolean, stopVisible:boolean, stopFooter:boolean, disabledView:boolean, clickable:boolean)
		{
			this.spinVisible	= spinVisible;
			this.stopVisible	= stopVisible;
			this.stopFooter		= stopFooter;
			this.disabledView	= disabledView;
			this.clickable		= clickable;
		}
	}

	export const SpinButtonViewSettings: {[type in GameBarDefine.SpinButtonState]?: Readonly<SpinBtnViewSetting>} = Object.freeze(
	{
		[ GameBarDefine.SpinButtonState.SPIN				]: new SpinBtnViewSetting(true,		false,	false,	false,	true),
		[ GameBarDefine.SpinButtonState.SPIN_DISABLE		]: new SpinBtnViewSetting(true,		false,	false,	true,	true),
		[ GameBarDefine.SpinButtonState.SPIN_FREEZE			]: new SpinBtnViewSetting(true,		false,	false,	true,	false),
		[ GameBarDefine.SpinButtonState.STOP				]: new SpinBtnViewSetting(false,	true,	false,	false,	true),
		[ GameBarDefine.SpinButtonState.STOP_DISABLE		]: new SpinBtnViewSetting(false,	true,	false,	true,	true),
		[ GameBarDefine.SpinButtonState.CANCEL_AUTO			]: new SpinBtnViewSetting(false,	true,	true,	false,	true),
		[ GameBarDefine.SpinButtonState.CANCEL_AUTO_DISABLE	]: new SpinBtnViewSetting(false,	true,	true,	true,	true),
	});

	//--------------------------------------------------------------------------------------------

	export enum BetChangeReason
	{
		ReduceBtnClicked		= 0,
		ReduceBtnTouching		= 1,
		RaiseBtnClicked			= 2,
		RaiseBtnTouching		= 3,
		MaxBetAreaDoubleClicked	= 4,
		UNKNOWN					= 255,
	};

	export enum BetDisplayMode
	{
		NUMBER,
		TEXT,
	};

	export enum BetLockStatus
	{
		NONE,
		UNLOCK,
		LOCK,
		LOCK_BY_LEVEL,
	}

	export interface BetLockChangeInfo
	{
		UnLockType		:GameCommonCommand.UNLOCK_TYPE;
		LastStatus		:BetLockStatus;
		CurrentStatus	:BetLockStatus;
		UnLockLevel		:number;
	}

	//--------------------------------------------------------------------------------------------

	export const AUTOPLAY_COUNT_LIST =
	[
		50,
		100,
		200,
		300,
		500,
		Number.POSITIVE_INFINITY,
	];

	//--------------------------------------------------------------------------------------------

}