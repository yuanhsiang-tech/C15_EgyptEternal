import { ProtoService } from "./Foundation/ProtoService";
import { ServiceInstance } from "./Foundation/Service";

@ServiceInstance
export class DiamondRankService extends ProtoService {
    public static readonly Instance: DiamondRankService;
}


