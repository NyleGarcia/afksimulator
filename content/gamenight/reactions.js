/* Game Night mode: friend reactions. Schema: gamenight_spec.md 6.2.
   byBand[band][kind] = entries; friendLines._roaster/_hype/_chill/_rival/_chaotic = personality pools
   merged into the pool when a friend has that trait tag. Tokens: {me} {friend} {day} {time} {game} {week} {cause} {prop}. */
(function () {
  var C = (window.AFK_CONTENT = window.AFK_CONTENT || {});
  var G = (C.gamenight = C.gamenight || {});
  var R = (G.reactions = G.reactions || {});

  R.byBand = {
    /* K 0-24: trusting */
    calm: {
      impressed: [
        { t: "ok {me} that's a solid excuse, no notes", eMin: 11 },
        { t: "fine, i respect the effort. get well {me}", eMin: 11 },
        { t: "that has a beginning, middle and end. approved", eMin: 11 },
        { t: "{cause}?? ok that is a real reason. go", eMin: 11 },
        { t: "{me}. {cause}?? that's actually insane", eMin: 16 },
        { t: "i want to be mad but {cause} is too good", eMin: 16 },
        { t: "you can't make this up. or can you. i'm choosing to believe", eMin: 16 },
        { t: "that's the best one yet and it's only week {week}", eMin: 16 },
        { t: "i'm framing this one. {cause}. museum quality", eMin: 21 },
        { t: "someone pin this. {me} just won {day}", eMin: 21 },
        { t: "{me} you deserve an award and also a therapist", eMin: 21 },
        { t: "i have no choice but to believe you. that's too much work to fake", eMin: 21 }
      ],
      neutral: [
        "ok np {me}", "next week then", "all good, rest up", "k we'll do {game} without you",
        "cool, see you next {day}", "thanks for telling us at least", "no worries, we'll survive",
        "fair enough. next time", "alright, dm if it clears up"
      ],
      exasperated: [
        { t: "{me} it's week {week}", lvl: 1 }, { t: "again? ok but come next time", lvl: 1 },
        { t: "i mean ok. that's the third one in a row though", lvl: 1 }, { t: "sure {me}. sure.", lvl: 1 },
        { t: "{me} we have a {day} thing. it's in the name", lvl: 2 },
        { t: "i'm not mad. i'm just counting", lvl: 2 },
        { t: "you know {game} is not going to install itself on {me}'s pc by magic", lvl: 2 },
        { t: "week {week}. i'm starting to take it personally", lvl: 2 },
        { t: "{me} i love you but you are a ghost", lvl: 3 },
        { t: "i'm going to put {day} on your gravestone", lvl: 3 },
        { t: "at this point you're a rumor", lvl: 3 },
        { t: "week {week}. the group is just three guys and your memory", lvl: 3 }
      ],
      detective: [
        "hm. okay. noted", "huh. weird timing though", "interesting. go on", "that's a lot of detail, {me}",
        "wow ok. very specific", "mm. i'll allow it. for now", "you're sure about that?", "noted. i write things down now"
      ]
    },
    /* K 25-49: eyebrow */
    eyebrow: {
      impressed: [
        { t: "ok i came in doubting and now i'm just entertained", eMin: 11 },
        { t: "that's a lot of effort for a lie. i mean a truth", eMin: 11 },
        { t: "ok fine. the detail sells it", eMin: 11 },
        { t: "i'm eyebrow up but i'm clapping", eMin: 11 },
        { t: "{cause}. the confidence. i respect it", eMin: 16 },
        { t: "ok that's either true or the best thing i've heard", eMin: 16 },
        { t: "i should be suspicious but i'm busy admiring this", eMin: 16 },
        { t: "{me} you could be a novelist. a bad one, but still", eMin: 16 },
        { t: "this has a three act structure. i'm not even checking", eMin: 21 },
        { t: "someone call a studio. {cause}: the movie", eMin: 21 },
        { t: "that's so unhinged it has to be true", eMin: 21 },
        { t: "i give up. you win. you win {day}", eMin: 21 }
      ],
      neutral: [
        "uh huh", "ok {me}. if you say so", "sure. next week though", "right. ok.",
        "convenient but ok", "hm, again, interesting", "ok. noted", "alright... {game} then",
        "you say that every {day}"
      ],
      exasperated: [
        { t: "{me} there's always something", lvl: 1 }, { t: "second week in a row, huh", lvl: 1 },
        { t: "ok but can something happen to NOT you for once", lvl: 1 }, { t: "mhm. {me} and his tragic life", lvl: 1 },
        { t: "your luck is incredible. so incredibly specific", lvl: 2 },
        { t: "week {week}. we're all just starting to wonder", lvl: 2 },
        { t: "it's always {day}. what's wrong with {day}", lvl: 2 },
        { t: "the disasters only visit you on {day} at {time}. weird", lvl: 2 },
        { t: "{me} stop. just say you don't want to play", lvl: 3 },
        { t: "week {week} and i still haven't seen your face in vc", lvl: 3 },
        { t: "i've had better luck booking a doctor than getting you on {game}", lvl: 3 },
        { t: "the bad things that happen to you are on a schedule", lvl: 3 }
      ],
      detective: [
        "hold on, let me check something", "wait. did you say that before?", "mmhm. keep going, i'm listening",
        "that's a lot of coincidences", "something's off here and i'll find it", "i'm gonna ask follow-ups, ok?",
        "interesting. the timeline is... interesting", "one question. just one"
      ]
    },
    /* K 50-74: open scepticism */
    sus: {
      impressed: [
        { t: "ok i hate this but i believe it", eMin: 11 },
        { t: "that's thin but you said it with a straight face", eMin: 11 },
        { t: "fine. you get a pass. a short one", eMin: 11 },
        { t: "you're on thin ice but that was decent", eMin: 11 },
        { t: "{cause}?? ok that's too weird to be a lie. which is what a liar would say", eMin: 16 },
        { t: "i'm sus but impressed. these can coexist", eMin: 16 },
        { t: "the audacity is the evidence. i can't call it", eMin: 16 },
        { t: "ok that one has too many parts for you to fake. fine", eMin: 16 },
        { t: "i came here to bust you and you handed me a screenplay", eMin: 21 },
        { t: "that's the dumbest, most elaborate thing i've ever heard. i believe it", eMin: 21 },
        { t: "i'll never forgive you and i'll never forget {cause}", eMin: 21 },
        { t: "i want to be sceptical but this is art now", eMin: 21 }
      ],
      neutral: [
        "yeah ok. sure.", "right. that's what you said last time", "we'll see", "uh huh. we'll see",
        "ok but you better come next week", "i'm not buying it but ok", "mm. you're on thin ice", "great. cool. whatever {me}",
        "write that one in the ledger"
      ],
      exasperated: [
        { t: "no. no more. next", lvl: 1 }, { t: "{me} i'm tired", lvl: 1 },
        { t: "i literally cannot believe you right now", lvl: 1 }, { t: "come ON {me}", lvl: 1 },
        { t: "week {week}. this is a documentary now", lvl: 2 },
        { t: "you're not even trying. at least try", lvl: 2 },
        { t: "every time we plan {game} you get cursed", lvl: 2 },
        { t: "{me} i can see you were online at 3pm", lvl: 2 },
        { t: "we've been doing this for {week} weeks and i've played with a ghost", lvl: 3 },
        { t: "i'm removing {day} from my calendar. just for you", lvl: 3 },
        { t: "you owe me {week} weeks of {game}", lvl: 3 },
        { t: "just tell us you hate us. we can take it", lvl: 3 }
      ],
      detective: [
        "ok walk me through it from the start", "that doesn't add up and you know it", "who exactly saw this?",
        "so what time did that happen", "i'm pulling up your last excuse right now", "send proof or you're lying",
        "your story changed between sentences", "i'm gonna need receipts"
      ]
    },
    /* K 75-100: interrogation */
    detective: {
      impressed: [
        { t: "...ok. that actually holds up. i'm annoyed", eMin: 11 },
        { t: "i couldn't find a hole in that and i tried", eMin: 11 },
        { t: "fine. but the case stays open", eMin: 11 },
        { t: "{me} you earned that one. barely", eMin: 11 },
        { t: "i spent 10 minutes checking {cause} and it's airtight. i hate that", eMin: 16 },
        { t: "that story survived the cross-examination. impressive", eMin: 16 },
        { t: "the jury is stunned. {me} walks. again", eMin: 16 },
        { t: "i've been wrong before. this is that. {cause}. wow", eMin: 16 },
        { t: "i'm withdrawing every accusation. that was too elaborate to be fake", eMin: 21 },
        { t: "{me}, either you're the best liar alive or the unluckiest man in the world", eMin: 21 },
        { t: "i have never seen a defense like that. i'm retiring from detective work", eMin: 21 },
        { t: "case dismissed. i need to lie down. {cause}!!", eMin: 21 }
      ],
      neutral: [
        "...noted.", "ok. it's in the file", "you can go. for now", "right. i'm watching you", "we'll see.",
        "fine. one more strike and it's over", "ok. i'll be checking back", "the ledger remembers"
      ],
      exasperated: [
        { t: "every. single. week.", lvl: 1 }, { t: "i'm done with these", lvl: 1 },
        { t: "{me} stop wasting my time", lvl: 1 }, { t: "no more stories. just show up", lvl: 1 },
        { t: "week {week}. i keep a file on you. it has a table of contents", lvl: 2 },
        { t: "we are not stupid, {me}", lvl: 2 },
        { t: "that's your fourth tragedy this month", lvl: 2 },
        { t: "your life is a soap opera and we have no interest in it", lvl: 2 },
        { t: "i'm declaring {day} dead and you the killer", lvl: 3 },
        { t: "week {week}. i've lost faith in you, in {game} and in {day}s", lvl: 3 },
        { t: "the next excuse you make will be read aloud at your funeral", lvl: 3 },
        { t: "this is an intervention. in vc. now", lvl: 3 }
      ],
      detective: [
        "sit down. we need to talk about your story", "where were you at {time}? exactly?", "your lies are in the ledger. all of them",
        "i have it in writing from week {week}. explain", "answer the question. just the question", "you're contradicting yourself again",
        "the story doesn't add up and i have the screenshots", "cross-examination time"
      ]
    }
  };

  /* repeated excuse */
  R.repeat = [
    "{me} you said {cause} like two weeks ago", "wait that's the same excuse as last time", "{cause} AGAIN? you're recycling",
    "hold on, didn't {cause} happen already?", "this is a rerun. you used {cause} in week {week}... minus a few", "copy paste excuse, {me}",
    "originality: 0/10. {cause} is last month's news", "sir this is a repeat", "that excuse has already been used and it was worse the first time",
    "can you at least try a new one", "i'm giving you a participation trophy for {cause}", "we've heard {cause}. in this very chat",
    "you've used up {cause}. pick another", "{cause} again?? is your life stuck on a loop", "the writers ran out of ideas", "{me} you can't just reuse {cause}"
  ];

  /* contradiction caught */
  R.contradiction = [
    "wait. last week you said {cause}. how are you doing this now", "hold on. that doesn't match what you told us before",
    "{me} that contradicts week {week}", "uh, those two stories can't both be true", "so which one is it, {me}", "you literally said the opposite last time",
    "your story is fighting itself", "ah. so you're lying. cool cool cool", "i'm sorry, last time you were SO sick. now you're fine?",
    "continuity error! {me} is caught", "the timeline has a hole in it the size of {game}", "your excuse from before is in the ledger. read it back to me",
    "wait wait wait. rewind. that doesn't line up", "you can't be in two places at once, {me}",
    { t: "wait. you said {cause} in week {week}?? how are you at the mall", needsTag: "injured" },
    { t: "you were in a CAST last week and now you're at the gym?", needsTag: "injured" },
    { t: "i thought you were out of the country {me}. why are you at the mall", needsTag: "abroad" },
    { t: "didn't you tell us you were abroad? your ping is 8ms", needsTag: "abroad" },
    { t: "you said your car was dead. how did you drive to the party", needsTag: "car-broken" },
    { t: "wasn't your car in the shop? who drove you here", needsTag: "car-broken" },
    { t: "you were deathly ill last week. why's your insta full of party pics", needsTag: "sick" },
    { t: "oh so you're sick but you went out? interesting", needsTag: "sick" }
  ];

  R.callbackReward = [
    "your {cause} again?? ok at least you're consistent", "the {cause} lore continues", "ok that tracks with {cause}. still sad about it",
    "the {cause} saga isn't over, huh", "oh no, still dealing with {cause}? that tracks", "ok at least the story holds. get well",
    "continuity! {cause} part two. nice", "you have a consistent universe. i respect that", "plot twist: {cause} is still going. good to know",
    "callback to {cause}. you're a professional", "the {cause} arc. i'm invested now", "ok that's a real throughline, {me}",
    "honestly the {cause} storyline is better than most shows", "wow you've been so consistent about {cause}", "fine, {cause} is a long-term problem. we'll wait",
    "season 2 of {cause}, let's go"
  ];

  /* proof demand */
  R.proofDemand = [
    "ok then show me {prop}", "send {prop} rn, 8 seconds", "pics or it didn't happen", "prove it. {prop}. now",
    "screenshot {prop}, i'll wait", "i need to see {prop} with my own eyes", "show the receipts, {me}", "ok, evidence. what've you got",
    "put your hand on {prop} and swear", "{prop}. visual. now. clock's running", "i need proof. i'm a lawyer now", "convince me. {prop} on the table",
    "i said prove it. tick tock", "ok. show. me. {prop}", "this is a court of {day}. exhibit A please", "i'm gonna need {prop} or this is a no"
  ];

  R.proofPass = [
    "...fine. that checks out", "ok i hate that that's real", "huh. it was true? ok", "fine. you're clear",
    "alright, i believe you. sorry", "damn. ok. proof accepted", "ok that actually matches. weird", "i got nothing. approved",
    "ok it's legit. i look dumb now", "dang. ok. you're off the hook", "that is... consistent. fine", "i can't argue with {prop}",
    "evidence accepted. case closed. for now", "yeah that's real. my bad", "ok cool you win this round", "the paperwork is in order. sigh"
  ];

  R.proofPerfect = [
    "i am sworn in as your lawyer", "that was too clean. respect", "flawless. i'm embarrassed to have asked", "the way you produced that. chef's kiss",
    "ok that's the cleanest defense i've seen", "perfect. i apologise to your entire family", "i've never been so convinced. get a job in law", "full marks. i'll be quiet now",
    "wow ok. the prosecution rests", "{me} 3 for 3. we're all just spectators now", "i take back everything i ever said", "that's the kind of proof you frame",
    "you could sell that to a museum", "stop it you're making me feel bad", "unbelievable. truly. what a performance", "i'm withdrawing the case. standing ovation"
  ];

  R.proofFail = [
    "lol no", "{me} that was literally a screenshot of nothing", "that's not even the same thing", "that doesn't prove anything",
    "bro that's a stock photo", "ok that's wrong and you know it", "the clock ran out. so did your credibility", "you panicked. i can smell it",
    "that's the wrong exhibit, {me}", "caught. red-handed", "that's not {prop}, that's a pizza", "you clicked random things. admit it",
    "hahaha no way", "strike. you failed the proof", "yeah that's a no from me", "you didn't have it, did you"
  ];

  R.strike = [
    "strike {week}. take notes", "that's a strike, {me}", "one more of those and it's over", "strike added to the file",
    "yeah that's a strike", "{me} you're on the board now", "clink. strike", "that counts against you",
    "write it in the ledger, a strike for {me}", "another one for the pile", "strike. and i'm not even sad about it", "strike. you know the rules",
    "ok that's strike number whatever", "the chat has decided. strike", "official strike, signed by everyone", "the strike counter beeped"
  ];

  R.strikeFinal = [
    "that's it. {me} you're out of the chat", "that was the last strike. we're done", "{me} has been removed from the group",
    "bye {me}. we'll tell you how {game} was", "the vote is unanimous. goodbye", "we're renaming the chat. without you", "last strike. you're out",
    "i'm sorry. you did this to yourself", "we tried. we really tried. bye", "you've been ejected from game night",
    "no more {day}s for you", "removed {me} from the group. sorry man", "it's over, {me}", "that's strike three. the court has spoken",
    "the group is better off. kind of. sad though", "we're keeping your spot warm. kidding. bye"
  ];

  R.detectiveRise = [
    "i'm starting a spreadsheet", "i'm keeping a ledger now", "i've started taking notes on {me}", "this ends now. i'm investigating",
    "from now on i write everything down", "i've bought a corkboard", "i'm gonna get to the bottom of this", "okay. detective mode",
    "i have a red string and i'm not afraid to use it", "i'm taking this case personally", "i'm creating a timeline", "i'm pulling logs on your online status",
    "from now on i verify everything", "you're being monitored, {me}", "i've set up a google doc: 'lies of {me}'", "i've decided to catch you. it's a hobby now"
  ];

  R.detectiveStandDown = [
    "ok i'm closing the case. for now", "alright, i'll stop digging. you earned it", "fine. i'm turning in my badge", "the corkboard is going in the closet",
    "ok, you've been clean for weeks. truce", "case closed. i'm sorry about the spreadsheet", "i'm satisfied. don't make me regret this", "detective mode off. you're clear",
    "fine, i believe you. i'll delete the doc", "stand down everyone, {me} is legit", "my investigation found nothing. annoyingly", "ok, i'll stop. i got bored anyway",
    "red string put away", "i've retired. let someone else do it", "ok. apologies for the scrutiny", "you've won my trust. don't waste it"
  ];

  /* quiz: ask = ledger field */
  R.detectiveQuiz = [
    { t: "what was his name again", ask: "witness" }, { t: "and who exactly saw this happen", ask: "witness" },
    { t: "who was there with you?", ask: "witness" }, { t: "name the witness. go", ask: "witness" },
    { t: "what did you say caused it again", ask: "cause" }, { t: "remind me, what happened exactly?", ask: "cause" },
    { t: "what was the original problem?", ask: "cause" }, { t: "start from the top. what went wrong first", ask: "cause" },
    { t: "what proof did you offer last time", ask: "proof" }, { t: "you showed me what, again?", ask: "proof" },
    { t: "which evidence did you send", ask: "proof" }, { t: "what was the thing you sent? describe it", ask: "proof" },
    { t: "and then what happened? the complication", ask: "escalation" }, { t: "what went wrong after that?", ask: "escalation" },
    { t: "what did you promise us", ask: "promise" }, { t: "what was the promise you made?", ask: "promise" }
  ];

  R.believed = [
    "ok cool", "feel better {me}", "oh no. ok. next week", "all good man", "sucks. next time", "no worries {me}",
    "ok that sounds rough", "np. we'll catch you next week", "take care of yourself", "got it, thanks for letting us know",
    "ok {me}. see you next {day}", "sad, but fine", "oof. ok.", "rest up", "alright, we'll miss you", "ok. we'll play without you"
  ];

  /* wrong-pick decoys for the proof challenge */
  R.proofDecoys = [
    { label: "gym membership card", tags: ["injured"] }, { label: "concert ticket stub", tags: ["sick"] },
    { label: "beach photo", tags: ["abroad"] }, { label: "dance class receipt", tags: ["injured"] },
    { label: "gas station receipt", tags: ["car-broken"] }, { label: "road trip playlist", tags: ["car-broken"] },
    { label: "gym selfie", tags: ["sick", "injured"] }, { label: "hotel keycard", tags: ["abroad"] },
    { label: "pizza party invite", tags: ["sick"] }, { label: "lease signing photo", tags: ["moved-house"] },
    { label: "hiking trail pass", tags: ["injured", "abroad"] }, { label: "bar tab, 11pm", tags: ["sick"] },
    { label: "sushi night photo", tags: ["sick", "family-emergency"] }, { label: "brand new car key", tags: ["car-broken"] },
    { label: "duty free bag", tags: ["abroad"] }, { label: "perfect attendance badge", tags: ["fell-asleep"] }
  ];

  /* personality pools. Merged into the pool for the matching kind when the friend carries that trait tag.
     Keys: impressed / neutral / exasperated / detective, plus extra proof kinds. */
  R.friendLines = {
    _default: {},
    _roaster: {
      impressed: [
        "that's a better story than anything {game} ever gave me", "ok you lied so well i feel a little proud of you",
        "your imagination is wasted on you. put it in a book", "most creative thing you've done since the karaoke incident"
      ],
      neutral: [
        "wow what a shocker, {me} cancels", "gee i'm so surprised that {me} isn't here", "colour me shocked. truly", "bold of you to even type it out"
      ],
      exasperated: [
        "your excuses are like your aim: all over the place and still miss", "at this point your excuse writer is the only one in {game} with a perfect record",
        "{me} you cancel more than a streaming service", "your reliability is a bit like your wifi"
      ],
      detective: [
        "oh this story smells. someone open a window", "{me} your lies have less depth than your build in {game}",
        "even your alibi has an alibi", "i've seen smoother cover-ups in a kids' cartoon"
      ]
    },
    _hype: {
      impressed: [
        "LET'S GOOOO that is a SERIOUS excuse", "bro that's a work of ART", "YOOO the commitment!! you committed to the bit!",
        "THE ENERGY!! i believe every word"
      ],
      neutral: [
        "aw man, ok! next week for sure!", "no stress! we got this next time!", "we'll miss you but WE'LL SEE YOU NEXT WEEK!", "rest up champ!!"
      ],
      exasperated: [
        "bro i believe in you but WOW", "{me} COME ON. one game! just ONE!", "i've got so much hype and it's all going nowhere",
        "i have been hyped for {day} since monday. every week. alone."
      ],
      detective: [
        "ok BUT i believe in the truth", "i want to trust you BUT something is off", "i'm hyped about solving this!", "okay let's figure this out together!! show me the details"
      ]
    },
    _chill: {
      impressed: [
        "ok that's pretty good ngl", "nice. very detailed. you did the thing", "haha ok respect, take it easy", "smooth. real smooth"
      ],
      neutral: [
        "np man, whenever", "all good, no pressure", "cool cool. next time", "it's whatever. don't sweat it"
      ],
      exasperated: [
        "i'm not mad. just a bit tired of it", "it's fine. it's fine. it's week {week}", "...ok man", "bro. come on. you can just say no"
      ],
      detective: [
        "hm. that doesn't sound right but ok", "not gonna lie that's a bit odd", "just curious... how does that work?", "idk man, the story feels shaky"
      ]
    },
    _rival: {
      impressed: [
        "ok fine, i'd have used the same excuse. mine's still better though", "i'm not impressed. ok i'm a little impressed. don't tell anyone",
        "you copied the format from MY excuse in week 2", "that was a good one. i hate that i'm saying it"
      ],
      neutral: [
        "typical {me}", "good, more {game} for me and {friend}", "whatever. i'll top the leaderboard without you", "your loss. my gain"
      ],
      exasperated: [
        "i'm literally winning by default every week thanks to you", "you flake and i get the credit. weird flex",
        "i've got a whole record of your no-shows, {me}", "you wouldn't survive one night of {game} anyway"
      ],
      detective: [
        "i KNEW it. i've been saying it since week 1", "oh i'm so enjoying this. keep digging your hole", "finally. i can't wait to see this fall apart",
        "i've been collecting screenshots since week 2, {me}"
      ]
    },
    _chaotic: {
      impressed: [
        "that was the most cursed thing i've heard and i love it", "i believe this because it makes no sense", "this story has dragons in it somehow and i'm ok with that",
        "the chaos! i can feel it from here"
      ],
      neutral: [
        "ok but what if we all just don't play and play something else", "mhm sure. wanna see a video of a raccoon?", "ok sure. random question: has anyone seen my shoe?",
        "k. i'll just eat cereal then"
      ],
      exasperated: [
        "bro i showed up with a costume for nothing", "you keep ruining the bit. the bit was us playing", "i drove through three zones for this and it's still not enough",
        "i'm going to scream into the void now. back in 5"
      ],
      detective: [
        "ok i don't know what's happening but i don't believe it", "your story is a soup and i found a hair in it", "my brain says no. my heart says also no",
        "i have a theory and it's unhinged. gonna say it anyway"
      ]
    }
  };
})();
