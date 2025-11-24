//@Created by AndyYang
import { _decorator, ccenum, Sprite, Color, IAssembler, IRenderData, Mat4, RenderData, __private, dynamicAtlasManager, gfx, Node, SpriteFrame, UIRenderer } from "cc";
import { DEBUG, NATIVE } from "cc/env";
const { ccclass, property, menu } = _decorator;

/**
 * 鏡像模式
 */
enum MirrorMode {
    /**
     * 無鏡像
     */
    NONE = 0,
    /**
     * 水平鏡像
     */
    HORIZONTAL = 1,
    /**
     * 垂直鏡像
     */
    VERTICAL = 2,
    /**
     * 水平＋垂直鏡像
     */
    BOTH = 3
}
ccenum( MirrorMode );

@ccclass('MirrorSprite')
@menu('ExtendedSprite/MirrorSprite')
export class MirrorSprite extends Sprite {
    public static MirrorMode = MirrorMode;

    @property( {
        tooltip: "鏡像模式(只支援 Simple 和 Sliced 類型)",
        type: MirrorMode,
        displayName: "Mirror Mode", 
        visible: function(this:MirrorSprite) {
            return this._type == Sprite.Type.SIMPLE || this._type == Sprite.Type.SLICED;
        }
    })
    get mirrorMode(): MirrorMode {
        return this._mirrorMode;
    }
    set mirrorMode( value: MirrorMode ) {
        this._mirrorMode = value;
        this._flushAssembler();
    }

    @property( {
        type: MirrorMode.NONE,
        visible: false
    } )
    private _mirrorMode: MirrorMode = MirrorMode.NONE;

    protected _flushAssembler () {
        const assembler = this.GetAssembler();

        if (this._assembler !== assembler) {
            this.destroyRenderData();
            this._assembler = assembler;
        }

        if (!this.renderData) {
            if (this._assembler && this._assembler.createData) {
                this._renderData = this._assembler.createData(this);
                this.renderData!.material = this.getRenderMaterial(0);
                this.markForUpdateRenderData();
                if (this.spriteFrame) {
                    this._assembler.updateUVs(this);
                }
                this._updateColor();
            }
        }

        if (this._spriteFrame) {
            if (this._type === Sprite.Type.SLICED) {
                this._spriteFrame.on(SpriteFrame.EVENT_UV_UPDATED, (this as any)._updateUVs, this);
            } else {
                this._spriteFrame.off(SpriteFrame.EVENT_UV_UPDATED, (this as any)._updateUVs, this);
            }
        }
    }

    private GetAssembler() {
        let assembler = Sprite.Assembler.getAssembler(this);

        switch (this._type) {
            case Sprite.Type.SIMPLE: {
                switch (this._mirrorMode) {
                    case MirrorMode.HORIZONTAL: {
                        assembler = MirrorSimpleAssembler_H;
                        break;
                    }
                    case MirrorMode.VERTICAL: {
                        assembler = MirrorSimpleAssembler_V;
                        break;
                    }
                    case MirrorMode.BOTH: {
                        assembler = MirrorSimpleAssembler_HV;
                        break;
                    }
                }
                break;
            }
            case Sprite.Type.SLICED: {
                switch (this._mirrorMode) {
                    case MirrorMode.HORIZONTAL: {
                        assembler = MirrorSlicedAssember_H;
                        break;
                    }
                    case MirrorMode.VERTICAL: {
                        assembler = MirrorSlicedAssember_V;
                        break;
                    }
                    case MirrorMode.BOTH: {
                        assembler = MirrorSlicedAssember_HV;
                        break;
                    }
                }
                break;
            }
        }

        return assembler;
    }
}




















































const m = new Mat4();
const tempRenderData: IRenderData[] = [];
for (let i = 0; i < 4; i++) {
    tempRenderData.push({ x: 0, y: 0, z: 0, u: 0, v: 0, color: new Color() });
}

const vfmtPosUvColor = [
    new gfx.Attribute(gfx.AttributeName.ATTR_POSITION,  gfx.Format.RGB32F),
    new gfx.Attribute(gfx.AttributeName.ATTR_TEX_COORD, gfx.Format.RG32F),
    new gfx.Attribute(gfx.AttributeName.ATTR_COLOR,     gfx.Format.RGBA32F),
];

