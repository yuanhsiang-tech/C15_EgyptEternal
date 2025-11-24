import { _decorator, ccenum, Component, size, Size, sys, UITransform, Vec3, view } from 'cc';
import { EDITOR } from 'cc/env';
import { Device } from '../Device/Device';
import { Define } from '../Define/GeneralDefine';
import { EventDefine } from '../Define/EventDefine';
import { EventDispatcher } from '../../Stark/Utility/EventDispatcher';
const { ccclass, property, disallowMultiple } = _decorator;

/**
 * 瀏海調整模式
 */
enum SafeAreaMode {
    /**
     * 不做任何調整，維持原來的位置
     */
    NONE,
    /**
     * 跟隨瀏海方向調整位置，瀏海在左時Ｘ座標往右偏移，寬度縮小；瀏海在上時Ｙ座標往下偏移，高度縮小
     */
    FOLLOW,
    /**
     * 逆著瀏海方向調整位置，瀏海在左時Ｘ座標往左偏移，寬度增加；瀏海在上時Ｙ座標往上偏移，高度增加
     */
    REVERSE,
}
ccenum(SafeAreaMode);

@ccclass('UIConstraintSafeArea')
class UIConstraintSafeArea {
    @property({
        displayName: 'Aware',
        tooltip: '是否依據 SafeArea 調整',
    })
    public Aware: boolean = false;
}

@ccclass('UIConstraintSafeAreaSide')
class UIConstraintSafeAreaSide {
    @property({
        type: SafeAreaMode,
        displayName: 'Mode',
        tooltip: `NONE: 不做任何調整，維持原來的位置,
                  FOLLOW: 跟隨瀏海方向調整位置，瀏海在左時Ｘ座標往右偏移，寬度縮小；瀏海在上時Ｙ座標往下偏移，高度縮小
                  REVERSE: 逆著瀏海方向調整位置，瀏海在左時Ｘ座標往左偏移，寬度增加；瀏海在上時Ｙ座標往上偏移，高度增加`
    })
    public Mode: SafeAreaMode;

    @property({
        displayName: 'Ratio',
        tooltip: 'SafeArea 偏移量的用量比例(預設 1.0)',
        visible: function() { return this.Mode != SafeAreaMode.NONE; },
    })
    public Ratio: number = 1.0;

    constructor(mode:SafeAreaMode = SafeAreaMode.FOLLOW) {
        this.Mode = mode;
    }
}

@ccclass('UIConstraintSafeAreaWidth')
class UIConstraintSafeAreaWidth extends UIConstraintSafeArea {
    @property({
        displayName: 'Width',
        tooltip: '缺口(瀏海)在左右方時的寬度設定',
        visible: function() { return this.Aware; },
    })
    public Width: UIConstraintSafeAreaSide = new UIConstraintSafeAreaSide();
}

@ccclass('UIConstraintSafeAreaHeight')
class UIConstraintSafeAreaHeight extends UIConstraintSafeArea {
    @property({
        displayName: 'Height',
        tooltip: '缺口(瀏海)在上方時的高度設定',
        visible: function() { return this.Aware; },
    })
    public Height: UIConstraintSafeAreaSide = new UIConstraintSafeAreaSide();
}

@ccclass('UIConstraintSafeAreaTop')
class UIConstraintSafeAreaTop extends UIConstraintSafeArea {
    @property({
        displayName: 'Top',
        tooltip: '缺口(瀏海)在上的設定',
        visible: function() { return this.Aware; },
    })
    public Top: UIConstraintSafeAreaSide = new UIConstraintSafeAreaSide();
}

@ccclass('UIConstraintSafeAreaLeftRight')
class UIConstraintSafeAreaLeftRight extends UIConstraintSafeArea {
    @property({
        displayName: 'Left',
        tooltip: '缺口(瀏海)在左的設定',
        visible: function() { return this.Aware; },
    })
    public Left: UIConstraintSafeAreaSide = new UIConstraintSafeAreaSide();

    @property({
        displayName: 'Right',
        tooltip: '缺口(瀏海)在右的設定',
        visible: function() { return this.Aware; },
    })
    public Right: UIConstraintSafeAreaSide = new UIConstraintSafeAreaSide(SafeAreaMode.NONE);
}

