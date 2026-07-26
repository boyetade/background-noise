import { Application } from "@pixi/react";
import { Assets, Texture, type Graphics } from "pixi.js";
import paperTexture from "../assets/Scan-23.png";
import { useEffect, useState } from "react";

export function AppBackground() {
  const [texture, setTexture] = useState<Texture>(Texture.EMPTY);

  useEffect(() => {
    if (texture === Texture.EMPTY) {
      Assets.load(paperTexture).then((result) => {
        setTexture(result);
      });
    }
  }, [texture]);

  return (
    <div className="absolute inset-0">
      <Application
        width={window.innerWidth}
        height={window.innerHeight}
        backgroundAlpha={0}
        antialias
        eventMode="none"
        autoStart
        className="absolute inset-0 block h-full w-full"
      >
        <pixiSprite
          texture={texture}
          anchor={0.5}
          x={window.innerWidth / 2}
          y={window.innerHeight / 2}
          scale={{ x: 1, y: 1 }}
        />
        <pixiGraphics
          draw={(graphics: Graphics) => {
            graphics.clear();
            graphics
              .rect(0, 0, window.innerWidth, window.innerHeight)
              .fill({ color: "#2b48d9", alpha: 0.8 });
          }}
        />
      </Application>
    </div>
  );
}
