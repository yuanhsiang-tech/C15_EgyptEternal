import { IGameStatus } from "./IGameStatus";
import { ISlotGameChief } from "./ISlotGameChief";

//================================================================

let _chief_slotGame: ISlotGameChief;
let _game_status: IGameStatus;

//================================================================

export namespace GamesChiefProxy
{
    export namespace SlotGame
    {
        export function Assign( chief: ISlotGameChief )
        {
            _chief_slotGame = chief;
        }

        export function Resign( chief: ISlotGameChief )
        {
            if (_chief_slotGame === chief) {
                _chief_slotGame = null;
            }
        }
    }
}

//----------------------------------------------------------------

export namespace GamesChiefProxy
{
    export namespace Status
    {
        export function Assign( status: IGameStatus )
        {
            _game_status = status;
        }

        export function Resign( status: IGameStatus )
        {
            if (_game_status === status) {
                _game_status = null;
            }
        }
    }
}

//================================================================

class GamesChief
{
    public static get SlotGame(): ISlotGameChief {
        return _chief_slotGame;
    }
}

namespace GamesChief
{
    export class Status
    {
        /** 遊戲是否在最低押注 */
        public static get AtMinimumBet(): boolean {
            return _game_status?.GameAtMinimumBet?.() ?? false;
        }

        /** 遊戲是否在最高押注 */
        public static get AtMaximumBet(): boolean {
            return _game_status?.GameAtMaximumBet?.() ?? false;
        }

        /** 遊戲當前押注 */
        public static get CurrentBet(): number {
            return _game_status?.GameCurrentBet?.() ?? null;
        }

        /** 遊戲是否在自動玩 */
        public static get AutoSpinning(): boolean {
            return _game_status?.GameAutoSpinning?.() ?? false;
        }

        /** 遊戲是否在特色遊戲中 */
        public static get IsInFeature(): boolean {
            return _game_status?.GameIsInFeature?.() ?? false;
        }

        /** 回傳遊戲是否在Turbo模式中 */
        public static get IsTurboMode(): boolean {
            return _game_status?.GameIsTurboMode?.() ?? false;
        }

        /** 遊戲的 JpRolling 資料儲存前綴 */
        public static get JpRollingRecordKeyPrefix(): string {
            return _game_status?.GameJpRollingRecordKeyPrefix?.() ?? null;
        }

        /** 遊戲押注表是否更新 */
        public static get IsBetListUpdated(): boolean {
            return _game_status?.GameIsBetListUpdated?.() ?? false;
        }

        /** 重置遊戲押注表是否更新狀態 */
        public static ResetBetListUpdated(): void {
            _game_status?.GameResetBetListUpdated?.();
        }

        /** 是否為 Quest Game 廳館*/
        public static get IsQuestGameTheme(): boolean {
            return _game_status?.IsQuestGameTheme ?? false;
        }
    }
}

window["GamesChief"] = GamesChief;

//================================================================
