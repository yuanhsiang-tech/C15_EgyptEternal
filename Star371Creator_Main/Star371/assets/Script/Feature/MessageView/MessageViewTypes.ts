/**
 * 簡化版 MessageViewTypes
 */
export class MVT {
    /**
     * 取得設定物件
     */
    public static get Config(): MessageViewTypes.Config {
        return MessageViewTypes.Config.New;
    }
}

export namespace MessageViewTypes {
    /**
     * 按鈕類型
     */
    export enum Action {
        POSITIVE,
        NEGATIVE
    }

    /**
     * 按鈕樣式
     */
    export enum Style {
        CONFIRM_CANCEL,
        YES_NO,
        OK_NO
    }

    /**
     * 按鈕設定
     */
    export class Button {
        constructor(
            public Handler:()=>void=null,
            public CountDown:number=0,
            public CountHandler:(countDown:number)=>void=null,
            public Title:string=null) {}
    }

    export class Config {
        private static s_pool:Config[] = [];
        public static get New(): Config { return this.s_pool.pop() || new Config(); }

        private ActionMap:Map<Action, Button>;
        private Style:Style;
        private NavigateRevearse:boolean

        private constructor() {
            this.ActionMap = new Map();
            this.Style = Style.CONFIRM_CANCEL;
            this.NavigateRevearse = false;
        }

        /**
         * 按鈕使用 Yes-No 樣式
         */
        public UseStyleYesNo(): Config {
            this.Style = Style.YES_NO;
            return this;
        }

        /**
         * 按鈕使用 Ok-No 樣式
         */
        public UseStyleOkNo(): Config {
            this.Style = Style.OK_NO;
            return this;
        }

        /**
         * 設定正向(確認、是)按鈕
         * @param handler 回呼函式
         * @param title 按鈕文字
         */
        public ActionPositive(handler?:()=>void, title?:string): Config {
            return this.AddAction(Action.POSITIVE, handler, 0, null, title);
        }

        /**
         * 設定正向(確認、是)按鈕，並加入倒數計時
         * @param handler 回呼函式
         * @param countDown 倒數秒數
         * @param countDownHandler 倒數回呼函式
         * @param title 按鈕文字
         */
        public ActionPositiveCountDown(handler?:()=>void, countDown:number=0, countHandler?:(countDown:number)=>void, title?:string): Config {
            return this.AddAction(Action.POSITIVE, handler, countDown, countHandler, title);
        }

        /**
         * 設定負向(取消、否)按鈕
         * @param handler 回呼函式
         * @param title 按鈕文字
         */
        public ActionNegative(handler?:()=>void, title?:string): Config {
            return this.AddAction(Action.NEGATIVE, handler, 0, null, title);
        }

        /**
         * 設定負向(取消、否)按鈕，並加入倒數計時
         * @param handler 回呼函式
         * @param countDown 倒數秒數
         * @param countDownHandler 倒數回呼函式
         * @param title 按鈕文字
         */
        public ActionNegativeCountDown(handler?:()=>void, countDown:number=0, countHandler?:(countDown:number)=>void, title?:string): Config {
            return this.AddAction(Action.NEGATIVE, handler, countDown, countHandler, title);
        }

        /**
         * 當觸發 Android 返回按鈕時改執行 Yes/Confirm 的選項
         * 備註：預設是執行 No/Cancel 的選項
         */
        public RevearseNavigateBack(): Config {
            return this.ActionNegative(()=>{});
        }

        /**
         * 釋放設定
         * 備註：此方法於別處會被呼叫，請勿刪除
         */
        private Dispose() {
            this.ActionMap.clear();
            this.Style = Style.CONFIRM_CANCEL;
            this.NavigateRevearse = false;
            Config.s_pool.push(this);
        }

        /**
         * 加入按鈕設定
         * @param action 按鈕類型
         * @param handler 回呼函式
         * @param countDown 倒數秒數
         * @param countHandler 倒數回呼方法
         * @param title 按鈕文字
         */
        private AddAction(action:Action, handler:()=>void, countDown:number, countHandler:(countDown:number)=>void, title:string): Config {
            this.ActionMap.set(action, new Button(handler, countDown, countHandler, title));
            return this;
        }
    }
}