import { ProtoService } from "./Foundation/ProtoService";
import { ServiceInstance } from "./Foundation/Service";

@ServiceInstance
export class DayBuyService extends ProtoService {
    public static readonly Instance: DayBuyService;
}


