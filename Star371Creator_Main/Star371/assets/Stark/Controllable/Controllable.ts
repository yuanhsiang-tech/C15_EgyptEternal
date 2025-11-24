import { director, CCObject, TweenSystem, warn, js, isValid, _decorator, Component, Node } from "cc";
const { ccclass, property } = _decorator;

/**
 * LifeNode 重複利用池
 */
class LifeNodePool {
    private static DEBUG = false;
    private m_queue:Node[];
    private m_debugTrack:Node[];
    constructor() { this.m_queue = []; this.m_debugTrack = LifeNodePool.DEBUG ? [] : null; }
    public Get(): Node {
        let lifeNode:Node = this.m_queue.length > 0 ? this.m_queue.shift() : new Node();
        director.addPersistRootNode(lifeNode);
        LifeNodePool.DEBUG && this.m_debugTrack.push(lifeNode);
        return lifeNode;
    }
    public Put(lifeNode:Node) {
        if (isValid(lifeNode)) {
            lifeNode.removeFromParent();
            director.removePersistRootNode(lifeNode);
            this.m_queue.find(node=>node==lifeNode) && this.m_queue.push(lifeNode);
            LifeNodePool.DEBUG && js.array.remove(this.m_debugTrack, lifeNode);
        }
    }
}
const lifeNodePool = globalThis.LifeNodePool = new LifeNodePool();

// 當元件暫停後仍會持續呼叫的 update 更新，仿造 cocos 採用小寫開頭
const FUNC_LIFE_UPDATE_NAME = "lifeUpdate";

/**
 * ControllableJS 的 ts 轉接實作，真正的處理行為在 ControllableJS.js 裡
 */
@ccclass
export default class Controllable extends Component {
    private m_lifeNode:Node = null;
    private m_pauseKeyStack:string[] = null;
    private m_isPaused:boolean = null;
    private m_list:Node[] = null;

    protected onLoad() {
        this.m_isPaused = false;
        this.m_pauseKeyStack = [];
        this.m_list = [];
        this.m_lifeNode = lifeNodePool.Get();
        this.m_lifeNode.name = js.formatStr("Controllable-LifeNode:%s-%s", this.node.name, (this.node.parent ? this.node.parent.name : "NoParent"));
        this.m_lifeNode[FUNC_LIFE_UPDATE_NAME] = (dt:number) => this.lifeUpdate(dt);
    }

    /**
     * 元件啟用時的通知
     */
    protected onEnable() {
        if (this.m_lifeNode) {
            director.getScheduler().schedule(this.m_lifeNode[FUNC_LIFE_UPDATE_NAME], this.m_lifeNode, 0);
        }
    }

    /**
     * 元件停用時的通知
     */
    protected onDisable() {
        if (this.m_lifeNode) {
            director.getScheduler().unscheduleAllForTarget(this.m_lifeNode);
        }
    }

    /**
     * 元件銷毀時的通知
     */
    protected onDestroy() {
        if (this.m_lifeNode) {
            lifeNodePool.Put(this.m_lifeNode);
            this.m_lifeNode = null;
        }
    }

    /**
     * 暫停此 node (包含 child) 的 schedule、action、animation
     * @param key 發起暫停的識別名稱
     * 注意：此方法的回傳用以表示是否有往下通知其他元件暫停，但紀錄上仍會記錄此次暫停的對象
     */
    public Pause(key:string): boolean {
        let isSuccess: boolean = false;
        if (!this.m_isPaused) {
            JS_Pause.call(this, this.node);
            this.m_isPaused = true;
            this.node.pauseSystemEvents(false);
            isSuccess = true;
            this.OnPause();
        }
        this.m_pauseKeyStack.push(key);
        return isSuccess;
    }
    
    /**
     * 恢復此 node (包含 child) 的 schedule、action、animation
     * @param key 發起暫停的識別名稱
     * 注意：此方法的回傳用以表示是否有正確解除暫停
     */
    public Resume(key:string, force:boolean=false): boolean {
        let isSuccess: boolean = false;

        if (force == true) {
            this.m_pauseKeyStack = [];
        } else if (this.m_pauseKeyStack.indexOf(key) != -1) {
            js.array.remove(this.m_pauseKeyStack, key);
        }

        if (this.m_isPaused && 
            this.m_pauseKeyStack.length == 0) {
            JS_Resume.call(this);
            this.m_isPaused = false;
            this.node.resumeSystemEvents(false);
            isSuccess = true;
            this.OnResume();
        }

        return isSuccess;
    }
    
    /**
     * 檢查此 node 是否處於暫停狀態
     */
    public IsPaused(): boolean {
        return this.m_isPaused;
    }

    /**
     * 暫停後仍會持續執行的 update
     */
    protected lifeUpdate(dt:number) {}

    /**
     * 暫停事件通知
     */
    protected OnPause() {}

    /**
     * 恢復事件通知
     */
    protected OnResume() {}
}


/**
 * 暫停特定 node (包含 child) 的 schedule、action、animation
 * @param node 要暫停的目標對象
 */
