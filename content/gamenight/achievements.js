/* Game Night ("{Day} Never Happens"): achievements, weekly "Excuse of the Week" awards, rank titles.
 *
 * Each achievement/award carries a declarative `when` block the engine evaluates. Vocabulary:
 *  - outcome fields (same as outcomes.js): weekMin weekMax kMin kMax eMin eMax flakersMin flakersMax moraleMax strikesMin tags approach
 *  - kind: outcome kind or ending id that must fire (skipped, called-out, dragged-in, everyone-flaked, update-hell, ending:kicked, ...)
 *  - run counters (>=): skipsMin streakMin callbacksMin callbacksInRowMin proofPerfectMin contradictionsPassedMin
 *    standDownsMin attendsMin ledgerMin debtMin allFlakeWeeksMin makeUpMin
 *  - flags: proof ('perfect'|'pass'|'closest'), believed (bool), usedFriendAsWitness (bool), actionsInWeekMin (n)
 *  - scope: 'week' (checked at RESOLVE for that week) | 'run' (checked at end of any week / run end)
 * A missing key means "do not care". Engine owns evaluation; this file is pure data.
 */
(function () {
  var C = window.AFK_CONTENT = window.AFK_CONTENT || {};
  var G = C.gamenight = C.gamenight || {};

  G.achievements = (G.achievements || []).concat([
    { id: 'gn-first-skip', name: 'Never Again', desc: 'Skip your first {day}', hint: 'Cancel once.', when: { scope: 'run', skipsMin: 1 } },
    { id: 'gn-streak-5', name: 'Five In A Row', desc: 'Stay consistent for 5 believed weeks in a row', hint: 'Do not get caught for five weeks.', when: { scope: 'run', streakMin: 5 } },
    { id: 'gn-callback', name: 'The Sequel', desc: 'Use a callback to an earlier excuse', hint: 'Reference last week\'s lie.', when: { scope: 'run', callbacksMin: 1 } },
    { id: 'gn-callback-3', name: 'Lore Master', desc: 'Use 3 callbacks in one run', hint: 'Build a saga.', when: { scope: 'run', callbacksMin: 3 } },
    { id: 'gn-perfect-proof', name: 'Under Oath', desc: 'Ace a proof challenge: 3 right, 0 wrong', hint: 'Remember your own story.', when: { scope: 'week', proof: 'perfect' } },
    { id: 'gn-contradiction-survived', name: 'Explain Yourself', desc: 'Pass a proof challenge after a contradiction', hint: 'Get caught, then talk your way out.', when: { scope: 'week', contradictionsPassedMin: 1 } },
    { id: 'gn-showed-up', name: 'Actually Showed', desc: 'ATTEND once. Voluntarily. Why', hint: 'Choose the cursed fourth button.', when: { scope: 'run', attendsMin: 1 } },
    { id: 'gn-everyone-flaked', name: 'Everyone Flaked', desc: 'Get a week where nobody played', hint: 'Skip when all the friends skip.', when: { scope: 'week', kind: 'everyone-flaked' } },
    { id: 'gn-never-happens', name: 'It Never Happens', desc: 'Three weeks in a row where nobody plays', hint: 'Secret ending.', when: { scope: 'run', kind: 'ending:never-happens' } },
    { id: 'gn-update-hell', name: 'Update Hell', desc: 'Survive a week the game needs a giant update', hint: 'Wait for the patch.', when: { scope: 'week', kind: 'update-hell' } },
    { id: 'gn-six-wild', name: 'Peak Fiction', desc: 'Get a 20+ elaboration excuse believed', hint: 'Go big, stay lucky.', when: { scope: 'week', eMin: 20, believed: true } },
    { id: 'gn-lamest', name: 'Lowest Effort', desc: 'Get a 3-or-less elaboration excuse believed', hint: 'They did not even ask.', when: { scope: 'week', eMax: 3, believed: true } },
    { id: 'gn-detective-beaten', name: 'Lie Detective Defeated', desc: 'Make a detective friend stand down', hint: 'Win them over with proof or three clean weeks.', when: { scope: 'run', standDownsMin: 1 } },
    { id: 'gn-12-weeks', name: 'Twelve Cancelled Weeks', desc: 'Survive 12 weeks', hint: 'Last the season.', when: { scope: 'run', weekMin: 12, kind: 'ending:survived' } },
    { id: 'gn-3-strikes-kicked', name: 'Three Strikes', desc: 'Get kicked from the group chat', hint: 'Fail often enough.', when: { scope: 'run', kind: 'ending:kicked' } },
    { id: 'gn-ghost', name: 'Smooth Ghost', desc: 'Ghost a week with skepticism under 20', hint: 'Vanish quietly.', when: { scope: 'week', approach: 'ghost', kMax: 19, believed: true } },
    { id: 'gn-flake-chain', name: 'Flake Chain', desc: '3 skipped weeks where every friend also flaked', hint: 'Group solidarity.', when: { scope: 'run', allFlakeWeeksMin: 3 } },
    { id: 'gn-hat-trick', name: 'Hat Trick', desc: 'Use callbacks in 3 weeks in a row', hint: 'Keep the saga running.', when: { scope: 'run', callbacksInRowMin: 3 } },
    { id: 'gn-ledger-full', name: 'Full Ledger', desc: 'Have 10 or more claims in the ledger', hint: 'Keep lying.', when: { scope: 'run', ledgerMin: 10 } },
    { id: 'gn-callback-king', name: 'Callback King', desc: 'Stay consistent for 10 believed weeks in a row', hint: 'The long game.', when: { scope: 'run', streakMin: 10 } },
    { id: 'gn-week-20', name: 'Week 20', desc: 'Survive to week 20 in endless mode', hint: 'Keep going. Keep canceling.', when: { scope: 'run', weekMin: 20 } },
    { id: 'gn-double-cancel', name: 'Cancelled Twice In One Day', desc: 'Cancel early, then ghost the same week', hint: 'PREEMPT, then change your mind.', when: { scope: 'week', actionsInWeekMin: 2, approach: 'ghost' } },
    { id: 'gn-disbanded', name: 'Group Chat Archived', desc: 'See the group disband', hint: 'Let morale hit zero.', when: { scope: 'run', kind: 'ending:disbanded' } },
    { id: 'gn-debt-collector', name: 'Promise Debt', desc: 'Reach debt 5 and still not get kicked', hint: 'Promise a lot. Keep none.', when: { scope: 'run', debtMin: 5 } },
    { id: 'gn-make-up', name: 'Snack Diplomat', desc: 'Buy the group snacks to make up for flaking', hint: 'Use MAKE-UP.', when: { scope: 'run', makeUpMin: 1 } }
  ]);

  G.awards = (G.awards || []).concat([
    { id: 'most-elaborate', name: 'Most Elaborate', desc: 'Your most elaborate excuse so far', when: { scope: 'week', believed: true, eMin: 14 } },
    { id: 'best-callback', name: 'Best Callback', desc: 'Used two callbacks in one excuse', when: { scope: 'week', callbacksMin: 2 } },
    { id: 'closest-call', name: 'Closest Call', desc: 'Passed proof with exactly two correct', when: { scope: 'week', proof: 'closest' } },
    { id: 'perfect-liar', name: 'Perfect Liar', desc: 'Aced the proof challenge', when: { scope: 'week', proof: 'perfect' } },
    { id: 'lamest', name: 'Lamest Excuse', desc: 'A believed lie with almost no effort', when: { scope: 'week', eMax: 4, believed: true } },
    { id: 'cruel', name: 'Cruel But Effective', desc: 'Used a friend as your witness', when: { scope: 'week', usedFriendAsWitness: true } },
    { id: 'longest-con', name: 'Longest Con', desc: 'Kept the story going for 6 weeks', when: { scope: 'week', streakMin: 6 } },
    { id: 'speedrun-cancel', name: 'Speedrun Cancel', desc: 'Cancelled at the earliest beat', when: { scope: 'week', approach: 'preempt' } },
    { id: 'under-the-wire', name: 'Under The Wire', desc: 'A late build that still got believed', when: { scope: 'week', approach: 'build', believed: true, eMin: 14, actionsInWeekMin: 1 } },
    { id: 'solidarity', name: 'Solidarity Forever', desc: 'Skipped while 3 or more friends did too', when: { scope: 'week', flakersMin: 3, kind: 'skipped' } },
    { id: 'redemption', name: 'Redemption Arc', desc: 'Got dragged in after a strike and survived', when: { scope: 'week', kind: 'dragged-in', strikesMin: 1 } },
    { id: 'plot-twist', name: 'Plot Twist', desc: 'Passed a proof challenge after the group almost caught you', when: { scope: 'week', kMin: 60, proof: 'pass' } }
  ]);

  G.titles = (G.titles || []).concat([
    { id: 't-casual', name: 'Casual Canceller', minPts: 0 },
    { id: 't-regular', name: 'Regular Flake', minPts: 250 },
    { id: 't-pro', name: 'Professional Flake', minPts: 800 },
    { id: 't-artist', name: 'Excuse Artist', minPts: 1500 },
    { id: 't-legend', name: 'Legend of the Lie', minPts: 2200 },
    { id: 't-mythic', name: 'The Lie Itself', minPts: 2500 }
  ]);
})();
