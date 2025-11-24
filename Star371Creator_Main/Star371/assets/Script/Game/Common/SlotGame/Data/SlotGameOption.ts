import { Vec3, Node } from "cc";
import { IGameOption } from "../../Interface/IGameOption";

export interface SlotGameOption extends IGameOption
{
    /** 是否停用 GameBar */
    readonly DisableGameBar?: boolean;

    /** 掛載 GameBar 的根節點 */
    readonly GameBarRootNode?: Node;

    /** 停用精簡贏分效果 */
    readonly DisableLiteWin?: boolean;

    /** 是否停用 ProclaimButton */
    readonly DisableScreenDialogButton?: boolean;

    /**
     * 是否使用客製化GameBar Prefab 
     * 
     * 若要使用則在遊戲的資料夾下新增一個名為GameBar的資料夾，並放入客製化的GameBar.prefab
     */
    readonly CustomGameBar?: boolean;

    /**
     * 指定載入 PayTable 資源的資料夾
     * - 預設放在各個語系目錄( `Locale/en/` , `Locale/tw/`, ... )下的 `Img/Paytable`
     * - ex: `Locale/en/Img/Paytable`, `Locale/tw/Img/Paytable`, ...
     */
    readonly PayTableResDir?: string;

}
