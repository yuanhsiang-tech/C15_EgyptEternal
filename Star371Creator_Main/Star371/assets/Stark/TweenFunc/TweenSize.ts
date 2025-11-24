import { isValid, Node, UITransform, Size, Tween, tween } from "cc";
import { NodeUtils } from "../FuncUtils/NodeUtils";

const TWEEN_TAG = 16384 + 4;

export namespace TweenSize
{
    export function Start(targetNode: Node, beginSize: Size, endSize: Size, duration: number, callback?: Function, easing?: ccTweenEasing): Tween<UITransform> {
        if (isValid(targetNode, true)) {
            TweenSize.Stop(targetNode);
            const uiTransform = NodeUtils.InstallComponent(targetNode, UITransform);
            uiTransform.contentSize = beginSize;
            return tween(uiTransform)
                .to(duration, { contentSize: endSize }, { easing: easing })
                .call(callback)
                .tag(TWEEN_TAG)
                .start();
        }

        callback?.();
        return null;
    }

    export function Stop(targetNode: Node) {
        if (isValid(targetNode, true)) {
            const uiTransform = targetNode.getComponent(UITransform);
            if (isValid(uiTransform, true)) {
                Tween.stopAllByTag(TWEEN_TAG, uiTransform);
            }
        }
    }
}

export namespace TweenSize
{
    export function StartToSize(targetNode: Node, endSize: Size, duration: number, callback?: Function, easing?: ccTweenEasing): Tween<UITransform> {
        if (isValid(targetNode, true)) {
            const beginSize = NodeUtils.GetSize(targetNode);
            return TweenSize.Start(targetNode, beginSize, endSize, duration, callback, easing);
        }

        callback?.();
        return null;
    }

    export function StartToWidth(targetNode: Node, endWidth: number, duration: number, callback?: Function, easing?: ccTweenEasing): Tween<UITransform> {
        if (isValid(targetNode, true)) {
            const beginSize = NodeUtils.GetSize(targetNode);
            return TweenSize.Start(targetNode, beginSize, new Size(endWidth, beginSize.height), duration, callback, easing);
        }

        callback?.();
        return null;
    }

    export function StartToHeight(targetNode: Node, endHeight: number, duration: number, callback?: Function, easing?: ccTweenEasing): Tween<UITransform> {
        if (isValid(targetNode, true)) {
            const beginSize = NodeUtils.GetSize(targetNode);
            return TweenSize.Start(targetNode, beginSize, new Size(beginSize.width, endHeight), duration, callback, easing);
        }

        callback?.();
        return null;
    }
}
