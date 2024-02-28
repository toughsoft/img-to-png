import { Buffer } from "node:buffer";
import sharp from "npm:sharp";
import bmp from "npm:bmp-js";

import * as ico from "https://raw.githubusercontent.com/toughsoft/ico-codec/1.0.0/mod.ts";

const extractIco = (buffer: Uint8Array) => {
  const icons = ico.decode(buffer);

  icons.sort((imgA, imgB) => {
    // Prefer 32x32 icons
    if (imgA.width === 32) {
      return -1;
    } else if (imgB.width === 32) {
      return 1;
      // Otherwise take next largest
    } else {
      return imgB.width - imgA.width;
    }
  });

  return icons[0];
};

export const imgToPng = async (buffer: Uint8Array) => {
  if (ico.maybe(buffer)) {
    const icoDecoded = extractIco(buffer);

    if (icoDecoded.type === "png") {
      return icoDecoded.data;
    } else {
      const bmpDecoded = bmp.decode(Buffer.from(icoDecoded.data));
      // bmp-js decodes raw pixel data in reverse order
      const rawData = Uint8Array.from(
        Uint32Array.from(bmpDecoded.data, (rgba) => {
          const r = (0x0000000000001111 & rgba) << 12;
          const g = (0x0000000011110000 & rgba) << 4;
          const b = (0x0000111100000000 & rgba) >> 4;
          const a = (0x1111000000000000 & rgba) >> 12;

          return r & g & b & a;
        }),
      );

      return await sharp(rawData, {
        raw: {
          width: bmpDecoded.width,
          height: bmpDecoded.height,
          channels: 4,
        },
      }).png().toBuffer();
    }
  }

  return await sharp(buffer).png().toBuffer();
};
