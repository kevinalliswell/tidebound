import './style.css';
import { Game, SAVE_KEY, SPECIES, TECHNIQUES, UPGRADES, PARROT_MAX_LEVEL, fishNutrition, parrotCombat } from './game.js';
import { World, PLACES } from './world.js';
import { icon } from './icons.js';

const $ = (s, root = document) => root.querySelector(s);
const money = n => Number(n).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let saved = null;
try { saved = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { /* A corrupt or unavailable local save starts a new voyage. */ }
const game = new Game(saved);
let world, panel = null, paused = false, contextKey = '', lastHud = 0, lastSave = 0, toastId = 0;
const ui = $('#ui');
ui.innerHTML = `
  <header class="topbar">
    <div class="brand"><div class="brand-mark">${icon('fish')}</div><div><div class="brand-name">潮生</div><div class="brand-en">TIDEBOUND</div></div></div>
    <div class="world-clock">${icon('sun')}<span id="day">第 1 天</span><span class="dot"></span><time id="clock">08:20</time><span class="dot"></span><span>晴 · 微风</span></div>
    <div class="top-actions"><div class="wallet">${icon('coin')}<b id="money">36</b></div><button class="icon-button" data-action="inventory" title="背包 · I" aria-label="打开背包">${icon('bag')}</button><button class="icon-button optional" data-action="catalog" title="生物图鉴" aria-label="生物图鉴">${icon('fish')}</button><button class="icon-button optional" data-action="help" title="玩法与按键" aria-label="玩法与按键">${icon('info')}</button><button class="icon-button optional" data-action="sound" title="声音开关" aria-label="声音开关">${icon('sound')}</button></div>
  </header>
  <aside class="quest"><div class="eyebrow"><span>你的海边生活</span><span id="quest-number">01 / 04</span></div><h2 id="quest-title">从一尾鱼，到整片海。</h2><p id="quest-desc">海风正好。站在码头抛一竿，<br>从今天的第一尾鱼开始。</p><div class="quest-line"><span class="ring" id="quest-ring"></span><span id="quest-task">钓起你的第一尾鱼</span>${icon('arrow')}</div><div class="journey"><span></span><span></span><span></span><span></span></div></aside>
  <aside class="mini-map"><div class="map-disc"><span class="map-north">N</span><svg viewBox="0 0 140 140"><path d="M0 33C17 17 30 15 52 21S84 44 85 67 75 99 48 109 10 97 1 85Z" fill="#d6d6ae"/><path d="M3 40C27 23 47 27 61 43S81 69 66 86 25 102 8 83Z" fill="#93b394"/><path d="M17 76 74 76 109 76" fill="none" stroke="#eadbb7" stroke-width="5"/><path d="M39 38v40M19 60h45" fill="none" stroke="#d9cba6" stroke-width="3"/><rect x="30" y="44" width="13" height="10" rx="2" fill="#b6795a"/><rect x="9" y="49" width="13" height="10" rx="2" fill="#618c7a"/><rect x="54" y="38" width="11" height="10" rx="2" fill="#9da887"/><rect x="17" y="83" width="12" height="9" rx="2" fill="#b7986c"/><path d="M101 93q10-4 16 0M100 47q10-4 16 0M80 117q10-4 16 0" fill="none" stroke="#cee0cd" stroke-width="1"/></svg><div class="map-player" id="map-player" style="left:73%;top:54%"></div></div><div class="map-caption"><i></i>风栖群岛 · 南岸</div></aside>
  <button class="companion-pill" data-action="partners">${icon('bird')}<span id="companion-label">阿晴在身边</span><small>伙伴</small></button>
  <div class="location-card"><div class="eyebrow" id="place-en">WINDREST PIER</div><h1 id="place-name">风栖码头</h1><p id="place-description">浪声、海风，和还没写完的故事。</p></div>
  <div class="control-hints"><span>移动 <kbd class="key">W A S D</kbd></span><span>转动视角 <kbd class="key">右键拖动</kbd></span><span>缩放 <kbd class="key">滚轮</kbd></span><span>背包 / 暂停 <kbd class="key">I / Esc</kbd></span></div>
  <div class="context" id="context"></div>
  <nav class="bottom-dock" aria-label="地点导航">
    <button class="nav-button active" data-nav="pier">${icon('anchor')}<span>码头垂钓</span></button>
    <button class="nav-button" data-action="boat">${icon('boat')}<span>船与潜水</span></button><div class="nav-sep"></div>
    <button class="nav-button" data-nav="sushi">${icon('sushi')}<span>汐见寿司</span></button>
    <button class="nav-button" data-nav="tools">${icon('tools')}<span>工具商店</span></button>
    <button class="nav-button" data-nav="warehouse">${icon('box')}<span>卖鱼入库</span></button>
    <button class="nav-button" data-nav="home">${icon('home')}<span>家与鱼缸</span></button>
    <button class="nav-button" data-action="partners">${icon('bird')}<span>我的伙伴</span></button>
  </nav>
  <div class="oxygen-hud hidden" id="oxygen"><div class="oxygen-top"><span>O₂ · 潜水氧气</span><b id="oxygen-value">100%</b></div><div class="progress"><i id="oxygen-fill" style="width:100%"></i></div><div class="oxygen-foot"><span id="oxygen-time">约 100 秒</span><span id="oxygen-load">0 / 20 kg</span><span id="depth">水深 0 m</span></div></div>
  <div class="crosshair"></div><div class="hurt-flash" id="hurt"></div>
  <div class="toasts" id="toasts" aria-live="polite"></div>
  <div class="time-warning hidden" id="time-warning" role="alert"></div>
  <div class="night-countdown hidden" id="night-countdown" aria-live="polite"></div>
  <div class="overlay hidden" id="overlay"><section class="panel" role="dialog" aria-modal="true" aria-labelledby="panel-title"><div class="panel-head"><div><div class="eyebrow" id="panel-en"></div><h2 id="panel-title"></h2></div><button class="close" data-action="close" aria-label="关闭">${icon('close')}</button></div><div class="panel-content" id="panel-content"></div></section></div>
  <div class="paused-badge hidden" id="pause"><div class="eyebrow">TAKE YOUR TIME</div><h2>海风等你回来</h2><p>游戏已暂停 · 氧气和时间暂停流逝</p><button class="btn" data-action="resume">继续航程 ${icon('arrow')}</button></div>
  <div class="build-label">3D PLAYABLE PROTOTYPE · v0.1 · 本地自动存档</div>
  <div class="loading" id="loading">潮 生<small>正在为你准备一片海</small></div>
`;

try { world = new World($('#scene'), game); }
catch (error) {
  console.error(error);
  ui.innerHTML = `<div class="fatal-error"><div><h1>这片海暂时无法打开</h1><p>请使用支持 WebGL 的电脑浏览器，并开启硬件加速。</p><p>${escape(error.message)}</p><button onclick="location.reload()">重新加载</button></div></div>`;
  throw error;
}

// Procedural audio: no external downloads, playback starts after a gesture.
let audio, ambientGain, warningTimer;
function startAudio() {
  if (!game.s.sound) return;
  try {
    if (!audio) {
      audio = new (window.AudioContext || window.webkitAudioContext)();
      const buffer = audio.createBuffer(1, audio.sampleRate * 3, audio.sampleRate), data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * .3;
      const source = audio.createBufferSource(); source.buffer = buffer; source.loop = true;
      const filter = audio.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 450;
      ambientGain = audio.createGain(); ambientGain.gain.value = .14;
      source.connect(filter).connect(ambientGain).connect(audio.destination); source.start();
    }
    audio.resume().catch(() => {});
  } catch { /* Audio support is optional. */ }
}
function sound(type) {
  if (!audio || !game.s.sound) return;
  const notes = type === 'catch' ? [523, 659, 784] : type === 'bite' ? [660, 880] : type === 'shoot' ? [180] : [330];
  notes.forEach((frequency, i) => {
    const osc = audio.createOscillator(), gain = audio.createGain(), t = audio.currentTime + i * .09;
    osc.type = type === 'shoot' ? 'triangle' : 'sine'; osc.frequency.setValueAtTime(frequency, t); osc.frequency.exponentialRampToValueAtTime(frequency * .8, t + .17);
    gain.gain.setValueAtTime(.06, t); gain.gain.exponentialRampToValueAtTime(.001, t + .25);
    osc.connect(gain).connect(audio.destination); osc.start(t); osc.stop(t + .3);
  });
}
document.addEventListener('pointerdown', startAudio, { once: true });
document.addEventListener('keydown', startAudio, { once: true });

function toast(message, tone = 'info') {
  const el = document.createElement('div'); el.className = `toast ${tone}`; el.id = `toast-${++toastId}`; el.textContent = message;
  $('#toasts').appendChild(el);
  while ($('#toasts').children.length > 3) $('#toasts').firstElementChild.remove();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, tone === 'danger' ? 7500 : 4700);
}
function persist() {
  try { localStorage.setItem(SAVE_KEY, game.serialize()); } catch { /* Storage can be unavailable in private browsing. */ }
}
game.on(e => {
  if (e.type === 'toast') toast(e.message, e.tone);
  if (['catch', 'bite', 'shoot', 'cast', 'skill', 'shield'].includes(e.type)) sound(e.type);
  if (e.type === 'change') { renderPanel(); updateHUD(); persist(); }
  if (e.type === 'hurt' || e.type === 'shield') { $('#hurt').classList.add('on'); setTimeout(() => $('#hurt').classList.remove('on'), 350); }
  if (e.type === 'time-warning') {
    clearTimeout(warningTimer); const banner = $('#time-warning');
    banner.textContent = e.message; banner.className = `time-warning ${e.tone}`;
    warningTimer = setTimeout(() => banner.classList.add('hidden'), 3000);
  }
});

