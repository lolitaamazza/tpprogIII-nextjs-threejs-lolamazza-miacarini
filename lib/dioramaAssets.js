// Qué modelos (Kenney, CC0) y qué entorno (Poly Haven, CC0) usa cada diorama. Puro: se prueba con `node --test`.
// Los archivos están en public/models/districts/; cada pack con textura trae su Textures/colormap.png.
const N = '/models/districts/nature/';
const S = '/models/districts/survival/';
const P = '/models/districts/pirate/';
const C = '/models/districts/characters/';
const DAWN = '/models/districts/dawn.hdr';
const DAY = '/models/districts/day.hdr';

export const DIORAMA_ASSETS = {
  12: {
    env: DAWN,
    models: {
      miner: `${C}character-male-c.glb`, pickaxe: `${S}tool-pickaxe.glb`,
      cliff: `${N}cliff_large_rock.glb`, rockLargeB: `${N}rock_largeB.glb`, rockLargeC: `${N}rock_largeC.glb`, rockLargeD: `${N}rock_largeD.glb`,
      rockLargeE: `${N}rock_largeE.glb`, rockTallA: `${N}rock_tallA.glb`, rockTallB: `${N}rock_tallB.glb`, rockTallC: `${N}rock_tallC.glb`,
      pineA: `${N}tree_pineTallA_detailed.glb`, pineB: `${N}tree_pineTallB_detailed.glb`, pineRound: `${N}tree_pineRoundA.glb`, fence: `${N}fence_simple.glb`,
      rockA: `${S}rock-a.glb`, rockB: `${S}rock-b.glb`, rockC: `${S}rock-c.glb`,
      barrel: `${S}barrel.glb`, box: `${S}box.glb`, boxLarge: `${S}box-large.glb`, bucket: `${S}bucket.glb`, logs: `${N}log_stack.glb`, stump: `${N}stump_round.glb`,
    },
  },
  4: {
    env: DAY,
    models: {
      fisher: `${C}character-female-b.glb`,
      dock: `${P}structure-platform-dock.glb`, dockSmall: `${P}structure-platform-dock-small.glb`,
      boatSmall: `${P}boat-row-small.glb`, boatLarge: `${P}boat-row-large.glb`, barrel: `${P}barrel.glb`, crate: `${P}crate.glb`,
      rocksA: `${P}rocks-sand-a.glb`, rocksB: `${P}rocks-sand-b.glb`, grassPlant: `${P}grass-plant.glb`,
      fish: `${S}fish.glb`, fishLarge: `${S}fish-large.glb`, bucket: `${S}bucket.glb`, lily: `${N}lily_large.glb`,
    },
  },
  11: {
    env: DAY,
    models: {
      harvester: `${C}character-female-d.glb`,
      wheat: `${N}crops_wheatStageB.glb`, wheatCut: `${N}crops_wheatStageA.glb`, dirtRow: `${N}crops_dirtRow.glb`,
      oak: `${N}tree_oak.glb`, tree: `${N}tree_default.glb`, bush: `${N}plant_bush.glb`, bushSmall: `${N}plant_bushSmall.glb`,
      tower: `${P}tower-watch.glb`, fence: `${N}fence_simple.glb`, grass: `${N}grass.glb`, grassLarge: `${N}grass_large.glb`,
      flower: `${N}flower_yellowA.glb`, rock: `${N}rock_smallA.glb`,
    },
  },
};

// Todos los archivos que baja un distrito: entorno, modelos y la textura de cada pack que la necesita.
export function assetFiles(id) {
  const spec = DIORAMA_ASSETS[id];
  if (!spec) return [];
  const models = [...new Set(Object.values(spec.models))];
  const textures = [...new Set(models.filter((path) => !path.startsWith(N)).map((path) => `${path.slice(0, path.lastIndexOf('/') + 1)}Textures/colormap.png`))];
  return [spec.env, ...models, ...textures];
}

export function assetBytes(id, sizes) {
  return assetFiles(id).reduce((sum, path) => sum + (sizes[path] ?? 0), 0);
}
