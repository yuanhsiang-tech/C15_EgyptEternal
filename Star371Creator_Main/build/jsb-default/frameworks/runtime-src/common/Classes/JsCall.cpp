#include "JsCall.h"

namespace JsCall {

cc::Engine::SchedulerPtr GetScheduler() {
    auto app = CC_CURRENT_APPLICATION();
    auto engine = app->getEngine();
    return engine->getScheduler();
}

void EvalString(const std::string& command) {
    auto app = CC_CURRENT_APPLICATION();
    auto engine = app->getEngine();
    engine->getScheduler()->performFunctionInCocosThread([=](){
        se::Value ret;
        se::ScriptEngine *engine = se::ScriptEngine::getInstance();
        if (engine->isValid()) {
            engine->evalString(command.c_str(), static_cast<uint32_t>(command.size()), &ret);
        }
    });
}

}
