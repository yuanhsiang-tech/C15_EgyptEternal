import { Color, Director, director, game, Game, log, Scene, view } from "cc";
import { BUILD, EDITOR, JSB } from "cc/env";
import { ViewManager } from "../ViewManage/ViewManager";
import { Define } from "../Define/GeneralDefine";
import { Device } from "../Device/Device";
import { ServiceConfig, ServiceType } from "../Define/ServiceDefine";
import { ServiceMap } from "../Define/ServiceMapDefine";
import { Service } from "../Service/Foundation/Service";
import { Persist } from "../Persist/Persist";
import { GameId } from "../Define/GameDefine";
import { StageId, StageInfoMap } from "../Define/StageDefine";
import { Command } from "../Net/Command/Command";
import { AppLifeService } from "../Service/AppLifeService";
import { S2U, UserInfo } from "../Proto/service/appLife/appLife_pb";
import { IConfigTest } from "../Define/ConfigTestDefine";
import { EnvConfig } from "../Define/ConfigDefine";
import { GameApp } from "../App/GameApp";
import { Network } from "../Net/Network/Network";
import Stage from "../Stage/Stage";
import { SlotGameStage } from "../Stage/SlotGameStage";
import GameBar, { GameBarDelegate } from "../Game/Platform/GameBar/GameBar";
import { MatchService } from "../Service/MatchService";
import { Http } from "../Net/Network/Http";

