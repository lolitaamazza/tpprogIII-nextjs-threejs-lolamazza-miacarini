import { test } from 'node:test';
import assert from 'node:assert/strict';

// El reproductor vive en el navegador: acá se simulan window, document y la API de YouTube.
class FakePlayer {
  constructor(iframe, options) {
    this.iframe = iframe;
    this.events = options.events;
    this.calls = [];
    this.time = 0;
    this.destroyed = false;
    FakePlayer.last = this;
  }
  mute() { this.calls.push('mute'); }
  unMute() { this.calls.push('unMute'); }
  setVolume(value) { this.calls.push(`volume:${value}`); }
  seekTo(seconds) { this.calls.push(`seek:${seconds}`); }
  playVideo() { this.calls.push('play'); }
  getCurrentTime() { return this.time; }
  destroy() { this.destroyed = true; }
}
const PLAYER_STATE = { PLAYING: 1, ENDED: 0 };

function fakeIframe() {
  const attributes = {};
  return {
    attributes,
    removed: false,
    setAttribute(name, value) { attributes[name] = value; },
    remove() { this.removed = true; },
  };
}
function fakeContainer(autoLoad = true) {
  const children = [];
  return { children, appendChild(child) { children.push(child); if(autoLoad)queueMicrotask(() => child.onload?.()); } };
}

let scriptBehaviour = 'error';
const injected = [];
globalThis.document = {
  createElement(tag) { return tag === 'iframe' ? fakeIframe() : { tagName: 'SCRIPT' }; },
  head: {
    appendChild(script) {
      injected.push(script);
      if (scriptBehaviour === 'error') queueMicrotask(() => script.onerror());
      else queueMicrotask(() => { globalThis.window.YT = { Player: FakePlayer, PlayerState: PLAYER_STATE }; globalThis.window.onYouTubeIframeAPIReady(); });
    },
  },
};
globalThis.window = {};

const { loadYouTubeApi, createClipPlayer } = await import('../lib/youtubeClip.js');
const { CLIP } = await import('../lib/introTimeline.js');

test('si la API de YouTube está bloqueada la promesa se rechaza y se puede volver a intentar', async () => {
  scriptBehaviour = 'error';
  await assert.rejects(loadYouTubeApi(), /api-bloqueada/);
  scriptBehaviour = 'ok';
  const YT = await loadYouTubeApi();
  assert.equal(YT.Player, FakePlayer, 'el segundo intento carga la API y no queda atrapado en el error');
  assert.equal(injected.length, 2, 'se inyectó el script dos veces');
  assert.equal(await loadYouTubeApi(), YT, 'con la API cargada no se vuelve a inyectar el script');
  assert.equal(injected.length, 2);
});

async function makePlayer(callbacks = {}) {
  const container = fakeContainer();
  const controller = await createClipPlayer(container, { origin: 'https://panem.example', ...callbacks });
  return { container, controller, player: FakePlayer.last };
}

test('arma un iframe con el fragmento, sin cookies y con permiso de autoplay', async () => {
  const { container, player } = await makePlayer();
  assert.equal(container.children.length, 1);
  const iframe = container.children[0];
  assert.equal(player.iframe, iframe);
  assert.match(iframe.src, /^https:\/\/www\.youtube-nocookie\.com\/embed\/k4e-qJdEAXo\?/);
  assert.match(iframe.src, new RegExp(`start=${CLIP.start - CLIP.preroll}`));
  assert.match(iframe.src, new RegExp(`end=${CLIP.end}`));
  assert.match(iframe.src, /enablejsapi=1/);
  assert.match(iframe.allow, /autoplay/);
  assert.equal(iframe.attributes.tabindex, '-1', 'el iframe no entra en el orden de tabulación');
  assert.match(iframe.title, /President Snow/);
});

