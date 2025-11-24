import { ProtoService } from "./Foundation/ProtoService";
import { ServiceInstance } from "./Foundation/Service";

@ServiceInstance
export class MemberService extends ProtoService {
    public static readonly Instance: MemberService;
}


