const mongoose = require('mongoose');
const Match = require('../models/Match');
const Player = require('../models/Player');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/newsite', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function fixMatchMismatches() {
  console.log('🔧 Fixing match type and player count mismatches...\n');

  try {
    // Get all matches
    const matches = await Match.find({}).populate('players.playerId', 'name');
    
    console.log(`📊 Total matches found: ${matches.length}\n`);

    let fixedCount = 0;
    let skippedCount = 0;
    const issues = [];

    for (const match of matches) {
      const originalMatchType = match.matchType;
      const playerCount = match.players.length;
      let needsUpdate = false;
      let newMatchType = originalMatchType;

      // Fix undefined match types based on player count
      if (!originalMatchType || originalMatchType === 'undefined') {
        needsUpdate = true;
        
        // Determine match type based on player count and team structure
        if (playerCount === 2) {
          // Check if it's vsai or 1v1
          const aiPlayers = match.players.filter(p => p.isAI);
          if (aiPlayers.length > 0) {
            newMatchType = 'vsai';
          } else {
            newMatchType = '1v1';
          }
        } else if (playerCount === 4) {
          // Check team structure for 2v2
          const teams = new Set(match.players.map(p => p.team).filter(t => t !== undefined && t !== null));
          if (teams.size === 2) {
            newMatchType = '2v2';
          } else {
            newMatchType = 'ffa';
          }
        } else if (playerCount === 6) {
          // Check team structure for 3v3
          const teams = new Set(match.players.map(p => p.team).filter(t => t !== undefined && t !== null));
          if (teams.size === 2) {
            newMatchType = '3v3';
          } else {
            newMatchType = 'ffa';
          }
        } else if (playerCount === 8) {
          // Check team structure for 4v4
          const teams = new Set(match.players.map(p => p.team).filter(t => t !== undefined && t !== null));
          if (teams.size === 2) {
            newMatchType = '4v4';
          } else {
            newMatchType = 'ffa';
          }
        } else if (playerCount >= 3) {
          newMatchType = 'ffa';
        } else {
          // Fallback for edge cases
          newMatchType = '1v1';
        }

        console.log(`🔧 Fixed match ${match._id}: ${originalMatchType} → ${newMatchType} (${playerCount} players)`);
      }

      // Fix FFA matches missing placements
      if (newMatchType === 'ffa' || originalMatchType === 'ffa') {
        const playersWithoutPlacement = match.players.filter(p => 
          p.placement === undefined || p.placement === null
        );
        
        if (playersWithoutPlacement.length > 0) {
          needsUpdate = true;
          
          // Assign placements based on MMR change (positive = better placement)
          const sortedPlayers = [...match.players].sort((a, b) => {
            const aChange = a.mmrChange || 0;
            const bChange = b.mmrChange || 0;
            return bChange - aChange; // Higher MMR gain = better placement
          });
          
          sortedPlayers.forEach((player, index) => {
            player.placement = index + 1;
          });
          
          console.log(`🏆 Fixed FFA placements for match ${match._id}: ${playersWithoutPlacement.length} players assigned placements`);
        }
      }

      // Fix team assignments for team matches
      if (['2v2', '3v3', '4v4'].includes(newMatchType)) {
        const playersWithoutTeam = match.players.filter(p => 
          p.team === undefined || p.team === null
        );
        
        if (playersWithoutTeam.length > 0) {
          needsUpdate = true;
          
          // Simple team assignment: alternate players between teams
          match.players.forEach((player, index) => {
            player.team = (index % 2) + 1; // Team 1 or 2
          });
          
          console.log(`👥 Fixed team assignments for match ${match._id}: ${playersWithoutTeam.length} players assigned teams`);
        }
      }

      // Fix invalid player names
      const invalidPlayers = match.players.filter(p => 
        !p.playerId?.name && !p.name && !p.playerName
      );
      
      if (invalidPlayers.length > 0) {
        needsUpdate = true;
        
        // Try to find player names from other fields
        invalidPlayers.forEach((player, index) => {
          if (!player.name) {
            // Try to get name from playerId reference
            if (player.playerId && player.playerId.name) {
              player.name = player.playerId.name;
            } else {
              // Generate a placeholder name
              player.name = `Unknown_Player_${index + 1}`;
            }
          }
        });
        
        console.log(`👤 Fixed invalid player names for match ${match._id}: ${invalidPlayers.length} players`);
      }

      // Update the match if needed
      if (needsUpdate) {
        try {
          await Match.findByIdAndUpdate(match._id, {
            matchType: newMatchType,
            players: match.players
          });
          fixedCount++;
        } catch (error) {
          console.error(`❌ Failed to update match ${match._id}:`, error.message);
          issues.push({
            matchId: match._id,
            error: error.message,
            originalType: originalMatchType,
            newType: newMatchType,
            playerCount: playerCount
          });
        }
      } else {
        skippedCount++;
      }
    }

    // Summary
    console.log('\n📋 FIX SUMMARY:');
    console.log('===============');
    console.log(`✅ Fixed matches: ${fixedCount}`);
    console.log(`⏭️  Skipped matches: ${skippedCount}`);
    console.log(`❌ Failed updates: ${issues.length}`);
    
    if (issues.length > 0) {
      console.log('\n⚠️  FAILED UPDATES:');
      console.log('==================');
      issues.forEach((issue, index) => {
        console.log(`${index + 1}. Match ${issue.matchId}: ${issue.error}`);
        console.log(`   Original: ${issue.originalType} → New: ${issue.newType} (${issue.playerCount} players)`);
      });
    }

    // Verify fixes
    console.log('\n🔍 VERIFYING FIXES...');
    const verificationMatches = await Match.find({}).populate('players.playerId', 'name');
    
    const remainingIssues = verificationMatches.filter(match => {
      return !match.matchType || 
             match.matchType === 'undefined' ||
             match.players.some(p => !p.playerId?.name && !p.name && !p.playerName) ||
             (match.matchType === 'ffa' && match.players.some(p => p.placement === undefined || p.placement === null));
    });

    if (remainingIssues.length === 0) {
      console.log('✅ All issues have been resolved!');
    } else {
      console.log(`⚠️  ${remainingIssues.length} issues still remain:`);
      remainingIssues.forEach((match, index) => {
        console.log(`${index + 1}. Match ${match._id}: ${match.matchType} (${match.players.length} players)`);
      });
    }

  } catch (error) {
    console.error('❌ Error fixing matches:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔚 Database connection closed.');
  }
}

// Run the fix
fixMatchMismatches(); 