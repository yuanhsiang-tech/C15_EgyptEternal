// Dinosaur.Require("RD4", "CannonSkin/CannonSkinFactory")
// Dinosaur.Require("RD4", "Player/SpeedEffect")

// import { log, _decorator, Node, Vec2, Vec3, Color, Animation, Component, director, sys, UITransform, UIOpacity, Label, Sprite, Layers, ModelComponent, tween, v2, v3, sequence, callFunc, delayTime, moveTo, moveBy, scaleBy, scaleTo, repeatForever, Action, sp, Event, AnimationComponent, Vec3Like, math } from 'cc';

// // Forward declarations for unknown types and globals
// declare var Dinosaur: any;

// declare var CustomToast: any;

// declare var GtMobile: any;
// declare var ProfileModel: any;
// declare var Gt2UserApp: any;
// declare var PlayTitleAnimation: any;
// declare var CreateNodeAndAct: (path: string, parent?: Node) => [Node, AnimationComponent];
// declare var SimpleLinkObject: (mapping: any, node: Node) => void;
// declare var ShinyCardBetUpView: any;
// declare var VipModel: any;
// declare var DEVICE_CENTER: Vec2;
// declare var IMG_AVATAR_CHANGER_DEFAULT_NEW: any;

// const LERP_ROT_SPEED = 60;

// class Player extends Node {
//     public static exp: number = 0;
//     public static isUsing: boolean = false;

//     public static lastAngle: number = 0;

//     m_gamescene: any;
//     m_isAutoShoot: boolean;
//     m_isMe: boolean;
//     m_aimLines: { [key: number]: Node };
//     m_lastAngle: number;
//     m_currCannonSkin: number;
//     m_cannonRootPos: Vec2;
//     m_shootShift: number;
//     m_cannonSkins: { [key: number]: any };
//     m_isLerpRot: boolean;
//     m_targetAngle: number | null;
//     m_isLockRot: boolean;
//     m_charId: number;
//     m_myCharacter: any;
//     m_cardRemainTime: {
//         Card_Freeze: number;
//         Card_Lock: number;
//         Card_Speed: number;
//     };
//     m_playerGroup: any;
//     m_charRoot3D: Node;
//     m_charRoot3dPos: Vec3;
//     m_char3D: Node;
//     m_nickname: string;
//     m_vipLv: number;
//     m_themeMaxBet: number;
//     m_themeMinBet: number;
//     m_accountId: number;
//     m_seat: number;
//     m_isUsing: boolean;
//     m_bulletCount: number;
//     m_delayWinNum: number;
//     m_delayWinNumList: { [key: string]: number };
//     m_shootWaitSyncNum: number;
//     m_money: number;
//     m_diamond: number;
//     m_charDefine: any;
//     m_char3dFilePath: string;
//     m_betLimitToast: any;
//     m_crystalAlert: Node;
//     m_requestSimpleInfoCD: any;
//     m_setTitleAndVipAction: Action;
//     m_betData: any;
//     m_bet: number;
//     m_betUpView: any;
//     m_speedEfc: any;
//     m_dropItemPos: Vec2;
//     m_aimLineRoot: Node;
//     m_currAimLine: Node;
//     m_lastAimLineType: number;
//     m_isWait: boolean;

//     constructor(gamescene: any) {
//         super("Player");
//         this.m_gamescene = gamescene;
//         this.m_isAutoShoot = false;
//         this.m_isMe = true;
//         this.m_aimLines = {};
//         this.m_lastAngle = 0;

//         this.m_currCannonSkin = 0;
//         this.m_cannonRootPos = v2(0, 0);
//         this.m_shootShift = 1;
//         this.m_cannonSkins = {};
//         this.m_isLerpRot = false;
//         this.m_targetAngle = null;
//         this.m_isLockRot = false;
//         this.m_charId = -1;
//         this.m_myCharacter = null;

//         this.m_cardRemainTime = {
//             Card_Freeze: 0,
//             Card_Lock: 0,
//             Card_Speed: 0,
//         };
//         this.m_gamescene.RegOnUpdateFunc(this.update.bind(this));
//     }

//     public BindPlayerGroup(playerGroup: any): void {
//         if (playerGroup) {
//             this.m_playerGroup = playerGroup;
//             this.m_cannonRootPos = this.m_playerGroup.Cannon.getComponent(UITransform).convertToWorldSpaceAR(v2(0, 1));
//             this.m_charRoot3D = this.m_playerGroup.charRoot3D;
//             this.m_charRoot3dPos = this.m_charRoot3D.getPosition();
//             this.m_charRoot3D.active = false;
//             this.m_char3D = this.m_playerGroup.char3D;
//             this.m_myCharacter = this.m_playerGroup.myCharacter;
//             this.m_playerGroup.Node_FX_PlayerAdd.act.on(Animation.EventType.FRAME_EVENT,
//                 (event: Event) => {
//                     if (event.type === "Appear") {
//                         this.m_charRoot3D.active = true;
//                     }
//                 }
//             );

//             this.m_playerGroup.getComponent(UIOpacity).opacity = this.m_isMe ? 0xFF : Dinosaur.OtherPlayerAlpha;

//             if (this.m_isMe) {
//                 const toast = CustomToast.create(null, "---", v2(0, 0), 20, 1000000);
//                 this.m_playerGroup.Cannon.addChild(toast);
//             }
//         }
//     }

