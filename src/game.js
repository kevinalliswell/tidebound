export const SAVE_KEY = 'tidebound-save-v1';
export const PARROT_MAX_LEVEL = 10;
const FISH_XP = { '常见': 20, '少见': 60, '珍稀': 150, '传说伙伴': 600, '庞然大物': 900 };
export const fishNutrition = fish => fish && !fish.bones ? FISH_XP[fish.rarity] || 20 : 0;
export function parrotCombat(parrot) {
  const level = Math.max(1, Math.min(PARROT_MAX_LEVEL, parrot.level || 1));
  return { level, damage: 3 + (level - 1) ** 2, maxWeight: 8 + (level - 1) ** 2 * 2, targets: 1 + Math.floor((level - 1) / 3) };
}
export const SPECIES = [
  { id: 'sardine', name: '沙丁鱼', value: 3, weight: .25, size: .48, color: '#82b5bd', rarity: '常见', chance: 34, aggressive: false },
  { id: 'mackerel', name: '青花鱼', value: 12, weight: .9, size: .75, color: '#4b9ba3', rarity: '常见', chance: 24, aggressive: false },
  { id: 'bream', name: '红海鲷', value: 36, weight: 1.8, size: .95, color: '#e69c8b', rarity: '常见', chance: 18, aggressive: false },
  { id: 'pompano', name: '金鲳鱼', value: 58, weight: 2.5, size: 1.1, color: '#e6c277', rarity: '少见', chance: 11, aggressive: false },
  { id: 'salmon', name: '大西洋鲑', value: 120, weight: 5, size: 1.4, color: '#ce9a9a', rarity: '少见', chance: 7, aggressive: false },
  { id: 'tuna', name: '蓝鳍金枪鱼', value: 880, weight: 24, size: 2.3, color: '#4f7c9a', rarity: '珍稀', chance: 2.5, aggressive: false },
  { id: 'ray', name: '蝠鲼', value: 1200, weight: 30, size: 2.8, color: '#527b84', rarity: '珍稀', chance: 1.4, aggressive: false, shape: 'ray' },
  { id: 'turtle', name: '绿海龟', value: 2200, weight: 35, size: 2.1, color: '#759c71', rarity: '珍稀', chance: .9, aggressive: false, shape: 'turtle' },
  { id: 'shark', name: '灰礁鲨', value: 1800, weight: 40, size: 3.1, color: '#7a9197', rarity: '珍稀', chance: .8, aggressive: true },
  { id: 'goldfish', name: '小金鱼', value: 25000, weight: 1.2, size: .85, color: '#f9b347', rarity: '传说伙伴', chance: .08, aggressive: false, power: 8 },
  { id: 'octopus', name: '深海巨章', value: 50000, weight: 95, size: 6, color: '#a67899', rarity: '庞然大物', chance: .08, aggressive: true, shape: 'octopus' },
  { id: 'swordfish', name: '破浪巨剑鱼', value: 70000, weight: 120, size: 7, color: '#648dba', rarity: '庞然大物', chance: .04, aggressive: true },
  { id: 'leviathan', name: '深蓝巨鲸', value: 100000, weight: 160, size: 10, color: '#4a788b', rarity: '庞然大物', chance: .015, aggressive: false },
];
export const TECHNIQUES = [
  { name: '卸力钓法', level: 0, description: '松开收线，更快降低张力。', power: 1, relief: 1.7 },
  { name: '太极钓法', level: 1, description: '顺势控鱼，平缓鱼线张力。', power: 1.15, relief: 1.4 },
  { name: '甘霖钓法', level: 1, description: '诱鱼入窝，缩短咬钩等待。', power: 1.2, relief: 1.2 },
  { name: '甩尾钓法', level: 2, description: '快速拉近距离，提高收线效率。', power: 1.5, relief: 1.1 },
  { name: '转鱼钓法', level: 3, description: '旋转竿身，兼顾控鱼与收线。', power: 1.65, relief: 1.6 },
  { name: '甩鱼法', level: 4, description: '排名第二，将巨物甩向岸边。', power: 2.2, relief: 1.55 },
  { name: '太极乾坤圈法', level: 5, description: '最高钓法。以圈卸力，乾坤控鱼。', power: 3, relief: 2.1 },
];
export const UPGRADES = {
  rod: { name: '鱼竿', base: 45, detail: '提高收线能力，解锁高阶钓法', max: 5 },
  spear: { name: '鱼叉', base: 60, detail: '增加威力与射速，最高每秒 11 次', max: 5 },
  oxygen: { name: '潜水氧气', base: 42, detail: '每级增加 40 秒基础续航', max: 5 },
  bag: { name: '防水背包', base: 35, detail: '每级增加 15 公斤承重', max: 6 },
  fins: { name: '脚蹼', base: 30, detail: '提高游泳和上浮速度', max: 4 },
};
const round = n => Math.round(n * 100) / 100;
let uid = 0;
export function makeCatch(species, { bones = false, alive = true, rng = Math.random } = {}) {
  const s = typeof species === 'string' ? SPECIES.find(f => f.id === species) : species;
  if (!s) throw new Error('Unknown species');
  const scale = s.id === 'sardine' ? 1 : .8 + rng() * .4;
  const wholeValue = round(s.value * scale);
  return { uid: `${Date.now()}-${++uid}-${Math.floor(rng() * 1e6)}`, species: s.id, name: s.name, weight: round(s.weight * scale * (bones ? .45 : 1)), wholeValue, value: bones ? round(wholeValue / 2) : wholeValue, bones, alive: alive && !bones, rarity: s.rarity };
}
export function freshState() {
  return {
    version: 1, money: 36, oxygen: 100, day: 1, minute: 500,
    upgrades: { rod: 0, spear: 0, oxygen: 0, bag: 0, fins: 0 },
    bag: [], warehouse: [], aquarium: [], aquariumLevel: 0,
    parrots: [
      { id: 'parrot-sun', name: '阿晴', trust: 100, alive: true, hp: 100, breath: 100, level: 1, xp: 0 },
      { id: 'parrot-leaf', name: '小芽', trust: 0, alive: true, hp: 100, breath: 100, level: 1, xp: 0 },
    ],
    sushi: 0, meals: {}, foodBuff: 0, shop: false, house: 0,
    discovered: [], totalCaught: 0, totalEarned: 0, deaths: 0,
    technique: 0, sound: true, upstairs: false, nightGrace: 0, ladderGrace: 0, wolvesDefeated: 0,
  };
}
export class Game {
  constructor(saved, rng = Math.random) {
    const d = freshState(); this.state = d;
    if (saved?.version === 1 && Number.isFinite(saved.money) && saved.money >= 0 && Array.isArray(saved.bag) && Array.isArray(saved.parrots)) {
      this.state = { ...d, ...saved, upgrades: { ...d.upgrades, ...saved.upgrades } };
      for (const key of ['warehouse', 'aquarium', 'discovered']) if (!Array.isArray(this.state[key])) this.state[key] = [];
    }
    this.state.parrots = this.state.parrots.map(p => ({ ...p, level: Math.max(1, Math.min(PARROT_MAX_LEVEL, Math.floor(p.level || 1))), xp: Math.max(0, Number(p.xp) || 0) }));
    if (saved && saved.nightGrace === undefined && this.isNight) this.state.nightGrace = 10;
    if (saved && saved.ladderGrace === undefined && this.isNight) this.state.ladderGrace = 30;
    this.rng = rng; this.listeners = new Set(); this.diving = false; this.submerged = false;
    this.fishing = null; this.weapon = 'spear'; this.shieldCooldown = 0;
  }
  get s() { return this.state; }
  get capacity() { return 20 + this.s.upgrades.bag * 15; }
  get weight() { return round(this.s.bag.reduce((a, f) => a + f.weight, 0)); }
  get loadFactor() { return Math.max(1, this.weight / this.capacity); }
  get oxygenDuration() { return 100 + this.s.upgrades.oxygen * 40; }
  get oxygenRate() { return 100 / this.oxygenDuration * this.loadFactor; }
  get remainingSeconds() { return this.s.oxygen / this.oxygenRate; }
  get activeFish() { return this.s.aquarium.filter(f => f.alive && f.deployed); }
  get activeParrots() { return this.s.parrots.filter(p => p.alive && p.trust >= 100 && p.breath > 0); }
  get aquariumCapacity() { return this.s.aquariumLevel * 3; }
  get timeOfDay() { return this.s.minute >= 1140 || this.s.minute < 360 ? 'night' : this.s.minute >= 1020 ? 'red-dusk' : 'day'; }
  get isNight() { return this.timeOfDay === 'night'; }
  get wolvesActive() { return this.isNight && this.s.nightGrace <= 0; }
  get mealSlot() { return this.s.minute < 660 ? '早餐' : this.s.minute < 1020 ? '午餐' : '晚餐'; }
  get mealKey() { return `${this.s.day}-${this.mealSlot}`; }
  on(fn) { this.listeners.add(fn); }
  emit(type, data = {}) { this.listeners.forEach(fn => fn({ type, ...data })); }
  toast(message, tone = 'info') { this.emit('toast', { message, tone }); }
  change() { this.emit('change'); }
  spend(amount) {
    if (this.s.money < amount) { this.toast('钱还不够，先带些鱼回来吧。', 'warning'); return false; }
    this.s.money = round(this.s.money - amount); return true;
  }
  sampleSpecies() {
    let roll = this.rng() * SPECIES.reduce((a, f) => a + f.chance, 0);
    return SPECIES.find(f => (roll -= f.chance) < 0) || SPECIES.at(-1);
  }
  collect(species, options = {}) {
    const fish = makeCatch(species, { rng: this.rng, ...options });
    this.s.bag.push(fish); this.s.totalCaught++;
    if (!this.s.discovered.includes(fish.species)) this.s.discovered.push(fish.species);
    this.toast(`${options.partner ? options.partner + ' 捕获了' : '获得'} ${fish.name}${fish.bones ? '·鱼骨' : ''} · ${fish.weight} kg`, 'success');
    if (this.loadFactor > 1) this.toast(`背包超载！耗氧 ×${this.loadFactor.toFixed(2)}，可在背包丢弃鱼减重。`, 'warning');
    this.emit('catch', { fish }); this.change(); return fish;
  }
  sellAll(source = 'bag') {
    const items = this.s[source];
    if (!Array.isArray(items) || !items.length) { this.toast('这里还没有可以出售的渔获。'); return 0; }
    const value = round(items.reduce((a, f) => a + f.value, 0)); const count = items.length;
    this.s[source] = []; this.s.money = round(this.s.money + value); this.s.totalEarned += value;
    this.toast(`卖出 ${count} 份渔获，收入 ¥${value.toLocaleString('zh-CN')}。`, 'success'); this.change(); return value;
  }
  storeAll() {
    if (!this.s.bag.length) return this.toast('背包是空的。');
    const count = this.s.bag.length; this.s.warehouse.push(...this.s.bag); this.s.bag = [];
    this.toast(`${count} 份渔获已安全入库，潜水死亡也不会丢失。`, 'success'); this.change();
  }
  discard(id) { this.s.bag = this.s.bag.filter(f => f.uid !== id); this.toast('已丢弃，背包重量已减轻。'); this.change(); }
  upgrade(key) {
    const spec = UPGRADES[key]; if (!spec) return false;
    const level = this.s.upgrades[key]; if (level >= spec.max || !this.spend(spec.base * (level + 1) ** 2)) return false;
    this.s.upgrades[key]++; this.toast(`${spec.name}升级到 Lv.${level + 1}！`, 'success'); this.change(); return true;
  }
  buyAquarium() {
    if (!this.spend(this.s.aquariumLevel === 0 ? 48 : this.s.aquariumLevel * 80)) return false;
    this.s.aquariumLevel++; this.toast(`鱼缸已就绪，可以安置 ${this.aquariumCapacity} 位鱼伙伴。`, 'success'); this.change(); return true;
  }
  housingBlockReason(fish) {
    if (!this.s.aquariumLevel) return '先去工具店购买鱼缸';
    if (fish?.bones) return '鱼骨不能养，请出售';
    if (!fish?.alive) return '已死亡，不能养；可出售或换寿司';
    if (this.s.aquarium.filter(f => f.alive).length >= this.aquariumCapacity) return '鱼缸已满，去工具店扩展';
    return '';
  }
  houseRareFish() {
    const candidates = this.s.bag.filter(f => f.alive && !f.bones && f.rarity !== '常见').sort((a, b) =>
      (SPECIES.find(s => s.id === a.species)?.chance ?? Infinity) - (SPECIES.find(s => s.id === b.species)?.chance ?? Infinity));
    let housed = 0; const before = this.s.money;
    for (const fish of candidates) {
      if (!this.s.aquariumLevel || this.s.aquarium.filter(f => f.alive).length >= this.aquariumCapacity) {
        if (!this.buyAquarium()) break;
      }
      if (this.houseFish(fish.uid)) housed++;
    }
    const dead = this.s.bag.filter(f => f.rarity !== '常见' && (!f.alive || f.bones)).length;
    this.toast(`已按稀有程度优先安置 ${housed} 条活鱼，扩缸花费 ¥${before - this.s.money}。${dead ? `另有 ${dead} 份已死亡渔获或鱼骨，不能养。` : ''}${housed < candidates.length ? '剩余活鱼仍在背包，游戏币不足以继续扩缸。' : ''}`);
    return { housed, spent: before - this.s.money, dead };
  }
  houseFish(id, source = 'bag') {
    if (!['bag', 'warehouse'].includes(source)) return false;
    const fish = this.s[source]?.find(f => f.uid === id);
    const reason = this.housingBlockReason(fish);
    if (reason) { this.toast(reason, 'warning'); return false; }
    this.s[source] = this.s[source].filter(f => f.uid !== id);
    this.s.aquarium.push({ ...fish, hp: 100, fedDay: 0, level: 1, deployed: false });
    this.toast(`${fish.name}住进了鱼缸，可以喂食和设为伙伴。`, 'success'); this.change(); return true;
  }
  deployFish(id) {
    if (!this.s.aquariumLevel) return false;
    const fish = this.s.aquarium.find(f => f.uid === id); if (!fish?.alive) return false;
    fish.deployed = !fish.deployed; this.toast(fish.deployed ? `${fish.name}将陪你潜水捕鱼。` : `${fish.name}已回到鱼缸。`); this.change(); return true;
  }
  feedFish(id) {
    const fish = this.s.aquarium.find(f => f.uid === id); if (!fish?.alive) return false;
    if (fish.fedDay === this.s.day) { this.toast('今天已经喂过了，明天再来吧。'); return false; }
    if (!this.spend(1)) return false;
    fish.fedDay = this.s.day; fish.level++; fish.hp = Math.min(100, fish.hp + 25);
    this.toast(`${fish.name}吃饱了！伙伴等级提升，生命恢复。`, 'success'); this.change(); return true;
  }
  feedParrot(id) {
    const p = this.s.parrots.find(p => p.id === id); if (!p?.alive || !this.spend(3)) return false;
    p.trust = Math.min(100, p.trust + 20); p.hp = Math.min(100, p.hp + 20);
    this.toast(`${p.name}信任值 ${p.trust}/100${p.trust === 100 ? '，愿意陪你下水了！' : '，继续喂食和训练吧。'}`, 'success'); this.change(); return true;
  }
  parrotFood() {
    return this.s.bag.filter(f => !f.bones).sort((a, b) => fishNutrition(a) - fishNutrition(b) || a.value - b.value)[0];
  }
  feedParrotFish(id, fishId) {
    const p = this.s.parrots.find(p => p.id === id);
    if (!p?.alive || this.diving) return false;
    if (p.level >= PARROT_MAX_LEVEL) { this.toast('已经满级，不再消耗鱼。'); return false; }
    const fish = fishId ? this.s.bag.find(f => f.uid === fishId) : this.parrotFood();
    if (!fish || fish.bones) { this.toast('背包里没有可以喂的完整鱼，先去捕鱼吧。'); return false; }
    this.s.bag = this.s.bag.filter(f => f.uid !== fish.uid);
    const xp = fishNutrition(fish); p.xp += xp;
    while (p.level < PARROT_MAX_LEVEL && p.xp >= p.level * 50) { p.xp -= p.level * 50; p.level++; }
    if (p.level === PARROT_MAX_LEVEL) p.xp = 0;
    p.trust = Math.min(100, p.trust + 20); p.hp = Math.min(100, p.hp + 25);
    this.toast(`${p.name}吃掉了${fish.name}，香喷喷！经验 +${xp}，现在 Lv.${p.level}${p.level === PARROT_MAX_LEVEL ? '，已满级，可击败海中巨物！' : ''}。`, 'success');
    this.change(); return true;
  }
  catchParrot() {
    if (!this.spend(6)) return false;
    if (this.rng() > .65) { this.toast('小鹦鹉吃了诱饵，又飞远了。'); this.change(); return false; }
    this.s.parrots.push({ id: `parrot-${Date.now()}`, name: `小翎${this.s.parrots.length - 1}`, trust: 0, alive: true, hp: 100, breath: 100, level: 1, xp: 0 });
    this.toast('结识了新的小鹦鹉！先喂食培养信任。', 'success'); this.change(); return true;
  }
  hurtPartner(id, damage) {
    const f = this.s.aquarium.find(f => f.uid === id); if (!f?.alive || !f.deployed) return;
    f.hp = Math.max(0, f.hp - damage);
    if (!f.hp) { f.alive = false; f.deployed = false; this.toast(`${f.name}在战斗中死去了，无法复活。`, 'danger'); }
    else if (f.hp <= 30) this.toast(`${f.name}受了重伤，打开伙伴面板召回它！`, 'warning');
    this.change();
  }
  eat() {
    if (this.s.meals[this.mealKey]) { this.toast(`今天的${this.mealSlot}已经吃过了。`); return false; }
    if (this.s.sushi > 0) this.s.sushi--; else if (!this.spend(3)) return false;
    this.s.meals[this.mealKey] = true; this.s.foodBuff = 180;
    this.toast(`${this.mealSlot}吃了寿司，接下来 3 分钟收线效率提高 20%。`, 'success'); this.change(); return true;
  }
  exchangeSushi(id) {
    const fish = this.s.bag.find(f => f.uid === id); if (!fish || fish.bones) return false;
    this.s.bag = this.s.bag.filter(f => f.uid !== id); this.s.sushi += 3;
    this.toast(`用一条${fish.name}换到了 3 份寿司。`, 'success'); this.change(); return true;
  }
  buyProperty(kind) {
    if (kind === 'shop') {
      if (this.s.shop || !this.spend(350)) return false;
      this.s.shop = true; this.toast('鱼铺开张！每天出售仓库最多 5 条鱼，获得 35% 零售加成。', 'success');
    } else {
      const costs = [500, 1800, 6000]; if (this.s.house >= 3 || !this.spend(costs[this.s.house])) return false;
      this.s.house++; this.toast(['', '买下了海边小屋。', '房子升级为海景别墅！', '海景高楼建成了！'][this.s.house], 'success');
    }
    this.change(); return true;
  }
  setTechnique(index) {
    const t = TECHNIQUES[index]; if (!t || this.s.upgrades.rod < t.level) { this.toast('先升级鱼竿，才能掌握这个钓法。'); return false; }
    this.s.technique = index; this.toast(`已切换：${t.name}`); this.change(); return true;
  }
  startFishing() {
    if (this.diving || this.fishing) return;
    this.fishing = { phase: 'waiting', time: 0, wait: (2.5 + this.rng() * 2.5) * (this.s.technique === 2 ? .6 : 1), species: this.sampleSpecies(), progress: 0, tension: .38, loose: 0, pulse: 0, seed: this.rng() * 10, assisted: true, assistReeling: true };
    this.emit('cast'); this.toast('鱼线入水了……留意浮漂，咬钩时按空格提竿。'); this.change();
  }
  hook() {
    if (this.fishing?.phase !== 'bite') return false;
    this.fishing.phase = 'fight'; this.fishing.time = 0; this.toast('咬住了！辅助收线已开启，会自动收线和卸力；按 E 施展钓法。', 'success'); this.emit('hook'); this.change(); return true;
  }
  toggleFishingAssist() {
    if (this.fishing?.phase !== 'fight') return;
    this.fishing.assisted = !this.fishing.assisted;
    this.toast(this.fishing.assisted ? '辅助收线开启，会自动控制张力。' : '已切换手动：按住鼠标或空格收线，张力高时松开。'); this.change();
  }
  techniquePulse() {
    if (this.fishing?.phase !== 'fight' || this.fishing.pulse > 0) return;
    const t = TECHNIQUES[this.s.technique]; this.fishing.tension = Math.max(.16, this.fishing.tension - .13 * t.relief);
    this.fishing.progress = Math.min(1, this.fishing.progress + .04 * t.power); this.fishing.pulse = 3.5;
    this.emit('skill'); this.toast(`${t.name} · 顺势控鱼`);
  }
  cancelFishing(message) { this.fishing = null; if (message) this.toast(message, 'warning'); this.change(); }
  startDive() {
    this.cancelFishing(); this.diving = true; this.submerged = true;
    this.s.parrots.forEach(p => { if (p.alive) p.breath = 100; });
    this.toast('空格上浮 / Ctrl 下潜，点击鱼捕猎，Q 切换鱼叉与小刀。'); this.change();
  }
  boardBoat() {
    this.diving = false; this.submerged = false; this.s.oxygen = 100;
    this.s.parrots.forEach(p => { if (p.alive) p.breath = 100; });
    this.toast('回到船上，氧气补满。可以回港卖鱼或入库。', 'success'); this.change();
  }
  takeAttack(damage) {
    if (!this.diving || !this.submerged) return;
    if (damage >= this.s.oxygen && this.shieldCooldown <= 0) {
      const p = this.activeParrots.find(p => p.hp > 0);
      if (p) {
        this.shieldCooldown = 20;
        p.hp = this.rng() < .35 ? 0 : Math.max(1, p.hp - 65);
        if (!p.hp) { p.alive = false; this.toast(`${p.name}替你挡住致命攻击，牺牲了，无法复活。`, 'danger'); }
        else { p.breath = 0; this.toast(`${p.name}替你挡下致命攻击，重伤返回船上！快上浮！`, 'warning'); }
        this.emit('shield'); this.change(); return;
      }
    }
    this.s.oxygen = Math.max(0, this.s.oxygen - damage); this.toast(`遭到攻击，氧气减少 ${damage}%！`, 'danger'); this.emit('hurt');
    if (!this.s.oxygen) this.die(); else this.change();
  }
  die() {
    const lost = this.s.bag.length; this.s.bag = []; this.s.oxygen = 100; this.s.deaths++;
    this.diving = false; this.submerged = false; this.fishing = null;
    this.s.aquarium.forEach(f => { f.deployed = false; });
    this.s.parrots.forEach(p => { if (p.alive) p.breath = 100; });
    this.s.upstairs = this.isNight;
    this.toast(`在${this.isNight ? '家中楼上' : '船上'}醒来，失去 ${lost} 份随身渔获。仓库保留，存活鱼伙伴已回到鱼缸。`, 'danger');
    this.emit('death', { lost }); this.change();
  }
  enterHome() {
    if (this.wolvesActive && !this.s.upstairs) { this.toast('门已锁死！狼会游泳，只能继续逃跑，等到早上开门。', 'danger'); return false; }
    this.cancelFishing(); this.diving = false; this.submerged = false; this.s.oxygen = 100; this.s.upstairs = true;
    this.change(); return true;
  }
  climbLadder() {
    if (this.isNight && this.s.ladderGrace <= 0 && !this.s.upstairs) { this.toast('已经超过 30 秒，狼群堵住了梯子！', 'danger'); return false; }
    this.cancelFishing(); this.diving = false; this.submerged = false; this.s.oxygen = 100; this.s.upstairs = true;
    this.toast('已沿屋外梯子上楼，鱼缸就在家里。狼不会飞，也不会爬梯子。', 'success'); this.change(); return true;
  }
  leaveHome() { this.s.upstairs = false; this.change(); }
  sleepUntilMorning() {
    if (!this.s.upstairs || !this.isNight) return false;
    // Advance through midnight normally so shop income and daily care reset once.
    while (this.isNight) this.tick(1);
    this.toast('早上 06:00，狼群散去，房门已打开。', 'success'); this.change(); return true;
  }
  tick(dt, { reel = false, fishingPaused = false } = {}) {
    if (!Number.isFinite(dt) || dt <= 0) return; dt = Math.min(dt, 1);
    const previousPeriod = this.timeOfDay;
    if (this.isNight && this.s.nightGrace > 0) {
      this.s.nightGrace = Math.max(0, this.s.nightGrace - dt);
      if (!this.s.nightGrace) { this.emit('wolves'); this.toast('狼群出没！房门锁死，狼会游泳；楼上安全。', 'danger'); this.change(); }
    }
    if (this.isNight && this.s.ladderGrace > 0) {
      this.s.ladderGrace = Math.max(0, this.s.ladderGrace - dt);
      if (!this.s.ladderGrace && !this.s.upstairs) this.toast('30 秒已到，狼群开始追击！驾船或游泳逃到天亮也能生还。', 'danger');
    }
    this.s.minute += dt * 2; this.s.foodBuff = Math.max(0, this.s.foodBuff - dt); this.shieldCooldown = Math.max(0, this.shieldCooldown - dt);
    if (this.s.minute >= 1440) {
      this.s.minute -= 1440; this.s.day++;
      if (this.s.shop) {
        const sold = this.s.warehouse.splice(0, 5); const revenue = round(sold.reduce((a, f) => a + f.value, 0) * 1.35);
        this.s.money = round(this.s.money + revenue); this.s.totalEarned += revenue;
        this.toast(`第 ${this.s.day} 天，鱼铺售出 ${sold.length} 份渔获，收入 ¥${revenue}。`, 'success');
      } else this.toast(`第 ${this.s.day} 天开始了，记得照顾伙伴和吃早餐。`);
      this.change();
    }
    if (previousPeriod !== this.timeOfDay) {
      if (this.timeOfDay === 'red-dusk') this.emit('time-warning', { message: '红昏到了 · 天色将暗，准备回家上楼。', tone: 'dusk' });
      else if (this.isNight) { this.s.nightGrace = 10; this.s.ladderGrace = 30; this.emit('time-warning', { message: '夜晚来临 · 10 秒后出狼锁门，30 秒内可沿屋外梯子上楼！', tone: 'night' }); }
      else { this.s.nightGrace = 0; this.s.ladderGrace = 0; this.toast('天亮了，狼群离开，房门重新打开。', 'success'); }
      this.change();
    }
    if (this.diving && this.submerged) {
      const before = this.s.oxygen; this.s.oxygen = Math.max(0, before - dt * this.oxygenRate);
      for (const p of this.activeParrots) p.breath = Math.max(0, p.breath - dt * .8);
      for (const n of [30, 15]) if (before > n && this.s.oxygen <= n) this.toast(`氧气仅剩 ${n}%！留出上浮时间。`, 'warning');
      if (!this.s.oxygen) { this.die(); return; }
    }
    const f = this.fishing; if (!f || fishingPaused) return; f.time += dt;
    if (f.phase === 'waiting' && f.time >= f.wait) { f.phase = 'bite'; f.time = 0; this.toast('浮漂下沉！按空格或点击提竿！', 'success'); this.emit('bite'); this.change(); }
    else if (f.phase === 'bite' && f.time > 7) this.cancelFishing('晚了一步，鱼游走了。浮漂下沉后有 7 秒，按空格或点提竿。');
    else if (f.phase === 'fight') {
      if (f.assisted) {
        if (f.tension >= .72) f.assistReeling = false;
        else if (f.tension <= .38) f.assistReeling = true;
        reel = f.assistReeling;
      }
      const t = TECHNIQUES[this.s.technique]; const resistance = Math.max(1, Math.log2(f.species.weight + 1) * .65);
      const struggle = (Math.sin(f.time * 3.2 + f.seed) + 1) * .055;
      f.tension = Math.max(.02, Math.min(1.05, f.tension + dt * (reel ? .12 + struggle - this.s.upgrades.rod * .012 : -.17 * t.relief)));
      if (reel) f.progress += dt * .17 * t.power * (1 + this.s.upgrades.rod * .3) * (this.s.foodBuff ? 1.2 : 1) / resistance;
      f.pulse = Math.max(0, f.pulse - dt); f.loose = f.tension < .07 ? f.loose + dt : 0;
      if (f.tension >= 1) this.cancelFishing('鱼线绷断！张力变红时松开收线，按 E 使用钓法卸力。');
      else if (f.loose >= 3) this.cancelFishing('鱼线松了太久，鱼脱钩了。');
      else if (f.progress >= 1) { this.fishing = null; this.collect(f.species, { bones: this.rng() < .16, alive: true }); }
    }
  }
  serialize() { return JSON.stringify(this.s); }
}
