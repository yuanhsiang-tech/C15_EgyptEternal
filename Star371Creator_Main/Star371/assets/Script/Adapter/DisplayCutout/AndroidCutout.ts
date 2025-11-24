import { BUILD, NATIVE } from "cc/env";
import { Device } from "../../Device/Device";
import { EventDefine } from "../../Define/EventDefine";
import { EventDispatcher } from "../../../Stark/Utility/EventDispatcher";

!NATIVE && !!localStorage.getItem("simulateAndroidNotch") &&
(function(){
    if (!(!BUILD || document.body.getElementsByClassName("footer")?.length > 0)) return;
    const STYLE_LANDSCAPE_LEFT = "position:absolute;left:20px;top:48%;transform:rotate(-90deg) scale(1.0);";
    const STYLE_LANDSCAPE_RIGHT = "position:absolute;right:20px;top:48%;transform:rotate(90deg) scale(1.0);";
    const STYLE_PORTRAIT = `position:absolute;left:46.5%;top:7px;transform:rotate(0deg) scale(0.65);`;
    const img = document.createElement("img");
    img.id = "AndroidCutoutSimulator";
    img.setAttribute("style", STYLE_LANDSCAPE_LEFT)
    img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB0AAAAeCAYAAADQBxWhAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAABUxJREFUeJztlstvG1UUxuvH2DP2eN53np63PXYSx3acB7QppYiHKsEChKqycakCTSVYsEMVz7JBYlGBQCz59yKxQEiINYdzLk0yUydVKsKOK13Zsmfu73znnPvde+XK/+OM0RFaoip2mNHt8emqOvMUnUWaaWYGa10a6PfPHtfeXl/IIz+OFKn7qSJKf2mdLtBkPRVsnL6i/er21IOh5Ua7YSb9K+DUjztvFJvTa/HgUWr7wHQGtVoN8K+VWcffY90CVHwY6VYxtv3ng5O6r9+8re6kxf0QFxKawpmgsyYF5SkaDCxnuX5RMAF/uX3A3r/6ysNpMsBF6iuL1ut1aDSa0Kg3UWH9TPWYchheFHxv76Z6Z/v6w0k/rSxGoGazCWJbgm6nB4qsg9IzoSMp0G6J0GwIlQDpXQIv+sny5cGaeB6vlhpM247yj3KnXwGSKlHsIEQHy3AhcCOIggTCIAXPiYDhb6piYEAdDK5RAY+dAGZBHJ8HrfuqsTfCh0hVGdjtKGCbPkT9DLK0gMFgrTLzrMAAYh6Q2JZPwARt4vsbXni4n43bK8Sx40upaX8hoaLTlDYwfTI4lgdJlCNwCGk84N/TGGcy/CeIfMzhSTRAsIfplk4yRZ9D5kNuuf4KdOqF9tj2TupCDwtCCwyNQYyLETCJMuh7IXjMw+lzdQQmaJ6NODgOM+jJGs/QcfAtrDeTlY+xq4UKNLNcOzJYpXE6HRl8rB8tRgpDPwLHdEHDBlJ7FjgshDwdcSgpzgmO0zQcaGFzlfsCS/dbXzPlE+DRVz/UPrj2am6oRqmWAjaOwSMnFQQllUzHppEZyHIImrkBaTaFIUGxrtkTtb4bYlm6FSgJSi2ndwr98vv6d2/d2ZZR2Wlq26BrFq8dT10+4gEEXgrMTEHWtkAybwJzp5iBBP87fm7Mn5O7vUpDhroJiclK0M8f17+99e72sfMQtFWCDgdj2FjbhLXRBIrRDLzkRZDtl6Cr74KipGAoLtY4wPoOnkDTFaglK+TTFWjtvfkLeaNxuseaGICCey/GTi0wZdPJHLamC5jM9yGZvAZmfx8UdYCpdkAnqOXzElBNA0xvF7NWNgu5LUJPlE6hNIRGwxZKUIqSnIc3Uk5KZ7A93YGt+VUYTfahnyyAsRxM3cfm8nm9ab9SQzHT5c5V3jZ97Bc8AqtQSRBsURAqD1IHmrrNG2RUbMBsYw47013YQ7WTtS1IeHPFvKsptVTTEJ1KRedqlg4JEVUWzPtk0w2rW0bBwxnl//G0G8ldBTxMF+3TYrgOm+sInu3CfHOBgaxD9sQgCJhgAzHcLmQwldSKEihSx14xB03qtuyedq9vOhXvpIaireOjH2eoZojgYrjGlQ+x1pQFCogs0sa0Ui3LvUFrJKaNruStQmnM4kLK3fDDHtby9KU6prnNFVOqA6wdKSJ3SrBLKZ0uHvC6anHLLDsRTXQiMv27syA5/zqzE+VjNOhKux8bd5sfazIq1/BUMfmpI+Oi5FxtrNvTCn3NhMx0lrnpnHu08XEjG0l7Yb7E+85Th3ONqyYl5MktQeQGImDzEaz8LH3XMLCYecsNP3428HjsY5rnfrwcoKlraN7ldB0vWp7l/yhDGpbHVs2lb3nPd09a9FNp4seF1lUORVR03oWsHAgB8VKG9yPvrquaF1N41sBrp4Rb6cBVtD/pgA+wuw30UQVrqeJ1RMUrqIrXUdz4dBt8gPWL5hdN6TPBotQKNMNC5Sy2ffbgxq388TvLxf3rr+c6Xrh1vHinhs3WnWD1dnBZ4+ibn2tHj36qHz36sfafQS57/A2nr2MHtMIzDgAAAABJRU5ErkJggg=="
    document.getElementsByTagName("Canvas")?.[0]?.parentElement?.appendChild(img);
    EventDispatcher.Shared.On(EventDefine.System.INTERFACE_ORIENTATION_CHANGED, (interfaceOrientation)=>{
        switch (interfaceOrientation) {
            case Device.InterfaceOrientation.LANDSCAPE_LEFT: {
                img.setAttribute("style", STYLE_LANDSCAPE_LEFT);
                break;
            }
            case Device.InterfaceOrientation.LANDSCAPE_RIGHT: {
                img.setAttribute("style", STYLE_LANDSCAPE_RIGHT);
                break;
            }
            case Device.InterfaceOrientation.PORTRAIT: {
                img.setAttribute("style", STYLE_PORTRAIT);
                break;
            }
        }
    }, window);
})()