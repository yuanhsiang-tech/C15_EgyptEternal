import { ProtoService } from "./Foundation/ProtoService";
import { ServiceInstance } from "./Foundation/Service";

@ServiceInstance
export class VipService extends ProtoService {
    public static readonly Instance: VipService;
}


