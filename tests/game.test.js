import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, makeCatch, freshState, SPECIES, TECHNIQUES, parrotCombat } from '../src/game.js';

test('initial two parrots have 100 and 0 trust, no aquarium or shop', () => {
  const g = new Game();
  assert.deepEqual(g.s.parrots.map(p => p.trust), [100, 0]);
  assert.equal(g.s.aquariumLevel, 0); assert.equal(g.s.shop, false);
  assert.equal(g.activeParrots.length, 1);
});
test('100 percent oxygen lasts 100 seconds, surface stops consumption', () => {
  const g = new Game(); g.startDive();
  for (let i = 0; i < 99; i++) g.tick(1);
  assert.equal(g.s.oxygen, 1); assert.equal(g.s.deaths, 0);
  g.submerged = false; g.tick(1); assert.equal(g.s.oxygen, 1);
  g.submerged = true; g.tick(1); assert.equal(g.s.deaths, 1); assert.equal(g.s.oxygen, 100);
});
test('overload increases oxygen use, upgrade extends duration', () => {
  const g = new Game(); g.s.bag.push({ weight: 40 });
  assert.equal(g.oxygenRate, 2); g.s.upgrades.oxygen = 1;
  assert.equal(g.oxygenDuration, 140); assert.ok(g.oxygenRate < 2);
});
test('bones are exactly half the corresponding intact value, giants are valuable', () => {
  const giant = makeCatch('leviathan', { bones: true, rng: () => .5 });
  assert.equal(giant.wholeValue, 100000); assert.equal(giant.value, 50000);
  assert.equal(giant.alive, false); assert.equal(giant.bones, true);
  assert.equal(makeCatch('sardine').value, 3);
});
test('buy aquarium before keeping and deploying fish', () => {
  const g = new Game(); const fish = g.collect('bream');
  assert.equal(g.houseFish(fish.uid), false); g.s.money = 48;
  assert.equal(g.buyAquarium(), true); assert.equal(g.s.money, 0);
  assert.equal(g.houseFish(fish.uid), true); assert.equal(g.s.bag.length, 0);
  assert.equal(g.deployFish(fish.uid), true); assert.equal(g.activeFish.length, 1);
});
test('death loses backpack, preserves warehouse, returns living pets and never revives dead pets', () => {
  const g = new Game(); g.s.aquariumLevel = 1;
  const a = g.collect('bream'); g.houseFish(a.uid); g.deployFish(a.uid);
  const b = g.collect('mackerel'); g.houseFish(b.uid); g.deployFish(b.uid); g.hurtPartner(b.uid, 100);
  g.s.warehouse.push(makeCatch('tuna')); g.collect('sardine'); g.startDive(); g.die();
  assert.equal(g.s.bag.length, 0); assert.equal(g.s.warehouse.length, 1);
  assert.equal(g.s.aquarium.find(f => f.uid === a.uid).alive, true);
  assert.equal(g.s.aquarium.find(f => f.uid === b.uid).alive, false);
  assert.equal(g.activeFish.length, 0);
});
test('ordinary attacks remove oxygen and lethal hit can be intercepted by parrot', () => {
  const g = new Game(null, () => .5); g.startDive(); g.takeAttack(12); assert.equal(g.s.oxygen, 88);
  g.s.oxygen = 5; g.takeAttack(10); assert.equal(g.s.oxygen, 5); assert.equal(g.s.parrots[0].hp, 35);
  g.takeAttack(10); assert.equal(g.s.deaths, 1);
});
test('parrot sacrifice is permanent', () => {
  const g = new Game(null, () => .1); g.startDive(); g.s.oxygen = 1; g.takeAttack(10);
  assert.equal(g.s.parrots[0].alive, false); g.die(); assert.equal(g.s.parrots[0].alive, false);
});
test('one fish trades for three sushi, cash buys one, only one meal per time slot', () => {
  const g = new Game(); const f = g.collect('sardine'); g.exchangeSushi(f.uid);
  assert.equal(g.s.sushi, 3); assert.equal(g.s.bag.length, 0); assert.equal(g.eat(), true);
  assert.equal(g.s.sushi, 2); assert.equal(g.eat(), false);
  g.s.minute = 720; g.s.sushi = 0; const before = g.s.money; g.eat(); assert.equal(g.s.money, before - 3);
});
test('feeding trust unlocks diving exactly at 100', () => {
  const g = new Game(); g.s.money = 100;
  for (let i = 0; i < 4; i++) g.feedParrot('parrot-leaf');
  assert.equal(g.s.parrots[1].trust, 80); assert.equal(g.activeParrots.length, 1);
  g.feedParrot('parrot-leaf'); assert.equal(g.activeParrots.length, 2);
});
test('top two fishing techniques and equipment gating', () => {
  const g = new Game(); assert.equal(TECHNIQUES.at(-1).name, '太极乾坤圈法');
  assert.equal(TECHNIQUES.at(-2).name, '甩鱼法'); assert.equal(g.setTechnique(6), false);
  g.s.upgrades.rod = 5; assert.equal(g.setTechnique(6), true);
});
test('all registered species retain nonzero appearance probability', () => {
  assert.ok(SPECIES.every(f => f.chance > 0));
  assert.ok(SPECIES.some(f => f.shape === 'octopus')); assert.ok(SPECIES.some(f => f.shape === 'turtle'));
});
test('automatic shop income uses safe storage once per game day', () => {
  const g = new Game(); g.s.shop = true; g.s.minute = 1439; g.s.warehouse.push(makeCatch('sardine'));
  const before = g.s.money; g.tick(1);
  assert.equal(g.s.day, 2); assert.equal(g.s.warehouse.length, 0); assert.equal(g.s.money, before + 4.05);
});
test('progress reload preserves permanent death and ownership', () => {
  const g = new Game(); g.s.parrots[0].alive = false; g.s.aquariumLevel = 1;
  const loaded = new Game(JSON.parse(g.serialize())); assert.equal(loaded.s.parrots[0].alive, false);
  assert.equal(loaded.s.aquariumLevel, 1); assert.equal(loaded.diving, false);
  assert.equal(new Game({ version: 1, money: -10 }).s.money, freshState().money);
});

