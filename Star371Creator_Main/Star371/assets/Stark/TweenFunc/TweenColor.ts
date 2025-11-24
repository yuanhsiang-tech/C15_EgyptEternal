import { isValid, Color, Node, UIRenderer, Tween, tween, clamp, lerp } from 'cc';

const TWEEN_TAG = 16384;
const TARGET_KEY = "__cabrio_color_tween_current_color__";

export namespace TweenColor {

    function ProgressFunc(start: number, end: number, current: number, ratio: number) {
        let r = Math.round(clamp(lerp(start & 0xFF, end & 0xFF, ratio), 0, 255));
        let g = Math.round(clamp(lerp(start >> 8 & 0xFF, end >> 8 & 0xFF, ratio), 0, 255));
        let b = Math.round(clamp(lerp(start >> 16 & 0xFF, end >> 16 & 0xFF, ratio), 0, 255));
        let a = Math.round(clamp(lerp(start >> 24 & 0xFF, end >> 24 & 0xFF, ratio), 0, 255));
        return r + 0x100 * g + 0x10000 * b + 0x1000000 * a;
    }

    export function Start(target: Node | UIRenderer, beginColor: Color, endColor: Color, duration: number, callback?: Function, easing?: ccTweenEasing): Tween<UIRenderer> {
        const targetRenderer = (target instanceof UIRenderer) ? target : target?.getComponent?.(UIRenderer);
        if (isValid(targetRenderer, true)) {
            TweenColor.Stop(targetRenderer);
            targetRenderer.color = beginColor;
            return tween(targetRenderer)
                .to(duration, { color: endColor }, { progress: ProgressFunc, easing: easing })
                .call(callback)
                .tag(TWEEN_TAG)
                .start();
        }

        callback?.();
        return null;
    }

    export function StartV2(target: Node | UIRenderer, startColor: Color, endColor: Color, duration: number, callback?: Function, easing?: ccTweenEasing): Tween<Color> {
        const targetRenderer = (target instanceof UIRenderer) ? target : target?.getComponent?.(UIRenderer);
        if (isValid(targetRenderer, true)) {
            let currentColor = new Color(startColor);
            TweenColor.Stop(targetRenderer);
            targetRenderer[TARGET_KEY] = currentColor;
            return tween(currentColor)
                .to(duration, { r: endColor.r, g: endColor.g, b: endColor.b, a:endColor.a }, {
                    onUpdate: () => {
                        if (isValid(targetRenderer,true)) {
                            targetRenderer.color = currentColor;
                        }
                    },
                    easing: easing
                }).call(()=>{
                    if (isValid(targetRenderer,true)) {
                        targetRenderer.color = endColor;
                        delete targetRenderer[TARGET_KEY];
                    }
                    callback?.();
                })
                .tag(TWEEN_TAG)
                .start();
        }

        callback?.();
        return null;
    }

    export function Stop(target: Node | UIRenderer) {
        if (isValid(target, true)) {
            if (target[TARGET_KEY] instanceof Color) {
                Tween.stopAllByTag(TWEEN_TAG, target[TARGET_KEY]);
                delete target[TARGET_KEY];
            } else {
                Tween.stopAllByTag(TWEEN_TAG, target);
            }
        }
    }

}

export namespace TweenColor {

    export function StartToColor (target: Node | UIRenderer, endColor: Color, duration: number, callback?: Function, easing?: ccTweenEasing) {
        const targetRenderer = (target instanceof UIRenderer) ? target : target.getComponent?.(UIRenderer);
        if (isValid(targetRenderer, true)) {
            return TweenColor.StartV2(targetRenderer, targetRenderer.color, endColor, duration, callback, easing);
        }

        callback?.();
        return null;
    }

    export function StartToWhite (target: Node | UIRenderer, duration: number, callback?: Function, easing?: ccTweenEasing) {
        return TweenColor.StartToColor(target, Color.WHITE, duration, callback, easing);
    }

    export function StartToGray (target: Node | UIRenderer, duration: number, callback?: Function, easing?: ccTweenEasing) {
        return TweenColor.StartToColor(target, Color.GRAY, duration, callback, easing);
    }

    export function StartToBlack (target: Node | UIRenderer, duration: number, callback?: Function, easing?: ccTweenEasing) {
        return TweenColor.StartToColor(target, Color.BLACK, duration, callback, easing);
    }

}
