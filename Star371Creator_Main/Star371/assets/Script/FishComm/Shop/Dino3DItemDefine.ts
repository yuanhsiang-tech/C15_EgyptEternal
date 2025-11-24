export const CardType = {
    Lock: 1,
    Speed: 2,
    Freeze: 3,
}
// 道具設定
export const CardDefine = {
    [CardType.Lock]: {
        Name: "Card_Lock",
        ItemId: 20003,
        ItemIdBind: 20004,
        UseDuration: 12,
        UseCD: 12,
        ShopItemID: 3002,
        ShopItemID_Crystal: 3010,
        UsingSound: "sound/S_24.mp3",
        Img: "Img/Scene/Skill_02.png",
    },
    [CardType.Speed]: {
        Name: "Card_Speed",
        ItemId: 20001,
        ItemIdBind: 20002,
        UseDuration: 12,
        UseCD: 12,
        ShopItemID: 3001,
        ShopItemID_Crystal: 3009,
        UsingSound: "sound/S_24.mp3",
        Img: "Img/Scene/Skill_01.png",
    },
    [CardType.Freeze]: {
        Name: "Card_Freeze",
        ItemId: 20005,
        ItemIdBind: 20006,
        UseDuration: 12,
        UseCD: 12,
        ShopItemID: 3003,
        ShopItemID_Crystal: 3011,
        UsingSound: "sound/S_24.mp3",
        Img: "Img/Scene/Skill_03.png",
    },
}

export const DantouType = {
    WarHead         : 1,
    WarHead_High    : 2,
    WarHead_Super   : 3,
}

export const DantouDefine = {
    [DantouType.WarHead] : {
        Name : "WarHead",
        ItemId : 10101,
        ItemIdBind : 10102,
        UseCD : 0.5,
        UsingSound : "sound/S_24.mp3",
        MaxOdds : 10,
        Img : "Img/Scene/SkillBomb_01.png",
        MoneyConvertImg : "Img/Effect/FX_Reward/DanTou01.png",
    },
    [DantouType.WarHead_High] : {
        Name : "WarHead_High",
        ItemId : 10103,
        ItemIdBind : 10104,
        UseCD : 0.5,
        UsingSound : "sound/S_24.mp3",
        MaxOdds : 20,
        Img : "Img/Scene/SkillBomb_02.png",
        MoneyConvertImg : "Img/Effect/FX_Reward/DanTou_02.png",
    },
    [DantouType.WarHead_Super] : {
        Name : "WarHead_Super",
        ItemId : 10105,
        ItemIdBind : 10106,
        UseCD : 0.5,
        UsingSound : "sound/S_24.mp3",
        MaxOdds : 30,
        Img : "Img/Scene/SkillBomb_03.png",
        MoneyConvertImg : "Img/Effect/FX_Reward/DanTou_03.png",
    },
}


// 商店品項設定
export const ShopItemDefine = {
    [3001]: {
        ShopItemID: 3001,
        ItemID: 20002, //加速卡
        Count: 60,
        Price: 12000,
        CurrencyType: 1,
        SalePrice: 0,
        SortWeight: 302,
    },
    [3002]: {
        ShopItemID: 3002,
        ItemID: 20004, //鎖定卡
        Count: 60,
        Price: 12000,
        CurrencyType: 1,
        SalePrice: 0,
        SortWeight: 301,
    },
    [3003]: {
        ShopItemID: 3003,
        ItemID: 20006, //冰凍卡
        Count: 60,
        Price: 12000,
        CurrencyType: 1,
        SalePrice: 0,
        SortWeight: 303,
    },
    [3005]: {
        ShopItemID: 3005,
        ItemID: 20001, //加速卡
        Count: 60,
        Price: 120,
        CurrencyType: 2,
        SalePrice: 0,
        SortWeight: 305,
    },
    [3006]: {
        ShopItemID: 3006,
        ItemID: 20003, //鎖定卡
        Count: 60,
        Price: 120,
        CurrencyType: 2,
        SalePrice: 0,
        SortWeight: 304,
    },
    [3007]: {
        ShopItemID: 3007,
        ItemID: 20005, //冰凍卡
        Count: 60,
        Price: 120,
        CurrencyType: 2,
        SalePrice: 0,
        SortWeight: 306,
    },
    
}

export const ShopItemDefine_CYRSTAL =
{
    [3009]: {
        ShopItemID: 3009,
        ItemID: 20001, //加速卡
        Count: 60,
        Price: 120000,
        CurrencyType: 70,
        SalePrice: 0,
        SortWeight: 308,
    },
    [3010]: {
        ShopItemID: 3010,
        ItemID: 20003, //鎖定卡
        Count: 60,
        Price: 120000,
        CurrencyType: 70,
        SalePrice: 0,
        SortWeight: 307,
    },
    [3011]: {
        ShopItemID: 3011,
        ItemID: 20005, //冰凍卡
        Count: 60,
        Price: 120000,
        CurrencyType: 70,
        SalePrice: 0,
        SortWeight: 309,
    },
}


