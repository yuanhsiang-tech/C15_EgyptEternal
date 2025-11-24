#include "Star371.h"
#include "bindings/manual/jsb_conversions.h"
#include "bindings/manual/jsb_global.h"
#include <string>
#include <unordered_map>
#include "JsCall.h"

#if CC_PLATFORM == CC_PLATFORM_ANDROID
#include <jni.h>
#include <application/ApplicationManager.h>
#include "engine/EngineEvents.h"
#include "platform/interfaces/modules/Device.h"
#include "platform/java/jni/JniHelper.h"
#include "platform/java/jni/glue/JniNativeGlue.h"
#include "platform/java/modules/SystemWindow.h"

extern "C" {
JNIEXPORT void JNICALL Java_com_igs_StoreKit_nativeOnPurchaseSuccess(JNIEnv *env, jclass thiz, jstring jaccountId_serialNo, jstring jproductId, jstring jpurchaseToken, jstring jinterrupted, jstring jreceiptContent, jstring jsignature) {
    auto accountId_serialNo = cc::JniHelper::jstring2string(jaccountId_serialNo);
    auto productId          = cc::JniHelper::jstring2string(jproductId);
    auto purchaseToken      = cc::JniHelper::jstring2string(jpurchaseToken);
    auto interrupted        = cc::JniHelper::jstring2string(jinterrupted);
    auto receiptContent     = cc::JniHelper::jstring2string(jreceiptContent);
    auto signature          = cc::JniHelper::jstring2string(jsignature);

    GetObjFunction("IabBridge", "OnPurchaseSuccess_Android");
    if (funcObj != nullptr) {
        funcObj->call(
                se::ValueArray{
                        se::Value(accountId_serialNo),
                        se::Value(productId),
                        se::Value(purchaseToken),
                        se::Value(interrupted),
                        se::Value(receiptContent),
                        se::Value(signature)
                },
                targetObj
        );
    }
}
}
#endif

#pragma mark - StorageMemory

namespace {
    std::unordered_map<std::string, std::string> storage_memory_map;

    bool js_StorageMemory_Read (se::State& s) {
        const auto& args = s.args();
        size_t argc = args.size();
        
        if (argc != 1) {
            SE_REPORT_ERROR ("StorageMemory ==> wrong number of arguments: %d, was expecting %d", ( int ) argc, 1);
            return false;
        }
        
        bool ok = true;
        std::string key;
        ok &= sevalue_to_native(args[0], &key, s.thisObject());
        SE_PRECONDITION2 (ok, false, "StorageMemory ==> Process key error");
        
        s.rval().setUndefined();
        auto it = storage_memory_map.find(key);
        if ( it != storage_memory_map.end()) {
            s.rval().setString(it->second);
        }
        
        return true;
    }
    SE_BIND_FUNC (js_StorageMemory_Read)

    bool js_StorageMemory_Write (se::State& s) {
        const auto& args = s.args();
        size_t argc = args.size();
        
        if ( argc != 2 ) {
            SE_REPORT_ERROR ("StorageMemory ==> wrong number of arguments: %d, was expecting %d", ( int ) argc, 2);
            return( false );
        }
        
        bool ok = true;
        std::string key;
        ok &= sevalue_to_native (args[0], &key, s.thisObject ());
        SE_PRECONDITION2 (ok, false, "StorageMemory ==> Process key error");
        
        std::string value;
        ok &= sevalue_to_native (args[1], &value, s.thisObject ());
        SE_PRECONDITION2 (ok, false, "StorageMemory ==> Process value error");
        
        s.rval ().setBoolean(storage_memory_map.find(key) != storage_memory_map.end());
        storage_memory_map[key] = value;
        
        return true;
    }
    SE_BIND_FUNC (js_StorageMemory_Write)

    bool js_StorageMemory_Delete (se::State& s) {
        const auto& args = s.args();
        size_t argc = args.size();
        
        if (argc != 1) {
            SE_REPORT_ERROR ("StorageMemory ==> wrong number of arguments: %d, was expecting %d", (int) argc, 1);
            return( false );
        }
        
        bool ok = true;
        std::string key;
        ok &= sevalue_to_native(args[0], &key, s.thisObject());
        SE_PRECONDITION2 (ok, false, "StorageMemory ==> Process key error");
        
        s.rval().setBoolean(storage_memory_map.find(key) != storage_memory_map.end());
        storage_memory_map.erase(key);
        
        return true;
    }
    SE_BIND_FUNC (js_StorageMemory_Delete)