//     public RetrieveUserInformation(data: any): void {
//         this.m_nickname = data.nickname || "";
//         this.m_vipLv = data.vipLv || 0;
//         this.m_themeMaxBet = data.themeMaxBet || Dinosaur.DEFAULT_MAX_BET;
//         this.m_themeMinBet = data.themeMinBet || Dinosaur.DEFAULT_MIN_BET;
//         this.m_accountId = data.accountId || 0;
//         this.m_seat = data.seat || 1;
//         this.m_isUsing = true;
//         this.m_bulletCount = 0;
//         this.m_delayWinNum = 0;
//         this.m_delayWinNumList = {};
//         this.m_shootWaitSyncNum = 0;
//         this.m_money = data.money;
//         this.m_diamond = data.diamond;
//         if (data.CannonID && data.CannonID > 0) {
//             this.m_currCannonSkin = data.CannonID;
//         }
//         this.m_playerGroup.accountId = this.m_accountId;
//         this.m_playerGroup.SetIsWait(false);
//         this.m_playerGroup.Players.Data.Name.getComponent(Label).string = data.nickname;
//         this.m_playerGroup.head.accountId = this.m_accountId;
//         this.m_charDefine = Dinosaur.CharacterDefine[this.m_myCharacter];
//         this.m_char3dFilePath = this.m_charDefine.FilePath;

//         this.ChangeBet(this.GetLastBet());

//         if (Dinosaur.EventCannonId > 0) {
//             this.ChangeCannonSkin(Dinosaur.EventCannonId);
//         }

//         this.PlayAnimation("Idle", 1, true);
//         this.m_playerGroup.head.getComponent(Sprite).spriteFrame = IMG_AVATAR_CHANGER_DEFAULT_NEW; // Assuming this is a SpriteFrame
//         GtMobile.AvatarLoader.GetInstance().LoadAvatarFromLua(this.m_accountId, 0,
//             (_rlt: any, _type: any, _path: any) => {
//                 if (this && this.isValid && this.m_playerGroup.head && this.m_playerGroup.head.isValid) {
//                     director.getTextureCache().reloadTexture(_path);
//                     this.m_playerGroup.head.active = true;
//                     this.m_playerGroup.head.getComponent(Sprite).spriteFrame = _path; // This needs asset loading logic
//                 }
//             }
//             , 0);

//         this.m_gamescene.players[this.m_seat] = this;
//         if (this.m_isMe) {
//             this.ShowAimLine(0);
//             const titleId = ProfileModel.GetCurrTitleId();
//             this.SetTitle(titleId);

//             this.InitSeatHint();

//             const node = CustomToast.create(null, null, v2(this.m_playerGroup.Cannon.getPosition().x, this.m_playerGroup.Cannon.getPosition().y + 25), 18,
//                 100000000);

//             this.m_playerGroup.Cannon.getParent().addChild(node);

//             this.m_betLimitToast = node;

//             if (this.m_gamescene.NotifyGettingThings_Ani && this.m_gamescene.NotifyGettingThings_Ani.isValid) {
//                 const pos = this.m_playerGroup.head.getComponent(UITransform).convertToWorldSpaceAR(v2(0, 0));
//                 this.m_gamescene.NotifyGettingThings_Ani.SetTargetPostion(pos);
//             }
//         } else {
//             ProfileModel.RequestPlayerSimpleInfo([this.m_accountId], true);
//             this.SetPlayerSimpleInfo();
//             this.RunJoinAction();
//             if (this.m_playerGroup.Players.BetViewBtn) {
//                 this.m_playerGroup.Players.BetViewBtn.removeFromParent();
//                 this.m_playerGroup.Players.BetViewBtn = null;
//             }
//             this.m_playerGroup.char3D.getComponent(ModelComponent).material.setProperty('mainColor', new Color(0x9F, 0x9F, 0x9F));
//         }
//     }

//     public RunJoinAction(): void {
//         this.m_playerGroup.Node_FX_PlayerAdd.act.play("Open");
//     }

//     public InitSeatHint(): void {
//         const [node, act] = CreateNodeAndAct(Dinosaur.ResPath.AIO + "Csd/Play/PlayerSeat.csb",
//             this.m_playerGroup.Cannon.getParent());
//         act.play();

//         const scale = 0.7;

//         node.setPosition(v2(this.m_playerGroup.Cannon.getPosition().x, this.m_playerGroup.Cannon.getPosition().y + 260 * scale + 15));

//         SimpleLinkObject({
//             word: "",
//             wordTip: "",
//             vip: "",
//             bet: "",
//         }, node);

//         node.setScale(scale, scale, 1);

//         (node as any).word.active = !Dinosaur.Play.isCrystalTheme;
//         (node as any).wordTip.active = Dinosaur.Play.isCrystalTheme;

//         if (this.m_gamescene.vipLimitInfo) {
//             (node as any).bet.getComponent(Label).string = this.m_gamescene.vipLimitInfo.bet;
//             (node as any).vip.getComponent(Label).string = this.m_gamescene.vipLimitInfo.vip;
//         }

//         this.m_crystalAlert = node;
//     }

//     public SetPlayerSimpleInfo(): void {
//         const simpleInfo = ProfileModel.GetSimpleInfo(this.m_accountId);
//         if (simpleInfo && simpleInfo.accountId !== 0) {
//             this.SetTitle(simpleInfo.titleId);
//         } else {
//             this.SetTitle(0);
//         }
//         if (!this.m_isMe) {
//             if (this.m_requestSimpleInfoCD.TakeAndRestart()) {
//                 ProfileModel.RequestPlayerSimpleInfo([this.m_accountId], true);
//             }
//             if (this.m_setTitleAndVipAction) {
//                 this.stopAction(this.m_setTitleAndVipAction);
//             }
//             this.m_setTitleAndVipAction = this.runAction(
//                 sequence(
//                     delayTime(3),
//                     callFunc(() => {
//                         this.SetPlayerSimpleInfo();
//                     })
//                 )
//             );
//         } else {
//             // 自己的直接用
//             const titleId = ProfileModel.GetCurrTitleId();
//             this.SetTitle(titleId);
//         }
//     }

