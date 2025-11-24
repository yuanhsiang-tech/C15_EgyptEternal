import { ProtoService } from "./Foundation/ProtoService";
import { ServiceInstance } from "./Foundation/Service";

@ServiceInstance
export class FinanceService extends ProtoService {
    public static readonly Instance: FinanceService;
}


