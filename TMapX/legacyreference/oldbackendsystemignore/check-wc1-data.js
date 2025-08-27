
const mongoose = require('mongoose');
const Player = require('./models/Player');
const Match = require('./models/Match');

mongoose.connect('mongodb://localhost:27017/newsite').then(async () => {
  console.log('Connected to MongoDB');
  
  // Check WC1 players
const wc1Players = await Player.countDocuments({
  gameType: 'wc1'
});
  console.log(`WC1 players in database: ${wc1Players}`);
  
  // Check WC1 matches
  const wc1Matches = await Match.countDocuments({
    gameType: 'wc1'
  });
  console.log(`WC1 matches in database: ${wc1Matches}`);
  
  // Get sample WC1 player
  const samplePlayer = await Player.findOne({
    gameType: 'wc1'
  }).lean();
  
  if (samplePlayer) {
    console.log('\nSample WC1 player:');
    console.log(`- Name: ${samplePlayer.name}`);
    console.log(`- GameType: ${samplePlayer.gameType}`);
    console.log(`- MMR: ${samplePlayer.mmr}`);
    console.log(`- Wins: ${samplePlayer.wins || 0}`);
    console.log(`- Losses: ${samplePlayer.losses || 0}`);
    console.log(`- Has stats.matchTypes: ${!!samplePlayer.stats?.matchTypes}`);
  }
  
  // Get sample WC1 match
  const sampleMatch = await Match.findOne({
    gameType: 'wc1'
  }).lean();
  
  if (sampleMatch) {
    console.log('\nSample WC1 match:');
    console.log(`- GameType: ${sampleMatch.gameType}`);
    console.log(`- MatchType: ${sampleMatch.matchType}`);
    console.log(`- Players: ${sampleMatch.players?.length || 0}`);
    console.log(`- Winner: ${sampleMatch.winner}`);
    console.log(`- Date: ${sampleMatch.createdAt}`);
    
    if (sampleMatch.players) {
      console.log('\nMatch players:');
      sampleMatch.players.forEach((player, i) => {
        console.log(`  ${i + 1}. ${player.name} (${player.race}) - MMR: ${player.mmrBefore} -> ${player.mmrAfter}`);
      });
    }
  } else {
    console.log('\nNo WC1 matches found in database');
  }
  
  // Check if players have associated matches
  const playersWithMatches = await Match.aggregate([
    { $match: { gameType: 'wc1' } },
    { $unwind: '$players' },
    { $group: { _id: '$players.playerId' } },
    { $count: 'total' }
  ]);
  
  const uniquePlayersWithMatches = playersWithMatches[0]?.total || 0;
  console.log(`\nUnique WC1 players with matches: ${uniquePlayersWithMatches}`);
  
  mongoose.connection.close();
  console.log('\nDone!');
}); 