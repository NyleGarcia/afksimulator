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

/* ---- Additions: {friend} lines (a random OTHER crew member; "{friend:text}" = fallback text) and rogue announcer lines. ---- */
(function () {
  'use strict';

  var FRIEND_LINES = {
    ask: [
      '@{me} {friend} is already on the pad. where are you?',
      'yo @{me} {friend} wants to jump. you ready?',
      '@{me} the quantum drive is spooled. {friend} is waiting',
      '@{me} {friend} saved you a seat in the cargo bay',
      'ready check! @{me} {friend} said yes. twice.',
      '@{me} {friend:the whole crew} needs you at the hangar',
      '@{me} fuel is full. {friend} has the route. we need you',
      'hey @{me} {friend} is about to leave without you',
      '@{me} {friend} is calling it: launch in 60 seconds',
      '@{me} the fleet is gathering. {friend} asked for you by callsign'
    ],
    ok: [
      'k, but {friend} is watching the pad timer',
      "ok. {friend} says the elevator better be broken",
      'copy. {friend} will hold the hangar',
      'sure, go. {friend} will spool the drive when you are back',
      "fine {me}. {friend:the others} will wait",
      'k hurry, {friend} is refueling a second time',
      "copy that. {friend} owes me 5 aUEC if you're late",
      'alright, {friend} will keep the engine warm',
      'ok. tell {friend} yourself next time',
      'go on, {friend} will cover your shift'
    ],
    chill: [
      'no rush {me}, {friend} is still repairing the hull',
      "take your time, {friend} lost the route anyway",
      "it's fine, {friend} is eating in the hangar",
      '{me} relax, {friend} is stuck in an elevator',
      "all good. {friend} isn't even in the sector yet",
      'chill. {friend} also went AFK for an hour last week',
      "no stress. {friend:the others} are on their phones",
      "we're good {me}, {friend} found a bug to look at",
      '{friend} says the launcher is updating anyway',
      "dw {me}, {friend} is playing station bingo"
    ],
    low: [
      '{me}, {friend} says hi and asks where your ship is',
      '{me}. buddy. {friend} is starting to look at the clock',
      '@{me} {friend} sent a ping about you',
      "{me}? {friend} thinks your ship is in the elevator",
      "hey @{me} it's been {t}. {friend} says so",
      '@{me} {friend} asked if you docked or died',
      '{me} {friend} noticed your callsign went grey',
      "umm @{me} {friend} keeps looking at the roster",
      '{me}, {friend:the others} are starting to ask',
      'quick check @{me} {friend} is wondering if you left'
    ],
    mid: [
      "{t}, {me}. {friend} has started a fleet petition",
      '@{me} {friend} says you are a ghost pilot now',
      '{me}, {friend} and i have a bet on when you spawn back',
      '{friend} says it has been {t} and he is keeping receipts',
      '@{me} {friend} is writing a eulogy for your promise',
      "{friend} just said 'classic {me}' and everyone nodded",
      "{friend} timed it. {t}. i'm not mad. {friend} is",
      '@{me} your callsign is red. {friend} saw it first',
      '{me} {friend} says {p} is a lore number, not a time',
      "{friend} thinks you fell asleep in the cockpit",
      '@{me} come back, {friend} ran out of jokes'
    ],
    high: [
      '{me}. {friend} is calling a vote. just so you know',
      '@{me} {friend} said "he is gone" and nobody argued',
      '{t}?! {friend} has repaired the hull three times',
      "it's been {t}. {friend} cleared your hangar slot",
      '@{me} {friend} moved your cargo to the "abandoned" bay',
      "{friend} is clipping '{me} vs the elevator'. you lost",
      '{me} {friend} and i are voting on a replacement pilot',
      "i'm out of excuses. {friend} is out of patience",
      '@{me} {friend} found your brb message from {t} ago',
      '{me}. {friend:the others} left the hangar. i am the last one',
      '{friend} says it is over. i said one more minute. that was a minute ago'
    ],
    good: [
      "welcome back {me}. {friend} didn't think you'd make it",
      '{me} you made it, {friend} owes me 10 aUEC',
      "ok you're back. {friend} lost the bet",
      'wb {me}, {friend} said you would be later',
      "nice, {me}. {friend} is stunned",
      '{me} is here! {friend} has to eat his words',
      '{friend} was about to cut your slot. lucky',
      "you're back and {friend:the others} are still on the pad. rare",
      'good return {me}, even {friend} clapped',
      'clean return. {friend} would have taken longer'
    ],
    meh: [
      'ok {me}. {friend} is not impressed but ok',
      "you're back. {friend} gives it a 5/10",
      "fine. {friend} says you're on pad probation",
      "wb. {friend} wants an explanation, i want snacks",
      'ok {me}, {friend} wrote it in the org notes',
      'late again. {friend} will bring it up later',
      "meh. at least {friend} didn't jump without you",
      '{friend} says "that was almost on time"',
      'the clock says {t}. {friend} says whatever',
      "not great {me}, but {friend:the others} let it slide"
    ],
    bad: [
      'uh {me}. {friend} just left the channel',
      "{me} {friend} is gone. i'm leaving too",
      'wow. {friend} said the quiet part on open comms',
      "that excuse was bad. {friend} laughed so hard he muted",
      '{me} {friend} is writing this down for later',
      "that's it, {friend} is done",
      '{me} you broke {friend}. he logged off',
      "{friend} made a face. i saw it. you could feel it",
      "even {friend:the others} can't defend that one",
      '{me}, {friend} will not forgive that. i might'
    ],
    reused: [
      '{me} that is the SAME excuse. {friend} remembers',
      "that's literally what you said last time. {friend} has the logs",
      '{friend} says new material please',
      'ok but {friend} said you used that one already',
      '{me} the excuse has expired. {friend} checked',
      '{friend} can recite that excuse by heart now',
      "that's the second time. {friend} counted",
      "reused. {friend} even said it with you in his head"
    ],
    early: [
      '{me} back already? {friend} was about to do a bit',
      'wait you came back early? {friend} lost money',
      "{me} that was fast. {friend} wasn't ready",
      "oh. you're back. {friend} had a speech",
      'early return?? {friend} owes me fuel',
      '{me} are you ok? {friend} says nobody comes back that fast',
      "huh. {friend} didn't even finish repairing",
      'wb {me}. {friend:the others} are shocked, honestly'
    ],
    kickAfter: [
      'rip {me}. {friend} said he saw it coming',
      '{friend} is already making the farewell clip',
      "gg {me}. {friend} didn't even try to stop it",
      'f in chat for {me}. {friend} typed it twice',
      '{friend} says "told you so" and i am not stopping him',
      'well. {friend} and i will share your hangar slot',
      'o7 {me}. {friend} is saving the highlights',
      '{me} got kicked and {friend} took a screenshot',
      "see you tomorrow {me}, {friend} says don't be late",
      'the vote was {friend}, me, and the vibes',
      '{friend:the others} wanted to kick you sooner, I stalled'
    ],
    hype: [
      '{me} is back! {friend} get in here!',
      'ayo {friend} look who spawned',
      "{friend} you're not gonna believe who's here",
      "let's go {me}!! {friend} is hyped",
      '{me} let him cook. {friend} wants to watch',
      "{me} and {friend} on the same ship? we're winning",
      '{friend} we need a speech, {me} is back',
      "he's alive!! {friend} owes me a medpen",
      "{me}'s here. {friend:the others} are cleared for launch"
    ]
  };

  var ANNOUNCE = {
    bossAnnounce: [
      'FLEET ALERT: {friend} says the countdown is public',
      'Boss round. {friend} is already taking roll call.',
      "It's a fleet alert, {me}. {friend} is staring at your callsign.",
      '{friend} says: no pressure, but this one counts double',
      'Fleet alert! {friend:the others} are on edge',
      'The boss pinged the fleet. {friend} muted.',
      'Hold on for the full timer, {me}. {friend} is watching.',
      '{friend} is calling it: this is the real test'
    ],
    boonAnnounce: [
      'New boon! {friend} is jealous.',
      '{friend} says that boon is overpowered. Take it.',
      'Nice pick, {me}. {friend} wrote it in the org ledger.',
      "You got a boon. {friend} didn't.",
      'Boon acquired. {friend:the others} are impressed',
      '{me} just got stronger. {friend} noticed.',
      'Another boon. {friend} is starting a fan club.',
      'Boon locked in. {friend} hopes you know what you are doing.'
    ],
    eventAnnounce: [
      'Event! {friend} found something weird on the scanner.',
      '{friend} says do NOT click that. So you will.',
      'Something happened. {friend:the others} are talking about it',
      'A wild event appears. {friend} is hiding in the cargo bay.',
      '{friend} dared you to open the event.',
      "Random encounter, {me}. {friend} has no idea what it is either.",
      'Event time. {friend} says choose wisely.',
      "{friend} says this one is cursed. He's right."
    ]
  };

  var P = window.AFK_PACKS = window.AFK_PACKS || {};
  var B = P.bobernet = P.bobernet || {};
  var D = B.dialog = (B.dialog && typeof B.dialog === 'object') ? B.dialog : {};
  D.lines = (D.lines && typeof D.lines === 'object') ? D.lines : {};
  [FRIEND_LINES, ANNOUNCE].forEach(function (src) {
    Object.keys(src).forEach(function (k) {
      D.lines[k] = (Array.isArray(D.lines[k]) ? D.lines[k] : []).concat(src[k]);
    });
  });
})();