const btn = (label, action, extra = '', cls = '') => `<button class="btn ${cls}" data-action="${action}" ${extra}>${label}</button>`;
const empty = (text, image = 'fish') => `<div class="empty-state">${icon(image)}<br>${text}</div>`;
const panelMeta = {
  inventory: ['你的防水背包', 'YOUR CATCH, YOUR CHOICE'],
  sushi: ['汐见寿司', 'A LITTLE TASTE OF THE SEA'],
  tools: ['海风工具店', 'GO A LITTLE FURTHER'],
  warehouse: ['渔获与仓库', 'BRING YOUR CATCH HOME'],
  home: ['家与鱼缸', 'SOMEWHERE TO COME BACK TO'],
  partners: ['我的伙伴', 'NEVER DIVE ALONE'],
  catalog: ['水生生物图鉴', 'THE OCEAN KEEPS ITS SECRETS'],
  techniques: ['钓法手记', 'THE ART OF THE CAST'],
  help: ['出海之前', 'A SMALL GUIDE TO A BIG OCEAN'],
};
let focusBeforePanel = null;
function openPanel(id) {
  if (!panelMeta[id]) return;
  if (id === 'home' && !game.s.upstairs && !world.climbHome()) return;
  focusBeforePanel = document.activeElement; panel = id; world.pointerHeld = false; world.reeling = false; world.keys.clear();
  $('#overlay').classList.remove('hidden'); renderPanel(); $('#overlay .close').focus({ preventScroll: true });
}
function closePanel() { panel = null; $('#overlay').classList.add('hidden'); focusBeforePanel?.focus?.({ preventScroll: true }); }
function fishRows(items, source = 'bag', mode = 'bag') {
  if (!items.length) return empty(mode === 'house' ? '还没有可以安置的活鱼。<br>在码头钓鱼，或让伙伴帮你完整捕获。' : '这里还是空的。<br>带一些海里的故事回来吧。');
  return items.map(f => {
    const reason = mode === 'house' ? game.housingBlockReason(f) : '';
    return `<div class="item-row"><div class="item-image" style="color:${SPECIES.find(s => s.id === f.species)?.color || '#789783'}">${icon(f.bones ? 'box' : 'fish')}</div><div class="item-copy"><h3>${escape(f.name)}${f.bones ? ' · 鱼骨' : ''}</h3><p>${f.weight} kg · ${escape(f.rarity)} · ${f.bones ? '原价一半' : f.alive ? '活体，可养成伙伴' : '已死亡，可出售或换寿司'}${reason ? `<br>${reason}` : ''}</p><div class="item-actions">${mode === 'sushi' ? btn('换 3 份寿司', 'exchange', `data-id="${f.uid}"`, 'small secondary') : mode === 'house' ? btn(reason ? '暂不可入缸' : '安置到鱼缸', 'house-fish', `data-id="${f.uid}" data-source="${source}" ${reason ? 'disabled' : ''}`, 'small secondary') : source === 'bag' ? btn('丢弃减重', 'discard', `data-id="${f.uid}"`, 'small ghost') : ''}</div></div><span class="price">¥${money(f.value)}</span></div>`;
  }).join('');
}
function renderPanel() {
  if (!panel) return;
  const s = game.s, meta = panelMeta[panel]; $('#panel-title').textContent = meta[0]; $('#panel-en').textContent = meta[1]; let html = '';
  if (panel === 'inventory') {
    const over = game.loadFactor > 1;
    html = `<div class="bag-summary ${over ? 'over' : ''}"><span>${icon('bag')} ${game.weight} / ${game.capacity} kg</span><span>${over ? `超载 · 耗氧 ×${game.loadFactor.toFixed(2)}` : '负重正常'}</span></div><div class="progress ${over ? 'red' : ''}"><i style="width:${Math.min(100, game.weight / game.capacity * 100)}%"></i></div><p class="panel-note" style="margin-top:15px">死亡会丢失随身渔获。仓库安全保存；存活的鱼伙伴会自动回鱼缸。氧气在查看背包时仍会消耗。</p>${fishRows(s.bag)}<div class="footer-actions">${btn('前往卖鱼 / 入库', 'travel', 'data-place="warehouse"', 'secondary')}${btn('前往鱼缸', 'travel', 'data-place="home"', 'secondary')}</div>`;
    html += `${btn('稀有活鱼一键入缸', 'house-rare', '', 'secondary wide')}<p class="panel-note">优先安置最稀有的背包活鱼；容量不足会自动花游戏币购买、扩展鱼缸。普通鱼和已死亡渔获保留。</p>`;
  } else if (panel === 'tools') {
    html = `<p class="panel-note">好装备让你去更深的地方。升级即时生效，购买前可以先看价格。</p><div class="section-caption">潜水与钓鱼装备</div>`;
    for (const [key, u] of Object.entries(UPGRADES)) {
      const l = s.upgrades[key], cost = u.base * (l + 1) ** 2;
      html += `<div class="item-row"><div class="item-image">${icon(key === 'rod' ? 'rod' : key === 'bag' ? 'bag' : key === 'oxygen' ? 'dive' : 'tools')}</div><div class="item-copy"><h3>${u.name} <span class="tag">Lv.${l}</span></h3><p>${u.detail}</p></div>${btn(l >= u.max ? '已满级' : `¥${money(cost)} 升级`, 'upgrade', `data-key="${key}" ${l >= u.max || s.money < cost ? 'disabled' : ''}`, 'small secondary')}</div>`;
    }
    const cost = s.aquariumLevel ? s.aquariumLevel * 80 : 48;
    html += `<div class="section-caption">伙伴的家</div><div class="item-row"><div class="item-image">${icon('fish')}</div><div class="item-copy"><h3>${s.aquariumLevel ? '扩展鱼缸' : '购买第一个鱼缸'}</h3><p>先有鱼缸，才能安置和携带鱼类伙伴。<br>每级可多安置 3 条活鱼。</p></div>${btn(`¥${cost}`, 'aquarium', s.money < cost ? 'disabled' : '', 'small')}</div><div class="status-row">${icon('info')} 小金鱼是极稀有的顶级伙伴，没有必出保底。</div>`;
  } else if (panel === 'warehouse') {
    const sum = a => money(a.reduce((v, f) => v + f.value, 0));
    html = `<p class="panel-note">码头收购站按价值收购渔获。普通沙丁鱼 ¥3；大鱼与巨物更值钱。鱼骨售价为对应完整鱼的 50%。</p><div class="metric-grid"><div class="metric"><small>背包渔获 · ${s.bag.length} 份</small><b>¥${sum(s.bag)}</b></div><div class="metric"><small>安全仓库 · ${s.warehouse.length} 份</small><b>¥${sum(s.warehouse)}</b></div></div><div class="footer-actions">${btn('卖掉背包渔获', 'sell', 'data-source="bag"', '')}${btn('全部安全入库', 'store', '', 'secondary')}</div>${s.warehouse.length ? `<div class="section-caption">仓库库存</div>${fishRows(s.warehouse, 'warehouse')}${btn('出售仓库渔获', 'sell', 'data-source="warehouse"', 'secondary wide')}` : empty('仓库里的鱼不会因潜水死亡而丢失。', 'box')}`;
  } else if (panel === 'sushi') {
    html = `<div class="sushi-art"><div class="sushi-piece"></div><div class="sushi-piece"></div><div class="sushi-piece"></div></div><p class="panel-note">欢迎回来。早餐、午餐、晚餐，都给自己留一点时间。<br><strong>¥3 = 1 份寿司；1 条完整鱼 = 3 份寿司。</strong><br>鱼的价值不同，珍稀鱼也可以选择出售。</p><div class="meal-slots">${['早餐', '午餐', '晚餐'].map(m => `<span class="${s.meals[`${s.day}-${m}`] ? 'done' : ''}">${icon(s.meals[`${s.day}-${m}`] ? 'check' : 'sun')}${m}</span>`).join('')}</div>${btn(s.meals[game.mealKey] ? `${game.mealSlot}已经吃过了` : `${game.mealSlot} · ${s.sushi > 0 ? '使用已有寿司' : '¥3 吃一份寿司'}`, 'eat', s.meals[game.mealKey] ? 'disabled' : '', 'wide')}<div class="status-row">${icon('sushi')} 已有寿司 ${s.sushi} 份 · 用餐后暂时提高收线效率</div><div class="section-caption">用一条鱼换三份寿司</div>${fishRows(s.bag.filter(f => !f.bones), 'bag', 'sushi')}`;
  } else if (panel === 'home') {
    const alive = s.aquarium.filter(f => f.alive);
    html = `<p class="panel-note">${s.house ? ['','海边小屋','海景别墅','海景高楼'][s.house] : '目前借住在港口小屋。攒钱买下自己的房子，再把它盖得更高、更大。'}</p>`;
    html += `${btn('稀有活鱼一键入缸', 'house-rare', '', 'wide secondary')}<p class="panel-note">最稀有的优先，自动花游戏币购买或扩展容量；不会消耗、出售鱼。</p>`;
    if (s.upstairs) html += `<div class="status-row">家和鱼缸在同一层 · 狼不会上楼或攻击房子</div><div class="footer-actions">${game.isNight ? btn('休息到早上 06:00', 'sleep') : ''}${btn(game.wolvesActive ? '下楼 · 楼下有狼！' : '下楼出门', 'leave-home', '', 'secondary')}</div>`;
    if (!s.aquariumLevel) html += `${empty('这里还没有鱼缸。<br>先去工具店购买，才能养鱼、带鱼伙伴出行。')}${btn('去工具店买鱼缸 · ¥48', 'travel', 'data-place="tools"', 'wide')}`;
    else {
      html += `<div class="tank-view">${alive.map((f, i) => `<div class="tank-fish" style="top:${15 + i % 2 * 25}px;left:${i * 17}px;animation-delay:-${i * 2}s;color:${SPECIES.find(sp => sp.id === f.species)?.color}">${icon('fish')}</div>`).join('')}</div><div class="bag-summary"><span>鱼缸 Lv.${s.aquariumLevel}</span><span>${alive.length} / ${game.aquariumCapacity} 位伙伴</span></div>${alive.length ? fishPartnerCards(alive) : empty('鱼缸已经准备好了，带一条活鱼回来吧。')}<p class="panel-note">所有稀有度的活鱼都能入住，没有体型限制。鱼叉或小刀击杀的鱼已死亡，不能养；请用鱼竿钓取活鱼，或让伙伴活捉。每级鱼缸容纳 3 条活鱼。</p><div class="section-caption">背包渔获 · 入缸状态</div>${fishRows(s.bag, 'bag', 'house')}${s.warehouse.length ? `<div class="section-caption">仓库渔获 · 入缸状态</div>${fishRows(s.warehouse, 'warehouse', 'house')}` : ''}`;
    }
    const houses = [500, 1800, 6000];
    html += `<div class="section-caption">从海边小屋，到你的商业版图</div><div class="item-row"><div class="item-image">${icon('home')}</div><div class="item-copy"><h3>${['买下海边小屋', '扩建海景别墅', '建造海景高楼', '海景高楼已建成'][s.house]}</h3><p>房子升级后，港口里的建筑也会长高。</p></div>${s.house < 3 ? btn(`¥${money(houses[s.house])}`, 'property', 'data-kind="house"', 'small secondary') : '<span class="tag gold">已完成</span>'}</div><div class="item-row"><div class="item-image">${icon('chart')}</div><div class="item-copy"><h3>${s.shop ? '你的鱼铺正在营业' : '开一家自己的鱼铺'}</h3><p>每个游戏日售出仓库最多 5 条鱼，<br>售价比直接出售高 35%。</p></div>${s.shop ? '<span class="tag gold">营业中</span>' : btn('¥350 开店', 'property', 'data-kind="shop"', 'small secondary')}</div><p class="panel-note" style="margin-top:18px">远期目标：成为世界首富。当前原型先以累计财富 ¥1,000,000,000 记录你的航程。</p>`;
  } else if (panel === 'partners') {
    html = `<p class="panel-note">鹦鹉信任满 100 才能潜水。伙伴自动捕鱼，收获直接进背包。鱼伙伴需先买鱼缸；被打死后永久失去。<br>${game.diving ? '正在潜水，无法在岸上喂食或结识鹦鹉。' : '现在可以在岸上喂食和训练鹦鹉。'}</p><div class="section-caption">身边的小鹦鹉</div>`;
    const food = game.parrotFood();
    html += `<p class="panel-note">按下面的喂食键就吃鱼，优先吃背包中普通、便宜的完整鱼。常见鱼 +20、少见 +60、珍稀 +150、传说 +600、巨物 +900 经验；满级 Lv.10 能击败海中巨物。鱼缸和仓库里的鱼不会被喂掉。</p>`;
    html += s.parrots.map(p => {
      const stats = parrotCombat(p), maxed = p.level >= PARROT_MAX_LEVEL;
      return `<div class="partner-card ${!p.alive ? 'dead' : ''}"><header><div class="item-image">${icon('bird')}</div><div><h3>${escape(p.name)} · Lv.${p.level} ${!p.alive ? '· 已离去' : p.trust === 100 ? '· 潜水伙伴' : '· 还在认识你'}</h3><small>生命 ${p.hp}/100 · ${game.diving ? `憋气 ${Math.ceil(p.breath)}%` : '岸上休息'}<br>战斗力 ${stats.damage} · 可对付 ${stats.maxWeight} kg 内的鱼 · ${maxed ? '已满级 · 能击败巨物' : `经验 ${p.xp} / ${p.level * 50}`}</small></div></header><div class="bar-label" style="color:#87927d"><span>信任值</span><span>${p.trust}/100</span></div><div class="progress gold"><i style="width:${p.trust}%"></i></div>${p.alive ? `<div class="item-actions">${btn(maxed ? '已满级' : food ? `喂食 · ${escape(food.name)} · +${fishNutrition(food)} 经验` : '喂食 · 背包里没有完整鱼', 'feed-parrot-fish', `data-id="${p.id}" ${food ? `data-fish="${food.uid}"` : ''} ${game.diving || !food || maxed ? 'disabled' : ''}`, 'small secondary')}${btn('¥3 训练 · 信任 +20', 'feed-parrot', `data-id="${p.id}" ${game.diving ? 'disabled' : ''}`, 'small ghost')}</div>` : '<p class="panel-note">伙伴永久离去，不能通过喂食复活。</p>'}</div>`;
    }).join('');
    html += btn('岸上放置诱饵，结识新鹦鹉 · ¥6', 'catch-parrot', game.diving ? 'disabled' : '', 'wide secondary');
    html += `<div class="section-caption">鱼类伙伴 · ${game.activeFish.length} 位准备出行</div>${s.aquarium.length ? fishPartnerCards(s.aquarium) : empty(s.aquariumLevel ? '先把完整捕获的活鱼放进鱼缸。' : '工具店购买鱼缸后，才能养鱼类伙伴。')}`;
  } else if (panel === 'techniques') {
    html = `<p class="panel-note">钓法不用单独付学费：在工具店花钱升级鱼竿，达到等级就自动解锁。鱼竿第一次升级到 Lv.1 花 ¥45，可解锁太极钓法和甘霖钓法。<br>按 T 打开手记，选择「装备」。空格抛竿，咬钩时再按空格；按住鼠标或空格收线，张力高时松开。遛鱼时按 E 使用当前钓法，降低张力并推进收线，冷却 3.5 秒；别松线太久。<br>当前鱼竿 Lv.${s.upgrades.rod} · 当前钓法：${TECHNIQUES[s.technique].name}</p>${btn('去工具店升级鱼竿', 'travel', 'data-place="tools"', 'secondary')}`;
    html += [...TECHNIQUES.entries()].reverse().map(([i, t]) => `<div class="item-row"><div class="item-image">${icon(s.upgrades.rod < t.level ? 'lock' : 'rod')}</div><div class="item-copy"><h3>${t.name}${i === 6 ? ' <span class="tag gold">最高</span>' : i === 5 ? ' <span class="tag gold">第二</span>' : ''}</h3><p>${t.description}<br>需要鱼竿 Lv.${t.level} · ${s.upgrades.rod < t.level ? '升级鱼竿后自动解锁' : '已掌握，免费切换'}</p></div>${btn(s.upgrades.rod < t.level ? '未解锁' : s.technique === i ? '已装备' : '装备', 'technique', `data-index="${i}" ${s.upgrades.rod < t.level || s.technique === i ? 'disabled' : ''}`, 'small secondary')}</div>`).join('');
  } else if (panel === 'catalog') {
    html = `<p class="panel-note">已记录 ${s.discovered.length} 种水生生物。各物种按不同权重出现，稀有物种没有必出保底，也不要求集齐。<br>当前原型收录 ${SPECIES.length} 类；全球鱼类内容需后续扩充。</p><div class="catalog-grid">${SPECIES.map(f => { const known = s.discovered.includes(f.id); return `<div class="catalog-card ${known ? '' : 'unknown'}"><div style="color:${known ? f.color : '#a4b19b'}">${icon(known ? 'fish' : 'lock')}</div><h3>${known ? f.name : '尚未发现'}</h3><p>${known ? `${f.rarity}<br>参考售价 ¥${money(f.value)}<br>${f.aggressive ? '会主动攻击' : '温和 / 躲避'}` : '某片海里，也许正有一个<br>还没与你相遇的生命。'}</p></div>`; }).join('')}</div>`;
  } else if (panel === 'help') {
    html = `<p class="panel-note">这是第一版可玩的风格化 3D 机制原型。先把你的玩法连成一段真实可玩的海边生活，后续再升级写实画面和内容规模。</p>${[
      '<strong>走动与视角</strong>：WASD 移动；右键拖动视角；滚轮缩放。底部地点按钮会带你自动走过去。',
      '<strong>岸上钓鱼</strong>：码头空格抛竿，咬钩再按空格；按住鼠标 / 空格收线，张力高时松开。E 使用钓法，T 查看钓法。',
      '<strong>出海与潜水</strong>：登船后 WASD 驾船，F 跳水。空格上浮，Ctrl 下潜。游到船旁、浮出水面后按 E 登船。',
      '<strong>水下捕猎</strong>：点击屏幕上的鱼，或按住鼠标连续攻击；Q 切换鱼叉和小刀。鱼叉升级能提高射速。',
      '<strong>氧气</strong>：初始 100%，每秒耗 1%。超载会按超载比例增加耗氧；被攻击直接扣氧。氧气归零会复活到船上。',
      '<strong>死亡与伙伴</strong>：死亡清空普通随身渔获，仓库不受影响，存活鱼伙伴返回鱼缸。已死的伙伴永远不会复活。',
      '<strong>买鱼缸</strong>：工具店先买鱼缸，活鱼带回小屋安置，之后能每天喂食、选为潜水伙伴。鱼缸里的鱼不会互相攻击。',
      '<strong>寿司</strong>：普通鱼卖 ¥3，一份寿司 ¥3。一条完整鱼也可以换三份寿司。早、中、晚按游戏时间各能用餐一次。',
      '<strong>经营与房子</strong>：仓库存鱼，开鱼铺获得零售收入；购买小屋、别墅、高楼。所有进度保存在当前浏览器。',
      '<strong>暂停与存档</strong>：Esc 暂停，I 背包，P 伙伴，H 隐藏界面。切到其他标签页自动暂停。潜水中查看背包不会暂停氧气。',
    ].map(t => `<div class="about-rule">${t}</div>`).join('')}<div class="footer-actions">${btn('手动保存', 'save', '', 'secondary')}${btn('重开航程', 'reset', '', 'ghost')}</div>`;
  }
  $('#panel-content').innerHTML = html;
}
function fishPartnerCards(fishes) {
  return fishes.map(f => `<div class="partner-card ${f.alive ? '' : 'dead'}"><header><div class="item-image" style="color:${SPECIES.find(s => s.id === f.species)?.color}">${icon('fish')}</div><div><h3>${escape(f.name)} · ${f.alive ? `Lv.${f.level}` : '永久离去'}</h3><small>${f.alive ? `生命 ${f.hp}/100 · ${f.deployed ? '准备陪你出行' : '在鱼缸里休息'}` : '不会复活，也不会因玩家复活而回来'}</small></div></header>${f.alive ? `<div class="progress ${f.hp < 30 ? 'red' : ''}"><i style="width:${f.hp}%"></i></div><div class="item-actions">${btn(f.deployed ? '召回鱼缸' : '带上这位伙伴', 'deploy', `data-id="${f.uid}"`, 'small secondary')}${btn(f.fedDay === game.s.day ? '今天吃饱了' : '¥1 喂食 · 成长', 'feed-fish', `data-id="${f.uid}" ${f.fedDay === game.s.day || game.diving ? 'disabled' : ''}`, 'small ghost')}</div>` : ''}</div>`).join('');
}

