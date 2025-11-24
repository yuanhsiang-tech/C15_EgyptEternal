import { warn } from "cc";

//================================================================================================
/**
 * BET 相關工具
 */
//================================================================================================

export namespace BetUtils
{
    //----------------------------------------------------------------
    /**
     * 排序押注列表，由小到大，並移除無效與重複值
     */
    export function SortBetList(betList: number[]): number[]
    {
        if (!(betList?.length > 0)) {
            return betList ?? [];
        }

        const sortedList = betList
            .filter((bet, index) => (bet > 0 && betList.indexOf(bet) === index))
            .sort((a, b) => (a - b));

        return sortedList;
    }

    //----------------------------------------------------------------
    /**
     * 搜尋最接近的押注值 (無條件進階)
     * @param targetBet 目標押注值
     * @param betList   押注列表，必須為遞增排序
     */
    export function SearchRoundUp(targetBet: number, betList: number[]): number
    {
        const betCount = betList?.length ?? 0;
        if (betCount <= 0) {
            warn(`[BetUtils.SearchRoundUp] betList is empty.`, betList);
            return targetBet;
        }

        let searchIdx = -1;
        for (let i = 0; i < betCount; i++) {
            if (betList[i] >= targetBet) {
                searchIdx = i;
                break;
            }
        }

        if (searchIdx < 0) {
            searchIdx = betCount - 1;
        }

        return betList[ searchIdx ] ?? targetBet;
    }

    //----------------------------------------------------------------
    /**
     * 搜尋最接近的押注值 (無條件降階)
     * @param targetBet 目標押注值
     * @param betList   押注列表，必須為遞增排序
     */
    export function SearchRoundDown(targetBet: number, betList: number[]): number
    {
        const betCount = betList?.length ?? 0;
        if (betCount <= 0) {
            warn(`[BetUtils.SearchRoundDown] betList is empty.`, betList);
            return targetBet;
        }

        let searchIdx = -1;
        for (let i = 0; i < betCount; i++) {
            if (betList[i] > targetBet) {
                break;
            }
            searchIdx = i;
        }

        if (searchIdx < 0) {
            searchIdx = 0;
        }

        return betList[ searchIdx ] ?? targetBet;
    }

    //----------------------------------------------------------------

}
