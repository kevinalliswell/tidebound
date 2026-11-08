import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SPECIES, parrotCombat } from './game.js';

export const PLACES = {
  pier: { name: '风栖码头', en: 'WINDREST PIER', x: 17, z: 4, icon: 'anchor' },
  sushi: { name: '汐见寿司', en: 'SHIOMI SUSHI', x: -8, z: .5, icon: 'sushi' },
  tools: { name: '海风工具店', en: 'SEABREEZE OUTFITTERS', x: -19, z: 2.5, icon: 'tools' },
  warehouse: { name: '渔获仓库', en: 'SAFE STORAGE', x: -2, z: -2, icon: 'box' },
  home: { name: '海边小屋', en: 'A PLACE TO CALL HOME', x: -18, z: 9, icon: 'home' },
};
const Y = new THREE.Vector3(0, 1, 0);
const mats = new Map();
const material = (color, options = {}) => {
  const key = color + JSON.stringify(options);
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: .85, ...options }));
  return mats.get(key);
};
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const sphereGeo = new THREE.SphereGeometry(1, 16, 10);
function batchMeshes(group, skip = new Set()) {
  group.updateMatrixWorld(true);
  const inverse = group.matrixWorld.clone().invert(), batches = new Map(), originals = [];
  group.traverse(mesh => {
    if (!mesh.isMesh || mesh.isSprite || skip.has(mesh) || Array.isArray(mesh.material)) return;
    const geo = mesh.geometry.clone(); geo.applyMatrix4(inverse.clone().multiply(mesh.matrixWorld));
    if (geo.index) { const unindexed = geo.toNonIndexed(); geo.dispose(); batches.has(mesh.material) || batches.set(mesh.material, []); batches.get(mesh.material).push(unindexed); }
    else { batches.has(mesh.material) || batches.set(mesh.material, []); batches.get(mesh.material).push(geo); }
    originals.push(mesh);
  });
  for (const [mat, geos] of batches) {
    const geometry = mergeGeometries(geos, false); if (!geometry) continue;
    const mesh = new THREE.Mesh(geometry, mat); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); geos.forEach(g => g.dispose());
  }
  originals.forEach(mesh => mesh.removeFromParent());
}
function batchAnimal(group) {
  group.updateMatrixWorld(true);
  const geometries = [], originals = [], inverse = group.matrixWorld.clone().invert();
  group.traverse(mesh => {
    if (!mesh.isMesh) return;
    let geo = mesh.geometry.clone();
    geo.applyMatrix4(inverse.clone().multiply(mesh.matrixWorld));
    if (geo.index) { const old = geo; geo = geo.toNonIndexed(); old.dispose(); }
    const count = geo.attributes.position.count, colors = new Float32Array(count * 3), color = mesh.material.color;
    for (let i = 0; i < count; i++) { colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3)); geometries.push(geo); originals.push(mesh);
  });
  const combined = mergeGeometries(geometries, false);
  if (combined) { originals.forEach(m => m.removeFromParent()); const mesh = new THREE.Mesh(combined, material('#ffffff', { vertexColors: true, side: THREE.DoubleSide })); group.add(mesh); }
  geometries.forEach(g => g.dispose());
}
function box(parent, color, size, pos, rotation = 0) {
  const m = new THREE.Mesh(boxGeo, material(color)); m.scale.set(...size); m.position.set(...pos); m.rotation.y = rotation; m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function ellipsoid(parent, color, size, pos) {
  const m = new THREE.Mesh(sphereGeo, material(color)); m.scale.set(...size); m.position.set(...pos); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function cylinder(parent, color, top, bottom, height, pos, segments = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, segments), material(color)); m.position.set(...pos); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function stick(parent, color, a, b, radius = .035) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), d = end.clone().sub(start);
  const m = cylinder(parent, color, radius, radius, d.length(), start.clone().add(end).multiplyScalar(.5).toArray(), 6);
  m.quaternion.setFromUnitVectors(Y, d.normalize()); return m;
}
function label(parent, text, pos, width = 4, fg = '#254b45', bg = '#fff6df') {
  const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 160;
  const c = canvas.getContext('2d');
  c.fillStyle = bg; c.beginPath(); c.roundRect(8, 8, 752, 144, 22); c.fill();
  c.fillStyle = fg; c.font = 'bold 64px "Microsoft YaHei", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 384, 83);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthWrite: false }));
  sprite.position.set(...pos); sprite.scale.set(width, width * 160 / 768, 1); parent.add(sprite); return sprite;
}
function roof(parent, width, depth, color, y) {
  const shape = new THREE.Shape(); shape.moveTo(-width / 2, 0); shape.lineTo(0, 1.6); shape.lineTo(width / 2, 0); shape.closePath();
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }), material(color));
  m.position.set(0, y, -depth / 2); m.castShadow = true; m.receiveShadow = true; parent.add(m);
  for (let i = 0; i < 8; i++) {
    const z = -depth / 2 + i * depth / 7;
    stick(parent, '#ffffff', [-width / 2 - .02, y + .03, z], [0, y + 1.63, z], .018);
  }
}
function building(parent, { x, z, color, trim, title, width = 6, depth = 4.4 }) {
  const g = new THREE.Group(); g.position.set(x, .6, z); parent.add(g);
  box(g, color, [width, 3.4, depth], [0, 1.7, 0]); roof(g, width + .8, depth + .7, trim, 3.4);
  box(g, '#e6dbbc', [width + .35, .25, depth + .4], [0, .12, 0]);
  box(g, '#e8f7e6', [1.1, 2.25, .08], [0, 1.28, depth / 2 + .04]);
  box(g, trim, [.12, 2.35, .12], [-.62, 1.3, depth / 2 + .08]); box(g, trim, [.12, 2.35, .12], [.62, 1.3, depth / 2 + .08]);
  for (const x of [-width * .31, width * .31]) {
    box(g, '#b6d9d1', [1.25, 1.3, .08], [x, 1.95, depth / 2 + .05]);
    box(g, '#f6eac9', [1.4, .13, .2], [x, 1.25, depth / 2 + .1]);
    box(g, '#f6eac9', [.09, 1.35, .13], [x, 1.95, depth / 2 + .1]);
  }
  for (let i = 0; i < 8; i++) {
    const awning = box(g, i % 2 ? '#f3e8ce' : trim, [width / 8, .13, 1.3], [-width / 2 + width / 16 + i * width / 8, 3.15, depth / 2 + .55]); awning.rotation.x = .12;
  }
  label(g, title, [0, 3.1, depth / 2 + 1.25], width * .78);
  cylinder(g, '#9b7956', .45, .34, .65, [width / 2 + .3, .45, depth / 2]);
  ellipsoid(g, '#88a967', [.6, .7, .6], [width / 2 + .3, 1.15, depth / 2]);
  return g;
}
function tree(parent, x, z, scale = 1, lean = .15) {
  const g = new THREE.Group(); g.position.set(x, .8, z); g.scale.setScalar(scale); parent.add(g);
  const top = [lean * 3, 5.3, 0]; stick(g, '#967c58', [0, 0, 0], top, .17);
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2, r = 3;
    const leaf = new THREE.Shape(); leaf.moveTo(0, 0); leaf.quadraticCurveTo(.55, 1.2, 0, 3); leaf.quadraticCurveTo(-.55, 1.2, 0, 0);
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(leaf), material(i % 2 ? '#518b6f' : '#6e9f70', { side: THREE.DoubleSide }));
    mesh.rotation.set(-1.1, a, .1); mesh.position.set(top[0], top[1], 0); mesh.rotateZ(a); mesh.castShadow = true; g.add(mesh);
    stick(g, '#6b915a', top, [top[0] + Math.sin(a) * r, top[1] - .9, Math.cos(a) * r], .035);
  }
  ellipsoid(g, '#9b8650', [.2, .25, .2], [top[0] + .2, 4.9, .2]);
  return g;
}
function character(parent, color = '#e5ac4f', hat = true) {
  const g = new THREE.Group(); parent.add(g);
  const body = box(g, color, [.57, .72, .42], [0, .97, 0]);
  const leftLeg = box(g, '#354e51', [.21, .55, .25], [-.17, .36, 0]); const rightLeg = box(g, '#354e51', [.21, .55, .25], [.17, .36, 0]);
  box(g, '#283e43', [.23, .15, .38], [-.17, .09, -.05]); box(g, '#283e43', [.23, .15, .38], [.17, .09, -.05]);
  ellipsoid(g, '#d6a77d', [.24, .27, .23], [0, 1.62, 0]);
  if (hat) { cylinder(g, '#ead7a0', .48, .48, .065, [0, 1.86, 0]); cylinder(g, '#e2c68b', .26, .31, .23, [0, 1.99, 0]); cylinder(g, '#b57754', .311, .311, .055, [0, 1.9, 0]); }
  const armL = box(g, color, [.18, .6, .2], [-.4, 1.02, 0]); const armR = box(g, color, [.18, .6, .2], [.4, 1.02, 0]);
  ellipsoid(g, '#d6a77d', [.1, .12, .1], [-.4, .69, 0]); ellipsoid(g, '#d6a77d', [.1, .12, .1], [.4, .69, 0]);
  box(g, '#b66e42', [.42, .55, .23], [0, 1.03, .3]);
  g.userData = { body, leftLeg, rightLeg, armL, armR }; return g;
}
function parrot(parent, color = '#e9985d') {
  const g = new THREE.Group(); parent.add(g);
  ellipsoid(g, color, [.16, .27, .15], [0, 0, 0]); ellipsoid(g, '#f3d89d', [.145, .15, .13], [0, .25, -.02]);
  ellipsoid(g, '#253d43', [.06, .07, .08], [0, .24, -.15]);
  const l = ellipsoid(g, '#4c9390', [.34, .055, .17], [-.27, .04, 0]); const r = ellipsoid(g, '#4c9390', [.34, .055, .17], [.27, .04, 0]);
  stick(g, '#e9ae59', [0, -.1, .06], [0, -.55, .22], .055); g.userData.wings = [l, r]; return g;
}
export function fishModel(species, parent) {
  const g = new THREE.Group(); if (parent) parent.add(g); const c = species.color;
  if (species.shape === 'octopus') {
    ellipsoid(g, c, [.48, .63, .48], [0, .2, 0]);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -.15, 0), new THREE.Vector3(Math.cos(a) * .5, -.55, Math.sin(a) * .5), new THREE.Vector3(Math.cos(a) * 1.05, -.66, Math.sin(a) * 1.05), new THREE.Vector3(Math.cos(a) * 1.3, -.3, Math.sin(a) * 1.3)]);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, .065, 6, false), material(c)));
    }
  } else if (species.shape === 'turtle') {
    ellipsoid(g, '#64855e', [.62, .28, .47], [0, 0, 0]); ellipsoid(g, '#b0b77b', [.23, .18, .18], [.66, -.04, 0]);
    for (const x of [-.35, .35]) for (const z of [-.48, .48]) { const flipper = ellipsoid(g, '#a6b279', [.3, .055, .19], [x, -.1, z]); flipper.rotation.y = x * z * 2; }
    for (let i = -1; i <= 1; i++) stick(g, '#8fa576', [i * .27, .24, -.23], [i * .27, .25, .23], .014);
  } else if (species.shape === 'ray') {
    ellipsoid(g, c, [.5, .12, .4], [0, 0, 0]);
    for (const side of [-1, 1]) { const f = new THREE.Shape(); f.moveTo(-.3, 0); f.lineTo(-.4, side * 1.1); f.lineTo(.6, 0); f.closePath(); const m = new THREE.Mesh(new THREE.ShapeGeometry(f), material(c, { side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; g.add(m); }
    stick(g, c, [-.45, 0, 0], [-1.5, 0, 0], .025);
  } else {
    ellipsoid(g, c, [.65, .25, .21], [0, 0, 0]);
    const tailShape = new THREE.Shape(); tailShape.moveTo(0, 0); tailShape.lineTo(-.4, .3); tailShape.lineTo(-.33, -.3); tailShape.closePath();
    const tail = new THREE.Mesh(new THREE.ShapeGeometry(tailShape), material(c, { side: THREE.DoubleSide })); tail.position.x = -.57; g.add(tail); g.userData.tail = tail;
    const finShape = new THREE.Shape(); finShape.moveTo(-.22, .15); finShape.lineTo(0, .49); finShape.lineTo(.17, .18); finShape.closePath();
    g.add(new THREE.Mesh(new THREE.ShapeGeometry(finShape), material(c, { side: THREE.DoubleSide })));
    ellipsoid(g, '#e3e6cf', [.48, .09, .17], [.05, -.16, 0]);
    if (species.id === 'swordfish') stick(g, c, [.58, .02, 0], [1.4, .02, 0], .035);
    if (species.id === 'goldfish') { ellipsoid(g, '#ffc85c', [.4, .25, .03], [-.8, .06, 0]); }
  }
  for (const z of [-1, 1]) {
    ellipsoid(g, '#f6f2d8', [.065, .065, .03], [.4, .08, z * .2]); ellipsoid(g, '#233c43', [.035, .04, .025], [.42, .08, z * .223]);
  }
  // Keep each animal inexpensive enough to render a school of fish.
  batchAnimal(g); g.userData.tail = null;
  g.scale.setScalar(species.size); return g;
}

export class World {
  constructor(container, game) {
    this.game = game; this.container = container; this.elapsed = 0; this.mode = 'pier'; this.keys = new Set(); this.walkGoal = null; this.reeling = false; this.pointerHeld = false;
    this.spearCooldown = 0; this.parrotTimer = 0; this.fishPartnerTimer = 0; this.autoRise = false;
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color('#c7e4e4'); this.scene.fog = new THREE.Fog('#c7e4e4', 70, 190);
    this.camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, .1, 400); this.camera.position.set(34, 23, 31);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(innerWidth, innerHeight); this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.autoUpdate = false; this.renderer.shadowMap.needsUpdate = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.15; container.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement); this.controls.target.set(8, 1.5, 2);
    this.controls.enableDamping = true; this.controls.dampingFactor = .08; this.controls.minDistance = 5; this.controls.maxDistance = 55; this.controls.maxPolarAngle = Math.PI * .48;
    this.controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }; this.controls.enablePan = false;
    this.hemi = new THREE.HemisphereLight('#dbf5f5', '#85836b', 2); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff0ca', 3.2); this.sun.position.set(-25, 55, 22); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024); this.sun.shadow.camera.left = -65; this.sun.shadow.camera.right = 65; this.sun.shadow.camera.top = 45; this.sun.shadow.camera.bottom = -45; this.sun.shadow.normalBias = .08; this.scene.add(this.sun);
    this.static = new THREE.Group(); this.scene.add(this.static); this.buildWater(); this.buildIsland(); this.buildHarbor(); this.buildSeabed(); this.buildSky(); batchMeshes(this.static);
    this.player = character(this.scene); this.player.position.set(17, 1.2, 4); this.player.rotation.y = -Math.PI / 2;
    this.rod = new THREE.Group(); this.player.add(this.rod); this.rod.position.set(.42, .86, -.1); this.rod.rotation.x = -.6;
    stick(this.rod, '#53605b', [0, 0, 0], [0, 2.7, -.28], .025); stick(this.rod, '#c1a66d', [0, 0, 0], [0, .5, 0], .055);
    this.birds = [parrot(this.scene), parrot(this.scene, '#8daa6e')]; this.birds[1].position.set(-18.8, 2.2, 7);
    this.partnerMeshes = new Map(); this.fishes = []; this.spawnFishes(); this.effects = []; this.raycaster = new THREE.Raycaster();
    this.line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: '#f3e8c4', transparent: true, opacity: .85 })); this.scene.add(this.line); this.line.visible = false;
    this.float = new THREE.Group(); cylinder(this.float, '#e76e4c', .06, .09, .22, [0, .08, 0]); cylinder(this.float, '#fff2d1', .08, .08, .16, [0, -.09, 0]); this.scene.add(this.float); this.float.visible = false;
    this.resize = () => { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(innerWidth, innerHeight); };
    addEventListener('resize', this.resize);
    this.renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());
    this.renderer.domElement.addEventListener('pointerdown', e => { if (e.button === 0) { this.pointerHeld = true; this.pointer = { x: e.clientX, y: e.clientY }; if (game.diving) this.shoot(e.clientX, e.clientY); else if (game.fishing?.phase === 'bite') game.hook(); } });
    addEventListener('pointerup', () => { this.pointerHeld = false; });
    game.on(e => { if (e.type === 'death') { this.walkGoal = null; this.mode = game.s.upstairs ? 'home' : 'boat'; this.autoRise = false; this.player.position.copy(game.s.upstairs ? new THREE.Vector3(-18, 5, 9) : this.boat.position.clone().add(new THREE.Vector3(0, 1, 0))); this.focusPlayer(true); } if (e.type === 'change') this.updateProperty(); if (e.type === 'catch') this.splash(this.float.position.clone(), '#fff7da'); });
    this.buildWolves();
    if (game.s.upstairs) { this.mode = 'home'; this.player.position.set(-18, 5, 9); }
    this.updateProperty();
  }
  buildWater() {
    const geo = new THREE.PlaneGeometry(330, 330, 128, 128); geo.rotateX(-Math.PI / 2);
    this.waterMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { time: { value: 0 }, under: { value: 0 } },
      vertexShader: `uniform float time; varying vec3 vP; varying float vW; void main(){ vec3 p=position; p.y+=sin(p.x*.24+time*.7)*.095+sin(p.z*.35+time*.6)*.065; vP=p; vW=p.y; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
      fragmentShader: `uniform float time; uniform float under; varying vec3 vP; varying float vW; void main(){ float dist=length((vP.xz-vec2(-14.,-3.))/vec2(1.3,1.)); float shallow=1.-smoothstep(17.,33.,dist); vec3 deep=vec3(.065,.40,.46); vec3 aqua=vec3(.24,.72,.67); vec3 col=mix(deep,aqua,shallow); float stripe=sin(vP.x*1.6+vP.z*.9+sin(vP.z*.8+time)*.7+time*.9); float sparkle=pow(max(0.,stripe),22.)*.15; col+=sparkle+vW*.12; float foam=(1.-smoothstep(.1,.8,abs(dist-15.8+sin(time+vP.z)*.12)))*.35; col=mix(col,vec3(.91,.96,.82),foam); col=mix(col,vec3(.18,.53,.58),under*.6); gl_FragColor=vec4(col,mix(.83,.47,under)); }`,
    });
    this.water = new THREE.Mesh(geo, this.waterMat); this.water.renderOrder = 2; this.scene.add(this.water);
  }
  buildIsland() {
    const sand = cylinder(this.static, '#dfcda4', 19.5, 21.5, 2, [-14, -.65, -3], 64); sand.scale.z = .76;
    const beach = ellipsoid(this.static, '#e7d9b3', [20, .85, 15], [-14, -.15, -3]); beach.receiveShadow = true;
    const grass = cylinder(this.static, '#9bae83', 15.9, 17.3, .55, [-16.5, .45, -4], 64); grass.scale.z = .72;
    ellipsoid(this.static, '#96a87e', [8, 2.4, 6], [-27, .6, -12]);
    // Pale footpaths connect the town to the long fishing pier.
    box(this.static, '#ddd4b4', [25, .07, 2.7], [-6, .79, 4]); box(this.static, '#ddd4b4', [2.6, .07, 13], [-9, .79, -.5]);
    box(this.static, '#ddd4b4', [13, .07, 2.4], [-16, .79, 7.5]);
    for (let i = 0; i < 22; i++) {
      const a = i * 2.4, x = -14 + Math.cos(a) * (17 + Math.sin(i) * 1.1), z = -3 + Math.sin(a) * 12;
      const r = ellipsoid(this.static, i % 2 ? '#a3b8ac' : '#b8c2ad', [.65 + i % 3 * .3, .45 + i % 2 * .5, .6], [x, .25, z]); r.rotation.set(.2, a, .1);
    }
    [[-26, 4, 1.15], [-25, -6, 1], [-28, 0, 1.25], [-16, -11, 1.1], [-7, -11, .9], [-4, 9, 1], [-25, 10, .9], [-12, 10, .85]].forEach(([x, z, s], i) => tree(this.static, x, z, s, i % 2 ? -.2 : .15));
    for (let i = 0; i < 26; i++) {
      const a = i * 2.4, x = -17 + Math.cos(a) * (7 + i % 7), z = -4 + Math.sin(a) * 9;
      if (Math.abs(z - 4) < 2) continue;
      ellipsoid(this.static, i % 3 ? '#7f9b70' : '#e2ba87', [.5, .38, .5], [x, .95, z]);
    }
    const lighthouse = new THREE.Group(); lighthouse.position.set(-30, 2, -13); this.static.add(lighthouse);
    cylinder(lighthouse, '#f0e9ce', .6, .95, 6, [0, 3, 0], 16); cylinder(lighthouse, '#c66f50', .75, .8, .85, [0, 4.3, 0]); cylinder(lighthouse, '#355d5d', .9, .9, .18, [0, 6.2, 0]); cylinder(lighthouse, '#e8cc80', .5, .5, .9, [0, 6.7, 0]); cylinder(lighthouse, '#b36e52', 0, .9, .9, [0, 7.5, 0]);
  }
  buildHarbor() {
    building(this.static, { x: -9, z: -3.8, color: '#e6d8b8', trim: '#ba7157', title: '汐见寿司' });
    building(this.static, { x: -20, z: -2.5, color: '#d7dfc9', trim: '#53827b', title: '海风工具店' });
    building(this.static, { x: -1.8, z: -7.5, color: '#cad5cb', trim: '#6d8882', title: '渔获 · 仓库', width: 4.8 });
    this.homeGroup = building(this.static, { x: -19, z: 7, color: '#f0dec1', trim: '#b49468', title: '海边小屋', width: 5 });
    box(this.static, '#9d7956', [6, .2, 2.4], [-18.5, 4.6, 10]);
    for (const x of [-16.2, -15.4]) stick(this.static, '#b99058', [x, .85, 11.2], [x, 4.8, 9.6], .07);
    for (let i = 0; i < 12; i++) stick(this.static, '#e0bd83', [-16.2, 1 + i * .32, 11.14 - i * .13], [-15.4, 1 + i * .32, 11.14 - i * .13], .06);
    label(this.static, '屋外梯子 · 上楼避狼', [-15.7, 5.5, 10], 3.6);
    this.propertyExtra = new THREE.Group(); this.homeGroup.add(this.propertyExtra);
    for (let i = 0; i < 43; i++) box(this.static, i % 3 ? '#b38e62' : '#c2a276', [.48, .18, 3.1], [4 + i * .48, 1.1, 4]);
    for (let i = 0; i < 8; i++) {
      for (const z of [2.55, 5.45]) { cylinder(this.static, '#927653', .12, .15, 3.2, [5 + i * 2.55, -.05, z]); if (i < 6) cylinder(this.static, '#c7b18b', .07, .08, 1, [5 + i * 2.55, 1.7, z]); }
      if (i < 5) for (const z of [2.55, 5.45]) stick(this.static, '#d4c29c', [5 + i * 2.55, 2.05, z], [7.55 + i * 2.55, 2.05, z], .035);
    }
    label(this.static, '风栖港', [7, 2.9, 3], 2.8);
    box(this.static, '#6b8a87', [.8, .65, .7], [19, 1.5, 5]); box(this.static, '#cbb88f', [.9, .1, .8], [19, 1.9, 5]);
    for (const [x, z] of [[1, 3], [-5, 1.3], [-15, 7.3]]) { box(this.static, '#a6865c', [1.25, .8, .9], [x, 1.2, z]); for (let i = 0; i < 3; i++) box(this.static, '#c1a475', [1.3, .06, .98], [x, 1 + i * .23, z]); }
    const bench = new THREE.Group(); bench.position.set(-7, .9, 6.5); this.static.add(bench);
    box(bench, '#bd9568', [2.5, .15, .6], [0, .6, 0]); box(bench, '#bd9568', [2.5, .6, .12], [0, 1, .35]);
    for (const x of [-.9, .9]) box(bench, '#466c64', [.1, .6, .5], [x, .25, 0]);
    this.npc = character(this.static, '#f2e8cf'); this.npc.position.set(-6.4, .85, -.25);
    const merchant = character(this.static, '#718b82'); merchant.position.set(-17, .85, .2);
    this.boat = new THREE.Group(); this.boat.position.set(25, .3, 4); this.scene.add(this.boat);
    const hullShape = new THREE.Shape(); hullShape.moveTo(-2.3, -.95); hullShape.lineTo(1.1, -.95); hullShape.quadraticCurveTo(2.6, -.8, 2.8, 0); hullShape.quadraticCurveTo(2.6, .8, 1.1, .95); hullShape.lineTo(-2.3, .95); hullShape.closePath();
    const hull = new THREE.Mesh(new THREE.ExtrudeGeometry(hullShape, { depth: .65, bevelEnabled: true, bevelSize: .1, bevelThickness: .1, bevelSegments: 2, steps: 1 }), material('#376b68')); hull.rotation.x = Math.PI / 2; hull.position.y = .3; hull.castShadow = true; this.boat.add(hull);
    box(this.boat, '#e5d4aa', [3.2, .1, 1.55], [-.3, .5, 0]); box(this.boat, '#e8dfc5', [2.2, .22, .36], [-.55, .72, -.6]); box(this.boat, '#e8dfc5', [2.2, .22, .36], [-.55, .72, .6]);
    box(this.boat, '#a1c3b8', [.7, .6, .8], [-.75, 1, 0]); box(this.boat, '#344f50', [.4, .7, .5], [-2.4, .2, 0]);
    for (const x of [-1.5, .65]) for (const z of [-.67, .67]) stick(this.boat, '#eee3c5', [x, .7, z], [x, 2.55, z], .035);
    box(this.boat, '#d28d66', [2.9, .1, 1.7], [-.4, 2.55, 0]);
    for (let i = 0; i < 6; i++) box(this.boat, '#f3e4c7', [.23, .02, 1.72], [-1.5 + i * .43, 2.61, 0]);
    const buoy = new THREE.Mesh(new THREE.TorusGeometry(.28, .08, 8, 20), material('#e8b365')); buoy.position.set(.7, 1.4, .8); this.boat.add(buoy);
  }
  buildSeabed() {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300, 30, 30), material('#a9bda2')); ground.rotation.x = -Math.PI / 2; ground.position.y = -12; ground.receiveShadow = true; this.scene.add(ground);
    const g = new THREE.Group(); this.scene.add(g);
    for (let i = 0; i < 90; i++) {
      const a = i * 2.399, radius = 12 + (i % 11) * 3.7; const x = 23 + Math.cos(a) * radius, z = Math.sin(a) * radius;
      if (x < 9 && z < 10 && z > -20) continue;
      if (i % 4 === 0) { ellipsoid(g, '#6f9990', [1.1 + i % 3, .9, 1.3], [x, -11.5, z]); continue; }
      const color = ['#d99985', '#bd92ab', '#d4b886', '#6b9b89'][i % 4];
      for (let j = 0; j < 3; j++) {
        const height = .5 + ((i + j) % 5) * .28;
        stick(g, color, [x + j * .15, -12, z], [x + Math.sin(i + j) * .5, -12 + height, z + Math.cos(j) * .3], .075);
      }
    }
    batchMeshes(g);
    const points = new Float32Array(300 * 3);
    for (let i = 0; i < 300; i++) { points[i * 3] = (Math.random() - .5) * 100 + 30; points[i * 3 + 1] = -Math.random() * 11; points[i * 3 + 2] = (Math.random() - .5) * 90; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(points, 3)); this.particles = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#d3efe0', size: .06, transparent: true, opacity: .55 })); this.scene.add(this.particles);
  }
  buildSky() {
    for (let i = 0; i < 7; i++) {
      const g = new THREE.Group(); g.position.set(-85 + i * 30, 18 + i % 3 * 5, -85 - i % 2 * 15); this.scene.add(g);
      for (let j = 0; j < 4; j++) ellipsoid(g, '#e6efdf', [3 + j, 1.4 + j * .3, 2], [j * 3, Math.sin(j) * 1.4, 0]);
    }
    for (let i = 0; i < 5; i++) {
      const mountain = new THREE.Mesh(new THREE.ConeGeometry(12 + i * 2, 8 + i, 7), material('#9fbeba')); mountain.position.set(-90 + i * 38, -.5, -90); this.scene.add(mountain);
    }
    this.gulls = [];
    for (let i = 0; i < 6; i++) { const g = new THREE.Group(); stick(g, '#f6f0d8', [-.5, 0, 0], [0, -.08, .1], .035); stick(g, '#f6f0d8', [0, -.08, .1], [.5, 0, 0], .035); this.scene.add(g); this.gulls.push(g); }
  }
  spawnFishes() { for (let i = 0; i < 42; i++) this.spawnFish(i); }
  spawnFish(i, replacement = false) {
    const species = this.game.sampleSpecies(); const mesh = fishModel(species, this.scene);
    const radius = 8 + i % 9 * 2, angle = i * 2.399;
    const center = new THREE.Vector3(34 + Math.cos(angle) * radius, -2.2 - i % 7 * 1.2, 4 + Math.sin(angle) * radius);
    mesh.position.copy(center); const entry = { species, mesh, center, phase: i * 1.3, speed: .24 + Math.random() * .2, hp: Math.max(1, Math.round(species.weight / 2)), attack: 3 + Math.random() * 9, dead: false, seed: i };
    this.fishes.push(entry); mesh.traverse(m => { if (m.isMesh) m.userData.fish = entry; });
  }
  updateProperty() {
    const h = this.game.s.house; if (h === this.currentHouse) return; this.currentHouse = h;
    this.propertyExtra.clear();
    for (let i = 0; i < h; i++) {
      box(this.propertyExtra, '#eee0c4', [4.5, 2.7, 3.8], [0, 5 + i * 2.7, 0]);
      for (const x of [-1.2, 0, 1.2]) box(this.propertyExtra, '#9bbcb7', [.8, 1.4, .06], [x, 5.2 + i * 2.7, 1.93]);
    }
    this.renderer.shadowMap.needsUpdate = true;
  }
  isLand(x, z) { return ((x + 14) / 20) ** 2 + ((z + 3) / 15) ** 2 < .94 || (x >= 3 && x <= 24 && Math.abs(z - 4) < 1.55); }
  climbHome() {
    if (this.player.position.distanceTo(new THREE.Vector3(-18, .85, 9)) > 9 && !this.game.s.upstairs) { this.game.toast('先到家旁的屋外梯子。'); return false; }
    if (!this.game.climbLadder()) return false;
    this.walkGoal = null; this.mode = 'home'; this.keys.clear(); this.player.position.set(-18, 5, 9); this.focusPlayer(true); return true;
  }
  leaveHome() {
    this.game.leaveHome(); this.mode = 'home'; this.player.position.set(-18, .85, 11);
    if (this.game.wolvesActive) this.game.die();
    this.focusPlayer(true);
  }
  buildWolves() {
    this.wolves = [];
    for (let i = 0; i < 5; i++) {
      const mesh = new THREE.Group(); this.scene.add(mesh);
      ellipsoid(mesh, '#59616b', [.85, .42, .38], [0, .85, 0]); ellipsoid(mesh, '#717986', [.38, .38, .32], [.7, 1.08, 0]);
      box(mesh, '#414953', [.45, .22, .28], [1, .97, 0]);
      for (const z of [-.2, .2]) cylinder(mesh, '#636b76', 0, .16, .4, [.62, 1.5, z], 4);
      for (const x of [-.55, .5]) for (const z of [-.23, .23]) stick(mesh, '#424a54', [x, .75, z], [x, .15, z], .09);
      stick(mesh, '#626b77', [-.65, .9, 0], [-1.25, 1.1, 0], .11);
      batchAnimal(mesh); mesh.visible = false;
      this.wolves.push({ mesh, hp: 3, down: false });
    }
  }
  attackWolf() {
    const wolf = this.wolves.filter(w => !w.down && w.mesh.visible).sort((a,b) => a.mesh.position.distanceTo(this.player.position) - b.mesh.position.distanceTo(this.player.position))[0];
    if (!wolf || wolf.mesh.position.distanceTo(this.player.position) > 15) return this.game.toast('狼太远，鱼叉射程 15 米。');
    wolf.hp -= 1 + this.game.s.upgrades.spear; this.splash(wolf.mesh.position, '#f5d38d');
    if (wolf.hp <= 0) { wolf.down = true; wolf.mesh.visible = false; this.game.s.wolvesDefeated++; this.game.toast('击败了一只狼！', 'success'); this.game.change(); }
    else this.game.toast('击中了狼，再来一下！');
  }
  goTo(place, callback) {
    if (this.game.s.upstairs && place !== 'home') { this.game.toast('先在家中选择下楼出门。夜里楼下有狼！'); return; }
    if (this.game.diving) { this.game.toast('先浮出水面回到船上，再回港。', 'warning'); return; }
    if (this.mode === 'boat') { this.boat.position.set(25, .3, 4); this.player.position.set(22, 1.2, 4); this.mode = 'pier'; this.game.boardBoat(); }
    this.game.cancelFishing(); const p = PLACES[place]; if (!p) return;
    const points = [];
    if (Math.abs(this.player.position.z - 4) > .5) points.push(new THREE.Vector3(this.player.position.x, .85, 4));
    points.push(new THREE.Vector3(p.x, p.x > 4 ? 1.2 : .85, 4)); points.push(new THREE.Vector3(p.x, p.x > 4 ? 1.2 : .85, p.z));
    this.walkGoal = { points, callback, place }; this.game.toast(`正在前往${p.name}……`);
  }
  board() {
    if (this.game.s.upstairs) { this.game.toast('先下楼，才能登船。'); return; }
    if (this.game.diving) {
      if (this.player.position.y < -.35 || this.player.position.distanceTo(this.boat.position) > 8) { this.game.toast('游到船旁并浮出水面，才能登船。'); return; }
      this.mode = 'boat'; this.game.boardBoat(); this.autoRise = false; this.player.rotation.set(0, -Math.PI / 2, 0); this.focusPlayer(true); return;
    }
    this.game.cancelFishing(); this.walkGoal = null; this.mode = 'boat'; this.boat.position.set(29, .3, 4); this.player.position.copy(this.boat.position).add(new THREE.Vector3(0, .75, 0)); this.focusPlayer(true); this.game.toast('已登船。WASD 驾船，F 下潜，点击「回港」返回码头。');
  }
  dive() {
    if (this.game.diving) return;
    if (this.mode !== 'boat') { this.board(); }
    this.mode = 'dive'; this.player.position.copy(this.boat.position).add(new THREE.Vector3(3, -2.2, 0)); this.game.startDive(); this.focusPlayer(true);
  }
  rise() { this.autoRise = !this.autoRise; this.game.toast(this.autoRise ? '正在上浮，抵达水面后向船游动，按 E 登船。' : '停止自动上浮。'); }
  focusPlayer(immediate = false) {
    const target = this.player.position.clone().add(new THREE.Vector3(0, this.game.diving ? .25 : 1, 0));
    if (immediate) { this.camera.position.copy(target).add(this.game.diving ? new THREE.Vector3(8, 4, 10) : new THREE.Vector3(17, 15, 21)); this.controls.target.copy(target); }
  }
  nearestPlace() {
    let best = null, dist = 7;
    for (const [id, p] of Object.entries(PLACES)) { const d = Math.hypot(p.x - this.player.position.x, p.z - this.player.position.z); if (d < dist) { best = id; dist = d; } }
    return best;
  }
  splash(pos, color = '#d7f1dc') {
    const ring = new THREE.Mesh(new THREE.RingGeometry(.15, .3, 28), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true }));
    ring.rotation.x = -Math.PI / 2; ring.position.copy(pos); this.scene.add(ring); this.effects.push({ mesh: ring, life: 0, duration: .65 });
  }
  shoot(clientX = innerWidth / 2, clientY = innerHeight / 2) {
    if (!this.game.diving || this.spearCooldown > 0) return;
    const level = this.game.s.upgrades.spear, knife = this.game.weapon === 'knife';
    this.spearCooldown = knife ? .35 : 1 / (1 + level * 2);
    this.raycaster.setFromCamera(new THREE.Vector2(clientX / innerWidth * 2 - 1, -clientY / innerHeight * 2 + 1), this.camera);
    const hit = this.raycaster.intersectObjects(this.fishes.filter(f => !f.dead).map(f => f.mesh), true).find(h => h.object.userData.fish);
    let target = hit?.object.userData.fish;
    const reach = knife ? 3.5 : 17 + level * 3;
    if (target && target.mesh.position.distanceTo(this.player.position) > reach) { this.game.toast('目标太远，游近一点再出手。'); target = null; }
    const origin = this.player.position.clone().add(new THREE.Vector3(0, .9, 0));
    const end = target ? target.mesh.position.clone() : this.raycaster.ray.at(16, new THREE.Vector3());
    const trail = new THREE.Line(new THREE.BufferGeometry().setFromPoints([origin, end]), new THREE.LineBasicMaterial({ color: '#f4d796', transparent: true })); this.scene.add(trail); this.effects.push({ mesh: trail, life: 0, duration: .22 });
    this.game.emit('shoot');
    if (target) {
      target.hp -= (knife ? 2 : 3 + level * 7); this.splash(target.mesh.position, '#f5db98');
      if (target.hp <= 0) this.catchWorldFish(target, { alive: false });
      else this.game.toast(`${target.species.name}被击中，还在挣扎！`);
    }
  }
  catchWorldFish(fish, options = {}) {
    if (fish.dead) return; fish.dead = true; this.scene.remove(fish.mesh); this.game.collect(fish.species, options);
    fish.respawnAt = this.elapsed + 22;
  }
  update(dt) {
    this.elapsed += dt; const t = this.elapsed; this.waterMat.uniforms.time.value = t;
    const underwater = this.game.diving && this.player.position.y < -.35;
    this.game.submerged = underwater; this.waterMat.uniforms.under.value = underwater ? 1 : 0;
    const minute = this.game.s.minute, red = Math.max(0, Math.min(1, (minute - 1020) / 120));
    const night = this.game.isNight;
    const sky = new THREE.Color('#c7e4e4').lerp(new THREE.Color('#a14f58'), red);
    if (night) sky.set('#101b36');
    const bg = underwater ? new THREE.Color(night ? '#102c42' : '#2a7c83') : sky;
    this.scene.background.copy(bg); this.scene.fog.color.copy(bg); this.scene.fog.near = underwater ? 8 : 70; this.scene.fog.far = underwater ? 60 : 190;
    this.hemi.intensity = night ? .45 : 2 - red * .9; this.sun.intensity = night ? .2 : 3.2 - red * 2.5;
    this.sun.color.set(night ? '#7698e1' : '#fff0ca').lerp(new THREE.Color('#f48256'), night ? 0 : red);
    this.renderer.toneMappingExposure = night ? .65 : 1.15 - red * .25;
    this.controls.maxPolarAngle = underwater ? Math.PI * .75 : Math.PI * .48;
    this.spearCooldown = Math.max(0, this.spearCooldown - dt);
    if (this.pointerHeld && this.game.diving && this.pointer) this.shoot(this.pointer.x, this.pointer.y);
    const oldPosition = this.player.position.clone(); let moving = false;
    if (this.walkGoal) {
      const goal = this.walkGoal.points[0], d = goal.clone().sub(this.player.position); d.y = 0;
      if (d.length() < .3) { this.player.position.copy(goal); this.walkGoal.points.shift(); if (!this.walkGoal.points.length) { const cb = this.walkGoal.callback; this.mode = this.walkGoal.place; this.walkGoal = null; cb?.(); } }
      else { const distance = d.length(); d.normalize(); this.player.position.addScaledVector(d, Math.min(distance, dt * 8.5)); this.player.position.y = this.player.position.x > 3 ? 1.2 : .85; this.player.rotation.y = Math.atan2(-d.x, -d.z); moving = true; }
    } else if (!this.game.fishing && !this.game.s.upstairs) {
      const dir = new THREE.Vector3(); this.camera.getWorldDirection(dir); dir.y = 0; dir.normalize(); const right = new THREE.Vector3().crossVectors(dir, Y).normalize(); const movement = new THREE.Vector3();
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) movement.add(dir);
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) movement.sub(dir);
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) movement.add(right);
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) movement.sub(right);
      if (movement.lengthSq()) {
        movement.normalize(); const speed = this.game.diving ? 3.7 + this.game.s.upgrades.fins * .65 : this.mode === 'boat' ? 9 : 5;
        const next = this.player.position.clone().addScaledVector(movement, dt * speed);
        if (this.game.diving || this.mode === 'boat' || this.isLand(next.x, next.z)) {
          this.player.position.copy(next); this.player.rotation.y = Math.atan2(-movement.x, -movement.z); moving = true;
          if (this.mode === 'boat') { this.boat.position.set(next.x, .3, next.z); this.boat.rotation.y = Math.atan2(-movement.z, movement.x); }
        }
      }
      if (this.game.diving) {
        if (this.keys.has('Space') || this.autoRise) this.player.position.y += dt * (3 + this.game.s.upgrades.fins * .5);
        if (this.keys.has('ControlLeft') || this.keys.has('ControlRight')) { this.player.position.y -= dt * 3; this.autoRise = false; }
        this.player.position.y = Math.max(-10.7, Math.min(.1, this.player.position.y));
        if (this.player.position.y >= -.1) this.autoRise = false;
      } else if (this.mode !== 'boat') this.player.position.y = this.player.position.x > 3 ? 1.2 : .85;
    }
    for (let i = 0; i < this.wolves.length; i++) {
      const wolf = this.wolves[i];
      if (!night) { wolf.down = false; wolf.hp = 3; }
      const appearing = this.game.wolvesActive && !wolf.down;
      if (appearing && !wolf.mesh.visible) wolf.mesh.position.set(-22 + i * 2, .85, 12 + i);
      wolf.mesh.visible = appearing;
      if (!appearing) continue;
      const target = this.game.s.upstairs ? new THREE.Vector3(-18 + Math.cos(t + i) * 4, .85, 11 + Math.sin(t + i) * 2) : this.player.position.clone();
      const d = target.sub(wolf.mesh.position); d.y = 0;
      if (d.length() > .4) { d.normalize(); wolf.mesh.position.addScaledVector(d, dt * 4.2); wolf.mesh.rotation.y = Math.atan2(-d.z, d.x); }
      wolf.mesh.position.y = this.isLand(wolf.mesh.position.x, wolf.mesh.position.z) ? .85 : -.35 + Math.sin(t * 4 + i) * .08;
      if (!this.game.s.upstairs && this.game.s.ladderGrace <= 0 && wolf.mesh.position.distanceTo(this.player.position) < 2) { this.game.toast('被狼击杀，随身渔获丢失。', 'danger'); this.game.die(); }
    }
    const cameraDelta = this.player.position.clone().sub(oldPosition); this.camera.position.add(cameraDelta); this.controls.target.add(cameraDelta);
    const target = this.player.position.clone().add(new THREE.Vector3(0, this.game.diving ? .6 : 1, 0)); this.controls.target.lerp(target, dt * .8);
    this.player.visible = this.mode !== 'boat'; this.rod.visible = !this.game.diving;
    this.player.userData.leftLeg.rotation.x = moving ? Math.sin(t * 9) * .45 : 0; this.player.userData.rightLeg.rotation.x = moving ? -Math.sin(t * 9) * .45 : 0;
    this.boat.position.y = .3 + Math.sin(t * 1.3) * .07; this.boat.rotation.z = Math.sin(t * .8) * .025;
    this.line.visible = this.float.visible = Boolean(this.game.fishing);
    if (this.game.fishing) {
      const f = this.game.fishing, origin = this.player.position.clone().add(new THREE.Vector3(0, 3.3, 0));
      this.float.position.set(this.player.position.x + 7 - f.progress * 5, f.phase === 'bite' ? -.2 : .12 + Math.sin(t * 3) * .04, this.player.position.z + .5);
      const curve = new THREE.QuadraticBezierCurve3(origin, origin.clone().lerp(this.float.position, .5).add(new THREE.Vector3(0, -1.1, 0)), this.float.position);
      this.line.geometry.dispose(); this.line.geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(20)); this.rod.rotation.z = f.phase === 'fight' ? Math.sin(t * 6) * .08 : 0;
      if (f.phase === 'bite' && Math.sin(t * 14) > .9) this.splash(this.float.position.clone());
    }
    for (let i = 0; i < this.gulls.length; i++) { const a = t * .08 + i; this.gulls[i].position.set(-10 + Math.cos(a) * 28, 12 + Math.sin(a * 2) * 2 + i * .5, -5 + Math.sin(a) * 20); this.gulls[i].rotation.y = -a; }
    this.updateCompanions(dt, t);
    const respawn = [];
    for (const f of this.fishes) {
      if (f.dead) { if (t > f.respawnAt) respawn.push(f); continue; }
      const a = t * f.speed + f.phase;
      f.mesh.position.set(f.center.x + Math.cos(a) * 3.4, f.center.y + Math.sin(a * 1.7) * .45, f.center.z + Math.sin(a) * 2.5);
      f.mesh.rotation.y = -Math.atan2(Math.cos(a) * 2.5, -Math.sin(a) * 3.4);
      if (f.mesh.userData.tail) f.mesh.userData.tail.rotation.y = Math.sin(t * 8 + f.phase) * .4;
      const distance = f.mesh.position.distanceTo(this.player.position);
      if (underwater && !f.species.aggressive && distance < 3.3) f.center.addScaledVector(f.mesh.position.clone().sub(this.player.position).normalize(), dt * 1.3);
      if (underwater && f.species.aggressive && distance < 14) {
        f.attack -= dt; f.center.lerp(this.player.position, dt * .13);
        if (distance < 5 && f.attack <= 0) { this.game.takeAttack(f.species.size > 5 ? 25 : 12); f.attack = 7; const friend = this.game.activeFish[0]; if (friend && Math.random() < .5) this.game.hurtPartner(friend.uid, 28); }
      }
    }
    for (const f of respawn) { this.fishes.splice(this.fishes.indexOf(f), 1); this.spawnFish(f.seed, true); }
    for (let i = this.effects.length - 1; i >= 0; i--) { const e = this.effects[i]; e.life += dt; const p = e.life / e.duration; e.mesh.material.opacity = 1 - p; if (e.mesh.isMesh) e.mesh.scale.setScalar(1 + p * 4); if (p > 1) { this.scene.remove(e.mesh); e.mesh.geometry.dispose(); e.mesh.material.dispose(); this.effects.splice(i, 1); } }
    this.controls.update(); this.renderer.render(this.scene, this.camera);
  }
  updateCompanions(dt, t) {
    const ready = this.game.activeParrots;
    this.birds.forEach((b, i) => {
      const p = this.game.s.parrots[i]; b.visible = Boolean(p?.alive);
      if (!p?.alive) return;
      if (p.trust >= 100 && (!this.game.diving || p.breath > 0)) b.position.copy(this.player.position).add(new THREE.Vector3(Math.sin(t * 1.5 + i) * .7 + 1.4 + i, this.game.diving ? 1.2 : 2.5 + Math.sin(t * 3) * .2, .2));
      else b.position.set(-18.5 + i * .6, 2.2, 7);
      b.userData.wings.forEach((w, j) => { w.rotation.z = Math.sin(t * 14) * .5 * (j ? 1 : -1); });
    });
    const active = this.game.activeFish;
    for (const [id, mesh] of this.partnerMeshes) if (!active.find(f => f.uid === id)) { this.scene.remove(mesh); this.partnerMeshes.delete(id); }
    active.forEach((f, i) => {
      if (!this.partnerMeshes.has(f.uid)) { const mesh = fishModel(SPECIES.find(s => s.id === f.species), this.scene); mesh.scale.multiplyScalar(.8); this.partnerMeshes.set(f.uid, mesh); }
      const mesh = this.partnerMeshes.get(f.uid); mesh.visible = this.game.diving;
      mesh.position.copy(this.player.position).add(new THREE.Vector3(Math.cos(t + i) * 2.2, -.2, Math.sin(t + i) * 2.2)); mesh.rotation.y = -t - i;
    });
    if (!this.game.diving || !this.game.submerged) return;
    this.parrotTimer += dt; this.fishPartnerTimer += dt;
    if (this.parrotTimer > 6 && ready.length) {
      this.parrotTimer = 0;
      for (const p of ready) {
        const stats = parrotCombat(p);
        const targets = this.fishes.filter(f => !f.dead && f.species.weight <= stats.maxWeight && f.mesh.position.distanceTo(this.player.position) < 14)
          .sort((a, b) => stats.level === 10 ? b.species.weight - a.species.weight : a.species.weight - b.species.weight).slice(0, stats.targets);
        for (const f of targets) {
          if (f.species.aggressive || f.species.rarity === '庞然大物') {
            f.hp -= stats.damage; this.splash(f.mesh.position, '#f5db98');
            if (f.hp <= 0) this.catchWorldFish(f, { alive: false, partner: p.name });
          } else this.catchWorldFish(f, { alive: true, partner: p.name });
        }
      }
    }
    if (this.fishPartnerTimer > 2 && active.length) {
      this.fishPartnerTimer = 0;
      for (const friend of active) {
        const power = (SPECIES.find(s => s.id === friend.species).power || 1) * friend.level;
        const targets = this.fishes.filter(f => !f.dead && f.species.weight < power * 3 && f.mesh.position.distanceTo(this.player.position) < 12).slice(0, Math.min(6, power));
        for (const f of targets) this.catchWorldFish(f, { alive: true, partner: friend.name });
      }
    }
  }
}
