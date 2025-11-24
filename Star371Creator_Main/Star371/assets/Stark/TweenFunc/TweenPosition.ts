import { isValid, Node, Vec3, Tween, tween } from "cc";

const TWEEN_TAG = 16384 + 3;

export namespace TweenPosition
{
    export function Start(targetNode: Node, beginPos: Vec3, endPos: Vec3, duration: number, callback?: Function, easing?: ccTweenEasing): Tween<Node> {
        if (isValid(targetNode, true)) {
            TweenPosition.Stop(targetNode);
            targetNode.position = beginPos;
            return tween(targetNode)
                .to(duration, { position: endPos }, { easing: easing })
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

export namespace TweenPosition
{
    export function StartToPosition(targetNode: Node, endPos: Vec3, duration: number, callback?: Function, easing?: ccTweenEasing): Tween<Node> {
        if (isValid(targetNode, true)) {
            const beginPos = targetNode.position.clone();
            return TweenPosition.Start(targetNode, beginPos, endPos, duration, callback, easing);
        }

        callback?.();
        return null;
    }

    export function StartToX(targetNode: Node, endX: number, duration: number, callback?: Function, easing?: ccTweenEasing): Tween<Node> {
        if (isValid(targetNode, true)) {
            const beginPos = targetNode.position.clone();
            return TweenPosition.Start(targetNode, beginPos, new Vec3(endX, beginPos.y, beginPos.z), duration, callback, easing);
        }

        callback?.();
        return null;
    }

    export function StartToY(targetNode: Node, endY: number, duration: number, callback?: Function, easing?: ccTweenEasing): Tween<Node> {
        if (isValid(targetNode, true)) {
            const beginPos = targetNode.position.clone();
            return TweenPosition.Start(targetNode, beginPos, new Vec3(beginPos.x, endY, beginPos.z), duration, callback, easing);
        }

        callback?.();
        return null;
    }
}