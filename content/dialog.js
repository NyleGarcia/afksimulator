/* AFK Simulator dialog pack. Tokens: {me} player handle, {p} promised time, {t} elapsed time.
 * Registers on window.AFK_CONTENT.dialog = { BRB, EXCUSES, LINES }. Entries are appended to anything already there. See CONTENT.md. */
(function () {
  'use strict';

  var BRB = [
    { t: 'brb', p: 5, m: 1.0 },
    { t: 'brb 2 min', p: 2, m: 1.35 },
    { t: 'one sec', p: 1, m: 1.5 },
    { t: 'brb 5', p: 5, m: 1.1 },
    { t: 'brb bathroom', p: 4, m: 1.15 },
    { t: 'brb grabbing a drink', p: 3, m: 1.2 },
    { t: 'brb mom is calling me', p: 10, m: 1.0 },
    { t: 'gotta eat dinner brb', p: 30, m: 0.9 },
    { t: 'brb gotta take the dog out', p: 15, m: 0.95 },
    { t: '2 sec', p: 1, m: 1.6 },
    { t: 'brb pizza is here', p: 5, m: 1.1 },
    { t: 'hold on', p: 2, m: 1.4 },
    { t: 'brb gonna restart my pc', p: 3, m: 1.25 },
    { t: 'brb 30 sec', p: 1, m: 1.55 },
    { t: 'brb charging my controller', p: 5, m: 1.1 },
    { t: 'brb need a snack', p: 3, m: 1.2 },
    { t: 'wait someone is at the door', p: 2, m: 1.4 },
    { t: 'brb gotta pee real quick', p: 3, m: 1.25 },
    { t: 'brb refilling my water', p: 2, m: 1.35 },
    { t: 'brb my mouse died', p: 4, m: 1.15 },
    { t: 'be right back, laundry', p: 20, m: 0.92 },
    { t: 'brb gonna check the mail', p: 6, m: 1.05 },
    { t: 'one min my food is burning', p: 1, m: 1.6 },
    { t: 'brb 10', p: 10, m: 1.0 },
    { t: 'brb getting my charger', p: 2, m: 1.4 },
    { t: 'hold up my roommate is yelling', p: 5, m: 1.1 },
    { t: 'brb taking out the trash', p: 5, m: 1.1 },
    { t: 'brb quick shower', p: 15, m: 0.95 },
    { t: 'brb 1 min promise', p: 1, m: 1.5 },
    { t: 'gimme a sec, wifi is cooked', p: 3, m: 1.25 },
    { t: 'brb gonna stretch my legs', p: 5, m: 1.1 },
    { t: 'brb 15 gotta call my grandma', p: 15, m: 0.95 },
    { t: 'brb the microwave beeped', p: 2, m: 1.35 },
    { t: 'brb going to find my other sock', p: 4, m: 1.15 },
    { t: 'brb feeding the cat', p: 3, m: 1.2 },
    { t: 'sec, downloading a driver', p: 5, m: 1.1 },
    { t: 'brb just gonna lie down for a sec', p: 2, m: 1.5 },
    { t: 'brb 45 min dinner is ready', p: 45, m: 0.9 },
    { t: 'be right back (i will not)', p: 1, m: 1.6 },
    { t: 'brb ordering uber eats', p: 8, m: 1.0 },
    { t: 'brb gotta dip 2 sec', p: 1, m: 1.55 },
    { t: 'brb tying my shoe', p: 1, m: 1.5 },
    { t: 'brb checking on the oven', p: 5, m: 1.1 },
    { t: 'brb gonna grab my hoodie', p: 2, m: 1.35 },
    { t: 'brb 20 homework thing', p: 20, m: 0.92 },
    { t: 'brb the fire alarm is just a battery', p: 3, m: 1.25 },
    { t: 'brb listening to a voice memo', p: 2, m: 1.4 }
  ];

  var EXCUSES = [
    { t: 'sorry my internet died', r: [15, 35] },
    { t: 'my mom needed help with groceries', r: [15, 30] },
    { t: 'fell asleep lol', r: [5, 40] },
    { t: 'dog ate my headset', r: [0, 45] },
    { t: 'sorry had to take a call', r: [15, 30] },
    { t: 'bro windows decided to update', r: [20, 40] },
    { t: 'power went out', r: [20, 35] },
    { t: 'i was here the whole time??', r: [-15, 50] },
    { t: 'pizza guy got lost', r: [10, 30] },
    { t: 'my cat unplugged my pc', r: [10, 40] },
    { t: 'had to fight a raccoon', r: [-10, 45] },
    { t: 'my little brother took my pc', r: [15, 35] },
    { t: 'i was in the shower (4 hours)', r: [5, 35] },
    { t: 'my discord crashed (it did not)', r: [0, 40] },
    { t: 'bro i was literally touching grass', r: [10, 30] },
    { t: 'my router caught fire', r: [-5, 45] },
    { t: 'i got stuck in a loading screen irl', r: [0, 40] },
    { t: 'my chair collapsed, had to rebuild it', r: [5, 35] },
    { t: 'the neighbor needed a jump start', r: [12, 32] },
    { t: 'i was doing my taxes', r: [8, 28] },
    { t: 'my monitor went to sleep and so did i', r: [5, 38] },
    { t: 'a seagull stole my sandwich', r: [-10, 42] },
    { t: 'my roommate unplugged the router', r: [18, 36] },
    { t: 'i was teaching my grandpa how to use email', r: [14, 34] },
    { t: 'sorry my headset was on mute the whole time', r: [-5, 38] },
    { t: 'i got lost in my own house', r: [-15, 40] },
    { t: 'the pizza was too hot to eat so i waited', r: [3, 25] },
    { t: 'my pc blue screened', r: [18, 38] },
    { t: 'i had a dentist appointment (it was 3am)', r: [-10, 35] },
    { t: 'my wifi was haunted', r: [-8, 44] },
    { t: 'i was stuck in a very important meeting with my bed', r: [2, 36] },
    { t: 'sorry the ice cream truck came', r: [8, 30] },
    { t: 'my keyboard stopped working then started again', r: [10, 32] },
    { t: 'i was watching one youtube video (it was 6 hours)', r: [-5, 32] },
    { t: 'hold on the power company was calling', r: [14, 33] },
    { t: 'i swear i was just reading the patch notes', r: [5, 30] },
    { t: 'my mom said dinner and then it was dinner', r: [15, 32] },
    { t: 'my cousin showed up unannounced', r: [14, 34] },
    { t: 'i was cleaning my room (i was not)', r: [0, 36] },
    { t: 'i was on the other discord', r: [-12, 40] },
    { t: 'my fridge made a weird noise so i investigated', r: [5, 34] },
    { t: 'alexa ordered something and i had to cancel it', r: [8, 30] },
    { t: 'i was getting my steps in', r: [8, 28] }
  ];

  var LINES = {
    ask: [
      'yo @{me} u ready?',
      'we queueing in 1',
      '@{me} hop in vc',
      'ok last game for real',
      'everyone ready?',
      '@{me} you on point this round',
      'aight lets go',
      '@{me} we need a 5th',
      'ranked time, lock in',
      'who is carrying today',
      '@{me} pls do not int again',
      'queue is popping, lets move',
      'did everyone drink water. ok queue',
      '@{me} u in or u out',
      'we ready, just waiting on the usual suspect',
      'lobby is up, @{me} join',
      'one more game then bed (lie)',
      'bring your A game @{me}',
      'tonight we win. tonight.',
      '@{me} you muted?',
      'ok squad up',
      'pls nobody go afk this time',
      '@{me} do not brb on me'
    ],
    ok: [
      'k', 'ok hurry', 'np', 'fast pls', 'kk', 'ok', 'sure',
      'go go go', 'ok dont take long', 'yep we wait', 'k hurry up',
      'ight', 'sure thing', 'bet, quick', 'fine but be fast',
      'we are timing you', 'ok clock is ticking', 'aight make it quick',
      'ok but i am watching the timer', 'ya ya go'
    ],
    chill: [
      'ok', 'lol', 'np take ur time', 'anyone wanna 1v1 while we wait',
      "i'm getting snacks then", 'ye',
      'honestly same i need a drink', 'lowkey need the break too',
      'who wants to watch a clip', 'anyone see that new meme',
      'lol my cat is on my keyboard', 'ok i am just gonna doomscroll',
      'brb-ception lol', 'guys look at this clip', 'this song slaps tho',
      'someone say something funny',
      'i am gonna restock my snacks', 'sipping water. waiting.',
      'is it just me or is the lobby loud', 'ok vibing'
    ],
    low: [
      '@{me}?', 'he said {p}', "it's been {t}", "where'd he go",
      '{me}??', 'yo is he back',
      'hello?', 'was that {p} or like {p} in dog years',
      'still waiting lol', "it's only been {t}, chill",
      'he said {p} tho', 'any sign of him', 'ok that is a little long',
      'brb moment', 'bruh', 'the timer has begun',
      "{t} and counting", 'maybe the bathroom is far', 'ping him',
      'he is probably on his way'
    ],
    mid: [
      '@{me} bro', "it's been {t}. he said {p}", "he's gone again isn't he",
      '@{me} you alive?', 'classic {me}', 'should we just start without him',
      'lmaooo every time',
      'the {p} lie again', '{t}. {t}. {t}.', 'bro fell into the void',
      'i am not even surprised anymore', '@{me} blink twice if you can hear us',
      'he is definitely scrolling tiktok', 'we have been here before',
      'he said {p} and i believed him. my bad',
      'hello?? earth to {me}', 'is his mic still on',
      'send help, send {me}', 'we are on game 2 without him',
      "he's lore at this point", 'he got distracted by a shiny thing'
    ],
    high: [
      '@{me}', '@{me} @{me} @{me}', 'BRO', "he's asleep 100%",
      'imma kick him fr', '{t}. {t}!!!', 'last warning @{me}',
      'he is NOT coming back',
      'ITS BEEN {t}', 'i am calling his mom', 'bro vanished lmaooo',
      'put his face on a milk carton', '@{me} THE LOBBY IS BURNING',
      'rip {me} 2024-2026', 'we are holding a funeral in vc',
      'i swear if he comes back with a pizza excuse', 'ban hammer is warming up',
      'he left for milk and never came back', 'kick vote loading...',
      '{me} PLEASE', 'it is {t}. IT IS {t}.', 'he has abandoned us'
    ],
    good: [
      'ah ok', 'fair enough', 'lmao ok', 'np', 'wb', 'welcome back king',
      'lol valid', 'ok that is fair', 'WB legend', 'respect the honesty',
      'ok i believe you', 'honestly that tracks', 'all good, welcome back',
      'ok that is actually kinda believable', 'lmao classic. wb',
      'glad you are alive', 'ok ok we move', 'that is a W excuse'
    ],
    meh: [
      'sure...', 'uh huh', 'ok buddy', 'every time bro', 'mhm',
      'riiiight', 'if you say so', 'convenient', 'sure sure',
      'wow so unlucky', 'what a coincidence', 'that is what they all say',
      'i will allow it. barely', 'mm hm. mm hm.', 'ok sherlock'
    ],
    bad: [
      'CAP', 'nobody believes you', 'u were asleep', 'bro.',
      'this is the 4th time today', 'that is the worst excuse ever',
      'i have seen better lies from a toddler', 'cap detected',
      'bro thinks we are stupid', 'lmaooo no', 'not even close',
      'the audacity', 'say sorry for real', 'try again but better',
      'my guy that excuse has a Wikipedia page for being fake'
    ],
    reused: [
      'you said that last time', 'same excuse as before lmao', 'bro has 1 excuse',
      'did you just copy paste that', 'new excuse pls, that one is used',
      'same script different day', 'we have heard this one before',
      'bro is recycling', 'that excuse expired last week'
    ],
    early: [
      'wait you actually came back??', 'who are you', 'huh. ok',
      'that was quick', 'bro is early??', 'report: man keeps promise',
      'who are you and what did you do with {me}', 'is this a glitch',
      'NO WAY', 'plot twist: he is back'
    ],
    kickAfter: [
      'finally', 'anyway', 'who wants to play', 'rip bozo',
      'ok moving on', 'peace and quiet at last', 'he will be back in 5 minutes anyway',
      'one less problem', 'GG {me}', 'queueing without him',
      'F in chat', 'we move'
    ],
    hype: [
      'WAIT THATS A NEW RECORD', 'new PB?? bro is built different',
      'okay that is actually impressive', 'legend. the absolute longest',
      '@{me} you broke the AFK scale', 'the goat of going missing',
      'screenshotting this for the hall of fame', 'put him on the leaderboard immediately',
      'bro really trained for this', 'what a disappearing act, bravo',
      'we should frame this', 'a new era of AFK begins',
      'NEW RECORD LETS GOOOO', 'absolute menace behavior, respect'
    ],
    afkMod: [
      '{me} was promoted to AFK channel moderator. Responsibilities: none. Pay: none.',
      'breaking: {me} has been promoted to AFK channel moderator',
      'the resident has named {me} AFK channel moderator. the position has no duties and no end date.'
    ],
    kickReason: [
      'Reason: said "brb" and meant "see you next week".',
      'Reason: crimes against queue time.',
      'Reason: the lobby unanimously voted "bro vanished".',
      'Reason: AFK for science, science said stop.',
      'Reason: emotional damage from the 4th "one sec".',
      'Reason: being too good at not being here.'
    ]
  };

  var C = window.AFK_CONTENT = window.AFK_CONTENT || {};
  var D = C.dialog = (C.dialog && typeof C.dialog === 'object') ? C.dialog : {};
  D.BRB = (Array.isArray(D.BRB) ? D.BRB : []).concat(BRB);
  D.EXCUSES = (Array.isArray(D.EXCUSES) ? D.EXCUSES : []).concat(EXCUSES);
  D.LINES = (D.LINES && typeof D.LINES === 'object') ? D.LINES : {};
  Object.keys(LINES).forEach(function (k) {
    D.LINES[k] = (Array.isArray(D.LINES[k]) ? D.LINES[k] : []).concat(LINES[k]);
  });
})();

