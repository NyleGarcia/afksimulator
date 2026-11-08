/* AFK Simulator characters. Registers on window.AFK_CONTENT.characters (entries are appended to anything already there).
 * Tokens in any line: {me} player handle, {p} promised time, {t} time away so far.
 * See CONTENT.md for the full schema.
 *
 *  { id, name, color, role: 'friend' | 'resident' | 'bot',
 *    tags?: [..], rival?: true,
 *    lines?: { ask, ok, chill, low, mid, high, good, meh, bad, reused, early, kickAfter, ... : [..] },
 *    digs?:  [{ text, when?: { susMin, susMax, paths:[ids], modes:[ids], minLateRatio, afterKick } }],
 *    // residents only:
 *    status?: [..], timerMin?, timerMax?, timerDayMins? }
 */
(function () {
  'use strict';

  var characters = [
    // ---------- friends ----------
    {
      id: 'brody', name: 'Brody', color: '#e67e22', role: 'friend', tags: ['gym', 'loud'],
      lines: {
        ok: ['k bro hurry', 'cool, protein shake time'],
        high: ['BRO. {t}.', 'i did a whole workout in the time {me} has been gone']
      },
      digs: [
        { text: "it's been {t}. he said {p}. my sourdough starter has better attendance than {me}", when: { susMin: 35 } },
        { text: '{me} said {p} like it was a contract and not a suggestion', when: { susMin: 35, minLateRatio: 3 } },
        { text: "bro physically walked away from his keyboard. i can't even get that commitment from my gym membership", when: { susMin: 55, paths: ['walk-away'] } },
        { text: 'no-timeout server and he STILL found a way to vanish. respect, honestly', when: { susMin: 50, modes: ['no-timeout'] } },
        { text: 'i did leg day, ate, and rewatched the whole match. {me} is still "one sec"', when: { susMin: 70, minLateRatio: 6 } },
        { text: "rip {me}. you'll be remembered as 'the {p} guy'", when: { afterKick: true } }
      ]
    },
    {
      id: 'kev', name: 'kev', color: '#4aa3df', role: 'friend', tags: ['deadpan', 'sarcastic'],
      lines: {
        low: ['{me}. buddy.', 'cool. cool cool cool.'],
        kickAfter: ['wow. shocking.', 'my disappointment is immeasurable and also my day is fine']
      },
      digs: [
        { text: "{t}. i've aged. my houseplants have died. {me} said {p}", when: { susMin: 35 } },
        { text: 'muted AND deafened. so he is not even pretending to listen. bold', when: { susMin: 35, paths: ['muted-deaf'] } },
        { text: 'at this point {me} is a rumor', when: { susMin: 60 } },
        { text: "if i hear one more chip crunch from {me} i'm filing a complaint with the vc council", when: { susMin: 40, paths: ['hot-mic'] } },
        { text: "'{p}' is a unit of time {me} has never met", when: { susMin: 45, minLateRatio: 6 } },
        { text: 'kicked. my therapist said to celebrate small wins', when: { afterKick: true } }
      ]
    },
    {
      id: 'moistturtle', name: 'MoistTurtle', color: '#2ecc71', role: 'friend', tags: ['slow', 'wholesome'],
      lines: {
        chill: ['no rush. turtles never rush.', 'ok take ur time, i found a snack'],
        mid: ['{me}... buddy... pal...']
      },
      digs: [
        { text: "i've been sitting here {t}. turtles are patient, but {me} is testing the species", when: { susMin: 35 } },
        { text: 'pretty sure {me} is asleep. i can feel it in my shell', when: { susMin: 40, paths: ['fell-asleep'] } },
        { text: '{me} has been "one sec" since before i learned this song', when: { susMin: 60 } },
        { text: "the bot's gonna move him soon. it's like watching a nature documentary", when: { susMin: 35, modes: ['afk-timeout'] } },
        { text: 'i wrote {me} a poem while waiting. it rhymes "{p}" with "lie"', when: { susMin: 55, minLateRatio: 4 } },
        { text: 'he is gone. like my hopes for {p}', when: { afterKick: true } }
      ]
    },
    {
      id: 'dani', name: 'dani', color: '#e84393', role: 'friend', tags: ['receipts', 'savvy'],
      lines: {
        reused: ['i have a spreadsheet of your excuses, {me}', 'excuse #2 of this exact type. noted.'],
        bad: ['nope. denied.']
      },
      digs: [
        { text: "screenshotting this: '{p}' vs {t}. for the group chat", when: { susMin: 35 } },
        { text: 'i have the receipts, {me}. i have ALL the receipts', when: { susMin: 60 } },
        { text: 'who left {me} alone in vc. that is sad and also kind of hilarious', when: { susMin: 35, paths: ['alone-in-vc'] } },
        { text: "{me} is {t} into a '{p}' and acting like that's normal", when: { susMin: 45, minLateRatio: 4 } },
        { text: "the afk bot is doing more work than you tonight, {me}. that's the whole review", when: { susMin: 35, modes: ['afk-timeout'] } },
        { text: 'calling it: the {p} lie was always going to end like this', when: { afterKick: true } }
      ]
    },
    {
      id: 'xxsniperxx', name: 'xXSniperXx', color: '#a77bd6', role: 'friend', rival: true, tags: ['edgy', 'trash-talk'],
      lines: {
        high: ['{me} just got no-scoped by his own excuses', 'my 360 is faster than {me} coming back'],
        good: ['ok fine you live']
      },
      digs: [
        { text: "bro. {t}. i could've hit 47 noscopes by now", when: { susMin: 35 } },
        { text: "{me} got less accurate than my aim. the {p} lie missed completely", when: { susMin: 55 } },
        { text: 'walked away mid-queue. no honor. no loot. no dignity', when: { susMin: 40, paths: ['walk-away'] } },
        { text: 'no-timeout server and he STILL pulled a vanishing act. lowkey legendary, fully punishable', when: { susMin: 50, modes: ['no-timeout'] } },
        { text: "'{p}' my left foot. you're {t} deep, {me}", when: { susMin: 45, minLateRatio: 5 } },
        { text: 'GG {me}. the clip of the kick is going on my channel', when: { afterKick: true } }
      ]
    },

    // ---------- the AFK channel residents (one is picked per session) ----------
    {
      id: 'ghost-gary', name: 'ghost_of_gary', color: '#9aa0a6', role: 'resident', tags: ['ghost'],
      status: ['haunting the afk channel', 'last seen: 2019', 'do not disturb (deceased)', 'rattling chains softly'],
      lines: { idle: ['…', 'ooOOooOO', 'gary was here', '…', 'boo. (quietly)'] }
    },
    {
      id: 'janitor-bot', name: 'Janitor-Bot', color: '#7a86b6', role: 'resident', tags: ['bot'],
      status: ['sweeping idle sessions', 'moving users since 2021', 'uptime: yes', 'no tasks queued'],
      lines: { idle: ['…', 'beep. idle user detected.', 'beep boop (judgmentally)', '…'] }
    },
    {
      id: 'dave', name: 'Dave', color: '#c9a66b', role: 'resident', tags: ['friend', 'left-for-a-minute'],
      timerMin: 900, timerMax: 3000,
      status: ['left for a minute', 'brb (day 1)', 'be right back, promise', 'one sec'],
      lines: { idle: ['…', 'brb', "ok i'm back. just kidding", 'one sec', '…'] }
    },
    {
      id: 'sleepy-steve', name: 'sleepy_steve', color: '#6fa8a0', role: 'resident', tags: ['sleepy'],
      status: ['zzz', 'dreaming about #clips', 'napping (professionally)', 'do not wake'],
      lines: { idle: ['…', 'zzz', 'five more minutes', '…', 'mmf'] }
    },
    {
      id: 'nobody', name: 'xX_Nobody_Xx', color: '#b084a0', role: 'resident', tags: ['mystery'],
      timerMin: 400, timerMax: 1100,
      status: ['nobody knows how he got here', 'who invited him?', 'just vibing', 'seen by everyone, spoken to by no one'],
      lines: { idle: ['…', 'hi', '…', 'you new here?'] }
    },

    // ---------- bots ----------
    {
      id: 'afk-bot', name: 'AFK-Bot', color: '#5865f2', role: 'bot', tags: ['moderation']
    }
  ];

  var C = window.AFK_CONTENT = window.AFK_CONTENT || {};
  C.characters = (Array.isArray(C.characters) ? C.characters : []).concat(characters);
})();