//     public SetTitle(titleId: number): void {
//         if (ProfileModel.GetShowTitleAction(titleId) == 1) {
//             // 動態稱號
//             const node = this.m_playerGroup.AnimatedTitle;
//             node.setTag(10);
//             PlayTitleAnimation.IsPlayTitleAnimation(titleId, this.m_playerGroup.AnimatedTitle, this.m_playerGroup.title);
//         } else {
//             this.m_playerGroup.AnimatedTitle.active = false;
//             this.m_playerGroup.title.active = true;
//             Gt2UserApp.DownloadTitleImage(titleId, this.m_playerGroup.title);
//         }
//     }

//     // 更換砲衣(角色)skin
//     public ChangeCannonSkin(itemId: number): void {
//         if (itemId > 10000 && Dinosaur.CharacterDefine[itemId]) {
//             this.m_charId = itemId;
//             const skinNodeName = "Skin" + itemId;
//             const chDefine = Dinosaur.CharacterDefine[itemId];
//             let skin = this.m_charRoot3D.getChildByName(skinNodeName);
//             if (skin == null) {
//                 skin = new Node(); // Placeholder for Sprite3D.create
//                 // asset loading for 3d model required here
//                 this.m_charRoot3D.addChild(skin);
//                 skin.layer = Layers.Enum.USER1;
//                 skin.setScale(chDefine.Scale, chDefine.Scale, chDefine.Scale);
//                 skin.setRotationFromEuler(90, 0, 0);

//                 const animation = skin.addComponent(Animation);
//                 // animation clip loading required here
//                 const animationData = chDefine.Animation.IdleWait;
//                 if (Dinosaur.isWaterWorld) {
//                     // animationData = chDefine.Animation.IdleWait_W;
//                 }
//                 const animState = animation.createState(animationData.ClipName, animationData.Start, animationData.Length);
//                 animState.wrapMode = Animation.WrapMode.Loop;
//                 animState.play();
//             }
//             this.m_char3D.active = false;
//             this.m_char3D = skin;
//             this.m_charDefine = chDefine;
//             this.m_char3dFilePath = this.m_charDefine.FilePath;
//         } else if (this.m_charId >= 0) {
//             this.m_charId = -1;
//             this.m_char3D.active = false;

//             this.m_char3D = this.m_playerGroup.char3D;
//             this.m_char3D.active = true;
//             this.m_charDefine = Dinosaur.CharacterDefine[this.m_myCharacter];
//             this.m_char3dFilePath = this.m_charDefine.FilePath;
//         }
//     }

//     public ChangeBet(bet: number): void {
//         if (this.m_isMe) {
//             if (bet < this.m_themeMinBet) {
//                 bet = this.m_themeMinBet;
//             } else if (bet > this.m_themeMaxBet) {
//                 bet = this.m_themeMaxBet;
//             }
//             if (this.m_bet !== bet) {
//                 if (!this.m_betUpView) {
//                     const betUpView = ShinyCardBetUpView.create(Dinosaur.Play.isCrystalTheme);
//                     this.m_playerGroup.addChild(betUpView);
//                     this.m_betUpView = betUpView;
//                     betUpView.setPosition(v2(80, 40));
//                 }
//                 const list: number[] = [];
//                 for (const betStr in Dinosaur.BetData) {
//                     list.push(Number(betStr));
//                 }
//                 list.sort((a, b) => a - b);
//                 this.m_betUpView.SetData(bet, list);
//             }
//         }

//         this.m_betData = Dinosaur.BetData[bet] || Dinosaur.BetData[this.m_themeMinBet];
//         this.m_bet = this.m_betData && this.m_betData.curbet || bet;
//         this.m_playerGroup.CannonNum.getComponent(Label).string = String(this.m_bet);

//         if (this.m_isMe) {
//             this.m_gamescene.OnSelfChangeBet(true);
//             this.m_gamescene.m_gameMain.ReqSyncMeteoriteBurstEnegry(this.m_bet, true);
//         }
//     }

//     public GetDefaultBet(): number {
//         if (Dinosaur.Play.isCrystalTheme) {
//             if (this.m_money >= 100000 && this.m_gamescene.CheckBetValid(2000, this.m_money, VipModel.GetVipInfoLevel())) {
//                 return 2000;
//             } else {
//                 return 1000;
//             }
//         } else {
//             return this.m_themeMinBet;
//         }
//     }

//     public GetLastBet(): number {
//         if (this.m_isMe) {
//             const betStr = sys.localStorage.getItem(String.format("DINO_SIDX_%d_BET_A_%d",
//                 Dinosaur.Play.serverIdx, Gt2UserApp.GetAccountId()));
//             if (betStr) {
//                 const bet = parseInt(betStr);
//                 if (Dinosaur.Play.isCrystalTheme) {
//                     if (this.m_gamescene.CheckBetValid(bet, this.m_money, VipModel.GetVipInfoLevel())) {
//                         return bet;
//                     } else {
//                         return this.GetDefaultBet();
//                     }
//                 } else {
//                     return bet;
//                 }
//             } else {
//                 return this.GetDefaultBet();
//             }
//         } else {
//             return this.m_themeMinBet;
//         }
//     }