test('all live species including rare giants can enter aquariums from bag or warehouse', () => {
  for (const species of SPECIES) {
    for (const source of ['bag', 'warehouse']) {
      const g = new Game(); g.s.aquariumLevel = 1;
      const fish = makeCatch(species); g.s[source].push(fish);
      assert.equal(g.housingBlockReason(fish), '');
      assert.equal(g.houseFish(fish.uid, source), true, species.name);
      assert.equal(g.s[source].length, 0);
      assert.equal(g.s.aquarium[0].species, species.id);
    }
  }
});

test('aquarium explains dead fish, bones and full capacity without losing catches', () => {
  const g = new Game(); g.s.aquariumLevel = 1;
  for (const options of [{ alive: false }, { bones: true }]) {
    const fish = g.collect('tuna', options);
    assert.match(g.housingBlockReason(fish), /死亡|鱼骨/);
    assert.equal(g.houseFish(fish.uid), false);
    assert.ok(g.s.bag.includes(fish));
  }
  for (let i = 0; i < 3; i++) g.houseFish(g.collect('goldfish').uid);
  const fish = g.collect('leviathan');
  assert.match(g.housingBlockReason(fish), /已满/);
  assert.equal(g.houseFish(fish.uid), false);
  g.s.aquariumLevel++;
  assert.equal(g.houseFish(fish.uid), true);
});

test('first rod upgrade costs 45 and unlocks free Taiji selection and skill', () => {
  const g = new Game(); g.s.money = 45;
  assert.equal(g.setTechnique(1), false);
  assert.equal(g.upgrade('rod'), true);
  assert.equal(g.s.money, 0);
  assert.equal(g.setTechnique(1), true);
  assert.equal(g.s.money, 0);
  g.startFishing(); g.fishing.phase = 'bite'; g.hook();
  const tension = g.fishing.tension;
  g.techniquePulse(); assert.ok(g.fishing.tension < tension);
  assert.ok(g.fishing.progress > 0); assert.equal(g.fishing.pulse, 3.5);
});

