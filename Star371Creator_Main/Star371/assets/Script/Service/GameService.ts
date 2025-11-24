import { log } from "cc";
import { GameId } from "../Define/GameDefine";
import { Command } from "../Net/Command/Command";
import { ServiceInstance } from "./Foundation/Service";
import { ProtoService } from "./Foundation/ProtoService";
import { ThemeType } from "../Proto/gt2/basicTypes/basicTypes_pb";
import { MicroServiceProtocol, FriendAttr } from "../Net/Service/MicroService";
import { JoinGameAck, LeaveGameAck } from "../Proto/service/appLife/appLife_pb";
import { UserJoinGameReason, UserJoinGameResult, UserLeaveGameResult } from "../Proto/gt2/game/game_pb";
import { JsonService } from "./Foundation/JsonService";

export interface GameServiceProtocol extends MicroServiceProtocol {
   SendJoinGame(themeName: string, gameId: GameId, themeType: ThemeType, joinType: UserJoinGameReason, checkVersion: number): boolean;
   SendLeaveGame(gameId: GameId, themeId: number): boolean;
}

export interface GameServiceCallback {
   OnGameJoined(): void;
   OnGameJoinFailed(reason: UserJoinGameResult): void;
   OnGameLeft(reason: UserLeaveGameResult): void;
   OnGameExpel(reason: UserLeaveGameResult): void;
   OnGameNotifiedLeave(reason: UserLeaveGameResult): void;
   OnCommand(command: GameService.TypeCommand): void;
}

export interface IGameService {
   readonly CheckVersion: number;
   readonly GameId: GameId;
   readonly JoinType: UserJoinGameReason;
   readonly ThemeId: number;
   readonly ThemeName: string;
   readonly ThemeType: ThemeType;
   readonly IsWaitJoining: boolean;

   SendCommand(type:number, content?:Command.Content): boolean;
   Prepare(themeName: string, themeType?: ThemeType, joinType?: UserJoinGameReason, checkVersion?: number);
   Join(): boolean;
   Leave(): void;
   IsJoined(): boolean;
   IsLeft(): boolean;
   SetCallback(impl: Partial<GameServiceCallback>): IGameService;
}

export namespace GameService {
    export type TypeCommand = Command.JsonCommand;
}

@ServiceInstance
export class GameService extends ProtoService implements IGameService {
    public static readonly Instance: IGameService;
 
    private m_themeName: string;
    private m_joinType: UserJoinGameReason;
    private m_themeType: ThemeType;
    private m_checkVersion: number;
    private m_joinAck: JoinGameAck;
    private m_leaveAck: LeaveGameAck;
    private m_waiting: boolean;
    private m_impl: Partial<GameServiceCallback>;
    private m_delegator: GameServiceProtocol;
 
    public get ThemeName(): string { return this.m_themeName; }
    public get GameId(): GameId { return this.m_type; }
    public get JoinType(): UserJoinGameReason { return this.m_joinType; }
    public get ThemeType(): ThemeType { return this.m_themeType; }
    public get CheckVersion(): number { return this.m_checkVersion; }
    public get ThemeId(): number { return this.m_joinAck ? this.m_joinAck.themeId : -1; }
    public get IsWaitJoining(): boolean { return this.m_waiting; }
 
    protected constructor(type: number, delegate: Partial<GameServiceProtocol>) {
        super(type, delegate);
        this.m_delegator = this.m_sharedDelegate as GameServiceProtocol;
    }
 
    protected override Start() {
        super.Start();
        this.m_waiting = false;
        this.m_themeName = "";
    }

    protected override OnCommand(command: GameService.TypeCommand) {
        this.m_impl?.OnCommand?.(command);
    }
 
    public SetCallback(impl: Partial<GameServiceCallback>): IGameService {
        this.m_impl = impl;
        return this;
    }
 
    public IsJoined(): boolean {
        return !this.m_waiting && !this.IsLeft() && this.m_joinAck?.result == UserJoinGameResult.USER_JOIN_GAME_SUCCESS;
    }
 
    public IsLeft(): boolean {
        return !this.m_waiting && this.m_leaveAck?.result == UserLeaveGameResult.LEAVE_GAME_SUCCESS;
    }
 
    public Prepare(themeName: string, themeType?: ThemeType, joinType?: UserJoinGameReason, checkVersion?: number) {
        this.m_themeName = themeName.trim();
        this.m_themeType = typeof themeType == "number" ? themeType : typeof this.m_themeType == "number" ? this.m_themeType : ThemeType.NORMAL;
        this.m_joinType = typeof joinType == "number" ? joinType : typeof this.m_joinType == "number" ? this.m_joinType : UserJoinGameReason.DEFAULT;
        this.m_checkVersion = typeof checkVersion == "number" ? checkVersion : typeof this.m_checkVersion == "number" ? this.m_checkVersion : 0;
    }
 
    public Join(): boolean {
        let isSuccess: boolean = false;
        
        if (this.m_waiting) {
            log(`GameService.Join fail: Game(${this.m_type}) cannot join game while waiting join result.`);
        } else if (this.IsJoined()) {
            log(`GameService.Join fail: Game(${this.m_type}) cannot join game again.`);
        } else {
            this.m_waiting = true;
            isSuccess = this.m_delegator.SendJoinGame(this.m_themeName, this.m_type, this.m_themeType, this.m_joinType, this.m_checkVersion);
        }
       
        return isSuccess;
    }
 
    public Leave(): boolean {
        return this.m_delegator.SendLeaveGame(this.m_joinAck.gameId, this.m_joinAck.themeId);
    }
    
    @FriendAttr
    protected NotifyLeave(reason: UserLeaveGameResult) {
        this.m_impl && this.m_impl?.OnGameNotifiedLeave(reason);
    }
    
    @FriendAttr
    protected OnJoined(result: JoinGameAck, url?: string): boolean {
        const isSuccess: boolean = result.result == UserJoinGameResult.USER_JOIN_GAME_SUCCESS;
        this.m_joinAck = result;
        this.m_waiting = false;
        
        if (!isSuccess) {
           this.m_impl && this.m_impl?.OnGameJoinFailed(result.result);
        } else {
           this.Connect(url);
           this.m_themeName = result.themeName;
           this.m_impl && this.m_impl?.OnGameJoined();
        }
       
        return isSuccess;
    }
    
    @FriendAttr
    protected OnLeft(result: LeaveGameAck): boolean {
        this.m_leaveAck = result;
        this.m_impl && this.m_impl?.OnGameLeft(result.result);
        return result.result == UserLeaveGameResult.LEAVE_GAME_SUCCESS;
    }
    
    @FriendAttr
    protected OnExpel(reason: UserLeaveGameResult) {
        this.m_impl && this.m_impl?.OnGameExpel(reason);
    }
}


globalThis.GameService = GameService;