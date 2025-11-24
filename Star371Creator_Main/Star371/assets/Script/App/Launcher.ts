import { _decorator, Component, director, error, log, math, Node, RenderRoot2D, view } from 'cc';
import { GameApp } from './GameApp';
import Stage from '../Stage/Stage';
import { Bundle } from '../Bundle/Bundle';
import { StageId } from '../Define/StageDefine';
import { Define } from '../Define/GeneralDefine';
import { BundleDefine } from '../Define/BundleDefine';
import { CenterTargeting } from '../Toolkit/CenterTargeting';
import { ViewManager, ViewSectionId } from '../ViewManage/ViewManager';
import { PersistLayers } from '../Feature/PersistLayers/PersistLayers';
import { PersistKey } from '../Define/PersistKeyDefine';

const { ccclass } = _decorator;

let stepper:number = 0;
enum FinishState {
    NONE            = 0,
    VIEW_SECTIONS   = 1 << stepper++,
    BUNDLES         = 1 << stepper++,

    ALL             = (1 << stepper) - 1,
    FINISH          = ALL+1,
}

@ccclass('Launcher')
export class Launcher extends Stage {
    private m_finishState:FinishState;

    protected onLoad(): void {
        super.onLoad()
        let envStr = Environment[Environment[AppDefine.EnvType]]
        log("Launcher onLoad", envStr)
        this.m_finishState = FinishState.NONE;
        this.CreateViewSections();
        this.PreloadBundles();
    }

    protected update(dt: number): void {
        if (this.m_finishState === FinishState.ALL) {
            this.m_finishState = FinishState.FINISH;
            (GameApp.Shared as any).CreatorFinishLaunching();
            GameApp.Shared.StageManager.Replace(StageId.LOADING);
        }
    }

    /**
     * 建立 View 使用層級區域
     */
    private CreateViewSections(): void {
        ViewManager.Instance.BindScope(
            ViewSectionId.DEFER, 
            PersistLayers.Layer(Define.ZIndex.Global.VIEW_DEFER));

        ViewManager.Instance.BindScope(
            ViewSectionId.USER, 
            PersistLayers.Layer(Define.ZIndex.Global.VIEW_USER));

        ViewManager.Instance.BindScope(
            ViewSectionId.DIALOG, 
            PersistLayers.Layer(Define.ZIndex.Global.VIEW_DIALOG));

        ViewManager.Instance.BindScope(
            ViewSectionId.ALERT, 
            PersistLayers.Layer(Define.ZIndex.Global.VIEW_ALERT));
        
        this.m_finishState |= FinishState.VIEW_SECTIONS;
    }

    /**
     * 預載入 Bundle
     */
    private PreloadBundles(): void {
        let didLoadCount:number = 0;
        const bundles:string[] = Object.keys(BundleDefine.Foundation);
        for (const bundle of bundles) {
            const bundleName:string = BundleDefine.Foundation[bundle];
            Bundle.Load(bundleName, (err, bundle) => {
                if (err) {
                    error(`Preload bundle(${bundleName}) failed: ${err.message}`);
                } else {
                    didLoadCount++;
                    if (didLoadCount === bundles.length) {
                        this.m_finishState |= FinishState.BUNDLES;
                    }
                }
            });
        }
    }
}
