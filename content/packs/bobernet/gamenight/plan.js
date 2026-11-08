/* BoberNet pack: Game Night planning (org-night chaos). Tokens: {me} {friend} {day} {time} {game} {week}. */
(function () {
  var P = window.AFK_PACKS = window.AFK_PACKS || {};
  var B = P.bobernet = P.bobernet || {};
  var G = B.gamenight = B.gamenight || {};
  var L = G.plan = G.plan || {};
  function cat(a, b) { return (a || []).concat(b); }
  L.gameNames = cat(L.gameNames, ["Fleet Night", "Org Op Night", "Cargo Night", "the big op", "Hangar Tetris", "Bounty Night", "mining run", "the org thing", "Escort Duty", "that ship game"]);
  L.argue = L.argue || {};
  L.argue.day = cat(L.argue.day, [
    "can we move fleet night off {day}, the servers always die",
    "{day} is patch day. why do we always pick patch day",
    "the org does ops on {day}. we're competing with ourselves",
    "{day} is when the shard resets and I lose my cargo",
    "who decided {day}? was it the guy who's never online",
    "it's always {day} and it's always cursed"
  ]);
  L.argue.time = cat(L.argue.time, [
    "{time} is too early, my ship is still in the claim line",
    "make it {time} but give me 20 minutes to stow cargo",
    "{time} is when the pirates come out. pick another",
    "if we start at {time} the elevators will be down",
    "{time}? I'll be mid-haul. 30 more minutes",
    "can we do {time} or later, I'm refining until then"
  ]);
  L.argue.game = cat(L.argue.game, [
    "ok but who has a ship for {game}",
    "we said we'd try {game} tonight. who has insurance",
    "I'll bring the cargo for {game}, someone bring the fuel",
    "{game} needs 4 pilots and 3 of us are in claim",
    "I vote {game}, but only if the elevator works",
    "last time {game} ended in a bunker and a lawsuit"
  ]);
  L.gamePicker = L.gamePicker || {};
  L.gamePicker.options = cat(L.gamePicker.options, [
    { id: 'g-bn-cargo', name: 'Cargo Hauling', vetoLines: ["no more cargo, I did 4 runs this week", "cargo is where friendships go to clip into walls"] },
    { id: 'g-bn-fleet', name: 'Fleet Night', vetoLines: ["not fleet night again, the org hates it", "fleet night has been cancelled for 6 weeks, let it go"] },
    { id: 'g-bn-bounty', name: 'Bounty Hunt', vetoLines: ["bounties again? we have zero medics", "I don't have a ship for bounties, I have a toaster"] },
    { id: 'g-bn-mining', name: 'Mining Run', vetoLines: ["mining is just staring at a rock for 2 hours", "I've been mining since 2019, no more"] },
    { id: 'g-bn-race', name: 'Hangar Races', vetoLines: ["the hangar elevator is not a racetrack", "last race ended in a wall. my wall"] },
    { id: 'g-bn-escort', name: 'Escort Duty', vetoLines: ["escort duty is staring at someone's cargo", "I'm not escorting {friend} again, he flies like a pylon"] }
  ]);
  L.gamePicker.chaos = cat(L.gamePicker.chaos, [
    "poll is tied 2-2-2. one option is 'sleep'",
    "{friend} voted for a ship that doesn't exist",
    "the poll crashed. the poll crashed with a 30k",
    "{friend} voted twice and called it a feature",
    "somebody voted for 'whatever' and it's winning",
    "the poll says 0 votes. the poll was posted in the wrong chat"
  ]);
  L.gamePicker.outcomes = cat(L.gamePicker.outcomes, [
    "ok {game}. nobody has to be happy about it",
    "{game}. the vote was rigged by the one guy with a spreadsheet",
    "it's {game} again. we'll see who shows up",
    "ok {game}. I'll tell the org it's official"
  ]);
  L.beats = L.beats || {};
  L.beats.morning = cat(L.beats.morning, [
    { t: "still on for fleet night? {time}" },
    { t: "{game} tonight yes? my ship is repaired", when: { weekMax: 4 } },
    { t: "is the patch live yet? asking for the org" },
    { t: "{time} tonight. don't forget your insurance this time" },
    { t: "is anyone still stuck in claim? just asking" },
    { t: "morning. org op tonight at {time}, don't be late" }
  ]);
  L.beats.afternoon = cat(L.beats.afternoon, [
    { t: "who's in tonight? ship check", roll: true },
    { t: "headcount for {game}. cargo hauls count as a yes", roll: true },
    { t: "{friend} says he's in. {friend} always says he's in" },
    { t: "I'm refuelling now. who else is on", roll: true },
    { t: "afternoon check: anyone mid-patch?" }
  ]);
  L.beats.hour = cat(L.beats.hour, [
    { t: "{time} guys. I'm already in voice" },
    { t: "ready? {friend} is already in the hangar" },
    { t: "one hour. last call for excuses" },
    { t: "my ship is warm. the org is almost assembled" },
    { t: "{friend} says he's loading in. that's a lie" }
  ]);
  L.beats.zero = cat(L.beats.zero, [
    { t: "{me} the elevator is up. I checked. get in" },
    { t: "the org lead is asking where you are" }
  ]);
  L.beats.zeroAfter = cat(L.beats.zeroAfter, [
    { t: "we left the hangar. you can stay with the elevator" },
    { t: "{me} we're in the verse already. we'll send a postcard" },
    { t: "ok that's it. fleet night is happening. without {me}" }
  ]);
  L.counterOffers = cat(L.counterOffers, [
    { id: 'co-bn-just-escort', t: "just fly escort for 20 minutes", kind: 'time', pressure: 1, accept: "ok 20 minutes of escort. {game}. then 3 hours of stragglers.", declineNeeds: 'escalation', when: { weekMin: 1, flakersMax: 3 } },
    { id: 'co-bn-wait-patch', t: "we'll wait for your patch to finish", kind: 'wait', pressure: 2, accept: "the patch finished. the patch always finishes. you join and it crashes.", declineNeeds: 'proof', when: { weekMin: 2 } },
    { id: 'co-bn-move-thursday', t: "fine, move fleet night to tomorrow", kind: 'move', pressure: 1, accept: "tomorrow it is. everyone cancels again. you win.", declineNeeds: 'promise', when: { weekMin: 1 } },
    { id: 'co-bn-download-lite', t: "just download the lite client, it's only 40GB", kind: 'download', pressure: 2, accept: "the lite client works. you play for 6 hours on a toaster.", declineNeeds: 'escalation', when: { weekMin: 3 } },
    { id: 'co-bn-borrow-ship', t: "we'll lend you a ship, no claim needed", kind: 'lite', pressure: 3, accept: "you fly a borrowed ship. it has a mouse in it.", declineNeeds: 'witness', when: { weekMin: 4, flakersMax: 2 } },
    { id: 'co-bn-just-cargo', t: "just haul one crate, 5 minutes max", kind: 'time', pressure: 1, accept: "5 minutes became 3 hours. the crate had no end.", declineNeeds: 'proof', when: { weekMin: 1 } },
    { id: 'co-bn-voice-only', t: "just sit in voice, you don't have to fly", kind: 'lite', pressure: 2, accept: "you sit in voice. you fly anyway. nobody mentions it.", declineNeeds: 'escalation', when: { weekMin: 2 } }
  ]);
  L.disbandThreat = cat(L.disbandThreat, [
    "this org is dead. I'm flying solo",
    "if nobody shows up next {day} I'm deleting the channel",
    "fleet night is officially a myth",
    "I've been in this org for 3 years. I've flown with you twice"
  ]);
  L.cancelOpeners = cat(L.cancelOpeners, [
    { id: 'pre-bn-1', t: "can't make it tonight, ship's in claim, sorry", elab: 3 },
    { id: 'pre-bn-2', t: "gotta skip, patch day ate my bandwidth", elab: 3 },
    { id: 'pre-bn-3', t: "can't do {day}, org double-booked me", elab: 3 },
    { id: 'pre-bn-4', t: "out tonight, my cargo is mid-run", elab: 3 },
    { id: 'pre-bn-5', t: "I'll skip, the elevator is down again", elab: 3 },
    { id: 'pre-bn-6', t: "not tonight. launcher says 'verifying'", elab: 3 }
  ]);
  L.updateLines = cat(L.updateLines, [
    "the patch is 80GB and it deletes my account progress",
    "{game} needs an update. the update needs an update",
    "patch notes: 'fixed some things.' also broke the hangar",
    "the patch is at 2%. the countdown says 6 hours",
    "patch day. everyone's ship is in a different place",
    "the launcher says 'preparing.' it has said that since Tuesday"
  ]);
  L.differentGame = cat(L.differentGame, [
    "can we just do cargo instead",
    "{friend} bought a new ship, can we try it",
    "everyone's ships are in claim, let's do something else",
    "can we play something that isn't a 30k lottery",
    "I vote we skip {game} and sit in the hangar"
  ]);
})();