@ccclass('UIConstraint')
@disallowMultiple
export class UIConstraint extends Component {
////////////////////////////////////////////////////////////////////////////
// X
    private m_x:number;

    @property({ visible: false })
    private m_xEnable: boolean = false;

    @property({
        displayName: 'Enable',
        tooltip: '是否啟用固定值',
        group: 'X'
    })
    private get xEnable(): boolean { return this.m_xEnable; }
    private set xEnable(value: boolean) {
        this.m_xEnable = value;
        if (value) this.m_xRegular = this.node.position.x;
    }

    @property({
        displayName: 'Regular',
        tooltip: 'Regular 約束值(1400x640)',
        visible: function() { return this.m_xEnable; },
        group: 'X'
    })
    private m_xRegular: number = 0;

    @property({
        displayName: 'Compact',
        tooltip: 'Compact 約束值(1136x640)',
        visible: function() { return this.m_xEnable; },
        group: 'X'
    })
    private m_xCompact: number = 0;

    @property({
        type: UIConstraintSafeAreaLeftRight,
        displayName: 'Safe Area',
        visible: function() { return this.m_xEnable; },
        group: 'X'
    })
    private m_xSafeArea: UIConstraintSafeAreaLeftRight = new UIConstraintSafeAreaLeftRight();

////////////////////////////////////////////////////////////////////////////
// Y
    private m_y:number;

    @property({ visible: false })
    private m_yEnable: boolean = false;

    @property({
        displayName: 'Enable',
        tooltip: '是否啟用固定值',
        group: 'Y'
    })
    private get yEnable(): boolean { return this.m_yEnable; }
    private set yEnable(value: boolean) {
        this.m_yEnable = value;
        if (value) this.m_yRegular = this.node.position.y;
    }

    @property({
        displayName: 'Regular',
        tooltip: 'Regular 約束值(1400x640)',
        visible: function() { return this.m_yEnable; },
        group: 'Y'
    })
    private m_yRegular: number = 0;

    @property({
        displayName: 'Compact',
        tooltip: 'Compact 約束值(1136x640)',
        visible: function() { return this.m_yEnable; },
        group: 'Y'
    })
    private m_yCompact: number = 0;

    @property({
        type: UIConstraintSafeAreaTop,
        displayName: 'Safe Area',
        visible: function() { return this.m_yEnable; },
        group: 'Y'
    })
    private m_ySafeArea: UIConstraintSafeAreaTop = new UIConstraintSafeAreaTop();

////////////////////////////////////////////////////////////////////////////
// Width
    private m_w:number;

    @property({ visible: false })
    private m_wEnable: boolean = false;

    @property({
        displayName: 'Enable',
        tooltip: '是否啟用',
        group: 'Width'
    })
    private get wEnable(): boolean { return this.m_wEnable; }
    private set wEnable(value: boolean) {
        this.m_wEnable = value;
        if (value) this.m_wRegular = this.getComponent(UITransform).contentSize.width;
    }

    @property({
        displayName: 'Auto',
        tooltip: '自動調整寬度成當前的 DesignSize.Width',
        group: 'Width',
        visible: function() { return this.m_wEnable; },
    })
    private m_wAuto: boolean = true;

    @property({
        displayName: 'Regular',
        tooltip: 'Regular 約束值(1400x640)',
        visible: function() { return !this.m_wAuto; },
        group: 'Width'
    })
    private m_wRegular: number = 0;

    @property({
        displayName: 'Compact',
        tooltip: 'Compact 約束值(1136x640)',
        visible: function() { return !this.m_wAuto; },
        group: 'Width'
    })
    private m_wCompact: number = 0;

    @property({
        type: UIConstraintSafeAreaWidth,
        displayName: 'Safe Area',
        visible: function() { return this.m_wEnable; },
        group: 'Width'
    })
    private m_wSafeArea: UIConstraintSafeAreaWidth = new UIConstraintSafeAreaWidth();

////////////////////////////////////////////////////////////////////////////
// Height
    private m_h:number;

    @property({ visible: false })
    private m_hEnable: boolean = false;

    @property({
        displayName: 'Enable',
        tooltip: '是否啟用',
        group: 'Height'
    })
    private get hEnable(): boolean { return this.m_hEnable; }
    private set hEnable(value: boolean) {
        this.m_hEnable = value;
        if (value) this.m_hRegular = this.getComponent(UITransform).contentSize.height;
    }

