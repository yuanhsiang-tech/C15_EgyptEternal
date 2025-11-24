import { native, Node, size, Size, sys } from 'cc';
import { EDITOR, NATIVE } from 'cc/env';

/**
 * 呼叫資訊類別
 */
class CallInfo {
    public static Create() {  return new CallInfo(); }

    /**
     * iOS 裝置上執行的方法參數
     * @param className Object-C 的 interface(class) 名稱，例如：Device
     * @param methodName Object-C 的 method 名稱，例如：GetRadioAccessType
     * 注意：如果 method 沒有參數則結尾不需要加上冒號(:)，如果有參數則需要加上冒號(:)
     * 範例：
     *     iOS("Device", "GetRadioAccessType") // 沒有參數
     *     iOS("Device", "ChangeOrientation:") // 有參數
     */
    public iOS(className: string, methodName: string): CallInfo {
        this.m_iOS = NATIVE ? native.reflection.callStaticMethod.bind(native.reflection, className, methodName) : null;
        return this;
    }

    /**
     * Android 裝置上執行的方法參數
     * @param className java 方法所在的 package 完整名稱，例如：com.igs.Device
     * @param methodName java 方法名稱
     * @param methodSignature java 方法的 JNI signature，例如：()Ljava/lang/String;
     * 備註：可使用下方 ⬇️ JavaMethodSignature ⬇️ 來建立 signature
     * 說明：JNI signature 可參考網址 https://docs.oracle.com/javase/8/docs/technotes/guides/jni/spec/types.html
     */
    public Android(className: string, methodName: string, methodSignature: string): CallInfo {
        this.m_android = NATIVE ? native.reflection.callStaticMethod.bind(native.reflection, className, methodName, methodSignature) : null;
        return this;
    }

    /**
     * 網頁版執行的方法
     */
    public Web(webFunc:Function): CallInfo {
        this.m_web = webFunc;
        return this;
    }

    /**
     * 預設執行的方法
     * @param func 如果沒有對應平台的方法，則會執行這個方法
     */
    public Fallback(func:Function): CallInfo {
        this.m_fallback = func;
        return this;
    }

    /**
     * 創建最終的呼叫方法
     */
    public Build(postProcess?:Function) {
        return function() {
            if (!NATIVE) {
                this.m_function = this.m_web;
            } else if (sys.os == sys.OS.IOS) {
                this.m_function = this.m_iOS;
            } else if (sys.os == sys.OS.ANDROID) {
                this.m_function = this.m_android;
            }

            if (!this.m_function) {
                // [找不到對應平台要執行的方法] => 改使用預設方法
                this.m_function = this.m_fallback;
            }
            
            const result = this.m_function?.apply(null, arguments);
            if (!postProcess) {
                return result;
            } else {
                return postProcess(result, sys.platform);
            }
        }.bind(this);
    }

    private constructor(
        private m_iOS?: Function,
        private m_android?: Function,
        private m_web?: Function,
        private m_fallback?: Function,
        private m_function?: Function
    ) {}
}

/**
 * Java 方法簽名
 */
namespace JavaMethodSignature {
    type Type = PrimitiveType | string;

    /**
     * JNI 基礎型別
     */
    export enum PrimitiveType {
        Void    = "V",
        Boolean = "Z",
        Byte    = "B",
        Char    = "C",
        Short   = "S",
        Int     = "I",
        Long    = "J",
        Float   = "F",
        Double  = "D",
        String  = "Ljava/lang/String;",
        Object  = "Ljava/lang/Object;",
    }

    /**
     * 常用的 JNI 方法簽名
     */
    export namespace Common {
        /**
         * 沒有參數，沒有回傳
         * 相當於：void methodName()
         * @returns "()V"
         */
        export const EMPTY_ARGS_NO_RETURN: string       = Build(PrimitiveType.Void);
        /**
         * 沒有參數，回傳 String
         * 相當於：String methodName()
         * @returns "()Ljava/lang/String;"
         */
        export const EMPTY_ARGS_STRING_RETURN: string   = Build(PrimitiveType.String);
        /**
         * 一個 String 參數，沒有回傳
         * 相當於：Boolean methodName(String arg1)
         * @returns "(Ljava/lang/String;)V"
         */
        export const STRING_ARG_NO_RETURN: string       = Build(PrimitiveType.Void, PrimitiveType.String);
        /**
         * 一個 String 參數，回傳 Boolean
         * 相當於：Boolean methodName(String arg1)
         * @returns "(Ljava/lang/String;)Z"
         */
        export const STRING_ARG_BOOLEAN_RETURN: string  = Build(PrimitiveType.Boolean, PrimitiveType.String);
        /**
         * 一個 String 參數，回傳 float
         * 相當於：float methodName(String arg1)
         * @returns "(Ljava/lang/String;)F"
         */
        export const STRING_ARG_FLOAT_RETURN: string    = Build(PrimitiveType.Float, PrimitiveType.String);
        /**
         * 一個 String 參數，回傳 String
         * 相當於：String methodName(String arg1)
         * @returns "(Ljava/lang/String;)Ljava/lang/String;"
         */
        export const STRING_ARG_STRING_RETURN: string   = Build(PrimitiveType.String, PrimitiveType.String);
        /**
         * 一個 int 參數，沒有回傳
         * 相當於：void methodName(int arg1)
         * @returns "(I)V"
         */
        export const INT_ARG_NO_RETURN: string          = Build(PrimitiveType.Void, PrimitiveType.Int);
    }

