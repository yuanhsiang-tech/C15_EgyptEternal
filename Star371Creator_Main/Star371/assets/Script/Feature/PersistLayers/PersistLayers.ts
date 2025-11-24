import { isValid, director, Node, RenderRoot2D } from 'cc';
import { NodeUtils } from 'db://assets/Stark/FuncUtils/NodeUtils';
import AligningPersistRoot, { AligningPersistRootMode, AligningPersistRootResize, AligningPersistRootType } from '../../Toolkit/Align/AligningPersistRoot';

//----------------------------------------------------------------

interface LayerOptions
{
    Name        :string;
    AlignType   :AligningPersistRootType;
    AlignMode   :AligningPersistRootMode;
    ResizeType  :AligningPersistRootResize;
}

//----------------------------------------------------------------

let _layers: Map<number, Node> = null;

function LayerMap(): Map<number, Node> {
    return _layers || (_layers = new Map<number, Node>());
}

//----------------------------------------------------------------

/**
 * 常駐圖層管理
 */
export namespace PersistLayers {

    /**
     * 設定選項
     */
    export type SetupOptions = Partial<LayerOptions>;

    /**
     * 是否存在指定 ZIndex 的 PersistLayer
     */
    export function Has(zIndex: number): boolean {
        const layerMap = LayerMap();
        return layerMap.has( zIndex );
    }

    /**
     * 取得指定 ZIndex 的 PersistLayer
     */
    export function Layer(zIndex: number): Node {
        const layerMap = LayerMap();

        if (!layerMap.has( zIndex )) {
            const name = `z${zIndex}`;
            const persistNode = new Node( `persist.${name}` );
            director.addPersistRootNode( persistNode );
            persistNode.setSiblingIndex( zIndex );

            // 設定為 2D 渲染節點
            NodeUtils.InstallComponent( persistNode , RenderRoot2D );

            // 對齊至畫布中心, 並隨著畫布大小變化
            const align = NodeUtils.InstallComponent( persistNode , AligningPersistRoot );
            align.AlignType = AligningPersistRootType.CANVAS_CENTER;
            align.AlignMode = AligningPersistRootMode.ALIGN_ON_LAYOUT_DEVICE_ORIENTATION;
            align.ResizeType = AligningPersistRootResize.RESIZE_TO_CANVAS;
            align.UpdateAligning( true );

            // 設定到 Map
            layerMap.set( zIndex, persistNode );
        }

        return layerMap.get( zIndex );
    }

    /**
     * 設定 PersistLayer
     * @param options 圖層選項
     */
    export function Setup(zIndex: number, options: PersistLayers.SetupOptions): Node {
        const layer = PersistLayers.Layer( zIndex );

        if (options?.Name) {
            layer.name = `persist.${options.Name}`;
        }

        const align = layer.getComponent( AligningPersistRoot );

        if (isValid( options?.AlignType )) {
            align.AlignType = options.AlignType;
        }

        if (isValid( options?.AlignMode )) {
            align.AlignMode = options.AlignMode;
        }

        if (isValid( options?.ResizeType )) {
            align.ResizeType = options.ResizeType;
        }

        if (align.WillUpdate) {
            align.UpdateAligning( true );
        }

        return layer;
    }

    /**
     * 清空指定 ZIndex 的 PersistLayer
     */
    export function Clear(zIndex: number): void {
        const layerMap = LayerMap();
        if (layerMap.has( zIndex )) {
            const node = layerMap.get( zIndex );
            NodeUtils.DestroyChildren( node );
        }
    }

    /**
     * 清空所有 PersistLayer
     */
    export function ClearAll() {
        const layerMap = LayerMap();
        for (const node of layerMap.values()) {
            NodeUtils.DestroyChildren( node );
        }
    }

    /**
     * 刪除指定 ZIndex 的 PersistLayer
     */
    export function Delete(zIndex: number): void {
        const layerMap = LayerMap();
        if (layerMap.has( zIndex )) {
            const node = layerMap.get( zIndex );
            director.removePersistRootNode( node );
            node.destroy();
            layerMap.delete( zIndex );
        }
    }

    /**
     * 刪除所有 PersistLayer
     */
    export function DeleteAll() {
        const layerMap = LayerMap();
        for (const node of layerMap.values()) {
            director.removePersistRootNode( node );
            node.destroy();
        }

        layerMap.clear();
    }

}
