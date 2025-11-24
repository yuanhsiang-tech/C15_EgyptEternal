import { ProtoService } from "./Foundation/ProtoService";
import { ServiceInstance } from "./Foundation/Service";

@ServiceInstance
export class DailyCheckService extends ProtoService {
    public static readonly Instance: DailyCheckService;
}


