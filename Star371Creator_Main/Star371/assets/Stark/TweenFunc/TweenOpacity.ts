import { isValid, Node, Component, UIOpacity, Tween, tween } from "cc";
import { NodeUtils } from "../FuncUtils/NodeUtils";

const TWEEN_TAG = 16384 + 1;

export namespace TweenOpacity
{
    export function Start(targetNode: Node, beginOpacity: number, endOpacity: number, duration: number, callback?: Function, easing?: ccTweenEasing): Tween<UIOpacity> {
        if (isValid(targetNode, true)) {
            TweenOpacity.Stop(targetNode);
            const uiOpacity = NodeUtils.InstallComponent(targetNode, UIOpacity);
            uiOpacity.opacity = beginOpacity;
            return tween(uiOpacity)
                .to(duration, { opacity: endOpacity }, { easing: easing })
                .call(callback)
                .tag(TWEEN_TAG)
                .start();
        }

        callback?.();
        return null;
    }

    export function Stop(targetNode: Node) {
        if (isValid(targetNode, true)) {
            const uiOpacity = targetNode.getComponent(UIOpacity);
            if (isValid(uiOpacity, true)) {
                Tween.stopAllByTag(TWEEN_TAG, uiOpacity);
            }
        }
    }

    export function Create(target: Node | Component): Tween<UIOpacity> {
        const uiOpacity = NodeUtils.InstallComponent(target, UIOpacity);
        if (isValid(uiOpacity, true)) {
            return tween(uiOpacity).tag(TWEEN_TAG);
        } else {
            return null;
        }
    }

}

export namespace TweenOpacity
{
    export function StartToOpacity(targetNode: Node, endOpacity: number, duration: number, callback?: Function, easing?: ccTweenEasing): Tween<UIOpacity> {
        if (isValid(targetNode, true)) {
            const beginOpacity = NodeUtils.GetOpacity(targetNode);
            return TweenOpacity.Start(targetNode, beginOpacity, endOpacity, duration, callback, easing);
        }

        callback?.();
        return null;
    }
}