    @property({
        displayName: 'Auto',
        tooltip: '自動調整寬度成當前的 DesignSize.Height',
        group: 'Height',
        visible: function() { return this.m_hEnable; },
    })
    private m_hAuto: boolean = true;

    @property({
        displayName: 'Regular',
        tooltip: 'Regular 約束值(1400x640)',
        visible: function() { return !this.m_hAuto; },
        group: 'Height'
    })
    private m_hRegular: number = 0;

    @property({
        displayName: 'Compact',
        tooltip: 'Compact 約束值(1136x640)',
        visible: function() { return !this.m_hAuto; },
        group: 'Height'
    })
    private m_hCompact: number = 0;

    @property({
        type: UIConstraintSafeAreaHeight,
        displayName: 'Safe Area',
        visible: function() { return this.m_hEnable; },
        group: 'Height'
    })
    private m_hSafeArea: UIConstraintSafeAreaHeight = new UIConstraintSafeAreaHeight();

////////////////////////////////////////////////////////////////////////////

    protected onLoad(): void {
        if (EDITOR) return;
        EventDispatcher.Shared.On(EventDefine.System.INTERFACE_ORIENTATION_CHANGED, this.OnInterfaceOrientationChanged, this);
        this.m_x = this.node.position.x;
        this.m_y = this.node.position.y;
        this.m_w = this.getComponent(UITransform).contentSize.width;
        this.m_h = this.getComponent(UITransform).contentSize.height;
        this.Update();
        this.OnInterfaceOrientationChanged();
    }

    protected onDestroy(): void {
        if (EDITOR) return;
        EventDispatcher.Shared.Off(EventDefine.System.INTERFACE_ORIENTATION_CHANGED, this.OnInterfaceOrientationChanged, this);
    }

    /**
     * 更新約束
     */
    private Update(): void {
        const viewSize:Size = view.getDesignResolutionSize();
        const longer:number = viewSize.width > viewSize.height ? viewSize.width : viewSize.height;
        const isRegular:boolean = longer === Define.DesignSize.REGULAR.width;

        // X
        if (this.m_xEnable) {
            const pos:Vec3 = this.node.position;
            if (isRegular) {
                pos.x = this.m_xRegular;
            } else {
                pos.x = this.m_xCompact;
            }
            this.m_x = pos.x;
            this.node.setPosition(pos);
        }

        // Y
        if (this.m_yEnable) {
            const pos:Vec3 = this.node.position;
            if (isRegular) {
                pos.y = this.m_yRegular;
            } else {
                pos.y = this.m_yCompact;
            }
            this.m_y = pos.y;
            this.node.setPosition(pos);
        }

        // Width
        if (this.m_wEnable) {
            const newSize:Size = this.getComponent(UITransform).contentSize;
            if (this.m_wAuto) {
                newSize.width = viewSize.width;
            } else if (isRegular) {
                newSize.width = this.m_wRegular;
            } else {
                newSize.width = this.m_wCompact;
            }
            this.m_w = newSize.width;
            this.getComponent(UITransform).setContentSize(newSize);
        }

        // Height
        if (this.m_hEnable) {
            const newSize:Size = this.getComponent(UITransform).contentSize;
            if (this.m_hAuto) {
                newSize.height = viewSize.height;
            } else if (isRegular) {
                newSize.height = this.m_hRegular;
            } else {
                newSize.height = this.m_hCompact;
            }
            this.m_h = newSize.height;
            this.getComponent(UITransform).setContentSize(newSize);
        }
    }