interface RenderComp extends UIRenderer {
    readonly color: Color
    readonly node: Node
    readonly renderData: RenderData|null
    readonly spriteFrame: SpriteFrame
    readonly trim: boolean
}

///////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////// Base /////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
const QUAD_INDICES_COUNT:number = 6;
const SLICED_BASE_VERTEX_COUNT:number = 16;
const MirrorAssembler: IAssembler = {
    createData: null,
    updateVertexData: null,

    _createData (comp: RenderComp, vertexRow:number, vertexCol:number) {
        const renderData: RenderData = RenderData.add(vfmtPosUvColor);
        renderData.initRenderDrawInfo(comp, 0);
        (comp as any)._renderData = renderData;

        renderData.vertexRow = vertexRow;
        renderData.vertexCol = vertexCol;
        renderData.dataLength = renderData.vertexRow * renderData.vertexCol;
        renderData.resize(renderData.dataLength, QUAD_INDICES_COUNT * (renderData.vertexRow - 1) * (renderData.vertexCol - 1));
        this.createQuadIndices(renderData.vertexRow, renderData.vertexCol);
        renderData.chunk.setIndexBuffer(this.QUAD_INDICES);
        return renderData;
    },

    createQuadIndices (vertexRow: number, vertexCol: number) {
        const queue = [];
        for (let r = 0; r < vertexRow-1; ++r) {
            for (let c = 0; c < vertexCol-1; ++c) {
                const start = r * vertexCol + c;
                queue.push(start);
                queue.push(start + 1);
                queue.push(start + vertexCol);
                queue.push(start + 1);
                queue.push(start + vertexCol + 1);
                queue.push(start + vertexCol);
            }
        }
        this.QUAD_INDICES = new Uint16Array(queue);
    },

    updateRenderData (comp: RenderComp) {
        const frame = comp.spriteFrame;
        let format = 35; // RGBA8888 = 35, RGBA4444 = 50
        if(NATIVE)
        {
            jsb.isLowQualityImage !== undefined && ( format = jsb.isLowQualityImage() ? 50 : 35);
        }
        dynamicAtlasManager.packToDynamicAtlas(comp, frame, format);
        this.updateUVs(comp);

        const renderData = comp.renderData;
        if (renderData && frame) {
            const vertDirty = renderData.vertDirty;
            if (vertDirty) {
                this.updateVertexData(comp);
            }
            renderData.updateRenderData(comp, frame);
        }
    },

    fillBuffers (comp: RenderComp) {
        const renderData: RenderData = comp.renderData!;
        const chunk = renderData.chunk;
        if (comp.node.hasChangedFlags || renderData.vertDirty) {
            this.updateWorldVertexData(comp, chunk);
            renderData.vertDirty = false;
        }

        const vid = chunk.vertexOffset;
        const meshBuffer = chunk.meshBuffer;
        const ib = chunk.meshBuffer.iData;
        let indexOffset = meshBuffer.indexOffset;
        for (let r = 0; r < renderData.vertexRow-1; ++r) {
            for (let c = 0; c < renderData.vertexCol-1; ++c) {
                const start = vid + r * renderData.vertexCol + c;
                ib[indexOffset++] = start;
                ib[indexOffset++] = start + 1;
                ib[indexOffset++] = start + renderData.vertexCol;
                ib[indexOffset++] = start + 1;
                ib[indexOffset++] = start + renderData.vertexCol + 1;
                ib[indexOffset++] = start + renderData.vertexCol;
            }
        }

        meshBuffer.indexOffset = indexOffset;
    },

    updateUVs (comp: RenderComp) {
        if (!comp.spriteFrame) return;
        const renderData = comp.renderData!;
        const vCount = renderData.vertexCol * renderData.vertexRow;
        const vData = renderData.chunk.vb;
        const stride = renderData.floatStride;
        const uv = vCount >= SLICED_BASE_VERTEX_COUNT ? comp.spriteFrame.uvSliced : (()=>{
            const uv = comp.spriteFrame.uv;
            const uvList = [];
            for (let i = 0; i < comp.spriteFrame.uv.length; i+=2) {
                uvList.push({u:uv[i], v:uv[i+1]});
            }
            return uvList;
        })()
        const sqrtUV:number = Math.sqrt(uv.length);
        const queue:number[][] = [];

        if (renderData.vertexCol * renderData.vertexRow == uv.length) {
            // [無鏡像]
            const indices:number[] = [];
            for (let i = 0; i < uv.length; i++) {
                indices.push(i);
            }
            queue.push(indices);
        } else if (renderData.vertexCol > sqrtUV && renderData.vertexRow == sqrtUV) {
            // [水平鏡像]
            const indices1:number[] = [];
            const indices2:number[] = [];
            const halfX:number = Math.ceil(renderData.vertexCol / 2);
            for (let row = 0; row < renderData.vertexRow; row++) {
                for (let col = 0; col < halfX; col++) {
                    indices1.push(col + row * renderData.vertexCol);
                    indices2.push((renderData.vertexCol * (row + 1) - 1) - col);
                }
            }
            queue.push(indices1, indices2);
        } else if (renderData.vertexCol == sqrtUV && renderData.vertexRow > sqrtUV) {
            // [垂直鏡像]
            const indices1:number[] = [];
            const indices2:number[] = [];
            const halfY:number = Math.ceil(renderData.vertexRow / 2);
            const center:number = (halfY-1) * renderData.vertexCol;
            for (let row = 0; row < halfY; row++) {
                const rowCount:number = row * halfY;
                for (let col = 0; col < renderData.vertexCol; col++) {
                    const begin:number = center + col;
                    indices1.push(begin + rowCount);
                    indices2.push(begin - rowCount);
                }
            }
            queue.push(indices1, indices2);
        } else {
            // [水平＋垂直鏡像]
            const indices1:number[] = [];
            const indices2:number[] = [];
            const indices3:number[] = [];
            const indices4:number[] = [];
            const halfY:number = Math.ceil(renderData.vertexRow / 2);
            const halfX:number = Math.ceil(renderData.vertexCol / 2);
            const center1:number = (halfY-1) * renderData.vertexCol;
            const center2:number = center1 + (renderData.vertexCol - 1);
            for (let row = 0; row < halfY; row++) {
                const rowCount:number = row * renderData.vertexCol;
                for (let col = 0; col < halfX; col++) {
                    const begin1:number = center1 + col;
                    const begin2:number = center2 - col;
                    indices1.push(begin1 + rowCount);
                    indices2.push(begin1 - rowCount);
                    indices3.push(begin2 + rowCount);
                    indices4.push(begin2 - rowCount);
                }
            }
            queue.push(indices1, indices2, indices3, indices4);
        }

        queue.forEach(indices=>{
            for (let i = 0; i < uv.length; i++) {
                const uvOffset:number = 3 + indices[i] * stride;
                vData[uvOffset] = uv[i].u;
                vData[uvOffset+1] = uv[i].v;
            }
        })
    },

    updateWorldVertexData (comp: RenderComp, chunk: __private._cocos_2d_renderer_static_vb_accessor__StaticVBChunk) {
        const node = comp.node;
        node.getWorldMatrix(m);

        const renderData = comp.renderData!;
        const stride = renderData.floatStride;
        const dataList: IRenderData[] = renderData.data;
        const vData = chunk.vb;

        for (let i = 0; i < dataList.length; i++) {
            const x = dataList[i].x;
            const y = dataList[i].y;
            let rhw = m.m03 * x + m.m07 * y + m.m15;
            rhw = rhw ? Math.abs(1 / rhw) : 1;
            const offset = i * stride;
            vData[offset + 0] = (m.m00 * x + m.m04 * y + m.m12) * rhw;
            vData[offset + 1] = (m.m01 * x + m.m05 * y + m.m13) * rhw;
            vData[offset + 2] = (m.m02 * x + m.m06 * y + m.m14) * rhw;
        }
    },

    updateColor (comp: RenderComp) {
        const renderData = comp.renderData!;
        const vData = renderData.chunk.vb;
        const stride = renderData.floatStride;
        const color = comp.color;
        const colorR = color.r / 255;
        const colorG = color.g / 255;
        const colorB = color.b / 255;
        const colorA = comp.node._uiProps.opacity;

        for (let i = 0; i < renderData.vertexRow * renderData.vertexCol; i++) {
            let colorOffset = 5 + i * stride;
            vData[colorOffset] = colorR;
            vData[colorOffset + 1] = colorG;
            vData[colorOffset + 2] = colorB;
            vData[colorOffset + 3] = colorA;
        }
    }
};

