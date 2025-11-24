import { MechanismType } from './MechanismDefine';

const MT = MechanismType;

export enum TopBarMode {
    LOBBY,
    SUB_LOBBY,
    GAME
}

export namespace TopBarModeDefine {
    export const LOBBY:MechanismType[] = [
        MT.PROFILE,
        MT.VIP,
        MT.PROPERTY,
        MT.STORE,
        MT.WUSHI,
        MT.SHINY_CARD,
        MT.CHAT,
        MT.WELFARE,
        MT.NEWS,
        MT.MORE
    ];

    export const SUB_LOBBY:MechanismType[] = [
        MT.BACK,
        MT.PROFILE,
        MT.VIP,
        MT.PROPERTY,
        MT.STORE,
        MT.WUSHI,
        MT.SHINY_CARD,
        MT.CHAT,
        MT.WELFARE,
        MT.MORE
    ]

    export const GAME:MechanismType[] = [
        MT.PROFILE,
        MT.VIP,
        MT.PROPERTY,
        MT.STORE,
        MT.GIFT_PACK,
        MT.MISSION,
        MT.RANKING,
        MT.SYSTEM
    ];
}