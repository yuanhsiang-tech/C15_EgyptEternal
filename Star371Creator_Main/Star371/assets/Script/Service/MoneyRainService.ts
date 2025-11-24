import { ProtoService } from "./Foundation/ProtoService";
import { ServiceInstance } from "./Foundation/Service";

@ServiceInstance
export class MoneyRainService extends ProtoService {
    public static readonly Instance: MoneyRainService;
}


