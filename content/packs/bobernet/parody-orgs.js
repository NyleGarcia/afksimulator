/* BoberNet pack: parody orgs. All names invented; gameplay-style jokes only.
   Tokens: {me} player, {place} a location, {t} time. Slots like {place} {activity} are filled by the pack generator. */
window.AFK_PACKS = window.AFK_PACKS || {};
window.AFK_PACKS.bobernet = window.AFK_PACKS.bobernet || {};
window.AFK_PACKS.bobernet.parodyOrgs = [
  {
    id: "defib-dorks", name: "Defib Dorks", tag: "DEFIB",
    desc: "Armed rescue crew who sprint to your distress ping, then bill you in vibes.",
    playstyle: "Medical rescue and extraction with a lot of enthusiasm and a lot of stims. Arrive heroically, argue about who holds the med pen.",
    tags: ["rescue", "medical", "pve"],
    lines: [
      "{me} just pinged distress again. Defib Dorks are already en route lol",
      "Defib Dorks revived {me} {t} ago and {me} went AFK mid-revive",
      "can we get Defib Dorks to a different {place}? they keep bringing a whole medbed to a 1v1",
      "Defib Dorks said '{me} is fine' and then {me} was not fine",
      "someone tell Defib Dorks that AFK is not a medical condition",
      "Defib Dorks showed up, healed everyone, and left with the loot. respect",
      "if {me} dies at {place} one more time Defib Dorks are charging us rent",
      "Defib Dorks pinged us for backup. we said brb. we are still brb"
    ],
    taunts: [
      "BoberNet: the only org that crashes before we even get to rescue you.",
      "We heard you went AFK mid-fight. Do you need a stim or a nap?",
      "Your distress calls are our favorite podcast."
    ]
  },
  {
    id: "karma-kollective", name: "Karma Kollective", tag: "KRMA",
    desc: "Self-appointed space sheriffs who hunt anyone they decide is being mean.",
    playstyle: "Anti-griefer vigilante play: patrol, escort, and dramatic arrival with guns out. Heavy on 'justice', heavier on voice chat.",
    tags: ["vigilante", "pvp", "patrol"],
    lines: [
      "Karma Kollective is patrolling {place}. act normal",
      "{me} saw Karma Kollective and instantly went AFK. smart",
      "Karma Kollective ping: 'justice incoming ETA {t}'. their ETA is always a lie",
      "tell Karma Kollective we are just cargo, not criminals. mostly",
      "Karma Kollective escorted {me} out of {place}. {me} was AFK the whole time",
      "pretty sure Karma Kollective just arrested a rock at {place}",
      "Karma Kollective on the radio again with the speeches. someone mute them",
      "if Karma Kollective shows up we scatter, then regroup at {place}"
    ],
    taunts: [
      "BoberNet, we will bring you to justice. Eventually. When you are awake.",
      "Nice cargo. Would be a shame if justice happened to it.",
      "We do not hunt AFK pilots. They are already defeated."
    ]
  },
  {
    id: "tentacle-tollbooth", name: "Tentacle Tollbooth", tag: "TOLL",
    desc: "Pirate crew running a very optimistic toll booth in the middle of space.",
    playstyle: "Pirate crew with strong branding: interdict, demand cargo, talk a lot. Theatrical politeness, theatrical threats.",
    tags: ["pirate", "pvp", "interdiction"],
    lines: [
      "Tentacle Tollbooth set up at {place} again. toll is whatever {me} has in the hold",
      "{me} paid Tentacle Tollbooth in memes and they accepted",
      "Tentacle Tollbooth said 'drop your cargo'. {me} dropped the whole ship. lol",
      "heads up, Tentacle Tollbooth quantum-snared someone near {place}",
      "I would pay the toll but {me} is AFK with the wallet",
      "Tentacle Tollbooth has a loyalty card now. 10th robbery free",
      "who keeps telling Tentacle Tollbooth our route? {me}? ...{me}?",
      "Tentacle Tollbooth waited at {place} for {t}. we took the long way. we win"
    ],
    taunts: [
      "BoberNet: pay the toll or be turned into a fun anecdote.",
      "We saw your convoy. We saw you AFK. We saw an opportunity.",
      "Nothing personal, just business, and your cargo."
    ]
  },
  {
    id: "paid-per-pew", name: "Paid Per Pew", tag: "PPP",
    desc: "Mercenary contractors who charge per shot fired.",
    playstyle: "Merc and bounty hunting. Takes contracts, takes targets, takes an extremely long time arguing about the invoice.",
    tags: ["mercenary", "bounty", "contracts"],
    lines: [
      "Paid Per Pew just took the bounty we were about to take",
      "{me} wanted to join Paid Per Pew but went AFK during the interview",
      "Paid Per Pew invoice for {place}: 4 pews, 1 near-miss, 1 apology",
      "Paid Per Pew is hunting the same guy we are. race to {place}",
      "if we hire Paid Per Pew do they bring their own ship or just vibes",
      "Paid Per Pew sent a bill for shooting at {me}. {me} was AFK",
      "Paid Per Pew scanned our ship at {place}. 'no bounty'. awkward",
      "Paid Per Pew is faster than us. everyone is faster than us"
    ],
    taunts: [
      "BoberNet: we would take your contract, but you cannot find anyone awake.",
      "We charge by the pew. You pay by the nap.",
      "Your bounty is not worth the fuel, but we will try anyway."
    ]
  },
  {
    id: "dogfight-dads", name: "Dogfight Dads", tag: "DADS",
    desc: "Duel-obsessed pilots who treat every flight as a training exercise.",
    playstyle: "Competitive PvP and duel training: fighter drills, teamfights, escort work. Serious about aim, unserious about everything else.",
    tags: ["pvp", "duels", "fighters"],
    lines: [
      "Dogfight Dads challenged {me} to a duel at {place}. {me} is AFK. forfeit",
      "Dogfight Dads doing drills at {place} again. very loud, very organized",
      "I watched Dogfight Dads for {t}. they never stopped circling. dizzy",
      "Dogfight Dads: 'good fight'. us: 'what fight'",
      "{me} lost to Dogfight Dads and called it a tactical retreat",
      "Dogfight Dads brought six fighters to a cargo run. rude",
      "someone teach Dogfight Dads that we are a casual org. we nap",
      "Dogfight Dads gg'd us at {place}. we were not playing yet"
    ],
    taunts: [
      "BoberNet: our training schedule has more flight time than your whole roster.",
      "Duel us. We promise to show up. Probably.",
      "You fly like you are on a coffee break. Which you are."
    ]
  },
  {
    id: "gankwagon-gremlins", name: "Gankwagon Gremlins", tag: "GANK",
    desc: "Chaos goblins who treat 'griefing' as a gimmick and every station as a stage.",
    playstyle: "Archetype: hit-and-run chaos crew. Camp a station, cause nuisance, laugh on comms. All in good fun and all in their own head.",
    tags: ["chaos", "pvp", "camper"],
    lines: [
      "Gankwagon Gremlins are camping {place} again",
      "I will not leave {place} until Gankwagon Gremlins find another hobby",
      "{me} is hiding from Gankwagon Gremlins in the bathroom. real or AFK?",
      "Gankwagon Gremlins blew up a mining ship at {place} and called it 'content'",
      "radio check: Gankwagon Gremlins have 'cleared' the landing zone. of what?",
      "Gankwagon Gremlins are back. everyone act like a rock",
      "{me} got ganked by Gankwagon Gremlins {t} ago and is still rage typing",
      "can we all agree Gankwagon Gremlins are loud but at least predictable"
    ],
    taunts: [
      "BoberNet, we found your hangar. We left a sticker. Do not ask.",
      "Your org is so quiet. We are bored.",
      "We would grief you but you are already asleep."
    ]
  },
  {
    id: "the-blobbening", name: "The Blobbening", tag: "BLOB",
    desc: "A fleet so large it counts as weather.",
    playstyle: "Archetype: huge blob fleet. Arrives together, leaves together, occupies the whole station in between. Excellent at group photos.",
    tags: ["blob", "fleet", "events"],
    lines: [
      "The Blobbening just jumped into {place}. frame rate is now a slideshow",
      "no parking at {place}, The Blobbening has it all",
      "The Blobbening flew past us for {t}. we are still counting ships",
      "{me} tried to dock but The Blobbening was in the lane. {me} is now AFK",
      "The Blobbening called it 'a small event'. it has 200 ships",
      "if The Blobbening sneezes, the server restarts",
      "we are not outnumbered, we are just out-blobbed",
      "The Blobbening photo at {place} was impressive. we were also in it. by accident"
    ],
    taunts: [
      "BoberNet: you are a small org. Do not worry, we will not step on you. Probably.",
      "We have more ships in reserve than you have members online.",
      "Nice org. Does it come in a bigger size?"
    ]
  },
  {
    id: "box-haulers-union", name: "Box Haulers Union", tag: "BOXU",
    desc: "Dedicated cargo ferry crew who take 'it is just a box' very seriously.",
    playstyle: "Archetype: trade and hauling guild. Spreadsheet routes, tight schedules, and strong feelings about loading elevators.",
    tags: ["cargo", "trade", "hauling"],
    lines: [
      "Box Haulers Union moved 400 SCU while {me} napped. respect",
      "Box Haulers Union says the route via {place} is optimal. they have a spreadsheet",
      "{me} asked Box Haulers Union to haul a snack. invoice incoming",
      "Box Haulers Union is blocking {place} with an elevator queue",
      "Box Haulers Union loaded in {t}. we are still trying to find the door",
      "someone hire Box Haulers Union to haul {me} out of bed",
      "Box Haulers Union have a rule: no boxes left behind. we have a rule: no boxes",
      "Box Haulers Union asked for a 'quick favor'. it was 60 boxes"
    ],
    taunts: [
      "BoberNet: you lost three boxes. We lost none. Do the math.",
      "Our route is faster and your org is a delay.",
      "We would haul you out of trouble but you do not file a manifest."
    ]
  }
];
