import { builtinResMgr, Material, Texture2D, SpriteFrame } from "cc";

export namespace BuiltinResUtils
{
    export class GetMaterial
    {
        public static get UISprite(): Material {
            return builtinResMgr.get("ui-sprite-material");
        }

        public static get UISpriteGray(): Material {
            return builtinResMgr.get("ui-sprite-gray-material");
        }
    }

    export class GetTexture
    {
        public static get WhiteTexture(): Texture2D {
            return builtinResMgr.get("white-texture");
        }

        public static get BlackTexture(): Texture2D {
            return builtinResMgr.get("black-texture");
        }
    }
}
