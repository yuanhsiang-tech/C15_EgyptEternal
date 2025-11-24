import { RESTfulService } from './Foundation/RESTfulService';
import { ServiceInstance } from './Foundation/Service';

@ServiceInstance
export class LogService extends RESTfulService {
    public static readonly Instance: LogService;
}


