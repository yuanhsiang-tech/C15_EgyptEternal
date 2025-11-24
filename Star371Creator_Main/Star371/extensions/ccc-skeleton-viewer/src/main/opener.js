const { dialog } = require('electron');
const Fs = require('fs');
const Path = require('path');
const EditorAdapter = require('../common/editor-adapter');
const { print, translate } = require('../eazax/editor-main-util');
const MainEvent = require('../eazax/main-event');
const PanelManager = require('./panel-manager');

/**
 * 资源检索器
 */
const Opener = {

    /**
     * 编辑器选择
     * @param {'asset' | 'node'} type 
     * @param {string[]} uuids 
     */
    async identifySelection(type, uuids) {
        if (type === 'asset') {         // 选中资源
            Opener.identifyByUuids(uuids);
        } else if (type === 'node') {   // 选中节点
            const skeletonUuid = await Opener.querySkeletonOnNode(uuids[0]);
            if (skeletonUuid) {
                Opener.identifyByUuids([skeletonUuid]);
            } else {
                Opener.updateView(null);
            }
        } else {
            Opener.updateView(null);
        }
    },

    /**
     * 检查编辑器当前选中
     */
    checkEditorCurSelection() {
        const type = EditorAdapter.Selection.getSelectedType(),
            uuids = EditorAdapter.Selection.getSelected(type);
        if (type && uuids && uuids.length > 0) {
            Opener.identifySelection(type, uuids);
        } else {
            Opener.updateView(null);
        }
    },

    /**
     * 查找节点上引用的骨骼资源
     * @param {string} nodeUuid 
     * @returns {Promise<string>} 
     */
    async querySkeletonOnNode(nodeUuid) {
        const node = await Editor.Message.request('scene', 'query-node', nodeUuid);
        if (node && node['__comps__']) {
            const components = node['__comps__'];
            for (let i = 0; i < components.length; i++) {
                if (components[i].type === 'sp.Skeleton') {
                    const uuid = components[i].value.skeletonData.value.uuid;
                    return (uuid !== '' ? uuid : null);
                }
            }
        }
        return null;
    },

    /**
     * 选择本地文件
     */
    async selectLocalFiles() {
        // 弹窗选择文件
        const result = await dialog.showOpenDialog({
            filters: [{
                name: translate('skeletonAssets'),
                extensions: ['json', 'skel', 'png', 'atlas'],
            }],
            properties: ['openFile', 'multiSelections'],
            message: translate('selectAssets'),
        });
        // 取消
        if (!result || result.canceled) {
            return;
        }
        // 识别选择的文件路径（兼容不同版本的 Electron）
        const paths = result.filePaths || result;
        Opener.identifyByPaths(paths);
    },

    /**
     * 通过 uuid 识别资源
     * @param {string[]} uuids 
     */
    async identifyByUuids(uuids) {
        // 资源路径
        let skeletonPath, texturePath, atlasPath;
        // 遍历选中的资源 uuid
        for (let i = 0; i < uuids.length; i++) {
            const assetInfo = await EditorAdapter.getAssetInfoByUuid(uuids[0]),
                { type, file } = assetInfo;
            if (type === 'sp.SkeletonData') {
                skeletonPath = file;   // 骨骼资源
            } else if (type === 'cc.ImageAsset') {
                texturePath = file; // 纹理资源
            } else if (file.endsWith('.atlas') || file.endsWith('.txt')) {
                atlasPath = file;   // 图集资源
            }
            // 只识别一套资源
            if (skeletonPath && texturePath && atlasPath) {
                break;
            }
        }
        // 未选中骨骼资源
        // if (!skeletonPath) {
        //     return;
        // }
        // 无效
        if (!skeletonPath && !texturePath && !atlasPath) {
            Opener.updateView(null);
            return;
        }
        // 处理路径
        const paths = { skeletonPath, texturePath, atlasPath };
        const assets = Opener.collectAssets(paths);
        Opener.updateView(assets);
    },

    /**
     * 通过路径识别资源
     * @param {string[]} paths 
     */
    identifyByPaths(paths) {
        // 资源路径
        let skeletonPath, texturePath, atlasPath;
        // 遍历选中的文件路径
        for (let i = 0; i < paths.length; i++) {
            const path = paths[i],
                extname = Path.extname(path);
            switch (extname) {
                case '.json':
                case '.skel': {
                    skeletonPath = path;
                    break;
                }
                case '.png': {
                    texturePath = path;
                    break;
                }
                case '.atlas':
                case '.txt': {
                    atlasPath = path;
                    break;
                }
            }
            // 只识别一套资源
            if (skeletonPath && texturePath && atlasPath) {
                break;
            }
        }
        // 未选中骨骼资源
        // if (!skeletonPath) {
        //     print('warn', translate('noSkeleton'));
        //     return;
        // }
        // 无效
        if (!skeletonPath && !texturePath && !atlasPath) {
            // print('warn', translate('noSkeleton'));
            return;
        }
        // 处理路径
        paths = { skeletonPath, texturePath, atlasPath };
        const assets = Opener.collectAssets(paths);
        Opener.updateView(assets);
    },

    /**
     * 收集资源
     * @param {{ skeletonPath: string, texturePath: string, atlasPath: string }} paths 资源路径
     */
    collectAssets(paths) {
        let { skeletonPath, texturePath, atlasPath } = paths;
        const testPath = skeletonPath || texturePath || atlasPath;
        // 骨骼资源
        if (!skeletonPath) {
            skeletonPath = Opener.getRelatedFile(testPath, 'json');
            if (!skeletonPath) skeletonPath = Opener.getRelatedFile(testPath, 'skel');
            if (!skeletonPath) return null;
        }
        // 圖集資源
        if (!atlasPath) {
            // 先找同名
            atlasPath = Opener.getRelatedFile(skeletonPath, 'atlas');
            if (!atlasPath) atlasPath = Opener.getRelatedFile(skeletonPath, 'txt');
            if (!atlasPath) atlasPath = Opener.getRelatedFile(skeletonPath, 'atlas.txt');
            // 如果還是找不到，嘗試找同資料夾唯一一個 atlas
            if (!atlasPath) {
                const dir = Path.dirname(skeletonPath);
                const files = Fs.readdirSync(dir);
                const atlasFiles = files.filter(f => f.endsWith('.atlas') || f.endsWith('.txt') || f.endsWith('.atlas.txt'));
                if (atlasFiles.length === 1) {
                    atlasPath = Path.join(dir, atlasFiles[0]);
                }
            }
            if (!atlasPath) return null;
        }
        // 纹理资源（合圖自動補齊）
        if (!texturePath && atlasPath) {
            try {
                const atlasText = Fs.readFileSync(atlasPath, 'utf-8');
                const lines = atlasText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                const textureName = lines[0];
                const pngPath = Path.join(Path.dirname(atlasPath), textureName);
                if (Fs.existsSync(pngPath)) {
                    texturePath = pngPath;
                }
            } catch (e) {
                // ignore
            }
        }
        if (!texturePath) {
            print('warn', translate('noTexture'));
            return null;
        }
        const skeletonType = Path.extname(skeletonPath);
        const assets = {
            dir: Path.dirname(skeletonPath),
            json: (skeletonType === '.json') ? skeletonPath : undefined,
            skel: (skeletonType === '.skel') ? skeletonPath : undefined,
            png: texturePath,
            atlas: atlasPath,
        };
        return assets;
    },

    /**
     * 查找相关联的文件路径
     * @param {string} filePath 文件路径
     * @param {string} relatedExt 关联文件的扩展名
     * @returns {string}
     */
    getRelatedFile(filePath, relatedExt) {
        const dirPath = Path.join(Path.dirname(filePath), Path.sep),
            basename = Path.basename(filePath, Path.extname(filePath)).replace(/(-pro|-ess|-pma)/, ''),
            basePath = Path.join(dirPath, basename),
            testList = [
                `${basePath}.${relatedExt}`,
                `${basePath}-pma.${relatedExt}`,
                `${basePath}-pro.${relatedExt}`,
                `${basePath}-ess.${relatedExt}`
            ];
        for (let i = 0; i < testList.length; i++) {
            if (Fs.existsSync(testList[i])) {
                return testList[i];
            }
        }
        return null;
    },

    /**
     * 更新视图
     * @param {{ dir: string, json: string, atlas: string, png: string } | null} assets 
     */
    updateView(assets) {
        const webContents = PanelManager.getViewPanelWebContents();
        if (webContents) {
            MainEvent.send(webContents, 'assets-selected', assets);
        }
    },

};

module.exports = Opener;
