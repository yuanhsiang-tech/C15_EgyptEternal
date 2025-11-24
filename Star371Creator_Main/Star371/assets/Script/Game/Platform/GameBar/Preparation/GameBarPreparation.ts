import { isValid, instantiate, Prefab, v3, error } from "cc";
import { GameBarPreparations } from "./GameBarPreparationTypes";
import GameBar from "../GameBar";
import { Device } from "../../../../Device/Device";
import { Preparation } from "db://assets/Script/Scene/Preparation/Preparation";
import CallbackBond from "db://assets/Stark/Utility/CallbackBond";
import { Preparations } from "db://assets/Script/Scene/Preparation/PreparationMacro";
import { NodeUtils } from "db://assets/Stark/FuncUtils/NodeUtils";
import { PreparationFactory } from "db://assets/Script/Scene/Preparation/PreparationFactory";
import { PersistLayers } from "db://assets/Script/Feature/PersistLayers/PersistLayers";
import { Identifier } from "db://assets/Script/Define/IdentifierDefine";
import { AssetDefine } from "db://assets/Script/Define/AssetDefine";
import { Define } from "db://assets/Script/Define/GeneralDefine";
import { Bundle } from "db://assets/Script/Bundle/Bundle";

export class GameBarPreparation extends Preparation<GameBarPreparations.InitConfig, GameBarPreparations.ResultData> {

    public get Key(): string {
        return Identifier.PREPARATION.GAME_BAR;
    }

    public Prepare(sceneOrientation: Device.Orientation): void
    {
        // Create callback bond
        let gameBar: GameBar = null;
        const cbBond = new CallbackBond(() =>
        {
            // Check UI ready and resolve
            if (isValid(gameBar, true)) {
                this.Resolve( Preparations.RESULT_TYPE.SUCCESS, { GameBar: gameBar } );
            } else {
                this.Resolve( Preparations.RESULT_TYPE.FAIL, { GameBar: null }, "Setup game bar failed" );
            }
        });

        // Load locale text
        // cbBond.AddMark( "locale_text" );
        // LocaleText.LoadJson( BundleDefine.FRAMEWORK.SLOTS, {directory: "Text"}, (success) =>
        // {
        //     if (!success) {
                // error( "Game bar load locale text failed" );
        //     }
        //     cbBond.DelMark( "locale_text" );
        // });

        // Load prefab
        const bundleName = this.InitConfig?.BundleName ?? AssetDefine.SLOTS.GAME_BAR.bundleName;
        const resPath = this.InitConfig?.BundleName ? "GameBar/GameBar" : AssetDefine.SLOTS.GAME_BAR.GetAssetPath(sceneOrientation);

        cbBond.AddMark( "load_prefab" );
        Bundle.Load(bundleName, (err: Error, bundle: Bundle)=>{
            if (err) {
                error(`Preload bundle(${bundleName}) failed: ${err.message}`);
            }
            else{
                bundle.Load(resPath, (err: Error, prefab: Prefab)=>{
                    if (this.IsResolved) {
                        return;
                    }
        
                    if (err) {
                        error( err.message || err , prefab );
                        this.Resolve( Preparations.RESULT_TYPE.FAIL, null, "Load prefab failed" );
                        return;
                    }
        
                    gameBar = this.SetupGameBar( prefab );
                    cbBond.DelMark( "load_prefab" );
                });
            }        
        });        

        cbBond.StartUp();
    }

    protected SetupGameBar(prefab: Prefab): GameBar {
        const node = instantiate( prefab );
        const root = this.InitConfig?.RootNode ?? null;

        if (isValid(root, true)) {
            node.parent = root;
        } else {
            node.parent = PersistLayers.Layer( Define.ZIndex.Global.GAME_INTERIOR );
            node.setSiblingIndex( Define.ZIndex.GameInteriors.GAME_BAR );
            const parentSize = NodeUtils.GetSize( node.parent );
            node.position = v3( 0, parentSize.height * -0.5 );
        }

        return NodeUtils.SearchComponent( node, GameBar );
    }

}

(function(){
    PreparationFactory.Register( Identifier.PREPARATION.GAME_BAR, GameBarPreparation );
})();
