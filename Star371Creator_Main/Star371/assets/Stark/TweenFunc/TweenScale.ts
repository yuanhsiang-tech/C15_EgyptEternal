import { isValid, Node, Vec3, Tween, tween } from "cc";

const TWEEN_TAG = 16384 + 2;

export namespace TweenScale
{
    export function Start(targetNode: Node, beginScale: Vec3, endScale: Vec3, duration: number, callback?: Function, easing?: ccTweenEasing): Tween<Node> {
        if (isValid(targetNode, true)) {
            TweenScale.Stop(targetNode);
            targetNode.scale = beginScale;
            return tween(targetNode)
                .to(duration, { scale: endScale }, { easing: easing })
                .call(callback)
                .tag(TWEEN_TAG)
                .start();
        }

        callback?.();
        return null;
    }

    export function Stop(targetNode: Node) {
        if (isValid(targetNode, true)) {
            Tween.stopAllByTag(TWEEN_TAG, targetNode);
        }
    }
}

export namespace TweenScale
{
    export function StartToScale(targetNode: Node, endScale: number, duration: number, callback?: Function, easing?: ccTweenEasing): Tween<Node>;
    export function StartToScale(targetNode: Node, endScale: Vec3, duration: number, callback?: Function, easing?: ccTweenEasing): Tween<Node>;
    export function StartToScale(targetNode: Node, endScale: number | Vec3, duration: number, callback?: Function, easing?: ccTweenEasing): Tween<Node> {
        if (isValid(targetNode, true)) {
            if (typeof endScale === 'number') {
                endScale = new Vec3(endScale, endScale, 1);
            } else {
                endScale.z = 1;
            }
            return TweenScale.Start(targetNode, targetNode.scale, endScale, duration, callback, easing);
        }

        callback?.();
        return null;
    }
}