    /**
     * 建立 JNI 方法簽名
     * @param returnType 方法的返回型別
     * @param args 方法的依序參數型別
     */
    export function Build(returnType?:Type, ...args:Type[]): string {
        return !Array.isArray(args) ? "()" : `(${args.join("")})` + (!!returnType ? returnType : PrimitiveType.Void);
    }
}

/**
 * class 名稱
 */
namespace Class {
    export namespace Device {
        export const iOS: string            = "Device";
        export const Android: string        = "com/igs/Device";
    }

    export namespace App {
        export const iOS: string            = "ViewController";
        export const Android: string        = "com/cocos/game/AppActivity";
    }
}

export namespace Method {
    export namespace App {
        /**
         * 通知 C++ 層 TS 啟動完成
         */
        export const CreatorFinishLaunching:()=>void = CallInfo.Create()
            .iOS(Class.App.iOS, "CreatorFinishLaunching")
            .Android(Class.App.Android, "CreatorFinishLaunching", JavaMethodSignature.Common.EMPTY_ARGS_NO_RETURN)
            .Build();

        /**
         * 取得 App 版本號
         */
        export const GetAppVersion:()=>string = CallInfo.Create()
            .iOS(Class.App.iOS, "GetAppVersion")
            .Android(Class.App.Android, "GetAppVersion", JavaMethodSignature.Common.EMPTY_ARGS_STRING_RETURN)
            .Build();

        /**
         * 取得 App Build 號
         */
        export const GetAppBuild:()=>string = CallInfo.Create()
            .iOS(Class.App.iOS, "GetAppBuild")
            .Android(Class.App.Android, "GetAppBuild", JavaMethodSignature.Common.EMPTY_ARGS_STRING_RETURN)
            .Build();

        /**
         * 取得 App Bundle ID
         */
        export const GetBundleId:()=>string = CallInfo.Create()
            .iOS(Class.App.iOS, "GetBundleId")
            .Android(Class.App.Android, "GetBundleId", JavaMethodSignature.Common.EMPTY_ARGS_STRING_RETURN)
            .Build();
    }
}
export namespace Method {
    export namespace Device {
        /**
         * 取得 Android ID
         */
        export const GetAndroidId:()=>string = CallInfo.Create()
            .Android(Class.Device.Android, "GetAndroidId", JavaMethodSignature.Common.EMPTY_ARGS_STRING_RETURN)
            .Build();

        /**
         * 取得網路連線類型
         */
        export const GetRadioAccessType:()=>string = CallInfo.Create()
            .iOS(Class.Device.iOS, "GetRadioAccessType")
            .Android(Class.Device.Android, "GetRadioAccessType", JavaMethodSignature.Common.EMPTY_ARGS_STRING_RETURN)
            .Build();

        /**
         * 取得電信商名稱
         */
        export const GetMobileCarrier:()=>string = CallInfo.Create()
            .iOS(Class.Device.iOS, "GetMobileCarrier")
            .Android(Class.Device.Android, "GetMobileCarrier", JavaMethodSignature.Common.EMPTY_ARGS_STRING_RETURN)
            .Build();

        /**
         * 取得裝置設定的國家代碼
         */
        export const GetCountryCode:()=>string = CallInfo.Create()
            .iOS(Class.Device.iOS, "GetCountryCode")
            .Android(Class.Device.Android, "GetCountryCode", JavaMethodSignature.Common.EMPTY_ARGS_STRING_RETURN)
            .Build();

        /**
         * 改變裝置方向
         * @param orientation 裝置方向
         */
        export const ChangeOrientation:(orientation:number)=>boolean = CallInfo.Create()
            .iOS(Class.Device.iOS, "ChangeOrientation:")
            .Android(Class.Device.Android, "ChangeOrientation", JavaMethodSignature.Common.INT_ARG_NO_RETURN)
            .Build();

        /**
         * 取得螢幕尺寸
         */
        export const GetScreenSize:()=>Size = CallInfo.Create()
            .Android(Class.Device.Android, "GetScreenSize", JavaMethodSignature.Common.EMPTY_ARGS_STRING_RETURN)
            .Build((sizeString:string):Size=>{
                if (typeof sizeString == "string" && sizeString.trim() != "") {
                    const sizeObj:Size = JSON.parse(sizeString.trim());
                    const tmpWidth:number = sizeObj.width;
                    const tmpHeight:number = sizeObj.height;
                    if (!isNaN(tmpWidth) && !isNaN(tmpHeight) && tmpWidth > 0 && tmpHeight > 0) {
                        return size(tmpWidth, tmpHeight);
                    }
                }
                return null;
            });
    }
}