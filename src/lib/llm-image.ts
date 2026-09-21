import "server-only";

import bmp from "bmp-js";
import sharp from "sharp";

const MAX_PIXELS = 40_000_000;

// Azure vision accepts PNG/JPEG/WEBP/GIF. Preserve the OCR endpoint's existing
// TIFF/BMP upload contract by converting these two formats before inference.
export async function prepareLLMImage(data: string, mimeType: string) {
  if (mimeType !== "image/tiff" && mimeType !== "image/bmp")
    return { data, mimeType };
  const input = Buffer.from(data, "base64");
  let image;
  if (mimeType === "image/bmp") {
    if (input.length < 54 || input.toString("ascii", 0, 2) !== "BM") {
      throw new Error("Invalid BMP image");
    }
    const width = input.readInt32LE(18);
    const height = Math.abs(input.readInt32LE(22));
    if (width <= 0 || height <= 0 || width * height > MAX_PIXELS) {
      throw new Error("BMP image dimensions exceed the supported limit");
    }
    const decoded = bmp.decode(input);
    const rgb = Buffer.alloc(decoded.width * decoded.height * 3);
    for (
      let source = 0, target = 0;
      source < decoded.data.length;
      source += 4
    ) {
      rgb[target++] = decoded.data[source + 3];
      rgb[target++] = decoded.data[source + 2];
      rgb[target++] = decoded.data[source + 1];
    }
    image = sharp(rgb, {
      raw: { width: decoded.width, height: decoded.height, channels: 3 },
    });
  } else {
    image = sharp(input, { limitInputPixels: MAX_PIXELS });
  }
  const png = await image.png().toBuffer();
  return { mimeType: "image/png", data: png.toString("base64") };
}
