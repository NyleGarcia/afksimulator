/* AFK Simulator rogue mode content (boons, relics, curses, events, bosses, loadouts, ascensions, synergies).
 * Registers on window.AFK_CONTENT.rogue. Effects use the shared vocabulary (AFK_RESOLVED.effectDefs); see CONTENT.md.
 * Rarity budgets: common pointMult<=1.10 susMult>=0.93 charges<=1/key; rare <=1.20 >=0.85 charges<=2; legendary <=1.40 >=0.75 charges<=3.
 * unlock.tokens: 0 = available from the start, n = Archive cost in rogue tokens.
 */
(function () {
  'use strict';

  // boon(id, name, icon, rarity, tags, desc, effects, extra)
  function boon(id, name, icon, rarity, tags, desc, effects, extra) {
    var b = { id: id, name: name, icon: icon, rarity: rarity, tags: tags, desc: desc, effects: effects, max: 1, weight: 1, acts: [1, 2, 3], unlock: { tokens: 0 } };
    if (extra) Object.keys(extra).forEach(function (k) { b[k] = extra[k]; });
    return b;
  }
  var U15 = { unlock: { tokens: 15 } }, U30 = { unlock: { tokens: 30 } }, U60 = { unlock: { tokens: 60 } };
  function ex(o, p) { var r = {}; Object.keys(o).forEach(function (k) { r[k] = o[k]; }); Object.keys(p).forEach(function (k) { r[k] = p[k]; }); return r; }

  var boons = [
    // ---------- common (20) ----------
    boon('caffeine-drip', 'Caffeine Drip', '☕', 'common', ['points'], 'IV coffee. Points x1.06.', { pointMult: 1.06 }),
    boon('noise-gate', 'Noise Gate', '🎚️', 'common', ['mic'], 'Fewer hot-mic accidents (x0.75).', { micEventChance: 0.75 }),
    boon('sticky-note', 'Sticky Note', '🗒️', 'common', ['excuse'], 'A note reading "say the dog". Excuses +6.', { excuseBonus: 6 }),
    boon('quiet-keys', 'Quiet Keys', '⌨️', 'common', ['sus'], 'Membrane switches. Suspicion x0.95.', { susMult: 0.95 }),
    boon('snooze-button', 'Snooze Button', '⏰', 'common', ['sus'], '+1 grace minute and suspicion drops 2 each round.', { graceMins: 1, susFlatPerRound: -2 }),
    boon('loose-change', 'Loose Change', '🪙', 'common', ['gold'], 'Couch cushion gold. Gold x1.15.', { goldMult: 1.15 }),
    boon('notification-badge', 'Notification Badge', '🔴', 'common', ['ping'], 'Triage lasts 20% longer and 1 ping is auto-forgiven.', { triageTime: 1.2, pingShield: 1 }),
    boon('streak-shield', 'Streak Shield', '🔥', 'common', ['combo'], 'Your combo survives one reset. Can stack to 2.', { comboKeep: 1 }, { max: 2 }),
    boon('spare-charger', 'Spare Charger', '🔌', 'common', ['points'], 'The laptop never dies. +0.8 pts per minute.', { pointFlatPerMin: 0.8 }),
    boon('mod-friend', 'Mod Friend', '🛡️', 'common', ['drag', 'sus'], 'One mod owes you a favor. Drag chance x0.85.', { dragChanceMult: 0.85 }),
    boon('clipboard-excuses', 'Clipboard of Excuses', '📋', 'common', ['excuse'], 'A free reroll when an excuse roll goes bad.', { excuseReroll: 1 }),
    boon('hype-playlist', 'Hype Playlist', '🎵', 'common', ['mic', 'points'], 'Points x1.04, mic accidents +15%. It is VERY loud.', { pointMult: 1.04, micEventChance: 1.15 }),
    boon('lanyard', 'Lanyard of Legitimacy', '🪪', 'common', ['sus'], 'You look like you work here. Suspicion x0.96.', { susMult: 0.96 }),
    boon('coaster-stack', 'Coaster Stack', '🥤', 'common', ['points'], '+1 grace minute and +0.4 pts per minute.', { graceMins: 1, pointFlatPerMin: 0.4 }),
    boon('pocket-lint', 'Pocket Lint', '🧶', 'common', ['gold'], 'Gold x1.1 and a few coins on pickup.', { goldMult: 1.1 }, { instant: { gold: 6 } }),
    boon('ringer-off', 'Ringer Off', '📵', 'common', ['ping', 'drag'], 'Drag chance x0.9 and 1 ping auto-forgiven.', { dragChanceMult: 0.9, pingShield: 1 }),
    boon('habit-tracker', 'Habit Tracker', '✅', 'common', ['combo', 'points'], 'Points x1.02 and a combo shield. Stack to 2.', { pointMult: 1.02, comboKeep: 1 }, { max: 2 }),
    boon('voice-changer', 'Voice Changer', '🗣️', 'common', ['mic', 'excuse'], 'Mic accidents x0.85, excuses +3.', { micEventChance: 0.85, excuseBonus: 3 }),
    boon('cheat-sheet', 'Triage Cheat Sheet', '📄', 'common', ['ping'], 'Triage lasts 25% longer.', { triageTime: 1.25 }),
    boon('tip-jar', 'Tip Jar', '🫙', 'common', ['gold'], 'Gold x1.1 and +0.3 pts per minute.', { goldMult: 1.1, pointFlatPerMin: 0.3 }),

    // ---------- rare (21) ----------
    boon('cold-brew-iv', 'Cold Brew IV', '🧊', 'rare', ['points', 'gamble'], 'Points x1.12, suspicion x1.05. Worth it.', { pointMult: 1.12, susMult: 1.05 }),
    boon('ghost-protocol', 'Ghost Protocol', '👻', 'rare', ['sus', 'drag'], 'Friends lose your trail. Suspicion x0.88, drag chance x0.7.', { susMult: 0.88, dragChanceMult: 0.7 }),
    boon('alt-account-login', 'Alt Account Login', '👤', 'rare', ['sus'], 'Get kicked once and rejoin at 55% suspicion instead.', { secondWind: 1, secondWindSus: 55 }),
    boon('reply-all-macro', 'Reply-All Macro', '📨', 'rare', ['ability', 'ping'], '2 charges: answers every owed ping at once.', { abPingBomb: 2 }),
    boon('sound-board', 'Sound Board', '🔊', 'rare', ['mic', 'points'], 'Mic accidents x1.4, clips pay x1.5. Chaos is currency.', { micEventChance: 1.4, clipBonusMult: 1.5 }),
    boon('liars-ledger', "Liar's Ledger", '📒', 'rare', ['excuse', 'points'], 'Lie bonus x1.5. Keep the stories straight.', { lieBonusMult: 1.5 }),
    boon('combo-engine', 'Combo Engine', '⚙️', 'rare', ['combo'], 'A combo shield and +0.5 pts per minute.', { comboKeep: 1, pointFlatPerMin: 0.5 }),
    boon('diplomats-tongue', "Diplomat's Tongue", '🕊️', 'rare', ['excuse'], 'Excuses +10 and a free reroll.', { excuseBonus: 10, excuseReroll: 1 }),
    boon('stock-options', 'Stock Options', '📈', 'rare', ['gold'], 'Gold x1.3 and tokens x1.15.', { goldMult: 1.3, tokenMult: 1.15 }),
    boon('panic-button-boon', 'Big Red Button', '🚨', 'rare', ['ability', 'excuse'], '2 charges of a guaranteed excuse.', { abFakeInternet: 2 }),
    boon('mute-hammer-boon', 'Mute Hammer Mk II', '🔨', 'rare', ['ability', 'mic'], '2 mic-silencing charges, mic accidents x0.7.', { abMuteHammer: 2, micEventChance: 0.7 }),
    boon('decoy-network', 'Decoy Network', '🕸️', 'rare', ['ability', 'sus'], '2 decoy charges and suspicion drops 3 each round.', { abDecoy: 2, susFlatPerRound: -3 }),
    boon('burner-phone', 'Burner Phone', '📱', 'rare', ['ability'], 'One charge each of the guaranteed excuse and the decoy.', { abFakeInternet: 1, abDecoy: 1 }),
    boon('loyalty-card', 'Loyalty Card', '💳', 'rare', ['gold'], 'Gold x1.2 and tokens x1.1.', { goldMult: 1.2, tokenMult: 1.1 }, U30),
    boon('shift-swap', 'Shift Swap', '🔄', 'rare', ['sus'], 'Suspicion drops 4 each round, +1 grace minute.', { susFlatPerRound: -4, graceMins: 1 }, U30),
    boon('chain-mail', 'Chain Mail', '⛓️', 'rare', ['combo'], 'Combo shield x2. The chain does not break.', { comboKeep: 2 }, U30),
    boon('ghostwriter', 'Ghostwriter', '✍️', 'rare', ['excuse'], 'Excuses +14 and a free reroll.', { excuseBonus: 14, excuseReroll: 1 }, U30),
    boon('static-noise', 'Static Noise', '📻', 'rare', ['mic', 'sus'], 'Mic accidents x0.5, suspicion x0.93.', { micEventChance: 0.5, susMult: 0.93 }, U30),
    boon('greenroom', 'Greenroom', '🛋️', 'rare', ['points'], 'Points x1.10 and +0.6 pts per minute.', { pointMult: 1.10, pointFlatPerMin: 0.6 }, U30),
    boon('bait-and-switch', 'Bait and Switch', '🎣', 'rare', ['ability', 'drag'], 'A decoy and a mute hammer, drag chance x0.85.', { abDecoy: 1, abMuteHammer: 1, dragChanceMult: 0.85 }, U30),
    boon('silent-partner', 'Silent Partner', '🤫', 'rare', ['ping'], '2 pings auto-forgiven and triage lasts 20% longer.', { pingShield: 2, triageTime: 1.2 }, U30),

    // ---------- legendary (11) ----------
    boon('phoenix', 'Phoenix', '🐦‍🔥', 'legendary', ['sus'], 'Two kicks forgiven. You come back at 40% suspicion.', { secondWind: 2, secondWindSus: 40 }, ex(U60, { acts: [2, 3] })),
    boon('time-dilation', 'Time Dilation', '⏳', 'legendary', ['points'], '+5 grace minutes and points x1.10.', { graceMins: 5, pointMult: 1.10 }, U60),
    boon('the-long-con', 'The Long Con', '🎩', 'legendary', ['points', 'gamble'], 'Points x1.25, lie bonus x2, but friends drag you out 30% more.', { pointMult: 1.25, lieBonusMult: 2.0, dragChanceMult: 1.3 }, U60),
    boon('omniscient-mod', 'Omniscient Mod', '👁️', 'legendary', ['sus', 'ping'], 'Suspicion x0.80, 3 pings forgiven, triage lasts 50% longer.', { susMult: 0.80, pingShield: 3, triageTime: 1.5 }, ex(U60, { acts: [2, 3] })),
    boon('tipping-point', 'Tipping Point', '⚖️', 'legendary', ['combo'], 'Combos start at x2 and survive one reset.', { comboStartBonus: 1, comboKeep: 1 }, U60),
    boon('gold-rush', 'Gold Rush', '🏆', 'legendary', ['gold', 'points'], 'Gold x1.75 and +2 pts per minute.', { goldMult: 1.75, pointFlatPerMin: 2 }, U60),
    boon('infinite-loop', 'Infinite Loop', '♾️', 'legendary', ['combo', 'points'], 'Points x1.15, 2 combo shields, combos start at x2.', { pointMult: 1.15, comboKeep: 2, comboStartBonus: 1 }, ex(U60, { acts: [2, 3] })),
    boon('perfect-alibi', 'Perfect Alibi', '🔏', 'legendary', ['excuse'], 'Excuses +20, 2 rerolls, lie bonus x1.5.', { excuseBonus: 20, excuseReroll: 2, lieBonusMult: 1.5 }, U60),
    boon('witness-protection', 'Witness Protection', '🕶️', 'legendary', ['sus', 'drag'], 'Suspicion x0.8, drag chance x0.76.', { susMult: 0.8, dragChanceMult: 0.76 }, ex(U60, { acts: [2, 3] })),
    boon('gadget-belt', 'Gadget Belt', '🧰', 'legendary', ['ability'], '2 charges of every ability.', { abFakeInternet: 2, abMuteHammer: 2, abDecoy: 2, abPingBomb: 2 }, ex(U60, { acts: [2, 3] })),
    boon('hot-mic-legend', 'Hot Mic Legend', '🎙️', 'legendary', ['mic', 'points'], 'Mic accidents x2, clips pay x2.5, points x1.10.', { micEventChance: 2, clipBonusMult: 2.5, pointMult: 1.10 }, U60)
  ];

  // Costs for the Archive: commons that are not free use U15 (none here), rares U30, legendaries U60.
  // Make the second half of the commons cost 15 so the Archive has something cheap to buy.
  ['lanyard', 'coaster-stack', 'pocket-lint', 'ringer-off', 'habit-tracker', 'voice-changer', 'cheat-sheet', 'tip-jar'].forEach(function (id) {
    boons.forEach(function (b) { if (b.id === id) b.unlock = { tokens: U15.unlock.tokens }; });
  });

  var relics = [
    { id: 'leaders-ring', name: "Leader's Ring", icon: '💍', tags: ['sus'], desc: 'Suspicion x0.9 and +2 grace minutes.', effects: { susMult: 0.9, graceMins: 2 }, unlock: { tokens: 0 } },
    { id: 'golden-mouse', name: 'Golden Mouse', icon: '🖱️', tags: ['points'], desc: 'Points x1.15.', effects: { pointMult: 1.15 }, unlock: { tokens: 0 } },
    { id: 'server-key', name: 'Server Key', icon: '🗝️', tags: ['drag'], desc: 'Drag chance x0.62. You own the admin panel.', effects: { dragChanceMult: 0.62 }, unlock: { tokens: 0 } },
    { id: 'hazard-tape', name: 'Hazard Tape', icon: '🚧', tags: ['sus'], desc: 'Suspicion x0.8, but only in boss rounds.', effects: { susMult: 0.8 }, when: { roundType: 'boss' }, unlock: { tokens: 0 } },
    { id: 'black-box', name: 'Black Box', icon: '📦', tags: ['sus', 'gold'], desc: 'A kick is forgiven (back at 50%) and +20 gold on pickup.', effects: { secondWind: 1, secondWindSus: 50 }, instant: { gold: 20 }, unlock: { tokens: 0 } },
    { id: 'lucky-coin', name: 'Lucky Coin', icon: '🪙', tags: ['gold'], desc: 'Gold x1.5.', effects: { goldMult: 1.5 }, unlock: { tokens: 0 } },
    { id: 'ancient-headset', name: 'Ancient Headset', icon: '🎧', tags: ['mic', 'sus'], desc: 'Mic accidents x0.3, suspicion x0.95.', effects: { micEventChance: 0.3, susMult: 0.95 }, unlock: { tokens: 40 } },
    { id: 'vault-of-excuses', name: 'Vault of Excuses', icon: '🏛️', tags: ['excuse'], desc: '2 excuse rerolls and excuses +12.', effects: { excuseReroll: 2, excuseBonus: 12 }, unlock: { tokens: 40 } },
    { id: 'combo-crown', name: 'Combo Crown', icon: '👑', tags: ['combo'], desc: 'Combos start at x2.', effects: { comboStartBonus: 1 }, unlock: { tokens: 40 } },
    { id: 'snooze-crystal', name: 'Snooze Crystal', icon: '💎', tags: ['sus'], desc: 'Suspicion drops 5 every round.', effects: { susFlatPerRound: -5 }, unlock: { tokens: 40 } },
    { id: 'pager', name: 'Pager', icon: '📟', tags: ['ping'], desc: '3 pings forgiven and triage lasts 30% longer.', effects: { pingShield: 3, triageTime: 1.3 }, unlock: { tokens: 40 } },
    { id: 'devs-keyboard', name: "Dev's Keyboard", icon: '⌨️', tags: ['ability', 'points'], desc: '+1 charge of every ability and +1 pt per minute.', effects: { abFakeInternet: 1, abMuteHammer: 1, abDecoy: 1, abPingBomb: 1, pointFlatPerMin: 1 }, unlock: { tokens: 40 } },
    { id: 'salvage-drone', name: 'Salvage Drone', icon: '🛸', tags: ['gold', 'points'], desc: 'Gold x1.25 and +1 pt per minute.', effects: { goldMult: 1.25, pointFlatPerMin: 1 }, unlock: { tokens: 40 } },
    { id: 'panic-room', name: 'Panic Room', icon: '🚪', tags: ['sus'], desc: 'In boss rounds a kick is forgiven (back at 45%).', effects: { secondWind: 1, secondWindSus: 45 }, when: { roundType: 'boss' }, unlock: { tokens: 40 } }
  ];

  var curses = [
    { id: 'heavy-sleeper', name: 'Heavy Sleeper', icon: '😴', desc: 'Suspicion x1.15 until the end of this act.', duration: 'act', effects: { susMult: 1.15 }, payout: { gold: 30, boonRarity: 'rare' } },
    { id: 'snitch', name: 'Snitch', icon: '🐀', desc: 'Mic accidents x2 and drag chance x1.5 until the end of this act.', duration: 'act', effects: { micEventChance: 2, dragChanceMult: 1.5 }, payout: { boonRarity: 'rare', gold: 20 } },
    { id: 'butter-fingers', name: 'Butter Fingers', icon: '🧈', desc: 'Excuses -10 until the end of this act.', duration: 'act', effects: { excuseBonus: -10 }, payout: { gold: 20, relicReroll: 1 } },
    { id: 'tight-leash', name: 'Tight Leash', icon: '🐕', desc: 'No grace minutes (-3) for this round. Cleared, it pays points x1.25 for the act.', duration: 'round', effects: { graceMins: -3 }, payout: { gold: 25, effects: { pointMult: 1.25 }, effectsDuration: 'act' } },
    { id: 'glass-cannon', name: 'Glass Cannon', icon: '💥', desc: 'Points x1.4, suspicion x1.3 for this round.', duration: 'round', effects: { pointMult: 1.4, susMult: 1.3 }, payout: { gold: 25 } },
    { id: 'haunted-headset', name: 'Haunted Headset', icon: '👻', desc: 'Mic accidents x2 and clips pay x2 for this round.', duration: 'round', effects: { micEventChance: 2, clipBonusMult: 2 }, payout: { gold: 20, boonRarity: 'legendary', boonChance: 0.25 } },
    { id: 'loan-shark', name: 'Loan Shark', icon: '🦈', desc: 'Suspicion creeps up 1 per round and shop prices are x1.3 for the rest of the run. Clearing the elite offers one legendary boon.', duration: 'run', effects: { susFlatPerRound: 1 }, shopPriceMult: 1.3, payout: { boonRarity: 'legendary', gold: 0 } },
    { id: 'notification-hell', name: 'Notification Hell', icon: '🔔', desc: 'Triage lasts 35% less time until the end of this act. Cleared, you gain an alt.', duration: 'act', effects: { triageTime: 0.65 }, payout: { alts: 1 } },
    { id: 'sleep-deprived', name: 'Sleep Deprived', icon: '🥱', desc: 'Triage lasts 20% less and excuses are -6 until the end of this act.', duration: 'act', effects: { triageTime: 0.8, excuseBonus: -6 }, payout: { gold: 28, boonRarity: 'rare' } },
    { id: 'static-cling', name: 'Static Cling', icon: '⚡', desc: 'Points x0.85 and drag chance x1.4 until the end of this act.', duration: 'act', effects: { pointMult: 0.85, dragChanceMult: 1.4 }, payout: { gold: 35, boonRarity: 'rare' } }
  ];

  function ev(id, title, icon, acts, text, choices, weight) { return { id: id, title: title, icon: icon, acts: acts, weight: weight || 1, text: text, choices: choices }; }
  function ch(label, hint, outcomes, extra) { var c = { label: label, hint: hint, outcomes: outcomes }; if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; }); return c; }
  function oc(w, text, extra) { var o = { w: w, text: text }; if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; }); return o; }

  var events = [
    ev('vending-machine', 'The Vending Machine', '🥤', [1, 2, 3], 'A vending machine hums in the hallway of your life. It wants 1 gold.', [
      ch('Insert coin', 'safe snack', [oc(1, 'Chips fall. You feel calmer.', { instant: { sus: -12 } })], { cost: { gold: 1 } }),
      ch('Kick it', 'risky', [oc(6, 'Two bags fall out.', { instant: { gold: 6 } }), oc(4, 'A mod saw that.', { instant: { sus: 10 } })]),
      ch('Walk away', 'discipline', [oc(1, 'Discipline. Nothing happens.', { instant: {} })])
    ]),
    ev('mod-dm', 'A DM From a Mod', '📨', [1, 2, 3], '"hey, got a sec?" The mod typed it, deleted it, and typed it again.', [
      ch('Reply right away', 'honesty', [oc(3, 'They just wanted a clip. Easy.', { instant: { sus: -8 } }), oc(2, 'It was a warning. You nod a lot.', { instant: { sus: 6 } })]),
      ch('Read, do not reply', 'left on read', [oc(1, 'They respect the silence. Weirdly.', { instant: { gold: 8 } })]),
      ch('Bribe them with gold', 'costs 10 gold', [oc(1, 'The mod now "forgets" your name.', { instant: { sus: -20 } })], { cost: { gold: 10 } })
    ]),
    ev('roommate-wifi', "Roommate's Wi-Fi", '📶', [1, 2], 'Your roommate "borrowed" the router again. The lag is physical.', [
      ch('Unplug their PC', 'petty', [oc(5, 'Peace. You feel powerful.', { instant: { sus: -10 } }), oc(2, 'They plug it back in. Loudly.', { instant: { sus: 8 } })]),
      ch('Tether your phone', 'costs 4 gold', [oc(1, 'Stable enough. The graph is flat and beautiful.', { effects: { graceMins: 1 }, effectsDuration: 'run' })], { cost: { gold: 4 } }),
      ch('Suffer', 'free', [oc(1, 'You build character and lose 3 gold of patience.', { instant: { gold: -3 } })])
    ]),
    ev('suspicious-link', 'The Suspicious Link', '🔗', [1, 2, 3], '"free nitro lol" from someone you do not know, in a channel you do not remember joining.', [
      ch('Click it', 'gamble', [oc(3, 'It was a rickroll. Everyone laughs.', { instant: { gold: 5 } }), oc(2, 'Your account posts 40 links. A mod is not pleased.', { instant: { sus: 15 } }), oc(1, 'A real giveaway. Wow.', { giveBoon: { rarity: 'common' } })]),
      ch('Report it', 'civic duty', [oc(1, 'The mod thanks you publicly.', { instant: { sus: -10 } })]),
      ch('Screenshot it for the clips channel', 'chaos', [oc(1, 'It gets 30 reactions.', { instant: { gold: 8 } })])
    ]),
    ev('old-friend-returns', 'An Old Friend Returns', '👋', [1, 2, 3], 'An old friend logs in after 9 months. "Wait, you are STILL here?"', [
      ch('Welcome them back', 'warm', [oc(1, 'They vouch for you at the next vote. You gain an alt.', { instant: { alts: 1 } })]),
      ch('Ask for a loan', 'greedy', [oc(1, '"Here, 25 gold, never ask again."', { instant: { gold: 25 } })]),
      ch('Pretend you did not see', 'rude', [oc(2, 'They notice. You owe them an apology.', { instant: { sus: 5 } }), oc(2, 'They shrug and carry on.', { instant: {} })])
    ]),
    ev('lost-and-found', 'Lost and Found', '🧳', [1, 2], 'A box labeled "stuff people forgot on voice chat". Everything inside smells of pizza.', [
      ch('Take the headset', 'common find', [oc(1, 'It works. Somehow.', { giveBoon: { rarity: 'common' } })]),
      ch('Dig deeper', 'rare chance', [oc(4, 'Just crumbs.', { instant: { sus: 4 } }), oc(1, 'A hidden gem under the napkins.', { giveBoon: { rarity: 'rare' } })]),
      ch('Hand it in', 'honest', [oc(1, 'The mod gives you a reward.', { instant: { gold: 10 } })])
    ]),
    ev('server-boost', 'Server Boost Drive', '🚀', [1, 2, 3], 'The server needs 2 more boosts for a new emote slot.', [
      ch('Boost with 20 gold', 'investment', [oc(1, 'Everyone notices. Points x1.1 for the rest of the run.', { effects: { pointMult: 1.1 }, effectsDuration: 'run' })], { cost: { gold: 20 }, requires: { goldMin: 20 } }),
      ch('Boost with 8 gold', 'small donation', [oc(3, 'A small thank-you from the admin.', { instant: { sus: -6 } }), oc(1, 'They sent you a free emote.', { instant: { gold: 12 } })], { cost: { gold: 8 }, requires: { goldMin: 8 } }),
      ch('Ignore it', 'free', [oc(1, 'Nobody is mad. Yet.', { instant: {} })])
    ]),
    ev('cursed-emote', 'The Cursed Emote', '🗿', [2, 3], 'A weird emote appears in your picker. It stares back.', [
      ch('Use it', 'take a curse for a boon', [oc(1, 'The chat loses it. You feel strange.', { giveCurse: 'haunted-headset', giveBoon: { rarity: 'rare' } })]),
      ch('Delete it', 'safe', [oc(1, 'It was just an emote. Probably.', { instant: { sus: -4 } })]),
      ch('Spam it', 'chaos', [oc(1, 'Chat approves. A mod does not.', { instant: { gold: 15, sus: 12 } })])
    ]),
    ev('afk-kings-shrine', "The AFK King's Shrine", '🛐', [2, 3], 'A dusty throne in the AFK channel. A sign reads: "pay with a life."', [
      ch('Sacrifice an alt', 'lose 1 alt, gain a legendary', [oc(1, 'The King nods. You feel strong.', { giveBoon: { rarity: 'legendary' } })], { cost: { alts: 1 }, requires: { alts: 2 } }),
      ch('Light a candle', 'costs 10 gold', [oc(1, 'The King is pleased. Suspicion fades.', { instant: { sus: -25 } })], { cost: { gold: 10 } }),
      ch('Walk past', 'free', [oc(1, 'The throne judges you silently.', { instant: {} })])
    ], 0.8),
    ev('night-shift', 'Night Shift', '🌙', [1, 2, 3], '3am. The server is empty except for a bot and your regrets.', [
      ch('Trade 20 sus for 40 gold', 'sleep is overrated', [oc(1, 'You farm until sunrise. You regret it.', { instant: { sus: 20, gold: 40 } })]),
      ch('Sleep instead', 'recover', [oc(1, 'Eight hours. Suspicion melts.', { instant: { sus: -30 } })]),
      ch('Chat with the bot', 'lonely', [oc(2, 'It says something nice.', { instant: { sus: -6 } }), oc(1, 'It says "invalid command".', { instant: {} })])
    ]),
    ev('charity-stream', 'Charity Stream', '🎗️', [1, 2, 3], 'The squad is doing a charity stream. Your name is on the donation board. Empty.', [
      ch('Donate 15 gold', 'good karma', [oc(1, 'The chat chants your name. Suspicion drops and everyone loves you.', { instant: { sus: -15 } , flag: 'donor' })], { cost: { gold: 15 }, requires: { goldMin: 15 } }),
      ch('Pledge, never pay', 'shady', [oc(3, 'Nobody checks.', { instant: { gold: 5 } }), oc(2, 'Someone checks.', { instant: { sus: 14 } })]),
      ch('Mute the stream', 'cold', [oc(1, 'Peaceful. A little lonely.', { instant: {} })])
    ]),
    ev('rage-quit-lobby', 'Rage-Quit Lobby', '😤', [1, 2, 3], 'The squad leader just rage quit. Three people are staring at you.', [
      ch('Take over', 'lead', [oc(2, 'You carry. They trust you more now.', { instant: { sus: -12 } }), oc(2, 'You lose in four minutes.', { instant: { sus: 10 } })]),
      ch('Use the chaos to slip away', 'sneaky', [oc(1, 'Nobody tracks the time. Points x1.08 for this act.', { effects: { pointMult: 1.08 }, effectsDuration: 'act' })]),
      ch('Rage quit too', 'solidarity', [oc(1, 'Everyone logs. You drift off in peace.', { instant: { gold: 10, sus: 4 } })])
    ]),
    ev('lag-spike-lottery', 'Lag Spike Lottery', '🎰', [1, 2, 3], 'A strange site offers to "spike your ping" for science. Roll the dice?', [
      ch('Pay 6 gold and roll', 'double or nothing', [oc(2, 'Jackpot. Gold pours in.', { instant: { gold: 18 } }), oc(3, 'The ping spiked. Nothing else.', { instant: {} }), oc(1, 'The router caught fire. A mod saw.', { instant: { sus: 18 } })], { cost: { gold: 6 }, requires: { goldMin: 6 } }),
      ch('Watch someone else roll', 'safe', [oc(1, 'Entertaining, at least.', { instant: { sus: -4 } })]),
      ch('Hack the lottery', 'risky', [oc(1, 'You win a mystery common boon.', { giveBoon: { rarity: 'common' } }), oc(1, 'The lottery flags you.', { instant: { sus: 16 } })])
    ]),
    ev('group-project', 'Group Project', '📚', [1, 2, 3], 'You are in a group project and also a Discord call. Both need you.', [
      ch('Do the project', 'responsible', [oc(1, 'Done in one sitting. You feel productive.', { instant: { sus: -10, gold: 5 } })]),
      ch('Do the call', 'social', [oc(2, 'The squad hypes you. Nice.', { instant: { sus: -6 } }), oc(1, 'The squad roasts you.', { instant: { sus: 6 } })]),
      ch('Do both badly', 'chaos', [oc(1, 'Everything is a little worse, and a little funnier.', { instant: { gold: 10, sus: 8 } })])
    ])
  ];

  var bosses = [
    {
      id: 'ultimatum', name: 'Org Leader Ultimatum', icon: '📣', act: 1,
      objective: { minMins: 20 }, promise: { p: 15, m: 1.0 }, reward: { gold: 100 },
      rules: { modeLock: 'no-timeout', graceZero: true, pingRateMult: 1.6 },
      intro: ['The leader posts a message in all caps with a countdown.', '"{me}, you have 15 minutes. Do not go dark."', 'Rule: no grace, friends ping 60% more often.'],
      midFight: ['T-minus {t}. Are you there, {me}?', '@{me} the leader just said your name three times', '{friend} is taking attendance. you are the only blank.', 'the countdown is public now', '{me} the leader asked where you are. i said "stretching"', '@{me} i cannot cover for you forever'],
      win: ['The leader pins your message. "Fine."', 'You survive the ultimatum with a shrug.', 'Attendance: present (technically).'],
      fail: ['The leader revokes your seat. You rejoin on an alt.', '"I said do not go dark."', 'Your absence is noted in a spreadsheet.']
    },
    {
      id: 'friday-raid', name: 'Friday Raid Call', icon: '⚔️', act: 1,
      objective: { minMins: 25 }, promise: { p: 12, m: 1.1 }, reward: { gold: 100 },
      rules: { modeLock: 'no-timeout', forceVc: 'raid-night', micEventMult: 2 },
      intro: ['Raid night. The whole squad is in voice.', '"Everyone mute unless you are calling a target."', 'Rule: raid channel (+20% pts, +20% sus), mic accidents x2.'],
      midFight: ['someone is breathing on mic. was that you, {me}?', '{friend} pulled the boss. where are you?', 'we need a healer and a ghost. {me} is the ghost.', 'wipe number 3. {me} was "right there"', '@{me} your name is on the loot list. you are not on the field', 'the raid leader is typing a paragraph'],
      win: ['The boss falls. You were technically there.', 'You get a loot roll. It is a hat.', 'The raid leader says "good enough".'],
      fail: ['You miss the pull. The raid leader sighs for a full minute.', 'Wipe. Blame is assigned to you.', 'You drop from the roster, then join as an alt.']
    },
    {
      id: 'patch-day', name: 'Patch-Day Server Crash', icon: '🛠️', act: 2,
      objective: { minMins: 40 }, promise: { p: 20, m: 1.0 }, reward: { gold: 160 },
      rules: { modeLock: 'no-timeout', blackout: { at: [10, 30], dur: [3, 6], susMult: 0.5 }, dragChanceMult: 2, pointMultRound: 1.4 },
      intro: ['Patch notes: "minor fixes". The servers disagree.', 'Rule: a blackout hits mid-round, friends drag you twice as often, points x1.4.', 'Hold on for 40 minutes.'],
      midFight: ['servers are down, no one can see anything', '{friend} says it is a rollback', 'the status page says "investigating" again', '@{me} the patch ate my save', 'everyone is in the lobby, no one is in the game', '{me}, are you back or still rolled back?'],
      win: ['The patch holds. You were gone for all of it.', 'The server comes back with a 4 GB hotfix.', 'You survive the crash without a scratch.'],
      fail: ['The rollback takes you with it.', 'A friend drags you out at the worst moment.', 'The crash cost you a life.']
    },
    {
      id: 'audit-day', name: 'Mod Audit Day', icon: '🧾', act: 2,
      objective: { minMins: 35 }, promise: { p: 20, m: 1.0 }, reward: { gold: 160 },
      rules: { modeLock: 'no-timeout', noDecay: true, excuseMult: 0.5, pingRateMult: 1.3 },
      intro: ['The mods run an audit: who is active, who is a ghost?', 'Rule: no suspicion recovery next round, excuses half as effective.', 'Stay gone for 35 minutes without getting flagged.'],
      midFight: ['{friend} just got a warning for inactivity', 'the audit log has your name highlighted', '@{me} the mod asked if you are a bot', 'I told them you are "technically online"', 'audit results in 5 minutes, {me}', 'mods are checking everyone\'s last seen'],
      win: ['You pass the audit. Barely.', 'The mod stamps "approved".', 'Your file is closed (for now).'],
      fail: ['The audit flags you. You lose a life.', '"Inactive account detected."', 'Your excuse is on the record forever.']
    },
    {
      id: 'ping-storm', name: 'Mass-Ping Storm', icon: '🌪️', act: 3,
      objective: { minMins: 60 }, promise: { p: 30, m: 1.0 }, reward: { gold: 260 },
      rules: { modeLock: 'no-timeout', pingRateMult: 3, mutedOff: true, triageTimeMult: 0.7, pingShield: 2 },
      intro: ['Someone just did @everyone in every channel at once.', 'Rule: pings x3, no muted channels, triage 30% shorter. You start with 2 ping shields.', 'Hold for a full hour.'],
      midFight: ['@everyone. @here. @{me}.', '{friend} replied to the ping with 40 emojis', 'the notification count is 99+', '@{me} {t}. read your messages', 'it is a ping storm. the phone is warm.', 'the mod muted the mod'],
      win: ['The storm passes. Your phone is melted.', 'You answered nothing and survived.', 'Silence returns. It is suspicious.'],
      fail: ['The storm takes you out.', 'Too many pings. Too many feelings.', 'You are swept away by notifications.']
    },
    {
      id: 'final-roll-call', name: 'Final Roll Call', icon: '📜', act: 3,
      objective: { minMins: 60 }, promise: { p: 30, m: 1.0 }, reward: { gold: 260 },
      rules: { modeLock: 'no-timeout', graceZero: true, kickVoteAt: 40, susMultRound: 1.1, pointMultRound: 1.3 },
      intro: ['The server holds a final roll call. Everyone must answer to their name.', 'Rule: no grace, a kick vote opens at 40% suspicion, points x1.3, suspicion x1.1.', 'Be gone for an hour.'],
      midFight: ['{me}. {me}. {me}.', '{friend} says present. you are not on the list.', 'the vote is open. 3 of 5 are typing.', 'roll call has been going for {t}', '@{me} answer or we vote', 'the leader is holding the pen. over your name.'],
      win: ['You were never there and still survived the roll call.', 'The final vote fails 3 to 2.', 'Your name is read out. You were mostly present.'],
      fail: ['The vote passes. You lose a life.', '"Not present. Not forgiven."', 'The roll call ends with your name crossed out.']
    }
  ];

  var loadouts = [
    { id: 'intern', name: 'Intern', icon: '🧑‍💻', desc: 'No bonuses, no excuses. The default.', unlock: { tokens: 0 }, effects: {}, alts: 2, gold: 0, rerolls: 1, boons: [], curses: [] },
    { id: 'hot-mic-hero', name: 'Hot Mic Hero', icon: '🎙️', desc: 'Mic accidents x1.6, clips pay x1.5, one mute hammer. Starts with a free Sound Board offer.', unlock: { tokens: 40 }, effects: { micEventChance: 1.6, clipBonusMult: 1.5, abMuteHammer: 1 }, alts: 2, gold: 0, rerolls: 1, boons: [], curses: [], freeBoon: 'sound-board' },
    { id: 'ghost', name: 'Ghost', icon: '👻', desc: 'Quiet and slow. Suspicion x0.85, points x0.85, 2 ping shields, drag chance x0.8.', unlock: { tokens: 60 }, effects: { susMult: 0.85, pointMult: 0.85, pingShield: 2, dragChanceMult: 0.8 }, alts: 2, gold: 0, rerolls: 1, boons: [], curses: [] },
    { id: 'gambler', name: 'Gambler', icon: '🎲', desc: 'One alt, three rerolls, boon offers show 4 cards, 10 starting gold.', unlock: { tokens: 80 }, effects: {}, alts: 1, gold: 10, rerolls: 3, boons: [], curses: [], offerCards: 4 },
    { id: 'diplomat', name: 'Diplomat', icon: '🕊️', desc: 'Excuses +10, 2 excuse rerolls, one guaranteed-excuse charge.', unlock: { tokens: 100 }, effects: { excuseBonus: 10, excuseReroll: 2, abFakeInternet: 1 }, alts: 2, gold: 0, rerolls: 1, boons: [], curses: [] },
    { id: 'speedrunner', name: 'Speedrunner', icon: '⚡', desc: 'Points x1.2, start at 20% suspicion, +1 grace minute. Needs an Ascension 1 win.', unlock: { tokens: 0, ascMax: 1 }, effects: { pointMult: 1.2, startSus: 20, graceMins: 1 }, alts: 2, gold: 0, rerolls: 1, boons: [], curses: [] }
  ];

  var ascensions = [
    { level: 1, name: 'Tight Leash', desc: 'Suspicion x1.08 and friends drag you out 12% more often.', effects: { susMult: 1.08, dragChanceMult: 1.12 }, scoreMult: 1.15 },
    { level: 2, name: 'Nosy Friends', desc: 'Boss ping rate +25%, left-on-read cap +20%, drags 12% more often.', effects: { dragChanceMult: 1.12 }, rules: { bossPingRateAdd: 0.25, lorCapAdd: 0.2 }, scoreMult: 1.35 },
    { level: 3, name: 'One Life Left', desc: 'You start with 1 alt instead of 2 and drags happen 10% more often.', effects: { dragChanceMult: 1.1 }, rules: { altsStart: 1 }, scoreMult: 1.6 },
    { level: 4, name: 'Double Elite', desc: 'Boss objectives +20% longer. Rounds 2 and 3 of every act are both elite. Drags 4% more often.', effects: { dragChanceMult: 1.04 }, rules: { bossObjectiveMult: 1.2, elitesPerAct: 2 }, scoreMult: 1.9 },
    { level: 5, name: 'Cursed Start', desc: 'Grace minutes capped at 2. You start with a random curse that cannot be removed. Drags 4% more often.', effects: { dragChanceMult: 1.04 }, rules: { graceCap: 2, startCurse: true }, scoreMult: 2.3 }
  ];

  var synergies = [
    { id: 'mic-network', tag: 'mic', count: 3, name: 'Hot Mic Network', effects: { clipBonusMult: 1.5 }, desc: '3 mic boons: clips pay x1.5.' },
    { id: 'gadgeteer', tag: 'ability', count: 3, name: 'Gadgeteer', effects: { abFakeInternet: 1, abMuteHammer: 1, abDecoy: 1, abPingBomb: 1 }, desc: '3 ability boons: +1 charge of every ability.' },
    { id: 'ghost-net', tag: 'sus', count: 3, name: 'Low Profile', effects: { susFlatPerRound: -3 }, desc: '3 suspicion boons: suspicion drops 3 each round.' },
    { id: 'silver-tongue', tag: 'excuse', count: 3, name: 'Silver Tongue', effects: { excuseBonus: 8 }, desc: '3 excuse boons: excuses +8.' },
    { id: 'nest-egg', tag: 'gold', count: 3, name: 'Nest Egg', instant: { gold: 25 }, desc: '3 gold boons: +25 gold.' },
    { id: 'inbox-zero', tag: 'ping', count: 2, name: 'Inbox Zero', effects: { pingShield: 1 }, desc: '2 ping boons: one more ping forgiven.' },
    { id: 'streaker', tag: 'combo', count: 2, name: 'Streaker', effects: { comboKeep: 1 }, desc: '2 combo boons: one more combo shield.' },
    { id: 'grinder', tag: 'points', count: 3, name: 'Grinder', effects: { pointMult: 1.08 }, desc: '3 points boons: points x1.08.' }
  ];

  var rogue = {
    flavor: { actNames: ['The Lobby', 'The Grind', 'The Void'], runName: 'Night Shift', bossLabel: 'BOSS', eliteLabel: 'ELITE' },
    boons: boons, relics: relics, curses: curses, events: events, bosses: bosses,
    loadouts: loadouts, ascensions: ascensions, synergies: synergies
  };

  var C = window.AFK_CONTENT = window.AFK_CONTENT || {};
  var R = C.rogue = (C.rogue && typeof C.rogue === 'object') ? C.rogue : {};
  Object.keys(rogue).forEach(function (k) {
    if (Array.isArray(rogue[k])) R[k] = (Array.isArray(R[k]) ? R[k] : []).concat(rogue[k]);
    else R[k] = rogue[k];
  });
})();
