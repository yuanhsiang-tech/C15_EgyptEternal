import { DEV, NATIVE } from "cc/env";
import { Method } from "../Method/Method";
import { Define } from "../Define/GeneralDefine";
import { Director, director, error, Game, game, macro, native, Rect, ResolutionPolicy, screen, size, Size, sys, Vec2, Vec3, view } from "cc";
import { Persist } from "../Persist/Persist";
import { PersistKey } from "../Define/PersistKeyDefine";

// 這是原生環境下會有的全域方法
declare function __getPlatform (): number;
declare function __isiOSAppOnMac (): boolean;

// app 內部路徑
let appInternalPath:string = "";

// 裝置轉向通知方法
let orientationChangeCallback:((orientation:Device.Orientation)=>void)[] = [];
let interfaceOrientationChangeCallback:((interfaceOrientation:Device.InterfaceOrientation)=>void)[] = [];

// 瀏覽器資訊
const BROWSER_INFO = !NATIVE && ((nav)=>{
    var data:any = {};

    var ua = data.uaString = nav.userAgent;
    var browserMatch = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*([\d\.]+)/i) || [];
    if (browserMatch[1]) { browserMatch[1] = browserMatch[1].toLowerCase(); }
    var operaMatch:any = browserMatch[1] === 'chrome';
    if (operaMatch) { operaMatch = ua.match(/\bOPR\/([\d\.]+)/); }

    if (/trident/i.test(browserMatch[1])) {
        var msieMatch = /\brv[ :]+([\d\.]+)/g.exec(ua) || [];
        data.name = 'msie';
        data.version = msieMatch[1];
    }
    else if (operaMatch) {
        data.name = 'opera';
        data.version = operaMatch[1];
    }
    else if (browserMatch[1] === 'safari') {
        var safariVersionMatch = ua.match(/version\/([\d\.]+)/i);
        data.name = 'safari';
        data.version = safariVersionMatch[1];
    }
    else {
        data.name = browserMatch[1];
        data.version = browserMatch[2];
    }

    var versionParts = [];
    if (data.version) {
        var versionPartsMatch = data.version.match(/(\d+)/g) || [];
        for (var i=0; i < versionPartsMatch.length; i++) {
            versionParts.push(versionPartsMatch[i]);
        }
        if (versionParts.length > 0) { data.majorVersion = versionParts[0]; }
    }
    data.name = data.name || '(unknown browser name)';
    data.version = {
        full: data.version || '(unknown full browser version)',
        parts: versionParts,
        major: versionParts.length > 0 ? versionParts[0] : '(unknown major browser version)'
    };

    return data;
})(window.navigator || navigator);

// 裝置旋轉方向
enum DeviceRotation {
    PORTRAIT                = 0,
    LANDSCAPE_LEFT          = -90,
    PORTRAIT_UPSIDE_DOWN    = 180,
    LANDSCAPE_RIGHT         = 90
};

/**
 * 裝置識別碼
 */
const DeviceID = {
    WebAppStorageInstallationID: null,
    WebDeviceID: null,
    WebDeviceNo: null,
    WebDeviceStorageInstallationID: null
}

// 裝置實體類別
class DeviceEntity {
    private m_deviceRotation: DeviceRotation;
    private m_orientation: Device.Orientation;
    private m_interfaceOrientation: Device.InterfaceOrientation;
    private m_attempToChangeOrientation: boolean;
    private m_safeAreaCacheMap: Map<Device.Orientation, Rect>;
    private m_screenCenterMap: Map<Device.Orientation, Vec3>;
    private m_getSafeAreaRect: ()=>Rect;

    constructor() {
        this.m_orientation = Device.Orientation.LANDSCAPE;
        this.m_interfaceOrientation = Device.InterfaceOrientation.LANDSCAPE_LEFT;
        this.m_deviceRotation = DeviceRotation.LANDSCAPE_LEFT;
        this.m_attempToChangeOrientation = false;
        this.m_safeAreaCacheMap = new Map<Device.Orientation, Rect>();
        this.m_screenCenterMap = new Map<Device.Orientation, Vec3>();
        this.m_getSafeAreaRect = sys.getSafeAreaRect;
        sys.getSafeAreaRect = this.GetSafeAreaRect.bind(this);
        screen.on('orientation-change', this.OnOrientationDidChange, this);

        view.setDesignResolutionSize(Define.DesignSize.REGULAR.width, Define.DesignSize.REGULAR.height, ResolutionPolicy.SHOW_ALL);
    }

