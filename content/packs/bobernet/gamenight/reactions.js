/* BoberNet pack: Game Night friend reactions (ship / org flavour). Tokens: {me} {friend} {day} {time} {game} {week} {cause} {prop}. */
(function () {
  var P = window.AFK_PACKS = window.AFK_PACKS || {};
  var B = P.bobernet = P.bobernet || {};
  var G = B.gamenight = B.gamenight || {};
  var R = G.reactions = G.reactions || {};
  R.byBand = R.byBand || {};
  var bb = {
    calm: {
      impressed: [
        { t: "{me}. {cause}?? ok that's actually a real problem", eMin: 11 },
        { t: "honestly valid. {cause} is a legit reason", eMin: 11 },
        { t: "{cause}. i hate that i believe you", eMin: 11 },
        { t: "ok {me} that is a top-tier excuse, the org will hear about this", eMin: 16 },
        { t: "{cause}?? i'm putting that in the org newsletter", eMin: 16 },
        { t: "i would've bought it from a hangar clerk. respect", eMin: 16 },
        { t: "{me} that is the most elaborate thing i've heard since the elevator saga", eMin: 21 },
        { t: "i'm framing this. {cause}. the legend of {me}", eMin: 21 },
        { t: "someone clip {cause} for the org highlight reel", eMin: 21 }
      ],
      neutral: ["ok np {me}, next {day}", "all good, fly safe", "np, we'll do cargo without you", "ok i'll tell the org you're stuck", "fine. {game} is not going anywhere. unlike your ship", "cool, will save you a seat in the hangar"],
      exasperated: [
        { t: "{me} it's week {week} already", lvl: 1 },
        { t: "ok but you said the same thing in the last patch cycle", lvl: 1 },
        { t: "alright. again. noted", lvl: 1 },
        { t: "{me} we've skipped {game} so many times the ship got dust", lvl: 2 },
        { t: "week {week}. the org is starting a betting pool on you", lvl: 2 },
        { t: "i love you {me} but my ship has aged waiting for you", lvl: 2 },
        { t: "{me} i have been waiting in the hangar since week one", lvl: 3 },
        { t: "the org put your name on the 'maybe' list. permanently", lvl: 3 },
        { t: "week {week}. i have started naming my ships after your excuses", lvl: 3 }
      ],
      detective: ["hm. noted", "interesting timing though", "sure. i'll just check the logs", "i believe you, mostly", "that's... plausible. for now"]
    },
    eyebrow: {
      impressed: [
        { t: "ok {cause} is weirdly specific so i believe it", eMin: 11 },
        { t: "{cause}?? you're not making that up, nobody makes that up", eMin: 11 },
        { t: "that's a lot of detail. {me} you're either telling the truth or you're good", eMin: 16 },
        { t: "{cause} is too stupid not to be true", eMin: 16 },
        { t: "that's an award-winning excuse and i'm furious about it", eMin: 21 },
        { t: "{me}, it was a work of art. a lie, but art", eMin: 21 }
      ],
      neutral: ["uh huh. ok", "right. fine", "alright {me}", "sure, i guess", "hm. next {day} then", "ok. keep us posted"],
      exasperated: [
        { t: "again? ok", lvl: 1 },
        { t: "that's the third patch-related thing this month", lvl: 1 },
        { t: "you know the game works fine for the rest of us, right", lvl: 1 },
        { t: "{me} week {week}. at some point a pattern is just a personality", lvl: 2 },
        { t: "it's always the servers with you. or the ship. or the elevator", lvl: 2 },
        { t: "your ship has more excuses than hull plating", lvl: 2 },
        { t: "{me} i'm not mad i'm just tired of flying solo", lvl: 3 },
        { t: "week {week}. i stopped refuelling my ship for you", lvl: 3 }
      ],
      detective: ["huh. interesting", "you said that kind of thing before though", "mm. I have a spreadsheet and it disagrees", "wait say that again", "that doesn't sound like how that bug works"]
    },
    sus: {
      impressed: [
        { t: "ok i came here to roast you and instead i'm impressed. {cause}!", eMin: 11 },
        { t: "{cause}. i can't prove it's fake so i'm mad", eMin: 11 },
        { t: "you're either a genius or the unluckiest pilot alive. {cause}", eMin: 16 },
        { t: "fine. you win this one {me}. {cause} is airtight", eMin: 16 },
        { t: "i checked the patch notes and {cause} is not in them. you're a legend", eMin: 21 },
        { t: "no one lies this hard. {me} is a certified liar-pilot", eMin: 21 }
      ],
      neutral: ["I'll believe it when I see the clip", "mm. sure", "{me} keep your story straight, ok", "noted. in the ledger it goes", "fine. but I'm watching"],
      exasperated: [
        { t: "{me}. really?", lvl: 1 },
        { t: "oh the ship thing again", lvl: 1 },
        { t: "{me} I don't even get angry anymore. I just sigh", lvl: 2 },
        { t: "week {week} and the story gets worse each time", lvl: 2 },
        { t: "your ship has been 'in claim' longer than the game's been in alpha", lvl: 2 },
        { t: "{me} I refuse to believe the elevator is that evil", lvl: 3 },
        { t: "at this point I'm not even curious. I'm just sad", lvl: 3 },
        { t: "week {week}. I've started playing with the bots. they show up", lvl: 3 }
      ],
      detective: ["oh really. in what hangar", "ok then explain {cause}", "you told {friend} something different", "uh huh. and where's the clip", "I'm opening the ledger", "that's the second time you've said that. check the dates"]
    },
    detective: {
      impressed: [
        { t: "FINE. {cause}. I can't find a hole. I hate it", eMin: 11 },
        { t: "I came with receipts and you left me with {cause}. well played", eMin: 11 },
        { t: "ok I've checked everything and {cause} is clean. who are you", eMin: 16 },
        { t: "{me}, you are a worthy adversary. {cause} holds up", eMin: 16 },
        { t: "case closed. I have no questions. this is horrifying", eMin: 21 },
        { t: "that was the most committed lie I've ever audited. {cause}. unreal", eMin: 21 }
      ],
      neutral: ["interesting. noted for the file", "I'll allow it. barely", "ok but I'm keeping the clip request open", "fine. I'll check the logs after", "{me} I'm giving you a pass. just this one", "ok. but the ledger remembers"],
      exasperated: [
        { t: "{me}. I'm too tired to cross-examine you", lvl: 1 },
        { t: "it's literally in the ledger, you did this already", lvl: 1 },
        { t: "week {week}. the audit continues", lvl: 2 },
        { t: "{me} I could write a book about your hangar incidents", lvl: 2 },
        { t: "I have a folder just for your ship stories. it's full", lvl: 2 },
        { t: "{me} the committee finds you guilty of being absent", lvl: 3 },
        { t: "week {week}. the org auditor wants a word with you", lvl: 3 }
      ],
      detective: ["you're lying and I can prove it", "check the ledger. check the date. check your face", "explain. now", "no. no no no. that contradicts last week", "I have the timeline here and it does not add up", "{me} you've got 8 seconds to prove it", "oh so you've got a ship in claim AND a 30k run? sure"]
    }
  };
  Object.keys(bb).forEach(function (band) {
    R.byBand[band] = R.byBand[band] || {};
    Object.keys(bb[band]).forEach(function (kind) {
      R.byBand[band][kind] = (R.byBand[band][kind] || []).concat(bb[band][kind]);
    });
  });
  function add(k, arr) { R[k] = (R[k] || []).concat(arr); }
  add('repeat', [
    "we've heard about {cause} before. do you have a new one",
    "{cause} again? that was last cycle's excuse",
    "{me} the patch cycle ended. so did {cause}",
    "recycling {cause}, nice. very sustainable",
    "{cause}. you used that one in the previous patch, check the log"
  ]);
  add('contradiction', [
    { t: "wait. you said {cause} but your ship is in claim?", needsTag: 'claim' },
    { t: "you said your ship was wiped. how are you hauling a big cargo?", needsTag: 'ship-lost' },
    { t: "hold on, you were in a big haul. now you're double-booked?", needsTag: 'big-haul' },
    { t: "pirates took your cargo but you have a cargo glitch? which is it", needsTag: 'pirate' },
    { t: "you were stuck in the wall last week. how are you in the elevator", needsTag: 'cargo-glitch' },
    { t: "your ship was wiped two weeks ago and now you're in an org op? with what", needsTag: 'ship-lost' }
  ]);
  add('callbackReward', [
    "{cause}?? the lore continues",
    "{cause} is still going. that's commitment",
    "ok I'll give you consistency points for {cause}",
    "the {cause} saga is my favourite series",
    "{me} {cause} is the only thing you've been reliable about"
  ]);
  add('proofDemand', [
    "ok show me {prop}",
    "pics or it didn't happen. {prop}",
    "we need {prop}. the org requires receipts",
    "{prop} or it's a no-show"
  ]);
  add('proofPass', [
    "ok I hate that {prop} is real",
    "valid. {prop} matches the log",
    "ok ok ok. {prop} is legit. I'll stop",
    "annoyingly consistent"
  ]);
  add('proofPerfect', [
    "{prop} was flawless. I'm quitting my detective job",
    "the org ledger has been updated: {me} is honest. suspiciously",
    "no further questions, your honour"
  ]);
  add('proofFail', [
    "that's not {prop}. that's a menu",
    "ok that one was a desktop wallpaper",
    "that contradicts what you said. gotcha"
  ]);
  add('strike', [
    "that's a strike. the org is watching",
    "strike. add it to your hangar wall",
    "{me} one more and the ship goes in claim, permanently",
    "strike. you know the drill"
  ]);
  add('strikeFinal', [
    "{me} you've been removed from the org. fly safe",
    "final strike. the org has voted. goodbye {me}",
    "you've been kicked. your ship is now property of the org"
  ]);
  add('detectiveRise', [
    "{me} I've started a case file on you",
    "the org's lead investigator is me now",
    "I'm taking notes in the margins of the ledger"
  ]);
  add('detectiveStandDown', [
    "fine, you're clean. the ledger is archived",
    "I've lowered my flags. don't make me raise them",
    "case closed. you win this round",
    "stand-down. I'll go back to flying cargo"
  ]);
  add('detectiveQuiz', [
    { t: "what was the witness's name again", ask: 'witness' },
    { t: "what exactly was the proof?", ask: 'proof' },
    { t: "what happened first, say it step by step", ask: 'cause' },
    { t: "and what did you promise at the end?", ask: 'promise' }
  ]);
  add('believed', [
    "ugh patch day. fair",
    "np. send a clip later",
    "np, we'll ping you when the ship is out of claim",
    "ok the org understands"
  ]);
  add('proofDecoys', [
    { label: 'beach holiday photo', tags: ['abroad'] },
    { label: 'gym check-in', tags: ['injured'] },
    { label: 'festival wristband', tags: ['sick'] },
    { label: 'ship in fresh paint', tags: ['ship-lost', 'claim'] },
    { label: 'screenshot of a clean hold', tags: ['cargo-glitch', 'contract'] },
    { label: 'org picture from last op', tags: ['org-op'] },
    { label: 'clip of me flying fine', tags: ['quantum', 'hangar', 'bed-clip'] },
    { label: 'receipt for a new ship', tags: ['ship-lost'] },
    { label: 'pirate-free patrol log', tags: ['pirate'] }
  ]);
  R.friendLines = R.friendLines || {};
  R.friendLines._roaster = {
    neutral: ["wow, another cancel. the hangar is shocked", "colour me surprised. my ship is parked and so is your attendance"],
    exasperated: ["your excuses have more downtime than the servers", "{me} you cancel more than the shard crashes"],
    detective: ["that story has less cover than a cargo ship in a gunfight"]
  };
  R.friendLines._hype = {
    impressed: ["FLEET NIGHT LEGEND!! that excuse could dock a carrier", "that's an org-wide hall of fame lie!!"],
    neutral: ["no worries!! next op is gonna be HUGE"],
    exasperated: ["I polished the hangar for NOTHING {me}"]
  };
  R.friendLines._chill = {
    neutral: ["np, the ships aren't going anywhere", "all good, fly safe"],
    exasperated: ["it's cool. the hangar is just quiet now"],
    detective: ["hmm. the story has a few loose bolts"]
  };
  R.friendLines._rival = {
    neutral: ["more cargo for me then", "good. the leaderboard is mine this week"],
    exasperated: ["I'm winning org rank by default, thanks {me}"],
    detective: ["I had the receipts saved since patch day"]
  };
  R.friendLines._chaotic = {
    impressed: ["my ship exploded just from reading that. in a good way"],
    neutral: ["ok sure. anyone seen my ship? I parked it somewhere"],
    exasperated: ["I brought a whole fleet for nothing and also a sandwich"]
  };
})();
