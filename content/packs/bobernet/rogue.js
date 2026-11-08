/* BoberNet pack: rogue mode flavor + extra content. Star Citizen-style parody, invented names only.
 * Overrides (same id as base) change presentation only: name, icon, intro, lines.
 * New ids (boons, relics, curses, events, bosses, loadouts) are validated like base content and must respect the rarity budgets.
 * Registers on window.AFK_PACKS.bobernet.rogue. See CONTENT.md "Rogue mode".
 */
window.AFK_PACKS = window.AFK_PACKS || {};
window.AFK_PACKS.bobernet = window.AFK_PACKS.bobernet || {};
window.AFK_PACKS.bobernet.rogue = {
  disable: [],
  flavor: {
    actNames: ['Hangar Bay', 'Jump Point', 'The Outer Belt'],
    runName: 'Fleet Rotation',
    bossLabel: 'FLEET ALERT',
    eliteLabel: 'CONTESTED ZONE',
    bossIntro: {
      ultimatum: ['Fleet Commander Vexley demands a status report in all channels.', '"Fifteen minutes, {me}. Do not drift."'],
      'patch-day': ['The launcher says "40 GB". The servers say "no".', 'Stay gone until the 30k crash settles.'],
      'final-roll-call': ['Every pilot answers to their callsign. Silence is a crime.', 'Hold for an hour while the fleet counts heads.']
    }
  },
  override: {
    bosses: [
      { id: 'ultimatum', name: 'Org Leader Ultimatum', icon: '🛰️',
        intro: ['Commander Vexley posts the fleet ultimatum in every channel.', '"Fifteen minutes, {me}. The org does not drift."', 'Rule: no grace, friends ping 60% more often.'],
        lines: {
          midFight: ['T-minus {t}. Report to the hangar, {me}', '@{me} Vexley is reading the roster out loud', '{friend} says you are "refueling". for {t}.', 'the org leader just added your name to a red list', '{me} the countdown is public now', 'Vexley asked where you are. I said the elevator.'],
          win: ['Vexley pins your message. "Acceptable."', 'You survive the ultimatum. The hangar is quiet.', 'Attendance: present (the elevator was stuck).'],
          fail: ['Vexley revokes your hangar slot. You rejoin on an alt.', '"I said do not drift."', 'Your absence is written in the org ledger.']
        } },
      { id: 'friday-raid', name: 'Bunker Siege Night', icon: '💣',
        intro: ['The org sieges a bunker. Comms are packed.', '"Mute unless calling a target."', 'Rule: raid channel (+20% pts, +20% sus), mic accidents x2.'],
        lines: {
          midFight: ['{friend} is calling targets. where is {me}?', 'someone breathing on comms. {me}?', 'we need a medic and a ghost. {me} is the ghost.', 'wipe number 3. {me} was "in the elevator"', '@{me} your callsign is on the loot list', 'the siege lead is typing a paragraph'],
          win: ['The bunker falls. You were technically on comms.', 'You get a loot roll. It is a sock.', 'The siege lead says "good enough".'],
          fail: ['You miss the breach. The lead sighs for a full minute.', 'Wipe. You get the blame.', 'You are dropped from the roster and rejoin as an alt.']
        } },
      { id: 'patch-day', name: 'Patch-Day 30k Crash', icon: '🔧',
        intro: ['Patch notes: "minor fixes". The servers disagree.', 'Rule: a blackout hits mid-round, friends drag you twice as often, points x1.4.', 'Hold on for 40 minutes.'],
        lines: {
          midFight: ['30k. again. 30k.', '{friend} says it is a rollback', 'the status page says "investigating" again', '@{me} the patch ate my ship', 'everyone is in the launcher, no one is in the verse', '{me}, are you back or still rolled back?'],
          win: ['The patch holds. You were gone for all of it.', 'The servers return with a 40 GB hotfix.', 'You survive the crash without a scratch.'],
          fail: ['The rollback takes you with it.', 'A friend drags you out at the worst moment.', 'The crash costs you a life.']
        } },
      { id: 'audit-day', name: 'Insurance Audit Day', icon: '📑',
        intro: ['The org insurance clerk audits every pilot.', 'Rule: no suspicion recovery next round, excuses half as effective.', 'Stay gone for 35 minutes without being flagged.'],
        lines: {
          midFight: ['{friend} got a warning for inactivity', 'the audit log has your callsign in yellow', '@{me} the clerk asked if you are an NPC', 'I told them you are "technically online"', 'audit results in 5 minutes, {me}', 'the clerk is checking everyone\'s last jump'],
          win: ['You pass the audit. Barely.', 'The clerk stamps "approved".', 'Your file is closed (for now).'],
          fail: ['The audit flags you. You lose a life.', '"Inactive pilot detected."', 'Your excuse is on the record forever.']
        } },
      { id: 'ping-storm', name: 'Comms Storm', icon: '📡',
        intro: ['A relay glitch blasts @everyone across every frequency at once.', 'Rule: pings x3, no muted channels, triage 30% shorter. You start with 2 ping shields.', 'Hold for a full hour.'],
        lines: {
          midFight: ['@everyone. @here. @{me}.', '{friend} replied to the ping with 40 emojis', 'the notification count is 99+', '@{me} {t}. read your messages', 'the relay is on fire', 'the officer muted the officer'],
          win: ['The storm passes. Your comm unit is melted.', 'You answered nothing and survived.', 'Silence returns. It is suspicious.'],
          fail: ['The storm takes you out.', 'Too many pings. Too many feelings.', 'You are swept away by notifications.']
        } },
      { id: 'final-roll-call', name: 'Fleet Roll Call', icon: '🚀',
        intro: ['Every pilot answers to their callsign. Silence is a crime.', 'Rule: no grace, a kick vote opens at 40% suspicion, points x1.3, suspicion x1.1.', 'Be gone for an hour.'],
        lines: {
          midFight: ['{me}. {me}. {me}.', '{friend} says present. you are not on the manifest.', 'the vote is open. 3 of 5 are typing.', 'roll call has been going for {t}', '@{me} answer or we vote', 'the commander holds the pen over your callsign.'],
          win: ['You were never there and still survived the roll call.', 'The final vote fails 3 to 2.', 'Your callsign is read out. You were mostly present.'],
          fail: ['The vote passes. You lose a life.', '"Not present. Not forgiven."', 'The roll call ends with your callsign crossed out.']
        } }
    ],
    boons: [
      { id: 'caffeine-drip', name: 'Quantum Fuel Drip', icon: '⛽', desc: 'Burn extra fuel while parked. Points x1.06.' },
      { id: 'sticky-note', name: 'Hangar Sticky Note', icon: '🗒️', desc: 'A note on the console: "blame the elevator". Excuses +6.' },
      { id: 'mod-friend', name: 'Dock Master Friend', icon: '🧑‍✈️', desc: 'The dock master owes you one. Drag chance x0.85.' }
    ]
  },
  boons: [
    { id: 'cargo-grid-bonus', name: 'Cargo Grid Discount', icon: '📦', rarity: 'common', tags: ['gold'], desc: 'Haulers pay in gold. Gold x1.12.', effects: { goldMult: 1.12 }, max: 1, weight: 1, acts: [1, 2, 3], unlock: { tokens: 0 } },
    { id: 'autopilot-nap', name: 'Autopilot Nap', icon: '😴', rarity: 'common', tags: ['sus'], desc: 'Your ship flies itself. Suspicion drops 2 each round and +1 grace minute.', effects: { susFlatPerRound: -2, graceMins: 1 }, max: 1, weight: 1, acts: [1, 2, 3], unlock: { tokens: 0 } },
    { id: 'tractor-beam-snack', name: 'Tractor Beam Snack', icon: '🍕', rarity: 'common', tags: ['points'], desc: 'Snacks arrive on their own. +0.7 pts per minute.', effects: { pointFlatPerMin: 0.7 }, max: 1, weight: 1, acts: [1, 2, 3], unlock: { tokens: 0 } },
    { id: 'quantum-drift-excuse', name: 'Quantum Drift Excuse', icon: '🌀', rarity: 'rare', tags: ['excuse'], desc: '"I spooled into a moon." Excuses +12 and a free reroll.', effects: { excuseBonus: 12, excuseReroll: 1 }, max: 1, weight: 1, acts: [1, 2, 3], unlock: { tokens: 0 } },
    { id: 'escort-wing', name: 'Escort Wing', icon: '🛩️', rarity: 'rare', tags: ['drag', 'sus'], desc: 'Two wingmen vouch for you. Drag chance x0.75, suspicion x0.92.', effects: { dragChanceMult: 0.75, susMult: 0.92 }, max: 1, weight: 1, acts: [1, 2, 3], unlock: { tokens: 30 } },
    { id: 'insurance-rider', name: 'Insurance Rider', icon: '📄', rarity: 'rare', tags: ['sus'], desc: 'A kick is "claimed". You return at 50% suspicion.', effects: { secondWind: 1, secondWindSus: 50 }, max: 1, weight: 1, acts: [1, 2, 3], unlock: { tokens: 30 } },
    { id: 'org-banner', name: 'Org Banner', icon: '🚩', rarity: 'rare', tags: ['points', 'ping'], desc: 'Fly the colors. Points x1.08 and 1 ping forgiven.', effects: { pointMult: 1.08, pingShield: 1 }, max: 1, weight: 1, acts: [1, 2, 3], unlock: { tokens: 30 } },
    { id: 'jump-point-ghost', name: 'Jump Point Ghost', icon: '🌌', rarity: 'legendary', tags: ['sus', 'points'], desc: 'You dropped out of the sector map. Suspicion x0.82, points x1.12.', effects: { susMult: 0.82, pointMult: 1.12 }, max: 1, weight: 1, acts: [2, 3], unlock: { tokens: 60 } }
  ],
  relics: [
    { id: 'dock-master-badge', name: 'Dock Master Badge', icon: '🛂', tags: ['drag', 'sus'], desc: 'Drag chance x0.6, suspicion x0.95.', effects: { dragChanceMult: 0.6, susMult: 0.95 }, unlock: { tokens: 40 } },
    { id: 'black-box-recorder', name: 'Black Box Recorder', icon: '📼', tags: ['sus', 'gold'], desc: 'A kick is forgiven (back at 50%). +25 gold on pickup.', effects: { secondWind: 1, secondWindSus: 50 }, instant: { gold: 25 }, unlock: { tokens: 40 } },
    { id: 'jump-drive-core', name: 'Jump Drive Core', icon: '🔋', tags: ['points', 'sus'], desc: 'Points x1.12, suspicion drops 3 each round.', effects: { pointMult: 1.12, susFlatPerRound: -3 }, unlock: { tokens: 40 } }
  ],
  curses: [
    { id: 'hull-breach', name: 'Hull Breach', icon: '🕳️', desc: 'Suspicion x1.2 and mic accidents x1.5 for this round.', duration: 'round', effects: { susMult: 1.2, micEventChance: 1.5 }, payout: { gold: 28, boonRarity: 'rare' } }
  ],
  events: [
    { id: 'derelict-ship', title: 'The Derelict', icon: '🛸', acts: [1, 2, 3], weight: 1, text: 'A derelict hull drifts by. The airlock is open. Something inside is beeping.',
      choices: [
        { label: 'Board it', hint: 'risky', outcomes: [{ w: 3, text: 'Scrap everywhere. You grab 14 gold of salvage.', instant: { gold: 14 } }, { w: 2, text: 'The airlock slams. Alarms. Someone noticed.', instant: { sus: 14 } }, { w: 1, text: 'A working part under a blanket.', giveBoon: { rarity: 'rare' } }] },
        { label: 'Scan it', hint: 'safe', outcomes: [{ w: 1, text: 'Nothing worth the fuel. You feel smart.', instant: { sus: -5 } }] },
        { label: 'Fly on', hint: 'free', outcomes: [{ w: 1, text: 'You keep your hull intact.', instant: {} }] }
      ] },
    { id: 'pirate-toll', title: 'Pirate Toll', icon: '🏴‍☠️', acts: [1, 2, 3], weight: 1, text: 'A pirate pings you: "toll is 12 gold or we scrap your cargo".',
      choices: [
        { label: 'Pay the toll', hint: 'costs 12 gold', cost: { gold: 12 }, requires: { goldMin: 12 }, outcomes: [{ w: 1, text: 'They wave you through.', instant: { sus: -10 } }] },
        { label: 'Bluff', hint: 'gamble', outcomes: [{ w: 3, text: 'They believe you are a flagship. Respect.', instant: { gold: 10 } }, { w: 2, text: 'They scrap your cargo and your dignity.', instant: { sus: 12 } }] },
        { label: 'Flood the channel with ping spam', hint: 'chaos', outcomes: [{ w: 1, text: 'The pirate mutes you. You gain a mod friend.', giveBoon: { id: 'mod-friend' } }] }
      ] },
    { id: 'refuel-stop', title: 'The Refuel Stop', icon: '⛽', acts: [1, 2, 3], weight: 1, text: 'A refuel station. The line is long. The coffee is free.',
      choices: [
        { label: 'Wait in line', hint: 'patient', outcomes: [{ w: 1, text: 'You nap in the cockpit. Suspicion fades.', instant: { sus: -18 } }] },
        { label: 'Cut the line', hint: 'bold', outcomes: [{ w: 3, text: 'Nobody notices. Fuel for free.', instant: { gold: 10 } }, { w: 2, text: 'A pilot notices. Loudly.', instant: { sus: 10 } }] },
        { label: 'Buy premium fuel', hint: 'costs 15 gold', cost: { gold: 15 }, requires: { goldMin: 15 }, outcomes: [{ w: 1, text: 'The tank hums. Points x1.08 for the act.', effects: { pointMult: 1.08 }, effectsDuration: 'act' }] }
      ] },
    { id: 'org-bake-sale', title: 'Org Bake Sale', icon: '🧁', acts: [1, 2], weight: 1, text: 'The org runs a bake sale to fund the fleet. Dr. Pebble sells "medicinal brownies".',
      choices: [
        { label: 'Buy a brownie (6 gold)', hint: 'safe snack', cost: { gold: 6 }, requires: { goldMin: 6 }, outcomes: [{ w: 1, text: 'Tastes like victory. Suspicion drops.', instant: { sus: -14 } }] },
        { label: 'Volunteer to sell', hint: 'social', outcomes: [{ w: 2, text: 'You sell out. The org tips you.', instant: { gold: 14 } }, { w: 1, text: 'You eat the stock. Everyone saw.', instant: { sus: 8 } }] },
        { label: 'Skip it', hint: 'free', outcomes: [{ w: 1, text: 'Brownie-free and fearless.', instant: {} }] }
      ] }
  ],
  bosses: [
    { id: 'pirate-ambush', name: 'Pirate Ambush', icon: '☠️', act: 2,
      objective: { minMins: 38 }, promise: { p: 20, m: 1.0 }, reward: { gold: 160 },
      rules: { modeLock: 'no-timeout', forceVc: 'bunker-ops', pingRateMult: 1.5, dragChanceMult: 1.6, micEventMult: 1.5 },
      intro: ['Pirates jump the convoy. Comms are chaos.', 'Rule: the squad moves to Bunker Ops (+20% pts, +20% sus), friends ping 50% more, drag chance x1.6, mic accidents x1.5.', 'Hold for 38 minutes.'],
      lines: {
        midFight: ['pirates on our six. {me}, are you flying?', '{friend} is calling for cover', '@{me} the convoy is down to two ships', 'they stole the cargo. again.', '{me} the leader says to stop being in the elevator', 'we lost a freighter and an argument'],
        win: ['The convoy limps home. You were mostly there.', 'The pirates scatter. You get a share anyway.', 'Convoy intact. Dignity optional.'],
        fail: ['The pirates scrap your ship. You rejoin on an alt.', '"Next time, bring a gun."', 'Your seat in the convoy is now empty.']
      } }
  ],
  loadouts: [
    { id: 'hauler', name: 'Hauler', icon: '🚚', desc: 'Slow, steady, rich. Gold x1.25, 15 starting gold, points x0.9, suspicion x0.95.', unlock: { tokens: 50 }, effects: { goldMult: 1.25, pointMult: 0.9, susMult: 0.95 }, alts: 2, gold: 15, rerolls: 1, boons: [], curses: [] }
  ]
};