    /**
     * 當介面方向改變
     */
    private OnInterfaceOrientationChanged(): void {
        if (this.m_xSafeArea.Aware || this.m_ySafeArea.Aware || this.m_wSafeArea.Aware || this.m_hSafeArea.Aware) {
            const orientation:Device.InterfaceOrientation = Device.Current.InterfaceOrientation;
            const offset:number = orientation == Device.InterfaceOrientation.PORTRAIT ? sys.getSafeAreaRect().y : sys.getSafeAreaRect().x;

            if (orientation == Device.InterfaceOrientation.PORTRAIT) {
                // [直版] => 瀏海只會在上面

                // Y
                if (this.m_yEnable && this.m_ySafeArea.Aware) {
                    const pos:Vec3 = this.node.position;
                    const ratioOffset:number = offset * this.m_ySafeArea.Top.Ratio;

                    switch (this.m_ySafeArea.Top.Mode) {
                        case SafeAreaMode.FOLLOW: {
                            // [跟隨瀏海] => 往下偏移
                            pos.y = this.m_y - ratioOffset;
                            break;
                        }
                        case SafeAreaMode.REVERSE: {
                            // [逆著瀏海] => 往上偏移
                            pos.y = this.m_y + ratioOffset;
                            break;
                        }
                        default: {
                            // [不做任何調整] => 回歸原本位置
                            pos.y = this.m_y;
                            break;
                        }
                    }

                    this.node.setPosition(pos);
                }
                
                // Height
                if (this.m_hEnable && this.m_hSafeArea.Aware) {
                    const newSize:Size = this.getComponent(UITransform).contentSize;
                    const ratioOffset:number = offset * this.m_hSafeArea.Height.Ratio;

                    switch (this.m_hSafeArea.Height.Mode) {
                        case SafeAreaMode.FOLLOW: {
                            // [跟隨瀏海] => 高度縮小
                            newSize.height = this.m_h - ratioOffset;
                            break;
                        }
                        case SafeAreaMode.REVERSE: {
                            // [逆著瀏海] => 往上偏移
                            newSize.height = this.m_h + ratioOffset;
                            break;
                        }
                        default: {
                            // [不做任何調整] => 回歸原本高度
                            newSize.height = this.m_h;
                            break;
                        }
                    }

                    this.getComponent(UITransform).setContentSize(newSize)
                }
            } else {
                // [橫版] => 瀏海可能在左邊，也有可能在右邊

                // X
                if (this.m_xEnable && this.m_xSafeArea.Aware) {
                    const pos:Vec3 = this.node.position;

                    if (orientation == Device.InterfaceOrientation.LANDSCAPE_LEFT) {
                        // [瀏海在左邊]
                        const ratioOffset:number = offset * this.m_xSafeArea.Left.Ratio;
                        switch (this.m_xSafeArea.Left.Mode) {
                            case SafeAreaMode.FOLLOW: {
                                // [跟隨瀏海] => 往右偏
                                pos.x = this.m_x + ratioOffset;
                                break;
                            }
                            case SafeAreaMode.REVERSE: {
                                // [逆著瀏海] => 往左偏
                                pos.x = this.m_x - ratioOffset;
                                break;
                            }
                            default: {
                                // [不做任何調整] => 回歸原本位置
                                pos.x = this.m_x;
                                break;
                            }
                        }
                    } else {
                        // [瀏海在右邊]
                        const ratioOffset:number = offset * this.m_xSafeArea.Right.Ratio;
                        switch (this.m_xSafeArea.Right.Mode) {
                            case SafeAreaMode.FOLLOW: {
                                // [跟隨瀏海] => 往左偏
                                pos.x = this.m_x - ratioOffset;
                                break;
                            }
                            case SafeAreaMode.REVERSE: {
                                // [逆著瀏海] => 往右偏
                                pos.x = this.m_x + ratioOffset;
                                break;
                            }
                            case SafeAreaMode.NONE: {
                                // [不做任何調整] => 回歸原本位置
                                pos.x = this.m_x;
                                break;
                            }
                        }
                    }

                    this.node.setPosition(pos);
                }

                // Width
                if (this.m_wEnable && this.m_wSafeArea.Aware) {
                    const newSize:Size = size(this.m_w, this.m_h);
                    const ratioOffset:number = offset * this.m_wSafeArea.Width.Ratio;

                    switch (this.m_wSafeArea.Width.Mode) {
                        case SafeAreaMode.FOLLOW: {
                            // [跟隨瀏海] => 縮小
                            newSize.width = this.m_w - ratioOffset;
                            break;
                        }
                        case SafeAreaMode.REVERSE: {
                            // [逆著瀏海] => 放大
                            newSize.width = this.m_w + ratioOffset;
                            break;
                        }
                    }

                    this.getComponent(UITransform).setContentSize(newSize);
                }
            }
        }
    }
}