///////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////// Simple ////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
const SIMPLE_NORMAL_COUNT = 2;
const SIMPLE_MIRROR_COUNT = 3;
const SIMPLE_BASE = Object.assign({}, MirrorAssembler, {
    updateVertexData (comp: RenderComp) {
        const renderData: RenderData | null = comp.renderData;
        if (!renderData) {
            return;
        }
    
        const dataList: IRenderData[] = renderData.data;
        const uiTrans = comp.node._uiProps.uiTransformComp!;
        const width = uiTrans.width;
        const height = uiTrans.height;
        const appX = uiTrans.anchorX * width;
        const appY = uiTrans.anchorY * height;
    
        if (comp.trim) {
            tempRenderData[0].x = tempRenderData[2].x = -appX;
            tempRenderData[0].y = tempRenderData[1].y = -appY;
            tempRenderData[1].x = tempRenderData[3].x = width - appX;
            tempRenderData[2].y = tempRenderData[3].y = height - appY;
        } else {
            const frame = comp.spriteFrame!;
            const originSize = frame.originalSize;
            const ow = originSize.width;
            const oh = originSize.height;
            const scaleX = width / ow;
            const scaleY = height / oh;
            const trimmedBorder = frame.trimmedBorder;
            tempRenderData[0].x = tempRenderData[2].x = trimmedBorder.x * scaleX - appX;
            tempRenderData[0].y = tempRenderData[1].y = trimmedBorder.z * scaleY - appY;
            tempRenderData[1].x = tempRenderData[3].x = width + trimmedBorder.y * scaleX - appX;
            tempRenderData[2].y = tempRenderData[3].y = height + trimmedBorder.w * scaleY - appY;
        }
    
        let halfValue:number;
        let centerIndex:number;
        let center:number;
    
        {
            halfValue = (tempRenderData[3].x - tempRenderData[0].x) * 0.5;
            centerIndex = renderData.vertexCol == SIMPLE_MIRROR_COUNT ? (renderData.vertexCol - 1) / 2 : 0;
            center = renderData.vertexCol == SIMPLE_MIRROR_COUNT ? centerIndex + 1 : renderData.vertexCol;
            
            for (let col = 0; col < center; col++) {
                for (let row = 0; row < renderData.vertexRow; row++) {
                    const index = col + row * renderData.vertexCol;
                    dataList[index].x = tempRenderData[col].x;
    
                    if (renderData.vertexCol == SIMPLE_MIRROR_COUNT) {
                        if (col == 1) {
                            dataList[index].x = dataList[index].x - halfValue;
                        }
                    }
                }
            }
    
            if (renderData.vertexCol == SIMPLE_MIRROR_COUNT) {
                for (let col = center; col < renderData.vertexCol; col++) {
                    for (let row = 0; row < renderData.vertexRow; row++) {
                        const index:number = col + row * renderData.vertexCol;
                        const localCenterIndex:number = centerIndex + row * renderData.vertexCol;
                        const localCenter = dataList[localCenterIndex];
                        const mirrorIndex:number = localCenterIndex + (localCenterIndex - index);
                        dataList[index].x = localCenter.x + (localCenter.x - dataList[mirrorIndex].x);
                    }
                }
            }
        }
    
        {
            halfValue = (tempRenderData[3].y - tempRenderData[0].y) * 0.5;
            center = renderData.vertexRow == SIMPLE_MIRROR_COUNT ? (renderData.vertexRow - 1) / 2 : 0;
            centerIndex = center * renderData.vertexCol;
    
            for (let row = 0; row < renderData.vertexRow-center; row++) {
                for (let col = 0; col < renderData.vertexCol; col++) {
                    const index:number = col + (row+center) * renderData.vertexCol;
                    dataList[index].y = tempRenderData[row * 2].y;
    
                    if (renderData.vertexRow == SIMPLE_MIRROR_COUNT) {
                        if (row == 0) {
                            dataList[index].y = dataList[index].y + halfValue;
                        }
                    }
                }
            }
    
            if (renderData.vertexRow == SIMPLE_MIRROR_COUNT) {
                for (let row = 0; row < renderData.vertexRow-center-1; row++) {
                    for (let col = 0; col < renderData.vertexCol; col++) {
                        const index:number = col + row * renderData.vertexCol;
                        const localCenterIndex:number = centerIndex + col;
                        const localCenter = dataList[localCenterIndex];
                        const mirrorIndex:number = localCenterIndex - (index - localCenterIndex);
                        dataList[index].y = localCenter.y - (dataList[mirrorIndex].y - localCenter.y);
                    }
                }
            }
        }
    
        renderData.vertDirty = true;
    }
});

