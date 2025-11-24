import { _decorator, easing, Node, Tween, tween, Vec3 } from 'cc';
import { ViewBase } from './ViewBase';
const { ccclass, property } = _decorator;

// 彈跳時間(單位：秒)
const POP_DURATION:number = 0.3;

// ＊這裡預設指定的 ViewEventNotifier 不直接 import ViewType.ts 中的 interface ViewEventNotifier 而是改用 global 的版本，以此避免外部誤用
@ccclass('ViewPop')
export class ViewPop<INotifier extends ViewEventNotifier = ViewEventNotifier> extends ViewBase<INotifier> {
    /**
     * 介面(重新)進入場景
     * @param reused 是否為重複利用
     */
    protected OnAwake(reused: boolean) {
        super.OnAwake?.(reused);
        this.ViewAnchor.setScale(Vec3.ZERO);
    }

    /**
     * 介面準備完成，確認開始顯示
     */
    protected override Present(duration: number = POP_DURATION): boolean {
        const canPresent:boolean = super.Present();
        
        if (canPresent) {
            tween(this.ViewAnchor)
                .to(duration, {scale: Vec3.ONE}, {easing: easing.backOut})
                .start();
        }
        
        return canPresent;
    }
}