//     public setCannonToTarget(target: Vec2, shootID?: number): void {
//         if (this.m_isLockRot) {
//             return;
//         }
//         shootID = shootID || 0;
//         const pos = v2(0, 0);
//         const dir = target.subtract(this.getGunPointPos3D());
//         let angle = Dinosaur.DirectionToAngle(dir, 999, 0);
//         angle = math.toDegrees(angle);

//         this.setCannonToAngle(angle, true);
//     }

//     public setCannonToAngle(angle: number, checkLerp?: boolean): void {
//         if (this.m_isLockRot) {
//             return;
//         }
//         if (angle > 180) {
//             angle = angle - 360;
//         }
//         if (Dinosaur.LimitAngle !== 0) {
//             if (angle > Dinosaur.LimitAngle) {
//                 angle = Dinosaur.LimitAngle;
//             } else if (angle < -Dinosaur.LimitAngle) {
//                 angle = -Dinosaur.LimitAngle;
//             }
//         }
//         if (checkLerp && this.m_isLerpRot) {
//             const diff = angle - this.m_lastAngle;
//             if (Math.abs(diff) > LERP_ROT_SPEED * 0.03) {
//                 this.m_targetAngle = angle;
//                 if (angle > this.m_lastAngle) {
//                     this.m_lastAngle = this.m_lastAngle + LERP_ROT_SPEED * 0.03;
//                 } else {
//                     this.m_lastAngle = this.m_lastAngle - LERP_ROT_SPEED * 0.03;
//                 }
//             } else {
//                 this.m_lastAngle = angle;
//             }
//         } else {
//             this.m_lastAngle = angle;
//         }
//         this.m_charRoot3D.setRotationFromEuler(0, 0, this.m_lastAngle);
//     }

//     public rotateCannon(angle: number): void {
//         if (this.m_isLockRot) {
//             return;
//         }
//         this.m_lastAngle = this.m_lastAngle + angle;
//         if (Dinosaur.LimitAngle !== 0) {
//             if (this.m_lastAngle > Dinosaur.LimitAngle) {
//                 this.m_lastAngle = Dinosaur.LimitAngle;
//             } else if (this.m_lastAngle < -Dinosaur.LimitAngle) {
//                 this.m_lastAngle = -Dinosaur.LimitAngle;
//             }
//         }

//         // 轉動控制砲台只對主砲有效
//         this.m_charRoot3D.setRotationFromEuler(0, 0, this.m_lastAngle);
//     }

//     public getCannonRotation(shootID?: number): number {
//         return this.m_lastAngle;
//     }

//     // 取得獎圈世界座標位置
//     public getWinCirclePos(): Vec2 {
//         return v2(this.m_cannonRootPos.x, Dinosaur.DesignSize.height * 0.4);
//     }

//     // 掉落道具的目標世界座標位置
//     public getDropItemTargetPos(): Vec2 {
//         if (this.m_dropItemPos == null) {
//             if (this.m_playerGroup == null) {
//                 return this.m_cannonRootPos;
//             } else {
//                 this.m_dropItemPos = this.m_cannonRootPos.clone();
//             }
//         }
//         return this.m_dropItemPos.clone();
//     }

//     // 掉落道具的目標世界座標位置
//     public GetGoldNumPos(): Vec2 {
//         const goldNumSize = this.m_playerGroup.GoldNum.getComponent(UITransform).contentSize;
//         const goldNumPos = v2(goldNumSize.width, goldNumSize.height * 0.7);
//         return this.m_playerGroup.GoldNum.getComponent(UITransform).convertToWorldSpaceAR(goldNumPos);
//     }

//     public getWeaponHintPos(): Vec2 {
//         return this.m_cannonRootPos.add(v2(-120, 60));
//     }

//     public getShootCD(): number {
//         const shootCD = {
//             [Dinosaur.Play.Protocol.BulletType.Normal]: 0.20,
//             [Dinosaur.Play.Protocol.BulletType.Axe]: 0.23,
//             [Dinosaur.Play.Protocol.BulletType.Lightening]: 0.26,
//             [Dinosaur.Play.Protocol.BulletType.Meteor]: 0.31,
//             [Dinosaur.Play.Protocol.BulletType.Hammer]: 1,
//         };
//         let otherRate = 1;
//         if (this.IsCardUsing("Card_Speed")) {
//             const speedFactor = 1.4;
//             otherRate = otherRate / speedFactor;
//         }
//         return shootCD[this.m_gamescene.useWeapon] * otherRate;
//     }

//     public SpeedUpCannon(enable: boolean): void {
//         if (!enable && this.m_speedEfc == null) {
//             return;
//         }
//         if (this.m_speedEfc == null) {
//             this.m_speedEfc = Dinosaur.SpeedEffect.create();
//             if (!this.m_isMe) {
//                 this.m_speedEfc.getComponent(UIOpacity).opacity = Dinosaur.OtherPlayerAlpha;
//             }
//             this.m_charRoot3D.addChild(this.m_speedEfc);
//         }
//         this.m_speedEfc.Show(enable);
//     }