    /**
     * 取得 Android ID
     */
    public get AndroidID(): string {
        return NATIVE && sys.os == sys.OS.ANDROID ? Method.Device.GetAndroidId() : "";
    }

    /**
     * 取得存在 app 儲存空間的識別碼
     * 備註：只存在 app 區
     * 格式範例：b5bbc1d7-ff98-43b9-b6a6-f457f0ff80a0
     */
    public get WebAppStorageInstallationID(): string {
        return DeviceID.WebAppStorageInstallationID;
    }

    /**
     * 取得裝置識別碼
     * 備註：同時存在 app 和 device 區
     * 格式範例：75911d00-8c2b-4784-8f78-81bbf3e53301
     */
    public get WebDeviceID(): string {
        return DeviceID.WebDeviceID;
    }

    /**
     * 取得裝置識別號
     * 備註：同時存在 app 和 device 區
     * 格式範例：10000157651
     */
    public get WebDeviceNo(): string {
        return DeviceID.WebDeviceNo;
    }

    /**
     * 取得存在裝置儲存空間的識別碼
     * 備註：同時存在 app 和 device 區
     * 格式範例："3b32ac3b-f525-4a9f-a4b5-44cd083ebdb3"
     */
    public get WebDeviceStorageInstallationID(): string {
        return DeviceID.WebDeviceStorageInstallationID;
    }

    /**
     * 檢查是否是 iOS app 在 macOS 上運行
     */
    public get IsiOSAppOnMac(): boolean {
        return NATIVE && sys.os == sys.OS.IOS && __isiOSAppOnMac() == true;
    }

    /**
     * 檢查是否為 iPad
     */
    public get IsiPad(): boolean {
        return NATIVE && sys.os == sys.OS.IOS && __getPlatform() == 5;
    }

    /**
     * 取得裝置型號
     */
    public get Model(): string {
        return NATIVE ? (jsb as any).Device.getDeviceModel() : BROWSER_INFO.name;
    }

    /**
     * 取得作業系統版本
     */
    public get OSVersion(): string {
        return NATIVE ? sys.osVersion : BROWSER_INFO.version.full;
    }

    /**
     * 取得電信商名稱
     */
    public get Carrier(): string {
        return Method.Device.GetMobileCarrier();
    }

    /**
     * 取得 app 內部路徑
     */
    public get AppInternalPath(): string {
        return NATIVE ? appInternalPath : "";
    }

    /**
     * 取得網路連線類型
     */
    public get NetworkType(): string {
        switch (sys.getNetworkType()) {
            case sys.NetworkType.LAN: {
                return !NATIVE || !sys.isMobile ? "LAN" : "WIFI";
            }
            case sys.NetworkType.WWAN: {
                return !NATIVE ? "WAN" : Method.Device.GetRadioAccessType();
            }
        }
        return "UNKNOWN";
    }

    /**
     * 取得裝置方向
     */
    public get Orientation(): Device.Orientation {
        return this.m_orientation;
    }

    /**
     * 取得裝置介面方向
     */
    public get InterfaceOrientation(): Device.InterfaceOrientation {
        return this.m_interfaceOrientation;
    }

    /**
     * 檢查裝置是否為垂直方向
     */
    public get IsPortrait(): boolean {
        return this.m_orientation == Device.Orientation.PORTRAIT;
    }

    /**
     * 取得螢幕中心點
     */
    public get ScreenCenter(): Vec3 {
        if (!this.m_screenCenterMap.has(this.m_orientation)) {
            const designSize:Size = view.getDesignResolutionSize();
            const halfWidth:number = designSize.width * 0.5;
            const halfHeight:number = designSize.height * 0.5;
            this.m_screenCenterMap.set(this.m_orientation, new Vec3(halfWidth, halfHeight, 0));
        }
        return this.m_screenCenterMap.get(this.m_orientation);
    }

    /**
     * 取得當前的設計分辨率
     */
    public get DesignSize(): Size {
        return view.getDesignResolutionSize();
    }

    /**
     * 檢查是否有連上網路
     */
    public HasNetwork(): boolean {
        return sys.getNetworkType() != sys.NetworkType.NONE;
    }

    /**
     * 檢查是否是寬型螢幕(21:9)
     * 備註：
     * 1. 一樣使用 1400x640
     * 2. 左右會有黑邊，上下不會有黑邊
     */
    public IsWideScreen(): boolean {
        const RATIO:number = 2.2
        const width:number = screen.windowSize.width;
        const height:number = screen.windowSize.height;
        const ratio:number = height > width ? (height / width) : (width / height);
        const isUltraWideScreen:boolean = ratio >= RATIO;
        return isUltraWideScreen;
    }

