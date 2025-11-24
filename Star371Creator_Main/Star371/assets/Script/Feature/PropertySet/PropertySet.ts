import { _decorator, ccenum, Component, Label, log, Node } from 'cc';
import * as Currency from '../../Proto/gt2/currency/currency_pb';
import { EventDispatcher } from 'db://assets/Stark/Utility/EventDispatcher';
import { EventDefine } from '../../Define/EventDefine';
import { Type as LogCoinType } from "../../Proto/gt2/lct/lct_pb";
import { GameApp } from '../../App/GameApp';
import { NumberUtils } from 'db://assets/Stark/FuncUtils/NumberUtils';
const { ccclass, property } = _decorator;

ccenum(Currency.Type)

@ccclass('Property')
class Property {
    @property({
        type: Currency.Type,
        displayName: "Type"
    })
    private m_type: Currency.Type = Currency.Type.ICOIN;
    public get Type(): Currency.Type { return this.m_type; }

    @property({
        type: Label,
        displayName: "Label"
    })
    private m_label: Label = null;

    public SetValue(value:BigNumber) {
        this.m_label.string = NumberUtils.FormatEasy(value);
    }
}

@ccclass('PropertySet')
export class PropertySet extends Component {
    @property({
        type: [Property],
        displayName: "Properties"
    })
    private m_properties:Property[] = [];

    /**
     * 是否為單幣別，如果為單幣別表示用於遊戲主場
     */
    public get IsSingle(): boolean {
        return this.m_properties.length == 1;
    }

    protected onEnable(): void {
        EventDispatcher.Shared.On(EventDefine.System.CURRENCY_FLOWING, this.OnCurrencyFlowing, this);
        for (let property of this.m_properties) {
            property.SetValue(GameApp.Shared.CurrencyFlow.GetCurrency(property.Type));
        }
    }

    protected onDisable(): void {
        EventDispatcher.Shared.Off(EventDefine.System.CURRENCY_FLOWING, this.OnCurrencyFlowing, this);
    }

    private OnCurrencyFlowing(reason:LogCoinType, type:Currency.Type, fromValue:BigNumber, toValue:BigNumber, changeValue:BigNumber, isSafe:boolean, option?:any) {
        this.m_properties.find(x=>x.Type==type)?.SetValue(toValue);
    }
}