test('play() pedido antes de que el reproductor esté listo se ejecuta al estar listo, sin saltar de posición', async () => {
  const { controller, player } = await makePlayer();
  controller.setSound('silent');
  controller.play();
  assert.deepEqual(player.calls, [], 'todavía no hay nada que ejecutar');
  player.events.onReady();
  assert.deepEqual(player.calls, ['unMute', 'volume:0', 'play'], 'el iframe ya está en el segundo de arranque: no hace falta seekTo');
  controller.setSound('on');
  assert.deepEqual(player.calls.slice(3), ['unMute', 'volume:100'], 'activar el sonido después no vuelve a dar play');
});

test('en silencio quiere decir sin mute pero con volumen 0: así Chrome no lo pausa cuando la pestaña no se ve', async () => {
  const { controller, player } = await makePlayer();
  controller.setSound('silent');
  player.events.onReady();
  assert.ok(!player.calls.includes('mute'), 'un video con mute se pausa solo con la pestaña oculta; con volumen 0 sigue corriendo');
  assert.deepEqual(player.calls, ['unMute', 'volume:0']);
});

test('el modo se aplica al estar listo y también cuando cambia después', async () => {
  const { controller, player } = await makePlayer();
  controller.setSound('muted');
  player.events.onReady();
  assert.deepEqual(player.calls, ['mute']);
  controller.setSound('on');
  assert.deepEqual(player.calls.slice(1), ['unMute', 'volume:100']);
});

test('avisa que está reproduciendo una sola vez y avisa cuando termina', async () => {
  const events = [];
  const { player } = await makePlayer({ onPlaying: () => events.push('playing'), onEnded: () => events.push('ended') });
  player.events.onStateChange({ data: PLAYER_STATE.PLAYING });
  player.events.onStateChange({ data: PLAYER_STATE.PLAYING });
  player.events.onStateChange({ data: PLAYER_STATE.ENDED });
  assert.deepEqual(events, ['playing', 'ended']);
});

test('los errores de YouTube llegan con su código', async () => {
  let code = null;
  const { player } = await makePlayer({ onError: (value) => { code = value; } });
  player.events.onError({ data: 150 });
  assert.equal(code, 150);
});

test('getTime es 0 hasta que el reproductor está listo y después lee el segundo actual', async () => {
  const { controller, player } = await makePlayer();
  player.time = 40;
  assert.equal(controller.getTime(), 0);
  player.events.onReady();
  assert.equal(controller.getTime(), 40);
  player.getCurrentTime = () => { throw new Error('sin reproductor'); };
  assert.equal(controller.getTime(), 0, 'un error del reproductor no rompe la intro');
});

test('después de destroy() se quita el iframe y se ignoran los eventos', async () => {
  const events = [];
  const { controller, container, player } = await makePlayer({ onPlaying: () => events.push('playing'), onEnded: () => events.push('ended') });
  controller.destroy();
  assert.equal(player.destroyed, true);
  assert.equal(container.children[0].removed, true);
  player.events.onStateChange({ data: PLAYER_STATE.PLAYING });
  player.events.onStateChange({ data: PLAYER_STATE.ENDED });
  player.events.onReady();
  controller.play();
  assert.deepEqual(events, []);
  assert.deepEqual(player.calls, [], 'tampoco ejecuta órdenes sobre un reproductor destruido');
  assert.equal(controller.getTime(), 0);
});

test('espera el origen real del iframe antes de conectar la API',async()=>{
 const container=fakeContainer(false),previous=FakePlayer.last;
 const controller=await createClipPlayer(container,{origin:'https://panem.example'});
 assert.equal(FakePlayer.last,previous,'no crea el reproductor sobre about:blank');
 controller.play();
 container.children[0].onload();
 const player=FakePlayer.last;
 player.events.onReady();
 assert.ok(player.calls.includes('play'));
 controller.destroy();
});
test('salir antes de que cargue YouTube no crea un reproductor tardío',async()=>{
 const container=fakeContainer(false),previous=FakePlayer.last;
 const controller=await createClipPlayer(container,{origin:'https://panem.example'});
 const lateLoad=container.children[0].onload;
 controller.destroy();lateLoad();
 assert.equal(FakePlayer.last,previous);assert.equal(container.children[0].removed,true);
});
