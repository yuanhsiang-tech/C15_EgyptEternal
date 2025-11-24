import { isValid, Node, Widget, Tween, tween } from "cc";

const TWEEN_TAG = 16384 + 5;

export namespace TweenWidget
{
    export interface WidgetSize
    {
        top     ?:number;
        bottom  ?:number;
        left    ?:number;
        right   ?:number;
    }

    export function Start(  targetNode  :Node,
                            beginSize   :WidgetSize,
                            endSize     :WidgetSize,
                            duration    :number,
                            callback   ?:Function,
                            easing     ?:ccTweenEasing
                            ): Tween<Widget>
    {
        const widget = isValid(targetNode, true) ? targetNode.getComponent(Widget) : null;
        if (isValid(widget, true)) {
            TweenWidget.Stop(targetNode);

            if (beginSize) {
                widget.top      = beginSize.top      ?? widget.top;
                widget.bottom   = beginSize.bottom   ?? widget.bottom;
                widget.left     = beginSize.left     ?? widget.left;
                widget.right    = beginSize.right    ?? widget.right;
            }

            return tween(widget)
                .to(duration, endSize, { easing: easing })
                .call(callback)
                .tag(TWEEN_TAG)
                .start();
        }

        callback?.();
        return null;
    }

    export function Stop(targetNode: Node) {
        if (isValid(targetNode, true)) {
            const widget = targetNode.getComponent(Widget);
            if (isValid(widget, true)) {
                Tween.stopAllByTag(TWEEN_TAG, widget);
            }
        }
    }
}

export namespace TweenWidget
{
    export function StartToSize(targetNode :Node, endSize :WidgetSize, duration :number, callback ?:Function, easing ?:ccTweenEasing): Tween<Widget> {
        return TweenWidget.Start(targetNode, null, endSize, duration, callback, easing);
    }

    export function StartToTop(targetNode :Node, top :number, duration :number, callback ?:Function, easing ?:ccTweenEasing): Tween<Widget> {
        return TweenWidget.Start(targetNode, null, { top: top }, duration, callback, easing);
    }

    export function StartToBottom(targetNode :Node, bottom :number, duration :number, callback ?:Function, easing ?:ccTweenEasing): Tween<Widget> {
        return TweenWidget.Start(targetNode, null, { bottom: bottom }, duration, callback, easing);
    }

    export function StartToLeft(targetNode :Node, left :number, duration :number, callback ?:Function, easing ?:ccTweenEasing): Tween<Widget> {
        return TweenWidget.Start(targetNode, null, { left: left }, duration, callback, easing);
    }

    export function StartToRight(targetNode :Node, right :number, duration :number, callback ?:Function, easing ?:ccTweenEasing): Tween<Widget> {
        return TweenWidget.Start(targetNode, null, { right: right }, duration, callback, easing);
    }
}