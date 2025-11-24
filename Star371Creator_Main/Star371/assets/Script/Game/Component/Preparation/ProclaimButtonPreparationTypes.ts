import ProclaimButton from "../ProclaimButton";
import { Vec2, Node} from "cc";

export namespace ScreenDialogButtonPreparations {

    export interface InitConfig {
        RootNode?: Node;
        Offset?: Vec2;
    }

    export interface ResultData {
        proclaimButton: ProclaimButton;
    }

}
