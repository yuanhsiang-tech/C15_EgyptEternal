#pragma once

#import "cocos.h"
#import "cocos/base/UTF8.h"
#include "cocos/engine/Engine.h"
#include "cocos/bindings/jswrapper/SeApi.h"

namespace JsCall {

#define GetObjFunction(objName, funcName)\
    se::AutoHandleScope hs;\
    \
    se::Value window;\
    se::Object* windowObj = nullptr;\
    se::Object* global = se::ScriptEngine::getInstance()->getGlobalObject();\
    if (global->getProperty("window", &window) && !window.isNullOrUndefined()) {\
        windowObj = window.toObject();\
    }\
    \
    se::Value target;\
    se::Object* targetObj = nullptr;\
    if (windowObj != nullptr && windowObj->getProperty(objName, &target) && !target.isNullOrUndefined()) {\
        targetObj = target.toObject();\
    }\
    \
    se::Value func;\
    se::Object* funcObj = nullptr;\
    if (targetObj != nullptr) {\
        if (targetObj->getProperty(funcName, &func) && !func.isNullOrUndefined()) {\
            funcObj = func.toObject();\
            if (!funcObj->isFunction()) {\
                funcObj = nullptr;\
            }\
        }\
    }\

#define GetGlobalFunction(funcName) GetObjFunction("globalThis", funcName)

cc::Engine::SchedulerPtr GetScheduler();
void EvalString(const std::string& command);

}