    /**
     * 檢查是否為通用型設計分辨率螢幕
     * 備註：
     * 1. 通用型：1400x640
     * 2. 窄款型：1136x640
     * 兩者皆為上下有黑邊，左右不會有黑邊
     */
    public IsRegularScreen(): boolean {
        const RATIO:number = 1.8
        let isRegular = true;
        
        if (DEV && !NATIVE) {
            isRegular = Define.DesignSize[localStorage.getItem("DesignSize")] == Define.DesignSize.REGULAR;
        } else {
            switch (sys.platform) {
                case sys.Platform.IOS: {
                    if (this.IsiPad || this.IsiOSAppOnMac) {
                        isRegular = false;
                    } else {
                        isRegular = jsb.device.getSafeAreaEdge().z > 0 ? true : false;
                    }
                    break;
                }
                case sys.Platform.ANDROID: {
                    const visibleSize:Size = view.getVisibleSize();
                    const getSize:Size = Method.Device.GetScreenSize();
                    let width = visibleSize.width;
                    let height = visibleSize.height;
                    if (getSize?.width > 0 && getSize?.height > 0) {
                        width = getSize.width;
                        height = getSize.height;
                    }
                    let ratio = height > width ? (height / width) : (width / height);
                    isRegular = this.IsWideScreen() ? true : (ratio >= RATIO);
                    break;
                }
                case sys.Platform.WIN32: {
                    isRegular = false;
                    break;
                }
            }
        }

        return isRegular;
    }

    /**
     * 改變裝置方向
     * @param orientation 裝置方向
     */
    public ChangeOrientation(orientation: Device.Orientation): boolean {
        let success:boolean = false;

        if (!this.m_attempToChangeOrientation && orientation != this.m_orientation) {
            this.m_orientation = orientation;
            this.m_attempToChangeOrientation = true;

            const designSize:Size = (()=>{
                let width:number = 0, height:number = 0;
                const oldDesignSize:Size = view.getDesignResolutionSize();
                if (orientation == Device.Orientation.LANDSCAPE) {
                    width = Math.max(oldDesignSize.width, oldDesignSize.height);
                    height = Math.min(oldDesignSize.width, oldDesignSize.height);
                } else {
                    width = Math.min(oldDesignSize.width, oldDesignSize.height);
                    height = Math.max(oldDesignSize.width, oldDesignSize.height);
                }
                return size(width, height);
            })()
            view.setDesignResolutionSize(designSize.width, designSize.height, ResolutionPolicy.SHOW_ALL);

            const shouldCallNative = NATIVE && !this.IsiOSAppOnMac;
            shouldCallNative && Method.Device.ChangeOrientation(orientation);

            if (!NATIVE) {
                const windowHeight:number = this.IsPortrait ? Math.min(designSize.height , window.innerHeight - 50) : designSize.height;
                const windowWidth:number = this.IsPortrait ? (windowHeight * designSize.width / designSize.height) : designSize.width;
                screen.windowSize = size(windowWidth, windowHeight);
            }

            if (!shouldCallNative) {
                this.OnOrientationDidChange(orientation == Device.Orientation.PORTRAIT ? DeviceRotation.PORTRAIT : this.m_deviceRotation);
            }

            success = true;
        }

        return success;
    }

    /**
     * 收到轉向事件
     * @param event 事件事件
     */
    private OnOrientationDidChange(rotation:DeviceRotation) {
        if (!this.m_attempToChangeOrientation) {
            // [使用者旋轉裝置] => 只會有橫向的旋轉，不會有 Canvas 尺寸改變的問題
            this.OnInterfaceOrientationChanged(rotation);
            this.NotifyChangeOrientation(true);
        } else if (this.m_safeAreaCacheMap.has(this.m_orientation)) {
            // [程式碼旋轉，曾經轉過這個方向]
            this.OnOrientationChanged();
            this.OnInterfaceOrientationChanged(rotation);
            this.NotifyChangeOrientation();
        } else {
            // [程式碼旋轉，第一次轉到這個方向]
            director.once(Director.EVENT_BEFORE_UPDATE, ()=>{
                this.OnOrientationChanged();
                this.OnInterfaceOrientationChanged(rotation);
                this.NotifyChangeOrientation();
            });
        }
    }

