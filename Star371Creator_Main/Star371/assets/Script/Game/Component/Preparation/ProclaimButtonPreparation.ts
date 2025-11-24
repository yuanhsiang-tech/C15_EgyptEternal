import { isValid, instantiate, Prefab, v3, Node, error} from "cc";

import { ScreenDialogButtonPreparations as ProclaimButtonPreparations } from "./ProclaimButtonPreparationTypes";
import { AssetDefine } from "../../../Define/AssetDefine";
import { Preparation } from "../../../Scene/Preparation/Preparation";
import ProclaimButton from "../ProclaimButton";
import { PreparationFactory } from "../../../Scene/Preparation/PreparationFactory";
import { PersistLayers } from "../../../Feature/PersistLayers/PersistLayers";
import { Preparations } from "../../../Scene/Preparation/PreparationMacro";
import { Device } from "../../../Device/Device";
import { Identifier } from "../../../Define/IdentifierDefine";
import { Define } from "../../../Define/GeneralDefine";
import { NodeUtils } from "db://assets/Stark/FuncUtils/NodeUtils";
import { Bundle } from "../../../Bundle/Bundle";

export class ProclaimButtonPreparation extends Preparation<ProclaimButtonPreparations.InitConfig, ProclaimButtonPreparations.ResultData> {

    public get Key(): string {
        return Identifier.PREPARATION.PROCLAIM_BUTTON;
    }

    public Prepare(sceneOrientation: Device.Orientation): void {
        // Implement the preparation logic here

        Bundle.Load(
            AssetDefine.SLOTS.SCREEN_DIALOG_BUTTON.bundleName,
            (err: Error, bundle: Bundle)=>{
                if (err) {
                    error( err.message || err );
                    this.Resolve(Preparations.RESULT_TYPE.FAIL, null, `Can't load bundle ${AssetDefine.SLOTS.SCREEN_DIALOG_BUTTON.bundleName}`)
                    return;
                }

                bundle.Load(
                    AssetDefine.SLOTS.SCREEN_DIALOG_BUTTON.assetPath, 
                    Prefab,
                    (err, prefab) => {
                        if (this.IsResolved) {
                            return;
                        }
        
                        if (err) {
                            error( err.message || err , prefab );
                            this.Resolve( Preparations.RESULT_TYPE.FAIL, null, "Load prefab failed" );
                            return;
                        }
        
                        const dialogButton = this.SetupButton( prefab );
                        if (isValid(dialogButton, true)) {
                            this.Resolve( Preparations.RESULT_TYPE.SUCCESS, { proclaimButton: dialogButton } );
                        } else {
                            this.Resolve( Preparations.RESULT_TYPE.FAIL, { proclaimButton: null }, "Setup game bar failed" );
                        }
                    }
                )
            }
        )
    }

    protected SetupButton(prefab: Prefab): ProclaimButton {
        const node = instantiate( prefab );
        const root = this.InitConfig?.RootNode ?? null;

        if (isValid(root, true)) {
            node.parent = root;
        } else {
            node.parent = PersistLayers.Layer( Define.ZIndex.Global.GAME_SUPERIOR );
            node.setSiblingIndex( Define.ZIndex.GameSuperiors.PROCLAIM );
        }

        return NodeUtils.SearchComponent( node, ProclaimButton );
    }

}

(function(){
    PreparationFactory.Register( Identifier.PREPARATION.PROCLAIM_BUTTON, ProclaimButtonPreparation );
})();
