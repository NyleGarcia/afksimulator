/* BoberNet pack: Game Night excuse parts (ship / org / patch flavour). Invented names only. */
(function () {
  var P = window.AFK_PACKS = window.AFK_PACKS || {};
  var B = P.bobernet = P.bobernet || {};
  var G = B.gamenight = B.gamenight || {};
  G.parts = (G.parts || []).concat([
    /* ---- causes ---- */
    { id: 'c-patch-wipe', slot: 'cause', label: 'Patch wiped my ship', text: "the patch wiped my ship and i'm rebuying it with in-game money i don't have", short: 'my wiped ship', elab: 3, tags: ['ship-lost'], ttl: 3 },
    { id: 'c-30k-run', slot: 'cause', label: 'Mid big cargo run', text: "i'm 40 minutes into a big cargo run and if i log off the whole haul is gone", short: 'my big cargo run', elab: 4, tags: ['big-haul'], ttl: 1, contradicts: ['ship-lost', 'claim'] },
    { id: 'c-30k-crash', slot: 'cause', label: 'Server crash at the finish', text: "the server threw a 30k right as i landed. the cargo, the ship, my whole evening", short: 'my 30k server crash', elab: 3, tags: ['server-crash'], ttl: 0 },
    { id: 'c-insurance-claim', slot: 'cause', label: 'Ship stuck in claim timer', text: "my ship is in claim and the timer says 2 hours, i can't even spawn a bike", short: 'my claim timer', elab: 3, tags: ['claim'], ttl: 1, contradicts: ['big-haul'] },
    { id: 'c-elevator', slot: 'cause', label: 'Hangar elevator ate me', text: "the hangar elevator dropped me through the floor and i'm just a floating head in a hallway", short: 'my hangar elevator incident', elab: 2, tags: ['hangar'], ttl: 0 },
    { id: 'c-pirate-ambush', slot: 'cause', label: 'Pirates at the jump point', text: "pirates grabbed me at the jump point and they want my cargo and apparently my {game} night", short: 'my pirate ambush', elab: 3, tags: ['pirate'], ttl: 2, contradicts: ['ship-lost'] },
    { id: 'c-cargo-glitch', slot: 'cause', label: 'Cargo glitched into the wall', text: "my cargo clipped into the ship wall and i can't unload or leave, it's a whole situation", short: 'my cargo glitch', elab: 3, tags: ['cargo-glitch'], ttl: 2 },
    { id: 'c-patch-day', slot: 'cause', label: 'Patch day download', text: "patch day. 80GB. the launcher says 4 hours and the bar hasn't moved since lunch", short: 'my patch download', elab: 2, tags: ['patch'], ttl: 1 },
    { id: 'c-org-double-booked', slot: 'cause', label: 'Org op double-booked me', text: "the org scheduled a fleet op for the same time and i apparently RSVP'd to both", short: 'my double-booked org op', elab: 4, tags: ['org-op'], ttl: 2, contradicts: ['ship-lost'] },
    { id: 'c-quantum-stuck', slot: 'cause', label: 'Stuck in quantum travel', text: "i quantum'd and the loading screen never ended. it's been 20 minutes. i can see my hands", short: 'my quantum limbo', elab: 2, tags: ['quantum'], ttl: 0 },
    { id: 'c-bed-clip', slot: 'cause', label: 'Fell through my bed', text: "i logged out in a bed and woke up under the station. i'm legally a ghost now", short: 'my bed clip', elab: 2, tags: ['bed-clip'], ttl: 0 },
    { id: 'c-contract-bugged', slot: 'cause', label: "Contract won't complete", text: "the hauling contract won't complete and abandoning it costs more than i have", short: 'my bugged contract', elab: 3, tags: ['contract'], ttl: 2 },
    { id: 'c-wrong-station', slot: 'cause', label: 'Spawned at the wrong station', text: "i spawned at a station across the system with no ship and a stranger's sandwich", short: 'my wrong-station spawn', elab: 3, tags: ['wrong-station'], ttl: 1 },
    { id: 'c-refinery-job', slot: 'cause', label: 'Refinery job ready to collect', text: "my refinery job finishes at exactly {time} and the ore expires if i don't pick it up", short: 'my refinery job', elab: 3, tags: ['refinery'], ttl: 2 },
    { id: 'c-bunker-camping', slot: 'cause', label: 'Camping a bunker for a drop', text: "i've been camping this bunker for a rare drop since noon and if i leave it respawns for someone else", short: 'my bunker stakeout', elab: 4, tags: ['bunker'], ttl: 1 },
    /* ---- callbacks ---- */
    { id: 'c-cb-ship-still-gone', slot: 'cause', label: 'Ship STILL not back', text: "update on the ship: still gone. the insurance clerk said 'please hold' and i'm holding", short: 'my still-missing ship', elab: 3, requires: ['ship-lost'], callback: true },
    { id: 'c-cb-claim-again', slot: 'cause', label: 'Claim timer reset again', text: "so the claim timer reset itself overnight. it's back at 2 hours. i didn't touch anything", short: 'my reset claim timer', elab: 3, requires: ['claim'], callback: true },
    { id: 'c-cb-pirates-again', slot: 'cause', label: 'Same pirates, new ambush', text: "the pirates from last time recognized my ship. they brought snacks and friends", short: 'my pirate rematch', elab: 4, requires: ['pirate'], callback: true },
    { id: 'c-cb-cargo-still', slot: 'cause', label: 'Cargo still in the wall', text: "the cargo is still in the wall. support said 'have you tried not'", short: 'my cargo-in-wall saga', elab: 3, requires: ['cargo-glitch'], callback: true },
    { id: 'c-cb-contract-sequel', slot: 'cause', label: 'Contract bugged AGAIN', text: "the contract bug is back. i did the same contract 3 times and it paid me in hope", short: 'my contract sequel', elab: 3, requires: ['contract'], callback: true },
    { id: 'c-cb-org-moved', slot: 'cause', label: 'Org op moved onto tonight', text: "remember the double-booked op? they rescheduled it onto tonight. i'm the only one with the cargo", short: 'my rescheduled org op', elab: 4, requires: ['org-op'], callback: true },
    /* ---- escalations ---- */
    { id: 'e-claim-reset', slot: 'escalation', label: 'Timer resets itself', text: "and then the claim timer reset itself when i looked at it", elab: 2, fits: ['ship-lost', 'claim'] },
    { id: 'e-insurance-lapsed', slot: 'escalation', label: 'Insurance lapsed', text: "and the insurance on it lapsed yesterday, apparently", elab: 3, fits: ['ship-lost', 'claim'] },
    { id: 'e-respawn-loop', slot: 'escalation', label: 'Respawns in same spot', text: "and every time i respawn it puts me back in the exact same spot", elab: 2, fits: ['hangar', 'quantum', 'bed-clip', 'wrong-station'] },
    { id: 'e-support-bot', slot: 'escalation', label: 'Support asked me to restart', text: "i filed a ticket and the bot asked me to restart the game i'm trying to quit", elab: 2 },
    { id: 'e-server-meltdown', slot: 'escalation', label: 'Whole shard rubber-banding', text: "and the whole shard is rubber-banding so everyone's stuck with me", elab: 3, fits: ['big-haul', 'server-crash', 'cargo-glitch', 'contract'] },
    { id: 'e-pirate-reinforce', slot: 'escalation', label: 'Their friends showed up', text: "and now their friends showed up and they brought a much bigger ship", elab: 3, fits: ['pirate', 'big-haul'] },
    { id: 'e-armistice', slot: 'escalation', label: 'Stuck in armistice zone', text: "and i'm sitting in the armistice zone so i can't even fight back", elab: 2, fits: ['pirate', 'wrong-station'] },
    { id: 'e-eighty-gig', slot: 'escalation', label: 'Restarts at 99 percent', text: "and the patch restarted at 99% and now it wants 80GB again", elab: 3, fits: ['patch'] },
    { id: 'e-launcher-loop', slot: 'escalation', label: 'Launcher says verifying', text: "and the launcher just says 'verifying' like a hostage video", elab: 2, fits: ['patch'] },
    { id: 'e-leader-needs-me', slot: 'escalation', label: "Org leader says I can't miss it", text: "and the org lead says i can't miss it because i'm 'the logistics'", elab: 3, fits: ['org-op'] },
    { id: 'e-bunker-rival', slot: 'escalation', label: 'Someone else camps the drop', text: "and another player is camping the same drop and we're both too stubborn to leave", elab: 3, fits: ['bunker', 'refinery'] },
    { id: 'e-ore-expires', slot: 'escalation', label: 'Ore expires in 15 minutes', text: "and the ore expires in 15 minutes, which is basically my whole week", elab: 2, fits: ['refinery', 'contract'] },
    { id: 'e-deleted-character', slot: 'escalation', label: 'Replaced by a guy named Gary', text: "and then the game deleted my character and replaced me with a stranger named Gary", elab: 5, unlocks: 4 },
    /* ---- proofs ---- */
    { id: 'p-claim-screenshot', slot: 'proof', label: 'Screenshot the claim timer', text: "i'll screenshot the claim timer, it's literally counting down", short: 'the claim timer screenshot', proofLabel: 'claim timer screenshot', elab: 2, fits: ['claim', 'ship-lost'] },
    { id: 'p-glitch-clip', slot: 'proof', label: 'Clip of the glitch', text: "i recorded it, the cargo is just INSIDE the wall", short: 'a clip of the glitch', proofLabel: 'clip of the glitch', elab: 3, fits: ['cargo-glitch', 'hangar', 'bed-clip', 'quantum'] },
    { id: 'p-crash-log', slot: 'proof', label: 'Send the crash log', text: "i have the crash log, it says 30000 which is not a good number", short: 'the crash log', proofLabel: 'crash log (error 30000)', elab: 3, fits: ['server-crash', 'big-haul', 'quantum'] },
    { id: 'p-launcher-bar', slot: 'proof', label: 'Photo of the launcher bar', text: "i'll send a picture of the progress bar, it hasn't moved, you can feel it", short: 'the stuck progress bar', proofLabel: 'stuck launcher bar', elab: 2, fits: ['patch'] },
    { id: 'p-org-calendar', slot: 'proof', label: 'Org calendar screenshot', text: "look at the org calendar, i'm literally on two events at once", short: 'my double-booked calendar', proofLabel: 'org calendar double-book', elab: 3, fits: ['org-op'] },
    { id: 'p-cargo-manifest', slot: 'proof', label: 'Cargo manifest', text: "here's the cargo manifest, 696 units of something expensive", short: 'the cargo manifest', proofLabel: 'cargo manifest (full hold)', elab: 4, fits: ['big-haul', 'contract', 'cargo-glitch', 'refinery'] },
    { id: 'p-support-ticket', slot: 'proof', label: 'Support ticket number', text: "my support ticket number is 4 and it's been 'in review' since spring", short: 'the support ticket', proofLabel: 'support ticket #4', elab: 3 },
    { id: 'p-pirate-comms', slot: 'proof', label: 'Pirate comms recording', text: "i recorded the pirate on comms, he said 'nice cargo' very slowly", short: 'the pirate comms recording', proofLabel: 'pirate comms recording', elab: 4, fits: ['pirate', 'wrong-station'] },
    { id: 'p-empty-loot', slot: 'proof', label: 'Empty loot screen', text: "here's a shot of the empty loot screen. that's what suffering looks like", short: 'my empty loot screen', proofLabel: 'empty loot screen', elab: 3, fits: ['bunker', 'refinery'] },
    { id: 'p-trust-me', slot: 'proof', label: 'Trust me about the ship', text: "i don't have proof but you know i've never lied about a ship", short: 'my word about the ship', proofLabel: 'trust me about the ship', elab: 1 },
    /* ---- witnesses ---- */
    { id: 'w-org-logistics', slot: 'witness', label: 'Org logistics officer saw it', text: "our logistics officer was literally in my lobby and saw the whole thing", elab: 3, fits: ['org-op', 'big-haul', 'contract', 'refinery'] },
    { id: 'w-stranger-lobby', slot: 'witness', label: 'A guy in my lobby', text: "some guy named Torvic in my instance saw it and he's mad too", elab: 3 },
    { id: 'w-bartender-npc', slot: 'witness', label: 'The bartender NPC', text: "the bartender NPC watched me appear and said nothing, which counts", elab: 2, fits: ['wrong-station', 'hangar', 'quantum', 'bed-clip'] },
    { id: 'w-support-bot', slot: 'witness', label: 'The support bot', text: "the support bot confirmed it. it said 'we are aware of the issue'", elab: 2 },
    { id: 'w-three-in-elevator', slot: 'witness', label: 'Three people in the elevator', text: "three people were in the elevator with me and we all fell. we're a support group now", elab: 4, fits: ['hangar', 'quantum', 'bed-clip', 'server-crash'] },
    { id: 'w-cargo-buddy', slot: 'witness', label: 'My cargo buddy is stuck too', text: "my cargo buddy is stuck too, you can ask him, he's crying in the cockpit", elab: 3, fits: ['big-haul', 'cargo-glitch', 'contract', 'pirate'] },
    { id: 'w-whole-shard', slot: 'witness', label: 'The whole shard', text: "literally 200 people in global chat are complaining about it right now", elab: 5, fits: ['server-crash', 'big-haul', 'patch'] },
    { id: 'w-claims-clerk', slot: 'witness', label: 'The claims clerk NPC', text: "the claims clerk looked me in the eyes and said 'two hours'", elab: 3, fits: ['claim', 'ship-lost'] },
    /* ---- promises ---- */
    { id: 'f-bn-lead-fleet', slot: 'promise', label: "I'll lead the next fleet night", text: "i'll organize the next fleet night myself, with a spreadsheet", elab: 3 },
    { id: 'f-bn-haul-weekend', slot: 'promise', label: "I'll haul for the org all weekend", text: "i'll haul for the org the whole weekend, free of charge", elab: 4 },
    { id: 'f-bn-first-vc', slot: 'promise', label: "I'll be first in voice", text: "next time i'll be in voice 20 minutes early with the ship fueled", elab: 2 },
    { id: 'f-bn-escort', slot: 'promise', label: "I'll fly escort", text: "next op i'll fly escort so you can all stay safe and sit behind me", elab: 3 },
    { id: 'f-bn-swear-ship', slot: 'promise', label: 'I swear on my best ship', text: "i swear on my best ship. the one that's in claim", elab: 5 }
  ]);
})();
