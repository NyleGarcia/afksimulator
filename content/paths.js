/* AFK Simulator path pack. Tokens: {me} player handle, {p} promised time, {t} elapsed time.
 * Registers on window.AFK_CONTENT: .paths (array), .pathEvents (object), .pathLines (object).
 * Entries are appended to / merged with anything already there. See CONTENT.md.
 *  paths  : [{ id, name, desc, risk?, pointMult, susMult, pointGrow?, susGrow?, modes?, events[] }]
 *           modes (optional) = server modes the path may appear in; omitted = all modes.
 *           mechanics (optional): calm, punctual, earlyKeep, pulseEvery/pulseLen/pulsePts/pulseSus, silent (CONTENT.md)
 *           pointGrow/susGrow = extra multiplier added per AFK hour (capped at 4h).
 *           events = mic event ids that can fire while on this path (see `events`), plus the
 *           special id 'alone-drift' for friends drifting out of VC.
 *  events : { id: { label, lines[], sus:[min,max], funny?, bonus? } }  (mic events)
 *  lines  : { moved, drag, aloneLeave, aloneJoin, clipped } -> arrays of friend lines
 */
(function () {
  'use strict';

  var paths = [
    {
      id: 'walk-away', name: 'walk away', desc: 'classic. close the lid, leave the room',
      risk: 'highest multiplier, highest kick risk',
      pointMult: 1.35, susMult: 1.25, events: []
    },
    {
      id: 'muted-deaf', name: 'muted + deafened', desc: 'headphones off, mic muted, nobody can hear a thing',
      risk: 'safe: low suspicion, normal points',
      pointMult: 1.0, susMult: 0.6, events: []
    },
    {
      id: 'hot-mic', name: 'hot mic', desc: 'stay in VC unmuted and let the room speak for you',
      risk: 'high points, random mic events spike suspicion',
      pointMult: 1.3, susMult: 1.0, modes: ['no-timeout'],
      events: ['chewing', 'mom', 'flush', 'dog', 'anime', 'snore']
    },
    {
      id: 'alone-in-vc', name: 'alone in VC', desc: 'sit in the channel while your friends drift away',
      risk: 'slow points, low suspicion',
      pointMult: 0.75, susMult: 0.5, modes: ['no-timeout'], events: ['alone-drift']
    },
    {
      id: 'fell-asleep', name: 'fell asleep', desc: 'pass out at the desk, snoring into the mic',
      risk: 'points grow over time, suspicion grows faster later',
      pointMult: 0.8, susMult: 0.6, pointGrow: 0.4, susGrow: 0.55, events: ['snore']
    },
    {
      id: 'doomscroll', name: 'doomscroll', desc: 'just one more video. it is 3am. you are on video 400',
      risk: 'sneaky: low suspicion early, the hole gets deeper',
      pointMult: 0.9, susMult: 0.8, pointGrow: 0.3, susGrow: 0.7, events: ['autoplay', 'notif-ping']
    },
    {
      id: 'other-game', name: 'queue another game', desc: 'alt-tab into something else while "waiting"',
      risk: 'good points, friends can see your status',
      pointMult: 1.15, susMult: 1.1, events: ['status-spotted', 'game-rage']
    },
    {
      id: 'go-live', name: 'go live', desc: 'stream your empty chair to nine viewers',
      risk: 'big points, the stream can narrate you out',
      pointMult: 1.4, susMult: 1.2, modes: ['no-timeout'], events: ['stream-tts', 'viewer-clip', 'chat-reads']
    },
    {
      id: 'food-run', name: 'food run', desc: 'make a snack. it becomes a three course meal',
      risk: 'decent points, kitchen noises carry',
      pointMult: 1.1, susMult: 0.8, modes: ['no-timeout'], events: ['microwave', 'smoke-alarm']
    },
    {
      id: 'shower', name: 'long shower', desc: 'water running, mic still on the desk',
      risk: 'safe-ish, but you will sing',
      pointMult: 1.0, susMult: 0.85, modes: ['no-timeout'], events: ['singing', 'water-running']
    },
    {
      id: 'update-hell', name: 'windows update', desc: 'your PC chose this moment. it is at 37%',
      risk: 'slow points, very low suspicion, believable',
      pointMult: 0.7, susMult: 0.4, events: ['update-loop']
    },
    {
      id: 'go-invisible', name: 'go invisible', desc: 'appear offline, lurk. a green dot betrays you',
      risk: 'low suspicion until someone checks',
      pointMult: 0.95, susMult: 0.55, events: ['seen-online']
    },
    {
      id: 'touch-grass', name: 'touch grass', desc: 'go outside. like a person. for hours',
      risk: 'huge points, huge risk, friends hate it',
      pointMult: 1.5, susMult: 1.3, pointGrow: 0.3, events: ['outside-spotted']
    },
    {
      id: 'phone-call', name: 'take a call', desc: 'it is "quick". it is a 40 minute call',
      risk: 'solid points, your voice is on the line',
      pointMult: 1.1, susMult: 1.0, modes: ['no-timeout'], events: ['phone-voice', 'doorbell']
    },
    {
      id: 'gym', name: 'hit the gym', desc: 'gains over games. phone in the locker',
      risk: 'big points, gym selfies expose you',
      pointMult: 1.3, susMult: 1.15, events: ['gym-selfie', 'grunt']
    },
    {
      id: 'errand', name: 'run an errand', desc: '"i need milk". the store is across town',
      risk: 'okay points, believable, a bit random',
      pointMult: 1.05, susMult: 0.85, events: ['car-horn', 'store-text']
    },
    {
      id: 'family-dinner', name: 'family dinner', desc: 'dragged to the table. phone confiscated',
      risk: 'very safe, slow points, loud family',
      pointMult: 0.85, susMult: 0.45, modes: ['no-timeout'], events: ['dinner-call', 'cutlery']
    },
    {
      id: 'cat-takeover', name: 'cat takes the keyboard', desc: 'the cat sat down. you cannot move a sitting cat',
      risk: 'cute, chaotic, safe-ish',
      pointMult: 1.0, susMult: 0.7, modes: ['no-timeout'], events: ['cat-keys', 'cat-meow']
    },
    {
      id: 'date-night', name: 'on a date', desc: 'you forgot game night. it is a good date though',
      risk: 'huge points, huge suspicion, friends will talk',
      pointMult: 1.5, susMult: 1.35, events: ['date-spotted', 'waiter-voice']
    },
    {
      id: 'binge-watch', name: 'one more episode', desc: 'it is episode 9 of 24. you are sure it is the last',
      risk: 'points and suspicion both snowball',
      pointMult: 0.9, susMult: 0.7, pointGrow: 0.4, susGrow: 0.5, events: ['binge-laugh', 'spoiler-text']
    },
    {
      id: 'other-server', name: 'hang in another server', desc: 'a different friend group. a better one, maybe',
      risk: 'good points, friends can see you in their voice channel',
      pointMult: 1.2, susMult: 1.2, events: ['other-vc-spotted']
    },
    {
      id: 'laundry', name: 'do laundry', desc: 'the dryer beeped an hour ago. the folding is a saga',
      risk: 'low points, low suspicion, endless chores',
      pointMult: 0.75, susMult: 0.5, events: ['dryer-buzz', 'chore-chain']
    },
    {
      id: 'alarm-clock', name: 'set an alarm', desc: 'precision AFK: return right on your promised time',
      risk: 'return within 15% of your promise for a big on-time bonus',
      pointMult: 0.9, susMult: 0.7, punctual: 2.2, events: []
    },
    {
      id: 'sneak-out', name: 'slip out quietly', desc: 'nobody notices at first. then everybody does',
      risk: 'zero suspicion until well past your promise, then it sprints',
      pointMult: 1.1, susMult: 1.7, calm: 1.4, events: []
    },
    {
      id: 'ranked-queue', name: 'ranked placement matches', desc: 'bursts of intense play between long boring waits',
      risk: 'periodic surges: double points and double suspicion',
      pointMult: 0.85, susMult: 0.8, pulseEvery: 40, pulseLen: 12, pulsePts: 2.2, pulseSus: 2.2, events: ['game-rage']
    },
    {
      id: 'airplane-mode', name: 'phone on airplane mode', desc: 'nobody can reach you. nobody can even ping you',
      risk: 'no pings or triage, but suspicion still builds quietly',
      pointMult: 0.85, susMult: 1.15, silent: true, events: []
    },
    {
      id: 'power-nap', name: 'power nap', desc: 'a short rest. wake up and bail whenever',
      risk: 'early returns keep most points, but the ceiling is low',
      pointMult: 0.7, susMult: 0.45, earlyKeep: 0.8, events: ['snore']
    },
    {
      id: 'heist', name: 'the long con', desc: 'a plan with a calm start and violent spikes',
      risk: 'calm until you overstay, then surges of huge points and huge risk',
      pointMult: 0.9, susMult: 1.0, calm: 1.2, pulseEvery: 60, pulseLen: 15, pulsePts: 2.5, pulseSus: 2.6, events: []
    }
  ];

  var events = {
    chewing: {
      label: 'loud chewing',
      sus: [2, 5], funny: false,
      lines: [
        'is {me} EATING chips into the mic',
        'bro the crunching. THE CRUNCHING',
        '{me} stop chewing in my ear',
        'ASMR with {me} i guess',
        'he left his mic on and is eating cereal'
      ]
    },
    mom: {
      label: "{me}'s mom yelling in the background",
      sus: [3, 7], funny: true, bonus: 25,
      lines: [
        "was that {me}'s mom??",
        "'DID YOU TAKE OUT THE TRASH' lmaooo",
        "his mom is yelling and he's not even here",
        '{me} your mom wants you',
        "bro's mom just called him by his full name"
      ]
    },
    flush: {
      label: 'a toilet flushing',
      sus: [4, 8], funny: true, bonus: 20,
      lines: [
        'THAT WAS A FLUSH',
        'he took us to the bathroom with him',
        'bro is on the toilet with the mic on',
        'nobody asked for the audio {me}',
        'did {me} just flush. on voice.'
      ]
    },
    dog: {
      label: 'a dog barking',
      sus: [2, 5], funny: true, bonus: 15,
      lines: [
        "{me}'s dog is losing it",
        'who let the dogs out. {me}. {me} did.',
        'woof. bro your dog is in the call',
        "the dog is more present than {me} rn",
        'good boy honestly better teammate'
      ]
    },
    anime: {
      label: 'an anime opening at full volume',
      sus: [3, 6], funny: true, bonus: 30,
      lines: [
        'is that an anime opening',
        "{me} is watching anime and we're out here waiting",
        'BRO TURN IT DOWN lmao',
        "he's not afk he's just watching naruto",
        'the opening is a banger though ngl'
      ]
    },
    snore: {
      label: 'loud snoring',
      sus: [3, 7], funny: false,
      lines: [
        'is he SNORING',
        '{me} fell asleep on voice lmao',
        'the snoring is actually insane',
        "hhhhhhkkk zzz that's {me}",
        'somebody mute the snorer',
        'bro is out cold'
      ]
    },
    autoplay: {
      icon: '📱', tag: 'sound', label: 'a video autoplaying at full volume', sus: [2, 4], funny: true, bonus: 15,
      lines: ['is that a tiktok. is {me} on tiktok', 'bro the autoplay is so loud', '{me} is NOT afk he is on reels', 'ok who is playing the funny cat video']
    },
    'notif-ping': {
      icon: '🔔', tag: 'phone', label: 'a notification pinging nonstop', sus: [1, 3], funny: false,
      lines: ['{me} your phone is going off', 'ding ding ding. {me}.', 'who keeps texting {me}', 'bro silence your phone']
    },
    'status-spotted': {
      icon: '👀', tag: 'status', label: 'a friend spots you playing something else', sus: [4, 8], funny: false,
      lines: ['wait why does it say {me} is playing a different game', 'the activity feed says {me} is in ranked. RANKED.', 'brb my ass. you are in another lobby', 'caught. green dot, other game']
    },
    'game-rage': {
      icon: '🎮', tag: 'game', label: 'you rage in the other game', sus: [3, 6], funny: true, bonus: 20,
      lines: ['is that {me} screaming at a different game', 'he lost a round and now the whole server knows', 'bro is tilting on a game we are not playing']
    },
    'stream-tts': {
      icon: '📺', tag: 'stream', label: 'a donation TTS reads your name out loud', sus: [3, 6], funny: true, bonus: 25,
      lines: ['"{me} is not here, he is probably dead" - the tts', 'the stream is narrating {me} lol', 'did the tts just say {me}']
    },
    'viewer-clip': {
      icon: '🎬', tag: 'stream', label: 'a viewer clips your empty chair', sus: [2, 5], funny: true, bonus: 35,
      lines: ['someone clipped {me} not being there', '"empty chair simulator" has 4 views now', 'that clip of the chair is going places']
    },
    'chat-reads': {
      icon: '💬', tag: 'stream', label: 'stream chat roasts you out loud', sus: [3, 6], funny: false,
      lines: ['{me} your stream chat is roasting you', 'nine viewers and all nine hate {me}', 'chat says {me} is washed']
    },
    microwave: {
      icon: '🍕', tag: 'kitchen', label: 'a microwave beeping forever', sus: [2, 5], funny: true, bonus: 15,
      lines: ['BEEP BEEP BEEP. the microwave is done {me}', 'bro your pizza rolls are screaming', 'that is a lot of beeping for a snack']
    },
    'smoke-alarm': {
      icon: '🔥', tag: 'kitchen', label: 'a smoke alarm going off', sus: [5, 9], funny: true, bonus: 35,
      lines: ['IS THAT A SMOKE ALARM', 'is {me} on fire. he is on fire', '{me} the fire alarm. the FIRE alarm.']
    },
    singing: {
      icon: '🚿', tag: 'bathroom', label: 'full volume shower singing', sus: [3, 6], funny: true, bonus: 30,
      lines: ['is {me} SINGING', 'bro is hitting notes in the shower', 'the acoustics are actually good lol', 'someone get {me} a record deal']
    },
    'water-running': {
      icon: '💧', tag: 'bathroom', label: 'the shower running the whole time', sus: [1, 3], funny: false,
      lines: ['that is running water. that is {me} in the shower', 'we can hear the shower {me}', 'water water water. ok bro']
    },
    'update-loop': {
      icon: '🪟', tag: 'pc', label: 'your PC restarting for the third time', sus: [0, 2], funny: false,
      lines: ['{me} still updating?', 'windows update is undefeated', 'it is a legit excuse, give him a minute', 'restarting. again.']
    },
    'seen-online': {
      icon: '🟢', tag: 'status', label: 'your green dot flickers online', sus: [4, 8], funny: false,
      lines: ['wait he just went green', '{me} you are NOT invisible, i see you', 'ghost detected. green for half a second', 'caught lurking. {me}.']
    },
    'outside-spotted': {
      icon: '🌳', tag: 'outside', label: 'a friend sees your photo of the sky', sus: [3, 7], funny: true, bonus: 30,
      lines: ['is that {me} outside. touching grass', 'a sunset pic from {me}. he is not even home', 'bro is a tourist now', 'weather looks great there. not on voice though']
    },
    'phone-voice': {
      icon: '📞', tag: 'call', label: 'you on a loud phone call', sus: [3, 6], funny: true, bonus: 20,
      lines: ['is that {me} on the phone??', 'we can hear your whole call lol', '"yeah no i am just doing stuff" - {me}, to someone']
    },
    doorbell: {
      icon: '🚪', tag: 'home', label: 'the doorbell and a dog going crazy', sus: [2, 5], funny: true, bonus: 20,
      lines: ['somebody is at {me} door', 'DING DONG. package day', 'the delivery guy got more airtime than {me}']
    },
    'gym-selfie': {
      icon: '💪', tag: 'status', label: 'a gym selfie lands in a friend\'s feed', sus: [3, 7], funny: true, bonus: 20,
      lines: ['{me} posted a mirror pic. from the gym.', 'bro is lifting instead of playing', 'the biceps pic is nice but WHERE is {me}', 'gains > games apparently']
    },
    grunt: {
      icon: '🏋️', tag: 'audio', label: 'a very loud grunt on the mic', sus: [3, 6], funny: true, bonus: 25,
      lines: ['was that a GRUNT', '{me} is lifting with the discord open lol', 'the clang of weights in the background', 'bro ask for a spot, we hear it all']
    },
    'car-horn': {
      icon: '🚗', tag: 'audio', label: 'a car horn and traffic noise', sus: [2, 5], funny: false,
      lines: ['is {me} driving. DRIVING.', 'that was a car horn. {me} is outside', 'honk honk. where is he', 'traffic noise on {me} mic']
    },
    'store-text': {
      icon: '🛒', tag: 'phone', label: 'a store receipt text shows up', sus: [2, 4], funny: false,
      lines: ['{me} is at the store, i can see it', 'milk run takes hours apparently', 'the "i need milk" excuse is wearing thin']
    },
    'dinner-call': {
      icon: '🍽️', tag: 'home', label: 'family calling you to the table', sus: [1, 3], funny: true, bonus: 15,
      lines: ['"{me}, DINNER" lol', 'his mom has a very good dinner voice', 'ok fair, dinner beats gaming', 'bro is getting called for food']
    },
    cutlery: {
      icon: '🍴', tag: 'audio', label: 'forks and plates clinking', sus: [1, 3], funny: false,
      lines: ['clink clink clink', 'bro is at the table with us in the vc', 'we hear the dishes {me}']
    },
    'cat-keys': {
      icon: '🐈', tag: 'chat', label: 'the cat types in chat', sus: [1, 3], funny: true, bonus: 25,
      lines: ['asdfghjkl;; - {me}\'s cat', 'the cat is speaking in tongues', 'cat is typing. cat is better at this than {me}', 'cat sent "jjjjjjjjjjj"']
    },
    'cat-meow': {
      icon: '🐱', tag: 'audio', label: 'a very needy meow', sus: [2, 4], funny: true, bonus: 20,
      lines: ['MEOW. {me}, feed the cat', 'the cat is more present than {me}', 'meowww. that is the cat\'s demand']
    },
    'date-spotted': {
      icon: '🍷', tag: 'status', label: 'a friend sees you out with a date', sus: [5, 9], funny: true, bonus: 35,
      lines: ['wait is that {me} at a restaurant with someone', 'he is on a DATE. a DATE. while we wait', 'good for him actually, but also bad', '{me} has a life now apparently']
    },
    'waiter-voice': {
      icon: '🧑‍🍳', tag: 'audio', label: 'a waiter reading the specials over your mic', sus: [3, 6], funny: true, bonus: 30,
      lines: ['"and for the special tonight..." wait what', 'a stranger is reading a menu on my headset', 'bro took us to dinner with him']
    },
    'binge-laugh': {
      icon: '📺', tag: 'audio', label: 'you laughing at a show off-mic', sus: [2, 4], funny: true, bonus: 15,
      lines: ['is {me} laughing at something. ALONE', 'bro is watching a sitcom lol', 'big laugh from {me}, mic on', 'what are you watching {me}']
    },
    'spoiler-text': {
      icon: '💬', tag: 'chat', label: 'a friend spoils the episode you are on', sus: [1, 3], funny: false,
      lines: ['no spoilers {me} but the ending is wild', '{me} is on episode 9 and we all know it', 'the show is better than the game apparently']
    },
    'other-vc-spotted': {
      icon: '🎧', tag: 'status', label: 'you are seen in another server\'s voice channel', sus: [4, 8], funny: false,
      lines: ['wait {me} is in a different vc', 'who is "the other boys". explain.', '{me} found a new friend group. rip us', 'green, but in someone else\'s server']
    },
    'dryer-buzz': {
      icon: '🧺', tag: 'home', label: 'a dryer buzzing for the fifth time', sus: [1, 3], funny: false,
      lines: ['{me} the dryer', 'BZZZT. that is laundry', 'bro is doing chores in our time']
    },
    'chore-chain': {
      icon: '🧹', tag: 'home', label: 'one chore becomes six', sus: [0, 2], funny: false,
      lines: ['{me} is "just folding", sure', 'chores spiral. been there', 'if it is laundry it is a valid excuse']
    }
  };

  var lines = {
    moved: [
      'the afk bot got {me} lol',
      'rip {me}, afk channel',
      'he got moved. peak {me}',
      "see you in the afk channel {me}",
      'timeout bot ate him'
    ],
    drag: [
      'GOTCHA {me}',
      'dragging {me} to the afk channel',
      'enough. you are going to the afk channel',
      'sorry {me} but you have been gone too long',
      'moved him, we start without {me}',
      'vc kidnapping complete'
    ],
    aloneLeave: [
      'ima head to #memes',
      'i am going to go play something else',
      'gonna hop in another vc brb',
      'this lobby is dead, bye',
      "ok i'm out, tell {me} we left",
      'leaving vc, have fun talking to yourself'
    ],
    aloneJoin: [
      'back in vc, is {me} still gone',
      "yo i'm back. still nobody?",
      'rejoined. he is still not here',
      'back. {me}?? hello?',
      'hopping back in'
    ],
    clipped: [
      'chat clipped it',
      'CLIPPED. this is going in #clips',
      "someone clip that. oh i did",
      'that is going straight to #clips',
      'clipped and shipped'
    ]
  };

  var C = window.AFK_CONTENT = window.AFK_CONTENT || {};
  C.paths = (Array.isArray(C.paths) ? C.paths : []).concat(paths);
  var ev = C.pathEvents = (C.pathEvents && typeof C.pathEvents === 'object') ? C.pathEvents : {};
  Object.keys(events).forEach(function (k) { if (!(k in ev)) ev[k] = events[k]; });
  var ln = C.pathLines = (C.pathLines && typeof C.pathLines === 'object') ? C.pathLines : {};
  Object.keys(lines).forEach(function (k) { ln[k] = (Array.isArray(ln[k]) ? ln[k] : []).concat(lines[k]); });
})();