//     public CreateWinCircle(timelineData: any, fish: any, money: number, scale: number, circleType: any, endCB: Function, position: Vec2, ...args: any[]): boolean {
//         const targetPos = position || this.getWinCirclePos();
//         let succ = false;
//         if (circleType) {
//             succ = this.m_gamescene.winCircleManager.showWinCircle(this.m_seat, circleType, endCB, targetPos, money,
//                 fish, scale, timelineData, ...args);
//         }
//         if (!succ) {
//             const dropItemList = args[0];
//             const moneyConvertInfo = args[1];
//             this.CreateItemDropList(dropItemList, fish);
//             this.CreateDantouDrop(moneyConvertInfo, fish, dropItemList ? dropItemList.length : 0);
//             if (endCB) {
//                 endCB(targetPos);
//             }
//             if (money > 0) {
//                 const startPos = args[4];
//                 let fishPos = startPos || DEVICE_CENTER;
//                 if (fish) {
//                     fishPos = this.m_gamescene.Get3dTo2dPos(
//                         v3(fish.getPosition().x, fish.getPosition().y, fish.get3dHeight() * 0.5));
//                     // 𡘙龍特規，要下來一點點
//                     if (fish.fishData.Data == Dinosaur.SpecialDinoId.HugeStegosaurus) {
//                         fishPos = v2(fishPos.x, fishPos.y - 150);
//                     }
//                 }
//                 this.m_gamescene.dropEffectMgr.createJumpWinPool(this.m_seat, money, fishPos);
//             }
//         }

//         return succ;
//     }

//     public OnCreateCoinWhileFishNotExist(money: number, dropItemList: any[], moneyConvertInfo: any, key: string): void {
//         this.FinishDelayUpdateMoney(money, key);

//         if (this.m_isMe && dropItemList && dropItemList.length > 0) {
//             for (let i = 0; i < dropItemList.length; i++) {
//                 const item = dropItemList[i];
//                 this.m_gamescene.OnPlayerDropItemFinish(item.dropItemNo, item.dropNum + item.extraAddNum);
//             }
//         }

//         if (this.m_isMe && moneyConvertInfo && moneyConvertInfo.itemAmount > 0) {
//             this.m_gamescene.OnPlayerDropItemFinish(moneyConvertInfo.itemId, moneyConvertInfo.itemAmount);
//         }
//     }

//     public loadWinEffect(res: string, parent: Node): Node {
//         const bigwin = cc.CSLoader.createNode(res); // Needs replacement with instantiate
//         bigwin.active = false;
//         parent.addChild(bigwin);
//         const bigwinTimeline = cc.CSLoader.createTimeline(res); // Needs replacement with getComponent(Animation)
//         bigwinTimeline.setTag(bigwin.getTag());
//         bigwin.runAction(bigwinTimeline);
//         return bigwin;
//     }

//     public UpdateMoney(chip: number, gold: number, delayNum: number, key: string): void {
//         this.m_money = chip || this.m_money;
//         this.m_diamond = gold || this.m_diamond;
//         this.AddDelayNum(delayNum, key);
//     }

//     public GetDisplayMoney(): number {
//         const money = this.m_money - this.m_delayWinNum - this.m_shootWaitSyncNum;
//         return money >= 0 ? money : 0;
//     }

//     public AddDelayNum(num: number, key: string): void {
//         // 滄龍特規，都要延遲
//         let forceDelay = false;
//         if (typeof key === "string" && key.includes("DEG_G2U_KILL_MOSASAURUS_NOTIFY")) {
//             forceDelay = true;
//         }
//         if ((this.m_isMe && typeof num === "number") || forceDelay) {
//             this.m_delayWinNum = this.m_delayWinNum + num;

//             if (!this.m_delayWinNumList[key]) {
//                 this.m_delayWinNumList[key] = num;
//             } else {
//                 Dinosaur.__G__TRACKBACK__("-DuplicateDelayWinNum " +
//                     String(key) + "," + String(num) + "," + String(this.m_delayWinNumList[key]));
//             }
//         }

//         this.UpdateMoneyUI();
//     }

//     public FinishDelayUpdateMoney(chip: number, key: string): void {
//         // 滄龍特規，都要延遲
//         let forceDelay = false;
//         if (typeof key === "string" && key.includes("DEG_G2U_KILL_MOSASAURUS_NOTIFY")) {
//             forceDelay = true;
//         }
//         if ((this.m_isMe && typeof chip === "number") || forceDelay) {
//             this.m_delayWinNum = this.m_delayWinNum - chip;

//             if (this.m_delayWinNumList[key]) {
//                 const diff = this.m_delayWinNumList[key] - chip;
//                 if (diff !== 0) {
//                     Dinosaur.__G__TRACKBACK__("-DelayWinNumNotMatch " +
//                         String(key) + "," + String(chip) + "," + String(this.m_delayWinNumList[key]));
//                 }
//                 delete this.m_delayWinNumList[key];
//             } else {
//                 this.m_delayWinNum = this.m_delayWinNum + chip;
//                 Dinosaur.__G__TRACKBACK__("-DelayWinNumNotFound " + String(key) + "," + String(chip));
//             }
//         }
//         this.m_gamescene.OnSelfChangeBet();
//         this.UpdateMoneyUI();
//     }

//     public AddLocalShoot(bet: number): void {
//         if (this.m_isMe && typeof bet === "number") {
//             this.m_shootWaitSyncNum = this.m_shootWaitSyncNum + bet;
//         }
//         this.UpdateMoneyUI();
//     }

//     public SyncShootMoney(bet: number, money: number, bulletType: any): void {
//         if (this.m_isMe && typeof bet === "number") {
//             this.m_shootWaitSyncNum = this.m_shootWaitSyncNum - bet * Dinosaur.WeaponBet[bulletType];
//         }
//         this.m_money = money || this.m_money;
//         this.UpdateMoneyUI();
//     }

//     public UpdateMoneyUI(): void {
//         const money = this.GetDisplayMoney();
//         const str = Dinosaur.Helper.FormatCurrency(money, true);
//         this.m_playerGroup.GoldNum.getComponent(Label).string = str;
//         if (this.m_isMe) {
//             this.m_gamescene.OnPlayerMoneyUIChanged(money, this.m_diamond);
//         }
//     }

