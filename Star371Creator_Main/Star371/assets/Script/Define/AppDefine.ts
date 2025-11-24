enum Environment {
    /** 內部環境 */
    INTERNAL,
    /** 二測環境 */
    EXTERNAL_TEST,
    /** 正式環境 */
    EXTERNAL,
    /** 送審環境 */
    APPLE_TEST,
};

namespace AppDefine {
    // 當前環境
    export const EnvType                                        = Environment.INTERNAL;

    // 當前版本
    export const Version: string                                = "99.99.99"

    // 編版設定
    export namespace Build {
        // 是否啟用 Debug 編譯
        export const Debug: boolean                             = true;

        export namespace iOS {
            export const Version: string                        = "1.0.0"
            export const Build: string                          = "1.0"
        }

        export namespace Android {
            export const VersionName: string                    = iOS.Version
            export const VersionCode: number                    = 1
        }
    }
}











































































(globalThis as any).Environment = Environment;
(globalThis as any).AppDefine = AppDefine;
export {}