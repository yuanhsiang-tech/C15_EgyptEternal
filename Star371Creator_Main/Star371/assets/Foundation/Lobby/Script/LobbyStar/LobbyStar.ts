import { _decorator, Component, EventTouch, Node, sp, log } from 'cc';
import { TimedBool } from '../../../../Stark/Utility/TimedBool';
import { UIButtonItem } from '../../../../Script/UISystem/UIButtonItem';

const { ccclass, property } = _decorator;

@ccclass('LobbyStar')
export class LobbyStar extends UIButtonItem {
    // 添加 TimedBool 屬性用於15秒冷卻
    private m_cooldownTimer: TimedBool = null;

    @property({
        type: sp.Skeleton,
        tooltip: "Spine"
    })
    public m_spine: sp.Skeleton = null;

    protected onLoad() {
        super.onLoad?.();

        // 初始化冷卻計時器，設定為15秒
        this.m_cooldownTimer = new TimedBool(5);
        this.m_cooldownTimer.Start();

        this.m_spine.setMix("12_0", "01_0", 0.15);
        this.m_spine.setAnimation(0, "01_0", true)
        this.m_spine.addAnimation(0, "12_0", false, 0.8)
        this.m_spine.addAnimation(0, "01_0", true)
        this.m_spine.setToSetupPose()

        let offsetY = 0;
        let scaleY = 1;
        let floor = this.m_spine.findBone("FLOOR");
        let scale = this.m_spine.findBone("SCALE");

        if (floor != null) {
            offsetY = -(floor.y / 3);
        }
        if (scale != null) {
            scaleY = scale.scaleY;
        }

        let finalScale = ((1 / scaleY) * 0.29) * 1.05;
        this.m_spine.node.setScale(finalScale, finalScale, 1);
    }

    protected update(deltaTime: number) {
        super.update?.(deltaTime);

        // 檢查冷卻時間是否到期，如果到期則執行動作並重新開始計時
        if (this.m_cooldownTimer && this.m_cooldownTimer.TakeAndRestart()) {
            this.m_spine.addAnimation(0, "00_0", false)
            this.m_spine.addAnimation(0, "01_0", true)
        }
    }
}


