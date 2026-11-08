/* BoberNet pack: message templates. Slots: {place} {ship} {role} {cargo} {event} {org} {shipProblem} {nickname} {activity} {me} {p} {t}.
   Slot tag filter: {place:pvp-hotspot}. Entries: { t, tags, w }. */
window.AFK_PACKS = window.AFK_PACKS || {};
window.AFK_PACKS.bobernet = window.AFK_PACKS.bobernet || {};

(function () {
  function T(tags, list) {
    return list.map(function (s) {
      var w = 1, t = s;
      if (Array.isArray(s)) { t = s[0]; w = s[1]; }
      return { t: t, tags: tags.slice(), w: w };
    });
  }

  window.AFK_PACKS.bobernet.templates = {
    mood: {
      ask: T(['ask'], [
        "{me} u still there or did the {shipProblem} get you",
        "yo {me}, thought you said {p}? it's been {t}",
        "{me}?? the {ship} needs a {role} and you're the only one who owns the pledge",
        "@{me} blink twice if you're alive",
        "{me} are you coming to {event} or nah",
        "anyone seen {me}? last msg was 'brb {p}'. that was {t} ago",
        "{me} quick q, are you afk-afk or Star Citizen afk",
        "{me} do you still have the {cargo} or did you sell it to a stranger",
        "ping {me}. we're about to {activity} and need bodies"
      ]),
      chill: T(['chill'], [
        "no rush {me}, we're just {activity}",
        "take your time {me}, {ship} isn't going anywhere (it might, the servers are bad)",
        "{me} brb'd. respect. hydrate king",
        "it's only been {t}, {me} is fine, probably",
        "we're chilling at {place}, whenever {me} gets back",
        "{me} is probably just stuck in a loading screen, normal tuesday",
        "all good, {nickname} is still fueling the {ship}"
      ]),
      low: T(['low'], [
        "{me} said {p} but this is {t}. math isn't mathing",
        "hm {me} has gone quiet",
        "{me} brb'd for {t} and counting",
        "is {me} still in the elevator? asking for the {org}",
        "{me}'s status is 'online' but the lights are off",
        "we waited. {me} did not appear. tragic"
      ]),
      mid: T(['mid'], [
        "{me} it's been {t}. the {ship} is getting cold",
        "ok at what point do we declare {me} missing in action",
        "{me} you said {p}. we all heard you. {t} later we are still here",
        "{nickname}: 'is {me} dead or just {activity}?'",
        "{me} we are literally at {place} rn, get on",
        "the {org} meeting started. {me} has the agenda and the snacks",
        "{me}'s afk timer is longer than a {cargo} run to {place}"
      ]),
      high: T(['high'], [
        "{me} IT HAS BEEN {t}. WHERE ARE YOU",
        "@{me} @{me} @{me} we are losing the {ship} and your {role} slot is empty",
        "{me} if you're not back in 5 we're reassigning your hangar",
        "everyone say goodbye to {me}, lost to the {event}",
        "{me} you've been gone {t}. {nickname} started a funeral thread",
        "I am removing {me} from the {org} org chart live, on stream"
      ]),
      good: T(['good'], [
        "{me} always delivers, {p} excuse was valid",
        "ok {me} is back and the {ship} is fine, we forgive",
        "{me} came through, no notes",
        "nice one {me}, {activity} went smooth",
        "{me} said {p}. {me} gave us {t}. fair enough"
      ]),
      meh: T(['meh'], [
        "ok {me}, sure, {t} for a {p} brb, sure",
        "{me} we believe you. mostly",
        "{me} explanation: acceptable. vibe: suspicious",
        "{me} is back. the {ship} is not. whatever",
        "noted {me}. {nickname} is keeping a spreadsheet"
      ]),
      bad: T(['bad'], [
        "{me} that excuse didn't even sound like a real {shipProblem}",
        "{me} we're done believing you. {org} trust level: zero",
        "your {role} spot got filled while you were gone, {me}",
        "{me} came back with nothing. no {cargo}, no excuse, no shame",
        "we got wrecked at {place} and {me} 'was reading the patch notes'"
      ]),
      reused: T(['reused'], [
        "{me} you used that exact excuse last time",
        "'{shipProblem}' again? {me} that's the third time this month",
        "{me} pls rotate your excuses like the {org} rotates hangar duty",
        "same story, {me}. we have receipts",
        "{nickname}: 'that excuse has been in the fleet longer than the Constellation'"
      ]),
      early: T(['early'], [
        "{me} came back early?? who are you and what did you do with {me}",
        "wait {me} is already back? it's only been {t}",
        "{me} returned before {p}. bugs in the matrix",
        "early return from {me}. suspicious. please hold for inspection"
      ]),
      kickAfter: T(['kickAfter'], [
        "{me} has been removed from {org}. reason: afk",
        "{nickname} used /kick on {me}. the {ship} lives on without you",
        "{me} left the server (they were never here)",
        "the {org} council voted. {me} is out after {t}",
        "{me} got kicked. server rules: 'if {t} then bye'"
      ])
    },

    orgFight: T(['orgfight', 'ping'], [
      "we're hitting {place}, {me} get in a {ship}",
      "org fight at {place} in 10, {me} you're on {role}",
      "{me} {event} just popped at {place}, we need every {ship}",
      "@everyone hitting {place}, {me} bring the {ship} and your good armor",
      "{me} we need you at {place} NOW, {nickname} already pulled the {ship}",
      "all hands to {place}. {me} you've got {role}. don't make us ask twice",
      "{me} {org} is rolling to {place}, bring snacks and a spare {ship}",
      "forming up for {place}. {me} you're our {role}, no pressure (lots of pressure)",
      "{me} the fleet is spooling at {place}, we leave in 5 with or without you",
      "{event} at {place}, {me} get on voice, I can hear {nickname} screaming already",
      "org op: {activity} at {place}. {me} is flying the {ship}, {nickname} is crying",
      "{me} we're short one {role} for {place}. you're also short one excuse",
      "rally at {place}, {me} please be here this time",
      "{me} I swear if you miss {event} again I'm assigning you cargo duty"
    ]).concat(T(['orgfight', 'pvp'], [
      "{place:pvp-hotspot} is hot, {me} bring a {ship} and a prayer",
      "{me} we're jumping into {place:pvp-hotspot} for {event}. wear the armor with the nice colors"
    ])),

    pvpJab: T(['pvp', 'jab'], [
      "{me} is probably solo-flying an Idris again, it's been {t}",
      "{me} is somewhere in a {ship} getting ganked by a rando at {place}",
      "bet {me} is hiding in the {ship} cockpit while the fight is on",
      "{me} dodged the {event} by being offline. strategic genius",
      "{me} the pirates at {place} took your {cargo} and your dignity",
      "{me} the only thing you've killed this week is the {org} schedule",
      "{me} flew into {place} alone. we were there. we watched. no one helped",
      "{me}'s idea of PvP is 'brb' for {t}",
      "{me}: 'I'll just solo {place}.' narrator: they did not",
      "{me} got stuffed by a lone {ship} at {place}. shame",
      "{nickname}: '{me}'s k/d is directly proportional to their afk time'",
      "{me} is the reason {org} has a 'no friendly fire' rule"
    ]),

    returnFight: T(['return', 'fight'], [
      "{me} you missed {event} at {place} cuz you were afk for {t}",
      "oh look {me} is back, the fight ended {t} ago",
      "welcome back {me}, we lost the {ship} and the {event}",
      "{me} we needed you at {place} and you were {activity}",
      "nice of you to join, {me}. {nickname} died twice carrying your {role}",
      "{me} you ghosted the {event} at {place}. the {org} noticed",
      "the fight is over {me}. thanks for the moral support"
    ]),

    welcomeBack: T(['welcomeback'], [
      "welcome back, the Idris is dead",
      "{me} welcome back, the {ship} is dead and {nickname} is angry",
      "welcome back {me}, we lost {place} while you were afk {t}",
      "oh hey {me}, you missed it: {event} happened and the {ship} is gone",
      "welcome back, the {org} lost {place}. thanks for the afk",
      "{me} you're back! the {ship} is now a very expensive scrap pile",
      "welcome back {me}. fun fact: your {role} spot is now {nickname}'s",
      "{me} rejoined after {t}. the Idris is a smoking crater, hope you're proud"
    ]),

    leftOnRead: T(['leftonread', 'fight'], [
      "{me} left on read during the fight at {place}",
      "{me} seen. {me} did not show. {nickname} cried",
      "ping sent to {me}, read receipt received, {me} never appeared at {place}",
      "{me} read the org-fight ping and chose peace. we chose violence",
      "{me} left us on read right before {event}. cold",
      "I tagged {me} three times for {place}. 'seen {t} ago'",
      "{me} saw the {place} call at {p} and has been 'typing...' since",
      "{me}'s last read message was our org-fight call. last seen: never"
    ]),

    crash30k: T(['30k', 'crash'], [
      "{me} 30k'd out of {place} again, classic",
      "server crash at {place}, {me} 'got 30k'd' (or just got bored)",
      "{me} says 'I got 30k'd' for the third time this week. the {org} is skeptical",
      "30k server error while {me} was 'mid-fight' at {place}. convenient",
      "{me}: 'my {ship} just got 30k'd.' lol sure. it's been {t}",
      "{nickname}: 'if I got a credit for every {me} 30k excuse I could buy a {ship}'",
      "{me} 30k'd mid-{activity}. the server wasn't even down",
      "pls {me} just say you went to get food, the 30k excuse is exhausted",
      "the servers 30k'd at {place}, {me} 30k'd with them. suspicious timing",
      "{me} got 30k'd and lost the {cargo}. the 30k giveth, the 30k taketh"
    ]),

    claimTimer: T(['claim', 'insurance'], [
      "{me} your {ship} claim timer is at 59 minutes. go touch grass or wait",
      "claim the {ship} {me}, the insurance timer is longer than your afk",
      "{me} your {ship} is in the claim queue, estimated wait: {t}",
      "{me} filed a claim on the {ship}, then went afk before it finished",
      "{me}: 'my {ship} is stuck in the claim timer.' it's been {t}, {me}",
      "insurance says the {ship} is 'being prepared'. so is {me}'s excuse",
      "{nickname}: 'claim timer on the {ship} is 2 hrs, {me} afk timer is 3'",
      "{me} I swear the insurance timer is faster than you getting back",
      "your {ship} is claim-ready, {me}. unlike you",
      "{me} lost the {ship} and the claim timer is now the only thing you're waiting on besides us"
    ]),

    elevatorDoom: T(['elevator', 'doom'], [
      "{me} is stuck in the elevator of doom at {place} again",
      "{me} took the elevator at {place} and has not been seen since",
      "elevator of doom update: {me} has been in there {t}",
      "{me} said 'brb' and went into the {place} elevator. rip",
      "the elevator at {place} ate {me}'s {ship} and {me}",
      "{me} fell through the floor at {place}. normal day in the verse",
      "{nickname}: '{me} is probably vibing in the elevator of doom'",
      "pls someone rescue {me} from the elevator at {place}",
      "{me} elevator lag: {t}. not a bug, a lifestyle",
      "{me} pressed the button for {place} and ended up in another dimension"
    ]),

    cargoRun: T(['cargo'], [
      "{me} is on a cargo run to {place} with 12 SCU of {cargo}. it's been {t}",
      "{me} 'just a quick {cargo} run' means {t} of nothing",
      "{me} hauling {cargo} to {place}? do the math, that's a 2 hour trip",
      "{me} the {cargo} won't deliver itself. wait, actually...",
      "{nickname}: '{me}'s cargo run is just long-term afk with extra steps'",
      "{me} lost the {cargo} at {place}. again. report to hangar duty",
      "{me} says the {cargo} run is almost done. {t} later: not done",
      "cargo update: {me} is {t} into a {cargo} haul and has delivered nothing",
      "{me} turned a {cargo} run into a camping trip at {place}",
      "{me} we need the {cargo} for {event} at {place}. where is it"
    ]),

    wen: T(['wen'], [
      "wen {me} back?",
      "wen {ship}? wen {me}? wen anything?",
      "{me} wen is 'soon' in CIG time or real time",
      "wen {event}? wen {me}? same answer: unknown",
      "{nickname}: 'wen {me}' / {me}: *silence* / {nickname}: 'ok'",
      "wen {place} fix? wen {me} fix? both broken",
      "{me} wen. just wen. we're asking",
      "wen {me} back, wen {ship} patch, wen life",
      "ok but wen {me} actually joins {event}",
      "{me} wen is the question of the hour and you've been gone {t}"
    ]),

    misc: T(['misc'], [
      "{me} we just had a whole {event} and you didn't even log in",
      "{me} how do you have {role} access and zero availability",
      "{me} you've been afk {t} and I just heard {nickname} say '{activity}'",
      "the {org} says hi {me}. also says where are you",
      "{me} if you read this, we're at {place}. if you don't, we're at {place}",
      "just a reminder {me}: {ship} fuel is not free. and neither is waiting",
      "{me} we need someone to {activity}. you're the only one who didn't say no (you didn't say anything)",
      "{me} the {shipProblem} is fixed. you can come back now. this is a trap",
      "gm {me}. gn {me}. it's the same message, you're always gone",
      "{me} {nickname} said you're 'running a {cargo} corporation'. we all know that's just afk",
      "the {org} meeting is next week, {me}. we know you won't attend. we're booking you anyway",
      "{me} your {ship} has a {shipProblem} and so do we, since you left",
      "{me} we are not mad, just disappointed, and a little mad",
      "can someone ping {me} into existence"
    ])
  };
})();
