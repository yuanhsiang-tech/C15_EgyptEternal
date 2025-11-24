//@Created by AndyYang
import { _decorator, Sprite, IAssembler, IRenderData, RenderData, SpriteFrame, dynamicAtlasManager } from "cc"
const { ccclass, property, menu } = _decorator

@ccclass('FlipSprite')
@menu('ExtendedSprite/FlipSprite')
export class FlipSprite extends Sprite {
    @property({
        tooltip: "水平翻轉",
        displayName: "Flip X"
    })
    get isFlipX(): boolean {
        return this.m_isFlipX
    }
    set isFlipX(value: boolean) {
        this.m_isFlipX = value
        this._flushAssembler()
    }

    @property({
        tooltip: "垂直翻轉",
        displayName: "Flip Y"
    })
    get isFlipY(): boolean {
        return this.m_isFlipY
    }
    set isFlipY(value: boolean) {
        this.m_isFlipY = value
        this._flushAssembler()
    }

    @property({
        visible: false
    })
    private m_isFlipX: boolean = false

    @property({
        visible: false
    })
    private m_isFlipY: boolean = false

    protected _flushAssembler() {
        const assembler = this.GetAssembler()

        if (this._assembler !== assembler) {
            this.destroyRenderData()
            this._assembler = assembler
        }

        if (!this.renderData) {
            if (this._assembler && this._assembler.createData) {
                this._renderData = this._assembler.createData(this)
                this.renderData!.material = this.getRenderMaterial(0)
                this.markForUpdateRenderData()
                if (this.spriteFrame) {
                    this._assembler.updateUVs(this)
                }
                this._updateColor()
            }
        }

        if (this._spriteFrame) {
            if (this._type === Sprite.Type.SLICED) {
                this._spriteFrame.on(SpriteFrame.EVENT_UV_UPDATED, (this as any)._updateUVs, this)
            } else {
                this._spriteFrame.off(SpriteFrame.EVENT_UV_UPDATED, (this as any)._updateUVs, this)
            }
        }
    }