const MirrorSimpleAssembler: IAssembler = DEBUG ? Object.assign({}, SIMPLE_BASE, {
    createData (comp: RenderComp) {
        return this._createData(comp, SIMPLE_NORMAL_COUNT, SIMPLE_NORMAL_COUNT);
    }
}) : null;

const MirrorSimpleAssembler_H: IAssembler = Object.assign({}, SIMPLE_BASE, {
    createData (comp: RenderComp) {
        return this._createData(comp, SIMPLE_NORMAL_COUNT, SIMPLE_MIRROR_COUNT);
    }
})

const MirrorSimpleAssembler_V: IAssembler = Object.assign({}, SIMPLE_BASE, {
    createData (comp: RenderComp) {
        return this._createData(comp, SIMPLE_MIRROR_COUNT, SIMPLE_NORMAL_COUNT);
    }
})

const MirrorSimpleAssembler_HV: IAssembler = Object.assign({}, SIMPLE_BASE, {
    createData (comp: RenderComp) {
        return this._createData(comp, SIMPLE_MIRROR_COUNT, SIMPLE_MIRROR_COUNT);
    }
})

///////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////// Sliced ////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
const SLICED_NORMAL_COUNT:number = 4;
const SLICED_MIRROR_COUNT:number = 7;
const SLICED_BASE = Object.assign({}, MirrorAssembler, {
    updateVertexData (comp: RenderComp) {
        const renderData: RenderData = comp.renderData!;
        if (!renderData) {
            return;
        }

        const dataList: IRenderData[] = renderData.data;
        const uiTrans = comp.node._uiProps.uiTransformComp!;
        const width = uiTrans.width;
        const height = uiTrans.height;
        const appX = uiTrans.anchorX * width;
        const appY = uiTrans.anchorY * height;

        const frame = comp.spriteFrame!;
        const leftWidth = frame.insetLeft;
        const rightWidth = frame.insetRight;
        const topHeight = frame.insetTop;
        const bottomHeight = frame.insetBottom;

        let sizableWidth = width - leftWidth - rightWidth;
        let sizableHeight = height - topHeight - bottomHeight;
        let xScale = width / (leftWidth + rightWidth);
        let yScale = height / (topHeight + bottomHeight);
        xScale = (Number.isNaN(xScale) || xScale > 1) ? 1 : xScale;
        yScale = (Number.isNaN(yScale) || yScale > 1) ? 1 : yScale;
        sizableWidth = sizableWidth < 0 ? 0 : sizableWidth;
        sizableHeight = sizableHeight < 0 ? 0 : sizableHeight;

        tempRenderData[0].x = -appX;
        tempRenderData[0].y = -appY;
        tempRenderData[1].x = leftWidth * xScale - appX;
        tempRenderData[1].y = bottomHeight * yScale - appY;
        tempRenderData[2].x = tempRenderData[1].x + sizableWidth;
        tempRenderData[2].y = tempRenderData[1].y + sizableHeight;
        tempRenderData[3].x = width - appX;
        tempRenderData[3].y = height - appY;

        let halfValue:number;
        let centerIndex:number;
        let center:number;

        {
            halfValue = (tempRenderData[3].x - tempRenderData[0].x) * 0.5;
            centerIndex = renderData.vertexCol == SLICED_MIRROR_COUNT ? (renderData.vertexCol - 1) / 2 : 0;
            center = renderData.vertexCol == SLICED_MIRROR_COUNT ? centerIndex + 1 : renderData.vertexCol;

            for (let col = 0; col < center; col++) {
                for (let row = 0; row < renderData.vertexRow; row++) {
                    const index = col + row * renderData.vertexCol;
                    dataList[index].x = tempRenderData[col].x;

                    if (renderData.vertexCol == SLICED_MIRROR_COUNT) {
                        if (col != 0 && col != 1) {
                            dataList[index].x = dataList[index].x - halfValue;
                            if (dataList[index-1].x > dataList[index].x) {
                                dataList[index].x = dataList[index-1].x = (dataList[index-1].x + dataList[index].x) / 2;
                            }
                        }
                    }
                }
            }

            if (renderData.vertexCol == SLICED_MIRROR_COUNT) {
                for (let col = center; col < renderData.vertexCol; col++) {
                    for (let row = 0; row < renderData.vertexRow; row++) {
                        const index:number = col + row * renderData.vertexCol;
                        const localCenterIndex:number = centerIndex + row * renderData.vertexCol;
                        const localCenter = dataList[localCenterIndex];
                        const mirrorIndex:number = localCenterIndex + (localCenterIndex - index);
                        dataList[index].x = localCenter.x + (localCenter.x - dataList[mirrorIndex].x);
                    }
                }
            }
        }

        {
            halfValue = (tempRenderData[3].y - tempRenderData[0].y) * 0.5;
            center = renderData.vertexRow == SLICED_MIRROR_COUNT ? (renderData.vertexRow - 1) / 2 : 0;
            centerIndex = center * renderData.vertexCol;

            for (let row = 0; row < renderData.vertexRow-center; row++) {
                for (let col = 0; col < renderData.vertexCol; col++) {
                    const index:number = col + (row+center) * renderData.vertexCol;
                    dataList[index].y = tempRenderData[row].y;

                    if (renderData.vertexRow == SLICED_MIRROR_COUNT) {
                        if (row == 0 || row == 1) {
                            dataList[index].y = dataList[index].y + halfValue;
                        } else if (row == 2 && dataList[index].y < dataList[index-renderData.vertexCol].y) {
                            dataList[index].y = dataList[index-renderData.vertexCol].y = (dataList[index-renderData.vertexCol].y + dataList[index].y) / 2;
                        }
                    }
                }
            }

            if (renderData.vertexRow == SLICED_MIRROR_COUNT) {
                for (let row = 0; row < renderData.vertexRow-center-1; row++) {
                    for (let col = 0; col < renderData.vertexCol; col++) {
                        const index:number = col + row * renderData.vertexCol;
                        const localCenterIndex:number = centerIndex + col;
                        const localCenter = dataList[localCenterIndex];
                        const mirrorIndex:number = localCenterIndex - (index - localCenterIndex);
                        dataList[index].y = localCenter.y - (dataList[mirrorIndex].y - localCenter.y);
                    }
                }
            }
        }

        renderData.vertDirty = true;
    },
});

const MirrorSlicedAssember: IAssembler = DEBUG ? Object.assign({}, SLICED_BASE, {
    createData (comp: RenderComp) {
        return this._createData(comp, SLICED_NORMAL_COUNT, SLICED_NORMAL_COUNT);
    }
}) : null;

const MirrorSlicedAssember_H: IAssembler = Object.assign({}, SLICED_BASE, {
    createData (comp: RenderComp) {
        return this._createData(comp, SLICED_NORMAL_COUNT, SLICED_MIRROR_COUNT);
    }
})

const MirrorSlicedAssember_V: IAssembler = Object.assign({}, SLICED_BASE, {
    createData (comp: RenderComp) {
        return this._createData(comp, SLICED_MIRROR_COUNT, SLICED_NORMAL_COUNT);
    }
})

const MirrorSlicedAssember_HV: IAssembler = Object.assign({}, SLICED_BASE, {
    createData (comp: RenderComp) {
        return this._createData(comp, SLICED_MIRROR_COUNT, SLICED_MIRROR_COUNT);
    }
})