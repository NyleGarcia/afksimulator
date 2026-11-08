/* BoberNet pack: Game Night friend flakes. Tokens: {me} {friend} {day} {time} {game} {week} {cause} (solidarity only). */
(function () {
  var P = window.AFK_PACKS = window.AFK_PACKS || {};
  var B = P.bobernet = P.bobernet || {};
  var G = B.gamenight = B.gamenight || {};
  var F = G.flakes = G.flakes || {};
  function cat(a, b) { return (a || []).concat(b); }
  F.traits = Object.assign(F.traits || {}, { _default: { flakiness: 0.3, persistence: 0.4, gullibility: 0.5, drama: 0.4 } });
  F.friendExcuses = cat(F.friendExcuses, [
    { id: 'fx-bn-claim', t: "my ship's in claim, I literally can't fly", elab: 2, beat: 'morning', caught: "your ship has been in claim since March. what's different?" },
    { id: 'fx-bn-elevator', t: "the elevator keeps killing me", elab: 2, beat: 'any', caught: "you use the stairs, there's a staircase" },
    { id: 'fx-bn-patch', t: "I'm still on the patch, 3 hours left", elab: 2, beat: 'afternoon', caught: "you said it was a 2GB patch last time" },
    { id: 'fx-bn-org', t: "the org double-booked me with another op", elab: 3, beat: 'hour', caught: "you are the one who schedules the ops" },
    { id: 'fx-bn-pirates', t: "pirates have my cargo, give me an hour", elab: 3, beat: 'hour', caught: "you didn't have cargo this morning" },
    { id: 'fx-bn-quantum', t: "I'm stuck in quantum, loading", elab: 2, beat: 'zero', caught: "you can still type in chat from quantum, nice" },
    { id: 'fx-bn-bed', t: "I fell through my bed again, hold on", elab: 3, beat: 'any', caught: "you fall through the bed every Thursday" },
    { id: 'fx-bn-refinery', t: "my refinery job isn't done, I can't leave it", elab: 3, beat: 'afternoon', caught: "you can pick it up tomorrow, it's ore" },
    { id: 'fx-bn-launcher', t: "the launcher won't launch", elab: 1, beat: 'any', caught: "you launched it yesterday, my guy" },
    { id: 'fx-bn-crash', t: "I crashed with a 30k, rebooting", elab: 2, beat: 'zero', caught: "it's been 'rebooting' for 2 hours" },
    { id: 'fx-bn-wallet', t: "I'm broke after the patch, can't afford a ship", elab: 3, beat: 'morning', caught: "you just bought a new pair of boots" },
    { id: 'fx-bn-support', t: "I'm on a support ticket call, can't talk", elab: 4, beat: 'hour', caught: "there is no support phone line" }
  ]);
  F.events = cat(F.events, [
    { id: 'ev-bn-fleet-cancelled', kind: 'mass-flake', weight: 1, when: { weekMin: 2, flakersMin: 2 }, lines: [{ who: 'friend', t: "same here, my ship is in a wall" }, { who: 'friend2', t: "fleet night is cancelled, long live fleet night" }] },
    { id: 'ev-bn-elevator-gang', kind: 'friend-caught', weight: 1, when: { weekMin: 1 }, lines: [{ who: 'friend', t: "wait, you told me the elevator was fixed" }, { who: 'friend2', t: "it IS fixed, it just lies" }] },
    { id: 'ev-bn-late-friend', kind: 'friend-late', weight: 1, when: { weekMin: 1 }, lines: [{ who: 'friend', t: "sorry sorry I'm 30 min late, in transit" }, { who: 'friend2', t: "he's been 'in transit' for 3 weeks" }] },
    { id: 'ev-bn-counter-pilot', kind: 'friend-counter', weight: 1, when: { weekMin: 3 }, lines: [{ who: 'friend', t: "if you play I'll fly the escort, deal?" }, { who: 'friend2', t: "I'll bring snacks. real ones" }] },
    { id: 'ev-bn-detective-org', kind: 'friend-detective', weight: 1, when: { weekMin: 4, flakersMax: 2 }, lines: [{ who: 'friend', t: "I pulled the org logs. you weren't in a haul" }, { who: 'friend2', t: "oh no, the logs" }] },
    { id: 'ev-bn-shard-down', kind: 'mass-flake', weight: 1, when: { weekMin: 2, flakersMin: 3 }, lines: [{ who: 'friend', t: "wait is the shard down for everyone" }, { who: 'friend2', t: "yep. none of us can play. lucky us" }] }
  ]);
  F.solidarity = cat(F.solidarity, [
    "ok so none of us are flying then",
    "we have a ship-wide agreement: nobody plays",
    "I was going to say 'patch day' but you got there first",
    "the org is 0 for 6, I feel seen"
  ]);
  F.playerCatchesFriend = cat(F.playerCatchesFriend, [
    "you got me, the elevator is fine",
    "okay okay, my ship isn't actually in claim",
    "alright, I made up the pirates",
    "the 'support call' was me watching clips"
  ]);
  F.snowball = cat(F.snowball, [
    "ok that's 3 of us in claim",
    "{friend} is out too?? the org is just me",
    "fleet night = me and a 30k crash",
    "so it's just {friend} and the elevator tonight"
  ]);
})();