//     public jumpValueAtSeat(value: number, key: string): void {
//         if (value <= 0 || this.m_gamescene.dropEffectMgr == null || this.m_playerGroup.GoldNum == null) {
//             return;
//         }
//         const labelPos = this.m_playerGroup.GoldNum.getComponent(UITransform).convertToWorldSpaceAR(v2(10, 20));
//         this.m_gamescene.dropEffectMgr.createJumpWinPool(this.m_seat, value, labelPos);

//         // 滄龍特規，都要延遲
//         let forceDelay = false;
//         if (typeof key === "string" && key.includes("DEG_G2U_KILL_MOSASAURUS_NOTIFY")) {
//             forceDelay = true;
//         }

//         if (forceDelay || this.m_isMe) {
//             this.FinishDelayUpdateMoney(value, key);
//             this.m_playerGroup.GoldNum.stopAllActions();
//             this.m_playerGroup.GoldNum.setScale((this.m_playerGroup.GoldNum as any).scale, (this.m_playerGroup.GoldNum as any).scale, 1);

//             this.m_playerGroup.GoldNum.runAction(sequence(
//                 scaleBy(0.25, 1.2),
//                 scaleTo(0.2, (this.m_playerGroup.GoldNum as any).scale)
//             ));
//         }
//     }

//     public playShootAct(isSkillShoot: boolean, bulletId: number): void {
//         if (this.m_currCannonSkin > 0 && this.m_cannonSkins[this.m_currCannonSkin]) {
//             this.m_cannonSkins[this.m_currCannonSkin].shoot();
//         }

//         this.m_shootShift = (this.m_shootShift % 2) + 1;
//         if (this.m_char3D) {
//             if (Dinosaur.isWaterWorld) {
//                 this.PlayAnimation(this.m_shootShift > 1 ? "ShootL_W" : "ShootR_W", 1, false,
//                     () => { this.PlayAnimation("Idle_W", 1, true) });
//             } else {
//                 if (bulletId == Dinosaur.BulletId.FireBall || bulletId == Dinosaur.BulletId.Hammer) {
//                     this.PlayAnimation("Throw", 1, false,
//                         () => { this.PlayAnimation("Idle", 1, true) });
//                 } else {
//                     this.PlayAnimation(this.m_shootShift > 1 ? "ShootL" : "ShootR", 1, false,
//                         () => { this.PlayAnimation("Idle", 1, true) });
//                 }
//             }
//         }
//     }

//     public PlayAnimation(key: string, speed: number, loop: boolean, endCB?: Function): void {
//         this.m_char3D.stopAllActions();
//         this.m_isWait = false;
//         const animation = this.m_char3D.getComponent(Animation);
//         let animate = null;

//         const animationData = this.m_charDefine.Animation[key];
//         if (animationData == null) {
//             // animate = cc.Animate3D.create(animation, 0, 5); // Placeholder
//         } else {
//             // animate = cc.Animate3D.create(animation, animationData.Start, animationData.Length); // Placeholder
//         }
//         // animate.setSpeed(speed || 1);
//         if (loop) {
//             // this.m_char3D.runAction(cc.RepeatForever.create(animate));
//         } else {
//             if (endCB) {
//                 // this.m_char3D.runAction(cc.Sequence.create(
//                 //     animate,
//                 //     cc.CallFunc.create(endCB)
//                 // ));
//             } else {
//                 // this.m_char3D.runAction(animate);
//             }
//         }

//         if (key == "Idle" || key == "Idle_W") {
//             this.PreparePlayIdle();
//         }
//     }

//     public PreparePlayIdle(): void {
//         this.m_char3D.runAction(
//             sequence(
//                 delayTime(Dinosaur.IdleAnimationIdleTime),
//                 callFunc(() => {
//                     this.PlayIdle();
//                 })
//             )
//         );
//     }

//     public PlayIdle(): void {
//         if (!this.m_isAutoShoot && !this.m_gamescene.ui.autoView.isActivate) {
//             if (Dinosaur.isWaterWorld) {
//                 this.PlayAnimation("IdleWait_W", 1, true);
//             } else {
//                 this.PlayAnimation("IdleWait", 1, true);
//             }
//             this.m_isWait = true;
//             this.setCannonToAngle(0);
//         } else {
//             this.PreparePlayIdle();
//         }
//     }

//     public PlayEfk(): void {
//         log("Player:PlayEfk()");
//         if (!this.m_char3D) return;
//         // 水世界的泡泡
//         if (Dinosaur.isWaterWorld && this.m_charDefine.Efk) {
//             const EfkData = this.m_charDefine.Efk.Bubble;
//             if (!(this.m_char3D as any).Efk) {
//                 log("Player:PlayEfk()_create: ", EfkData.EfkFile);
//                 const emitter = this.m_gamescene.createEffekseer(EfkData.EfkFile);
//                 const newP3Dnode = new Node();
//                 newP3Dnode.setPosition(EfkData.Position || v3(0, 0, 1));
//                 newP3Dnode.setRotationFromEuler(EfkData.Rotation ? EfkData.Rotation.x : 90, EfkData.Rotation ? EfkData.Rotation.y : 0, EfkData.Rotation ? EfkData.Rotation.z : 0);
//                 newP3Dnode.setScale(v3(EfkData.Scale || 1, EfkData.Scale || 1, EfkData.Scale || 1));
//                 const attachNode = this.m_char3D.getAttachNode(EfkData.AttachBone);
//                 attachNode.addChild(newP3Dnode);
//                 emitter.setPlayOnEnter(true);
//                 emitter.node.parent = newP3Dnode;
//                 emitter.setIsLooping(true);
//                 emitter.setRemoveOnStop(false);
//                 emitter.setSpeed(1);
//                 director.getRunningScene().runAction(sequence(
//                     delayTime(0.05),
//                     callFunc(() => { emitter.gotoFrameAndPlay(0); })
//                 ));
//                 (this.m_char3D as any).Efk = newP3Dnode;
//             }
//             (this.m_char3D as any).Efk.active = true;
//         } else {
//             if ((this.m_char3D as any).Efk) (this.m_char3D as any).Efk.active = false;
//         }
//         log("Player:PlayEfk()_end");
//     }