/* ---- Additions: {friend} lines (a random OTHER friend, never the speaker; "{friend:text}" = fallback text) and rogue announcer lines. ---- */
(function () {
  'use strict';

  var FRIEND_LINES = {
    ask: [
      "@{me} {friend} is asking if you're here",
      'yo @{me} {friend} and i are waiting on you',
      '@{me} u ready? {friend} already is',
      "@{me} {friend} said you'd be late. prove them wrong",
      'hey @{me} are u coming or should i tell {friend} no',
      '@{me} {friend:the others} want to start',
      '@{me} {friend} saved you a spot. i did not',
      'ok who is waiting on {me}? me and {friend:the whole server}',
      '@{me} we are all here. even {friend}',
      '@{me} yo, {friend} is about to start without you'
    ],
    ok: [
      'k hurry, {friend} is getting impatient',
      "ok but {friend}'s timer is already running",
      'cool, i will tell {friend} you said {p}',
      "sure. {friend} is keeping score though",
      'fine. {friend:the others} will wait',
      'k. tell {friend} yourself when u get back',
      'ok bet, {friend} owes me 5 if you are late',
      'yeah go, i told {friend} you are cooked anyway',
      'alright, {friend} will not like it but fine',
      'k, {friend:everyone} is watching the clock'
    ],
    chill: [
      "it's fine {me}, {friend} is napping anyway",
      'no rush, {friend} is still loading in',
      'take ur time. {friend} is eating',
      "{me} chill, {friend} isn't even here yet",
      'all good, {friend} is stuck in a menu',
      "relax. {friend} is the last person who gets to judge",
      "we're fine, {friend:the others} are on their phones",
      'no stress {me}, {friend} also disappears for an hour',
      "{friend} just left too so you're not alone",
      'dw about it, {friend} lost track of time earlier'
    ],
    low: [
      '{me}, {friend} says hi and asks where you are',
      '{me}. buddy. {friend} is starting to notice',
      'hey @{me} {friend} asked where u went',
      '{me} {friend} is looking at the clock again',
      "{me} it's been {t}. {friend} said so",
      'umm @{me} {friend} is sending me looks',
      "{me}? {friend} thinks you're afk. are you afk?",
      '@{me} {friend} asked if you died. I said maybe.',
      '{me} come back, {friend:the others} are starting to talk',
      'quick check, @{me} {friend} is wondering'
    ],
    mid: [
      "{t}, {me}. {friend} has started a petition",
      "@{me} {friend} says you're a ghost now",
      '{me}, {friend} and i are doing a bet on when you come back',
      "{friend} says it's been {t} and he's keeping receipts",
      '@{me} {friend} is writing a eulogy for your promise',
      '{me} {friend} just said "classic {me}"',
      "bro {friend} timed it. {t}. i'm not even mad. {friend} is",
      '@{me} {friend:everyone} is staring at your name in the list',
      "{me} my guy. {friend} said {p} isn't a real number to you",
      "{friend} thinks you fell asleep. i think you fell for it",
      '@{me} come back, {friend} is out of material'
    ],
    high: [
      '{me}. {friend} is calling a vote. just so you know',
      "@{me} {friend} just said \"he's gone\" and nobody argued",
      "{t}?! {friend} has aged a year",
      "it's been {t}. {friend} deleted your seat from the party",
      "@{me} {friend} moved your stuff to the 'abandoned' folder",
      "{friend} is making a clip titled '{me} vs the clock'. you lost",
      '{me} {friend} and i are voting on a replacement',
      "i'm out of excuses. {friend} is out of patience",
      '@{me} {friend} found your last message from {t} ago. it said brb',
      "{me}. {friend:the others} left. i'm the last one. don't make me leave too",
      '{friend} said it is over. i said give it one more minute. that was a minute ago'
    ],
    good: [
      "welcome back {me}. {friend} didn't believe you'd make it",
      '{me} you did it, {friend} owes me 10',
      "ok you're back. {friend} lost the bet",
      'wb {me}, {friend} said you would be later',
      "nice, {me}. {friend} is shook",
      "{me} made it. {friend} has to eat his words",
      '{friend} was about to kick you. you are lucky',
      "you're back and {friend:the others} are still here. rare",
      "good return {me}, even {friend} clapped",
      "okay that was clean, {friend} would have taken longer"
    ],
    meh: [
      'ok {me}. {friend} is not impressed but ok',
      "you're back. {friend} gives it a 5/10",
      "fine. {friend} says you're on probation",
      'wb. {friend} wants an explanation, i want food',
      "ok {me}, {friend} noted it in the group chat",
      'late again. {friend} will bring it up later',
      "meh. at least {friend} didn't leave",
      '{friend} says "that was almost on time"',
      'the clock says {t}. {friend} says whatever',
      "not great {me}, but {friend:the others} let it slide"
    ],
    bad: [
      "uh {me}. {friend} just left the channel",
      "{me} {friend} is gone. i'm leaving too",
      'wow. {friend} said the quiet part out loud',
      "that excuse was bad. {friend} laughed so hard he muted",
      "{me} {friend} is writing this down. for later",
      "that's it, {friend} is done",
      '{me} you broke {friend}. he logged off',
      '{friend} made a face. i saw it. you could feel it',
      "even {friend:the others} can't defend that one",
      "{me}, {friend} will not forgive that. i might"
    ],
    reused: [
      '{me} that is the SAME excuse. {friend} remembers',
      "that's literally what you said last time. {friend} has the logs",
      '{friend} says new material please',
      'ok but {friend} said you used that one already',
      "{me} the excuse has expired. {friend} checked",
      'reused. {friend} said it with me in our heads',
      '{friend} can recite that excuse by heart now',
      "that's the second time. {friend} counted"
    ],
    early: [
      '{me} back already? {friend} was about to do a bit',
      'wait you came back early? {friend} lost money',
      "{me} that was fast. {friend} wasn't ready",
      "oh. you're back. {friend} had a speech",
      'early return?? {friend} owes me lunch',
      "{me} are you ok? {friend} says nobody comes back that fast",
      "huh. {friend} didn't even finish his sandwich",
      'wb {me}. {friend:the others} are shocked, honestly'
    ],
    kickAfter: [
      'rip {me}. {friend} said he saw it coming',
      '{friend} is already making the farewell clip',
      "gg {me}. {friend} didn't even try to stop it",
      'f in chat for {me}. {friend} typed it twice',
      '{friend} says "told you so" and i am not stopping him',
      'well. {friend} and i will share your seat',
      'o7 {me}. {friend} is saving the highlights',
      "{me} got kicked and {friend} took a screenshot",
      "see you tomorrow {me}, {friend} says dont be late",
      'the vote was {friend}, me, and the vibes',
      '{friend:the others} wanted to kick you sooner, I stalled'
    ],
    hype: [
      '{me} is back! {friend} get in here!',
      'ayo {friend} look who showed up',
      "{friend} you're not gonna believe who's here",
      "let's go {me}!! {friend} is hyped",
      '{me} let him cook. {friend} wants to watch',
      "{me} and {friend} on the same team? we're winning",
      '{friend} we need a speech, {me} is back',
      "he's alive!! {friend} owes me a soda",
      "{me}'s here. {friend:the others} are now allowed to start"
    ]
  };

  var ANNOUNCE = {
    bossAnnounce: [
      'BOSS ROUND: {friend} says the countdown is public',
      'Boss incoming. {friend} is already taking attendance.',
      "It's a boss round, {me}. {friend} is staring at your name.",
      '{friend} says: no pressure, but this one counts double',
      "Boss round! {friend:the others} are on edge",
      'The boss logged on. {friend} logged out.',
      'Boss round. Hold on for the full timer, {me}.',
      "{friend} is calling it: this is the real test"
    ],
    boonAnnounce: [
      'New boon! {friend} is jealous.',
      '{friend} says that boon is overpowered. Take it.',
      'Nice pick, {me}. {friend} wrote it down.',
      "You got a boon. {friend} didn't.",
      'Boon acquired. {friend:the others} are impressed',
      '{me} just got stronger. {friend} noticed.',
      'Another boon. {friend} is starting a fan club.',
      'Boon locked in. {friend} hopes you know what you are doing.'
    ],
    eventAnnounce: [
      'Event! {friend} found something weird.',
      '{friend} says do NOT click that. So you will.',
      'Something happened. {friend:the others} are talking about it',
      "A wild event appears. {friend} is hiding.",
      '{friend} dared you to open the event.',
      "Random encounter, {me}. {friend} has no idea what it is either.",
      'Event time. {friend} says choose wisely.',
      "{friend} says this one is cursed. He's right."
    ]
  };

  var C = window.AFK_CONTENT = window.AFK_CONTENT || {};
  var D = C.dialog = (C.dialog && typeof C.dialog === 'object') ? C.dialog : {};
  D.LINES = (D.LINES && typeof D.LINES === 'object') ? D.LINES : {};
  [FRIEND_LINES, ANNOUNCE].forEach(function (src) {
    Object.keys(src).forEach(function (k) {
      D.LINES[k] = (Array.isArray(D.LINES[k]) ? D.LINES[k] : []).concat(src[k]);
    });
  });
  // ---------- channel topic pools (js/reactions.js): what friends say IN each text channel ----------
  // keyed by the channel's `topic` (defaults to its id). Lines that contain {me} or @everyone are the "ping" lines
  // (used when the game wants a ping); the rest are ambient chatter. Only {me} is allowed as a token.
  var TOPICS = {
    memes: [
      'this meme is so accurate it hurts', 'new template just dropped, get in here', 'ok that one is actually good',
      'who is making these and are they okay', 'i have been laughing at this for 10 minutes', 'the formatting on this is criminal and i love it',
      'posting this in 3 other servers immediately', 'this is the funniest thing i have seen all week',
      'meme economy is crashing and i am shorting it', 'ratio + you fell off + this is mine now',
      'this one goes in the hall of fame', 'my cat is in this meme somehow', 'why is this so relatable',
      'nobody tell the mods about this one', 'i made a worse version of this, one sec',
      'caption contest: go', 'that is a certified classic', 'the deep fried version is better',
      'who keeps reposting the same 4 memes lmao', 'screenshotting this for later',
      '@{me} saw this and thought of you. you know why', '@{me} you are in the meme again, check it',
      '@{me} we need your reaction image, the good one', '@{me} explain this meme to me, i know you made it',
      '@{me} the meme is about you and you are not even here to defend yourself',
      '@{me} meme drop. react or be left on read', '@{me} why is nobody here when the memes are this good'
    ],
    clips: [
      'who clipped that?? it is already 4k views', 'the audio on this one is unreal', 'frame by frame this is even worse',
      'this clip gets better every time i watch it', 'ok who left their mic on in this one', 'that was 100% a lag spike',
      'this is going in the montage', 'the cameraman was a menace', 'slow motion makes it so much worse',
      'i would delete this but it is too good', 'comments on this clip are carrying me', 'clip of the week, no contest',
      'that whiff was cinematic', 'sound on for this one', 'they really did that in front of everyone',
      'this clip is evidence and i am keeping it', 'who is editing these and can they stop being so funny',
      'rewatching the elevator clip again, as one does', 'new clip, nobody is safe',
      '@{me} you are in the clip. do not watch it. watch it', '@{me} i have a clip of you and i am not afraid to post it',
      '@{me} clip incoming, brace yourself', '@{me} this clip is you and i have timestamps',
      '@{me} someone clipped your last brb. it is a banger', '@{me} say hi to the clip channel, you are the main character'
    ],
    announcements: [
      'Reminder: be kind in voice chat. The mods are watching, politely.', 'Server maintenance tonight. Everything will be fine, probably.',
      'New channel rules are pinned. Please read them. Please.', 'Game night is this weekend. RSVP or be mocked.',
      'Thanks to everyone who showed up to the last event!', 'Voice chat etiquette: mute when you are eating. We can hear you.',
      'Patch notes are out. Read them before complaining.', 'Roles have been updated. Check your colors.',
      'Poll is open: which game for game night? Vote before Friday.', 'The AFK channel is not a personal sleeping bag. Use it responsibly.',
      'Weekly recap posted. Highlights include fewer rage quits.', 'Reminder: spam in announcements will be deleted.',
      'Feedback form is open. Be nice, be useful.', 'Welcome to all new members. Read the rules, then ignore the memes.',
      '@everyone game night starts at 8. Be there or be a rumor.', '@everyone server rules were updated. Please acknowledge.',
      '@everyone mandatory vc check-in this weekend. Show up.', '@everyone reminder: brb means brb, not "see you next week".',
      '@everyone attendance matters. If you are reading this, say hi in general.', '@everyone new event schedule is live. Read it, acknowledge it.',
      '@everyone the AFK policy is being reviewed. Participate.'
    ]
  };
  D.TOPICS = (D.TOPICS && typeof D.TOPICS === 'object') ? D.TOPICS : {};
  Object.keys(TOPICS).forEach(function (k) {
    D.TOPICS[k] = (Array.isArray(D.TOPICS[k]) ? D.TOPICS[k] : []).concat(TOPICS[k]);
  });
})();

/* ---- Additions: rejoin lines (js/voice.js). A friend comments when you rejoin voice after being moved to the AFK channel.
 * rejoin = short absence, rejoinLong = you were gone an hour or more. ---- */
(function () {
  'use strict';

  var LINES = {
    rejoin: [
      'oh {me} is back from the afk channel',
      'look who found the voice button',
      'welcome back {me}, we kept your seat cold',
      'the afk bot got you huh',
      'rejoined. {me} lives'
    ],
    rejoinLong: [
      '{me}. where WERE you. {t}.',
      'we actually forgot {me} was in the server',
      '{t}?? and you rejoin like nothing happened',
      'the afk channel had better snacks i guess, {me}',
      'welcome back {me}. we started without you. twice.'
    ]
  };

  var C = window.AFK_CONTENT = window.AFK_CONTENT || {};
  var D = C.dialog = (C.dialog && typeof C.dialog === 'object') ? C.dialog : {};
  D.LINES = (D.LINES && typeof D.LINES === 'object') ? D.LINES : {};
  Object.keys(LINES).forEach(function (k) {
    D.LINES[k] = (Array.isArray(D.LINES[k]) ? D.LINES[k] : []).concat(LINES[k]);
  });
})();
