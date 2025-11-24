import { Game, game } from "cc";
import AudioManager from "./Foundation/AudioManager";
import { Resource } from "../Define/ResourceDefine";
import Touchable from "../../Stark/Interactive/Touchable";
import { ButtonSoundDefine } from "../Define/ButtonSoundDefine";
import { EventDispatcher } from "../../Stark/Utility/EventDispatcher";
import { CommonButtonMacro } from "../../Stark/Interactive/CommonButtonMacro";


function OnButtonSoundEvent(target: Touchable, soundType: CommonButtonMacro.SOUND_TYPE){
    switch(soundType) {
        case CommonButtonMacro.SOUND_TYPE.DEFAULT:
            AudioManager.Instance.Play(Resource.Sound.BTN_UI)
            break;
        case CommonButtonMacro.SOUND_TYPE.NEGATIVE:
            AudioManager.Instance.Play(Resource.Sound.BTN_NEGATIVE)
            break;
        default: {
            const soundName:string = ButtonSoundDefine[target?.node?.name];
            soundName && AudioManager.Instance.Play(soundName);
            break;
        }
    }
}

game.once(Game.EVENT_GAME_INITED, ()=>{
    EventDispatcher.Shared.On(CommonButtonMacro.BUTTON_SOUND_EVENT, OnButtonSoundEvent, {});
});