//     // shootID代表要取哪隻砲, 0或nil為主要的, >0代表副砲
//     public getGunPointPos3D(shootID?: number): Vec2 {
//         if (this.m_charRoot3D) {
//             return v2(this.m_charRoot3D.getPosition().x, this.m_charRoot3D.getPosition().y);
//         }
//         return v2(0, 0);
//     }

//     public getBulletDataID(shootID: number, lockedFish: any): number {
//         const bulletIdMap = {
//             [Dinosaur.Play.Protocol.BulletType.Normal]: Dinosaur.BulletId.Lock,
//             [Dinosaur.Play.Protocol.BulletType.Axe]: Dinosaur.BulletId.Axe,
//             [Dinosaur.Play.Protocol.BulletType.Lightening]: Dinosaur.BulletId.Lightening,
//             [Dinosaur.Play.Protocol.BulletType.Meteor]: Dinosaur.BulletId.FireBall,
//         };
//         if (this.m_charDefine && this.m_charDefine.BulletId) {
//             return this.m_charDefine.BulletId;
//         }
//         let bulletId = Dinosaur.BulletId.Normal;
//         if (lockedFish) {
//             bulletId = bulletIdMap[shootID] || bulletId;
//         }
//         return bulletId;
//     }

//     public setCardActive(cardName: string, cardTime: number): void {
//         if (cardName == "Card_Speed") {
//             this.SpeedUpCannon(true);
//         }

//         this.m_cardRemainTime[cardName] = cardTime;
//     }

//     public IsCardUsing(cardName: string): boolean {
//         return this.m_cardRemainTime[cardName] > 0;
//     }

//     update(dt: number): void {
//         // update card using state
//         for (const cardName in this.m_cardRemainTime) {
//             const time = this.m_cardRemainTime[cardName];
//             if (time > 0) {
//                 this.m_cardRemainTime[cardName] = time - dt;
//                 if (this.m_cardRemainTime[cardName] <= 0) {
//                     this.m_cardRemainTime[cardName] = 0;
//                     if (cardName == "Card_Lock") {
//                         this.m_gamescene.onCard_LockEnd(this.m_seat);
//                     } else if (cardName == "Card_Speed") {
//                         this.SpeedUpCannon(false);
//                     }
//                 }
//             }
//         }
//         // 更新旋轉角度
//         if (this.m_isLerpRot && this.m_targetAngle !== null) {
//             const diff = this.m_targetAngle - this.m_lastAngle;
//             if (Math.abs(diff) <= LERP_ROT_SPEED * dt) {
//                 this.setCannonToAngle(this.m_targetAngle);
//                 this.m_targetAngle = null;
//             } else {
//                 if (this.m_targetAngle > this.m_lastAngle) {
//                     this.setCannonToAngle(this.m_lastAngle + LERP_ROT_SPEED * dt);
//                 } else {
//                     this.setCannonToAngle(this.m_lastAngle - LERP_ROT_SPEED * dt);
//                 }
//             }
//         }
//     }

//     public getShootDir(): Vec2 {
//         return v2(0, 1).rotate(math.toRadians(this.getCannonRotation()));
//     }

//     public ShowAimLine(aimLineType: number): void {
//         if (this.m_aimLines[aimLineType] == null) {
//             if (this.m_aimLineRoot == null) {
//                 this.m_aimLineRoot = new Node(); // 要放入3D層就需要掛在一個Sprite3D原件底下
//                 this.m_aimLineRoot.layer = Layers.Enum.USER1;
//                 this.m_charRoot3D.addChild(this.m_aimLineRoot);
//             }

//             const node3d = new Node(); // 要放入3D層就需要掛在一個Sprite3D原件底下
//             node3d.layer = Layers.Enum.USER1;
//             this.m_aimLineRoot.addChild(node3d);
//             const path = Dinosaur.RES_FILE[String.format("AIM_LINE_%d_CSB", aimLineType)];
//             const [aimLine, aimLineAct] = CreateNodeAndAct(path); // Assuming CreateNodeAndAct returns [Node, AnimationComponent]
//             node3d.addChild(aimLine);
//             aimLine.layer = Layers.Enum.USER1;
//             aimLine.setPosition(0, 18, 1);
//             aimLine.setScale(0.1, 0.1, 0.1);
//             if (aimLineType == 0) {
//                 const charDef = Dinosaur.CharacterDefine[this.m_myCharacter];
//                 aimLine.getComponent(Sprite).color = new Color(charDef.AimLineColor[0], charDef.AimLineColor[1], charDef.AimLineColor[2]);
//             }

//             aimLineAct.play();
//             this.m_aimLines[aimLineType] = aimLine;
//         }
//         if (this.m_currAimLine) {
//             this.m_currAimLine.active = false;
//         }
//         this.m_aimLines[aimLineType].active = true;
//         this.m_currAimLine = this.m_aimLines[aimLineType];
//         this.m_lastAimLineType = aimLineType;
//     }