    bool js_register_StorageMemory (se::Object * obj) {
        auto * cls = se::Class::create ("StorageMemory", obj, nullptr, nullptr);
        
        cls->defineStaticFunction ("Delete", _SE (js_StorageMemory_Delete));
        cls->defineStaticFunction ("Read", _SE (js_StorageMemory_Read));
        cls->defineStaticFunction ("Write", _SE (js_StorageMemory_Write));
        
        cls->install ();
        
        se::ScriptEngine::getInstance ()->clearException ();
        return( true );
    }
}

#if (CC_PLATFORM == CC_PLATFORM_IOS)
#pragma mark - StorageDevice

namespace KeyChain {
bool Write(const std::string& key, const std::string& value);
bool Read(const std::string& key, std::string * outValue);
bool Delete(const std::string& key);
}

namespace {
    bool js_StorageDevice_Read (se::State& s) {
        const auto& args = s.args ();
        size_t argc = args.size ();

        if ( argc != 1 ) {
            SE_REPORT_ERROR ("StorageDevice ==> wrong number of arguments: %d, was expecting %d", ( int ) argc, 1);
            return false;
        }
        
        bool ok = true;
        std::string key;
        ok &= sevalue_to_native (args[0], &key, s.thisObject ());
        SE_PRECONDITION2 (ok, false, "StorageDevice ==> Processing key error");
        
        s.rval ().setUndefined ();
        std::string value;
        if (KeyChain::Read (key, &value)) {
            s.rval ().setString (value);
        }

        return true;
    }
    SE_BIND_FUNC (js_StorageDevice_Read)

    static bool js_StorageDevice_Write (se::State& s) {
        const auto& args = s.args ();
        size_t argc = args.size ();

        if (argc != 2) {
            SE_REPORT_ERROR ("StorageDevice ==> wrong number of arguments: %d, was expecting %d", ( int ) argc, 2);
            return false;
        }
        
        bool ok = true;
        std::string key;
        ok &= sevalue_to_native (args[0], &key, s.thisObject ());
        SE_PRECONDITION2 (ok, false, "StorageDevice ==> Process key error");

        std::string value;
        ok &= sevalue_to_native (args[1], &value, s.thisObject ());
        SE_PRECONDITION2 (ok, false, "StorageDevice ==> Process value error");

        s.rval ().setBoolean(KeyChain::Write(key, value));

        return true;
    }
    SE_BIND_FUNC (js_StorageDevice_Write)

    static bool js_StorageDevice_Delete (se::State& s) {
        CC_UNUSED bool ok = true;
        const auto& args = s.args ();
        size_t argc = args.size ();
        const char * result;

        if (argc != 1) {
            SE_REPORT_ERROR ("StorageDevice ==> wrong number of arguments: %d, was expecting %d", ( int ) argc, 1);
            return false;
        }

        std::string key;
        ok &= sevalue_to_native (args[0], &key, s.thisObject ());
        SE_PRECONDITION2 (ok, false, "StorageDevice ==> Process key error");

        s.rval ().setBoolean(KeyChain::Delete(key));

        return true;
    }
    SE_BIND_FUNC (js_StorageDevice_Delete)

    bool js_register_StorageDevice (se::Object * obj) {
        auto * cls = se::Class::create ("StorageDevice", obj, nullptr, nullptr);
        
        cls->defineStaticFunction ("Delete", _SE (js_StorageDevice_Delete));
        cls->defineStaticFunction ("Read", _SE (js_StorageDevice_Read));
        cls->defineStaticFunction ("Write", _SE (js_StorageDevice_Write));
        
        cls->install ();

        se::ScriptEngine::getInstance ()->clearException ();
        return true;
    }
}
#endif

#pragma mark - Register

bool register_Star371 (se::Object * obj) {
    se::Value nsVal;
    if ( !obj->getProperty ("Star371", &nsVal, true)) {
        nsVal.setObject (se::HandleObject{se::Object::createPlainObject()});
        obj->setProperty ("Star371", nsVal);
    }

    se::Object* ns = nsVal.toObject ();
    js_register_StorageMemory(ns);
#if (CC_PLATFORM == CC_PLATFORM_IOS)
    js_register_StorageDevice(ns);
#endif
    
    return( true );
}