test('assisted reeling lands every species without holding a button', () => {
  for (const species of SPECIES) {
    const g = new Game(null, () => .5);
    g.startFishing(); g.fishing.species = species; g.fishing.phase = 'bite'; g.hook();
    for (let i = 0; i < 1800 && g.fishing; i++) g.tick(.1);
    assert.equal(g.s.bag.length, 1, species.name);
    assert.equal(g.s.bag[0].species, species.id);
  }
});

test('menus freeze fishing, bite lasts seven seconds, manual mode still available', () => {
  const g = new Game(null, () => .5); g.startFishing();
  g.fishing.phase = 'bite'; g.fishing.time = 0;
  for (let i = 0; i < 20; i++) g.tick(1, { fishingPaused: true });
  assert.equal(g.fishing.time, 0);
  for (let i = 0; i < 6; i++) g.tick(1);
  assert.equal(g.hook(), true);
  g.toggleFishingAssist(); assert.equal(g.fishing.assisted, false);
  const progress = g.fishing.progress;
  g.tick(.1, { reel: true }); assert.ok(g.fishing.progress > progress);
  g.cancelFishing(); g.startFishing(); g.fishing.phase = 'bite'; g.fishing.time = 0;
  for (let i = 0; i < 8; i++) g.tick(1);
  assert.equal(g.fishing, null);
});

test('rare housing prioritizes lowest encounter chance and buys capacity without consuming common or dead fish', () => {
  const g = new Game(); g.s.money = 10000;
  for (const id of ['pompano', 'salmon', 'tuna', 'leviathan', 'goldfish']) g.collect(id);
  const common = g.collect('sardine'), dead = g.collect('octopus', { alive: false });
  const result = g.houseRareFish();
  assert.equal(result.housed, 5); assert.equal(result.spent, 128);
  assert.equal(g.s.aquarium[0].species, 'leviathan');
  assert.deepEqual(g.s.bag.map(f => f.uid), [common.uid, dead.uid]);
});

test('fish feeding consumes lowest nutrition first, levels birds, preserves tank fish and dead birds', () => {
  const g = new Game(); const p = g.s.parrots[0];
  g.collect('goldfish'); const common = g.collect('sardine');
  assert.equal(g.parrotFood().uid, common.uid);
  assert.equal(g.feedParrotFish(p.id), true); assert.equal(p.xp, 20);
  assert.equal(g.s.bag.length, 1);
  for (let i = 0; i < 4; i++) { const f = g.collect('octopus'); g.feedParrotFish(p.id, f.uid); }
  assert.equal(p.level, 10);
  assert.ok(parrotCombat(p).damage >= 80); assert.ok(parrotCombat(p).maxWeight >= 160);
  const count = g.s.bag.length; assert.equal(g.feedParrotFish(p.id), false); assert.equal(g.s.bag.length, count);
  g.s.parrots[1].alive = false; assert.equal(g.feedParrotFish(g.s.parrots[1].id), false);
  assert.equal(new Game(JSON.parse(g.serialize())).s.parrots[0].level, 10);
});

test('night warns once, wolves appear after 10 seconds, ladder stays available until 30, survivors can reach dawn', () => {
  const g = new Game(); const warnings = []; g.on(e => { if (e.type === 'time-warning') warnings.push(e); });
  g.s.minute = 1019; g.tick(1); assert.equal(warnings[0].tone, 'dusk');
  g.s.minute = 1139; g.tick(1); assert.equal(g.s.nightGrace, 10); assert.equal(g.s.ladderGrace, 30);
  for (let i = 0; i < 10; i++) g.tick(1);
  assert.equal(g.wolvesActive, true); assert.equal(g.enterHome(), false);
  assert.equal(g.climbLadder(), true); g.leaveHome();
  for (let i = 0; i < 20; i++) g.tick(1);
  assert.equal(g.climbLadder(), false); assert.equal(g.s.deaths, 0);
  g.s.minute = 359; g.tick(1); assert.equal(g.wolvesActive, false);
  assert.equal(g.enterHome(), true); assert.equal(warnings.length, 2);
});
