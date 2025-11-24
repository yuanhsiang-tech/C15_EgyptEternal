import { _decorator, Game, game, log, SpriteFrame } from 'cc'
import { EDITOR } from 'cc/env'
import { EventDefine } from '../Define/EventDefine'
import { MechanismType } from '../Define/MechanismDefine'
import { EventDispatcher } from '../../Stark/Utility/EventDispatcher'
import { ViewDefine } from '../Define/ViewDefine'
import { ViewManager } from '../ViewManage/ViewManager'
import { UIButtonItem } from './UIButtonItem'
import { YuruyiData, YuruyiMessageType } from '../NotifacationSystem/YuruyiDefine'
import { NotificationSystem } from '../NotifacationSystem/NotificationSystem'
import { Bundle } from '../Bundle/Bundle'
import { Resource } from '../Define/ResourceDefine'

function OnItemClicked(item: UIButtonItem) {
    let event:IViewEvent;
    let args:any[] = [];

    switch (item.Id) {
        case MechanismType.VIP: {
            // [VIP]
            Bundle.Resources.Load(Resource.Img.Activity.GOLDEN_POINT, SpriteFrame, (err: Error, spriteFrame: SpriteFrame, isCached?: boolean) => {
                if (err) {
                    log(`[UICentral] 載入圖片失敗: ${Resource.Img.Activity.GOLDEN_POINT}, 錯誤: ${err.message}`)
                    return
                }
                let yuruyiData: YuruyiData = {
                    type: YuruyiMessageType.SHINY_CARD,
                    message: isCached ? '已緩存' : '未緩存',
                }
                NotificationSystem.PushYuruyi(yuruyiData)
            })
            break;
        }
        case MechanismType.PROFILE: {
            // [玩家資料]
            break;
        }
        case MechanismType.STORE: {
            // [商城]
            break;
        }
        case MechanismType.WUSHI: {
            // [倉庫]
            break;
        }
        case MechanismType.SHINY_CARD: {
            // [閃耀卡]
            event = ViewDefine.GOD_SEND;
            break;
        }
        case MechanismType.CHAT: {
            // [聊天]
            break;
        }
        case MechanismType.WELFARE: {
            // [福利]
            break;
        }
        case MechanismType.NEWS: {
            // [新聞]
            break;
        }
        case MechanismType.MORE: {
            // [更多]
            event = ViewDefine.MORE_SETTING;
            break;
        }
        case MechanismType.BULLETIN: {
            // [公告任務]
            break;
        }
        case MechanismType.FREE_BONUS: {
            event = ViewDefine.FREE_MECHANISM;
            break;
        }
        case MechanismType.STAR_FARM: {
            // [名星農場]
            break;
        }
        case MechanismType.BATTLE_PASS: {
            // [通行證]
            event = ViewDefine.GOD_SEND;
            break;
        }
        case MechanismType.SCRATCH: {
            // [刮刮樂]
            break;
        }
        case MechanismType.DIAMOND_STORE: {
            // [鑽石商城]
            break;
        }
        case MechanismType.STAR_STAGE: {
            // [明星角色]
            event = ViewDefine.TAB_VIEW_STORE_EXCHANGE_STAR_WELFARE;
            args.push(ViewDefine.STAR_STAGE);
            break;
        }
        case MechanismType.BACK_PACK: {
            // [道具/背包]
            break;
        }
        case MechanismType.MAIL: {
            // [郵件]
            break;
        }
        case MechanismType.HELP: {
            // [幫助]
            break;
        }
        case MechanismType.REPORT: {
            // [回報]
            break;
        }
        case MechanismType.SETTING: {
            // [設定]
            break;
        }
        case MechanismType.AD: {
            // [廣告]
            break;
        }
        case MechanismType.GOLDEN_PIG: {
            // [黃金豬]
            event = ViewDefine.GOLDEN_PIG;
            break;
        }
        case MechanismType.AMUSEMENT_PARK: {
            // [明星遊樂園]
            break;
        }
        case MechanismType.MONEY_RAIN: {
            // [紅包雨]
            break;
        }
        case MechanismType.SLOT_FARM: {
            // [明星農場]
            break;
        }
        case MechanismType.STAR_CHEF: {
            // [明星大廚]
            break;
        }
        case MechanismType.MONDAY_ORGY: {
            event = ViewDefine.MONDAY_ORGY;
            // [寶箱派對]
            break;
        }
        case MechanismType.COOPERATION: {
            // [合作機制]
            break;
        }
        case MechanismType.GOLD_POINT: {
            // [嘉年華商城]
            break;
        }
        case MechanismType.DAILY_SIGN_IN: {
            // [每日簽到]
            break;
        }
        case MechanismType.GIFT_PACK: {
            // [禮包]
            break;
        }
    }

    event && ViewManager.Open.call(null, event, ...args);
}

























































!EDITOR && game.once(Game.EVENT_GAME_INITED, ()=>EventDispatcher.Shared.On(EventDefine.System.UI_ITEM_EVENT_CLICKED, OnItemClicked, {}))