function travel(place) {
  closePanel();
  if (world.nearestPlace() === place && !game.diving && world.mode !== 'boat') { if (place !== 'pier') openPanel(place); return; }
  world.goTo(place, () => { if (place !== 'pier') openPanel(place); });
}
function primaryFish() {
  if (game.fishing?.phase === 'bite') game.hook();
  else if (!game.fishing) { if (world.nearestPlace() === 'pier' || world.mode === 'boat') game.startFishing(); else game.toast('先到码头或船上垂钓。'); }
}
ui.addEventListener('click', event => {
  const b = event.target.closest('button'); if (!b || b.disabled) return;
  startAudio();
  if (b.dataset.nav) { travel(b.dataset.nav); return; }
  const a = b.dataset.action, id = b.dataset.id;
  if (panelMeta[a]) { openPanel(a); return; }
  switch (a) {
    case 'close': closePanel(); break;
    case 'fish': primaryFish(); break;
    case 'hook': game.hook(); break;
    case 'cancel-fish': game.cancelFishing('已收回鱼线。'); break;
    case 'skill': game.techniquePulse(); break;
    case 'fishing-assist': game.toggleFishingAssist(); break;
    case 'boat': closePanel(); world.board(); break;
    case 'dive': closePanel(); world.dive(); break;
    case 'rise': world.rise(); break;
    case 'return': travel('pier'); break;
    case 'weapon': game.weapon = game.weapon === 'spear' ? 'knife' : 'spear'; contextKey = ''; break;
    case 'travel': travel(b.dataset.place); break;
    case 'upgrade': game.upgrade(b.dataset.key); break;
    case 'aquarium': game.buyAquarium(); break;
    case 'sell': game.sellAll(b.dataset.source); break;
    case 'store': game.storeAll(); break;
    case 'discard': game.discard(id); break;
    case 'eat': game.eat(); break;
    case 'exchange': game.exchangeSushi(id); break;
    case 'house-fish': game.houseFish(id, b.dataset.source); break;
    case 'house-rare': game.houseRareFish(); break;
    case 'deploy': game.deployFish(id); break;
    case 'feed-fish': if (!game.diving) game.feedFish(id); break;
    case 'feed-parrot': if (!game.diving) game.feedParrot(id); break;
    case 'feed-parrot-fish': game.feedParrotFish(id, b.dataset.fish); break;
    case 'sleep': game.sleepUntilMorning(); break;
    case 'leave-home': closePanel(); world.leaveHome(); break;
    case 'climb-home': if (world.climbHome()) openPanel('home'); break;
    case 'attack-wolf': world.attackWolf(); break;
    case 'catch-parrot': if (!game.diving) game.catchParrot(); break;
    case 'property': game.buyProperty(b.dataset.kind); break;
    case 'technique': game.setTechnique(Number(b.dataset.index)); break;
    case 'sound': game.s.sound = !game.s.sound; if (game.s.sound) startAudio(); else audio?.suspend(); game.toast(game.s.sound ? '海浪声已开启。' : '声音已关闭。'); persist(); break;
    case 'resume': paused = false; $('#pause').classList.add('hidden'); break;
    case 'save': persist(); game.toast('当前航程已保存到这台电脑的浏览器。', 'success'); break;
    case 'reset': if (confirm('重新开始会删除当前浏览器里的这份航程，确定吗？')) { localStorage.removeItem(SAVE_KEY); location.reload(); } break;
  }
});
ui.addEventListener('pointerdown', e => { if (e.target.closest('[data-action="reel"]')) { world.reeling = true; e.preventDefault(); } });
addEventListener('pointerup', () => { world.reeling = false; });
$('#overlay').addEventListener('click', e => { if (e.target.id === 'overlay') closePanel(); });

