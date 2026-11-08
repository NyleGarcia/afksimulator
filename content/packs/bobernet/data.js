/* BoberNet content pack: data (server, characters, residents, channels, items, achievements).
   Classic script. Tokens: {me} player handle, {p} promised time, {t} elapsed time. */
window.AFK_PACKS = window.AFK_PACKS || {};
window.AFK_PACKS.bobernet = window.AFK_PACKS.bobernet || {};

window.AFK_PACKS.bobernet.data = {
  server: {
    name: 'BoberNet',
    icon: '🦫',
    tagline: 'A Star Citizen org. Fly casual. Die loud. Insure everything.',
    afkChannelId: 'cryo-pod',
    defaultChannelId: 'general'
  },

  characters: [
    {
      id: 'vexley',
      name: 'Vexley',
      color: '#f5a623',
      role: 'friend',
      tags: ['fleet-commander', 'bossy', 'strategic', 'caps-lock'],
      rival: true,
      lines: {
        ask: '{me} where are you. Fleet is forming up.',
        ok: 'Fine. Be back by {p}. I am writing it in the ops log.',
        chill: 'No rush. The fleet only needs you to exist at the right time.',
        low: 'Mm. {t} gone. Noted.',
        mid: '{t} AFK. I have a whole formation waiting on you, {me}.',
        high: '{me}. {t}. Explain yourself to the org or explain it to me, privately, in a worse mood.',
        good: 'Right on time. Suspicious, but I will take it.',
        meh: 'Back, finally. The formation has opinions about you.',
        bad: 'You said {p}. It is {t}. This goes in the performance review.',
        reused: 'Same excuse twice. I keep a log, {me}. A literal log.',
        early: 'Back already? Who are you and what did you do with {me}?'
      },
      digs: [
        { text: 'Solo Idris again? Bold. You cannot even solo a snack run, {me}.', when: { susMin: 0, susMax: 35 } },
        { text: 'The org fight started and our biggest gun was a chair with a pulse.', when: { susMin: 20, susMax: 60 } },
        { text: 'I have flown cargo with less dead weight than you, and that cargo was literally a corpse.', when: { susMin: 40, susMax: 80 } },
        { text: 'Walked away from the keyboard mid-formation? That is a court martial in three jurisdictions.', when: { paths: ['walk-away'] } },
        { text: 'You are muted AND deafened. At that point just list yourself as scenery.', when: { paths: ['muted-deaf'] } },
        { text: '{t} and no word. The org is writing your eulogy and it is mostly "never showed up."', when: { susMin: 70, susMax: 100, minLateRatio: 1.5 } }
      ]
    },
    {
      id: 'tallow',
      name: 'Tallow',
      color: '#7ed957',
      role: 'friend',
      tags: ['quartermaster', 'petty', 'accountant', 'hoarder'],
      lines: {
        ask: '{me}, you still owe the org 4,000 aUEC. Also where are you.',
        ok: '{p}. I am putting that on the ledger next to your debt.',
        chill: 'Take your time. Interest accrues, but take your time.',
        low: '{t} gone. Cargo space is not free, {me}.',
        mid: '{t}. I have inventoried your gear. It is fine. I also listed it for sale.',
        high: 'At {t} I am legally allowed to repossess your seat.',
        good: 'On time. Rare. I will allow you a receipt.',
        meh: 'Late, but I have seen worse. I have mostly seen you.',
        bad: 'Late fee applied. It is paid in embarrassment.',
        reused: 'That excuse is already in my books. Pick a new line item.',
        early: 'Early? Suspicious. Did you steal something?'
      },
      digs: [
        { text: 'Your Idris loadout costs more than your will to show up on time.', when: { susMin: 0, susMax: 40 } },
        { text: 'Hauling crates is a team sport and you keep forfeiting the match.', when: { susMin: 25, susMax: 65 } },
        { text: 'I counted the org funds. I counted your attendance. One of those is bigger.', when: { susMin: 45, susMax: 85 } },
        { text: 'The Hangar Elevator ate your shift. Classic. You never even found the button.', when: { paths: ['alone-in-vc'] } },
        { text: 'You went hot-mic and sold your own loadout out loud. I took notes. Thanks.', when: { paths: ['hot-mic'] } },
        { text: 'Your AFK timeout fired. The ledger gave you a whole line for it.', when: { modes: ['afk-timeout'], susMin: 50 } }
      ]
    },
    {
      id: 'dr-pebble',
      name: 'Dr. Pebble',
      color: '#4fc3f7',
      role: 'friend',
      tags: ['medic', 'dry', 'clinical', 'morbid'],
      lines: {
        ask: '{me}, vitals check. Are you alive or just logged in.',
        ok: 'Back by {p}. If not, I am pronouncing you at {p} plus ten.',
        chill: 'Rest up. Your sleep schedule is a clinical case study.',
        low: '{t} out. Mild concern. Mostly paperwork.',
        mid: '{t}. Symptoms: absence, avoidance, no revive timer.',
        high: 'At {t}, cause of death is listed as "lazy."',
        good: 'Pulse detected at the promised time. Remarkable.',
        meh: 'Alive. Slightly late. Prognosis: unchanged.',
        bad: 'Severe lateness. Recommend an apology and a snack.',
        reused: 'Same excuse. Recurring condition. Chronic.',
        early: 'Early return. Rare complication. Monitoring.'
      },
      digs: [
        { text: 'I revived a guy mid-explosion yesterday. You cannot even respawn into a chair.', when: { susMin: 0, susMax: 40 } },
        { text: 'No pulse detected. Neither mouse movement. Both flatlining.', when: { susMin: 30, susMax: 70 } },
        { text: 'Fell asleep in VC again? I have a cot labeled for you. It is sad.', when: { paths: ['fell-asleep'] } },
        { text: 'Solo Idris crew of one, and the patient is also the pilot. Great plan, {me}.', when: { susMin: 20, susMax: 60, paths: ['alone-in-vc'] } },
        { text: 'Time of death: {t} ago. Cause: skipped the org fight.', when: { susMin: 60, susMax: 100 } },
        { text: 'You were not even in the medbay. You were in a place worse: the couch.', when: { paths: ['walk-away'], minLateRatio: 1.2 } }
      ]
    },
    {
      id: 'clank',
      name: 'Clank',
      color: '#ff7043',
      role: 'friend',
      tags: ['hauler', 'grindy', 'blunt', 'supply-runs'],
      lines: {
        ask: '{me} I need escort for a run. Hello?',
        ok: '{p}. I will wait. I have 96 SCU of patience.',
        chill: 'Cool. Cargo is not going anywhere. Neither am I.',
        low: '{t}. I have done two runs since you left.',
        mid: '{t}. Third run done. You owe me fuel.',
        high: '{t}. I have hauled enough to buy your whole fleet and I still missed you.',
        good: 'You showed. Cargo hold is warm. Get in.',
        meh: 'Late again. I have the manifest to prove it.',
        bad: 'Bad. I flew the whole route solo for nothing.',
        reused: 'That is the same excuse as last Tuesday. Same Tuesday.',
        early: 'Early? Load the crates, {me}.'
      },
      digs: [
        { text: 'I hauled 96 SCU of regret waiting for you. Free of charge.', when: { susMin: 0, susMax: 45 } },
        { text: 'The Cargo Run takes four minutes. You took {t}. Explain the math.', when: { susMin: 30, susMax: 70, minLateRatio: 1.0 } },
        { text: 'You keep dodging the org fight and keep taking the loot. Pick a lane.', when: { susMin: 40, susMax: 80 } },
        { text: 'Hot mic again? Great. Now I know your whole snack inventory.', when: { paths: ['hot-mic'] } },
        { text: 'No-timeout AFK means you are free. And you are using it to be useless.', when: { modes: ['no-timeout'], susMin: 30 } },
        { text: 'Solo Idris. Of course. We are all still hauling.', when: { susMin: 60, susMax: 100 } }
      ]
    },
    {
      id: 'wisp',
      name: 'Wisp',
      color: '#ba68c8',
      role: 'friend',
      tags: ['pathfinder', 'chaotic', 'lost', 'vibes'],
      lines: {
        ask: '{me}!! where did you jump to?? I am lost too',
        ok: 'ok see you at {p}! I will be exploring! nowhere specific!',
        chill: 'no worries!! I am in a cave. I think. send help later.',
        low: '{t}! I found a new route! it goes in a circle!',
        mid: '{t}?! I mapped the whole sector since you left. incorrectly.',
        high: '{t}!!! I am considering a search party of one. me. I am the party.',
        good: 'you are back!! on time!! I have no map for this!',
        meh: 'late but I am also late so it is cool!',
        bad: 'I got lost looking for you and I was in the same room!',
        reused: 'wait that excuse again?? I remember it!! I never remember!!',
        early: 'EARLY?! the universe is breaking!!'
      },
      digs: [
        { text: 'I found a jump point to nowhere and thought of you.', when: { susMin: 0, susMax: 35 } },
        { text: 'Solo Idris? I tried that once and got stuck in my own hangar door.', when: { susMin: 10, susMax: 55 } },
        { text: 'Your Quantum drive took longer than your actual excuse. I checked.', when: { susMin: 35, susMax: 75 } },
        { text: 'You fell asleep and I narrated the whole org fight to your empty seat. Great audience.', when: { paths: ['fell-asleep'] } },
        { text: 'You are muted AND deafened. That is a vibe or a cry for help. I support both.', when: { paths: ['muted-deaf'] } },
        { text: '{t}. Even my sense of direction can find that you are not here.', when: { susMin: 65, susMax: 100 } }
      ]
    },
    {
      id: 'rook',
      name: 'Rook',
      color: '#ef5350',
      role: 'friend',
      tags: ['gunner', 'trigger-happy', 'trash-talk', 'pvp'],
      lines: {
        ask: '{me}. turret seat is empty. why is it empty.',
        ok: '{p}. I am keeping the turret warm. Hotter than your excuses.',
        chill: 'Sure. I will shoot something in your honor.',
        low: '{t}. I have killed 3 pirates and 2 allies. By accident, mostly.',
        mid: '{t}. Turret is cold. My patience is hot.',
        high: '{t}. I am putting you in the pilot seat of a derelict. Permanently.',
        good: 'Nice. On time. Ready to get shot at together.',
        meh: 'Late. We died without you. It was bad. I blame you.',
        bad: 'We lost the fight. We lost it because you took a nap.',
        reused: 'Same excuse as last fight. Same loss.',
        early: 'Early? Get in the turret, recruit.'
      },
      digs: [
        { text: 'Solo Idris on a Tuesday. We lost 6 ships and I blame you personally.', when: { susMin: 0, susMax: 40 } },
        { text: 'You called "gunner down" and then you were the one down. In a chair.', when: { susMin: 20, susMax: 60 } },
        { text: 'Bunker Ops would have been won if someone showed up. Starts with {me}, ends with shame.', when: { susMin: 50, susMax: 90 } },
        { text: 'You walked away from the keyboard and left your ship in the middle of the dogfight. Respect, but no.', when: { paths: ['walk-away'] } },
        { text: 'You went hot mic and told the enemy our plan. They won. Thanks, {me}.', when: { paths: ['hot-mic'] } },
        { text: '{t}? My kill count grew while you did not. Take notes.', when: { susMin: 70, susMax: 100, minLateRatio: 1.3 } }
      ]
    }
  ],

  residents: [
    {
      id: 'space-popsicle',
      name: 'Space Popsicle',
      color: '#80deea',
      role: 'resident',
      tags: ['cryo', 'frozen', 'legend'],
      timerDays: [200, 1500],
      statusLines: [
        'Still frozen. Still thawing in about 400 years.',
        'Went to sleep for a quick nap. Woke up in a different patch.',
        'Frost on the screen. Do not touch.',
        'Last seen: before the economy reset. Twice.',
        'Says "just five more minutes" every century.'
      ]
    },
    {
      id: 'derelict-bot',
      name: 'DERELICT-7',
      color: '#9e9e9e',
      role: 'bot',
      tags: ['station', 'automated', 'creepy'],
      timerDays: [40, 400],
      statusLines: [
        'STATION POWER: 3 PERCENT. VOICE LINK: OPEN.',
        'No crew detected. Continuing to detect no crew.',
        'Automated message: please stop rattling the airlock.',
        'Air supply: unknown. Morale: unknown.',
        'Welcome, visitor. We have been expecting someone.'
      ]
    },
    {
      id: 'bunk-bandit',
      name: 'Bunk Bandit',
      color: '#bcaaa4',
      role: 'resident',
      tags: ['squatter', 'sleepy', 'cozy'],
      timerDays: [3, 60],
      statusLines: [
        'Claimed the bunk. Technically mine now.',
        'Rent is paid in snores.',
        'Do not wake me, I am in a very good dream about hauling.',
        'Left a sock as a territory marker.',
        'Muted because nobody else needed to hear that.'
      ]
    },
    {
      id: 'lost-miner',
      name: 'Dusty the Miner',
      color: '#ffb74d',
      role: 'resident',
      tags: ['miner', 'rocks', 'lonely'],
      timerDays: [10, 180],
      statusLines: [
        'Scanned a rock. Fell asleep. Rock was boring.',
        'Hit a vein of nothing. Staying to look again.',
        'Not AFK, just mining. Slowly. Very slowly.',
        'Mining laser still running. I think.',
        'Ask me about quantanium. Do not ask me about my feelings.'
      ]
    },
    {
      id: 'cryo-intern',
      name: 'Intern 404',
      color: '#aed581',
      role: 'bot',
      tags: ['intern', 'overworked', 'bot'],
      timerDays: [1, 30],
      statusLines: [
        'Fetching a coffee. Estimated return: soon-ish.',
        'Cryo pod diagnostics: everything is fine. Everything is fine.',
        'Reporting for duty. Duty has not reported back.',
        'Ticket opened: "who left the pod open." Status: you.',
        'I am only an intern. Please do not give me the keys.'
      ]
    }
  ],

  channels: [
    { id: 'general', name: 'general', icon: '#', type: 'text', isAfk: false, members: ['vexley', 'tallow', 'dr-pebble', 'clank', 'wisp', 'rook'], mods: { susMult: 1, pointMult: 1 }, desc: 'Chat about everything and nothing. Mostly nothing.', visibility: 0.85, busyness: 0.8, replies: [{ t: 'o7 here', r: [1, 5] }, { t: 'on station, whats up', r: [2, 7] }, { t: 'sorry, hangar WiFi', r: [3, 8] }] },
    { id: 'ship-art', name: 'ship-art', icon: '#', type: 'text', isAfk: false, members: ['wisp', 'tallow', 'clank'], mods: { susMult: 1, pointMult: 1 }, desc: 'Screenshots and renders of shiny hulls. Ship art only.', visibility: 0.4, busyness: 0.5, muted: true, muteDelay: [4, 12], replies: [{ t: 'nice hull', r: [0, 5] }, { t: 'o7', r: [1, 4] }, { t: 'where is the paint from', r: [0, 6] }] },
    { id: 'trade-routes', name: 'trade-routes', icon: '#', type: 'text', isAfk: false, members: ['tallow', 'clank', 'dr-pebble'], mods: { susMult: 1, pointMult: 1 }, desc: 'Cargo, prices, and complaints about prices.', visibility: 0.5, busyness: 0.6, replies: [{ t: 'cargo is fine, i am here', r: [1, 6] }, { t: 'prices are wrong again', r: [0, 5] }, { t: 'mining, will report', r: [2, 7] }] },
    { id: 'org-announcements', name: 'org-announcements', icon: '#', type: 'text', isAfk: false, members: ['vexley', 'tallow'], mods: { susMult: 1, pointMult: 1 }, desc: 'Official announcements. View only. Read it. You will not.', visibility: 0.95, busyness: 0.2, slowmodeSec: 20, readOnly: true, posters: ['vexley', 'tallow'], topic: 'org-announcements', replies: [{ t: 'acknowledged', r: [3, 9] }, { t: 'read and understood (not read)', r: [-3, 8] }, { t: 'o7', r: [1, 5] }] },
    { id: 'clips', name: 'clips', icon: '#', type: 'text', isAfk: false, members: ['rook', 'wisp', 'dr-pebble', 'clank'], mods: { susMult: 1, pointMult: 1 }, desc: 'Highlights, fails, and the elevator incident.', visibility: 0.25, busyness: 0.3, replies: [{ t: 'delete that clip', r: [0, 5] }, { t: 'that was a feature', r: [-2, 6] }, { t: 'who is clipping me', r: [1, 5] }] },
    { id: 'pvp-ops', name: 'pvp-ops', icon: '#', type: 'text', isAfk: false, members: ['vexley', 'rook', 'dr-pebble', 'clank'], mods: { susMult: 1, pointMult: 1 }, desc: 'Org fight planning. Attendance is, theoretically, mandatory.', visibility: 0.7, busyness: 0.6, replies: [{ t: 'on my way (hangar)', r: [1, 6] }, { t: 'where is the fight', r: [2, 7] }, { t: 'stuck in the elevator', r: [-4, 8] }] },
    { id: 'hangar-bay-vc', name: 'Hangar Bay VC', icon: '🔊', type: 'voice', isAfk: false, members: ['vexley', 'tallow', 'clank', 'wisp'], mods: { susMult: 1, pointMult: 1 }, desc: 'Default hangout. Echoey. Has an elevator.' },
    { id: 'quantum-lounge', name: 'Quantum Lounge', icon: '🔊', type: 'voice', isAfk: false, members: ['wisp', 'dr-pebble', 'rook'], mods: { susMult: 0.9, pointMult: 0.9 }, desc: 'Chill spot between jumps. Nobody is counting.' },
    { id: 'cargo-run-vc', name: 'Cargo Run VC', icon: '🔊', type: 'voice', isAfk: false, members: ['clank', 'tallow'], mods: { susMult: 0.75, pointMult: 0.85 }, desc: 'Hauling chat. People forgive silence here. The points are small.' },
    { id: 'bunker-ops', name: 'Bunker Ops', icon: '🔊', type: 'voice', isAfk: false, members: ['vexley', 'rook', 'dr-pebble'], mods: { susMult: 1.2, pointMult: 1.2 }, desc: 'Tense, loud, high stakes. They notice everything.' },
    { id: 'strike-comms', name: 'Strike Comms', icon: '🔊', type: 'voice', isAfk: false, members: ['vexley', 'rook'], mods: { susMult: 1.35, pointMult: 1.4 }, desc: 'PvP strike channel. Tense, huge points, nobody forgives a silent mic.' },
    { id: 'cryo-pod', name: 'Cryo Pod', icon: '🧊', type: 'voice', isAfk: true, members: [], mods: { susMult: 1, pointMult: 1 }, desc: 'The AFK channel. Do not disturb the Popsicle.' }
  ],

  // per voice channel flavor (js/voice.js): hello = friend line when you join, brb = a promise that fits the room
  voiceFlavor: {
    'hangar-bay-vc': { hello: ['{me} is in the bay. mind the elevator', 'o7 {me}, you made it to the hangar', 'welcome back to the echo chamber'],
      brb: [{ t: 'brb checking my ship loadout', p: 5, m: 1.1 }] },
    'quantum-lounge': { hello: ['oh hey {me}, pull up a crate', 'no rush in the lounge', 'quantum drive is warming up. relax {me}'],
      brb: [{ t: 'brb making tea, stay chill', p: 12, m: 0.95 }, { t: 'brb quantum snack run', p: 8, m: 1.05 }] },
    'cargo-run-vc': { hello: ['{me} on the haul. grab a box', 'cargo run is quiet, perfect', 'nobody talks during loading, {me}. it is fine'],
      brb: [{ t: 'brb loading the last crate', p: 15, m: 0.95 }, { t: 'brb hauling, dead air incoming', p: 20, m: 0.9 }] },
    'bunker-ops': { hello: ['{me}. you are late to the briefing', 'bunker is hot, {me}. stay on comms', 'we are mid-plan. mic discipline, {me}'],
      brb: [{ t: 'brb 1 min, bio break', p: 1, m: 1.65 }, { t: 'brb 2, grabbing meds', p: 2, m: 1.4 }] },
    'strike-comms': { hello: ['STRIKE COMMS. {me}. report.', 'oh good, {me} is on the strike', 'comms are live. no dead air, {me}'],
      brb: [{ t: '30 sec brb, covering my six', p: 1, m: 1.7 }, { t: 'brb 1 min, reloading', p: 1, m: 1.6 }] }
  },

  items: [
    { id: 'insurance-claim-form', icon: '📄', name: 'Insurance Claim Form', desc: 'Forgive one bad return. The paperwork takes forever, but it works.', price: 5, effects: { susMult: 0.9, excuseBonus: 10 }, stackable: false, consumable: true },
    { id: 'aegis-headset', icon: '🎧', name: 'Aegis-grade Noise Cancelling Headset', desc: 'Hot mic chances drop. You cannot hear them yelling either.', price: 12, effects: { micEventChance: 0.6, susMult: 0.95 }, stackable: false, consumable: false },
    { id: 'quantum-fuel', icon: '⛽', name: 'Quantum Fuel Canister', desc: 'Extra fuel for another few minutes of grace.', price: 4, effects: { graceMins: 3 }, stackable: true, max: 5, consumable: true },
    { id: 'hangar-elevator-pass', icon: '🛗', name: 'Hangar Elevator Pass', desc: 'Skip the elevator of doom. Slightly less points though.', price: 8, effects: { susMult: 0.85, pointMult: 0.95 }, stackable: false, consumable: false },
    { id: 'fleet-decal', icon: '🦫', name: 'BoberNet Fleet Decal', desc: 'Looks official. Friends trust you a smidge more.', price: 6, effects: { excuseBonus: 8 }, stackable: false, consumable: false },
    { id: 'medpen-stack', icon: '💉', name: 'MedPen Stack', desc: 'Dr. Pebble approved. Reduces damage from a bad roast.', price: 3, effects: { susMult: 0.92 }, stackable: true, max: 3, consumable: true },
    { id: 'cargo-grid-lock', icon: '🔒', name: 'Cargo Grid Lock', desc: 'Lock your delay behind a plausible hauling run. Slows suspicion growth.', price: 9, effects: { susMult: 0.8, pointMult: 0.9 }, stackable: false, consumable: false },
    { id: 'pvp-bounty-chip', icon: '🎯', name: 'PvP Bounty Chip', desc: 'High risk, high reward. Everyone is watching you now.', price: 15, effects: { pointMult: 1.4, susMult: 1.25 }, stackable: false, consumable: false }
  ],

  achievements: [
    { id: 'elevator-of-doom', name: 'Elevator of Doom', desc: 'Blame the hangar elevator for being late.', hint: 'Elevators are always a believable excuse. Right?' },
    { id: '30k', name: '30k', desc: 'Reach 30,000 points.', hint: 'The number every pilot dreams about. Slowly.' },
    { id: 'insured', name: 'Insured', desc: 'Use an Insurance Claim Form to save a bad return.', hint: 'Paperwork can save your hull and your face.' },
    { id: 'missed-the-org-fight', name: 'Missed the Org Fight', desc: 'Be AFK while the org starts a big fight.', hint: 'The fleet will remember.' },
    { id: 'roommate', name: 'Roommate', desc: 'Share the Cryo Pod with a resident for a full session.', hint: 'The Popsicle is quiet company.' },
    { id: 'solo-idris', name: 'Solo Idris', desc: 'Get roasted about a solo Idris by all six friends.', hint: 'It takes a whole org to make fun of one ship.' }
  ]
};