function JS_Pause(node) {
    if (node && node.isValid && node.active) {
        this.m_list.push(node);
        TweenSystem.instance.ActionManager.pauseTarget(node);
        director.getScheduler().pauseTarget(node);

        let children = node.children;
        for (let i = 0; i < children.length; i++) {
            let eachChild = children[i];
            if (eachChild) {
                JS_Pause.call(this, eachChild);
            }
        }

        let comps = node._components;
        for (let i = 0; i < comps.length; i++) {
            let eachComp = comps[i];
            let isCompEnabled = !!(eachComp._objFlags&CCObject.Flags.IsOnEnableCalled);
            if (eachComp && eachComp.isValid && isCompEnabled) {
                if (eachComp['__classname__'] == 'sp.Skeleton') {
                    eachComp.__controllable_is_paused = eachComp.paused;
                    eachComp.paused = true;
                } else if (eachComp['__classname__'] == 'cc.ParticleSystem' 
                    || eachComp['__classname__'] == 'cc.ParticleSystem2D'
                    || eachComp['__classname__'] == 'cc.ParticleSystemComponent') {
                    eachComp._simulator.pause && eachComp._simulator.pause();
                } else if (eachComp['__classname__'] == 'cc.Animation') {
                    eachComp.__controllable_is_paused = eachComp.enabled;
                    eachComp.pause();
                }

                if (eachComp.update) {
                    let iterator;
                    let updateInvoker = director._compScheduler.updateInvoker;
                    let order = eachComp.constructor._executionOrder;

                    if (order < 0) {
                        iterator = updateInvoker["_neg"];
                    } else if (order > 0) {
                        iterator = updateInvoker["_pos"];
                    } else {
                        iterator = updateInvoker["_zero"];
                    }

                    if (Array.isArray(iterator.array) && js.array.contains(iterator.array, eachComp)) {
                        eachComp.__controllable_remove_update = true;
                        director._compScheduler.updateInvoker.remove(eachComp);
                    }
                }

                if (eachComp.lateUpdate) {
                    let iterator;
                    let lateUpdateInvoker = director._compScheduler.lateUpdateInvoker;
                    let order = eachComp.constructor._executionOrder;

                    if (order < 0) {
                        iterator = lateUpdateInvoker["_neg"];
                    } else if (order > 0) {
                        iterator = lateUpdateInvoker["_pos"];
                    } else {
                        iterator = lateUpdateInvoker["_zero"];
                    }

                    if (Array.isArray(iterator.array) && js.array.contains(iterator.array, eachComp)) {
                        eachComp.__controllable_remove_lateUpdate = true;
                        director._compScheduler.lateUpdateInvoker.remove(eachComp);
                    }
                }

                TweenSystem.instance.ActionManager.pauseTarget(eachComp);
                director.getScheduler().pauseTarget(eachComp);
            }
        }
    }
}

/**
 * 恢復此 node (包含 child) 的 schedule、action、animation
 */
function JS_Resume() {
    for (let node of this.m_list) {
        if (node && node.isValid) {
            node.active && TweenSystem.instance.ActionManager.resumeTarget(node);
            node.active && director.getScheduler().resumeTarget(node);

            let comps = node._components;
            for (let i = 0; i < comps.length; i++) {
                let eachComp = comps[i];
                let isCompEnabled = !!(eachComp._objFlags&CCObject.Flags.IsOnEnableCalled);
                if (eachComp && eachComp.isValid) {

                    if (eachComp['__classname__'] == 'sp.Skeleton') {
                        let oldState = eachComp.__controllable_is_paused;
                        eachComp.paused = isValid(oldState) ? oldState : false;
                        eachComp.__controllable_is_paused = null;
                    } else if (eachComp['__classname__'] == 'cc.ParticleSystem' 
                        || eachComp['__classname__'] == 'cc.ParticleSystem2D'
                        || eachComp['__classname__'] == 'cc.ParticleSystemComponent') {
                        eachComp._simulator.resume && eachComp._simulator.resume();
                    } else if (eachComp['__classname__'] == 'cc.Animation') {
                        let oldState = eachComp.__controllable_is_paused;
                        if (!isValid(oldState) || oldState == true) {
                            eachComp.resume();
                        } else if (oldState == false) {
                            eachComp.pause();
                        }
                        eachComp.__controllable_is_paused = null;
                    }

                    if (eachComp.update && eachComp.__controllable_remove_update === true) {
                        let iterator;
                        let updateInvoker = director._compScheduler.updateInvoker;
                        let order = eachComp.constructor._executionOrder;

                        if (order < 0) {
                            iterator = updateInvoker["_neg"];
                        } else if (order > 0) {
                            iterator = updateInvoker["_pos"];
                        } else {
                            iterator = updateInvoker["_zero"];
                        }

                        if (!Array.isArray(iterator.array)) {
                            warn("[Controllable] invalid updateInvoker for comp", eachComp.name, eachComp.node);   
                        } else if (isCompEnabled && !js.array.contains(iterator.array, eachComp)) {
                            director._compScheduler.updateInvoker.add(eachComp);
                        }

                        eachComp.__controllable_remove_update = false;
                    }

                    if (eachComp.lateUpdate && eachComp.__controllable_remove_lateUpdate === true) {
                        let iterator;
                        let lateUpdateInvoker = director._compScheduler.lateUpdateInvoker;
                        let order = eachComp.constructor._executionOrder;

                        if (order < 0) {
                            iterator = lateUpdateInvoker["_neg"];
                        } else if (order > 0) {
                            iterator = lateUpdateInvoker["_pos"];
                        } else {
                            iterator = lateUpdateInvoker["_zero"];
                        }

                        if (!Array.isArray(iterator.array)) {
                            warn("[Controllable] invalid lateUpdateInvoker for comp", eachComp.name, eachComp.node);   
                        } else if (isCompEnabled && !js.array.contains(iterator.array, eachComp)) {                        
                            director._compScheduler.lateUpdateInvoker.add(eachComp);
                        }

                        eachComp.__controllable_remove_lateUpdate = false;
                    }

                    if (isCompEnabled) {
                        director.getScheduler().resumeTarget(eachComp);
                        TweenSystem.instance.ActionManager.resumeTarget(eachComp);
                    }
                }
            }
        }
    }
    this.m_list.length = 0;
}