/* BoberNet pack: channel topic pools (js/reactions.js). Keyed by the channel's `topic` (default: its id).
 * Lines with {me} or @everyone are the "ping" lines; the rest are ambient chatter. Only the {me} token is allowed.
 * Invented flavor only: no real org names. */
(function () {
  'use strict';
  var TOPICS = {
    'pvp-ops': [
      'Forming up at the pad in 5. Bring your own medpens.', 'Plan is simple: Idris in front, everyone else behind the Idris.',
      'Who has the bunker coordinates? I only have a vibe.', 'Anyone seen the enemy fleet? Asking for my hull.',
      'I will take left flank. Left is the side with the elevator.', 'Reminder: friendly fire is still fire.',
      'Fighters launch first, excuses come second.', 'We lost 3 ships last fight and 2 of them were mine, parked wrong.',
      'Scout says 6 hostiles. Scout also said the last one was 2.', 'Comms check: if you can read this, you are late.',
      'Bring torpedoes. Or bring snacks. Preferably torpedoes.', 'Their Hammerhead is a floating target, politely ignore the turrets.',
      'Rally at the station, then we jump together. Together means together.', 'Rule one: do not die in the elevator.',
      'Gonna need a medic at the bunker and a priest for the medic.', 'Has anyone actually read the battle plan or are we winging it again?',
      'Their pilots are good. Ours are loud. Balance.', 'Fuel up, repair up, shut up, launch up.',
      '@{me} we are forming up. Where. Are. You.', '@{me} fight is live, we need your guns, not your excuses',
      '@{me} your ship is the only one not on the pad. Explain.', '@{me} they are pushing the bunker, get in vc',
      '@{me} attendance is mandatory-ish and you are not here', '@{me} we have a seat on the Idris with your name on it. It is the worst seat.',
      '@{me} if you miss this one i am putting you on the roster as "Decoy"', '@{me} rally now or take the blame in the debrief'
    ],
    'trade-routes': [
      'Quantanium is up again. Price is down again. Classic.', 'Hauling 96 SCU of beans. Do not ask.',
      'Anyone know a route with a profit margin over zero?', 'Terminal says 4 aUEC per unit. The terminal lies.',
      'Cargo grid is full, pilot is full, wallet is empty.', 'Hurston is paying double for medical supplies. Today only.',
      'I broke even. That is the best news I have had all week.', 'Rumor: hydrogen fuel is going up. Source: me, a guy.',
      'Moving 40 SCU of agricultural supplies. Ship smells like victory.', 'Is it me or are the loading times longer when you are broke?',
      'Pirates at the Yela belt. Take the long way.', 'Selling a half-full hold, no questions asked, mostly.',
      'The lift is bugged again. 20 minutes to move 8 boxes.', 'Cargo run tip: always check the sell price before the buy price.',
      'Best route today: nowhere. Stay in the hangar.', 'Prices are wrong again. I am reporting this to nobody.',
      'Mining laser overheated. So did I.', 'Who keeps leaving crates on the pad? Respect the pad.',
      '@{me} we need a hauler for the big run. You in?', '@{me} you owe the org 3 cargo runs. Receipts attached.',
      '@{me} the shared hold has your name on a crate and it is leaking', '@{me} trade run in 10, bring a second ship if you have one',
      '@{me} price check: your ship parked in the fuel lane again', '@{me} where is the cargo you promised to pick up?'
    ],
    'ship-art': [
      'New paint job dropped. Looks like a banana. I love it.', 'Hull render with studio lighting. 10 out of 10.',
      'Posted a screenshot from orbit. Yes the planet is real.', 'The sunrise over Crusader on this shot is unreal.',
      'Who did the livery? It is gorgeous and slightly illegal.', 'Rate my ship: it is mostly decals and hope.',
      'Photo mode makes every ship look expensive.', 'Close up of the nose cone. I am in love.',
      'Anyone else just parking ships to look at them?', 'My Cutlass has more scratches than paint and I stand by that.',
      'Gold trim is overrated. Gold trim everywhere.', 'This render is wallpaper material.',
      'Concept art vs in-game: one of them has fewer bugs.', 'The engine glow on this shot slaps.',
      'Fleet photo time. Everybody line up and do not clip into each other.', 'Panel gaps are my villain origin.',
      'Added a lightbar. Can you tell I have a problem?', 'That landing gear angle is chef kiss.',
      '@{me} post your ship already, we know you have a pretty one', '@{me} ship art channel misses you. Send a hull.',
      '@{me} the fleet photo needs you in it, bring your ship', '@{me} did you finally paint it? Show us',
      '@{me} we are waiting on your render, no pressure, a lot of pressure', '@{me} your ship in the screenshot is parked in the wrong spot. Again.'
    ],
    clips: [
      'Who clipped the landing? I mean the crash.', 'Elevator incident, take 4. Still funny.',
      'That quantum jump timing was either genius or luck. It was luck.', 'Clip of me forgetting to retract the landing gear. Enjoy.',
      'Slow-mo makes the explosion so much better.', 'Pilot error compilation, volume 12.',
      'The hangar door clipped through my ship. Real.', 'Turret cam captured the whole thing. It is not flattering.',
      'This is why we do not give the new guy the Idris.', 'Frame by frame this is a work of art. A bad one.',
      'Someone clipped my voice line again. Delete it.', 'Never forget the Great Tram Mishap.',
      'I was tow-hooked by a sofa. Clip attached.', 'Funny how the audio cut out right before I said something useful.',
      'That bounty hunter run was supposed to be serious.', 'Highlight reel: 3 seconds of glory, 9 minutes of falling.',
      '@{me} someone clipped your last brb. It is going in the montage', '@{me} you are in the new compilation, brace yourself',
      '@{me} we have a clip of you "just stepping away". It aged badly', '@{me} clip of the week is your elevator story, again',
      '@{me} delete this clip? Not until you reply', '@{me} i have clips and a lot of free time'
    ],
    'org-announcements': [
      'Reminder: org meeting Saturday at 20:00 server time. Attendance noted.', 'Hangar rules updated: parking is for ships, not opinions.',
      'New org roles are live. Check your tags and do not argue with them.', 'Fleet maintenance window tonight. Do not park on the elevator.',
      'Weekly org recap posted. Highlights include fewer exploded hulls.', 'Reminder: no recruiting spam in announcements.',
      'Congratulations to everyone who survived the last op. Both of you.', 'Rules: wear your tag, respect the Idris, ignore the memes.',
      'Org vault now has a rule: log your withdrawals. Yes, all of them.', 'Event calendar updated. Read it before asking when things start.',
      'Command thanks everyone for their patience with the bunker plan.', 'Org funds: transparent as a cockpit canopy, which is to say, mostly.',
      'New member onboarding is tonight. Be nice, bring snacks.', 'Fuel station etiquette: refill what you spill.',
      '@everyone Org fight tonight at 21:00 server time. Attendance is mandatory-ish.', '@everyone Fleet inspection tomorrow. Clean your hull.',
      '@everyone Roster check: reply with "o7" if you are alive.', '@everyone Reminder: brb in vc means brb, not a lifestyle.',
      '@everyone Cargo ops sign-up is open. Please acknowledge.', '@everyone Org meeting moved to Sunday. Read and acknowledge.',
      '@everyone Rules update. Please acknowledge that you read nothing.', '@everyone New org policy on AFK pilots. Acknowledge below.',
      '@{me} Attendance record updated. Please acknowledge.', '@{me} Command would like a word. Read this and acknowledge.'
    ]
  };
  var B = window.AFK_PACKS = window.AFK_PACKS || {};
  B = B.bobernet = B.bobernet || {};
  var D = B.dialog = (B.dialog && typeof B.dialog === 'object') ? B.dialog : {};
  D.topics = (D.topics && typeof D.topics === 'object') ? D.topics : {};
  Object.keys(TOPICS).forEach(function (k) {
    D.topics[k] = (Array.isArray(D.topics[k]) ? D.topics[k] : []).concat(TOPICS[k]);
  });
})();

/* ---- Additions: rejoin lines (js/voice.js), a crew member comments when you leave the cryo pod and rejoin voice. ---- */
(function () {
  'use strict';

  var LINES = {
    rejoin: [
      'o7 {me}, thawed out already?',
      '{me} rejoined. cryo pod is now free for the Popsicle',
      'welcome back to comms {me}',
      'the AFK bot got you, {me}. classic',
      '{me} is back on station'
    ],
    rejoinLong: [
      '{me}. {t} in the cryo pod. explain.',
      'we logged you as lost cargo, {me}',
      '{t}?? the Popsicle was starting to like you',
      'welcome back {me}. the fleet launched without you. twice.',
      'oh good, {me}. we filed the insurance claim already'
    ]
  };

  var P = window.AFK_PACKS = window.AFK_PACKS || {};
  var B = P.bobernet = P.bobernet || {};
  var D = B.dialog = (B.dialog && typeof B.dialog === 'object') ? B.dialog : {};
  D.lines = (D.lines && typeof D.lines === 'object') ? D.lines : {};
  Object.keys(LINES).forEach(function (k) {
    D.lines[k] = (Array.isArray(D.lines[k]) ? D.lines[k] : []).concat(LINES[k]);
  });
})();
