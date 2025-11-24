import { NATIVE } from "cc/env"
import { ResourceDownloader } from "../../Stark/ResourceDownloader/ResourceDownloader"
import { NativeResourceHandler } from "./Handler/NativeResourceHandler"
import { WebResourceHandler } from "./Handler/WebResourceHandler"
import { IResourceHandler } from "../../Stark/ResourceDownloader/ResourceHandler"

/**
 * Native 資源處理器 - 實現 IResourceHandler 介面
 * 使用原生檔案系統 API 進行檔案儲存和 ZIP 解壓縮
 */
export class Downloader extends ResourceDownloader {
    private constructor() {
        super()
    }

    protected CreateResourceHandler(): IResourceHandler {
        if (NATIVE) {
            return new NativeResourceHandler()
        } else {
            return new WebResourceHandler()
        }
    }

    private static s_instance: Downloader | null = null
    public static GetInstance(): Downloader {
        if (!Downloader.s_instance) {
            Downloader.s_instance = new Downloader()
        }
        return Downloader.s_instance
    }

}