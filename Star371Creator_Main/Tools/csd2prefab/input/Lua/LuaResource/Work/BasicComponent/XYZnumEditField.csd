<GameFile>
  <PropertyGroup Name="XYZnumEditField" Type="Node" ID="4c69bc11-2530-4eb2-a983-3139a7928e79" Version="3.10.0.0" />
  <Content ctype="GameProjectContent">
    <Content>
      <Animation Duration="20" Speed="1.0000">
        <Timeline ActionTag="103810180" Property="Scale">
          <ScaleFrame FrameIndex="0" Tween="False" X="0.3300" Y="0.3300" />
          <ScaleFrame FrameIndex="10" Tween="False" X="0.3300" Y="0.2400" />
          <ScaleFrame FrameIndex="20" X="0.3300" Y="0.1500">
            <EasingData Type="0" />
          </ScaleFrame>
        </Timeline>
        <Timeline ActionTag="103810180" Property="CColor">
          <ColorFrame FrameIndex="0" Alpha="255">
            <EasingData Type="0" />
            <Color A="255" R="255" G="255" B="255" />
          </ColorFrame>
          <ColorFrame FrameIndex="10" Alpha="255">
            <EasingData Type="0" />
            <Color A="255" R="255" G="0" B="0" />
          </ColorFrame>
          <ColorFrame FrameIndex="20" Alpha="255">
            <EasingData Type="0" />
            <Color A="255" R="0" G="0" B="255" />
          </ColorFrame>
        </Timeline>
        <Timeline ActionTag="331417843" Property="VisibleForFrame">
          <BoolFrame FrameIndex="0" Tween="False" Value="True" />
          <BoolFrame FrameIndex="10" Tween="False" Value="True" />
          <BoolFrame FrameIndex="20" Tween="False" Value="False" />
        </Timeline>
        <Timeline ActionTag="-428879802" Property="VisibleForFrame">
          <BoolFrame FrameIndex="0" Tween="False" Value="True" />
          <BoolFrame FrameIndex="10" Tween="False" Value="False" />
          <BoolFrame FrameIndex="20" Tween="False" Value="False" />
        </Timeline>
        <Timeline ActionTag="-1193571471" Property="FileData">
          <TextureFrame FrameIndex="0" Tween="False">
            <TextureFile Type="MarkedSubImage" Path="Lua/LuaResource/Work/resources/sort-down.png" Plist="Lua/LuaResource/Work/resources/BasicResources/Plist.plist" />
          </TextureFrame>
          <TextureFrame FrameIndex="5" Tween="False">
            <TextureFile Type="MarkedSubImage" Path="Lua/LuaResource/Work/resources/restore.png" Plist="Lua/LuaResource/Work/resources/BasicResources/Plist.plist" />
          </TextureFrame>
          <TextureFrame FrameIndex="10" Tween="False">
            <TextureFile Type="MarkedSubImage" Path="Lua/LuaResource/Work/resources/min.png" Plist="Lua/LuaResource/Work/resources/BasicResources/Plist.plist" />
          </TextureFrame>
          <TextureFrame FrameIndex="15" Tween="False">
            <TextureFile Type="MarkedSubImage" Path="Lua/LuaResource/Work/resources/max.png" Plist="Lua/LuaResource/Work/resources/BasicResources/Plist.plist" />
          </TextureFrame>
          <TextureFrame FrameIndex="20" Tween="False">
            <TextureFile Type="MarkedSubImage" Path="Lua/LuaResource/Work/resources/close.png" Plist="Lua/LuaResource/Work/resources/BasicResources/Plist.plist" />
          </TextureFrame>
        </Timeline>
        <Timeline ActionTag="-1193571471" Property="BlendFunc">
          <BlendFuncFrame FrameIndex="0" Tween="False" Src="1" Dst="771" />
          <BlendFuncFrame FrameIndex="5" Tween="False" Src="770" Dst="771" />
          <BlendFuncFrame FrameIndex="10" Tween="False" Src="770" Dst="771" />
          <BlendFuncFrame FrameIndex="15" Tween="False" Src="770" Dst="771" />
          <BlendFuncFrame FrameIndex="20" Tween="False" Src="770" Dst="771" />
        </Timeline>
      </Animation>
      <ObjectData Name="Node" Tag="168" ctype="GameNodeObjectData">
        <Size X="0.0000" Y="0.0000" />
        <Children>
          <AbstractNodeData Name="BG" ActionTag="103810180" Tag="68" IconVisible="False" LeftMargin="-230.0000" RightMargin="-230.0000" TopMargin="-54.4000" BottomMargin="-225.6000" Scale9Enable="True" LeftEage="6" RightEage="6" TopEage="6" BottomEage="6" Scale9OriginX="6" Scale9OriginY="6" Scale9Width="8" Scale9Height="8" ctype="ImageViewObjectData">
            <Size X="460.0000" Y="280.0000" />
            <AnchorPoint ScaleX="0.5000" ScaleY="1.0000" />
            <Position Y="54.4000" />
            <Scale ScaleX="0.3300" ScaleY="0.3300" />
            <CColor A="255" R="255" G="255" B="255" />
            <PrePosition />
            <PreSize X="0.0000" Y="0.0000" />
            <FileData Type="MarkedSubImage" Path="Lua/LuaResource/Work/resources/d_SystemBtn_Bg.png" Plist="Lua/LuaResource/Work/resources/BasicResources/Plist.plist" />
          </AbstractNodeData>
          <AbstractNodeData Name="XYZ_Name" ActionTag="-571472984" Tag="69" IconVisible="False" LeftMargin="-70.0000" RightMargin="46.0000" TopMargin="-50.0000" BottomMargin="38.0000" FontSize="12" LabelText="座標" ShadowOffsetX="2.0000" ShadowOffsetY="-2.0000" ctype="TextObjectData">
            <Size X="24.0000" Y="12.0000" />
            <AnchorPoint ScaleX="0.5000" ScaleY="0.5000" />
            <Position X="-58.0000" Y="44.0000" />
            <Scale ScaleX="1.0000" ScaleY="1.0000" />
            <CColor A="255" R="255" G="255" B="255" />
            <PrePosition />
            <PreSize X="0.0000" Y="0.0000" />
            <OutlineColor A="255" R="255" G="0" B="0" />
            <ShadowColor A="255" R="110" G="110" B="110" />
          </AbstractNodeData>
          <AbstractNodeData Name="X" ActionTag="-1707532407" Tag="25" IconVisible="True" LeftMargin="-38.0000" RightMargin="38.0000" TopMargin="5.0000" BottomMargin="-5.0000" ctype="SingleNodeObjectData">
            <Size X="0.0000" Y="0.0000" />
            <Children>
              <AbstractNodeData Name="BG_Name" ActionTag="-257530172" Tag="17" IconVisible="False" LeftMargin="-70.0000" RightMargin="20.0000" TopMargin="-65.0000" BottomMargin="-5.0000" Scale9Enable="True" LeftEage="6" RightEage="6" TopEage="6" BottomEage="6" Scale9OriginX="6" Scale9OriginY="6" Scale9Width="8" Scale9Height="8" ctype="ImageViewObjectData">
                <Size X="50.0000" Y="70.0000" />
                <AnchorPoint ScaleX="1.0000" ScaleY="0.5000" />
                <Position X="-20.0000" Y="30.0000" />
                <Scale ScaleX="0.3300" ScaleY="0.3300" />
                <CColor A="255" R="255" G="255" B="255" />
                <PrePosition />
                <PreSize X="0.0000" Y="0.0000" />
                <FileData Type="MarkedSubImage" Path="Lua/LuaResource/Work/resources/d_SystemBtn_Bg.png" Plist="Lua/LuaResource/Work/resources/BasicResources/Plist.plist" />
              </AbstractNodeData>
              <AbstractNodeData Name="Name" ActionTag="919327770" Tag="18" IconVisible="False" LeftMargin="-33.9999" RightMargin="21.9999" TopMargin="-39.0000" BottomMargin="21.0000" FontSize="18" LabelText="X" ShadowOffsetX="2.0000" ShadowOffsetY="-2.0000" ctype="TextObjectData">
                <Size X="12.0000" Y="18.0000" />
                <AnchorPoint ScaleX="0.5000" ScaleY="0.5000" />
                <Position X="-27.9999" Y="30.0000" />
                <Scale ScaleX="1.0000" ScaleY="1.0000" />
                <CColor A="255" R="255" G="255" B="255" />
                <PrePosition />
                <PreSize X="0.0000" Y="0.0000" />
                <OutlineColor A="255" R="255" G="0" B="0" />
                <ShadowColor A="255" R="110" G="110" B="110" />
              </AbstractNodeData>
              <AbstractNodeData Name="BG_Txt" ActionTag="1699850687" Tag="19" IconVisible="False" LeftMargin="-20.0000" RightMargin="-380.0000" TopMargin="-65.0000" BottomMargin="-5.0000" Scale9Enable="True" LeftEage="6" RightEage="6" TopEage="6" BottomEage="6" Scale9OriginX="6" Scale9OriginY="6" Scale9Width="8" Scale9Height="8" ctype="ImageViewObjectData">
                <Size X="400.0000" Y="70.0000" />
                <AnchorPoint ScaleY="0.5000" />
                <Position X="-20.0000" Y="30.0000" />
                <Scale ScaleX="0.3300" ScaleY="0.3300" />
                <CColor A="255" R="255" G="255" B="255" />
                <PrePosition />
                <PreSize X="0.0000" Y="0.0000" />
                <FileData Type="MarkedSubImage" Path="Lua/LuaResource/Work/resources/d_SystemBtn_Bg.png" Plist="Lua/LuaResource/Work/resources/BasicResources/Plist.plist" />
              </AbstractNodeData>
              <AbstractNodeData Name="Txt" ActionTag="-356686279" Tag="20" IconVisible="False" LeftMargin="-9.0000" RightMargin="-101.0000" TopMargin="-37.5000" BottomMargin="22.5000" FontSize="15" LabelText="123,456,789.01234" ShadowOffsetX="2.0000" ShadowOffsetY="-2.0000" ctype="TextObjectData">
                <Size X="110.0000" Y="15.0000" />
                <AnchorPoint ScaleX="0.5000" ScaleY="0.5000" />
                <Position X="46.0000" Y="30.0000" />
                <Scale ScaleX="1.0000" ScaleY="1.0000" />
                <CColor A="255" R="255" G="255" B="255" />
                <PrePosition />
                <PreSize X="0.0000" Y="0.0000" />
                <OutlineColor A="255" R="255" G="0" B="0" />
                <ShadowColor A="255" R="110" G="110" B="110" />
              </AbstractNodeData>
            </Children>
            <AnchorPoint />
            <Position X="-38.0000" Y="-5.0000" />
            <Scale ScaleX="1.0000" ScaleY="1.0000" />
            <CColor A="255" R="255" G="255" B="255" />
            <PrePosition />
            <PreSize X="0.0000" Y="0.0000" />
          </AbstractNodeData>
          <AbstractNodeData Name="Y" ActionTag="331417843" Tag="31" IconVisible="True" LeftMargin="-38.0000" RightMargin="38.0000" TopMargin="30.0000" BottomMargin="-30.0000" ctype="SingleNodeObjectData">
            <Size X="0.0000" Y="0.0000" />
            <Children>
              <AbstractNodeData Name="BG_Name" ActionTag="-2060262943" Tag="32" IconVisible="False" LeftMargin="-70.0000" RightMargin="20.0000" TopMargin="-65.0000" BottomMargin="-5.0000" Scale9Enable="True" LeftEage="6" RightEage="6" TopEage="6" BottomEage="6" Scale9OriginX="6" Scale9OriginY="6" Scale9Width="8" Scale9Height="8" ctype="ImageViewObjectData">
                <Size X="50.0000" Y="70.0000" />
                <AnchorPoint ScaleX="1.0000" ScaleY="0.5000" />
                <Position X="-20.0000" Y="30.0000" />
                <Scale ScaleX="0.3300" ScaleY="0.3300" />
                <CColor A="255" R="255" G="255" B="255" />
                <PrePosition />
                <PreSize X="0.0000" Y="0.0000" />
                <FileData Type="MarkedSubImage" Path="Lua/LuaResource/Work/resources/d_SystemBtn_Bg.png" Plist="Lua/LuaResource/Work/resources/BasicResources/Plist.plist" />
              </AbstractNodeData>
              <AbstractNodeData Name="Name" ActionTag="523479068" Tag="33" IconVisible="False" LeftMargin="-33.9999" RightMargin="21.9999" TopMargin="-39.0000" BottomMargin="21.0000" FontSize="18" LabelText="Y" ShadowOffsetX="2.0000" ShadowOffsetY="-2.0000" ctype="TextObjectData">
                <Size X="12.0000" Y="18.0000" />
                <AnchorPoint ScaleX="0.5000" ScaleY="0.5000" />
                <Position X="-27.9999" Y="30.0000" />
                <Scale ScaleX="1.0000" ScaleY="1.0000" />
                <CColor A="255" R="255" G="255" B="255" />
                <PrePosition />
                <PreSize X="0.0000" Y="0.0000" />
                <OutlineColor A="255" R="255" G="0" B="0" />
                <ShadowColor A="255" R="110" G="110" B="110" />
              </AbstractNodeData>
              <AbstractNodeData Name="BG_Txt" ActionTag="-1854945286" Tag="34" IconVisible="False" LeftMargin="-20.0000" RightMargin="-380.0000" TopMargin="-65.0000" BottomMargin="-5.0000" Scale9Enable="True" LeftEage="6" RightEage="6" TopEage="6" BottomEage="6" Scale9OriginX="6" Scale9OriginY="6" Scale9Width="8" Scale9Height="8" ctype="ImageViewObjectData">
                <Size X="400.0000" Y="70.0000" />
                <AnchorPoint ScaleY="0.5000" />
                <Position X="-20.0000" Y="30.0000" />
                <Scale ScaleX="0.3300" ScaleY="0.3300" />
                <CColor A="255" R="255" G="255" B="255" />
                <PrePosition />
                <PreSize X="0.0000" Y="0.0000" />
                <FileData Type="MarkedSubImage" Path="Lua/LuaResource/Work/resources/d_SystemBtn_Bg.png" Plist="Lua/LuaResource/Work/resources/BasicResources/Plist.plist" />
              </AbstractNodeData>
              <AbstractNodeData Name="Txt" ActionTag="1581464802" Tag="35" IconVisible="False" LeftMargin="-9.0000" RightMargin="-101.0000" TopMargin="-37.5000" BottomMargin="22.5000" FontSize="15" LabelText="123,456,789.01234" ShadowOffsetX="2.0000" ShadowOffsetY="-2.0000" ctype="TextObjectData">
                <Size X="110.0000" Y="15.0000" />
                <AnchorPoint ScaleX="0.5000" ScaleY="0.5000" />
                <Position X="46.0000" Y="30.0000" />
                <Scale ScaleX="1.0000" ScaleY="1.0000" />
                <CColor A="255" R="255" G="255" B="255" />
                <PrePosition />
                <PreSize X="0.0000" Y="0.0000" />
                <OutlineColor A="255" R="255" G="0" B="0" />
                <ShadowColor A="255" R="110" G="110" B="110" />
              </AbstractNodeData>
            </Children>
            <AnchorPoint />
            <Position X="-38.0000" Y="-30.0000" />
            <Scale ScaleX="1.0000" ScaleY="1.0000" />
            <CColor A="255" R="255" G="255" B="255" />
            <PrePosition />
            <PreSize X="0.0000" Y="0.0000" />
          </AbstractNodeData>
          <AbstractNodeData Name="Z" ActionTag="-428879802" Tag="41" IconVisible="True" LeftMargin="-38.0000" RightMargin="38.0000" TopMargin="55.0000" BottomMargin="-55.0000" ctype="SingleNodeObjectData">
            <Size X="0.0000" Y="0.0000" />
            <Children>
              <AbstractNodeData Name="BG_Name" ActionTag="1125713509" Tag="42" IconVisible="False" LeftMargin="-70.0000" RightMargin="20.0000" TopMargin="-65.0000" BottomMargin="-5.0000" Scale9Enable="True" LeftEage="6" RightEage="6" TopEage="6" BottomEage="6" Scale9OriginX="6" Scale9OriginY="6" Scale9Width="8" Scale9Height="8" ctype="ImageViewObjectData">
                <Size X="50.0000" Y="70.0000" />
                <AnchorPoint ScaleX="1.0000" ScaleY="0.5000" />
                <Position X="-20.0000" Y="30.0000" />
                <Scale ScaleX="0.3300" ScaleY="0.3300" />
                <CColor A="255" R="255" G="255" B="255" />
                <PrePosition />
                <PreSize X="0.0000" Y="0.0000" />
                <FileData Type="MarkedSubImage" Path="Lua/LuaResource/Work/resources/d_SystemBtn_Bg.png" Plist="Lua/LuaResource/Work/resources/BasicResources/Plist.plist" />
              </AbstractNodeData>
              <AbstractNodeData Name="Name" ActionTag="-164647743" Tag="43" IconVisible="False" LeftMargin="-32.9999" RightMargin="22.9999" TopMargin="-39.0000" BottomMargin="21.0000" FontSize="18" LabelText="Z" ShadowOffsetX="2.0000" ShadowOffsetY="-2.0000" ctype="TextObjectData">
                <Size X="10.0000" Y="18.0000" />
                <AnchorPoint ScaleX="0.5000" ScaleY="0.5000" />
                <Position X="-27.9999" Y="30.0000" />
                <Scale ScaleX="1.0000" ScaleY="1.0000" />
                <CColor A="255" R="255" G="255" B="255" />
                <PrePosition />
                <PreSize X="0.0000" Y="0.0000" />
                <OutlineColor A="255" R="255" G="0" B="0" />
                <ShadowColor A="255" R="110" G="110" B="110" />
              </AbstractNodeData>
              <AbstractNodeData Name="BG_Txt" ActionTag="-1722156803" Tag="44" IconVisible="False" LeftMargin="-20.0000" RightMargin="-380.0000" TopMargin="-65.0000" BottomMargin="-5.0000" Scale9Enable="True" LeftEage="6" RightEage="6" TopEage="6" BottomEage="6" Scale9OriginX="6" Scale9OriginY="6" Scale9Width="8" Scale9Height="8" ctype="ImageViewObjectData">
                <Size X="400.0000" Y="70.0000" />
                <AnchorPoint ScaleY="0.5000" />
                <Position X="-20.0000" Y="30.0000" />
                <Scale ScaleX="0.3300" ScaleY="0.3300" />
                <CColor A="255" R="255" G="255" B="255" />
                <PrePosition />
                <PreSize X="0.0000" Y="0.0000" />
                <FileData Type="MarkedSubImage" Path="Lua/LuaResource/Work/resources/d_SystemBtn_Bg.png" Plist="Lua/LuaResource/Work/resources/BasicResources/Plist.plist" />
              </AbstractNodeData>
              <AbstractNodeData Name="Txt" ActionTag="-1882617307" Tag="45" IconVisible="False" LeftMargin="-9.0000" RightMargin="-101.0000" TopMargin="-37.5000" BottomMargin="22.5000" FontSize="15" LabelText="123,456,789.01234" ShadowOffsetX="2.0000" ShadowOffsetY="-2.0000" ctype="TextObjectData">
                <Size X="110.0000" Y="15.0000" />
                <AnchorPoint ScaleX="0.5000" ScaleY="0.5000" />
                <Position X="46.0000" Y="30.0000" />
                <Scale ScaleX="1.0000" ScaleY="1.0000" />
                <CColor A="255" R="255" G="255" B="255" />
                <PrePosition />
                <PreSize X="0.0000" Y="0.0000" />
                <OutlineColor A="255" R="255" G="0" B="0" />
                <ShadowColor A="255" R="110" G="110" B="110" />
              </AbstractNodeData>
            </Children>
            <AnchorPoint />
            <Position X="-38.0000" Y="-55.0000" />
            <Scale ScaleX="1.0000" ScaleY="1.0000" />
            <CColor A="255" R="255" G="255" B="255" />
            <PrePosition />
            <PreSize X="0.0000" Y="0.0000" />
          </AbstractNodeData>
          <AbstractNodeData Name="X_EditBox" ActionTag="-1999048037" Tag="46" IconVisible="True" LeftMargin="9.0000" RightMargin="-9.0000" TopMargin="-25.0000" BottomMargin="25.0000" ctype="SingleNodeObjectData">
            <Size X="0.0000" Y="0.0000" />
            <AnchorPoint />
            <Position X="9.0000" Y="25.0000" />
            <Scale ScaleX="1.0000" ScaleY="1.0000" />
            <CColor A="255" R="255" G="255" B="255" />
            <PrePosition />
            <PreSize X="0.0000" Y="0.0000" />
          </AbstractNodeData>
          <AbstractNodeData Name="Y_EditBox" ActionTag="-665462239" Tag="47" IconVisible="True" LeftMargin="9.0000" RightMargin="-9.0000" ctype="SingleNodeObjectData">
            <Size X="0.0000" Y="0.0000" />
            <AnchorPoint />
            <Position X="9.0000" />
            <Scale ScaleX="1.0000" ScaleY="1.0000" />
            <CColor A="255" R="255" G="255" B="255" />
            <PrePosition />
            <PreSize X="0.0000" Y="0.0000" />
          </AbstractNodeData>
          <AbstractNodeData Name="Z_EditBox" ActionTag="458640852" Tag="48" IconVisible="True" LeftMargin="9.0000" RightMargin="-9.0000" TopMargin="25.0000" BottomMargin="-25.0000" ctype="SingleNodeObjectData">
            <Size X="0.0000" Y="0.0000" />
            <AnchorPoint />
            <Position X="9.0000" Y="-25.0000" />
            <Scale ScaleX="1.0000" ScaleY="1.0000" />
            <CColor A="255" R="255" G="255" B="255" />
            <PrePosition />
            <PreSize X="0.0000" Y="0.0000" />
          </AbstractNodeData>
          <AbstractNodeData Name="CB_3D" ActionTag="1603245894" Tag="37" IconVisible="True" LeftMargin="40.0000" RightMargin="-40.0000" TopMargin="-45.0000" BottomMargin="45.0000" StretchWidthEnable="False" StretchHeightEnable="False" InnerActionSpeed="1.0000" CustomSizeEnabled="False" ctype="ProjectNodeObjectData">
            <Size X="0.0000" Y="0.0000" />
            <AnchorPoint />
            <Position X="40.0000" Y="45.0000" />
            <Scale ScaleX="0.5000" ScaleY="0.5000" />
            <CColor A="255" R="255" G="255" B="255" />
            <PrePosition />
            <PreSize X="0.0000" Y="0.0000" />
            <FileData Type="Normal" Path="Lua/LuaResource/Work/BasicComponent/cbox_txt.csd" Plist="" />
          </AbstractNodeData>
          <AbstractNodeData Name="Sprite_1" ActionTag="-1193571471" Tag="2240" IconVisible="False" LeftMargin="79.8502" RightMargin="-143.8502" TopMargin="-59.4881" BottomMargin="-4.5119" ctype="SpriteObjectData">
            <Size X="64.0000" Y="64.0000" />
            <AnchorPoint ScaleX="0.5000" ScaleY="0.5000" />
            <Position X="111.8502" Y="27.4881" />
            <Scale ScaleX="1.0000" ScaleY="1.0000" />
            <CColor A="255" R="255" G="255" B="255" />
            <PrePosition />
            <PreSize X="0.0000" Y="0.0000" />
            <FileData Type="MarkedSubImage" Path="Lua/LuaResource/Work/resources/sort-down.png" Plist="Lua/LuaResource/Work/resources/BasicResources/Plist.plist" />
            <BlendFunc Src="1" Dst="771" />
          </AbstractNodeData>
        </Children>
      </ObjectData>
    </Content>
  </Content>
</GameFile>