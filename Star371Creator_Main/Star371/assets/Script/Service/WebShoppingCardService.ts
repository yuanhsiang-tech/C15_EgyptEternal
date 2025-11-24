import { ProtoService } from "./Foundation/ProtoService";
import { ServiceInstance } from "./Foundation/Service";

@ServiceInstance
export class WebShoppingCardService extends ProtoService {
    public static readonly Instance: WebShoppingCardService;
}


