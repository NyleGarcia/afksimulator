/* BoberNet pack: dialog. Star Citizen org parody flavor. Tokens: {me} {p} {t}. */
window.AFK_PACKS = window.AFK_PACKS || {};
window.AFK_PACKS.bobernet = window.AFK_PACKS.bobernet || {};
window.AFK_PACKS.bobernet.dialog = {
  brb: [
    { t: 'brb refueling', p: 3, m: 1.2 },
    { t: 'brb claiming my ship', p: 5, m: 1.1 },
    { t: 'one sec, hangar elevator', p: 2, m: 1.4 },
    { t: 'brb spooling the quantum drive', p: 2, m: 1.35 },
    { t: 'brb need to repair my hull', p: 6, m: 1.05 },
    { t: '2 sec, buying ammo', p: 1, m: 1.6 },
    { t: 'brb swapping to my cargo ship', p: 8, m: 1.0 },
    { t: 'brb dinner, parking at the station', p: 30, m: 0.9 },
    { t: 'hold on, pad is bugged', p: 3, m: 1.25 },
    { t: 'brb restocking medpens', p: 4, m: 1.15 },
    { t: 'brb clearing my inventory glitch', p: 5, m: 1.1 },
    { t: 'quick refuel stop brb', p: 3, m: 1.25 },
    { t: 'brb the tram bugged out', p: 6, m: 1.05 },
    { t: 'one sec, respawning at the medbay', p: 2, m: 1.45 },
    { t: 'brb gotta call my ship back', p: 4, m: 1.15 },
    { t: 'brb 10 min, mining run (quick one)', p: 10, m: 0.95 },
    { t: 'brb logging out to fix my game', p: 15, m: 0.9 },
    { t: 'brb getting a snack before the jump', p: 3, m: 1.2 },
    { t: 'hold on, my landing gear is stuck', p: 2, m: 1.4 },
    { t: 'brb checking the QT route', p: 1, m: 1.5 },
    { t: 'brb 5 pls wait for me at the pad', p: 5, m: 1.1 },
    { t: '2 sec, looting a crate', p: 1, m: 1.55 },
    { t: 'brb the cargo lift is broken again', p: 7, m: 1.0 },
    { t: 'brb patching, launcher is 80GB', p: 20, m: 0.9 }
  ],

  excuses: [
    { t: 'server crashed at 30k', r: [15, 40] },
    { t: 'ship stuck in the hangar elevator', r: [15, 35] },
    { t: 'insurance timer, 3 days', r: [-5, 45] },
    { t: 'cargo glitched', r: [10, 35] },
    { t: 'my quantum drive spooled into a moon', r: [5, 40] },
    { t: 'fell through the station floor', r: [15, 35] },
    { t: 'my ship claimed itself on the wrong planet', r: [10, 35] },
    { t: 'the launcher needed a 40GB patch', r: [20, 40] },
    { t: 'got interdicted by a guy with a dream', r: [0, 45] },
    { t: 'i was at the bottom of a canyon, no signal', r: [10, 30] },
    { t: 'my cargo elevator ate my haul', r: [15, 40] },
    { t: 'bro the tram never came', r: [10, 30] },
    { t: 'error 30000 again', r: [20, 40] },
    { t: 'i was refueling (the pump was also AFK)', r: [0, 40] },
    { t: 'my pilot got stuck in a chair', r: [10, 35] },
    { t: 'respawned in a different system', r: [15, 35] },
    { t: 'i was hauling 1 box for 2 hours', r: [5, 35] },
    { t: 'physics grid exploded my ship', r: [20, 40] },
    { t: 'my mining laser overheated and so did i', r: [0, 40] },
    { t: 'i was in the shower (4 hours)', r: [5, 35] },
    { t: 'i was here the whole time??', r: [-15, 50] },
    { t: 'lost my ship in a cargo grid bug', r: [15, 40] },
    { t: 'quantum travel to nowhere', r: [10, 35] },
    { t: 'my hangar was full of someone else', r: [10, 30] },
    { t: 'fell asleep in the cockpit lol', r: [5, 40] },
    { t: 'the med bed wanted a second opinion', r: [-5, 35] },
    { t: 'my internet died mid-jump', r: [15, 35] },
    { t: 'had to fight a space raccoon', r: [-10, 45] },
    { t: 'i was auditing the org bank (it was a snack run)', r: [0, 40] },
    { t: 'my ship needed a 12 hour repair (real time)', r: [5, 40] }
  ],

  lines: {
    ask: [
      'yo @{me} u ready for the op?',
      'we spooling in 1',
      '@{me} hop in comms',
      'ok last run for real',
      'everyone at the hangar?',
      '@{me} you on turret this run',
      'aight lets jump',
      '@{me} cargo run, we need a pilot',
      'who is flying? @{me}?',
      'fuel up, we leave in 2',
      '@{me} you got your ship claimed?',
      'quantum in 30 sec, everyone on?',
      'org op starting, @{me} you in?'
    ],
    ok: [
      'k', 'ok hurry', 'np', 'fast pls', 'kk', 'ok o7', 'sure', 'go go', 'ok we hold the pad', 'fine, quick',
      'ye, buy me a fuel too', 'o7', 'ok but the elevator is slow'
    ],
    chill: [
      'ok', 'lol', 'np take ur time', 'anyone wanna do bounties while we wait', "i'm getting snacks then",
      'ye', 'i will polish the hull then', 'cool, i will check the market', 'all good, no rush',
      'we can swap ships meanwhile', 'o7 take care', 'np, i will stock up on ammo', 'chilling at the station'
    ],
    low: [
      '@{me}?', 'he said {p}', "it's been {t}", "where'd he go", '{me}??', 'yo is he back',
      'did he claim his ship yet', 'still in the elevator?', 'hello? {me}', '{t} already?', 'the pad is waiting',
      'is {me} refueling still', 'fuel stop takes {t}??'
    ],
    mid: [
      '@{me} bro', "it's been {t}. he said {p}", "he's gone again isn't he", '@{me} you alive?',
      'classic {me}', 'should we just fly without him', 'lmaooo every time', 'he is stuck in the elevator again',
      'we are burning fuel waiting', '{p} he said. {t} it is', 'insurance timer on his attention span',
      '@{me} the quantum drive is cold', 'the cargo is not loading itself'
    ],
    high: [
      '@{me}', '@{me} @{me} @{me}', 'BRO', "he's asleep 100%", 'imma kick him fr', '{t}. {t}!!!',
      'last warning @{me}', 'he is NOT coming back', 'org op is canceled thanks {me}', 'rip the haul, {t} wasted',
      '@{me} RESPOND', 'bro the whole fleet is idling', 'the pad is rent free in {me} head', 'we left. gg {me}'
    ],
    good: [
      'ah ok', 'fair enough', 'lmao ok', 'np', 'wb', 'welcome back king', 'o7 glad you made it',
      'bugs happen ngl', 'ok that one is valid', 'classic alpha moment', 'the elevator got us all once',
      'real, 30k took me out too', 'ok that tracks'
    ],
    meh: [
      'sure...', 'uh huh', 'ok buddy', 'every time bro', 'mhm', 'i guess the elevator did it',
      'right, the elevator', 'if you say so', 'ok pilot', 'sure, the tram', 'plausible i suppose',
      'we will see about that', 'riiight'
    ],
    bad: [
      'CAP', 'nobody believes you', 'u were asleep', 'bro.', 'this is the 4th time today', 'that is not a real bug',
      'you were in the hangar the whole time', 'i watched you logout', 'doubt', 'the logs say otherwise',
      'my radar says you were afk', 'pilot, please', 'your ship was never claimed'
    ],
    reused: [
      'you said that last time', 'same excuse as before lmao', 'bro has 1 excuse', 'the elevator again??',
      'new patch same excuse', 'copy paste excuse', 'insurance claim denied, reused', 'bro recycles excuses like cargo',
      'you used that one at the last op', 'that excuse has a cooldown', 'same bug different day', 'ok so no new material'
    ],
    early: [
      'wait you actually came back??', 'who are you', 'huh. ok', 'the elevator worked?? first time',
      'o7 early??', 'are you the fake {me}', 'bro the ship has not even spooled', 'suspicious, you are early',
      'check the logs, something broke', 'did the server reset', 'honestly shocked', 'who gave you a clock'
    ],
    kickAfter: [
      'finally', 'anyway', 'who wants to run cargo', 'rip bozo', 'org slot is open now',
      'o7 pilot', 'more fuel for us', 'we need a new turret gunner', 'fly safe, wherever you land',
      'insurance does not cover this one', 'next recruit please', 'cleared for departure, solo'
    ],
    hype: [
      'NEW RECORD!!', 'bro really went the distance', 'legendary AFK, o7', 'put it in the org hall of fame',
      'ok that was a quantum jump of an absence', 'record hauler of nothing', 'the hangar bows to you',
      'this man is beyond 30k', 'new personal best, we are proud', 'screenshot this for the wall',
      'my goat of idling', 'the whole fleet felt that one'
    ],
    kickReason: [
      'Reason: {me} was gone {t}, the fleet left without him.',
      'Reason: {me} promised {p} and delivered {t} of silence.',
      'Reason: the org ran out of fuel waiting on {me}.',
      'Reason: {me} was last seen inside a hangar elevator.',
      'Reason: too many excuses, not enough cargo.',
      'Reason: {me} insured his seat with a 3 day timer.',
      'Reason: the captain lost patience at {t}.',
      'Reason: {me} out-AFKed the pad itself.',
      'Reason: BoberNet cannot afford another idle pilot.',
      'Reason: quantum drive of excuses overheated.',
      'Reason: {me} claimed a ship and then claimed a nap.',
      'Reason: {t} for a {p} errand, the math did not math.',
      'Reason: officers voted. unanimous. fuel was the deciding factor.'
    ]
  },

  orgFightPings: [
    '@{me} where are you, we are outnumbered at the pad',
    '@{me} the rival org is at our hangar, need guns NOW',
    'ORG FIGHT at the station!! @{me} hop in',
    '@{me} we are dying at the dock, do you even own a ship',
    'we need a turret gunner @{me}',
    '@{me} contested zone, bring everything',
    'they have a capital ship, @{me} please',
    '@{me} the pad is under fire',
    'drop what you are doing @{me}, org war',
    '@{me} we need your hornet-class hull on target',
    'we are losing the tower, @{me} respond',
    '@{me} half the org is down, you are our med',
    'ping ping ping @{me}, interdiction ahead',
    '@{me} the other fleet is camping the jump point',
    'ALL HANDS, @{me} included, they are at the platform',
    '@{me} the officers asked for you by name',
    'we are 4v12 at the outpost, @{me} pls',
    '@{me} bring the cargo ship, we need a decoy',
    'war room open, @{me} where',
    '@{me} we will remember this absence at the roster'
  ],

  missedFight: [
    'we lost the fight because {me} was afk {t}',
    'org fight over. {me} missed it. {t} gone.',
    'we held the pad without {me}, barely',
    'the rival org now owns the station, thanks {me}',
    '{me} missed the biggest fight of the patch',
    'fight ended while {me} was refueling',
    'we needed {me} and got {t} of silence',
    'the enemy fleet left. {me} still has not shown',
    'we lost three ships because someone was in an elevator',
    'org officer note: {me} AFK during war, {t}',
    'the whole roster fought. {me} did not. {t}.',
    'rip the fleet, {me} was claiming his ship',
    '{me} missed the fight and the loot',
    'we won anyway but {me} gets no cut',
    'post-fight debrief: {me} was not there'
  ],

  welcomeBack: [
    'oh look, {me} finally spawned back',
    'welcome back {me}, we survived without you',
    'o7 {me}, you missed so much',
    '{me} is back, the elevator released him',
    'ah the prodigal pilot returns',
    'wb {me}, the pad is still warm',
    '{me} lives, report to the hangar',
    'back so soon? it has only been {t}',
    'the legend {me} has logged in',
    '{me}, the fleet is already docked',
    'welcome back, your seat is still reserved (barely)',
    'wb {me}, bring fuel next time',
    'o7, the cargo is half loaded for you',
    'welcome back, you owe the org {t}',
    'there he is, the ghost of the hangar'
  ]
};