    /**
     * 裝置發生轉向處理
     * 備註：這裡只在乎裝置是直向或橫向，不在意介面方向
     */
    private OnOrientationChanged() {
        this.m_attempToChangeOrientation = false;

        // 更新 safe area cache
        if (!this.m_safeAreaCacheMap.has(this.m_orientation)) {
            const rect:Rect = this.m_getSafeAreaRect.call(sys);
            const designSize:Size = view.getDesignResolutionSize();
            const halfWidth:number = designSize.width * 0.5;
            const halfHeight:number = designSize.height * 0.5;
            if (rect.width >= 0 && 
                rect.height >= 0 && 
                (rect.x < halfWidth && rect.x > -halfWidth) &&
                (rect.y < halfHeight && rect.y > -halfHeight)) {
                this.m_safeAreaCacheMap.set(this.m_orientation, rect);
            }
        }
    }

    /**
     * 裝置介面發生轉向處理
     * @param rotation 旋轉方向
     */
    private OnInterfaceOrientationChanged(rotation:DeviceRotation) {
        switch (rotation) {
            case DeviceRotation.PORTRAIT: {
                this.m_interfaceOrientation = Device.InterfaceOrientation.PORTRAIT;
                break;
            }
            case DeviceRotation.LANDSCAPE_LEFT: {
                this.m_deviceRotation = DeviceRotation.LANDSCAPE_LEFT;
                this.m_interfaceOrientation = sys.os == sys.OS.ANDROID ? Device.InterfaceOrientation.LANDSCAPE_RIGHT : Device.InterfaceOrientation.LANDSCAPE_LEFT;
                break;
            }
            case DeviceRotation.LANDSCAPE_RIGHT: {
                this.m_deviceRotation = DeviceRotation.LANDSCAPE_RIGHT;
                this.m_interfaceOrientation = sys.os == sys.OS.ANDROID ? Device.InterfaceOrientation.LANDSCAPE_LEFT : Device.InterfaceOrientation.LANDSCAPE_RIGHT;
                break;
            }
        }
    }

    /**
     * 通知轉向改變
     * @param onlyInterfaceOrientationChange 是否只有介面方向改變
     */
    private NotifyChangeOrientation(onlyInterfaceOrientationChange:boolean=false) {
        !onlyInterfaceOrientationChange && orientationChangeCallback.forEach(func=>{try{func?.(this.m_orientation)}catch(e){error(e)}});
        interfaceOrientationChangeCallback.forEach(func=>{try{func?.(this.m_interfaceOrientation)}catch(e){error(e)}});
    }

    /**
     * 取得 safe area 矩形
     */
    private GetSafeAreaRect(): Rect {
        if (!NATIVE) {
            if (!!localStorage.getItem("simulateiPhoneNotch")) {
                // 網頁版模擬 iPhone 瀏海設定
                const designSize:Size = view.getDesignResolutionSize();
                const landscapeOffset:Vec2 = new Vec2(51, 30);
                const portraitOffset:Vec2 = new Vec2(0, 52);
                this.m_safeAreaCacheMap.set(Device.Orientation.LANDSCAPE, new Rect(landscapeOffset.x, landscapeOffset.y, designSize.width - landscapeOffset.x, designSize.height - landscapeOffset.y));
                this.m_safeAreaCacheMap.set(Device.Orientation.PORTRAIT, new Rect(portraitOffset.x, portraitOffset.y, designSize.width - portraitOffset.x, designSize.height - portraitOffset.y));
            } else if (!!localStorage.getItem("simulateAndroidNotch")) {
                // 網頁版模擬 Android 打孔設定
                const designSize:Size = view.getDesignResolutionSize();
                const landscapeOffset:Vec2 = new Vec2(55, 0);
                const portraitOffset:Vec2 = new Vec2(0, 56);
                this.m_safeAreaCacheMap.set(Device.Orientation.LANDSCAPE, new Rect(landscapeOffset.x, landscapeOffset.y, designSize.width - landscapeOffset.x, designSize.height - landscapeOffset.y));
                this.m_safeAreaCacheMap.set(Device.Orientation.PORTRAIT, new Rect(portraitOffset.x, portraitOffset.y, designSize.width - portraitOffset.x, designSize.height - portraitOffset.y));
            }
        }

        if (this.m_safeAreaCacheMap.has(this.m_orientation)) {
            return this.m_safeAreaCacheMap.get(this.m_orientation);
        }

        const rect:Rect = this.m_getSafeAreaRect.call(sys);
        this.m_safeAreaCacheMap.set(this.m_orientation, rect);
        return rect;
    }
}

