import {
    _decorator, Component, Sprite, SpriteFrame, error, Enum
} from 'cc'
import { Resource } from '../Define/ResourceDefine'
import { Bundle } from '../Bundle/Bundle'
const { ccclass, property, disallowMultiple } = _decorator

export enum NewTagType {
    GREEN = 1,
    PURPLE = 2,
}

export const NewTagMap: Map<NewTagType, string> = new Map([
    [NewTagType.GREEN, Resource.Img.NewTag.GREEN],
    [NewTagType.PURPLE, Resource.Img.NewTag.PURPLE],
])

@ccclass('NewTag')
@disallowMultiple
export class NewTag extends Component {
    @property({
        type: Sprite,
        displayName: 'NewTagSprite',
    })
    private m_newTagSprite: Sprite = null

    @property({
        type: Enum(NewTagType),
        displayName: 'TagType',
    })
    private m_tagType: NewTagType = NewTagType.GREEN

    protected onLoad(): void {
        this.ShowNewTag(this.m_tagType)
    }

    public ShowNewTag(newTag: NewTagType): void {
        this.node.active = true
        this.m_tagType = newTag
        // Set sprite frame based on tag type
        if (this.m_newTagSprite && NewTagMap.get(this.m_tagType)) {
            const newTagSprite = NewTagMap.get(this.m_tagType)
            Bundle.Resources.Load(newTagSprite, SpriteFrame, (err: Error, spriteFrame: SpriteFrame) => {
                if (err) {
                    error(err)
                } else {
                    this.m_newTagSprite.spriteFrame = spriteFrame
                }
            })
        }
    }
}