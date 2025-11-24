import { LoginVendor } from "../SignIn/LoginVendor";

export namespace StorageKeys {
    //================================================================================================
    /** 登入帳密 */
    //------------------------------------------------------------------------------------------------
    export namespace LoginVendor {
        export const ACCOUNT_GT                                 = "LoginVendor.Account_GT";
        export const PASSWORD_GT                                = "LoginVendor.Password_GT";
    }

    //================================================================================================
    /** 音樂音效 */
    //------------------------------------------------------------------------------------------------
    export namespace Audio
    {
        /** 音效: 全域背景音量 */
        export const GLOBAL_BGM_VOLUME                          = "audio.global_bgm_volume";

        /** 音效: 全域音效音量 */
        export const GLOBAL_SFX_VOLUME                          = "audio.global_sfx_volume";
    }
}