//     public ShowSpCannon(isShow: boolean, cannonSkinId: number): void {
//         if (!isShow && this.m_cannonSkins[cannonSkinId] == null) {
//             return;
//         }
//         if (this.m_cannonSkins[cannonSkinId] == null) {
//             const newCannon = Dinosaur.CannonSkinFactory.createCannonSkin(cannonSkinId);
//             this.m_charRoot3D.addChild(newCannon);
//             this.m_cannonSkins[cannonSkinId] = newCannon;
//         }
//         if (isShow) {
//             this.m_currCannonSkin = cannonSkinId;
//             this.m_cannonSkins[cannonSkinId].Show();
//         } else {
//             this.m_cannonSkins[cannonSkinId].Hide();
//         }
//     }

//     public setLerpRot(enable: boolean): void {
//         this.m_isLerpRot = enable;
//         if (!enable) {
//             this.m_targetAngle = null;
//         }
//     }

//     public setLockRot(setting: boolean): void {
//         this.m_isLockRot = setting;
//     }

//     public CreateItemDrop(item: any, fishPos: Vec2, delay: number, offset: Vec2): void {
//         const pos = fishPos.add(offset);
//         const [node, act] = CreateNodeAndAct(Dinosaur.ResPath.AIO + "Csd/Page/Get/DropItem.csb");
//         const endPos = this.m_playerGroup.head.getComponent(UITransform).convertToWorldSpaceAR(v2(0, 0));
//         const distance = Vec2.distance(pos, endPos);
//         (node as any).act = act;
//         node.setPosition(pos.x, pos.y, 0);
//         node.setScale(0.6, 0.6, 0.6);
//         this.m_gamescene.ui.CoinLayer.addChild(node);
//         act.play("drop");
//         act.once(Animation.EventType.FINISHED,
//             () => {
//                 if (this.m_isMe) {
//                     Dinosaur.SEMgr.PlaySound(Dinosaur.SoundTable.DROP_ITEM);
//                 }
//                 node.runAction(
//                     sequence(
//                         moveTo(distance / 1500, endPos),
//                         callFunc(() => {
//                             if (this.m_isMe) {
//                                 this.m_gamescene.OnPlayerDropItemFinish(item.dropItemNo, item.dropNum + item.extraAddNum);
//                             }
//                         }),
//                         callFunc(() => node.destroy())
//                     )
//                 );
//             }
//         );
//         SimpleLinkObject({
//             Sprite_1: "",
//             BitmapFontLabel_1: "",
//         }, node);
//         if (Dinosaur.ItemDefine[item.dropItemNo] == null) {
//             log("CreateItemDrop item not found: " + String(item.dropItemNo));
//             return;
//         }
//         (node as any).Sprite_1.getComponent(Sprite).spriteFrame = Dinosaur.ItemDefine[item.dropItemNo].Img;
//         (node as any).BitmapFontLabel_1.getComponent(Label).string = String(item.dropNum + item.extraAddNum);
//         node.getComponent(UIOpacity).opacity = this.m_isMe ? 0xFF : Dinosaur.OtherPlayerAlpha;
//         if (this.m_gamescene.mosasaurusMgr.IsPlayingGem()) {
//             node.getComponent(UIOpacity).opacity = 0;
//         }
//     }

//     public CreateItemDropList(dropItemList: any[], fish: any): void {
//         if (dropItemList && dropItemList.length > 0) {
//             let fishPos: Vec2;
//             if (fish) {
//                 fishPos = this.m_gamescene.Get3dTo2dPos(v3(fish.getPosition().x, fish.getPosition().y, fish.fishHeight * 0.5));
//             } else {
//                 fishPos = DEVICE_CENTER;
//             }
//             for (let i = 0; i < dropItemList.length; i++) {
//                 this.CreateItemDrop(dropItemList[i], fishPos, 0, v2(i * 60, 0));
//             }
//         }
//     }

//     public CreateDantouDrop(moneyConvertInfo: any, fish: any, itemNum: number): void {
//         if (moneyConvertInfo && moneyConvertInfo.itemAmount > 0) {
//             let fishPos: Vec2;
//             if (fish) {
//                 fishPos = this.m_gamescene.Get3dTo2dPos(v3(fish.getPosition().x, fish.getPosition().y, fish.fishHeight * 0.5));
//             } else {
//                 fishPos = DEVICE_CENTER;
//             }
//             this.CreateItemDrop(
//                 { dropItemNo: moneyConvertInfo.itemId, dropNum: moneyConvertInfo.itemAmount, extraAddNum: 0 }, fishPos, 0,
//                 v2((itemNum || 0) * 60, 0));
//         }
//     }

//     // player後退隱藏
//     public backHide(): void {
//         const BACK_MOVE_TIME = 0.5;
//         const BACK_MOVE_OFFSET = v3(0, -20, 0);
//         if (this.m_charRoot3D == null || this.m_isUsing == false || this.m_charRoot3dPos == null) {
//             return;
//         }
//         this.m_charRoot3D.runAction(moveBy(BACK_MOVE_TIME, BACK_MOVE_OFFSET));
//     }

//     // player前進出場
//     public forwordShow(): void {
//         const BACK_MOVE_TIME = 0.5;
//         if (this.m_charRoot3D == null || this.m_isUsing == false || this.m_charRoot3dPos == null) {
//             return;
//         }
//         this.m_charRoot3D.runAction(moveTo(BACK_MOVE_TIME, this.m_charRoot3dPos));
//     }
// }

// Dinosaur.Player = Player;
