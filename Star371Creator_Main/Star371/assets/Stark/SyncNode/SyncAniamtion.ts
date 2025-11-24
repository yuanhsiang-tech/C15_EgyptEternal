import { _decorator, Component, Animation, CCString } from 'cc'
const { ccclass, property, disallowMultiple, menu, requireComponent } = _decorator

@ccclass('SyncAnimation')
@menu('Stark/SyncAnimation')
@requireComponent(Animation)
@disallowMultiple
export class SyncAnimation extends Component {
    @property({
        type: CCString,
        displayName: 'Sync Key',
    })
    private m_syncKey: string = ""

    private m_animation: Animation = null

    private static s_enabledList: Map<string, SyncAnimation[]> = new Map()

    protected onLoad(): void {
        this.m_animation = this.node.getComponent(Animation)
    }

    protected onEnable(): void {
        if (!this.m_syncKey) return

        const isFirst: boolean = this._addToList()

        if (isFirst) {
            this.StartAnimation()
        } else {
            this._syncWithFirstAnimation()
        }
    }

    protected onDisable(): void {
        if (!this.m_syncKey) return
        
        this._removeFromList()
        this.StopAnimation()
    }

    public StartAnimation(currentTime?: number): void {
        if (this.m_animation) {
            this.m_animation.play()
            if (currentTime) {
                this.m_animation.setCurrentTime(currentTime)
            }
        }
    }

    public StopAnimation(): void {
        if (this.m_animation) {
            this.m_animation.stop()
        }
    }

    private _addToList(): boolean {
        const list: SyncAnimation[] = SyncAnimation.s_enabledList.get(this.m_syncKey) || []
        const isFirst: boolean = list.length === 0

        list.push(this)
        SyncAnimation.s_enabledList.set(this.m_syncKey, list)

        return isFirst
    }

    private _removeFromList(): void {
        const list: SyncAnimation[] = SyncAnimation.s_enabledList.get(this.m_syncKey) || []
        const index: number = list.indexOf(this)

        if (index !== -1) {
            list.splice(index, 1)
            SyncAnimation.s_enabledList.set(this.m_syncKey, list)
        }
    }

    private _syncWithFirstAnimation(): void {
        const list: SyncAnimation[] = SyncAnimation.s_enabledList.get(this.m_syncKey) || []
        const firstSync: SyncAnimation = list.length > 0 ? list[0] : null

        if (!firstSync || firstSync === this || !firstSync.m_animation || !this.m_animation) {
            this.StartAnimation()
            return
        }

        // Check if both animations have the same clip
        const firstClip = firstSync.m_animation.defaultClip
        const myClip = this.m_animation.defaultClip

        if (!firstClip || !myClip || firstClip.name !== myClip.name) {
            // Different clips, play independently
            this.StartAnimation()
            return
        }

        // Get current animation state and time
        const currentTime = firstSync.m_animation.getState(firstClip.name)?.current
        this.StartAnimation(currentTime)
    }
}
