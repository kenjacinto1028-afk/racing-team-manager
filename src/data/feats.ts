// Player feats (achievements). Checked in engine/feats.ts.

export interface FeatDef { id: string; name: string; blurb: string; icon: string }

export const FEATS: FeatDef[] = [
  { id: 'firstPoints', name: 'On the board', blurb: 'Score your first championship points.', icon: '➕' },
  { id: 'firstPodium', name: 'Champagne', blurb: 'Finish on the podium (top 3).', icon: '🍾' },
  { id: 'firstWin', name: 'Winner', blurb: 'Win a race.', icon: '🥇' },
  { id: 'oneTwo', name: 'One-two', blurb: 'Your cars finish 1st and 2nd.', icon: '✌' },
  { id: 'fromTheBack', name: 'From the back', blurb: 'Win from 15th on the grid or lower.', icon: '🚀' },
  { id: 'hardOneStop', name: 'Iron tyres', blurb: 'Win with a one-stop race on hard tyres for both stints.', icon: '🛞' },
  { id: 'grandSlam', name: 'Grand slam', blurb: 'Pole position, the win and the fastest lap in one race.', icon: '💎' },
  { id: 'bothFinishPoints', name: 'Double points', blurb: 'Both cars score points in the same race.', icon: '➗' },
  { id: 'everPresent', name: 'Ever-present', blurb: 'Score points in every race of a season.', icon: '📈' },
  { id: 'promoted', name: 'Moving up', blurb: 'Win promotion to a higher league.', icon: '⬆' },
  { id: 'backToBack', name: 'Back-to-back', blurb: 'Win promotion two seasons in a row.', icon: '⏫' },
  { id: 'teamTitle', name: 'Champions', blurb: "Win a teams' championship.", icon: '🏆' },
  { id: 'driverTitle', name: 'Title driver', blurb: "One of your drivers wins the drivers' championship.", icon: '👑' },
  { id: 'reachPrime', name: 'The big time', blurb: 'Reach Formula Prime.', icon: '⭐' },
  { id: 'primeTitle', name: 'Top of the world', blurb: 'Win the Formula Prime teams\' title.', icon: '🌍' },
  { id: 'closeShave', name: 'Close shave', blurb: 'Drop below $0 and climb back out without going bankrupt.', icon: '😅' },
  { id: 'homegrown', name: 'Homegrown', blurb: 'A driver from your youth academy wins a race for you.', icon: '🌱' },
  { id: 'lapRecord', name: 'Record breaker', blurb: 'Set an all-time lap record at any track.', icon: '⏱' },
];

export const FEAT_BY_ID: Record<string, FeatDef> = Object.fromEntries(FEATS.map((f) => [f.id, f]));