if ( !EDITOR && !JSB )
{
   // VF 模擬資訊
   const VF_SIMULATE = {
      AccountId: null,
      ServiceId: null
   };

   // Server 們的連線位置
   const SERVER_IP:[string,string][] = [
      ["預設", null],
      ["文弘", "192.168.164.37:8080"],
      ["國軒", "192.168.164.40:8080"],
      ["明機", "192.168.164.41:8080"],
      ["為恩", "192.168.164.48:8080"],
      ["韋誠", "192.168.164.59:8080"],
      ["嵂焜", "192.168.164.74:8080"],
      ["靖硯", "192.168.164.79:8080"],
      ["朝威", "192.168.164.80:8080"],


      ["自訂", null] // 自訂固定保留在最後一項
   ];
   
   const isWebDesktop: boolean = !BUILD || document.body.getElementsByClassName("footer")?.length > 0;
   if (!isWebDesktop) {
      // [WebDesktop-Mobile 輸出]
      localStorage.removeItem("simulateAndroidNotch");
      localStorage.removeItem("simulateiPhoneNotch");
      localStorage.removeItem("DesignSize");
   }

   /**
     * 初始化與顯示無關的處理
     */
   function init ()
   {
      // 初始化測試網址
      {
         function SetupTestUrl(id:number, config:IConfigTest) {
            const key:string = `web_test_${id}`;
            const storeData:{customUrl,isFullCustomPath} = JSON.parse(Persist.App.Get(key) || "{}");
            storeData && config.TestByUrl(storeData.customUrl, storeData.isFullCustomPath);
         }

         ServiceMap.forEach((config:IConfigTest, id:number)=>{
            SetupTestUrl(id, config);
         });

         Object.entries(GameId).forEach((value: [string, string | GameId])=>{
            const id:number = parseInt(value[0]);
            if (!isNaN(id)) {
               const config:IConfigTest = StageInfoMap.get(id) as unknown as IConfigTest;
               config?.TestByUrl && SetupTestUrl(id, config);
            }
         })

         director.on(Director.EVENT_BEFORE_UPDATE, onlyInitConnection, null);
      }
   };

   /**
    * 設定 Connection 元件初始化網址 "專用"
    */
   function onlyInitConnection() {
      const target:{m_url:string} = GameApp.Shared.Connection as any;
      if (target?.m_url != null) {
         director.off(Director.EVENT_BEFORE_UPDATE, onlyInitConnection, null);

         {
            let url:string;
            const key:string = `web_test_entry`;
            const storeData = Persist.App.Get(key);
            if (storeData == null || storeData == "") {
               // [沒有存過的資料] => 相當於空值
            } else if (Network.IsIpDomain(storeData)) {
               // [Parse成純數字失敗] => 表示有客製化網址
               url = storeData;
            } else {
               // [其餘狀況] => 表示有指定連到某個 Server 的電腦
               const option:[string,string] = SERVER_IP[storeData];
               if (option) {
                  url = option[1];
               }
            }

            if (url != null && url.length > 0) {
               // [指定連線位置]
               target.m_url = url;
            }
         }

         {
            const oldCustomHttpHeaderMap = (GameApp.Shared.Connection as any).m_delegator.CustomHttpHeaderMap;
            ((GameApp.Shared.Connection as any).m_delegator as any).CustomHttpHeaderMap = (id: number): Network.HeaderMap => {
               if (id == VF_SIMULATE.ServiceId) {
                   const map = new Map();
                   map.set(Network.HeaderKey.ACCOUNT, VF_SIMULATE.AccountId);
                   map.set(Network.HeaderKey.SERIAL_NO, Date.now());
                   return map;
               }
               return oldCustomHttpHeaderMap.call(GameApp.Shared.Connection, id);
           }
         }
      }
   }

   /**
    * 建立右邊除錯控制區塊
    * @param createBlock 區塊建立作用方法
    * 備註：每一項功能就應該開一個自己的 Block 區塊
    */
   function planeAreaRGUI ( createBlock: BlockCreator )
   {
      // 關閉有的沒的、Android 返回
      createBlock( ( block: HTMLBlockElement ) => {
         block.space();
         block.createElementButton( "***關閉有的沒的***" ).onclick = () => { ViewManager.Instance.Dismiss(); };
         block.space();
         block.createElementButton( "Android 返回" ).onclick = () => { (window['App'] as any).OnNavigateBack(); };
      });

      // 尺寸設定
      isWebDesktop && createBlock( ( block: HTMLBlockElement ) => {
         const isRegular:boolean = view.getDesignResolutionSize().width == Define.DesignSize.REGULAR.width;
         const simulateiPhoneNotch:boolean = localStorage.getItem("simulateiPhoneNotch") == "true";
         const simulateAndroidNotch:boolean = localStorage.getItem("simulateAndroidNotch") == "true";

         block.space();
         (block.createElementButton(simulateiPhoneNotch ? "關閉瀏海模擬" : "啟用瀏海模擬" ).onclick = () => {
            localStorage.removeItem("simulateAndroidNotch");
            if (simulateiPhoneNotch) {
               localStorage.removeItem("simulateiPhoneNotch");
            } else {
               localStorage.setItem("DesignSize", "REGULAR"); // 設定設計分辨率為寬版
               localStorage.setItem("simulateiPhoneNotch", "true");
            }
            window.location.reload();
         });
         block.space();
         (block.createElementButton(simulateAndroidNotch ? "關閉打孔模擬" : "啟用打孔模擬" ).onclick = () => {
            localStorage.removeItem("simulateiPhoneNotch");
            if (simulateAndroidNotch) {
               localStorage.removeItem("simulateAndroidNotch");
            } else {
               localStorage.setItem("DesignSize", "REGULAR"); // 設定設計分辨率為寬版
               localStorage.setItem("simulateAndroidNotch", "true");
            }
            window.location.reload();
         });
         block.space();
         block.createElementButton("橫向翻轉").onclick = () => {
            if (!Device.Current.IsPortrait) {
               const current:any = Device.Current;
               // [橫向翻轉]
               if (Device.Current.InterfaceOrientation == Device.InterfaceOrientation.LANDSCAPE_LEFT) {
                  // 轉成 LANDSCAPE_RIGHT
                  current.OnInterfaceOrientationChanged(90);
                  current.NotifyChangeOrientation(true);
               } else {
                  // 轉成 LANDSCAPE_LEFT
                  current.OnInterfaceOrientationChanged(-90);
                  current.NotifyChangeOrientation(true);
               }
            }
         };
         block.space();
         block.createElementButton( isRegular ? "切換成窄版" : "切換成寬版" ).onclick = () => {
            if (isRegular) {
               // [切換成窄版]
               localStorage.removeItem("simulateiPhoneNotch"); // 移除瀏海模擬
               localStorage.removeItem("simulateAndroidNotch"); // 移除打孔模擬
               localStorage.setItem("DesignSize", "COMPACT"); // 設定設計分辨率為窄版
            } else {
               // [切換成寬版]
               localStorage.setItem("DesignSize", "REGULAR"); // 設定設計分辨率為寬版
            }
            window.location.reload();
         };
      });

      // 加速
      createBlock( ( block: HTMLBlockElement ) => {
         const minScale: number = 0.1;
         const maxScale: number = 10.0;
         const defaultScale: number = 1.0;

         const slider:HTMLInputElement = block.createElementSlider(0.1, 10, 0.1);
         const groups: InputGroup = block.createGroupInputNumber( "加速", [ "確定", "重置" ] );
         const label: HTMLLabelElementExt = groups.label;
         const input: HTMLInputElementExt = groups.input;
         const btnConfirm: HTMLButtonElementExt = groups.buttons[ 0 ];
         const btnReset: HTMLButtonElementExt = groups.buttons[ 1 ];

         // 設定標題提示
         label.title = "調整遊戲執行速度倍率，一般正常值為 1.0";

         // 設定數字輸入窗
         input.min = minScale.toString();
         input.max = maxScale.toString();
         input.step = input.min;
         input.enterTrigger( btnConfirm ); // 綁定 enter 觸發確定按鈕
         input.value = game[ "m_speed" ] || defaultScale.toString();
         
         // 更新遊戲速度的函數
         const updateGameSpeed = (value: number) => {
            if (!isNaN(value)) {
               const clampedValue = value < minScale ? minScale : value > maxScale ? maxScale : value;
               game["m_speed"] = clampedValue;
               slider.value = input.value = clampedValue.toString();
               
               // 同步更新測試區塊的 slider
               const testSlider = document.getElementById("testSpeedSlider");
               if (testSlider) {
                  (testSlider as HTMLInputElement).value = clampedValue.toString();
               }
            }
         };
         
         // 設定確定按鈕
         btnConfirm.color = Color.GREEN; // 設定顏色
         btnConfirm.onclick = () => {
            const value: number = isNaN(parseFloat(input.value)) ? defaultScale : parseFloat(input.value);
            updateGameSpeed(value);
         };

         // 設定重置按鈕
         btnReset.color = new Color(255, 100, 0); // 設定顏色
         btnReset.onclick = () => {
            updateGameSpeed(defaultScale);
         };

         {
            slider.value = game["m_speed"] || "1.0";
            slider.style.width = "120px";
            slider.style.marginRight = "10px";
            slider.style.height = "7px";
            slider.style.appearance = "none";
            slider.style.background = "linear-gradient(to right, #87CEEB73, #00BFFF73, #1E90FF73)";
            slider.style.borderRadius = "5px";
            slider.style.outline = "none";
            
            // 自訂 slider 樣式
            const styleElement = document.createElement("style");
            styleElement.textContent = `
               input[type=range]::-webkit-slider-thumb {
                  appearance: none;
                  width: 15px;
                  height: 15px;
                  border-radius: 50%;
                  background: linear-gradient(135deg, #E0F7FF73, #0077BE73);
                  border: 2px solid #005A9C73;
                  box-shadow: 0 0 6px rgba(0, 90, 156, 0.6);
                  cursor: pointer;
                  transition: all 0.15s ease-in-out;
               }
               input[type=range]::-webkit-slider-thumb:hover {
                  background: linear-gradient(135deg, #C2E9FF73, #0056A773);
                  border-color: #00336673;
                  box-shadow: 0 0 10px rgba(0, 90, 156, 0.8);
               }
               input[type=range]::-webkit-slider-thumb:active {
                  background: linear-gradient(135deg, #0077BE73, #00336673);
                  border-color: #E0F7FF73;
                  box-shadow: 0 0 15px rgba(0, 90, 156, 1);
                  width: 18px;
                  height: 18px;
               }
            `;
            block.appendChild(styleElement);
            
            slider.oninput = () => {
               const value = parseFloat(slider.value);
               if (!isNaN(value)) {
                  game["m_speed"] = value;
                  slider.value = value.toString();
                  input.value = value.toString();
               }
            };
         }
      } );

      // 創建 QA 測試代碼區塊
      createBlock((block: HTMLBlockElement) => {
         const qaCodeBlock = block.createBlock();
         qaCodeBlock.createGroupInputNumber( "QACode", [ "清除" ], (group) => {
            const input: HTMLInputElementExt = group.input;
            const btnClear: HTMLButtonElementExt = group.buttons[ 0 ];

            // 設定數字輸入窗
            input.min = '0';
            input.id = "qaTestInput";// 設定唯一ID以便於選取
            input.style.width = "70px";
            input.enterTrigger(null);

            // 設定清除按鈕
            btnClear.color = new Color( 255, 100, 0 );
            btnClear.onclick = () => { input.value = ''; };

            director.on(Director.EVENT_AFTER_SCENE_LAUNCH, (scene:Scene)=>{
               const stage:Stage = scene.getComponentInChildren(Stage);
               if (stage && stage.Id > StageId.GAME) {   
                  // [確認是遊戲]
                  const oldOnPreparationFinish = stage['OnPreparationsFinish'];
                  stage['OnPreparationsFinish'] = function() {
                     oldOnPreparationFinish.apply(stage, arguments);
                     const slotGameStage: SlotGameStage = stage.getComponent(SlotGameStage) || stage.getComponentInChildren(SlotGameStage);
                     const gameBar: GameBar = slotGameStage.GameBar;
                     const delegate: Partial<GameBarDelegate> = gameBar ? {
                        SetQACode(code) {
                           input.value = code?.toString() || "";
                        },
                        GetQACode(): number {
                           return !EnvConfig.IS_DEV ? 0 : parseInt(input.value?.trim()) || 0;
                        },
                        ...gameBar.Delegate
                     } : null;
                     if (delegate) {
                        gameBar.Delegate = delegate;
                     }
                  }
               }
            })
         });
      })

      // 連線測試
      createBlock((block: HTMLBlockElement) => {
         block.createWindowEntry("連線測試", "連線測試", (createBlock: BlockCreator)=>{
            const defaultUrl:string = "";
            let targetUrl:string = "";
            let entryFunc:ResetFunc, serviceGroup:Group, gameServiceGroup:Group;

            type Group = {
               customUrlInput: HTMLInputElementExt,
               paramInput: HTMLInputElementExt
            }
            type ResetFunc = ()=>void;

            function ApplyFinish() {
               if (GameApp.Shared.StageManager.Current.Id == StageId.LOGIN) {
                  alert("套用完成");
               } else {
                  if (confirm("套用完成，是否重啟使用新設定？")) {  
                     window.location.reload();
                  }
               }
            }

            function TemplateBlock(
               block:HTMLBlockElement, 
               bgColor:Color, 
               title:string, 
               targetType:any, 
               targetMap: Map<number, any>, 
               composeDebugUrl:(id:number, config:IConfigTest)=>string
            ): Group {
               block.backgroundColor = bgColor;

               const innerBlock:HTMLBlockElement = block.createInnerBlock(title);
               innerBlock.root.style.paddingBottom = "10px";
               innerBlock.title.style.marginLeft = "10px";

               const selectGroup: SelectGroup = innerBlock.createGroupSelect("目標：");
               selectGroup.label.color = Color.BLACK;
               selectGroup.select.style.width = "300px"

               innerBlock.newLine();
               innerBlock.createLabel("網址：").color = Color.BLACK;

               const customUrlInput: HTMLInputElementExt = innerBlock.createElementInputText();
               customUrlInput.title = "客製化任意網址"
               customUrlInput.style.width = "300px";
               customUrlInput.placeholder = targetUrl

               innerBlock.newLine();
               innerBlock.createLabel("參數：").color = Color.BLACK;

               const paramInput: HTMLInputElementExt = innerBlock.createElementInputText();
               paramInput.title = "網址列後方的 query string 參數";
               paramInput.style.width = "300px";
               paramInput.placeholder = "a=10&b=ok"

               innerBlock.space().newLine();

               const btnReset: HTMLButtonElementExt = innerBlock.createElementButton("重置");
               btnReset.style.marginLeft = "197px";
               btnReset.style.marginTop = "5px";
               btnReset.style.height = "25px";

               const btnDebug: HTMLButtonElementExt = innerBlock.createElementButton("Debug");
               btnDebug.style.marginLeft = "5px";
               btnDebug.style.marginTop = "5px";
               btnDebug.style.height = "25px";

               const btnConfirm: HTMLButtonElementExt = innerBlock.createElementButton("套用");
               btnConfirm.style.marginLeft = "5px";
               btnConfirm.style.marginTop = "5px";
               btnConfirm.style.height = "25px";

               const select: HTMLSelectElementExt = selectGroup.select;
               select.title = "對目標服務的 /debug 路徑發送測試請求";

               Object.entries(targetType).forEach(([key, value]) => {
                  targetMap.get(value as number) && select.addOption(value as string, `${key} (${value})`);
               })

               function loadLastConfig() {
                  const id:number = parseInt(select.value);
                  const key:string = `web_test_${id}`;
                  const storeData:{customUrl,isFullCustomPath} = JSON.parse(Persist.App.Get(key) || "{}");
                  customUrlInput.value = storeData?.customUrl || "";
                  btnConfirm.disabled = true;
               }
               select.onchange = ()=>loadLastConfig()
               loadLastConfig();

               customUrlInput.oninput = function(event:InputEvent) {
                  const target:HTMLInputElementExt = event.target as HTMLInputElementExt;
                  target.value = target.value.trim();
                  if (target == customUrlInput) {
                     btnConfirm.disabled = target.value.length == 0;
                  }
               }

               btnReset.onclick = () => {
                  const id:number = parseInt(select.value);
                  Persist.App.Remove(`web_test_${id}`);
                  customUrlInput.value = "";
                  btnConfirm.disabled = true;
                  ApplyFinish();
               }

               btnConfirm.onclick = () => {
                  const id:number = parseInt(select.value);
                  const customUrl:string = customUrlInput.value.trim();
                  const isFullCustomPath:boolean = true;
                  targetMap.get(id).TestByUrl(customUrl, isFullCustomPath);
                  Persist.App.Set(`web_test_${id}`, JSON.stringify({customUrl, isFullCustomPath}));
                  btnConfirm.disabled = true;
                  ApplyFinish();
               }

               btnDebug.onclick = () => {
                  // [發送 Debug]
                  const params:string = paramInput.value.trim();
                  const id:number = parseInt(select.value);
                  const config:IConfigTest = targetMap.get(id);
                  const urlPrefix:string = composeDebugUrl(id, config);
                  const debugUrl:string = urlPrefix + (params.length > 0 ? `?${params}` : "");
                  log(`[debugUrl]: ${debugUrl}`);

                  Http
                     .Get(debugUrl)
                     .OnFinish((isSuccess:boolean, xhr:XMLHttpRequest)=>{
                        if (isSuccess) {
                           alert(`發送成功(statusCode=${xhr.status})`);
                        } else {
                           alert(`發送失敗(statusCode=${xhr.status})`);
                        }
                     })
                     .Resume();
               };

               return {
                  customUrlInput,
                  paramInput
               }
            }

            createBlock((block: HTMLBlockElement) => {
               let initIndex:number;
               block.backgroundColor = new Color(220, 220, 220);
               
               const innerBlock:HTMLBlockElement = block.createInnerBlock("入口測試");
               innerBlock.root.style.paddingBottom = "10px";
               innerBlock.title.style.marginLeft = "10px";

               const selection: HTMLSelectElementExt = innerBlock.createElementSelect();
               selection.style.height = "24px";
               SERVER_IP.forEach(([name,ip], index)=>selection.addOption(index.toString(), name));

               function SetupIP(index:number) {
                  const key:string = `web_test_entry`;

                  let url:string;
                  if (index == 0) {
                     // [預設當前設定]
                     url = EnvConfig.Config.ENTRY_URL;
                  } else if (index < selection.options.length-1) {
                     // [中間指定選項]
                     url = SERVER_IP[index][1];
                  } else {
                     // [自訂義]
                     const storeData = Persist.App.Get(key);
                     if (storeData == null || !Network.IsIpDomain(storeData)) {
                        // [沒有存過的資料] => 相當於空值
                        url = "";
                     } else {
                        // [表示有客製化網址]
                        url = storeData;
                     }
                  }

                  customInput.value = url;
                  customInput.disabled = index != selection.options.length-1;
                  btnConfirm.disabled = index == initIndex;
                  !btnConfirm.disabled && customInput.oninput?.(null);

                  targetUrl = url;
                  if (serviceGroup) {
                     serviceGroup.customUrlInput.placeholder = url;
                  }
                  if (gameServiceGroup) {
                     gameServiceGroup.customUrlInput.placeholder = url;
                  }
               }
               
               const customInput:HTMLInputElementExt = innerBlock.createElementInputText();
               customInput.style.width = "247px";
               customInput.style.height = "25px";
               customInput.style.marginLeft = "5px";
               customInput.placeholder = "192.168.44.211:8080"
               customInput.oninput = function() {
                  customInput.value = customInput.value.trim();
                  btnConfirm.disabled = customInput.value.length == 0;
               }
               selection.onchange = (event)=>{
                  if (event == null) {
                     // [重置處理]
                     initIndex = 0;
                  }
                  SetupIP(parseInt(selection.value));

                  if (serviceGroup) {
                     serviceGroup.customUrlInput
                  }
               }

               const btnConfirm:HTMLButtonElementExt = innerBlock.createElementButton("套用");
               btnConfirm.style.height = "25px";
               btnConfirm.style.marginLeft = "5px";
               btnConfirm.style.marginRight = "9px";
               btnConfirm.onclick = ()=>{
                  const key:string = `web_test_entry`;
                  const index:number = parseInt(selection.value);
                  const url:string = customInput.value.trim();
                  // 這裡存入的可能是一個索引數字或是客製化的網址
                  Persist.App.Set(key, index != selection.options.length-1 ? index : url);
                  (GameApp.Shared.Connection as any).m_url = url;

                  initIndex = index;
                  btnConfirm.disabled = true;

                  ApplyFinish();
               }

               entryFunc = ()=>{
                  const key:string = `web_test_entry`;
                  Persist.App.Remove(key);
                  selection.value = selection.options[0].value;
                  selection.onchange?.(null);
               }

               // 初始化選項設定
               {
                  const key:string = `web_test_entry`;
                  const storeData = Persist.App.Get(key);
                  if (storeData == null || storeData == "") {
                     // [沒有存過的資料] => 直接選預設選項
                     initIndex = 0;
                  } else if (Network.IsIpDomain(storeData)) {
                     // [有客製化網址]
                     initIndex = selection.options.length-1;
                  } else {
                     // [其餘狀況] => 表示有指定連到某個 Server 的電腦
                     initIndex = parseInt(storeData);
                  }

                  selection.value = `${initIndex}`;
                  SetupIP(initIndex);
               }
            });
            
            createBlock((block: HTMLBlockElement) => {
               serviceGroup = TemplateBlock(
                  block,
                  new Color(255, 165, 0), 
                  "Service 測試", 
                  ServiceType, 
                  ServiceMap, 
                  (id:number, config:ServiceConfig)=>{
                     const cls:Function = config.Creator;
                     const service:Service<Command.Command> = (cls as any).s_instance;
                     const url:string = typeof config.TestUrl == "string" && config.TestUrl.length > 0 ? config.TestUrl : service ? (service as any).Url : defaultUrl;
                     const isFullCustomPath:boolean = config.TestFullCustomPath;
                     const urlPrefix:string = (isFullCustomPath ? url : `${url}/service/${id}`) + "/Debug";
                     return urlPrefix;
                  });
            });

            createBlock((block: HTMLBlockElement) => {
               gameServiceGroup = TemplateBlock(
                  block,
                  new Color(0, 165, 255), 
                  "Game 測試", 
                  GameId, 
                  StageInfoMap, 
                  (id:number, config:IConfigTest)=>{
                     const url:string = typeof config.TestUrl == "string" && config.TestUrl.length > 0 ? config.TestUrl : defaultUrl;
                     const isFullCustomPath:boolean = config.TestFullCustomPath;
                     const urlPrefix:string = (isFullCustomPath ? url : `${url}/game/${id}0001/0/client`) + "/Debug";
                     return urlPrefix;
                  }
               )
            });

            createBlock((block: HTMLBlockElement) => {
               const btnResetAll:HTMLButtonElementExt = block.createElementButton("全部重置");
               btnResetAll.style.width = "389px"
               btnResetAll.style.height = "100px"
               btnResetAll.onclick = ()=>{
                  function ClearTestUrl(id:number, config:IConfigTest) {
                     const key:string = `web_test_${id}`;
                     if (Persist.App.Get(key) != null) { 
                        Persist.App.Remove(key);
                        config.TestByUrl("", false);
                     }
                  }
            
                  ServiceMap.forEach((config:IConfigTest, id:number)=>{
                     ClearTestUrl(id, config);
                  });
            
                  Object.entries(GameId).forEach((value: [string, string | GameId])=>{
                     const id:number = parseInt(value[0]);
                     if (!isNaN(id)) {
                        const config:IConfigTest = StageInfoMap.get(id) as unknown as IConfigTest;
                        config?.TestByUrl && ClearTestUrl(id, config);
                     }
                  })

                  serviceGroup.paramInput.value = serviceGroup.customUrlInput.value = 
                  gameServiceGroup.paramInput.value = gameServiceGroup.customUrlInput.value = "";

                  entryFunc();
                  ApplyFinish();
               }
            });
         }, 405, 505);
      });
   };

   /**
    * 建立左邊除錯控制區塊
    * @param createBlock 區塊建立作用方法
    * 備註：每一項功能就應該開一個自己的 Block 區塊
    * 注意：！！！！！ 左側區域的滑鼠點擊事件是被取消掉的 ！！！！！
    */
   function planeAreaLGUI ( createBlock: BlockCreator )
   {
      // 抓 AccountId 來顯示
      {
         createBlock((block:HTMLBlockElement)=>{
            const accountId:HTMLLabelElementExt = block.createLabel();
            block.newLine();
            const account:HTMLLabelElementExt = block.createLabel();

            accountId.color = Color.RED;
            accountId.bold();
            account.color = Color.RED;
            account.bold();

            {
               const appLifeProto = (AppLifeService.prototype as any);
               const old = appLifeProto.OnCommand;
               appLifeProto.OnCommand = function(cmd) {
                  old.apply(AppLifeService.Instance, arguments);
                  if (cmd.Type == S2U.ACK_USER_INFO) {
                     const userInfo: UserInfo = (AppLifeService.Instance as any).UserInfo;
                     accountId.text = `${userInfo.accountId}`;
                     account.text = `${userInfo.account}`;
                  }
               }
            }
         })
      }
   };







































































































































































































































































   //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
   ////////////////////////////////////////////////////// 相關創建功能元件 /////////////////////////////////////////////////////////
   //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
   // 備註：為了仿造純網頁的設計模式，function 部分以小寫開頭為主
   type BlockBuilder = ( block: HTMLBlockElement ) => void;
   type BlockCreator = ( creator: BlockBuilder ) => HTMLBlockElement;
   type ElementInitializer<T> = ( element: T ) => void;
   type ElementId = string;

   interface HTMLLabelElementExt extends HTMLLabelElement
   {
      /**
       * 連動觸發的 Html 元件 id
      */
      for: ElementId;
      /**
       * 文字顏色
      */
      color: Color;
      /**
       * 文字外框顏色
      */
      outline: Color;
      /**
       * 文字內容
      */
      text: string;
      /**
       * 加粗顯示
      */
      bold (): HTMLLabelElementExt;
      /**
       * 斜體顯示
      */
      italic (): HTMLLabelElementExt;
      /**
       * 底線顯示
      */
      underline (): HTMLLabelElementExt;
      /**
       * 啟用文字選取功能
      */
      selectable (): void;
   }
   interface HTMLInputElementExt extends HTMLInputElement
   {
      /**
       * 綁定當 input 中按下 enter 時會間接觸發的按鈕
      * @param button enter 觸發的 onclick 按鈕對象
      */
      enterTrigger ( button: HTMLButtonElement );
   }
   interface HTMLButtonElementExt extends HTMLButtonElement
   {
      /**
       * 文字顏色
      */
      color: Color;
   }

   class InputGroup { constructor ( public label: HTMLLabelElementExt, public input: HTMLInputElementExt, public buttons: HTMLButtonElementExt[] ) { } }

   interface HTMLInputRadioElement extends HTMLInputElement
   {
      /**
       * 選項前方的文字
      */
      text: string;
      /**
       * 選項是否被選取
      */
      checked: boolean;
      /**
       * 選項前方的文字顯示元件
      */
      readonly label: HTMLLabelElementExt;
      /**
       * 選取改變通知
      * @param event 通知事件
      */
      onchange: ( event: Event ) => void;
   }
   class RadioElement { public static Create ( value: any, text: string = "" ) { return new RadioElement( value, text ); } private constructor ( public value: any, public text: string ) { } }
   type RadioElements = RadioElement[];
   class RadioGroup
   {
      /**
       * 取得目前被圈選的項目
       */
      public get checked (): HTMLInputRadioElement { return this.radios.find( x => x.checked ); }
      constructor ( public label: HTMLLabelElementExt, public radios: HTMLInputRadioElement[], public buttons: HTMLButtonElementExt[] ) { }
   }

   interface HTMLInputCheckboxElement extends HTMLInputElement
   {
      /**
       * 選項前方的文字
      */
      text: string;
      /**
       * 選項是否被選取
      */
      checked: boolean;
      /**
       * 選項前方的文字顯示元件
      */
      readonly label: HTMLLabelElementExt;
      /**
       * 選取改變通知
      * @param event 通知事件
      */
      onchange: ( event: Event ) => void;
   }
   class CheckboxElement { public static Create ( text: string = "" ) { return new CheckboxElement( text ); } private constructor ( public text: string ) { } }
   type CheckboxElements = CheckboxElement[];
   class CheckboxGroup
   {
      /**
       * 取得所有以勾選的項目
      */
      public get checked (): HTMLInputCheckboxElement[] { return this.checkboxs.filter( x => x.checked ); }
      constructor ( public label: HTMLLabelElementExt, public checkboxs: HTMLInputCheckboxElement[], public buttons: HTMLButtonElementExt[] ) { }
   }

   interface HTMLSelectElementExt extends HTMLSelectElement
   {
      /**
       * 目前選取的項目值
      */
      value: string;
      /**
       * 加入選項
      * @param value 選項值
      * @param text 選項文字
      * @param tooltip 選項提示文字
      */
      addOption ( value: string, text?: string, tooltip?: string ): HTMLOptionElement;
      /**
       * 選項改變通知
      * @param event 通知事件
      */
      onchange: ( event: Event ) => void;
   }
   class SelectGroup
   {
      /**
       * 目前 Select 元件選取的項目值
      */
      public get value (): string { return this.select.value; }
      constructor ( public label: HTMLLabelElementExt, public select: HTMLSelectElementExt, public buttons: HTMLButtonElementExt[] ) { };
   }

   /**
    * 區塊顯示元件
   */
   class HTMLBlockElement
   {
      readonly parent: HTMLElement;
      readonly root: HTMLDivElement | HTMLSpanElement;
      readonly alignRight: boolean;
      readonly title: HTMLLabelElementExt;
      public set backgroundColor ( color: Color ) { this.root.style.backgroundColor = color.toString(); }
      public set visible ( visible: boolean ) { this.root.hidden = !visible; }
      public get visible (): boolean { return !this.root.hidden; }

      constructor ( parent: HTMLElement, alignRight: boolean = false, useDiv: boolean = true )
      {
         this.parent = parent;
         this.alignRight = alignRight;
         this.root = document.createElement( useDiv ? "div" : "span" );
         this.root.style.lineHeight = "28px";
         this.root.style.width = "fit-content";
         if ( !!alignRight )
         {
            this.root.style.textAlign = "right";
            this.root.style.marginLeft = "auto";
            this.root.style.marginRight = "0px";
         }
         useDiv && ( this.root.style.marginBottom = "5px" );
         parent.appendChild( this.root );
      }

      /**
       * 一次於最尾端附加多個子節點
      * @param nodes 複數個附加子節點
      */
      public append ( ...nodes: ( Node | string )[] ): void { this.root.append( ...nodes ); }

      /**
       * 於最尾端附加一個子節點
      * @param node 新的子節點
      */
      public appendChild<T extends Node> ( node: T ): T { return this.root.appendChild( node ); }

      /**
       * 於特定子節點之前插入新的子節點
      * @param node 指定插入在此之前的子節點
      * @param child 新的子節點
      */
      public insertBefore<T extends Node> ( node: T, child: Node | null ): T { return this.root.insertBefore( node, child ); }

      /**
       * 一次於最頭端附加多個子節點
      * @param nodes 複數個附加子節點
      */
      public prepend ( ...nodes: ( Node | string )[] ): void { this.root.prepend( ...nodes ); }

      /**
       * 新增換行
      * 範例：
      *    block.newLine();
      */
      public newLine (): HTMLBlockElement { this.root.appendChild( document.createElement( "br" ) ); return this; }

      /**
       * 新增間距
      * @param pixelSpace 間距距離(單位：pixel)
      * 範例：
      *    block.newLine().space(15);
      */
      public space ( pixelSpace: number = 10 ): HTMLBlockElement { const element: HTMLSpanElement = this.createElementSpan(); element.style.marginLeft = pixelSpace + "px"; return this; }

      /**
       * 建立子區塊
      */
      public createBlock (): HTMLBlockElement { return new HTMLBlockElement( this.root, this.alignRight, false ); }

      /**
       * 建立標題式群組子區塊
      * @param title 標題文字
      * @param titleColor 標題顏色
      */
      public createInnerBlock ( title?: string, titleColor?: Color ): HTMLBlockElement {
         let titleLabel: HTMLLabelElementExt;
         if (typeof title == "string" && title.length > 0) {
               titleLabel = this.createLabel(title);
               titleLabel.color = titleColor || Color.BLACK;
         }

         const innerBlock:HTMLBlockElement = new HTMLBlockElement( this.root, this.alignRight, true );
         innerBlock.root.style.marginLeft = "30px";
         (innerBlock as any).title = titleLabel;

         return innerBlock;
      }

      /**
       * 建立 Span 元件
      * @param initializer 初始化元件 function
      * 範例：
      *    const span: HTMLSpanElement = block.createElementSpan();
      */
      public createElementSpan<T extends HTMLSpanElement = HTMLSpanElement> ( initializer?: ElementInitializer<T> ): T { return this.createElement<T>( "span", initializer ); }

      /**
       * 建立 Div 元件
      * @param initializer 初始化元件 function
      * 範例：
      *    const div: HTMLDivElement = block.createElementDiv();
      */
      public createElementDiv<T extends HTMLDivElement = HTMLDivElement> ( initializer?: ElementInitializer<T> ): T { return this.createElement<T>( "div", initializer ); }

      /**
       * 建立 Button 元件
      * @param text Button 標題文字
      * @param initializer 初始化元件 function
      * 範例：
      *    const button:HTMLButtonElementExt = block.createElementButton("確定")
      *                                           .onclick = ()=>{
      *                                              // [點擊事件處理]
      *                                           };
      */
      public createElementButton<T extends HTMLButtonElement = HTMLButtonElementExt> ( text: string, initializer?: ElementInitializer<T> ): T { return this.createElement( "button", initializer, ( element: T ) => { element.innerHTML = text; Object.defineProperty( element, "color", { set: function ( color: Color ) { element.style.color = color.toString(); } } ); } ); }

      /**
       * 建立 Number 元件
      * @param initializer 初始化元件 function
      * 範例：
      *    const inputNumber:HTMLInputElementExt = block.createElementInputNumber();
      * 備註：若要搭配標題顯示可直接使用 createGroupInputNumber
      */
      public createElementInputNumber<T extends HTMLInputElement = HTMLInputElementExt> ( initializer?: ElementInitializer<T> ): T { return this.createElement<T>( "input", initializer, ( element: T ) => { element.type = "number"; let func; Object.defineProperty( element, "enterTrigger", { value: function ( button: HTMLButtonElement ) {  func && element.removeEventListener( "keypress", func ); func = null; button && element.addEventListener( "keypress", func=(event)=>event.key === "Enter" && button && button.click && button.click() );  return element; } }); }); }

      /**
       * 建立 Text 元件
      * @param initializer 初始化元件 function
      * 範例：
      *    const inputText:HTMLInputElementExt = block.createElementInputText();
      * 備註：若要搭配標題顯示可直接使用 createGroupInputText
      */
      public createElementInputText<T extends HTMLInputElement = HTMLInputElementExt> ( initializer?: ElementInitializer<T> ): T { return this.createElement<T>( "input", initializer, ( element: T ) => { element.type = "text"; let func; Object.defineProperty( element, "enterTrigger", { value: function ( button: HTMLButtonElement ) {  func && element.removeEventListener( "keypress", func ); func = null; button && element.addEventListener( "keypress", func=(event)=>event.key === "Enter" && button && button.click && button.click() );  return element; } }); }); }

      /**
       * 建立 Checkbox 元件
      * @param initializer 初始化元件 function
      * 範例：
      *    const inputCheckbox:HTMLInputCheckboxElement = block.createElementInputCheckbox("下班");
      * 備註：若要搭配標題顯示可直接使用 createGroupInputCheckbox
      */
      public createElementInputCheckbox<T extends HTMLInputElement = HTMLInputCheckboxElement> ( text?: string, initializer?: ElementInitializer<T> ): T
      {
         const label: HTMLLabelElementExt = this.createLabel( typeof text == "string" ? text : "" );
         const input: HTMLInputElement = this.createElement<T>( "input", initializer, ( element: T ) => element.type = "checkbox" );
         label.for = input.id = `${ Date.now().toString() }_${ Math.random() }`;
         ( ( label: HTMLLabelElementExt ) =>
         {
            Object.defineProperty( input, "label", { get: function () { return label; } } );
            Object.defineProperty( input, "text", { get: function () { return label.text; }, set: function ( text: string ) { label.text = text; } } );
         } )( label );
         return input as T;
      }

      /**
       * 建立 Radio 元件
      * @param groupName 所屬群組名稱(同一群組才能產生單一選項的效果)
      * @param id 元件識別 id
      * @param value 元件實際代表值
      * @param text 標題文字
      * @param initializer 初始化元件 function
      * 範例：
      *    const inputRadio1:HTMLInputRadioElement = block.createElementInputRadio("group1", "radio1", "male", "男");
      *    const inputRadio2:HTMLInputRadioElement = block.createElementInputRadio("group1", "radio2", "female");
      * 備註：若要搭配標題顯示可直接使用 createGroupInputRadio
      */
      public createElementInputRadio<T extends HTMLInputElement = HTMLInputRadioElement> ( groupName: string, id: string, value: string | number, text?: string, initializer?: ElementInitializer<T> ): T
      {
         const label: HTMLLabelElementExt = this.createLabel( typeof text == "string" ? text : "" );
         const input: HTMLInputElement = this.createElement<T>( "input", initializer, ( element: T ) => element.type = "radio" );
         input.name = groupName;
         input.value = value.toString();
         label.for = input.id = id;
         ( ( label: HTMLLabelElementExt ) =>
         {
            Object.defineProperty( input, "label", { get: function () { return label; } } );
            Object.defineProperty( input, "text", { get: function () { return label.text; }, set: function ( text: string ) { label.text = text; } } );
         } )( label );
         return input as T;
      }

      /**
       * 建立 Select 元件
      * @param initializer 初始化元件 function
      * 範例：
      *    const select: HTMLSelectElementExt = block.createElementSelect();
      *    for ( let i = 0; i < 5; i++ )
      *    {
      *       select.addOption( i.toString(), i.toString(), i.toString() );
      *    }
      *    select.title = "這是一個測試"; // 設定游標移到元件上面停留時候顯示的提示文字
      * 備註：若要搭配標題顯示可直接使用 createGroupSelect
      */
      public createElementSelect<T extends HTMLSelectElement = HTMLSelectElementExt> ( initializer?: ElementInitializer<T> ): T
      {
         return this.createElement<T>( "select", initializer, ( element: HTMLSelectElement ) =>
         {
            Object.defineProperty( element, "addOption", {
               value: function ( value: string, text?: string, tooltip?: string )
               {
                  const option: HTMLOptionElement = document.createElement( "option" );
                  option.value = value;
                  option.text = typeof text == "string" ? text : value;
                  typeof tooltip == "string" && ( option.title = tooltip );
                  this.add( option );
                  return option;
               }
            } );
         } );
      }

      /**
       * 建立文字顯示
      * @param text 文字內容
      * @param color 文字顏色
      * @param tooltip 提示說明
      * 範例：
      *    const text:HTMLLabelElementExt = block.createLabel("測試", "就一個測試");
      *    text.bold().italic().underline().color = Color.CYAN;
      */
      public createLabel ( text: string = "", tooltip: string = "" ): HTMLLabelElementExt
      {
         const element: HTMLLabelElementExt = this.createElement( "label" );
         element.innerHTML = text;
         element.style.color = Color.WHITE.toString();
         element.title = tooltip;
         Object.defineProperty( element, "text", { get: function () { return element.innerHTML; }, set: function ( text: string ) { element.innerHTML = text; } } );
         Object.defineProperty( element, "for", { get: function () { return element.getAttribute( "for" ); }, set: function ( id: string ) { this.setAttribute( "for", id ); } } );
         Object.defineProperty( element, "color", { set: function ( color: Color ) { element.style.color = color.toString(); } } );
         Object.defineProperty( element, "outline", { set: function ( outline: Color ) { element.style.textShadow = `-1px -1px 0 ${ outline.toString() }, 1px -1px 0 ${ outline.toString() }, -1px 1px 0 ${ outline.toString() }, 1px 1px 0 ${ outline.toString() }`; } } );
         Object.defineProperty( element, "bold", { value: function () { element.style.fontWeight = "bold"; return element; } } );
         Object.defineProperty( element, "italic", { value: function () { element.style.fontStyle = "italic"; return element; } } );
         Object.defineProperty( element, "underline", { value: function () { element.style.textDecoration = "underline"; return element; } } );
         Object.defineProperty( element, "selectable", { value: function () { element.style.userSelect = "text"; } } );
         return element;
      }

      public createElementSlider ( min:number, max:number, step:number): HTMLInputElement
      {
         const slider:HTMLInputElement = this.createElement("input");
         slider.type = "range";
         slider.min = min.toString();
         slider.max = max.toString();
         slider.step = step.toString();
         return slider;
      }

      /**
       * 建立[標題-Checkbox]群組顯示
      * @param title 標題
      * @param list Checkbox 設定元素列表(最少 1 個)
      * @param buttonTitles 按鈕標題
      * @param initializer 初始化元件 function
      * 範例：
      *    const group: CheckboxGroup = block.createGroupInputCheckbox( "全自定義網址", [
      *                                     CheckboxElement.Create( "手動" ),
      *                                     CheckboxElement.Create( "自動" ),
      *                                  ] );
      */
      public createGroupInputCheckbox ( title: string, list: CheckboxElements, buttonTitles?: string[], initializer?: ( group: CheckboxGroup ) => void ): CheckboxGroup
      {
         if ( !Array.isArray( list ) || list.length < 1 )
         {
            return null;
         }

         const block: HTMLBlockElement = this.createBlock();
         const labelElement: HTMLLabelElementExt = block.createLabel( title );
         block.space();

         const checkboxElements: HTMLInputCheckboxElement[] = [];
         for ( let i = 0; i < list.length; i++ )
         {
            checkboxElements.push( block.createElementInputCheckbox( list[ i ].text ) );
            list.length == 1 && ( labelElement.for = checkboxElements[ i ].id );
         }

         const buttonElements: HTMLButtonElementExt[] = [];
         if ( Array.isArray( buttonTitles ) )
         {
            block.space();
            for ( let i = 0; i < buttonTitles.length; i++ )
            {
               buttonElements.push( block.createElementButton( buttonTitles[ i ] ) );
            }
         }

         const group: CheckboxGroup = new CheckboxGroup( labelElement, checkboxElements, buttonElements );
         initializer && initializer( group );

         return group;
      }

      /**
       * 建立[標題-Radio]群組顯示
      * @param title 標題
      * @param list Radio 設定元素列表(最少 1 個)
      * @param buttonTitles 按鈕標題
      * @param initializer 初始化元件 function
      * 範例：
      *    const group: RadioGroup = block.createGroupInputRadio( "性別", [ 
      *                                  RadioElement.Create( "male", "男" ), 
      *                                  RadioElement.Create( "female", "女" ) 
      *                               ] );
      */
      public createGroupInputRadio ( title: string, list: RadioElements, buttonTitles?: string[], initializer?: ( group: RadioGroup ) => void ): RadioGroup
      {
         if ( !Array.isArray( list ) || list.length < 1 )
         {
            return null;
         }

         const key: string = Date.now().toString();
         const block: HTMLBlockElement = this.createBlock();
         const labelElement: HTMLLabelElementExt = block.createLabel( title );
         block.space();

         const radioElements: HTMLInputRadioElement[] = [];
         for ( let i = 0; i < list.length; i++ )
         {
            const id: string = `${ key }_` + i;
            radioElements.push( block.createElementInputRadio( title, id, list[ i ].value, list[ i ].text ) );
         }
         radioElements[ 0 ].checked = true;

         const buttonElements: HTMLButtonElementExt[] = [];
         if ( Array.isArray( buttonTitles ) )
         {
            block.space();
            for ( let i = 0; i < buttonTitles.length; i++ )
            {
               buttonElements.push( block.createElementButton( buttonTitles[ i ] ) );
            }
         }

         const group: RadioGroup = new RadioGroup( labelElement, radioElements, buttonElements );
         initializer && initializer( group );

         return group;
      }

      /**
       * 建立[標題-文字輸入-按鈕]群組顯示
      * @param title 標題
      * @param buttonTitles 按鈕標題
      * @param initializer 初始化元件 function
      * 範例：
      *    const group:InputGroup = block.createGroupInputText("全自定義網址", ["確定", "取消"]);
      *    const labelElement:HTMLLabelElementExt = group.label;
      *    const btnConfirm:HTMLButtonElementExt = group.buttons[0];
      *    const btnCancel:HTMLButtonElementExt = group.buttons[1];
      *    btnConfirm.onclick = ()=>{
      *                            // [確定事件]
      *                          }
      *    btnCancel.onclick = ()=>{
      *                            // [取消事件]
      *                          }
      */
      public createGroupInputText ( title: string, buttonTitles?: string[], initializer?: ( group: InputGroup ) => void ): InputGroup
      {
         return this.createGroupInput( this.createElementInputText, title, buttonTitles, initializer );
      }

      /**
       * 建立[標題-數字輸入-按鈕]群組顯示
      * @param title 標題
      * @param buttonTitles 按鈕標題
      * @param initializer 初始化元件 function
      * 範例：
      *    const group:InputGroup = block.createGroupInputNumber("加速", ["確定"]);
      *    const btnConfirm:HTMLButtonElementExt = group.button[0];
      *    btnConfirm.onclick = ()=>{
      *                            // [確定事件]
      *                          }
      */
      public createGroupInputNumber ( title: string, buttonTitles?: string[], initializer?: ( group: InputGroup ) => void ): InputGroup
      {
         return this.createGroupInput( this.createElementInputNumber, title, buttonTitles, initializer );
      }

      /**
       * 建立[標題-Select]群組
      * @param title 標題
      * @param buttonTitles 按鈕標題
      * @param initializer 初始化元件 function
      * 範例：
      *    const group: SelectGroup = block.createGroupSelect( "Service", [ "確定" ] );
      *    const select: HTMLSelectElementExt = group.select;
      *    for ( let i = 0; i < 5; i++ )
      *    {
      *       select.addOption( i.toString(), i.toString(), i.toString() );
      *    }
      *    select.title = "這是一個測試"; // 設定游標移到元件上面停留時候顯示的提示文字
      *    group.buttons[ 0 ].onclick = () =>
      *    {
      *       // [確定事件]
      *    };
      */
      public createGroupSelect ( title: string, buttonTitles?: string[], initializer?: ( group: SelectGroup ) => void ): SelectGroup
      {
         const block: HTMLBlockElement = this.createBlock();
         const labelElement: HTMLLabelElementExt = block.createLabel( title );
         const selectElement: HTMLSelectElementExt = block.createElementSelect();

         const buttonElements: HTMLButtonElementExt[] = [];
         if ( Array.isArray( buttonTitles ) )
         {
            block.space();
            for ( let i = 0; i < buttonTitles.length; i++ )
            {
               buttonElements.push( block.createElementButton( buttonTitles[ i ] ) );
            }
         }

         const group: SelectGroup = new SelectGroup( labelElement, selectElement, buttonElements );
         initializer && initializer( group );

         return group;
      }

      /**
       * 建立可開啟視窗的按鈕
      * @param text 按鈕標題
      * @param title 視窗標題
      * @param body 視窗內容建立對象
      * @param width 視窗寬度
      * @param height 視窗高度
      * 範例：
      *    const button:HTMLButtonElementExt = block.createWindowEntry( "新世界", "新世界", (createBlock: BlockCreator)=>{} );
      */
      public createWindowEntry ( text: string, title: string, body: ( createBlock: BlockCreator ) => void, width: number = 450, height: number = 450 ): HTMLButtonElementExt
      {
         let wnd: WindowProxy;
         const entryButton: HTMLButtonElementExt = this.createElementButton( text );
         entryButton.onclick = function ()
         {
            if ( wnd )
            {
               wnd.focus();
            } else
            {
               wnd = window.open( "", '_blank', `width=${ width },height=${ height }` );
               const wndDoc: Document = wnd.document;
               wndDoc.open();
               wndDoc.write( `<html><head><meta http-equiv="Content-type" content="text/html; charset=utf-8" /><title>${ title }</title></head><body></body></html>` );
               wndDoc.close();
               const oldUnload: Function = window.onbeforeunload;
               window.onbeforeunload = function ()
               {
                  oldUnload && oldUnload();
                  if ( wnd && !wnd.closed )
                  {
                     wnd.close();
                  }
               };
               body && body( function ( creator: BlockBuilder )
               {
                  const block: HTMLBlockElement = new HTMLBlockElement( wndDoc.body );
                  creator( block );
                  return block;
               } );
               wnd.onbeforeunload = function () { wnd = null; };
            }
         };
         return entryButton;
      };

      /**
       * 建立 HTML 元件
      * @param type 元件類型
      * @param initializer 初始化元件 function
      * @param modifier 元件修飾 function
      */
      private createElement<T extends HTMLElement> ( type: string, initializer?: ElementInitializer<T>, modifier?: ElementInitializer<T> ): T
      {
         const element: T = document.createElement( type ) as T;
         this.root.appendChild( element );
         modifier && modifier( element );
         initializer && initializer( element );
         return element;
      }

      /**
       * 建立輸入群組顯示
      * @param createFunc 執行建立的 function
      * @param title 標題
      * @param buttonTitles 按鈕標題
      * @param initializer 初始化元件 function
      */
      private createGroupInput ( createFunc: Function, title: string, buttonTitles?: string[], initializer?: ( group: InputGroup ) => void ): InputGroup
      {
         const block: HTMLBlockElement = this.createBlock();
         const labelElement: HTMLLabelElementExt = block.createLabel( title );
         block.space();
         const inputElement: HTMLInputElementExt = createFunc.call( block );
         const buttons: HTMLButtonElementExt[] = [];
         if ( Array.isArray( buttonTitles ) )
         {
            for ( let i = 0; i < buttonTitles.length; i++ )
            {
               block.space();
               buttons.push( block.createElementButton( buttonTitles[ i ] ) );
            }
         }
         labelElement.for = inputElement.id = Date.now().toString();
         buttons.length == 1 && inputElement.enterTrigger( buttons[ 0 ] );
         const group: InputGroup = new InputGroup( labelElement, inputElement, buttons );
         initializer && initializer( group );
         return group;
      }
   }

   /**
    * 創建一個空區域
   * @param body 內容建立對象
   * @param alignRight 是否靠右對齊
   */
   function createPlaneArea ( body: ( createBlock: BlockCreator ) => void, alignRight: boolean = false ): HTMLDivElement
   {
      const planeArea: HTMLDivElement = document.createElement( "div" );
      body && body( ( creator: BlockBuilder ) => {
         const block: HTMLBlockElement = new HTMLBlockElement( planeArea, alignRight );
         creator( block );
         return block;
      } );
      return planeArea;
   };

   //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
   //////////////////////////////////////////////////////// 初始化入口 ///////////////////////////////////////////////////////////
   //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
   game.once( Game.EVENT_GAME_INITED, () =>
   {
      init && init();

      const containerR: HTMLDivElement = document.createElement( "div" ) as HTMLDivElement;
      containerR.id = "_right_";
      containerR.setAttribute( "style", "position:absolute;top:0px;right:10px;z-index:9999;display:block;" );
      document.body.appendChild( containerR );

      const containerL: HTMLDivElement = document.createElement( "div" ) as HTMLDivElement;
      containerL.id = "_left_";
      containerL.setAttribute( "style", "position:absolute;top:40px;left:10px;z-index:9999;display:block;" );
      document.body.appendChild( containerL );

      const planeAreaR: HTMLDivElement = createPlaneArea( planeAreaRGUI, true );
      planeAreaR.style.marginTop = "10px";
      containerR.appendChild( planeAreaR );

      const planeAreaL: HTMLDivElement = createPlaneArea( planeAreaLGUI );
      planeAreaL.style.pointerEvents = containerL.style.pointerEvents = "none";
      containerL.appendChild( planeAreaL );
   } );
}