addEventListener('keydown', e => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.code === 'Escape') {
    if (panel) closePanel(); else { paused = !paused; $('#pause').classList.toggle('hidden', !paused); world.keys.clear(); world.pointerHeld = false; } return;
  }
  if (e.code === 'Tab' && panel) {
    const focusable = [...$('#overlay').querySelectorAll('button:not(:disabled)')]; if (focusable.length) {
      const i = focusable.indexOf(document.activeElement), next = (i + (e.shiftKey ? -1 : 1) + focusable.length) % focusable.length; focusable[next].focus(); e.preventDefault();
    } return;
  }
  if (paused || panel) return;
  world.keys.add(e.code); if (e.repeat) return;
  if (e.code === 'KeyI') openPanel('inventory');
  if (e.code === 'KeyP') openPanel('partners');
  if (e.code === 'KeyT') openPanel('techniques');
  if (e.code === 'KeyH') ui.style.visibility = ui.style.visibility === 'hidden' ? 'visible' : 'hidden';
  if (e.code === 'KeyQ' && game.diving) { game.weapon = game.weapon === 'spear' ? 'knife' : 'spear'; contextKey = ''; }
  if (e.code === 'KeyF' && !game.diving && (world.mode === 'boat' || world.nearestPlace() === 'pier')) world.dive();
  if (e.code === 'Space' && !game.diving) primaryFish();
  if (e.code === 'KeyE') {
    if (game.fishing?.phase === 'fight') game.techniquePulse();
    else if (game.fishing?.phase === 'bite') game.hook();
    else if (game.diving) world.board();
    else if (world.nearestPlace() && world.nearestPlace() !== 'pier') openPanel(world.nearestPlace());
  }
});
addEventListener('keyup', e => world.keys.delete(e.code));
addEventListener('blur', () => { world.keys.clear(); world.pointerHeld = false; world.reeling = false; });
document.addEventListener('visibilitychange', () => { if (document.hidden) { paused = true; $('#pause').classList.remove('hidden'); persist(); } });
addEventListener('pagehide', persist);

