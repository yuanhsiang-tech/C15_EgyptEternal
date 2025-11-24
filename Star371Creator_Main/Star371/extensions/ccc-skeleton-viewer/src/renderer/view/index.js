module.exports = (function () {
    'use strict';

    const { shell } = require('electron');
    const Path = require('path');
    const Fs = require('fs');
    const I18n = require('../../eazax/i18n');
    const RendererEvent = require('../../eazax/renderer-event');
    const EditorRendererKit = require('../../eazax/editor-renderer-kit');
    const { hexToRGB } = require('../../eazax/color-util');
    const SpineRuntime = require('../../common/spine-runtime');
    const EditorAdapter = require('../../common/editor-adapter');

    /** 当前语言 */
    const LANG = EditorAdapter.getLanguage();

    /**
     * i18n
     * @param {string} key
     * @returns {string}
     */
    const translate = (key) => I18n.translate(LANG, key);

    // 元素
    let canvas = null,
        layout = null,
        properties = null;
    // 元素观察者
    let resizeObserver = null;
    // 环境
    let gl = null,
        shader = null,
        batcher = null,
        mvp = null,
        skeletonRenderer = null;
    // 调试
    let debugRenderer = null,
        debugShader = null,
        shapeRenderer = null;
    // 骨骼数据
    let skeleton = null,
        bounds = null;
    // 上一帧时间
    let lastFrameTime = null;
    // 拖动
    let isDragging = false,
        clickOffset = [0, 0];

    // 取出 atlas 內所有貼圖名
    function parseAtlasForTextureNames(atlasPath) {
        try {
            const atlasText = Fs.readFileSync(atlasPath, 'utf-8');
            const lines = atlasText.split(/\r?\n/);
            const textureNames = [];
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                // 第一個非空行，或每個空行後的第一個非空行，且不是屬性
                if (line && (i === 0 || lines[i - 1].trim() === '')) {
                    if (!/^(size|format|filter|repeat)/i.test(line)) {
                        textureNames.push(line);
                    }
                }
            }
            return textureNames;
        } catch (e) {
            return [];
        }
    }

    // 构建 Vue 应用
    const App = {

        /**
         * 数据
         */
        data() {
            return {
                // 资源信息
                assets: {
                    dir: null,
                    json: null,
                    skel: null,
                    atlas: null,
                    png: null,
                },
                // 选项
                viewScale: 1.0,
                skin: '',
                animation: '',
                timeScale: 1,
                loop: true,
                premultipliedAlpha: false,
                drawBones: false,
                drawBoundingBoxes: false,
                drawMeshTriangles: false,
                drawPaths: false,
                // 当前运行时版本
                version: 'unknown',
                // 画布颜色
                canvasColor: '#4c4c4c',
                clearColor: [0.3, 0.3, 0.3],
                // 环境
                assetManager: null,
                // 骨骼数据
                skeletonData: null,
                animationState: null,
                skeleton: null,
                bounds: null,
                // 拖动
                dragOffset: [0, 0],
                // 多軌道動畫設定
                trackSettings: Array.from({ length: 10 }, () => ({ animation: '', loop: false })),
                currentTrack: 0,
                showExtendedTracks: false,
                attachSlot: '',
                attachImage: null,
                attachImageUrl: '',
                attachImages: {}, // { slotName: { file, url } }
                currentAttachSlot: '',
                currentAttachFile: null,
                currentAttachUrl: '',
                boneFollowAttachments: [],
                spineList: [], // [{name, nodeId, skeletonIdx, ...}]
                currentSpineIndex: 0,
                // BoneFollow 全域設定
                boneFollowGlobalSettings: {
                    globalScaleMultiplier: 1.0,  // 全域縮放倍率
                    globalRotationOffset: 0,     // 全域旋轉偏移
                    globalPositionOffsetX: 0,    // 全域位置偏移 X
                    globalPositionOffsetY: 0,    // 全域位置偏移 Y
                },
                // Prefab 文件監控
                currentPrefabFile: null,        // 當前載入的 prefab 文件路徑
                currentPrefabMtime: null,       // 當前 prefab 文件的修改時間
                currentPrefabHash: null,        // 當前 prefab 文件的內容 hash
                prefabFileWatcher: null,        // 文件監控器
                prefabAutoReloadEnabled: true,  // 是否啟用自動重載
                // 動畫事件顯示
                animationEvents: [],            // 顯示中的事件列表 [{ id, trackIndex, name, timestamp, opacity }]
                eventIdCounter: 0,              // 事件ID計數器
            };
        },

        /**
         * 计算属性
         */
        computed: {

            /**
             * 皮肤列表
             */
            skins() {
                if (!this.skeletonData || !this.skeletonData.skins) {
                    return [];
                }
                return this.skeletonData.skins.map(v => v.name);
            },

            /**
             * 动画列表
             */
            animations() {
                if (!this.skeletonData || !this.skeletonData.animations) {
                    return [];
                }
                return this.skeletonData.animations.map(v => v.name);
            },

            /**
             * 调试
             */
            debug() {
                return (
                    this.drawBones ||
                    this.drawBoundingBoxes ||
                    this.drawMeshTriangles ||
                    this.drawPaths
                );
            },

            /**
             * 动画时长
             */
            duration() {
                if (!this.animationState) {
                    return 0;
                }
                return this.animationState.getCurrent(0).animation.duration;
            },

            /**
             * 资源信息
             */
            assetsInfo() {
                if (!this.assetManager) {
                    return `💡 ${translate('noAssets')}`;
                };
                let skeletonPath = '',
                    texturePath = '',
                    atlasPath = '';
                for (const path in this.assetManager.assets) {
                    switch (Path.extname(path)) {
                        case '.json':
                        case '.skel': {
                            skeletonPath = path;
                            break;
                        }
                        case '.png': {
                            texturePath = path;
                            break;
                        }
                        case '.atlas': {
                            atlasPath = path;
                            break;
                        }
                    }
                }
                return `💀 [Skeleton]\n· ${skeletonPath}\n\n🖼 [Texture]\n· ${texturePath}\n\n🗺 [Atlas]\n· ${atlasPath}`;
            },

            /**
             * 偏移
             */
            offset() {
                return `(${this.dragOffset[0]}, ${-this.dragOffset[1]})`;
            },

            currentTrackSetting() {
                return this.trackSettings && this.trackSettings[this.currentTrack] ? this.trackSettings[this.currentTrack] : { animation: '', loop: false };
            },

            slots() {
                if (!this.skeletonData || !this.skeletonData.slots) return [];
                return this.skeletonData.slots.map(s => s.name);
            },

            /**
             * 当前 prefab 文件状态信息
             */
            currentPrefabStatus() {
                if (!this.currentPrefabFile) {
                    return '未載入任何 prefab 檔案';
                }
                
                const path = require('path');
                const fileName = path.basename(this.currentPrefabFile);
                const status = this.prefabAutoReloadEnabled ? '監控中' : '已停用';
                const time = this.currentPrefabMtime ? new Date(this.currentPrefabMtime).toLocaleString() : '未知';
                
                return `${fileName} (${status}) - 修改時間: ${time}`;
            },

            /**
             * 可見的動畫事件列表
             */
            visibleEvents() {
                return this.animationEvents.filter(event => event.opacity > 0);
            },

            /**
             * 當前動畫時長
             */
            currentAnimationDuration() {
                if (!this.animationState || !this.currentTrackSetting.animation) {
                    return 0;
                }
                const current = this.animationState.getCurrent(this.currentTrack);
                return current && current.animation ? current.animation.duration : 0;
            },



            /**
             * 當前動畫的所有事件及其時間
             */
            currentAnimationEvents() {
                if (!this.skeletonData || !this.currentTrackSetting.animation) {
                    return [];
                }
                
                // 找到當前動畫
                const currentAnimation = this.skeletonData.animations.find(anim => anim.name === this.currentTrackSetting.animation);
                if (!currentAnimation || !currentAnimation.timelines) {
                    return [];
                }
                
                // 收集所有事件時間線中的事件
                const events = [];
                try {
                    for (const timeline of currentAnimation.timelines) {
                        // 檢查是否為事件時間線
                        if (timeline.constructor.name === 'EventTimeline' || timeline instanceof (spine.EventTimeline || Object)) {
                            // 嘗試不同的 API 格式
                            if (timeline.events) {
                                // 直接從事件陣列獲取
                                for (const event of timeline.events) {
                                    if (event && event.data) {
                                        events.push({
                                            name: event.data.name,
                                            time: event.time || 0
                                        });
                                    }
                                }
                            } else if (timeline.frames && timeline.frames.length > 0) {
                                // 從 frames 和對應的事件獲取
                                const frameCount = timeline.getPropertyId ? timeline.frames.length / timeline.getFrameEntries() : timeline.frames.length;
                                for (let i = 0; i < frameCount; i++) {
                                    const frameIndex = timeline.getFrameEntries ? i * timeline.getFrameEntries() : i;
                                    const time = timeline.frames[frameIndex];
                                    // 嘗試獲取對應的事件資料
                                    if (timeline.events && timeline.events[i]) {
                                        const eventData = timeline.events[i];
                                        events.push({
                                            name: eventData.data ? eventData.data.name : (eventData.name || 'Unknown Event'),
                                            time: time || 0
                                        });
                                    }
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.warn('[currentAnimationEvents] 解析動畫事件時發生錯誤:', error);
                    // 如果解析失敗，返回空陣列
                    return [];
                }
                
                // 按時間排序並去重
                const uniqueEvents = events.filter((event, index, self) => 
                    index === self.findIndex(e => e.name === event.name && e.time === event.time)
                );
                
                return uniqueEvents.sort((a, b) => a.time - b.time);
            },

        },

        /**
         * 监听属性
         */
        watch: {

            /**
             * 当前皮肤
             * @param {string} value 
             */
            skin(value) {
                // 设置皮肤
                this.setSkin(value);
            },

            /**
             * 当前动画
             * @param {string} value 
             */
            animation(value) {
                // 播放动画
                this.playAnimation(value);
            },

            /**
             * 时间缩放
             * @param {number} value 
             */
            timeScale(value) {
                value = parseFloat(value) || 0;
                this.setTimeScale(value);
            },

            /**
             * 循环
             * @param {boolean} value 
             */
            loop(value) {
                // 重新播放
                this.playAnimation(this.animation);
            },

            /**
             * 画布颜色
             * @param {string} value 
             */
            canvasColor(value) {
                // 更新画布颜色
                canvas.style.backgroundColor = value;
                // 获取 RGB 格式
                const { r, g, b } = hexToRGB(value);
                // 保存颜色值
                this.clearColor = [r / 255, g / 255, b / 255];
                // 更新 gl 颜色
                if (gl) {
                    gl.clearColor(r / 255, g / 255, b / 255, 1);
                    gl.clear(gl.COLOR_BUFFER_BIT);
                }
            },

            'currentTrackSetting.animation'(value) {
                // 切換動畫時清除之前的事件顯示
                this.clearAllEvents();
                this.playTrack(this.currentTrack);
            },
            'currentTrackSetting.loop'(value) {
                this.playTrack(this.currentTrack);
            },

            currentSpineIndex(val) {
                // 切換 Spine 時，重載畫面
                if (this._prefabNodes) {
                    this.loadSelectedSpine(this._prefabNodes);
                }
            },

        },

        /**
         * 实例函数
         */
        methods: {

            /**
             * 重置
             */
            reset() {
                // 资源信息
                this.assets = null;
                // 选项
                this.viewScale = 1;
                this.skin = '';
                this.animation = '';
                this.timeScale = 1;
                this.loop = true;
                this.premultipliedAlpha = false;
                this.drawBones = false;
                this.drawBoundingBoxes = false;
                this.drawMeshTriangles = false;
                this.drawPaths = false;
                // 当前运行时版本
                this.version = 'unknown';
                // 恢复默认画布颜色
                this.canvasColor = '#2f2f2f';
                // 骨骼数据
                this.skeleton = null;
                this.bounds = null;
                this.skeletonData = null;
                this.animationState = null;
                // 清空画布
                gl && gl.clear(gl.COLOR_BUFFER_BIT);
                // 环境
                shader = null;
                batcher = null;
                mvp = null;
                skeletonRenderer = null;
                if (this.assetManager && typeof this.assetManager.dispose === 'function') {
                    try { this.assetManager.dispose(); } catch(e) {}
                }
                this.assetManager = null;
                // 调试
                debugRenderer = null;
                debugShader = null;
                shapeRenderer = null;
                // 上一帧时间
                lastFrameTime = null;
                // 拖动
                isDragging = false;
                clickOffset = [0, 0];
                this.dragOffset = [0, 0];
                // 多軌道動畫設定
                this.trackSettings = Array.from({ length: 10 }, () => ({ animation: '', loop: false }));
                this.currentTrack = 0;
                this.attachImages = {}; // 清空已掛載圖片
                this.boneFollowAttachments = [];
                // 重置 BoneFollow 全域設定
                this.boneFollowGlobalSettings = {
                    globalScaleMultiplier: 1.0,
                    globalRotationOffset: 0,
                    globalPositionOffsetX: 0,
                    globalPositionOffsetY: 0,
                };
                // 停止文件監控
                this.stopPrefabFileWatcher();
                // 清除所有動畫事件
                this.clearAllEvents();
            },

            /**
             * 計算文件 hash
             * @param {string} filePath 
             * @returns {string}
             */
            calculateFileHash(filePath) {
                try {
                    const crypto = require('crypto');
                    const fs = require('fs');
                    const data = fs.readFileSync(filePath);
                    return crypto.createHash('md5').update(data).digest('hex');
                } catch (err) {
                    console.warn('[calculateFileHash] 計算文件 hash 失敗:', err);
                    return null;
                }
            },

            /**
             * 取得文件修改時間
             * @param {string} filePath 
             * @returns {number|null}
             */
            getFileModificationTime(filePath) {
                try {
                    const fs = require('fs');
                    const stats = fs.statSync(filePath);
                    return stats.mtime.getTime();
                } catch (err) {
                    console.warn('[getFileModificationTime] 取得文件修改時間失敗:', err);
                    return null;
                }
            },

            /**
             * 啟動 prefab 文件監控
             * @param {string} filePath 
             */
            startPrefabFileWatcher(filePath) {
                this.stopPrefabFileWatcher(); // 先停止之前的監控
                
                if (!this.prefabAutoReloadEnabled || !filePath) {
                    return;
                }

                try {
                    const fs = require('fs');
                    const path = require('path');
                    
                    // 確保檔案存在
                    if (!fs.existsSync(filePath)) {
                        console.warn('[startPrefabFileWatcher] 檔案不存在:', filePath);
                        return;
                    }

                    this.currentPrefabFile = filePath;
                    this.currentPrefabMtime = this.getFileModificationTime(filePath);
                    this.currentPrefabHash = this.calculateFileHash(filePath);

                    // 開始監控檔案變更
                    this.prefabFileWatcher = fs.watch(filePath, (eventType, filename) => {
                        if (eventType === 'change') {
                            // 延遲一點時間再檢查，避免文件還在寫入中
                            setTimeout(() => {
                                this.checkAndReloadPrefab(filePath);
                            }, 500);
                        }
                    });

                    EditorRendererKit.print('info', `[Prefab Monitor] 開始監控檔案變更: ${path.basename(filePath)}`);
                    
                } catch (err) {
                    console.error('[startPrefabFileWatcher] 啟動文件監控失敗:', err);
                    EditorRendererKit.print('error', `[Prefab Monitor] 無法監控檔案: ${err.message}`);
                }
            },

            /**
             * 停止 prefab 文件監控
             */
            stopPrefabFileWatcher() {
                if (this.prefabFileWatcher) {
                    try {
                        this.prefabFileWatcher.close();
                        EditorRendererKit.print('info', '[Prefab Monitor] 已停止檔案監控');
                    } catch (err) {
                        console.warn('[stopPrefabFileWatcher] 停止監控失敗:', err);
                    }
                    this.prefabFileWatcher = null;
                }
                this.currentPrefabFile = null;
                this.currentPrefabMtime = null;
                this.currentPrefabHash = null;
            },

            /**
             * 檢查並重新載入 prefab（如果有變更）
             * @param {string} filePath 
             */
            async checkAndReloadPrefab(filePath) {
                if (!this.prefabAutoReloadEnabled) {
                    return;
                }

                try {
                    const fs = require('fs');
                    
                    // 確保檔案存在
                    if (!fs.existsSync(filePath)) {
                        EditorRendererKit.print('warn', '[Prefab Monitor] 檔案已被刪除，停止監控');
                        this.stopPrefabFileWatcher();
                        return;
                    }

                    const newMtime = this.getFileModificationTime(filePath);
                    const newHash = this.calculateFileHash(filePath);

                    // 比較修改時間和 hash
                    if (newMtime !== this.currentPrefabMtime || newHash !== this.currentPrefabHash) {
                        EditorRendererKit.print('info', '[Prefab Monitor] 檢測到檔案變更，正在重新載入...');
                        
                        // 更新記錄
                        this.currentPrefabMtime = newMtime;
                        this.currentPrefabHash = newHash;

                        // 重新載入 prefab
                        const prefabText = fs.readFileSync(filePath, 'utf-8');
                        const prefabData = JSON.parse(prefabText);
                        
                        // 重新處理 prefab
                        await this.handlePrefabAutoLoad(prefabData);
                        
                        EditorRendererKit.print('success', '[Prefab Monitor] 檔案重新載入完成');
                    }
                } catch (err) {
                    console.error('[checkAndReloadPrefab] 重新載入失敗:', err);
                    EditorRendererKit.print('error', `[Prefab Monitor] 重新載入失敗: ${err.message}`);
                }
            },

            /**
             * 檢查 prefab 檔案是否需要重新載入（用於重新選擇同一檔案時）
             * @param {File} file 
             * @returns {boolean}
             */
            async shouldReloadPrefab(file) {
                if (!this.currentPrefabFile || !file) {
                    return true; // 第一次載入或無法比較，直接載入
                }

                // 嘗試從 file 取得路徑
                let filePath = null;
                if (file.path) {
                    filePath = file.path;
                } else if (file.webkitRelativePath) {
                    filePath = file.webkitRelativePath;
                } else {
                    // 如果無法取得路徑，比較檔案名稱和大小
                    const fileName = file.name;
                    const fileSize = file.size;
                    const currentFileName = require('path').basename(this.currentPrefabFile);
                    const currentFileSize = this.getFileSize(this.currentPrefabFile);
                    
                    if (fileName === currentFileName && fileSize === currentFileSize) {
                        // 檔案名稱和大小相同，比較修改時間（如果可用）
                        if (file.lastModified && this.currentPrefabMtime) {
                            if (file.lastModified !== this.currentPrefabMtime) {
                                EditorRendererKit.print('info', '[Prefab Check] 檔案時間戳不同，將重新載入');
                                return true;
                            } else {
                                EditorRendererKit.print('info', '[Prefab Check] 檔案時間戳相同，跳過重新載入');
                                return false;
                            }
                        }
                        return false; // 無法判斷，認為沒有變更
                    }
                    return true; // 不同檔案
                }

                // 如果是同一個檔案路徑
                if (this.currentPrefabFile === filePath) {
                    const currentMtime = this.getFileModificationTime(filePath);
                    const currentHash = this.calculateFileHash(filePath);
                    
                    // 比較修改時間和內容
                    if (currentMtime !== this.currentPrefabMtime || currentHash !== this.currentPrefabHash) {
                        EditorRendererKit.print('info', '[Prefab Check] 檢測到同一檔案已變更，將重新載入');
                        return true;
                    } else {
                        EditorRendererKit.print('info', '[Prefab Check] 檔案內容無變更，跳過重新載入');
                        return false;
                    }
                }

                return true; // 不同檔案，需要載入
            },

            /**
             * 取得文件大小
             * @param {string} filePath 
             * @returns {number|null}
             */
            getFileSize(filePath) {
                try {
                    const fs = require('fs');
                    const stats = fs.statSync(filePath);
                    return stats.size;
                } catch (err) {
                    console.warn('[getFileSize] 取得文件大小失敗:', err);
                    return null;
                }
            },

            /**
             * 從文件輸入中提取實際文件路徑
             * @param {File} file 
             * @returns {string|null}
             */
            extractFilePath(file) {
                if (!file) return null;
                
                // Electron 環境下，檔案可能有 path 屬性
                if (file.path) {
                    return file.path;
                }
                
                // 如果是透過拖拽或其他方式，可能有 webkitRelativePath
                if (file.webkitRelativePath) {
                    return file.webkitRelativePath;
                }
                
                // 無法取得完整路徑
                return null;
            },

            /**
             * 翻译
             * @param {string} key 
             */
            t(key) {
                return translate(key);
            },

            /**
             * 资源信息按钮点击回调
             */
            onInfoBtnClick() {
                if (!this.assets || !this.assets.dir) {
                    return;
                }
                const { dir, json, skel } = this.assets,
                    skeletonPath = Path.join(dir, (json || skel));
                // 在资源管理器中展示 spine 文件
                shell.showItemInFolder(skeletonPath)
            },

            /**
             * 选择资源按钮点击回调
             */
            onSelectBtnClick() {
                // 顯示選擇菜單：Spine資源 或 Prefab檔案
                const { Menu } = require('electron').remote || require('@electron/remote');
                const menu = Menu.buildFromTemplate([
                    {
                        label: '選擇 Spine 骨骼動畫資源',
                        click: () => {
                            // （主进程）选择资源
                            RendererEvent.send('select');
                        }
                    },
                    {
                        label: '選擇 Prefab 檔案',
                        click: () => {
                            // 觸發隱藏的 prefab file input
                            this.$refs.prefabFileInput && this.$refs.prefabFileInput.click();
                        }
                    }
                ]);
                menu.popup();
            },

            /**
             * 重置按钮点击回调
             */
            onResetBtnClick() {
                this.reset();
            },

            /**
             * 复位按钮点击回调
             */
            onRepositionBtnClick() {
                isDragging = false;
                clickOffset = [0, 0];
                this.dragOffset = [0, 0];
            },

            /**
             * 获取 Spine 运行时
             */
            getRuntime() {
                // 资源对应的 Spine 运行时版本
                let version = this.getAssetSpineVersion(this.assets.json || this.assets.skel);
                if (!version) {
                    // RendererUtil.print('warn', translate('noVersion'));
                    // return false;
                    console.warn('Unable to identify Spine version of asset!');
                    // 默认使用 3.8 的 Runtime
                    version = "3.8";
                }
                // 处理版本号（保留前两个分量）
                version = version.split('.').slice(0, 2).map(v => parseInt(v)).join('.');
                // 获取目标版本的 Spine 运行时对象
                const spine = SpineRuntime.get(version);
                if (!spine) {
                    const content = `${translate('noSpineRuntime')} | ${translate('version')}: ${version}`;
                    EditorRendererKit.print('warn', content);
                    return false;
                }
                window.spine = spine;
                this.version = spine.version;
                return true;
            },

            /**
             * 获取资源对应的 Spine 运行时版本
             * @param {string} path 文件路径
             * @returns {string}
             */
            getAssetSpineVersion(path) {
                const fullPath = Path.join((this.assets.dir || ''), path);
                if (!Fs.existsSync(fullPath)) {
                    return null;
                }
                const extname = Path.extname(path);
                if (extname === '.json') {
                    const data = JSON.parse(Fs.readFileSync(fullPath, 'utf-8'));
                    if (data.skeleton) {
                        return data.skeleton.spine;
                    }
                } else if (extname === '.skel') {
                    return '3.8';
                }
                return null;
            },

            /**
             * 初始化 Spine 运行时
             */
            initRuntime() {
                // 获取画布
                if (!canvas) {
                    canvas = this.$refs.canvas;
                }
                // WebGL
                if (!gl) {
                    const config = { alpha: false };
                    gl = canvas.getContext("webgl", config);
                    if (!gl) {
                        EditorRendererKit.print('warn', translate('noWebGL'));
                        return;
                    }
                    const color = this.clearColor;
                    gl.clearColor(color[0], color[1], color[2], 1);
                }

                // Shader
                shader = spine.webgl.Shader.newTwoColoredTextured(gl);
                // 处理器
                batcher = new spine.webgl.PolygonBatcher(gl);
                // MVP 变换矩阵
                mvp = new spine.webgl.Matrix4();
                mvp.ortho2d(0, 0, canvas.width - 1, canvas.height - 1);
                // 骨骼渲染器
                skeletonRenderer = new spine.webgl.SkeletonRenderer(gl);

                // 用于调试的 debugRenderer、debugShader 和 shapeRenderer
                debugRenderer = new spine.webgl.SkeletonDebugRenderer(gl);
                debugShader = spine.webgl.Shader.newColored(gl);
                shapeRenderer = new spine.webgl.ShapeRenderer(gl);

                // 资源管理器
                this.assetManager = new spine.webgl.AssetManager(gl);
            },

            /**
             * 加载资源
             */
            loadAssets() {
                const assetManager = this.assetManager;
                if (!assetManager) {
                    return;
                }
                const assets = this.assets;
                // 指定资源目录前缀
                if (assets.dir) {
                    assetManager.pathPrefix = assets.dir;
                }
                // 骨骼数据
                if (assets.json) {
                    // JSON
                    assetManager.loadText(assets.json);
                } else if (assets.skel) {
                    // skel（二进制）
                    assetManager.loadBinary(assets.skel);
                } else {
                    EditorRendererKit.print('warn', translate('noSkeletonData'));
                    return;
                }
                // 解析 atlas 取得所有貼圖名，並預先載入
                if (assets.atlas) {
                    const atlasFullPath = Path.isAbsolute(assets.atlas) ? assets.atlas : Path.join(assets.dir, assets.atlas);
                    const textureNames = parseAtlasForTextureNames(atlasFullPath);
                    // 註解掉過多的debug訊息
                    // console.log('[Spine Debug] assets.dir:', assets.dir);
                    // console.log('[Spine Debug] atlas:', assets.atlas);
                    // console.log('[Spine Debug] 解析到貼圖:', textureNames);
                    textureNames.forEach(textureName => {
                        const texturePath = Path.join(assets.dir, textureName);
                        // console.log('[Spine Debug] 嘗試載入貼圖:', textureName, '=>', texturePath, '存在:', Fs.existsSync(texturePath));
                        if (Fs.existsSync(texturePath)) {
                            assetManager.loadTexture(textureName); // 必須用 atlas 內的原始路徑
                        } else {
                            EditorRendererKit.print('warn', `Atlas 指定的貼圖檔案不存在: ${textureName}（實際路徑: ${texturePath}）`);
                        }
                    });
                    // 若 assets.png 未指定，預設用第一個貼圖名
                    if ((!assets.png || !Fs.existsSync(Path.join(assets.dir, assets.png))) && textureNames.length > 0) {
                        assets.png = textureNames[0];
                    }
                }
                // 图集和纹理
                if (assetManager.loadTextureAtlas) {
                    // spine runtime 3.6+
                    // loadTextureAtlas 内部会自动加载纹理
                    assetManager.loadTextureAtlas(assets.atlas);
                } else {
                    // spine runtime 3.5
                    assetManager.loadText(assets.atlas);
                    assetManager.loadTexture(assets.png);
                }
                // 是否开启纹理预乘
                if (assets.png && Path.basename(assets.png).includes('pma') ||
                    Path.basename(assets.atlas).includes('pma')) {
                    this.premultipliedAlpha = true;
                }
                // 等待加载
                requestAnimationFrame(this.loading);
            },

            /**
             * 等待加载
             */
            loading() {
                if (!this.assetManager) {
                    return;
                }
                if (this.assetManager.isLoadingComplete()) {
                    const result = this.loadSkeleton();
                    if (!result) {
                        this.reset();
                        return;
                    }
                    if (this.skins && this.skins[0]) {
                        this.setSkin(this.skins[0]);
                    }
                    if (this.animations && this.animations[0]) {
                        this.trackSettings[0].animation = this.animations[0];
                        this.trackSettings[0].loop = true;
                    }
                    this.syncAllTracks();
                    lastFrameTime = Date.now() / 1000;
                    // 關鍵：恢復所有掛載
                    this.restoreAllAttachImages();
                    requestAnimationFrame(this.render);
                } else {
                    requestAnimationFrame(this.loading);
                }
            },

            /**
             * 加载骨骼数据
             */
            loadSkeleton() {
                const assetManager = this.assetManager,
                    assets = this.assets;

                // 图集数据
                let atlas = assetManager.get(assets.atlas);
                if (spine.version === '3.5') {
                    atlas = new spine.TextureAtlas(atlas);
                }
                // 创建 AtlasAttachmentLoader 对象用于处理部位、网格、包围盒和路径
                const atlasLoader = new spine.AtlasAttachmentLoader(atlas);

                try {
                    // 骨骼数据
                    if (assets.json) {
                        // 创建 skeletonJson 对象用于解析 json 文件
                        const skeletonJson = new spine.SkeletonJson(atlasLoader);
                        this.skeletonData = skeletonJson.readSkeletonData(assetManager.get(assets.json));
                    } else if (assets.skel) {
                        // 创建 SkeletonBinary 对象用于解析 skel 文件
                        const skeletonBinary = new spine.SkeletonBinary(atlasLoader);
                        this.skeletonData = skeletonBinary.readSkeletonData(assetManager.get(assets.skel));
                    }
                } catch (error) {
                    console.error(error);
                    EditorRendererKit.print('warn', translate('dataMismatch'));
                    return false;
                }

                // 创建骨骼对象
                this.skeleton = new spine.Skeleton(this.skeletonData);
                // 只在這裡重置一次姿勢
                this.skeleton.setToSetupPose();

                // 计算边界
                this.bounds = this.calculateBounds();

                // 创建 AnimationState 对象用于动画控制
                const animationStateData = new spine.AnimationStateData(this.skeleton.data);
                this.animationState = new spine.AnimationState(animationStateData);

                // 設置事件監聽器
                this.animationState.addListener({
                    event: (trackEntry, event) => {
                        this.onAnimationEvent(trackEntry.trackIndex, event);
                    }
                });

                // 初始化多軌道動畫設定
                this.trackSettings = Array.from({ length: 10 }, () => ({ animation: '', loop: false }));
                this.currentTrack = 0;

                // Done
                return true;
            },

            /**
             * 设置皮肤
             * @param {string} name 
             */
            setSkin(name) {
                if (!this.skeleton) {
                    return;
                }
                this.skin = name;
                // 设置皮肤
                this.skeleton.setSkinByName(name);
                // 重置姿势
                this.skeleton.setSlotsToSetupPose();
                // 修正：切換 skin 後自動恢復自訂圖片/Label
                this.restoreAllAttachImages();
            },

            /**
             * 播放动画
             * @param {string} name 
             */
            playAnimation(name) {
                if (!this.skeleton) {
                    return;
                }
                this.animation = name;
                // 不再重置姿勢
                // this.skeleton.setToSetupPose();
                // 播放动画
                this.animationState.setAnimation(0, name, this.loop);
            },

            /**
             * 设置时间缩放
             * @param {number} value 
             */
            setTimeScale(value) {
                if (!this.skeleton) {
                    return;
                }
                this.animationState.timeScale = value;
            },

            /**
             * 计算边界
             * @returns {{ offset: { x: number, y: number }, size: { x: number, y: number } }}
             */
            calculateBounds() {
                this.skeleton.setToSetupPose();
                this.skeleton.updateWorldTransform();
                const offset = new spine.Vector2(),
                    size = new spine.Vector2();
                this.skeleton.getBounds(offset, size, []);
                return { offset, size };
            },

            /**
             * 渲染骨骼
             */
            render() {
                if (!this.skeleton) {
                    return;
                }
                // 计算帧时间差
                const now = Date.now() / 1000,
                    delta = now - lastFrameTime;
                // 记录当前帧时间
                lastFrameTime = now;

                // 更新 mvp 来适配画布尺寸
                this.resizeView();

                // 清空画布
                gl.clear(gl.COLOR_BUFFER_BIT);

                // 应用动画并根据时间差值更新动画时间
                this.animationState.update(delta);
                this.animationState.apply(this.skeleton);
                // 更新骨骼 Transform
                this.skeleton.updateWorldTransform();

                // --- 新增：每幀同步 boneFollowAttachments ---
                if (this.boneFollowAttachments && this.boneFollowAttachments.length > 0) {
                    for (const info of this.boneFollowAttachments) {
                        const slot = this.skeleton.findSlot(info.slotName);
                        if (!slot) continue;
                        
                        const boneFollowSettings = info.boneFollowSettings;
                        if (!boneFollowSettings) {
                            // 註解掉過多的警告訊息
                            // console.warn(`[Render] Slot ${info.slotName} 沒有 boneFollowSettings`);
                            continue;
                        }
                        
                        // 找到對應的骨骼
                        let bone = slot.bone;  // 預設使用 slot 的 bone
                        if (boneFollowSettings.boneName) {
                            // 如果 BoneFollow 有指定特定的 bone，則使用指定的 bone
                            const targetBone = this.skeleton.findBone(boneFollowSettings.boneName);
                            if (targetBone) {
                                bone = targetBone;
                            }
                        }
                        if (!bone) continue;
                        
                        // 取得基礎位置、旋轉、縮放
                        let x = bone.worldX;
                        let y = bone.worldY;
                        let rotation = (bone.getWorldRotationX && typeof bone.getWorldRotationX === 'function') ? bone.getWorldRotationX() : 0;
                        let scaleX = (bone.getWorldScaleX && typeof bone.getWorldScaleX === 'function') ? bone.getWorldScaleX() : 1;
                        let scaleY = (bone.getWorldScaleY && typeof bone.getWorldScaleY === 'function') ? bone.getWorldScaleY() : 1;
                        
                        // 確保縮放值有效性，避免 NaN
                        if (isNaN(scaleX) || typeof scaleX !== 'number' || scaleX <= 0) {
                            scaleX = 1;
                        }
                        if (isNaN(scaleY) || typeof scaleY !== 'number' || scaleY <= 0) {
                            scaleY = 1;
                        }
                        
                        // 註解掉過多的Debug輸出
                        // if (!info._debugCount) info._debugCount = 0;
                        // if (info._debugCount < 5) {
                        //     console.log(`[Render Debug] Slot: ${info.slotName}`);
                        //     console.log(`  Bone: ${bone.data.name} (${bone.worldX}, ${bone.worldY})`);
                        //     // ... 其他debug訊息
                        // }
                        
                        // 應用 BoneFollow 的位置設定
                        if (boneFollowSettings.followPosition) {
                            x += boneFollowSettings.positionOffset.x || 0;
                            y += boneFollowSettings.positionOffset.y || 0;
                        } else {
                            // 如果不跟隨位置，使用原始偏移
                            x = bone.worldX + (info.offset?.x || 0);
                            y = bone.worldY + (info.offset?.y || 0);
                        }
                        
                        // 應用全域位置偏移
                        x += this.boneFollowGlobalSettings.globalPositionOffsetX;
                        y += this.boneFollowGlobalSettings.globalPositionOffsetY;
                        
                        // 應用 BoneFollow 的旋轉設定
                        if (boneFollowSettings.followRotation) {
                            rotation += boneFollowSettings.rotationFactor || 0;
                        } else {
                            // 如果不跟隨旋轉，使用預設值
                            rotation = 0;
                        }
                        
                        // 應用全域旋轉偏移
                        rotation += this.boneFollowGlobalSettings.globalRotationOffset;
                        
                        // 應用 BoneFollow 的縮放設定
                        if (boneFollowSettings.followScale) {
                            const factorX = boneFollowSettings.scaleFactor.x;
                            const factorY = boneFollowSettings.scaleFactor.y;
                            
                            // 確保縮放因子有效
                            const safeFactorX = (typeof factorX === 'number' && !isNaN(factorX) && factorX > 0) ? factorX : 1;
                            const safeFactorY = (typeof factorY === 'number' && !isNaN(factorY) && factorY > 0) ? factorY : 1;
                            
                            scaleX *= safeFactorX;
                            scaleY *= safeFactorY;
                        } else {
                            // 如果不跟隨縮放，使用基礎縮放
                            const infoScaleX = info.scale?.x;
                            const infoScaleY = info.scale?.y;
                            
                            scaleX = (typeof infoScaleX === 'number' && !isNaN(infoScaleX) && infoScaleX > 0) ? infoScaleX : 1;
                            scaleY = (typeof infoScaleY === 'number' && !isNaN(infoScaleY) && infoScaleY > 0) ? infoScaleY : 1;
                        }
                        
                        // 應用全域縮放倍率
                        scaleX *= this.boneFollowGlobalSettings.globalScaleMultiplier;
                        scaleY *= this.boneFollowGlobalSettings.globalScaleMultiplier;
                        
                        // anchor 修正
                        if (info.anchor) {
                            const anchorOffsetX = (0.5 - info.anchor.x) * info.attachment.width * scaleX;
                            const anchorOffsetY = (0.5 - info.anchor.y) * info.attachment.height * scaleY;
                            
                            x += anchorOffsetX;
                            y += anchorOffsetY;
                        }
                        
                        // 將世界座標轉換為相對於 slot bone 的本地座標
                        const slotBone = slot.bone;
                        let localX = x - slotBone.worldX;
                        let localY = y - slotBone.worldY;
                        
                        // 取得 slotBone 的世界變換
                        const slotBoneRotation = (slotBone.getWorldRotationX && typeof slotBone.getWorldRotationX === 'function') ? slotBone.getWorldRotationX() : 0;
                        const slotBoneScaleX = (slotBone.getWorldScaleX && typeof slotBone.getWorldScaleX === 'function') ? slotBone.getWorldScaleX() : 1;
                        const slotBoneScaleY = (slotBone.getWorldScaleY && typeof slotBone.getWorldScaleY === 'function') ? slotBone.getWorldScaleY() : 1;
                        
                        // 考慮 bone 的旋轉來轉換座標
                        if (slotBoneRotation !== 0) {
                            const rad = -slotBoneRotation * Math.PI / 180;
                            const cos = Math.cos(rad);
                            const sin = Math.sin(rad);
                            const tempX = localX * cos - localY * sin;
                            const tempY = localX * sin + localY * cos;
                            localX = tempX;
                            localY = tempY;
                        }
                        
                        // 考慮 bone 的縮放
                        if (slotBoneScaleX !== 1) localX /= slotBoneScaleX;
                        if (slotBoneScaleY !== 1) localY /= slotBoneScaleY;
                        
                        // 應用到 attachment
                        info.attachment.x = localX;
                        info.attachment.y = localY;
                        info.attachment.rotation = rotation - slotBoneRotation;
                        info.attachment.scaleX = scaleX / slotBoneScaleX;
                        info.attachment.scaleY = scaleY / slotBoneScaleY;
                        
                        // 對於 RegionAttachment，需要設定 width/height 並調用 updateOffset
                        if (info.attachment.updateOffset) {
                            // 保持原始尺寸，不要修改 width 和 height
                            // 縮放由 scaleX 和 scaleY 處理
                            
                            // 重新計算 offset
                            info.attachment.updateOffset();
                        }
                        
                        // 註解掉debug計數
                        // if (info._debugCount < 5) {
                        //     info._debugCount++;
                        // }
                    }
                    
                    // 強制更新 skeleton 的世界變換
                    this.skeleton.updateWorldTransform();
                }

                // 渲染
                // 绑定 shader
                shader.bind();
                // 传递属性
                shader.setUniformi(spine.webgl.Shader.SAMPLER, 0);
                shader.setUniform4x4f(spine.webgl.Shader.MVP_MATRIX, mvp.values);
                // 渲染骨骼
                batcher.begin(shader);
                // 设置 skeletonRenderer 属性
                skeletonRenderer.premultipliedAlpha = this.premultipliedAlpha;
                // 渲染
                skeletonRenderer.draw(batcher, this.skeleton);
                batcher.end();
                // 解除 shader 绑定
                shader.unbind();

                // 调试
                if (this.debug) {
                    // 绑定 shader
                    debugShader.bind();
                    // 传递属性
                    debugShader.setUniform4x4f(spine.webgl.Shader.MVP_MATRIX, mvp.values);
                    // 设置 debugRenderer 属性
                    debugRenderer.premultipliedAlpha = this.premultipliedAlpha;
                    debugRenderer.drawBones = this.drawBones;
                    debugRenderer.drawBoundingBoxes = this.drawBoundingBoxes;
                    debugRenderer.drawRegionAttachments = this.drawBoundingBoxes;
                    debugRenderer.drawMeshHull = this.drawMeshTriangles;
                    debugRenderer.drawMeshTriangles = this.drawMeshTriangles;
                    debugRenderer.drawPaths = this.drawPaths;
                    debugRenderer.drawSkeletonXY = this.drawBones;
                    // 开始渲染
                    shapeRenderer.begin(debugShader);
                    // 渲染
                    debugRenderer.draw(shapeRenderer, this.skeleton);
                    shapeRenderer.end();
                    // 解除 shader 绑定
                    debugShader.unbind();
                }

                // 只保留 colorFollowSlot 跟隨 slot 顏色
                for (let i = 0; i < this.skeleton.slots.length; i++) {
                    const slot = this.skeleton.slots[i];
                    const attachment = slot.attachment;
                    if (attachment && attachment.colorFollowSlot) {
                        const followSlot = this.skeleton.findSlot(attachment.colorFollowSlot);
                        if (followSlot && followSlot.color) {
                            attachment.color.setFromColor(followSlot.color);
                            // 註解掉過多的顏色log
                            // if (!attachment._colorLogOnce) {
                            //     console.log(`[SlotColorFollow] slot:${attachment.colorFollowSlot} color:`, followSlot.color);
                            //     attachment._colorLogOnce = true;
                            // }
                        } else {
                            // 註解掉警告log
                            // if (!attachment._colorLogWarnOnce) {
                            //     console.warn(`[SlotColorFollow] 找不到 slot: ${attachment.colorFollowSlot}`);
                            //     attachment._colorLogWarnOnce = true;
                            // }
                        }
                    }
                }

                // 持续渲染
                requestAnimationFrame(this.render);
            },

            /**
             * 更新视口尺寸
             */
            resizeView() {
                // 更新画布尺寸
                const { clientWidth, clientHeight } = canvas;
                if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
                    canvas.width = clientWidth;
                    canvas.height = clientHeight;
                }
                // 骨骼位置以及缩放
                const canvasWidth = canvas.width,
                    canvasHeight = canvas.height;
                // 计算中心点
                const centerX = (this.bounds.offset.x + (this.bounds.size.x / 2)) || 0,
                    centerY = (this.bounds.offset.y + (this.bounds.size.y / 2)) || 0;
                // 计算缩放比例
                const ratioX = this.bounds.size.x / canvasWidth,
                    ratioY = this.bounds.size.y / canvasHeight;
                let scale = Math.max(ratioX, ratioY) * 1.2;
                if (scale < 1) scale = 1;
                // 自定义缩放
                scale /= this.viewScale;
                // 最终宽高
                const width = canvasWidth * scale,
                    height = canvasHeight * scale;
                // 更新矩阵
                const x = (centerX - (width / 2)) - (this.dragOffset[0] * scale),
                    y = (centerY - (height / 2)) + (this.dragOffset[1] * scale);
                mvp.ortho2d(x, y, width, height);
                // 更新视口
                gl.viewport(0, 0, canvasWidth, canvasHeight);
            },

            /**
             * （主进程）资源旋转回调
             * @param {Electron.ipcRendererEvent} event 
             * @param {{ dir?: string, json?: string, skel?: string, atlas: string, png: string }} assets 资源
             */
            onAssetsSelectedEvent(event, assets) {
                // 重置
                if (this.assets) {
                    this.reset();
                }
                // 延遲新資源載入，確保釋放完成
                setTimeout(() => {
                    if (!assets) return;
                    this.assets = assets;
                    this.processAssetPaths();
                    const result = this.getRuntime();
                    if (!result) return;
                    this.initRuntime();
                    this.loadAssets();
                }, 10);
            },

            /**
             * 处理资源路径
             */
            processAssetPaths() {
                // ⚠️ Spine Runtime 在 Windows 平台下的问题
                // 使用 loadTextureAtlas 加载图集时会自动加载纹理
                // 但是 loadTextureAtlas 内部调用 loadTexture 时传递的 path 是文件名而不是完整路径
                // 如果没有指定 pathPrefix 属性，loadTexture 就会无法正常加载
                // 所以干脆都改为需要指定 pathPrefix 属性
                const assets = this.assets,
                    { dir, json, skel, png, atlas } = assets;
                if (!dir) {
                    assets.dir = Path.dirname(json || skel);
                }
                if (!assets.dir.endsWith(Path.sep)) {
                    assets.dir += Path.sep;
                }
                if (json) {
                    assets.json = Path.basename(json);
                } else if (skel) {
                    assets.skel = Path.basename(skel);
                }
                assets.atlas = Path.basename(atlas);
                assets.png = Path.basename(png);
            },

            /**
             * 画布鼠标滚轮事件回调
             * @param {WheelEvent} event 
             */
            onCanvasMouseWheel(event) {
                if (!this.assets) {
                    return;
                }
                // 当前缩放
                let scale = this.viewScale;
                // 缩放步长
                const step = Math.abs(scale) >= 1 ? 0.1 : 0.05;
                // 方向
                if (event.wheelDelta > 0) {
                    // 向上（放大）
                    scale += step;
                } else {
                    // 向下（缩小）
                    scale -= step;
                }
                // 处理精度
                scale = Math.round(scale * 100) / 100;
                // 设置缩放
                this.viewScale = scale;
            },

            /**
             * 画布鼠标点击事件回调
             * @param {MouseEvent} event 
             */
            onCanvasMouseDown(event) {
                if (!this.assets) {
                    return;
                }
                isDragging = true;
                const x = event.offsetX - this.dragOffset[0],
                    y = event.offsetY - this.dragOffset[1];
                clickOffset = [x, y];
            },

            /**
             * 画布鼠标移动事件回调
             * @param {MouseEvent} event 
             */
            onCanvasMouseMove(event) {
                if (!isDragging) {
                    return;
                }
                const x = event.offsetX - clickOffset[0],
                    y = event.offsetY - clickOffset[1];
                this.dragOffset = [x, y];
            },

            /**
             * 画布鼠标松开事件回调
             * @param {MouseEvent} event 
             */
            onCanvasMouseUp(event) {
                isDragging = false;
                clickOffset = [0, 0];
            },

            /**
             * 画布鼠标离开事件回调
             * @param {MouseEvent} event 
             */
            onCanvasMouseLeave(event) {
                isDragging = false;
                clickOffset = [0, 0];
            },

            /**
             * 布局尺寸变化回调
             */
            onLayoutResize() {
                try {
                    const layoutStyle = layout.style,
                        propertiesStyle = properties.style;
                    if (layout.clientWidth >= 800 || layout.clientHeight < 330) {
                        if (layout.clientWidth >= 350) {
                            // 水平布局
                            layoutStyle.flexDirection = 'row';
                            propertiesStyle.width = '265px';
                            propertiesStyle.marginTop = '0';
                            propertiesStyle.marginLeft = '5px';
                            propertiesStyle.display = 'flex';
                        } else {
                            // 隐藏选项
                            propertiesStyle.display = 'none';
                        }
                    } else {
                        // 垂直布局
                        layoutStyle.flexDirection = 'column';
                        propertiesStyle.width = '100%';
                        propertiesStyle.marginTop = '5px';
                        propertiesStyle.marginLeft = '0';
                        propertiesStyle.display = 'flex';
                    }
                } catch (e) {
                    // 防呆，避免 observer loop error
                    console.warn('[SkeletonViewer] onLayoutResize error:', e);
                }
            },

            /**
             * 切換擴展 track 顯示
             */
            toggleExtendedTracks() {
                this.showExtendedTracks = !this.showExtendedTracks;
            },

            playTrack(trackIndex) {
                if (!this.skeleton) return;
                const setting = this.trackSettings[trackIndex];
                if (!setting || !setting.animation) {
                    this.animationState.clearTrack(trackIndex);
                    return;
                }
                // 不再重置姿勢
                // this.skeleton.setToSetupPose();
                this.animationState.setAnimation(trackIndex, setting.animation, setting.loop);
            },

            syncAllTracks() {
                if (!this.skeleton || !this.animationState) return;
                this.animationState.clearTracks();
                // 清除當前顯示的事件
                this.clearAllEvents();
                // 不再重置姿勢
                // this.skeleton.setToSetupPose();
                this.trackSettings.forEach((setting, trackIndex) => {
                    if (setting.animation) {
                        this.animationState.setAnimation(trackIndex, setting.animation, setting.loop);
                    }
                });
            },

            onAttachImageChange(e) {
                const file = e.target.files[0];
                if (!file) return;
                this.currentAttachFile = file;
                this.currentAttachUrl = URL.createObjectURL(file);
            },

            onAttachSlotChange(e) {
                this.currentAttachSlot = e.target.value;
            },

            async onAttachImage() {
                if (!this.currentAttachFile || !this.currentAttachSlot || !this.skeleton) return;
                // 記錄到 attachImages
                this.attachImages[this.currentAttachSlot] = {
                    file: this.currentAttachFile,
                    url: this.currentAttachUrl
                };
                // 執行掛載
                await this.attachImageToSlot(this.currentAttachSlot, this.currentAttachFile, this.currentAttachUrl);
                // 清空暫存
                this.currentAttachFile = null;
                this.currentAttachUrl = '';
            },

            async attachImageToSlot(slotName, file, url) {
                if (!file || !slotName || !this.skeleton) {
                    EditorRendererKit.print('warn', `[attachImageToSlot] 參數不完整 slot:${slotName} file:${JSON.stringify(file)}`);
                    return;
                }
                
                // 限制 file 物件的 log 輸出長度，避免過長
                const fileForLog = {
                    path: file.path || file.name || 'unknown',
                    type: file.type || 'unknown',
                    hasOffset: !!file.offset,
                    hasScale: !!file.scale,
                    hasAnchor: !!file.anchor,
                    hasBoneFollowSettings: !!file.boneFollowSettings
                };
                EditorRendererKit.print('info', `[attachImageToSlot] 開始 | slot:${slotName} | file:${JSON.stringify(fileForLog)} | url:${url ? 'blob:...' : 'null'}`);
                
                if (!url) {
                    EditorRendererKit.print('error', `[attachImageToSlot] url 參數為空，無法載入圖片`);
                    return;
                }
                
                const img = new window.Image();
                
                try {
                    // 使用 Promise 來處理圖片載入，加入超時和錯誤處理
                    await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => {
                            reject(new Error('圖片載入逾時 (10秒)'));
                        }, 10000); // 10秒超時
                        
                        img.onload = () => {
                            clearTimeout(timeout);
                            if (img.width === 0 || img.height === 0) {
                                reject(new Error(`圖片尺寸異常: ${img.width}x${img.height}`));
                            } else {
                                EditorRendererKit.print('info', `[attachImageToSlot] 圖片載入成功: ${img.width}x${img.height}`);
                                resolve();
                            }
                        };
                        
                        img.onerror = (e) => {
                            clearTimeout(timeout);
                            reject(new Error(`圖片載入失敗: ${e.type || 'unknown error'}`));
                        };
                        
                        img.onabort = (e) => {
                            clearTimeout(timeout);
                            reject(new Error('圖片載入被中止'));
                        };
                        
                        // 設定圖片來源
                        img.src = url;
                    });
                } catch (imgError) {
                    EditorRendererKit.print('error', `[attachImageToSlot] ${imgError.message}`);
                    return;
                }
                
                let tex, region, attachment;
                try {
                    const spine = window.spine;
                    if (!spine || !gl) {
                        throw new Error('Spine runtime 或 WebGL context 尚未初始化');
                    }
                    
                    tex = new spine.webgl.GLTexture(gl, img);
                    region = new spine.TextureRegion();
                    region.texture = tex;
                    region.width = img.width;
                    region.height = img.height;
                    region.u = 0; region.v = 0; region.u2 = 1; region.v2 = 1;
                    region.renderObject = { texture: tex };
                    region.originalWidth = img.width;
                    region.originalHeight = img.height;
                    region.offsetX = 0;
                    region.offsetY = 0;
                    
                    attachment = new spine.RegionAttachment('user-image-' + slotName);
                    attachment.setRegion(region);
                    attachment.region = region;
                    attachment.width = img.width;
                    attachment.height = img.height;
                    attachment.color = new spine.Color(1,1,1,1);
                    attachment.color.a = 1; // 強制不透明
                    
                    // 新增：setRegion 後必須呼叫 updateOffset
                    if (typeof attachment.updateOffset === 'function') {
                        attachment.updateOffset();
                    }
                } catch (spineError) {
                    EditorRendererKit.print('error', `[attachImageToSlot] Spine 物件建立失敗: ${spineError.message}`);
                    return;
                }
                
                const offset = (file && file.offset) ? file.offset : { x: 0, y: 0 };
                const scale = (file && file.scale) ? file.scale : { x: 1, y: 1 };
                let anchor = file && file.anchor;
                if (!anchor || anchor.x === undefined || anchor.y === undefined) {
                    anchor = { x: 0.5, y: 0.5 };
                }
                
                // 處理 BoneFollow 設定
                const boneFollowSettings = file.boneFollowSettings || {
                    boneName: '',
                    followPosition: false,
                    followRotation: false,
                    followScale: false,
                    positionOffset: { x: 0, y: 0 },
                    scaleFactor: { x: 1, y: 1 },
                    rotationFactor: 0,
                    rotationLocalization: false,
                    scaleLocalization: false,
                    cacheAncestors: true
                };
                
                // 先設初值，後續 render 會每幀同步
                attachment.x = offset.x;
                attachment.y = offset.y;
                attachment.scaleX = scale.x;
                attachment.scaleY = scale.y;
                if (anchor) {
                    attachment.x += (0.5 - anchor.x) * img.width * scale.x;
                    attachment.y += (0.5 - anchor.y) * img.height * scale.y;
                }
                if (file && file.colorFollowSlot) {
                    attachment.colorFollowSlot = file.colorFollowSlot;
                }
                
                // 確保數值有效性，避免 NaN
                const safeOffset = {
                    x: (typeof offset.x === 'number' && !isNaN(offset.x)) ? offset.x : 0,
                    y: (typeof offset.y === 'number' && !isNaN(offset.y)) ? offset.y : 0
                };
                const safeScale = {
                    x: (typeof scale.x === 'number' && !isNaN(scale.x) && scale.x > 0) ? scale.x : 1,
                    y: (typeof scale.y === 'number' && !isNaN(scale.y) && scale.y > 0) ? scale.y : 1
                };
                const safeAnchor = {
                    x: (typeof anchor.x === 'number' && !isNaN(anchor.x)) ? anchor.x : 0.5,
                    y: (typeof anchor.y === 'number' && !isNaN(anchor.y)) ? anchor.y : 0.5
                };
                
                // 確保 boneFollowSettings 數值有效性
                if (boneFollowSettings.positionOffset) {
                    boneFollowSettings.positionOffset.x = (typeof boneFollowSettings.positionOffset.x === 'number' && !isNaN(boneFollowSettings.positionOffset.x)) ? boneFollowSettings.positionOffset.x : 0;
                    boneFollowSettings.positionOffset.y = (typeof boneFollowSettings.positionOffset.y === 'number' && !isNaN(boneFollowSettings.positionOffset.y)) ? boneFollowSettings.positionOffset.y : 0;
                }
                if (boneFollowSettings.scaleFactor) {
                    boneFollowSettings.scaleFactor.x = (typeof boneFollowSettings.scaleFactor.x === 'number' && !isNaN(boneFollowSettings.scaleFactor.x) && boneFollowSettings.scaleFactor.x > 0) ? boneFollowSettings.scaleFactor.x : 1;
                    boneFollowSettings.scaleFactor.y = (typeof boneFollowSettings.scaleFactor.y === 'number' && !isNaN(boneFollowSettings.scaleFactor.y) && boneFollowSettings.scaleFactor.y > 0) ? boneFollowSettings.scaleFactor.y : 1;
                }
                
                // 直接用 slotName 掛載
                const slot = this.skeleton.findSlot(slotName);
                if (slot) {
                    try {
                        slot.setAttachment(attachment);
                        if (slot.attachment) {
                            slot.attachment.color = new spine.Color(1,1,1,1);
                            slot.attachment.color.a = 1;
                        }
                        this.skeleton.updateWorldTransform();
                        this.$forceUpdate();
                        
                        // 記錄到 boneFollowAttachments 以便 render 動態同步
                        if (!this.boneFollowAttachments) this.boneFollowAttachments = [];
                        this.boneFollowAttachments.push({
                            slotName,
                            attachment,
                            offset: safeOffset,
                            scale: safeScale,
                            anchor: safeAnchor,
                            boneFollowSettings
                        });
                        
                        EditorRendererKit.print('success', `[attachImageToSlot] 掛載成功 | slot:${slotName} | size:${img.width}x${img.height}`);
                    } catch (attachError) {
                        EditorRendererKit.print('error', `[attachImageToSlot] 掛載到 slot 失敗: ${attachError.message}`);
                    }
                } else {
                    const allSlotNames = this.skeleton.slots.map(s => s.data.name);
                    EditorRendererKit.print('warn', `[attachImageToSlot] 找不到 slot: ${slotName}，可用的 slots: [${allSlotNames.slice(0, 10).join(', ')}${allSlotNames.length > 10 ? '...' : ''}]`);
                }
            },

            async restoreAllAttachImages() {
                // 遍歷所有已掛載圖片，重新掛載
                for (const slotName in this.attachImages) {
                    const { file, url } = this.attachImages[slotName];
                    await this.attachImageToSlot(slotName, file, url);
                }
            },

            removeAttachImage(slotName) {
                if (this.attachImages[slotName]) {
                    delete this.attachImages[slotName];
                    // 移除 slot 上的 attachment
                    if (this.skeleton) {
                        const slot = this.skeleton.findSlot(slotName);
                        if (slot) slot.setAttachment(null);
                    }
                    this.$forceUpdate();
                }
            },

            /**
             * 更新指定 slot 的 BoneFollow 設定
             * @param {string} slotName 
             * @param {object} newSettings 
             */
            updateBoneFollowSettings(slotName, newSettings) {
                if (!this.boneFollowAttachments) return;
                
                const targetInfo = this.boneFollowAttachments.find(info => info.slotName === slotName);
                if (targetInfo && targetInfo.boneFollowSettings) {
                    // 更新設定
                    Object.assign(targetInfo.boneFollowSettings, newSettings);
                    EditorRendererKit.print('info', `[updateBoneFollowSettings] 已更新 slot:${slotName} 的 BoneFollow 設定:`, newSettings);
                }
            },

            /**
             * 取得指定 slot 的 BoneFollow 設定
             * @param {string} slotName 
             * @returns {object}
             */
            getBoneFollowSettings(slotName) {
                if (!this.boneFollowAttachments) return null;
                
                const targetInfo = this.boneFollowAttachments.find(info => info.slotName === slotName);
                return targetInfo ? targetInfo.boneFollowSettings : null;
            },

            /**
             * 處理 prefab 檔案選取
             */
            async onPrefabFileChange(e) {
                const file = e.target.files && e.target.files[0];
                if (!file) return;

                // 檢查是否需要重新載入
                const shouldReload = await this.shouldReloadPrefab(file);
                if (!shouldReload) {
                    // 檔案內容沒有變更，不需要重新載入
                    if (e.target) e.target.value = '';
                    return;
                }

                // 讀取檔案內容
                const text = await file.text();
                let prefabData;
                try {
                    prefabData = JSON.parse(text);
                } catch (err) {
                    EditorRendererKit.print('error', 'Prefab 檔案解析失敗：' + err.message);
                    return;
                }

                // 嘗試取得文件路徑並啟動文件監控
                const filePath = this.extractFilePath(file);
                if (filePath) {
                    this.startPrefabFileWatcher(filePath);
                } else {
                    // 無法取得完整路徑，但仍記錄檔案資訊以便比較
                    EditorRendererKit.print('warn', '[Prefab Monitor] 無法取得檔案完整路徑，將停用自動監控功能');
                    this.currentPrefabFile = file.name; // 只記錄檔案名稱
                    this.currentPrefabMtime = file.lastModified || null;
                    this.prefabAutoReloadEnabled = false; // 停用自動重載
                }

                // 記錄 prefabNodes 以便切換 Spine
                this._prefabNodes = prefabData;
                await this.handlePrefabAutoLoad(prefabData);
                if (e.target) e.target.value = '';
            },

            /**
             * 將 BitmapFont (.fnt) Label 內容渲染成圖片，回傳 blob url
             * @param {Object} labelData
             * @param {string} fntPath
             * @param {string} pngPath
             * @returns {Promise<string>} blob url
             */
            async renderBitmapFontLabelToImage(labelData, fntPath, pngPath) {
                const fs = require('fs');
                // 讀取 fnt 內容
                const fntText = fs.readFileSync(fntPath, 'utf-8');
                // 解析 common, info, charMap, kernings
                const commonMatch = fntText.match(/common\s+lineHeight=(\d+)(?:\s+base=(\d+))?/);
                const lineHeight = commonMatch ? parseInt(commonMatch[1]) : (labelData._fontSize || 32);
                const base = commonMatch && commonMatch[2] ? parseInt(commonMatch[2]) : lineHeight;
                const charMap = {};
                const charLines = fntText.split('\n').filter(l => l.startsWith('char '));
                for (const line of charLines) {
                    const m = line.match(/id=(\d+)\s+x=(\d+)\s+y=(\d+)\s+width=(\d+)\s+height=(\d+)\s+xoffset=(-?\d+)\s+yoffset=(-?\d+)\s+xadvance=(-?\d+)/);
                    if (m) {
                        charMap[parseInt(m[1])] = {
                            x: parseInt(m[2]),
                            y: parseInt(m[3]),
                            width: parseInt(m[4]),
                            height: parseInt(m[5]),
                            xoffset: parseInt(m[6]),
                            yoffset: parseInt(m[7]),
                            xadvance: parseInt(m[8])
                        };
                    }
                }
                // 解析 kernings
                const kerningMap = {};
                const kerningLines = fntText.split('\n').filter(l => l.startsWith('kerning '));
                for (const line of kerningLines) {
                    const m = line.match(/first=(\d+)\s+second=(\d+)\s+amount=(-?\d+)/);
                    if (m) {
                        const first = parseInt(m[1]), second = parseInt(m[2]), amount = parseInt(m[3]);
                        if (!kerningMap[second]) kerningMap[second] = {};
                        kerningMap[second][first] = amount;
                    }
                }
                // 取得 Spacing X
                let spacingX = 0;
                if (typeof labelData._spacingX === 'number') {
                    spacingX = labelData._spacingX;
                }
                // 載入 png
                const img = new window.Image();
                img.src = pngPath;
                await new Promise(res => { img.onload = res; });
                // 計算總寬高（考慮 kerning 與 spacingX）
                const text = labelData._string || '';
                let totalWidth = 0;
                let prevCharCode = null;
                for (const ch of text) {
                    const code = ch.charCodeAt(0);
                    let kerning = 0;
                    if (prevCharCode && kerningMap[code] && kerningMap[code][prevCharCode]) {
                        kerning = kerningMap[code][prevCharCode];
                    }
                    const info = charMap[code];
                    if (info) totalWidth += (info.xadvance + kerning + spacingX);
                    prevCharCode = code;
                }
                if (totalWidth > 0) totalWidth -= spacingX; // 最後一個字不加 spacingX
                const padding = 8;
                const canvas = document.createElement('canvas');
                canvas.width = totalWidth + padding * 2;
                canvas.height = lineHeight + padding * 2;
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                // 拼貼字元
                let x = padding;
                prevCharCode = null;
                let first = true;
                for (const ch of text) {
                    const code = ch.charCodeAt(0);
                    let kerning = 0;
                    if (prevCharCode && kerningMap[code] && kerningMap[code][prevCharCode]) {
                        kerning = kerningMap[code][prevCharCode];
                    }
                    const info = charMap[code];
                    if (!info) { prevCharCode = code; continue; }
                    ctx.drawImage(
                        img,
                        info.x, info.y, info.width, info.height,
                        x + info.xoffset + kerning, padding + info.yoffset,
                        info.width, info.height
                    );
                    x += info.xadvance + kerning;
                    if (!first) x += spacingX;
                    else first = false;
                    prevCharCode = code;
                }
                // 轉成 blob url
                return await new Promise(resolve => {
                    canvas.toBlob(blob => {
                        const url = window.URL.createObjectURL(blob);
                        resolve(url);
                    });
                });
            },

            /**
             * 將一般 Label 內容渲染成圖片，回傳 blob url
             * @param {Object} labelData
             * @returns {Promise<string>} blob url
             */
            async renderLabelToImage(labelData) {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // 取得文字內容和樣式
                const text = labelData._string || '';
                const fontSize = labelData._fontSize || 32;
                const fontFamily = 'Arial, sans-serif'; // 預設字型
                
                // 設定字型
                ctx.font = `${fontSize}px ${fontFamily}`;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                
                // 計算文字尺寸
                const metrics = ctx.measureText(text);
                const textWidth = metrics.width;
                const textHeight = fontSize * 1.2; // 估算行高
                
                // 設定 canvas 尺寸（加上 padding）
                const padding = 8;
                canvas.width = textWidth + padding * 2;
                canvas.height = textHeight + padding * 2;
                
                // 重新設定字型（因為 canvas 尺寸改變會重置樣式）
                ctx.font = `${fontSize}px ${fontFamily}`;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                
                // 設定文字顏色
                ctx.fillStyle = '#ffffff'; // 預設白色
                if (labelData._color && typeof labelData._color === 'object') {
                    const r = Math.round((labelData._color.r || 255) * 255);
                    const g = Math.round((labelData._color.g || 255) * 255);
                    const b = Math.round((labelData._color.b || 255) * 255);
                    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                }
                
                // 繪製文字
                ctx.fillText(text, padding, padding);
                
                // 轉成 blob url
                return await new Promise(resolve => {
                    canvas.toBlob(blob => {
                        const url = window.URL.createObjectURL(blob);
                        resolve(url);
                    });
                });
            },

            /**
             * 處理 prefab 自動掛載主流程
             */
            async handlePrefabAutoLoad(prefabData) {
                // 平台檢測和相容性檢查
                const platform = require('os').platform();
                const isWindows = platform === 'win32';
                const isMac = platform === 'darwin';
                const isLinux = platform === 'linux';
                
                EditorRendererKit.print('info', `[Prefab 載入] 開始處理 prefab，平台: ${platform} | Windows: ${isWindows} | Mac: ${isMac} | Linux: ${isLinux}`);
                
                const prefabNodes = Array.isArray(prefabData) ? prefabData : [];
                if (!prefabNodes.length) {
                    EditorRendererKit.print('error', '[handlePrefabAutoLoad] Prefab 結構異常，無法解析');
                    return;
                }
                // 取得所有 sp.Skeleton
                const skeletons = prefabNodes.filter(n => n.__type__ === 'sp.Skeleton');
                if (!skeletons.length) {
                    EditorRendererKit.print('error', '[handlePrefabAutoLoad] Prefab 未找到 sp.Skeleton 組件');
                    return;
                }
                // 建立 spineList
                this.spineList = skeletons.map((sk, idx) => {
                    const nodeId = sk.node && sk.node.__id__;
                    const node = prefabNodes[nodeId];
                    return {
                        name: node && node._name ? node._name : `Spine${idx+1}`,
                        nodeId,
                        skeletonIdx: idx,
                        skeleton: sk
                    };
                });
                this.currentSpineIndex = 0;
                this._prefabNodes = prefabNodes;
                this._isMultiSpine = (this.spineList.length > 1);
                await this.loadSelectedSpine(prefabNodes);
            },

            async loadSelectedSpine(prefabNodes) {
                this.reset();
                this.attachImages = {};
                this.boneFollowAttachments = [];
                const selected = this.spineList[this.currentSpineIndex];
                if (!selected) return;
                const skeleton = selected.skeleton;
                const skeletonData = skeleton._skeletonData;
                if (!skeletonData || !skeletonData.__uuid__) {
                    EditorRendererKit.print('error', '[handlePrefabAutoLoad] sp.Skeleton 缺少 skeletonData');
                    return;
                }
                const EditorAdapter = require('../../common/editor-adapter');
                let skeletonPath = await EditorAdapter.getPathByUuid(skeletonData.__uuid__);
                if (!skeletonPath) {
                    EditorRendererKit.print('error', `[handlePrefabAutoLoad] 找不到 skeletonData uuid: ${skeletonData.__uuid__} 的資源路徑`);
                    return;
                }
                const Path = require('path');
                const Fs = require('fs');
                const dir = Path.dirname(skeletonPath);
                let atlasPath = null, pngPath = null;
                const files = Fs.readdirSync(dir);
                const baseName = Path.basename(skeletonPath, Path.extname(skeletonPath));
                atlasPath = files.find(f => (f.endsWith('.atlas') || f.endsWith('.txt')) && Path.basename(f, Path.extname(f)) === baseName);
                pngPath = files.find(f => f.endsWith('.png') && Path.basename(f, Path.extname(f)) === baseName);
                if (!atlasPath) atlasPath = files.find(f => f.endsWith('.atlas') || f.endsWith('.txt'));
                if (!pngPath) pngPath = files.find(f => f.endsWith('.png'));
                if (atlasPath) atlasPath = Path.join(dir, atlasPath);
                if (pngPath) pngPath = Path.join(dir, pngPath);
                this.assets = {
                    dir,
                    json: skeletonPath.endsWith('.json') ? Path.basename(skeletonPath) : null,
                    skel: skeletonPath.endsWith('.skel') ? Path.basename(skeletonPath) : null,
                    atlas: Path.basename(atlasPath),
                    png: Path.basename(pngPath),
                };
                this.processAssetPaths();
                const result = this.getRuntime();
                if (!result) return;
                this.initRuntime();
                this.loadAssets();
                setTimeout(async () => {
                    let anim = skeleton.defaultAnimation;
                    if (!anim && this.animations && this.animations.length > 0) {
                        anim = this.animations[0];
                    }
                    if (anim) {
                        this.playAnimation(anim);
                        this.trackSettings[0].animation = anim;
                        this.trackSettings[0].loop = true;
                    }
                    EditorRendererKit.print('info', '[handlePrefabAutoLoad] Spine動畫與資源載入完成，開始掛載圖片到 slot');
                    
                    // 使用智能識別方法取代硬編碼 UUID
                    const boneFollows = this.identifyBoneFollowComponents(prefabNodes);
                    const slotColorFollows = this.identifySlotColorFollowComponents(prefabNodes);
                    const sprites = prefabNodes.filter(n => n.__type__ === 'cc.Sprite');
                    const labels = prefabNodes.filter(n => n.__type__ === 'cc.Label');
                    const uiTransforms = prefabNodes.filter(n => n.__type__ === 'cc.UITransform');
                    
                    // 只保留基本的組件數量資訊
                    EditorRendererKit.print('info', `[Prefab 載入] BoneFollow:${boneFollows.length}, SlotColorFollow:${slotColorFollows.length}, Sprites:${sprites.length}, Labels:${labels.length}`);
                    
                    // 顯示識別到的組件類型（用於debug不同專案的兼容性）
                    if (boneFollows.length > 0) {
                        const sampleBF = boneFollows[0];
                        const detectedProps = Object.keys(sampleBF).filter(key => key.startsWith('m_')).slice(0, 3).join(', ');
                        EditorRendererKit.print('info', `[組件識別] BoneFollow 樣本屬性: ${detectedProps}...`);
                    }
                    
                    // 註解掉詳細的debug訊息
                    // console.log(`[Prefab Debug] 找到的組件數量:`);
                    // console.log(`  BoneFollow: ${boneFollows.length}`);
                    // console.log(`  SlotColorFollow: ${slotColorFollows.length}`);
                    // console.log(`  Sprites: ${sprites.length}`);
                    // console.log(`  Labels: ${labels.length}`);
                    // console.log(`  UITransforms: ${uiTransforms.length}`);
                    
                    // 註解掉 BoneFollow 組件的完整內容輸出
                    // if (boneFollows.length > 0) {
                    //     console.log(`[Prefab Debug] 所有 BoneFollow 組件:`, boneFollows);
                    // }
                    
                    // SlotColorFollow: nodeId -> slotName 對應表
                    const nodeIdToSlotColor = {};
                    slotColorFollows.forEach(scf => {
                        // 多 spine 時才比對 m_skeleton.__id__
                        if (this._isMultiSpine) {
                            if (scf.m_skeleton && scf.m_skeleton.__id__ === selected.skeletonIdx && scf.node && scf.node.__id__ != null && scf.m_slotName) {
                                nodeIdToSlotColor[scf.node.__id__] = scf.m_slotName;
                            }
                        } else {
                            if (scf.node && scf.node.__id__ != null && scf.m_slotName) {
                                nodeIdToSlotColor[scf.node.__id__] = scf.m_slotName;
                            }
                        }
                    });
                    
                    // 處理所有 BoneFollow
                    for (const bf of boneFollows) {
                        // 多 spine 時才比對 m_skeleton.__id__
                        if (this._isMultiSpine) {
                            if (!bf.m_skeleton || bf.m_skeleton.__id__ !== selected.skeletonIdx) continue;
                        }
                        const nodeId = bf.node && bf.node.__id__;
                        if (nodeId == null) continue;
                        
                        // 完整讀取 BoneFollow 組件設定
                        const boneFollowSettings = this.parseBoneFollowSettings(bf);
                        if (!boneFollowSettings) {
                            EditorRendererKit.print('warn', `[BoneFollow] 無法解析組件設定，跳過 nodeId:${nodeId}`);
                            continue;
                        }
                        
                        // 註解掉詳細的原始資料輸出
                        // console.log('=== BoneFollow Debug ===');
                        // console.log('Original BoneFollow data:', {
                        //     m_followPosition: bf.m_followPosition,
                        //     m_isFollowPosition: bf.m_isFollowPosition,
                        //     m_followRotation: bf.m_followRotation,
                        //     m_isFollowRotation: bf.m_isFollowRotation,
                        //     m_followScale: bf.m_followScale,
                        //     m_isFollowScale: bf.m_isFollowScale,
                        //     m_positionOffset: bf.m_positionOffset,
                        //     m_scaleFactor: bf.m_scaleFactor,
                        //     m_rotationFactor: bf.m_rotationFactor,
                        //     m_boneName: bf.m_boneName,
                        //     m_slotName: bf.m_slotName
                        // });
                        // console.log('Parsed BoneFollow settings:', boneFollowSettings);
                        // console.log('========================');
                        
                        // Sprite 掛載
                        const sprite = sprites.find(s => s.node && s.node.__id__ === nodeId) || null;
                        if (sprite) {
                            let imageUrl = null;
                            if (sprite._spriteFrame && sprite._spriteFrame.__uuid__) {
                                imageUrl = await EditorAdapter.getPathByUuid(sprite._spriteFrame.__uuid__);
                                if (typeof imageUrl === 'string') {
                                    const atIdx = imageUrl.lastIndexOf('@');
                                    if (atIdx > -1) {
                                        imageUrl = imageUrl.substring(0, atIdx);
                                    }
                                }
                            }
                            if (!imageUrl) {
                                EditorRendererKit.print('warn', `[Sprite 掛載] 無法取得圖片路徑，nodeId:${nodeId}`);
                                continue;
                            }
                            
                            // 檢查檔案是否存在
                            const fs = require('fs');
                            const path = require('path');
                            if (!fs.existsSync(imageUrl)) {
                                EditorRendererKit.print('warn', `[Sprite 掛載] 圖片檔案不存在: ${imageUrl}`);
                                continue;
                            }
                            
                            let anchor = { x: 0.5, y: 0.5 };
                            const uiTransform = uiTransforms.find(u => u.node && u.node.__id__ === nodeId);
                            if (uiTransform && typeof uiTransform._anchorPoint === 'object') {
                                anchor = {
                                    x: typeof uiTransform._anchorPoint.x === 'number' ? uiTransform._anchorPoint.x : 0.5,
                                    y: typeof uiTransform._anchorPoint.y === 'number' ? uiTransform._anchorPoint.y : 0.5
                                };
                            }
                            let blobUrl = null;
                            try {
                                // 正規化路徑以確保跨平台兼容性
                                const normalizedPath = path.normalize(imageUrl);
                                
                                // 檢查檔案權限
                                try {
                                    fs.accessSync(normalizedPath, fs.constants.R_OK);
                                } catch (accessErr) {
                                    EditorRendererKit.print('warn', `[Sprite 掛載] 檔案無讀取權限: ${normalizedPath}, 錯誤: ${accessErr.message}`);
                                    continue;
                                }
                                
                                const buffer = fs.readFileSync(normalizedPath);
                                if (!buffer || buffer.length === 0) {
                                    EditorRendererKit.print('warn', `[Sprite 掛載] 讀取的檔案是空的: ${normalizedPath}`);
                                    continue;
                                }
                                
                                // 檢查是否為有效的圖片格式
                                const ext = path.extname(normalizedPath).toLowerCase();
                                if (!['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext)) {
                                    EditorRendererKit.print('warn', `[Sprite 掛載] 不支援的圖片格式: ${ext} (檔案: ${normalizedPath})`);
                                    continue;
                                }
                                
                                // 設定正確的 MIME type
                                let mimeType = 'image/png';
                                switch (ext) {
                                    case '.jpg':
                                    case '.jpeg':
                                        mimeType = 'image/jpeg';
                                        break;
                                    case '.webp':
                                        mimeType = 'image/webp';
                                        break;
                                    case '.gif':
                                        mimeType = 'image/gif';
                                        break;
                                }
                                
                                const blob = new window.Blob([buffer], { type: mimeType });
                                blobUrl = window.URL.createObjectURL(blob);
                                
                                EditorRendererKit.print('info', `[Sprite 掛載] 成功載入圖片: ${path.basename(normalizedPath)} (${buffer.length} bytes, ${mimeType})`);
                            } catch (err) {
                                EditorRendererKit.print('error', `[Sprite 掛載] 讀取圖片失敗: ${imageUrl}, 錯誤: ${err.message}`);
                                console.error('[Sprite 掛載] 詳細錯誤:', err);
                                continue;
                            }
                            const slotName = nodeIdToSlotColor[nodeId] || bf.m_slotName;
                            if (!slotName) {
                                EditorRendererKit.print('warn', `[Sprite 掛載] 無法找到對應的 slotName，nodeId:${nodeId}`);
                                continue;
                            }
                            if (!this.skeleton.findSlot(slotName)) {
                                EditorRendererKit.print('warn', `[Sprite 掛載] Skeleton 中找不到 slot: ${slotName}`);
                                continue;
                            }
                            
                            // 將完整的 BoneFollow 設定傳入
                            await this.attachImageToSlot(
                                slotName,
                                { 
                                    path: imageUrl, 
                                    offset: boneFollowSettings.positionOffset, 
                                    scale: boneFollowSettings.scaleFactor, 
                                    anchor, 
                                    colorFollowSlot: slotName,
                                    boneFollowSettings
                                },
                                blobUrl
                            );
                            this.attachImages[slotName] = {
                                file: { 
                                    path: imageUrl, 
                                    offset: boneFollowSettings.positionOffset, 
                                    scale: boneFollowSettings.scaleFactor, 
                                    anchor, 
                                    colorFollowSlot: slotName,
                                    boneFollowSettings
                                },
                                url: blobUrl
                            };
                        }
                        // Label 掛載
                        const label = labels.find(l => l.node && l.node.__id__ === nodeId) || null;
                        if (label) {
                            let anchor = { x: 0.5, y: 0.5 };
                            const uiTransform = uiTransforms.find(u => u.node && u.node.__id__ === nodeId);
                            if (uiTransform && typeof uiTransform._anchorPoint === 'object') {
                                anchor = {
                                    x: typeof uiTransform._anchorPoint.x === 'number' ? uiTransform._anchorPoint.x : 0.5,
                                    y: typeof uiTransform._anchorPoint.y === 'number' ? uiTransform._anchorPoint.y : 0.5
                                };
                            }
                            let blobUrl = null;
                            try {
                                let bitmapFontFntPath = null, bitmapFontPngPath = null;
                                if (label._font && label._font.__uuid__) {
                                    const EditorAdapter = require('../../common/editor-adapter');
                                    const fontPath = await EditorAdapter.getPathByUuid(label._font.__uuid__);
                                    if (fontPath && fontPath.endsWith('.fnt')) {
                                        bitmapFontFntPath = fontPath;
                                        const fs = require('fs');
                                        const Path = require('path');
                                        
                                        // 正規化字型檔案路徑
                                        const normalizedFntPath = Path.normalize(fontPath);
                                        if (!fs.existsSync(normalizedFntPath)) {
                                            EditorRendererKit.print('warn', `[Label 掛載] 字型檔案不存在: ${normalizedFntPath}`);
                                        } else {
                                            const fntText = fs.readFileSync(normalizedFntPath, 'utf-8');
                                            const pageMatch = fntText.match(/page\s+id=0\s+file="([^"]+)"/);
                                            if (pageMatch) {
                                                bitmapFontPngPath = Path.join(Path.dirname(normalizedFntPath), pageMatch[1]);
                                                // 正規化 PNG 路徑並檢查存在性
                                                bitmapFontPngPath = Path.normalize(bitmapFontPngPath);
                                                if (!fs.existsSync(bitmapFontPngPath)) {
                                                    EditorRendererKit.print('warn', `[Label 掛載] 字型貼圖不存在: ${bitmapFontPngPath}`);
                                                    bitmapFontPngPath = null;
                                                }
                                            }
                                        }
                                    }
                                }
                                if (bitmapFontFntPath && bitmapFontPngPath) {
                                    blobUrl = await this.renderBitmapFontLabelToImage(label, bitmapFontFntPath, bitmapFontPngPath);
                                    EditorRendererKit.print('info', `[Label 掛載] 成功渲染 BitmapFont Label: ${label._string || 'Empty'}`);
                                } else {
                                    blobUrl = await this.renderLabelToImage(label);
                                    EditorRendererKit.print('info', `[Label 掛載] 成功渲染一般 Label: ${label._string || 'Empty'}`);
                                }
                            } catch (err) {
                                EditorRendererKit.print('error', `[Label 掛載] 渲染 Label 失敗，nodeId:${nodeId}, 錯誤: ${err.message}`);
                                console.error('[Label 掛載] 詳細錯誤:', err);
                                continue;
                            }
                            
                            if (!blobUrl) {
                                EditorRendererKit.print('warn', `[Label 掛載] 未能產生 blobUrl，nodeId:${nodeId}`);
                                continue;
                            }
                            
                            const slotName = nodeIdToSlotColor[nodeId] || bf.m_slotName;
                            if (!slotName) {
                                EditorRendererKit.print('warn', `[Label 掛載] 無法找到對應的 slotName，nodeId:${nodeId}`);
                                continue;
                            }
                            if (!this.skeleton.findSlot(slotName)) {
                                EditorRendererKit.print('warn', `[Label 掛載] Skeleton 中找不到 slot: ${slotName}`);
                                continue;
                            }
                            
                            // 將完整的 BoneFollow 設定傳入  
                            await this.attachImageToSlot(
                                slotName,
                                { 
                                    type: 'label', 
                                    label, 
                                    offset: boneFollowSettings.positionOffset, 
                                    scale: boneFollowSettings.scaleFactor, 
                                    anchor, 
                                    colorFollowSlot: slotName,
                                    boneFollowSettings
                                },
                                blobUrl
                            );
                            this.attachImages[slotName] = {
                                file: { 
                                    type: 'label', 
                                    label, 
                                    offset: boneFollowSettings.positionOffset, 
                                    scale: boneFollowSettings.scaleFactor, 
                                    anchor, 
                                    colorFollowSlot: slotName,
                                    boneFollowSettings
                                },
                                url: blobUrl
                            };
                        }
                    }
                    EditorRendererKit.print('info', '[handlePrefabAutoLoad] Sprite/Label 掛載流程結束');
                }, 800);
            },

            /**
             * 切換自動重載功能
             */
            togglePrefabAutoReload() {
                this.prefabAutoReloadEnabled = !this.prefabAutoReloadEnabled;
                
                if (this.prefabAutoReloadEnabled) {
                    EditorRendererKit.print('info', '[Prefab Monitor] 已啟用自動重載功能');
                    // 如果有當前檔案，重新啟動監控
                    if (this.currentPrefabFile) {
                        this.startPrefabFileWatcher(this.currentPrefabFile);
                    }
                } else {
                    EditorRendererKit.print('info', '[Prefab Monitor] 已停用自動重載功能');
                    this.stopPrefabFileWatcher();
                }
            },

            /**
             * 手動重新載入當前 prefab
             */
            async manualReloadPrefab() {
                if (!this.currentPrefabFile) {
                    EditorRendererKit.print('warn', '[Prefab Reload] 沒有載入的 prefab 檔案');
                    return;
                }

                try {
                    EditorRendererKit.print('info', '[Prefab Reload] 手動重新載入 prefab...');
                    await this.checkAndReloadPrefab(this.currentPrefabFile);
                } catch (err) {
                    EditorRendererKit.print('error', `[Prefab Reload] 手動重載失敗: ${err.message}`);
                }
            },

            /**
             * 智能識別 BoneFollow 組件（根據屬性而非硬編碼 UUID）
             * @param {Array} prefabNodes 
             * @returns {Array}
             */
            identifyBoneFollowComponents(prefabNodes) {
                return prefabNodes.filter(node => {
                    if (!node || typeof node !== 'object') return false;
                    
                    // 檢查是否具有 BoneFollow 組件的典型屬性
                    const hasBoneFollowProps = (
                        // 基本屬性檢查
                        (node.hasOwnProperty('m_boneName') || node.hasOwnProperty('m_spineSkeleton')) &&
                        (
                            // 位置跟隨相關屬性
                            node.hasOwnProperty('m_followPosition') || 
                            node.hasOwnProperty('m_isFollowPosition') ||
                            // 旋轉跟隨相關屬性
                            node.hasOwnProperty('m_followRotation') || 
                            node.hasOwnProperty('m_isFollowRotation') ||
                            // 縮放跟隨相關屬性
                            node.hasOwnProperty('m_followScale') || 
                            node.hasOwnProperty('m_isFollowScale') ||
                            // 偏移相關屬性
                            node.hasOwnProperty('m_positionOffset') ||
                            node.hasOwnProperty('m_scaleFactor')
                        )
                    );
                    
                    return hasBoneFollowProps;
                });
            },

            /**
             * 智能識別 SlotColorFollow 組件（根據屬性而非硬編碼 UUID）
             * @param {Array} prefabNodes 
             * @returns {Array}
             */
            identifySlotColorFollowComponents(prefabNodes) {
                return prefabNodes.filter(node => {
                    if (!node || typeof node !== 'object') return false;
                    
                    // 檢查是否具有 SlotColorFollow 組件的典型屬性
                    const hasSlotColorFollowProps = (
                        // 基本屬性檢查
                        (node.hasOwnProperty('m_slotName') || node.hasOwnProperty('m_spineSkeleton')) &&
                        (
                            // Skeleton 引用
                            node.hasOwnProperty('m_skeleton') ||
                            node.hasOwnProperty('m_spineSkeleton') ||
                            // Slot 相關屬性
                            node.hasOwnProperty('m_slotName') ||
                            // 預覽屬性
                            node.hasOwnProperty('m_preview')
                        )
                    );
                    
                    return hasSlotColorFollowProps;
                });
            },

            /**
             * 統一解析 BoneFollow 組件設定（兼容多個版本）
             * @param {Object} boneFollowComponent 
             * @returns {Object}
             */
            parseBoneFollowSettings(boneFollowComponent) {
                if (!boneFollowComponent) return null;
                
                // 兼容不同版本的屬性名稱
                const settings = {
                    boneName: boneFollowComponent.m_boneName || '',
                    followPosition: boneFollowComponent.m_followPosition ?? boneFollowComponent.m_isFollowPosition ?? false,
                    followRotation: boneFollowComponent.m_followRotation ?? boneFollowComponent.m_isFollowRotation ?? false,
                    followScale: boneFollowComponent.m_followScale ?? boneFollowComponent.m_isFollowScale ?? false,
                    positionOffset: this.parseVec2(boneFollowComponent.m_positionOffset),
                    scaleFactor: this.parseVec2(boneFollowComponent.m_scaleFactor),
                    rotationFactor: (typeof boneFollowComponent.m_rotationFactor === 'number') ? boneFollowComponent.m_rotationFactor : 0,
                    rotationLocalization: boneFollowComponent.m_rotationLocalization ?? boneFollowComponent.m_isRotationLocalization ?? false,
                    scaleLocalization: boneFollowComponent.m_scaleLocalization ?? boneFollowComponent.m_isScaleLocalization ?? false,
                    cacheAncestors: boneFollowComponent.m_cacheAncestors ?? (boneFollowComponent.m_isCacheData !== false)
                };
                
                return settings;
            },

            /**
             * 解析 Vec2 格式（兼容不同格式）
             * @param {Object|undefined} vec2Obj 
             * @returns {Object}
             */
            parseVec2(vec2Obj) {
                if (!vec2Obj || typeof vec2Obj !== 'object') {
                    return { x: 0, y: 0 };
                }
                
                // 處理 Cocos Creator 的 Vec2 格式
                if (vec2Obj.__type__ && (vec2Obj.x !== undefined || vec2Obj.y !== undefined)) {
                    return {
                        x: (typeof vec2Obj.x === 'number' && !isNaN(vec2Obj.x)) ? vec2Obj.x : 0,
                        y: (typeof vec2Obj.y === 'number' && !isNaN(vec2Obj.y)) ? vec2Obj.y : 0
                    };
                }
                
                // 處理普通對象格式
                return {
                    x: (typeof vec2Obj.x === 'number' && !isNaN(vec2Obj.x)) ? vec2Obj.x : 0,
                    y: (typeof vec2Obj.y === 'number' && !isNaN(vec2Obj.y)) ? vec2Obj.y : 0
                };
            },

            /**
             * 處理動畫事件
             * @param {number} trackIndex 
             * @param {spine.Event} event 
             */
            onAnimationEvent(trackIndex, event) {
                const eventData = event.data;
                const eventId = this.eventIdCounter++;

                const trackEntry = this.animationState.getCurrent(trackIndex);
                let correctedTime = event.time;
                if (trackEntry && trackEntry.loop) {
                    correctedTime = event.time % trackEntry.animation.duration;
                }

                const newEvent = {
                    id: eventId,
                    trackIndex: trackIndex,
                    name: eventData.name,
                    time: correctedTime,
                    timestamp: Date.now(),
                    opacity: 1
                };

                this.animationEvents.push(newEvent);

                // 2秒後淡出
                setTimeout(() => {
                    const targetEvent = this.animationEvents.find(e => e.id === eventId);
                    if (targetEvent) {
                        targetEvent.opacity = 0;
                        // 0.5秒後從陣列中移除
                        setTimeout(() => {
                            this.animationEvents = this.animationEvents.filter(e => e.id !== eventId);
                        }, 500);
                    }
                }, 2000);
            },

            /**
             * 淡出事件
             * @param {number} eventId 事件ID
             */
            fadeOutEvent(eventId) {
                const event = this.animationEvents.find(e => e.id === eventId);
                if (!event) return;

                // 淡出動畫
                const fadeOutDuration = 500; // 0.5秒淡出
                const startTime = Date.now();
                const initialOpacity = event.opacity;

                const fadeOut = () => {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / fadeOutDuration, 1);
                    
                    event.opacity = initialOpacity * (1 - progress);

                    if (progress < 1) {
                        requestAnimationFrame(fadeOut);
                    } else {
                        // 淡出完成，從列表中移除
                        this.removeEvent(eventId);
                    }
                };

                requestAnimationFrame(fadeOut);
            },

            /**
             * 移除事件
             * @param {number} eventId 事件ID
             */
            removeEvent(eventId) {
                const index = this.animationEvents.findIndex(e => e.id === eventId);
                if (index !== -1) {
                    this.animationEvents.splice(index, 1);
                }
            },

            /**
             * 清除所有事件
             */
            clearAllEvents() {
                this.animationEvents.splice(0, this.animationEvents.length);
                this.eventIdCounter = 0;
            },

        },

        /**
         * 生命周期：挂载后
         */
        mounted() {
            // 收集元素
            canvas = this.$refs.canvas;
            layout = this.$refs.layout;
            properties = this.$refs.properties;

            // 檢查元素是否正確取得
            if (!canvas || !layout || !properties) {
                console.error('[SkeletonViewer] $refs 尚未正確掛載', { canvas, layout, properties });
                return;
            }

            // 监听画布事件
            canvas.addEventListener('mousewheel', this.onCanvasMouseWheel); // 监听画布鼠标滚轮
            canvas.addEventListener('mousedown', this.onCanvasMouseDown);   // 监听画布鼠标点击
            canvas.addEventListener('mousemove', this.onCanvasMouseMove);   // 监听画布鼠标移动
            canvas.addEventListener('mouseup', this.onCanvasMouseUp);       // 监听画布鼠标松开
            canvas.addEventListener('mouseleave', this.onCanvasMouseLeave); // 监听画布鼠标离开
            // （主进程）监听资源选择事件
            RendererEvent.on('assets-selected', this.onAssetsSelectedEvent);
            // （下一帧）发送事件给主进程
            this.$nextTick(() => {
                RendererEvent.send('ready');                // （主进程）已就绪
                RendererEvent.send('check-update', false);  // （主进程）检查更新
            });
            // 主动触发布局尺寸变化
            this.onLayoutResize();
            // 监听布局尺寸变化（用 rAF 包裹，避免 loop limit exceeded）
            resizeObserver = new ResizeObserver(() => {
                window.requestAnimationFrame(() => {
                    this.onLayoutResize();
                });
            });
            resizeObserver.observe(layout);
        },

        /**
         * 生命周期：卸载前
         */
        beforeUnmount() {
            // 停止 prefab 文件監控
            this.stopPrefabFileWatcher();
            
            // 清除所有動畫事件
            this.clearAllEvents();
            
            // 清理案发现场
            canvas = null;
            layout = null;
            properties = null;
            gl = null;
            shader = null;
            batcher = null;
            mvp = null;
            skeletonRenderer = null;
            debugRenderer = null;
            debugShader = null;
            shapeRenderer = null;
            this.skeleton = null;
            this.bounds = null;
            // 取消监听布局尺寸变化
            if (resizeObserver) resizeObserver.disconnect();
            resizeObserver = null;
            // 取消事件监听
            RendererEvent.removeAllListeners('assets-selected');
            // 发送事件给主进程
            RendererEvent.send('close');
        },

    };
    return App;

}());
