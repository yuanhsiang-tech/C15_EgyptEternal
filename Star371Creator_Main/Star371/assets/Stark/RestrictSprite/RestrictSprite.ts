import { UITransform } from 'cc';
import { _decorator, Sprite, SpriteFrame, Size, Enum} from 'cc';
const {ccclass, property, requireComponent, executeInEditMode, menu} = _decorator;

enum RestrictMode {
    WIDTH,      // 限制寬
    HEIGHT,     // 限制高
    BOTH        // 同時限制寬、高
}
Enum(RestrictMode)

@ccclass('RestrictSprite')
@menu('ExtendedSprite/RestrictSprite')
@executeInEditMode
@requireComponent(UITransform)
export default class RestrictSprite extends Sprite {
    public static Mode = RestrictMode;

    @property({serializable:true, visible:false})
    private m_mode: RestrictMode = RestrictMode.BOTH;

    @property({
        type:RestrictMode, 
        displayName: "Mode",
    })
    public get Mode(): RestrictMode { return this.m_mode; }
    public set Mode(value:RestrictMode) { this.m_mode = value; this._applySpriteSize(); }

    private UpdateRestriction(targetSize: Size) {
        if (!!this._spriteFrame) {
            const spriteFrame:SpriteFrame = this._spriteFrame;
            const height:number = spriteFrame.height;
            const width:number = spriteFrame.width;
            const transform:UITransform = this.getComponent(UITransform);

            this.sizeMode = Sprite.SizeMode.CUSTOM;
            switch (this.m_mode) {
                case RestrictMode.WIDTH: {
                    // [限制寬] => 高等比例縮放
                    const scale:number = targetSize.width / width;
                    transform.width = targetSize.width;
                    transform.height = height * scale;
                    break;
                }
                case RestrictMode.HEIGHT: {
                    // [限制高] => 寬等比例縮放
                    const scale:number = targetSize.height / height;
                    transform.width = width * scale;
                    transform.height = targetSize.height;
                    break;
                }
                default: {
                    // [同時限制寬高] => 寬高直接等於最終值
                    transform.setContentSize(targetSize);
                    break;
                }
            }
        }
    }

    private _applySpriteSize() {
        const targetSize:Size = this.node._uiProps.uiTransformComp.contentSize;
        super['_applySpriteSize']();
        this.UpdateRestriction(targetSize);
    }
}