    private GetAssembler() {
        let assembler = Sprite.Assembler.getAssembler(this)

        if (this._type === Sprite.Type.SIMPLE) {
            if (this.m_isFlipX && this.m_isFlipY) {
                assembler = FlipSimpleAssembler_XY
            } else if (this.m_isFlipX) {
                assembler = FlipSimpleAssembler_X
            } else if (this.m_isFlipY) {
                assembler = FlipSimpleAssembler_Y
            } else {
                assembler = FlipSimpleBase
            }
        }

        return assembler
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////// Assembler /////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
const QUAD_INDICES = Uint16Array.from([0, 1, 2, 1, 3, 2])

const FlipSimpleBase: IAssembler = {
    createData(sprite: Sprite) {
        const renderData = sprite.requestRenderData()
        renderData.dataLength = 4
        renderData.resize(4, 6)
        renderData.chunk.setIndexBuffer(QUAD_INDICES)
        return renderData
    },

    updateRenderData(sprite: Sprite) {
        const frame = sprite.spriteFrame

        dynamicAtlasManager.packToDynamicAtlas(sprite, frame)
        this.updateUVs(sprite)

        const renderData = sprite.renderData
        if (renderData && frame) {
            if (renderData.vertDirty) {
                this.updateVertexData(sprite)
            }
            renderData.updateRenderData(sprite, frame)
        }
    },

    updateWorldVerts(sprite: Sprite, chunk: any) {
        const renderData = sprite.renderData!
        const vData = chunk.vb

        const dataList: IRenderData[] = renderData.data
        const node = sprite.node
        const m = node.worldMatrix

        const stride = renderData.floatStride
        let offset = 0
        const length = dataList.length
        for (let i = 0; i < length; i++) {
            const curData = dataList[i]
            const x = curData.x
            const y = curData.y
            let rhw = m.m03 * x + m.m07 * y + m.m15
            rhw = rhw ? 1 / rhw : 1

            offset = i * stride
            vData[offset + 0] = (m.m00 * x + m.m04 * y + m.m12) * rhw
            vData[offset + 1] = (m.m01 * x + m.m05 * y + m.m13) * rhw
            vData[offset + 2] = (m.m02 * x + m.m06 * y + m.m14) * rhw
        }
    },

    fillBuffers(sprite: Sprite, renderer: any) {
        if (sprite === null) {
            return
        }

        const renderData = sprite.renderData!
        const chunk = renderData.chunk
        if ((sprite as any)._flagChangedVersion !== (sprite.node as any).flagChangedVersion || renderData.vertDirty) {
            this.updateWorldVerts(sprite, chunk)
            renderData.vertDirty = false
            ;(sprite as any)._flagChangedVersion = (sprite.node as any).flagChangedVersion
        }

        const vidOrigin = chunk.vertexOffset
        const meshBuffer = chunk.meshBuffer
        const ib = chunk.meshBuffer.iData
        let indexOffset = meshBuffer.indexOffset

        const vid = vidOrigin

        ib[indexOffset++] = vid
        ib[indexOffset++] = vid + 1
        ib[indexOffset++] = vid + 2
        ib[indexOffset++] = vid + 1
        ib[indexOffset++] = vid + 3
        ib[indexOffset++] = vid + 2

        meshBuffer.indexOffset += 6
    },

    updateVertexData(sprite: Sprite) {
        const renderData: RenderData | null = sprite.renderData
        if (!renderData) {
            return
        }

        const uiTrans = sprite.node._uiProps.uiTransformComp!
        const dataList: IRenderData[] = renderData.data
        const cw = uiTrans.width
        const ch = uiTrans.height
        const appX = uiTrans.anchorX * cw
        const appY = uiTrans.anchorY * ch
        let l = 0
        let b = 0
        let r = 0
        let t = 0
        if (sprite.trim) {
            l = -appX
            b = -appY
            r = cw - appX
            t = ch - appY
        } else {
            const frame = sprite.spriteFrame!
            const originSize = frame.originalSize
            const ow = originSize.width
            const oh = originSize.height
            const scaleX = cw / ow
            const scaleY = ch / oh
            const trimmedBorder = frame.trimmedBorder
            l = trimmedBorder.x * scaleX - appX
            b = trimmedBorder.z * scaleY - appY
            r = cw + trimmedBorder.y * scaleX - appX
            t = ch + trimmedBorder.w * scaleY - appY
        }

        dataList[0].x = l
        dataList[0].y = b

        dataList[1].x = r
        dataList[1].y = b

        dataList[2].x = l
        dataList[2].y = t

        dataList[3].x = r
        dataList[3].y = t

        renderData.vertDirty = true
    },

    updateUVs(sprite: Sprite) {
        // 基礎版本，不翻轉
        if (!sprite.spriteFrame) return

        try {
            const renderData = sprite.renderData!
            const vData = renderData.chunk.vb
            const uv = sprite.spriteFrame.uv
            vData[3] = uv[0]
            vData[4] = uv[1]
            vData[12] = uv[2]
            vData[13] = uv[3]
            vData[21] = uv[4]
            vData[22] = uv[5]
            vData[30] = uv[6]
            vData[31] = uv[7]
        } catch (err) {
            let errorMsg: string = ""
            if(typeof err === 'object' && err instanceof Error) {
                errorMsg = err.stack ?? err.message
            } else if(typeof err === 'string') {
                errorMsg = err
            }
            globalThis.sendReport?.(`sprite-update-uvs-error: ${errorMsg} node path: ${sprite.node.getPathInHierarchy()} spriteFrame is valid: ${sprite.spriteFrame?.isValid} spriteFrame uuid: ${sprite.spriteFrame?.uuid}`, true)
        }
    },

    updateColor(sprite: Sprite) {
        const renderData = sprite.renderData!
        const vData = renderData.chunk.vb
        let colorOffset = 5
        const color = sprite.color
        const colorR = color.r / 255
        const colorG = color.g / 255
        const colorB = color.b / 255
        const colorA = sprite.node._uiProps.opacity
        for (let i = 0; i < 4; i++, colorOffset += renderData.floatStride) {
            vData[colorOffset] = colorR
            vData[colorOffset + 1] = colorG
            vData[colorOffset + 2] = colorB
            vData[colorOffset + 3] = colorA
        }
    }
}

const FlipSimpleAssembler_X: IAssembler = Object.assign({}, FlipSimpleBase, {
    updateUVs(sprite: Sprite) {
        if (!sprite.spriteFrame) return

        try {
            const renderData = sprite.renderData!
            const vData = renderData.chunk.vb
            const uv = sprite.spriteFrame.uv
            
            // FlipX: 交換左右的 UV
            // 原始順序: [left-bottom, right-bottom, left-top, right-top]
            // FlipX 順序: [right-bottom, left-bottom, right-top, left-top]
            vData[3] = uv[2]
            vData[4] = uv[3]
            vData[12] = uv[0]
            vData[13] = uv[1]
            vData[21] = uv[6]
            vData[22] = uv[7]
            vData[30] = uv[4]
            vData[31] = uv[5]
        } catch (err) {
            let errorMsg: string = ""
            if(typeof err === 'object' && err instanceof Error) {
                errorMsg = err.stack ?? err.message
            } else if(typeof err === 'string') {
                errorMsg = err
            }
            globalThis.sendReport?.(`sprite-update-uvs-error: ${errorMsg} node path: ${sprite.node.getPathInHierarchy()} spriteFrame is valid: ${sprite.spriteFrame?.isValid} spriteFrame uuid: ${sprite.spriteFrame?.uuid}`, true)
        }
    }
})

const FlipSimpleAssembler_Y: IAssembler = Object.assign({}, FlipSimpleBase, {
    updateUVs(sprite: Sprite) {
        if (!sprite.spriteFrame) return

        try {
            const renderData = sprite.renderData!
            const vData = renderData.chunk.vb
            const uv = sprite.spriteFrame.uv
            
            // FlipY: 交換上下的 UV
            // 原始順序: [left-bottom, right-bottom, left-top, right-top]
            // FlipY 順序: [left-top, right-top, left-bottom, right-bottom]
            vData[3] = uv[4]
            vData[4] = uv[5]
            vData[12] = uv[6]
            vData[13] = uv[7]
            vData[21] = uv[0]
            vData[22] = uv[1]
            vData[30] = uv[2]
            vData[31] = uv[3]
        } catch (err) {
            let errorMsg: string = ""
            if(typeof err === 'object' && err instanceof Error) {
                errorMsg = err.stack ?? err.message
            } else if(typeof err === 'string') {
                errorMsg = err
            }
            globalThis.sendReport?.(`sprite-update-uvs-error: ${errorMsg} node path: ${sprite.node.getPathInHierarchy()} spriteFrame is valid: ${sprite.spriteFrame?.isValid} spriteFrame uuid: ${sprite.spriteFrame?.uuid}`, true)
        }
    }
})

const FlipSimpleAssembler_XY: IAssembler = Object.assign({}, FlipSimpleBase, {
    updateUVs(sprite: Sprite) {
        if (!sprite.spriteFrame) return

        try {
            const renderData = sprite.renderData!
            const vData = renderData.chunk.vb
            const uv = sprite.spriteFrame.uv
            
            // FlipX + FlipY: 交換左右 + 上下的 UV
            // 原始順序: [left-bottom, right-bottom, left-top, right-top]
            // FlipX+Y 順序: [right-top, left-top, right-bottom, left-bottom]
            vData[3] = uv[6]
            vData[4] = uv[7]
            vData[12] = uv[4]
            vData[13] = uv[5]
            vData[21] = uv[2]
            vData[22] = uv[3]
            vData[30] = uv[0]
            vData[31] = uv[1]
        } catch (err) {
            let errorMsg: string = ""
            if(typeof err === 'object' && err instanceof Error) {
                errorMsg = err.stack ?? err.message
            } else if(typeof err === 'string') {
                errorMsg = err
            }
            globalThis.sendReport?.(`sprite-update-uvs-error: ${errorMsg} node path: ${sprite.node.getPathInHierarchy()} spriteFrame is valid: ${sprite.spriteFrame?.isValid} spriteFrame uuid: ${sprite.spriteFrame?.uuid}`, true)
        }
    }
})

