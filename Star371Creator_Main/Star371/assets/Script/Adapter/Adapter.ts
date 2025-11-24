import { game, Game, Vec2, director, sys, EventTouch, Touch, Input, Director, EditBox } from 'cc';
import { EDITOR, JSB } from 'cc/env';

globalThis.__MAX_TOUCHES__ = 1;

// 這是原生環境下會有的全域方法
declare function __getPlatform (): number;
declare function __isiOSAppOnMac (): boolean;
declare interface NativeSafeAreaEdge {
   /**
    * top
    */
   x: number;
   /**
    * left
    */
   y: number;
   /**
    * bottom
    */
   z: number;
   /**
    * right
    */
   w: number;
}

game.once( Game.EVENT_ENGINE_INITED, () =>
{
    // 執行加速
    {
        game[ "m_speed" ] = 1.0;
        const oldCalculateDT = ( Game.prototype as any )._calculateDT;
        ( game as any )._calculateDT = function ( useFixedDeltaTime: boolean ): number
        {
            oldCalculateDT.call( game, useFixedDeltaTime );
            this._deltaTime *= this.m_speed;
            return this._deltaTime;
        };
    }

    // 調整 totalTime 的計算方式
    if (!EDITOR) { 
        game[ "m_elapse" ] = 0.0;

        Object.defineProperty(game, "totalTime", {
            enumerable: false,
            get: function() {
                // 原做法是回傳毫秒，在此將秒轉換成毫秒
                return game["m_elapse"] * 1000;
            }
        })
        
        director.on(Director.EVENT_BEGIN_FRAME, ()=>{
            // 累加每個 frame 的秒差
            // ＊這裡改成累加 deltaTime 的原因上方有對 deltaTime 做變速調整，當速度變慢時經過的時間應該要對應減慢
            game["m_elapse"] += game.deltaTime;
        })
    }

    // 裝置上多點觸控調整
    if (JSB) {
        function _getLocation (touch, windowSize) {
            const dpr = jsb.device.getDevicePixelRatio() || 1;
            const x = touch.clientX * dpr;
            const y = windowSize.height - touch.clientY * dpr;
            return new Vec2(x, y);
        }
      
        const touches = [];
        const oldOnTouchStart = jsb.onTouchStart;
        jsb.onTouchStart = function(changedTouches, windowId) {
            const maxTouches = globalThis.__MAX_TOUCHES__;
            const handleTouches = [];
            const length = changedTouches.length;
            const windowSize = (jsb as any).ISystemWindowManager.getInstance().getWindow(windowId).getViewSize();
            if (maxTouches == 0 || touches.length < maxTouches) {
                for (let i = 0; i < length; ++i) {
                    const changedTouch = changedTouches[i];
                    const touchID = changedTouch.identifier;
                    if (touchID === null) {
                        continue;
                    }
                    const location = _getLocation(changedTouch, windowSize);
                    const canvas = (director.root.batcher2D as any)._screens[0];
                    if (canvas?.node?._uiProps?.uiTransformComp?.hitTest(location, windowId)) {
                        handleTouches.push(changedTouch);
                        touches.push(changedTouch.identifier);
                        if (maxTouches != null && maxTouches > 0 && touches.length >= maxTouches) {
                            break;
                        }
                    }
                }
            }
            oldOnTouchStart(handleTouches as any, windowId);
        }
   
        function ReleaseTouch (changedTouches) {
            for (let i = 0; i < changedTouches.length; ++i) {
                const changedTouch = changedTouches[i];
                for (let j = 0; j < touches.length; ++j) {
                    if (changedTouch.identifier === touches[j]) {
                        touches.splice(j, 1);
                        break;
                    }
                }
            }
        }
   
        const oldTouchEnd = jsb.onTouchEnd;
        jsb.onTouchEnd = function(changedTouches, windowId) {
            ReleaseTouch(changedTouches);
            oldTouchEnd(changedTouches, windowId);
        }
   
        const oldTouchCancel = jsb.onTouchCancel;
        jsb.onTouchCancel = function(changedTouches, windowId) {
            ReleaseTouch(changedTouches);
            oldTouchCancel(changedTouches, windowId);
        }
    }

    // Android 上的安全區域微調處理
    if (JSB && sys.os == sys.OS.ANDROID) {
        globalThis.safeAreaEdgeAdapter = function (area) {
          const isLandscape = area.x == 0;
          const hasNotch = (isLandscape ? area.y : area.x) > 0;
          const offset = hasNotch ? 30 : 0;
          if (isLandscape) {
            // [瀏海橫向]
            area.y -= offset;
            area.w -= offset;
          } else {
            // [瀏海直向]
            area.x -= offset;
            area.z -= offset;
          }
        };
    }

    // iOS 上的安全區域微調處理
    if (JSB && sys.os == sys.OS.IOS) {
        globalThis.safeAreaEdgeAdapter = function (area:NativeSafeAreaEdge) {
            const isLandscape:boolean = area.z < area.w;
            const hasNotch:boolean = (isLandscape ? area.w : area.x) > 0;
            const offset:number = hasNotch ? 14 : 12.5;
            if (__isiOSAppOnMac() || area.z == area.w) {
                // [(1)mac 上執行 iOS 或 (2)沒有瀏海和動態島的 iPhone 和 iPad] => 不處理
            } else if (__getPlatform() == 5) { 
                // [全螢幕 iPad(iPad Air 4 以上、iPad Pro 11 和 12.9 吋、iPad 10 以上、iPad mini 6 以上)] => 強制設定為 0
                area.x = area.y = area.z = area.w = 0;
            } else if (isLandscape) {
                // [瀏海 iPhone 橫向]
                area.y -= offset;
                area.w -= offset;
            } else {
                // [瀏海 iPhone 直向]
                area.x -= offset;
                area.z -= offset;
            }
        }
    }

    // 多點觸控處理
    if (JSB) {
        const input = director['input'] as any;
        if (input && input._eventDispatcherList) {
            for (let dispatcher of input._eventDispatcherList) {
                if (typeof dispatcher.dispatchEventTouch == "function") {
                    const oldDispatchEventTouch:Function = dispatcher.dispatchEventTouch;
                    dispatcher.dispatchEventTouch = function (event: EventTouch) {
                        const touches:Touch[] = event.getTouches();
                        const swipeGesture:Function = window['SwipeGesture'];

                        if (event.type == Input.EventType.TOUCH_MOVE) {
                            if (swipeGesture && touches.length == 2) {
                                const minMoveThreshold = 30;
                                let triggerRightToLeft = true;
                                let triggerLeftToRight = true;
                                let triggerTopToBottom = true;
                                let tiggerBottomToTop = true;
                                
                                for (let i = 0, len = touches.length; i < len; i++) {
                                    const selTouch:any = touches[i];
                                    const preTouchPoint:Vec2 = selTouch._prevPoint;
                                    const curTouchPoint:Vec2 = selTouch._point;
                                    const dirVec2:Vec2 = new Vec2(curTouchPoint.x-preTouchPoint.x, curTouchPoint.y-preTouchPoint.y);

                                    const didTriggerHorizontal = Math.abs(dirVec2.x) > minMoveThreshold;
                                    triggerRightToLeft &&= didTriggerHorizontal && dirVec2.x < 0;
                                    triggerLeftToRight &&= didTriggerHorizontal && dirVec2.x > 0;
                                    
                                    const didTriggerVertical = Math.abs(dirVec2.y) > minMoveThreshold;
                                    triggerTopToBottom &&= didTriggerVertical && dirVec2.y < 0;
                                    tiggerBottomToTop &&= didTriggerVertical && dirVec2.y > 0;

                                    if (!triggerRightToLeft && !triggerLeftToRight && !triggerTopToBottom && !tiggerBottomToTop) {
                                        break;
                                    }
                                }

                                if (triggerLeftToRight) {
                                    // [左往右]
                                    swipeGesture(0);
                                } else if (triggerRightToLeft) {
                                    // [右往左]
                                    swipeGesture(1);
                                } else if (triggerTopToBottom) {
                                    // [上往下]
                                    swipeGesture(2);
                                } else if (tiggerBottomToTop) {
                                    // [下往上]
                                    swipeGesture(3);
                                }
                            }
                        }

                        oldDispatchEventTouch.apply(dispatcher, arguments);
                    };
                    break;
                }
            }
        }
    }

    // 修正 EditBox 在 WEB 平台切換場景時 resize 事件產生的錯誤
    if (!JSB) {
        const EditBoxImpl = EditBox._EditBoxImpl;
        if (typeof EditBoxImpl?.prototype?.["_resize"] === "function") {
            EditBoxImpl.prototype["_resize"] = function(){
                if (this._delegate?.node?.isValid) {
                    this._delegate.node.hasChangedFlags = 1;
                }
            }
        }
    }
} );