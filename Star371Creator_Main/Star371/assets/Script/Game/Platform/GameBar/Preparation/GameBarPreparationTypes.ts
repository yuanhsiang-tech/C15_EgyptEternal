import { Node } from "cc";
import GameBar from "../GameBar";

export namespace GameBarPreparations {

    export interface InitConfig {
        RootNode?: Node;
        BundleName?: string;
    }

    export interface ResultData {
        GameBar: GameBar;
    }

}
