/* AFK Simulator shop items (classic, tokens). Registers on window.AFK_CONTENT.items (appended to anything already there).
 * Currency: tokens (1 token per 100 points banked). See CONTENT.md and the effects vocabulary (AFK_RESOLVED.effectDefs).
 *  { id, icon, name, desc, price,
 *    category: gear | excuses | opsec | hustle | gadgets | gambles,
 *    tier: permanent | run | consumable,   // run = activates at run start, lasts the run (legacy consumable:true)
 *                                          // consumable = armed by the player, lasts ONE AFK round or one ability use
 *    rarity: common | rare | legendary, tags: [..], stackable?, max?, legacy?: 'note', effects: {..} }
 *  Budget: no single item above pointMult 1.25 or below susMult 0.88.
 */
(function () {
  'use strict';

  var items = [
    // ---------- gear ----------
    { id: 'nc-headset', icon: '🎧', name: 'Noise-Cancelling Headset', desc: 'Your mom is still yelling. Nobody else can hear it. Mic accidents happen half as often.', category: 'gear', tier: 'permanent', rarity: 'common', tags: ['mic'], price: 6, effects: { micEventChance: 0.5 } },
    { id: 'webcam-cover', icon: '📷', name: 'Webcam Cover', desc: 'A sticky note over the lens. 5% less suspicion, 25% fewer hot-mic incidents.', category: 'gear', tier: 'permanent', rarity: 'common', tags: ['sus', 'mic'], price: 5, effects: { susMult: 0.95, micEventChance: 0.75 } },
    { id: 'decoy-status', icon: '🎭', name: 'Decoy Status', desc: "Your status says 'Playing: homework'. Friends are 8% less suspicious.", category: 'gear', tier: 'permanent', rarity: 'common', tags: ['sus'], price: 8, effects: { susMult: 0.92 } },
    { id: 'mute-mastery', icon: '🔇', name: 'Mute Button Mastery', desc: 'You know exactly when to hit mute. +2 free minutes before friends start counting.', category: 'gear', tier: 'permanent', rarity: 'common', tags: ['grace'], price: 7, effects: { graceMins: 2 } },
    { id: 'ergo-chair', icon: '🪑', name: 'Ergonomic Chair', desc: 'Sit forever. Points keep trickling in even at a low multiplier: +1.5 pts per minute and +1 grace minute.', category: 'gear', tier: 'permanent', rarity: 'rare', tags: ['points', 'comfort'], price: 12, effects: { pointFlatPerMin: 1.5, graceMins: 1 } },
    { id: 'second-monitor', icon: '🖥️', name: 'Second Monitor', desc: 'One screen for the game, one for hiding. Triage lasts 30% longer and you get a free excuse reroll each run.', category: 'gear', tier: 'permanent', rarity: 'rare', tags: ['excuse', 'ping'], price: 18, effects: { triageTime: 1.3, excuseReroll: 1 } },
    { id: 'vpn-tunnel', icon: '🕳️', name: 'VPN Tunnel', desc: 'Your location is a rumor. Friends drag you out 40% less and suspicion drifts down 2 each round.', category: 'gear', tier: 'permanent', rarity: 'legendary', tags: ['drag', 'sus'], price: 40, effects: { dragChanceMult: 0.6, susFlatPerRound: -2 } },
    { id: 'mini-fridge', icon: '🧊', name: 'Mini Fridge', desc: 'Never leave the room again. A little grace, a little passive income.', category: 'gear', tier: 'permanent', rarity: 'common', tags: ['grace', 'points'], price: 10, effects: { graceMins: 1, pointFlatPerMin: 0.5 } },
    { id: 'do-not-disturb', icon: '🚪', name: 'Do Not Disturb Sign', desc: 'Hung on the door AND the Discord status. Friends are 20% less likely to drag you out.', category: 'gear', tier: 'permanent', rarity: 'common', tags: ['drag'], price: 9, effects: { dragChanceMult: 0.8 } },
    { id: 'lucky-duck', icon: '🦆', name: 'Lucky Rubber Duck', desc: 'Combos start at x2. The duck demands you take more risks (suspicion x1.05).', category: 'gear', tier: 'permanent', rarity: 'legendary', tags: ['combo', 'gamble'], price: 45, effects: { comboStartBonus: 1, susMult: 1.05 } },

    // ---------- excuses ----------
    { id: 'internet-pack', icon: '📶', name: "Fake 'Internet Died' Excuse Pack", desc: 'Pre-screenshotted router lights. Excuses remove +8 suspicion each (stacks).', category: 'excuses', tier: 'permanent', rarity: 'common', tags: ['excuse'], price: 5, stackable: true, max: 3, effects: { excuseBonus: 8 } },
    { id: 'blame-dog', icon: '🐶', name: 'Blame-The-Dog Card', desc: 'The dog is a very credible witness. +25 to your excuses for your next run.', category: 'excuses', tier: 'run', rarity: 'common', tags: ['excuse'], price: 4, consumable: true, legacy: 'Was a one-run consumable; still is (tier run). Stock you own keeps working.', effects: { excuseBonus: 25 } },
    { id: 'excuse-script', icon: '📝', name: 'Excuse Script Notes', desc: 'Index cards with plausible lies. A bad excuse roll gets one free reroll each run.', category: 'excuses', tier: 'permanent', rarity: 'rare', tags: ['excuse'], price: 15, effects: { excuseReroll: 1 } },
    { id: 'fake-internet-card', icon: '📡', name: 'Router-Lights Screenshot', desc: 'Arm it, use it: your next excuse is guaranteed to land (at least -35 sus, cannot be busted).', category: 'excuses', tier: 'consumable', rarity: 'common', tags: ['excuse', 'ability'], price: 3, effects: { abFakeInternet: 1 } },
    { id: 'macro-keyboard', icon: '⌨️', name: 'Macro Keyboard', desc: 'One key types the whole apology. Excuses +4 and triage lasts 10% longer.', category: 'excuses', tier: 'permanent', rarity: 'common', tags: ['excuse', 'ping'], price: 9, effects: { excuseBonus: 4, triageTime: 1.1 } },

    // ---------- opsec ----------
    { id: 'lock-screen-bot', icon: '🤖', name: 'Lock Screen Bot', desc: 'A script that wiggles your mouse and answers one ping. Suspicion drops 3 each round, one ping auto-forgiven. Run only.', category: 'opsec', tier: 'run', rarity: 'rare', tags: ['sus', 'ping'], price: 10, consumable: true, effects: { susFlatPerRound: -3, pingShield: 1 } },
    { id: 'mute-hammer-item', icon: '🔨', name: 'Mute Hammer', desc: 'Smash the mic. Use it once: no mic accidents for a whole round.', category: 'opsec', tier: 'consumable', rarity: 'common', tags: ['mic', 'ability'], price: 3, effects: { abMuteHammer: 1 } },
    { id: 'status-spoofer', icon: '🎮', name: 'Status Spoofer', desc: 'Use it once: friends gain suspicion at half speed for a round.', category: 'opsec', tier: 'consumable', rarity: 'common', tags: ['sus', 'ability'], price: 4, effects: { abDecoy: 1 } },
    { id: 'alt-login', icon: '👤', name: 'Alt Account Login', desc: 'Get kicked, rejoin on an alt at 55% suspicion. One save per run.', category: 'opsec', tier: 'run', rarity: 'rare', tags: ['sus', 'revive'], price: 12, consumable: true, effects: { secondWind: 1, secondWindSus: 55 } },
    { id: 'phoenix-account', icon: '🔥', name: 'Phoenix Account', desc: 'Banned? Never heard of it. A free save every run, and you come back at 40% suspicion.', category: 'opsec', tier: 'permanent', rarity: 'legendary', tags: ['sus', 'revive'], price: 38, effects: { secondWind: 1, secondWindSus: 40 } },
    { id: 'notif-filter', icon: '🔕', name: 'Notification Filter', desc: 'Only lets pings through after they are already resolved. One ping per run is forgiven and triage lasts 15% longer.', category: 'opsec', tier: 'permanent', rarity: 'common', tags: ['ping'], price: 10, effects: { pingShield: 1, triageTime: 1.15 } },

    // ---------- hustle ----------
    { id: 'energy-drink', icon: '🥤', name: 'Energy Drink', desc: 'Pointy gains, jittery vibes: x1.25 points, x1.12 suspicion. Arm it; lasts one AFK round.', category: 'hustle', tier: 'consumable', rarity: 'common', tags: ['points', 'gamble'], price: 2, stackable: true, max: 3, legacy: 'Was x1.3 points for a whole run; now a one-round consumable you arm before going AFK.', effects: { pointMult: 1.25, susMult: 1.12 } },
    { id: 'snack-stash', icon: '🍿', name: 'Snack Stash', desc: 'You never need to come back for food. +3 grace minutes. Arm it; lasts one AFK round.', category: 'hustle', tier: 'consumable', rarity: 'common', tags: ['grace'], price: 3, stackable: true, max: 3, legacy: 'Was +3 grace for a whole run; now a one-round consumable you arm before going AFK.', effects: { graceMins: 3 } },
    { id: 'hype-overlay', icon: '✨', name: 'Hype Overlay', desc: 'Fake viewer count in the corner. Points x1.08 and lies pay 25% more.', category: 'hustle', tier: 'permanent', rarity: 'rare', tags: ['points', 'excuse'], price: 20, effects: { pointMult: 1.08, lieBonusMult: 1.25 } },
    { id: 'overclock-pc', icon: '🔥', name: 'Overclocked PC', desc: 'Idle at max settings. +2 pts per minute, suspicion x1.04 because the fans are loud.', category: 'hustle', tier: 'permanent', rarity: 'rare', tags: ['points', 'gamble'], price: 22, effects: { pointFlatPerMin: 2, susMult: 1.04 } },
    { id: 'clip-farmer', icon: '🎞️', name: 'Clip Farmer', desc: 'You WANT the hot mic. 50% more mic accidents and funny ones pay 50% more.', category: 'hustle', tier: 'permanent', rarity: 'common', tags: ['mic', 'points'], price: 10, effects: { micEventChance: 1.5, clipBonusMult: 1.5 } },

    // ---------- gadgets ----------
    { id: 'reply-all-macro', icon: '📨', name: 'Reply-All Macro', desc: 'Use it once while pings are owed: answers every ping instantly at a small penalty.', category: 'gadgets', tier: 'consumable', rarity: 'common', tags: ['ping', 'ability'], price: 4, effects: { abPingBomb: 1 } },
    { id: 'panic-button', icon: '⏲️', name: 'Kitchen Timer + Panic Button', desc: 'Buys you 4 grace minutes and 5 extra points of headroom before the kick. Run only.', category: 'gadgets', tier: 'run', rarity: 'common', tags: ['grace', 'sus'], price: 5, consumable: true, effects: { graceMins: 4, susCap: 5 } },
    { id: 'sponsor-deal', icon: '🤝', name: 'Sponsor Deal', desc: 'A VPN company pays you in tokens: +25% tokens from every run.', category: 'gadgets', tier: 'permanent', rarity: 'rare', tags: ['tokens'], price: 25, effects: { tokenMult: 1.25 } },

    // ---------- gambles ----------
    { id: 'hardcore-disc', icon: '💿', name: 'Hardcore Mode Disc', desc: 'Start the run at 20% suspicion in exchange for x1.25 points. Run only.', category: 'gambles', tier: 'run', rarity: 'rare', tags: ['points', 'gamble'], price: 10, consumable: true, effects: { startSus: 20, pointMult: 1.25 } }
  ];

  var C = window.AFK_CONTENT = window.AFK_CONTENT || {};
  C.items = (Array.isArray(C.items) ? C.items : []).concat(items);
})();
