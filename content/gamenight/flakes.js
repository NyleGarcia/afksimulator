/* Game Night mode: the FRIENDS' own flakiness. Schema: gamenight_spec.md 6.5.
   Tokens: {me} {friend} {day} {time} {game} {week}; {cause} only in solidarity.
   Extras beyond the base schema (ignored by older loaders):
   - events[].persona: 'here-liar' | 'on-the-way' | 'last-second' (kind 'friend-late'), lines play in order across the night
   - traits keys prefixed '_' are archetypes the engine may assign when a friend id has no entry. */
(function () {
  var C = (window.AFK_CONTENT = window.AFK_CONTENT || {});
  var G = (C.gamenight = C.gamenight || {});
  var F = (G.flakes = G.flakes || {});

  F.traits = {
    _default: { flakiness: 0.25, persistence: 0.4, gullibility: 0.5, drama: 0.3 },
    _roaster: { flakiness: 0.2, persistence: 0.7, gullibility: 0.25, drama: 0.3 },
    _hype: { flakiness: 0.1, persistence: 0.9, gullibility: 0.7, drama: 0.5 },
    _chill: { flakiness: 0.4, persistence: 0.2, gullibility: 0.8, drama: 0.1 },
    _rival: { flakiness: 0.15, persistence: 0.6, gullibility: 0.2, drama: 0.4 },
    _chaotic: { flakiness: 0.5, persistence: 0.3, gullibility: 0.5, drama: 0.9 },
    _here_liar: { flakiness: 0.55, persistence: 0.3, gullibility: 0.6, drama: 0.4 },
    _on_the_way: { flakiness: 0.6, persistence: 0.2, gullibility: 0.7, drama: 0.3 },
    _last_second: { flakiness: 0.35, persistence: 0.2, gullibility: 0.5, drama: 0.3 }
  };

  /* friend excuses. ordered roughly by elab 1..5 so week-scaling can pick later ones as the run gets wild. */
  F.friendExcuses = [
    /* elab 1: lazy */
    { id: "fx-tired", t: "i'm so tired tonight, i can't", elab: 1, beat: "any", caught: "you said that last {day} too", weight: 1.2 },
    { id: "fx-headache", t: "got a headache, gonna lie down", elab: 1, beat: "any", caught: "you were fine at lunch", weight: 1 },
    { id: "fx-long-day", t: "long day, brain's fried", elab: 1, beat: "afternoon", caught: "it's {day}. everyone's day was long", weight: 1 },
    { id: "fx-food", t: "i haven't eaten yet, i'll be late", elab: 1, beat: "hour", caught: "you can eat while playing, that's the whole point", weight: 1 },
    { id: "fx-nap", t: "took a nap and slept through the afternoon", elab: 1, beat: "hour", caught: "naps don't last six hours", weight: 1 },
    { id: "fx-lazy", t: "honestly i just don't feel like it tonight", elab: 1, beat: "any", caught: "wow. honest. rare", weight: 0.6 },
    { id: "fx-laundry", t: "i have laundry that can't wait", elab: 1, beat: "any", caught: "you have never done laundry on a {day}", weight: 1 },
    { id: "fx-dishes", t: "dishes are piling up, i have to deal with them", elab: 1, beat: "afternoon", caught: "dishes are a lifestyle, not an emergency", weight: 1 },
    /* elab 2: mundane */
    { id: "fx-gym", t: "i have to be at the gym, it's leg day", elab: 2, beat: "any", caught: "wait, leg day on a {day} night?", weight: 1.2 },
    { id: "fx-wifi", t: "my wifi is acting up, i'll try later", elab: 2, beat: "hour", caught: "you're typing in the chat right now", weight: 1.2 },
    { id: "fx-update", t: "my pc is installing an update and it won't stop", elab: 2, beat: "hour", caught: "you said that about a different update last week", weight: 1.2 },
    { id: "fx-mic", t: "my mic broke, i'll fix it next week", elab: 2, beat: "afternoon", caught: "you can type, you can use the chat", weight: 1 },
    { id: "fx-parents", t: "my parents came over unannounced", elab: 2, beat: "any", caught: "again? they have never missed a {day}", weight: 1 },
    { id: "fx-date", t: "i have a date, it's complicated", elab: 2, beat: "morning", caught: "you said that last week. what's her name", weight: 1 },
    { id: "fx-work-late", t: "my boss made me stay late", elab: 2, beat: "afternoon", caught: "you don't have a boss, you work for yourself", weight: 1 },
    { id: "fx-homework", t: "i forgot about a deadline, i have to finish it", elab: 2, beat: "hour", caught: "you said you finished it", weight: 1 },
    { id: "fx-cat-sick", t: "my cat is acting weird and i don't wanna leave", elab: 2, beat: "any", caught: "your cat is fine. i saw it on your story", weight: 1 },
    /* elab 3: getting creative */
    { id: "fx-neighbour-party", t: "my neighbour is having a party and i can't hear anything", elab: 3, beat: "hour", caught: "you live on a farm. what neighbour", weight: 1 },
    { id: "fx-power", t: "power went out on my whole street, no idea why", elab: 3, beat: "hour", caught: "then how are you texting me", weight: 1 },
    { id: "fx-lost-keys", t: "i locked myself out and the spare is in the house", elab: 3, beat: "afternoon", caught: "how are you messaging us from the porch then", weight: 1 },
    { id: "fx-friend-moving", t: "a friend asked me to help him move a couch", elab: 3, beat: "morning", caught: "which friend? we're your friends", weight: 1 },
    { id: "fx-plumber", t: "a plumber is here and he's not leaving", elab: 3, beat: "hour", caught: "you do not have a plumber, you have a bucket", weight: 1 },
    { id: "fx-chair", t: "my chair broke so i can't sit and play", elab: 3, beat: "any", caught: "you can play standing. i've seen you do it", weight: 1 },
    { id: "fx-sister", t: "my sister needs me to proofread her cover letter right now", elab: 3, beat: "hour", caught: "you hate your sister's cover letters", weight: 1 },
    { id: "fx-bank", t: "my bank froze my account, i'm on hold", elab: 3, beat: "afternoon", caught: "on hold for 6 hours?? on a {day}?", weight: 1 },
    { id: "fx-allergy", t: "i ate something and my whole face is puffy", elab: 3, beat: "afternoon", caught: "send a pic. we'll wait", weight: 1 },
    /* elab 4: elaborate */
    { id: "fx-flat-tire", t: "got a flat tire and I'm waiting on a tow truck that isn't coming", elab: 4, beat: "hour", caught: "you walked to the gas station and back in the pic", weight: 1 },
    { id: "fx-lost-dog", t: "my neighbour's dog escaped and i'm the only one who can find him", elab: 4, beat: "hour", caught: "you've said you hate dogs", weight: 1 },
    { id: "fx-surprise", t: "i'm helping plan a surprise party, can't tell you who for", elab: 4, beat: "morning", caught: "it's for you {friend}, isn't it? i can hear everyone laughing", weight: 1 },
    { id: "fx-pizza-oven", t: "the pizza oven caught fire, long story, everything's fine, no play", elab: 4, beat: "hour", caught: "you don't own a pizza oven", weight: 1 },
    { id: "fx-flood", t: "my downstairs neighbour flooded my kitchen and i'm mopping", elab: 4, beat: "afternoon", caught: "you live on the top floor", weight: 1 },
    { id: "fx-jury", t: "i got jury duty for a thing that's tonight, don't ask", elab: 4, beat: "morning", caught: "courts are closed after five", weight: 1 },
    { id: "fx-wedding", t: "my cousin's wedding got moved to tonight and i'm the best man", elab: 4, beat: "afternoon", caught: "you were the best man last month too", weight: 1 },
    { id: "fx-hiccups", t: "i've had hiccups since 4pm and the doctor says no screens", elab: 4, beat: "hour", caught: "doctors don't say that, hiccups last a minute", weight: 1 },
    { id: "fx-landlord", t: "my landlord is inspecting my apartment tonight and i'm hiding things", elab: 4, beat: "morning", caught: "what are you hiding, a second cat", weight: 1 },
    /* elab 5: absurd */
    { id: "fx-bees", t: "a swarm of bees moved into my room and I'm waiting for the beekeeper", elab: 5, beat: "hour", caught: "i can see your story, it's a single bee", weight: 1 },
    { id: "fx-alien-day", t: "it's national alien appreciation day and my family takes it extremely seriously", elab: 5, beat: "morning", caught: "that's not a real holiday and we both know it", weight: 0.8 },
    { id: "fx-twin", t: "my evil twin used my account and i have to confront him", elab: 5, beat: "hour", caught: "you're an only child, {friend} was at your birth", weight: 0.8 },
    { id: "fx-raccoon", t: "a raccoon stole my headset and i'm in a negotiation", elab: 5, beat: "hour", caught: "you're at the mall, i can see you", weight: 1 },
    { id: "fx-lighthouse", t: "I'm stuck in a lighthouse. don't ask. send help.", elab: 5, beat: "zero", caught: "there is no lighthouse in this state", weight: 0.8 },
    { id: "fx-eclipse", t: "there's a partial eclipse in my area and my religion forbids screens", elab: 5, beat: "afternoon", caught: "partial eclipses aren't a religion", weight: 0.8 },
    { id: "fx-goat", t: "my uncle's goat got into the house and ate my keyboard", elab: 5, beat: "hour", caught: "you don't have an uncle with goats. you have an uncle with a boat", weight: 1 },
    { id: "fx-tax", t: "the tax office called me in tonight for 'the audit of the century'", elab: 5, beat: "morning", caught: "you don't have taxes, you pay in vibes", weight: 1 },
    { id: "fx-curse", t: "i walked under a ladder and now i'm cursed until midnight. can't risk it", elab: 5, beat: "afternoon", caught: "you've been cursed since week 2. nothing changed", weight: 1 },
    /* elab 5+ spiral: second-round excuses, picked in later weeks */
    { id: "fx-submarine", t: "my boat is stuck on the roof of a car and i have to sit with it", elab: 5, beat: "hour", caught: "there is no flood. i checked the weather", weight: 0.8 },
    { id: "fx-time-loop", t: "i keep waking up in a time loop and today is the day i figure it out", elab: 5, beat: "morning", caught: "it's the same excuse you used in week {week}. wait", weight: 0.7 },
    { id: "fx-museum", t: "i accidentally got locked inside a museum overnight", elab: 5, beat: "zero", caught: "museums have wifi? what a wonder", weight: 0.9 },
    { id: "fx-parrot", t: "my parrot learned my password and he's locked me out", elab: 5, beat: "afternoon", caught: "it's 'password123'. a parrot would get that", weight: 1 },
    { id: "fx-fog", t: "the fog is so thick I can't find my computer", elab: 5, beat: "hour", caught: "you live inside a building, my guy", weight: 0.9 },
    { id: "fx-moon", t: "something about the moon tonight is making my pc not boot", elab: 5, beat: "hour", caught: "science says no", weight: 0.9 },
    { id: "fx-ghost-pc", t: "my pc is haunted, it boots only when I'm not looking", elab: 5, beat: "hour", caught: "you're looking at it right now", weight: 0.9 },
    { id: "fx-kidnapped", t: "i got kidnapped by an old friend from high school who insists on a reunion", elab: 5, beat: "zero", caught: "you type fast for a hostage", weight: 0.8 },
    { id: "fx-fish", t: "my fish learned to open the tank and i can't leave him alone with the lid off", elab: 5, beat: "afternoon", caught: "you have a plant, not a fish", weight: 0.9 },
    /* elab 2-4 mixed to fill the middle */
    { id: "fx-sunburn", t: "i got the worst sunburn and everything hurts", elab: 2, beat: "afternoon", caught: "it's winter, there's snow outside", weight: 0.9 },
    { id: "fx-haircut", t: "haircut went wrong, i'm hiding", elab: 2, beat: "afternoon", caught: "just wear a hat. we can't see you anyway", weight: 0.9 },
    { id: "fx-package", t: "i'm waiting for a package that requires a signature", elab: 3, beat: "morning", caught: "the delivery window is 2am to 3am??", weight: 1 },
    { id: "fx-pet-sitting", t: "i'm pet-sitting a hamster and it's very emotional", elab: 3, beat: "any", caught: "whose hamster? whose?", weight: 1 },
    { id: "fx-stuck-elevator", t: "stuck in an elevator with a stranger, we're bonding", elab: 4, beat: "zero", caught: "your elevator has an outlet and a keyboard?", weight: 0.9 },
    { id: "fx-trivia", t: "my family has a trivia night and they've put me on the team 'for strategy'", elab: 4, beat: "morning", caught: "you don't know trivia, you only know cheat codes", weight: 1 },
    { id: "fx-fortune", t: "a fortune cookie told me not to play {game} tonight and i'm not risking it", elab: 4, beat: "any", caught: "fortune cookies don't say that. i asked one", weight: 1 },
    { id: "fx-sleepwalk", t: "i woke up in my yard and everything's confusing", elab: 4, beat: "morning", caught: "it's only 6pm. you've been awake all day", weight: 1 },
    { id: "fx-bus", t: "got on the wrong bus and now I'm in another town", elab: 4, beat: "hour", caught: "the bus doesn't go there. i checked", weight: 1 },
    { id: "fx-sock", t: "i lost a sock and i can't focus until i find it", elab: 3, beat: "any", caught: "you wear sandals. nobody's seen your socks", weight: 0.8 }
  ];

  /* group events. who: 'friend' / 'friend2' / 'friend3' are mapped to real friends by the engine. */
  F.events = [
    /* mass-flake: friends pile on */
    { id: "ev-mass-flake", kind: "mass-flake", weight: 1, when: { weekMin: 2, flakersMin: 2 },
      lines: [{ who: "friend", t: "same here honestly, long day" }, { who: "friend2", t: "i literally can't" }] },
    { id: "ev-metoo-chain", kind: "mass-flake", weight: 1, when: { weekMin: 1, flakersMin: 2 },
      lines: [{ who: "friend", t: "me too" }, { who: "friend2", t: "me too" }, { who: "friend3", t: "wait is anyone even playing" }] },
    { id: "ev-metoo-dominoes", kind: "mass-flake", weight: 1, when: { weekMin: 2, flakersMin: 3 },
      lines: [{ who: "friend", t: "ok i'm out" }, { who: "friend2", t: "yeah same, not feeling it" }, { who: "friend3", t: "so it's just me and my dog then" }] },
    { id: "ev-mass-cancel-vote", kind: "mass-flake", weight: 1, when: { weekMin: 2, flakersMin: 2 },
      lines: [{ who: "friend", t: "vote: do we all just stay home tonight" }, { who: "friend2", t: "yes" }, { who: "friend3", t: "yes" }, { who: "friend", t: "motion carried. glorious" }] },
    { id: "ev-mass-hot-take", kind: "mass-flake", weight: 0.8, when: { weekMin: 3, flakersMin: 2 },
      lines: [{ who: "friend", t: "honestly nobody wants to play {game}" }, { who: "friend2", t: "i just wanted to see you all in vc" }, { who: "friend3", t: "we could see each other in a restaurant" }] },
    { id: "ev-mass-sign-in-blood", kind: "mass-flake", weight: 0.6, when: { weekMin: 4, flakersMin: 3 },
      lines: [{ who: "friend", t: "everyone raise a hand if you're not playing" }, { who: "friend2", t: "hand raised" }, { who: "friend3", t: "both hands raised" }, { who: "friend", t: "great. {day} is cancelled" }] },
    /* friends outdo the player's excuse */
    { id: "ev-outdo-bee", kind: "mass-flake", weight: 1, when: { weekMin: 3, flakersMin: 1 },
      lines: [{ who: "friend", t: "you think that's bad? mine has a bee in it" }, { who: "friend2", t: "mine has a bee and a lawyer" }] },
    { id: "ev-outdo-vet", kind: "mass-flake", weight: 1, when: { weekMin: 3, flakersMin: 1 },
      lines: [{ who: "friend", t: "lol amateur. my excuse has a customs officer in it" }, { who: "friend2", t: "mine's going to be on the news tonight" }] },
    { id: "ev-outdo-ladder", kind: "mass-flake", weight: 1, when: { weekMin: 4, flakersMin: 1 },
      lines: [{ who: "friend", t: "wait that's it? i was gonna say my house was haunted" }, { who: "friend2", t: "i was gonna say my house was haunted AND on fire" }, { who: "friend", t: "ok you win" }] },
    { id: "ev-outdo-spiral", kind: "mass-flake", weight: 1, when: { weekMin: 5, flakersMin: 2 },
      lines: [{ who: "friend", t: "mine involves a tractor" }, { who: "friend2", t: "mine involves the same tractor" }, { who: "friend3", t: "i am the tractor" }] },
    { id: "ev-outdo-doctors", kind: "mass-flake", weight: 0.8, when: { weekMin: 4, flakersMin: 1 },
      lines: [{ who: "friend", t: "i had to go to the hospital. i'm fine. the doctor was a friend of my uncle" }, { who: "friend2", t: "that's nothing. i met the president" }] },
    { id: "ev-outdo-competition", kind: "mass-flake", weight: 0.8, when: { weekMin: 6, flakersMin: 2 },
      lines: [{ who: "friend", t: "judges, please. is that excuse a 6 or a 7" }, { who: "friend2", t: "i give it 5. needs more twist" }, { who: "friend3", t: "i give it 8. he used a goat" }] },
    /* friend-caught: the player calls out a lie */
    { id: "ev-caught-quick", kind: "friend-caught", weight: 1, when: { weekMin: 2 },
      lines: [{ who: "friend", t: "ok ok i'm not actually sick" }, { who: "friend2", t: "i can hear you playing something" }] },
    { id: "ev-caught-sheepish", kind: "friend-caught", weight: 1, when: { weekMin: 2 },
      lines: [{ who: "friend", t: "...i just wanted a night off" }, { who: "friend2", t: "we all do, friend. we all do" }] },
    { id: "ev-caught-doubledown", kind: "friend-caught", weight: 0.8, when: { weekMin: 3 },
      lines: [{ who: "friend", t: "no i'm telling the truth" }, { who: "friend2", t: "you were in my group call 10 min ago" }, { who: "friend", t: "that was my twin" }] },
    { id: "ev-caught-snitch", kind: "friend-caught", weight: 0.8, when: { weekMin: 3, flakersMin: 1 },
      lines: [{ who: "friend", t: "oh now you care about excuses" }, { who: "friend2", t: "say that again with your bees story fresh in my mind" }] },
    { id: "ev-caught-shared-lie", kind: "friend-caught", weight: 0.8, when: { weekMin: 4, flakersMin: 2 },
      lines: [{ who: "friend", t: "ok yes we made a pact to skip tonight" }, { who: "friend2", t: "it was a good pact" }, { who: "friend3", t: "the best pact" }] },
    /* friend-counter: the friend wants to move it */
    { id: "ev-counter-move", kind: "friend-counter", weight: 1, when: { weekMin: 2 },
      lines: [{ who: "friend", t: "can we do thursday instead" }, { who: "friend2", t: "thursday i also can't" }, { who: "friend", t: "ok friday" }] },
    { id: "ev-counter-never", kind: "friend-counter", weight: 0.8, when: { weekMin: 3 },
      lines: [{ who: "friend", t: "how about we just agree it's a next-week thing" }, { who: "friend2", t: "agreed, forever" }] },
    { id: "ev-counter-lite", kind: "friend-counter", weight: 0.8, when: { weekMin: 2 },
      lines: [{ who: "friend", t: "what if we play for just 15 minutes" }, { who: "friend2", t: "that's 15 more than i have" }] },
    /* friend-detective: a friend starts investigating other friends */
    { id: "ev-detective-flip", kind: "friend-detective", weight: 1, when: { weekMin: 3 },
      lines: [{ who: "friend", t: "wait {friend} said the same thing last week" }, { who: "friend2", t: "i did not" }, { who: "friend", t: "i have screenshots" }] },
    { id: "ev-detective-cross", kind: "friend-detective", weight: 0.8, when: { weekMin: 4, flakersMin: 2 },
      lines: [{ who: "friend", t: "so you're both busy? at the same time? on {day}?" }, { who: "friend2", t: "it's a coincidence" }, { who: "friend3", t: "it's fate" }] },
    /* the friend who always says "I'm here" and isn't */
    { id: "ev-here-liar-1", kind: "friend-late", persona: "here-liar", weight: 1, when: { weekMin: 1 },
      lines: [{ who: "friend", t: "i'm here" }, { who: "friend2", t: "in vc?" }, { who: "friend", t: "yeah i'm here" }, { who: "friend2", t: "you're not in the channel" }, { who: "friend", t: "i'm here in spirit" }] },
    { id: "ev-here-liar-2", kind: "friend-late", persona: "here-liar", weight: 1, when: { weekMin: 2 },
      lines: [{ who: "friend", t: "i'm here, just waiting for you guys" }, { who: "friend2", t: "we're all in vc, where are you?" }, { who: "friend", t: "...in my head i am in vc" }] },
    { id: "ev-here-liar-3", kind: "friend-late", persona: "here-liar", weight: 1, when: { weekMin: 3 },
      lines: [{ who: "friend", t: "i'm here!!" }, { who: "friend2", t: "your status says offline" }, { who: "friend", t: "it's a glitch. the app is glitching" }, { who: "friend3", t: "everyone else is fine, though" }] },
    { id: "ev-here-liar-4", kind: "friend-late", persona: "here-liar", weight: 0.8, when: { weekMin: 4 },
      lines: [{ who: "friend", t: "yep. here. fully here" }, { who: "friend2", t: "send a pic of your screen" }, { who: "friend", t: "it's the loading screen" }, { who: "friend2", t: "that's a desktop wallpaper" }] },
    { id: "ev-here-liar-5", kind: "friend-late", persona: "here-liar", weight: 0.8, when: { weekMin: 5 },
      lines: [{ who: "friend", t: "i've been here since {time}" }, { who: "friend2", t: "we've been here since {time} and haven't seen you" }, { who: "friend", t: "i'm very quiet" }] },
    { id: "ev-here-liar-6", kind: "friend-late", persona: "here-liar", weight: 0.7, when: { weekMin: 6 },
      lines: [{ who: "friend", t: "i'm here. i just got up for a second" }, { who: "friend2", t: "your second has been 40 minutes" }, { who: "friend", t: "ok i'm HERE-here now. coming" }, { who: "friend2", t: "you are not" }] },
    /* the friend who is perpetually "on the way" */
    { id: "ev-on-the-way-1", kind: "friend-late", persona: "on-the-way", weight: 1, when: { weekMin: 1 },
      lines: [{ who: "friend", t: "omw" }, { who: "friend2", t: "to vc?" }, { who: "friend", t: "yeah, 5 min" }, { who: "friend2", t: "that was 40 minutes ago" }, { who: "friend", t: "traffic" }] },
    { id: "ev-on-the-way-2", kind: "friend-late", persona: "on-the-way", weight: 1, when: { weekMin: 2 },
      lines: [{ who: "friend", t: "on my way, 2 min" }, { who: "friend2", t: "you live 0 minutes away" }, { who: "friend", t: "it's a slow 0 minutes" }] },
    { id: "ev-on-the-way-3", kind: "friend-late", persona: "on-the-way", weight: 1, when: { weekMin: 3 },
      lines: [{ who: "friend", t: "almost there!" }, { who: "friend2", t: "to a computer?" }, { who: "friend", t: "to the computer. almost" }, { who: "friend3", t: "he's been 'almost' for an hour" }] },
    { id: "ev-on-the-way-4", kind: "friend-late", persona: "on-the-way", weight: 0.8, when: { weekMin: 4 },
      lines: [{ who: "friend", t: "on my way. i'm packing the computer" }, { who: "friend2", t: "why are you packing it" }, { who: "friend", t: "i think there's a cable missing. one sec" }] },
    { id: "ev-on-the-way-5", kind: "friend-late", persona: "on-the-way", weight: 0.8, when: { weekMin: 5 },
      lines: [{ who: "friend", t: "omw, i'm literally in the parking lot" }, { who: "friend2", t: "of your house?" }, { who: "friend", t: "of the gas station next to it" }] },
    { id: "ev-on-the-way-6", kind: "friend-late", persona: "on-the-way", weight: 0.7, when: { weekMin: 6 },
      lines: [{ who: "friend", t: "10 min" }, { who: "friend2", t: "you said 10 min an hour ago" }, { who: "friend", t: "it's a good 10 min. very consistent" }, { who: "friend3", t: "it's the same 10 min" }] },
    /* the friend who only logs in at the last second, then claims they were there all along */
    { id: "ev-last-second-1", kind: "friend-late", persona: "last-second", weight: 1, when: { weekMin: 1 },
      lines: [{ who: "friend", t: "(joined voice)" }, { who: "friend2", t: "oh hey, 30 seconds before we call it" }, { who: "friend", t: "right on time" }] },
    { id: "ev-last-second-2", kind: "friend-late", persona: "last-second", weight: 1, when: { weekMin: 2 },
      lines: [{ who: "friend", t: "(joined voice at {time})" }, { who: "friend2", t: "where were you for the last hour" }, { who: "friend", t: "preparing. mentally" }] },
    { id: "ev-last-second-3", kind: "friend-late", persona: "last-second", weight: 1, when: { weekMin: 3 },
      lines: [{ who: "friend", t: "(joined, then immediately left)" }, { who: "friend2", t: "did he just." }, { who: "friend3", t: "he did." }] },
    { id: "ev-last-second-4", kind: "friend-late", persona: "last-second", weight: 0.8, when: { weekMin: 4 },
      lines: [{ who: "friend", t: "(joined at 11:59pm)" }, { who: "friend2", t: "bro it's {day} over" }, { who: "friend", t: "technically i was on time" }] },
    { id: "ev-last-second-5", kind: "friend-late", persona: "last-second", weight: 0.8, when: { weekMin: 5 },
      lines: [{ who: "friend", t: "(joined, muted, afk)" }, { who: "friend2", t: "he's here but not here" }, { who: "friend3", t: "he's {friend}-ing again" }] },
    { id: "ev-last-second-6", kind: "friend-late", persona: "last-second", weight: 0.7, when: { weekMin: 6 },
      lines: [{ who: "friend", t: "(joined 1 second before everyone left)" }, { who: "friend2", t: "good timing as always" }, { who: "friend", t: "i've been waiting at the door, i just didn't knock" }] }
  ];

  /* solidarity: a friend flakes just after the player. {cause} lines are skipped by the engine when empty. */
  F.solidarity = [
    "oh thank god, i was gonna cancel too",
    "ok so none of us are playing then",
    "{me}, the {cause} thing saved me, same excuse?",
    "i was about to say something worse than {cause}",
    "wait, you cancel? i'm cancelling too, yes",
    "{me} thank you for going first, i'm also out",
    "nobody wants to be first to say it. thanks {me}",
    "{cause}? same energy. i'm out too",
    "ok if {me} isn't playing i'm definitely not playing",
    "that's a green light for the rest of us, right",
    "relief. pure relief. i'm out too",
    "i've been staring at the cancel button for an hour. {me} did it for me",
    "I'll use the same excuse but with different details",
    "i love when someone else cancels first",
    "if {cause} counts i'd like to claim the exact same thing",
    "ok that's one cancel. who wants to be two",
    "perfect. now i don't have to type my excuse",
    "i guess {day} is just for resting now"
  ];

  F.playerCatchesFriend = [
    "...ok fair. i also don't want to play",
    "caught me. i'm just lazy",
    "you got me. but you've also done it",
    "alright alright. i just wanted to sleep",
    "fine. true. i have no excuse",
    "ok you got me but also you're a flaker, so",
    "wow how did you know",
    "i'm not lying i'm just... selectively truthful",
    "damn, my cover story had one job",
    "you can't blame me, you taught me",
    "ok yes, i'm in my bed. happy?",
    "guilty. i'll buy snacks next week",
    "you're right. i'm lying. but you're lying too, we're even",
    "dang, the master has become the student, wait reverse that",
    "yeah i made it up. it's a skill I learned from you"
  ];

  F.snowball = [
    "wait is {friend} not coming either",
    "ok that's 3 of us",
    "so who's actually coming then",
    "{friend} just left too. it's me and the void",
    "that's 4 out of 5. the fifth is a ghost",
    "ok if {friend} is out then it's pointless",
    "oh no, {friend} is out too. domino time",
    "another one down. {friend} too",
    "we're losing people like it's a survival game",
    "{friend} just bailed. we've got 1 person left",
    "the group is shrinking. {friend} and i are looking at each other",
    "ok that's everyone then. {friend} too",
    "{friend}'s out. we should just rename the chat 'cancelled'",
    "can we count {friend} as a no? yeah ok",
    "the trend continues: {friend} is also out"
  ];
})();
