/* AFK Simulator shop items. Registers on window.AFK_CONTENT.items (entries are appended to anything already there).
 * Currency: tokens (1 token per 100 points banked). See CONTENT.md.
 *  { id, icon, name, desc, price, stackable?, max?, consumable?,
 *    effects: { susMult, pointMult, micEventChance, excuseBonus, graceMins } }
 *  susMult / pointMult / micEventChance multiply (x0.9 = 10% less). excuseBonus / graceMins add.
 *  Permanent items (default) stay forever and are always active. consumable:true items are used up at the
 *  start of your next run and only last for that run.
 */
(function () {
  'use strict';

  var items = [
    { id: 'nc-headset', icon: '🎧', name: 'Noise-Cancelling Headset', desc: 'Your mom is still yelling. Nobody else can hear it. Mic accidents happen half as often.', price: 6, effects: { micEventChance: 0.5 } },
    { id: 'energy-drink', icon: '🥤', name: 'Energy Drink', desc: 'Pointy gains, jittery vibes: x1.3 points, but x1.1 suspicion. One run only.', price: 2, consumable: true, stackable: true, max: 3, effects: { pointMult: 1.3, susMult: 1.1 } },
    { id: 'internet-pack', icon: '📶', name: "Fake 'Internet Died' Excuse Pack", desc: 'Pre-screenshotted router lights. Excuses remove +8 suspicion each (stacks).', price: 5, stackable: true, max: 3, effects: { excuseBonus: 8 } },
    { id: 'decoy-status', icon: '🎭', name: 'Decoy Status', desc: "Your status says 'Playing: homework'. Friends are 8% less suspicious.", price: 8, effects: { susMult: 0.92 } },
    { id: 'mute-mastery', icon: '🔇', name: 'Mute Button Mastery', desc: 'You know exactly when to hit mute. +2 free minutes before friends start counting.', price: 7, effects: { graceMins: 2 } },
    { id: 'webcam-cover', icon: '📷', name: 'Webcam Cover', desc: 'A sticky note over the lens. 5% less suspicion, 25% fewer hot-mic incidents.', price: 5, effects: { susMult: 0.95, micEventChance: 0.75 } },
    { id: 'snack-stash', icon: '🍿', name: 'Snack Stash', desc: 'You never need to come back for food. +3 grace minutes. One run only.', price: 3, consumable: true, effects: { graceMins: 3 } },
    { id: 'blame-dog', icon: '🐶', name: 'Blame-The-Dog Card', desc: 'The dog is a very credible witness. +25 to your next run of excuses. One run only.', price: 4, consumable: true, effects: { excuseBonus: 25 } }
  ];

  var C = window.AFK_CONTENT = window.AFK_CONTENT || {};
  C.items = (Array.isArray(C.items) ? C.items : []).concat(items);
})();
