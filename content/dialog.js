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
