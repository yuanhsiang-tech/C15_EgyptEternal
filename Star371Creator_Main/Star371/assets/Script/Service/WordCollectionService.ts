import { ProtoService } from "./Foundation/ProtoService";
import { ServiceInstance } from "./Foundation/Service";

@ServiceInstance
export class WordCollectionService extends ProtoService {
    public static readonly Instance: WordCollectionService;
}