export namespace Device {
    /**
     * 裝置方向
     */
    export enum Orientation {
        /** 垂直 */
        PORTRAIT                = macro.ORIENTATION_PORTRAIT,

        /** 水平 */
        LANDSCAPE               = macro.ORIENTATION_LANDSCAPE,
    }

    /**
     * 裝置介面方向
     */
    export enum InterfaceOrientation {
        /** 聽筒在上 */
        PORTRAIT                = 1,

        /** 聽筒在下 */
        PORTRAIT_UPSIDE_DOWN    = 1 << 7 | 1,

        /** 聽筒在左 */
        LANDSCAPE_LEFT          = 2,

        /** 聽筒在右 */
        LANDSCAPE_RIGHT         = 1 << 7 | 2,
    }

    /**
     * 取得當前裝置實體
     */
    export const Current: DeviceEntity = null;
}

export namespace Device {
    export namespace Helper {
        /**
         * 載入裝置識別碼
         */
        export function LoadIDs() {
            {
                const id:string = Persist.Device.Get(PersistKey.DEVICE_ID);
                DeviceID.WebDeviceID = typeof id == "string" && id.length == 36 ? id : "";
            }
            {
                const id:string = Persist.Device.Get(PersistKey.DEVICE_NO);
                DeviceID.WebDeviceNo = typeof id == "string" && id.length > 10 ? id : "";
            }
            {
                const id:string = Persist.App.Get(PersistKey.APP_STORAGE_ID);
                DeviceID.WebAppStorageInstallationID = typeof id == "string" && id.length == 36 ? id : "";
            }
            {
                const id:string = Persist.Device.Get(PersistKey.DEVICE_STORAGE_ID);
                DeviceID.WebDeviceStorageInstallationID = typeof id == "string" && id.length == 36 ? id : "";
            }
        }

        /**
         * 註冊裝置識別碼
         * @param webDeviceID 取得裝置識別碼
         * @param webDeviceNo 取得裝置識別號
         * @param webAppStorageInstallationID 取得存在 app 儲存空間的識別碼
         * @param webDeviceStorageInstallationID 取得存在裝置儲存空間的識別碼
         */
        export function RegistIDs(webDeviceID:string, webDeviceNo:string, webAppStorageInstallationID:string, webDeviceStorageInstallationID:string) {
            const UUID_LENGTH:number = 36;
            const NO_LENGHT:number   = 10;
            if (typeof webDeviceID == "string" && webDeviceID.length == UUID_LENGTH) {
                Persist.Device.Set(PersistKey.DEVICE_ID, webDeviceID);
                DeviceID.WebDeviceID = webDeviceID;
            }
            if (typeof webDeviceNo == "string" && webDeviceNo.length > NO_LENGHT) {
                Persist.Device.Set(PersistKey.DEVICE_NO, webDeviceNo);
                DeviceID.WebDeviceNo = webDeviceNo;
            }
            if (typeof webAppStorageInstallationID == "string" && webAppStorageInstallationID.length == UUID_LENGTH) {
                Persist.App.Set(PersistKey.APP_STORAGE_ID, webAppStorageInstallationID);
                DeviceID.WebAppStorageInstallationID = webAppStorageInstallationID;
            }
            if (typeof webDeviceStorageInstallationID == "string" && webDeviceStorageInstallationID.length == UUID_LENGTH) {
                Persist.Device.Set(PersistKey.DEVICE_STORAGE_ID, webDeviceStorageInstallationID);
                DeviceID.WebDeviceStorageInstallationID = webDeviceStorageInstallationID;
            }
        }

        /**
         * 註冊裝置轉向通知方法
         * @param orientationCallback 裝置轉向通知方法
         * @param interfaceOrientationCallback 裝置介面轉向通知方法
         */
        export function RegisterOrientationCallback(orientationCallback:(orientation:Device.Orientation)=>void, interfaceOrientationCallback?:(orientation:Device.InterfaceOrientation)=>void) {
            orientationCallback && orientationChangeCallback.push(orientationCallback);
            interfaceOrientationCallback && interfaceOrientationChangeCallback.push(interfaceOrientationCallback);
        }
    }
}


//------------------------------------------------------------------------------------------------
game.on(Game.EVENT_ENGINE_INITED, () =>{
    (Device.Current as any) = new DeviceEntity();
    Device.Helper.LoadIDs();
    NATIVE && (appInternalPath = native.fileUtils.getFileDir(native.fileUtils.fullPathForFilename('main.js'))+"/assets/");
    eval('window.__device=Device.Current');
});
    