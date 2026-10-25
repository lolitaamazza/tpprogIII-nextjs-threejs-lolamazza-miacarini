// GLB de Poly Haven: la exportación glTF omite su mapa de opacidad separado.
// Uso: node scripts/fix-fence-alpha.mjs public/models/d11/alambrado.glb assets-src/scene-upgrade/fence-opacity.png
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
const [file, opacity] = process.argv.slice(2);
if (!file || !opacity) throw new Error('Indicar el GLB y la opacidad oficial de Poly Haven');
const source = await readFile(file);
const jsonLength = source.readUInt32LE(12);
const json = JSON.parse(source.subarray(20, 20 + jsonLength).toString());
const bin = source.subarray(28 + jsonLength);
const material = json.materials.find((m) => m.name === 'modular_chainlink_fence_wire');
const texture = json.textures[material.pbrMetallicRoughness.baseColorTexture.index];
const image = json.images[texture.extensions?.EXT_texture_webp?.source ?? texture.source];
const imageView = json.bufferViews[image.bufferView];
const pixels = bin.subarray(imageView.byteOffset ?? 0, (imageView.byteOffset ?? 0) + imageView.byteLength);
const { width, height } = await sharp(pixels).metadata();
const rgb = await sharp(pixels).removeAlpha().raw().toBuffer();
const alpha = await sharp(opacity).resize(width, height).greyscale().raw({ depth: 'uchar' }).toBuffer();
const rgba = await sharp(rgb, { raw: { width, height, channels: 3 } }).joinChannel(alpha, { raw: { width, height, channels: 1 } }).webp({ quality: 85, alphaQuality: 100 }).toBuffer();
const chunks = []; let offset = 0;
for (const view of json.bufferViews) {
  const content = view === imageView ? rgba : bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
  view.byteOffset = offset; view.byteLength = content.length;
  chunks.push(content); offset += content.length;
  const padding = (4 - offset % 4) % 4;
  if (padding) { chunks.push(Buffer.alloc(padding)); offset += padding; }
}
material.alphaMode = 'MASK'; material.alphaCutoff = 0.35;
json.buffers[0].byteLength = offset;
let jsonBytes = Buffer.from(JSON.stringify(json));
jsonBytes = Buffer.concat([jsonBytes, Buffer.alloc((4 - jsonBytes.length % 4) % 4, 32)]);
const binary = Buffer.concat(chunks);
const header = Buffer.alloc(20), binaryHeader = Buffer.alloc(8);
header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + jsonBytes.length + binary.length, 8);
header.writeUInt32LE(jsonBytes.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
binaryHeader.writeUInt32LE(binary.length, 0); binaryHeader.writeUInt32LE(0x004e4942, 4);
await writeFile(file, Buffer.concat([header, jsonBytes, binaryHeader, binary]));
console.log('Alambrado con máscara de transparencia incorporada.');