function renderContext() {
  const f = game.fishing, near = world.nearestPlace();
  const key = `${f?.phase || '-'}-${f?.assisted}-${world.mode}-${game.diving}-${near}-${game.weapon}-${game.s.technique}-${game.s.upstairs}-${game.wolvesActive}`;
  if (key === contextKey) return; contextKey = key;
  let html;
  if (game.s.upstairs) {
    $('#context').innerHTML = `<div class="context-heading">家中楼上 · 安全</div><p>鱼缸和家在一起。狼不会飞、不会爬梯子。</p><div class="context-actions">${btn('照顾鱼缸', 'home')}${game.isNight ? btn('休息到早上', 'sleep', '', 'secondary') : ''}${btn('下楼出门', 'leave-home', '', 'secondary')}</div>`;
    return;
  }
  if (f?.phase === 'waiting') html = `<div class="context-heading">${icon('rod')}浮漂在海面轻轻摇晃……</div><p>等待鱼咬钩。浮漂下沉时，按空格或点击提竿。</p><div class="context-actions">${btn('收回鱼线', 'cancel-fish', '', 'secondary')}${btn('查看钓法', 'techniques', '', 'secondary')}</div>`;
  else if (f?.phase === 'bite') html = `<div class="context-heading">${icon('fish')}有鱼咬钩了！</div><p>7 秒内按空格或点击提竿。提竿后默认辅助收线。</p><div class="context-actions">${btn('提竿！ <kbd class="key">空格</kbd>', 'hook')}</div>`;
  else if (f?.phase === 'fight') html = `<div class="context-heading">${icon('fish')}正在遛鱼 · ${f.species.name}</div><p>${f.assisted ? '辅助收线中：自动收线与卸力，按 E 可加快进度。' : '手动模式：按住收线，张力高时松开卸力。'}</p><div class="fishing-bars"><div><div class="bar-label"><span>鱼线张力</span><span id="tension-value">38%</span></div><div class="progress" id="tension-bar"><i id="tension-fill"></i></div></div><div><div class="bar-label"><span>收线进度</span><span id="progress-value">0%</span></div><div class="progress gold"><i id="progress-fill"></i></div></div></div><div class="context-actions">${btn(f.assisted ? '切换手动收线' : '开启辅助收线', 'fishing-assist', '', 'secondary')}${f.assisted ? '' : btn('按住收线', 'reel', '', 'reel-button')}${btn(`${TECHNIQUES[game.s.technique].name} <kbd class="key">E</kbd>`, 'skill', '', 'secondary')}</div>`;
  else if (game.diving) html = `<div class="context-heading">${icon('dive')}${game.submerged ? '海底探索' : '已浮出水面'} · ${game.weapon === 'spear' ? `鱼叉 Lv.${game.s.upgrades.spear}` : '潜水小刀'}</div><p>点击鱼捕猎 · 空格上浮 / Ctrl 下潜 · 船旁按 E 登船</p><div class="context-actions">${btn('自动上浮', 'rise')}${btn('切换武器 · Q', 'weapon', '', 'secondary')}${btn('登船', 'boat', '', 'secondary')}</div>`;
  else if (world.mode === 'boat') html = `<div class="context-heading">${icon('boat')}小船已准备好，去海里看看吧。</div><p>WASD 驾船 · F 跳入海里 · 出发前注意背包负重</p><div class="context-actions">${btn('跳入海里 <kbd class="key">F</kbd>', 'dive')}${btn('船上垂钓', 'fish', '', 'secondary')}${btn('回港', 'return', '', 'secondary')}</div>`;
  else if (near && near !== 'pier') html = `<div class="context-heading">${icon(PLACES[near].icon)}${PLACES[near].name}</div><p>${{ sushi: '一口寿司，换一段慢下来的时光。', tools: '下一片海，藏在下一件好装备里。', warehouse: '把这次航程的收获，安全地留在这里。', home: '给伙伴一个家，也给自己一个归处。' }[near]}</p><div class="context-actions">${btn(`进入 <kbd class="key">E</kbd>`, near)}${btn('回码头钓鱼', 'travel', 'data-place="pier"', 'secondary')}</div>`;
  else if (near === 'pier') html = `<div class="context-heading">${icon('rod')}今天的第一尾鱼，会是什么呢？</div><p>空格抛竿 · 咬钩时再按空格 · 按住鼠标收线</p><div class="context-actions">${btn('抛竿垂钓 <kbd class="key">空格</kbd>', 'fish')}${btn('登船出海', 'boat', '', 'secondary')}${btn('钓法', 'techniques', '', 'secondary')}</div>`;
  else html = `<div class="context-heading">${icon('wave')}沿着海风，慢慢走。</div><p>WASD 自由走动，或点击下方地点自动前往。</p><div class="context-actions">${btn('去码头钓鱼', 'travel', 'data-place="pier"')}${btn('查看背包', 'inventory', '', 'secondary')}</div>`;
  if (near === 'home') html += `<div class="context-actions">${btn('爬屋外梯子上楼', 'climb-home')}</div>`;
  if (game.wolvesActive) html += `<div class="context-actions">${btn('鱼叉攻击附近的狼', 'attack-wolf', '', 'secondary')}</div>`;
  $('#context').innerHTML = html; $('#context').classList.toggle('fighting', f?.phase === 'fight');
}
function updateHUD() {
  const s = game.s;
  $('#money').textContent = money(s.money); $('#day').textContent = `第 ${s.day} 天`;
  $('#clock').textContent = `${String(Math.floor(s.minute / 60)).padStart(2, '0')}:${String(Math.floor(s.minute % 60)).padStart(2, '0')}`;
  const nightLabel = $('#night-countdown');
  nightLabel.classList.toggle('hidden', !game.isNight);
  nightLabel.textContent = s.upstairs ? '楼上安全 · 狼不会爬梯子' : s.nightGrace > 0 ? `出狼锁门：${Math.ceil(s.nightGrace)} 秒 · 上梯子：${Math.ceil(s.ladderGrace)} 秒` : s.ladderGrace > 0 ? `房门已锁 · 屋外梯子还可用 ${Math.ceil(s.ladderGrace)} 秒` : '狼群追击 · 驾船或游泳逃到 06:00';
  const diving = game.diving;
  ui.classList.toggle('underwater', diving); $('#oxygen').classList.toggle('hidden', !diving); $('#oxygen').classList.toggle('low', s.oxygen < 30);
  $('#oxygen-value').textContent = `${Math.ceil(s.oxygen)}%`; $('#oxygen-fill').style.width = `${s.oxygen}%`;
  $('#oxygen-time').textContent = game.submerged ? `约 ${Math.floor(game.remainingSeconds)} 秒 · ×${game.loadFactor.toFixed(1)} 耗氧` : '已到水面 · 暂停耗氧';
  $('#oxygen-load').textContent = `${game.weight} / ${game.capacity} kg`; $('#depth').textContent = `水深 ${Math.max(0, -world.player.position.y).toFixed(1)} m`;
  const place = diving ? { name: '浅蓝海域', en: 'BELOW THE SURFACE' } : world.mode === 'boat' ? { name: '风栖近海', en: 'OUT ON THE OPEN SEA' } : PLACES[world.nearestPlace()] || { name: '风栖小镇', en: 'A SLOW LIFE BY THE SEA' };
  $('#place-name').textContent = place.name; $('#place-en').textContent = place.en;
  $('#place-description').textContent = diving ? '带着收获，也带着伙伴，平安回去。' : '浪声、海风，和还没写完的故事。';
  const aliveParrots = s.parrots.filter(p => p.alive && p.trust === 100).length;
  $('#companion-label').textContent = aliveParrots ? `${aliveParrots} 只鹦鹉 · ${game.activeFish.length} 位鱼伙伴` : '伙伴在等你';
  const stage = !s.totalCaught ? 0 : !s.totalEarned ? 1 : !s.aquariumLevel ? 2 : 3;
  const quests = [
    ['从一尾鱼，到整片海。', '海风正好。站在码头抛一竿，<br>从今天的第一尾鱼开始。', '钓起你的第一尾鱼'],
    ['把海里的故事带回来。', '背包里有了第一份收获。<br>去收购站卖鱼，攒下第一笔钱。', '前往「卖鱼入库」出售渔获'],
    ['给小伙伴，一个家。', '鱼缸需要 ¥48。继续捕鱼，<br>去工具店买下你的第一个鱼缸。', '购买鱼缸，开启鱼伙伴养成'],
    ['下一次，去更远的海。', '养伙伴、升级装备、开一家鱼铺。<br>从这里，把你的生活一点点变大。', s.shop ? '升级房子，继续积累财富' : '攒下 ¥350，开一家自己的鱼铺'],
  ];
  $('#quest-number').textContent = `0${stage + 1} / 04`; $('#quest-title').textContent = quests[stage][0]; $('#quest-desc').innerHTML = quests[stage][1]; $('#quest-task').textContent = quests[stage][2];
  document.querySelectorAll('.journey span').forEach((el, i) => el.classList.toggle('done', i < stage));
  document.querySelectorAll('.nav-button[data-nav]').forEach(el => el.classList.toggle('active', !diving && world.mode !== 'boat' && el.dataset.nav === world.nearestPlace()));
  const x = Math.max(6, Math.min(94, 9 + (world.player.position.x + 32) / 65 * 80)), z = Math.max(7, Math.min(94, 18 + (world.player.position.z + 18) / 44 * 74));
  $('#map-player').style.left = `${x}%`; $('#map-player').style.top = `${z}%`;
  renderContext();
  const f = game.fishing;
  if (f?.phase === 'fight' && $('#tension-fill')) {
    $('#tension-fill').style.width = `${Math.min(100, f.tension * 100)}%`; $('#tension-value').textContent = `${Math.round(f.tension * 100)}%`;
    $('#tension-bar').classList.toggle('red', f.tension > .75);
    $('#progress-fill').style.width = `${Math.min(100, f.progress * 100)}%`; $('#progress-value').textContent = `${Math.round(f.progress * 100)}%`;
  }
}

let previous = performance.now();
function frame(now) {
  const dt = Math.min((now - previous) / 1000, .1); previous = now;
  if (!paused && !document.hidden) {
    world.update(dt);
    game.tick(dt, { reel: !panel && (world.reeling || world.pointerHeld || world.keys.has('Space')), fishingPaused: Boolean(panel) });
  } else world.renderer.render(world.scene, world.camera);
  if (now - lastHud > 110) { updateHUD(); lastHud = now; }
  if (now - lastSave > 10000) { persist(); lastSave = now; }
  requestAnimationFrame(frame);
}
updateHUD(); requestAnimationFrame(frame);
setTimeout(() => $('#loading').classList.add('hidden'), 600);
// Read-only state inspection helps verify gameplay without shipping debug cheats.
window.tidebound = Object.freeze({ snapshot: () => structuredClone(game.s), status: () => ({ diving: game.diving, submerged: game.submerged, location: world.mode, fishing: game.fishing?.phase || null, weight: game.weight, capacity: game.capacity, drawCalls: world.renderer.info.render.calls }) });
