/* eslint-disable no-console */
const mongoose = require('mongoose');
const { randomInt } = require('crypto');
const User = require('../models/User');
const Player = require('../models/Player');
const Match = require('../models/Match');
const War1Map = require('../models/War1Map');
const War2Map = require('../models/War2Map');
const War3Map = require('../models/War3Map');
const mmr = require('../utils/mmrCalculator');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/newsite';

const GAME_TYPES = ['wc1', 'wc2', 'wc3'];
const MATCH_TYPES = ['1v1', '2v2', '3v3', '4v4', 'ffa', 'vsai'];
const RESOURCE_LEVELS = ['low', 'medium', 'high'];
const RACES = ['human', 'orc', 'undead', 'night_elf', 'random'];

function getRacePool(gameType) {
  if (gameType === 'wc3') return ['human', 'orc', 'undead', 'night_elf', 'random'];
  return ['human', 'orc', 'random'];
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickDistinct(arr, n) {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

async function ensureReporterUser() {
  let user = await User.findOne({ username: 'SIM_REPORTER' });
  if (!user) {
    user = await User.create({
      username: 'SIM_REPORTER',
      email: `sim_reporter_${Date.now()}@example.com`,
      role: 'admin',
      isUsernameDefined: true
    });
  }
  return user;
}

async function loadMaps() {
  const maps = {};
  maps.wc1 = await War1Map.find({}).limit(200).lean();
  maps.wc2 = await War2Map.find({}).limit(200).lean();
  maps.wc3 = await War3Map.find({}).limit(200).lean();
  return maps;
}

function generatePlayerName(prefix, idx) {
  const animals = ['Wolf', 'Hawk', 'Bear', 'Lynx', 'Dragon', 'Eagle', 'Lion', 'Stag', 'Viper', 'Raven'];
  const adj = ['Swift', 'Brave', 'Cunning', 'Fierce', 'Silent', 'Wild', 'Ancient', 'Arcane', 'Crimson', 'Azure'];
  return `${prefix}${adj[idx % adj.length]}${animals[idx % animals.length]}${idx}`;
}

async function createPlayersPerGame(gameType, count) {
  const players = [];
  const racePool = getRacePool(gameType);
  for (let i = 0; i < count; i++) {
    const name = generatePlayerName(gameType.toUpperCase(), i + 1);
    const startingMmr = mmr.MMR_CONFIG.STARTING_MMR + Math.floor((Math.random() - 0.5) * 120);
    players.push({
      name,
      user: null,
      claimed: false,
      isAI: false,
      mmr: startingMmr,
      gameType,
      preferredRace: pick(racePool),
      rank: mmr.getRankByMmr(startingMmr),
      stats: {},
      lastActive: new Date(),
      isActive: true
    });
  }
  const created = await Player.insertMany(players, { ordered: false });
  return created;
}

function buildTeams(players, matchType) {
  if (matchType === 'ffa') {
    const picked = pickDistinct(players, Math.min(players.length, 6 + Math.floor(Math.random() * 3))); // 6-8 players
    const placements = picked.map((p, i) => ({ player: p, team: 0, placement: i + 1 }));
    placements.sort(() => Math.random() - 0.5);
    return placements.map((x, i) => ({ player: x.player, team: 0, placement: i + 1 }));
  }
  const sizeByType = { '1v1': 2, '2v2': 4, '3v3': 6, '4v4': 8, 'vsai': 2 };
  const total = sizeByType[matchType] || 2;
  const picked = pickDistinct(players, total);
  const out = [];
  if (matchType === 'vsai') {
    // one human vs one AI
    const human = picked[0];
    const ai = { ...picked[1].toObject?.() ? picked[1].toObject() : picked[1], _id: new mongoose.Types.ObjectId(), isAI: true, name: 'AI_Opponent', mmr: 1300 };
    out.push({ player: human, team: 1, placement: null });
    out.push({ player: ai, team: 2, placement: null });
    return out;
  }
  // assign alternating teams
  picked.forEach((p, idx) => out.push({ player: p, team: (idx % 2) + 1, placement: null }));
  return out;
}

async function simulateMatch(gameType, playersPool, maps, reporterUser) {
  const matchType = pick(MATCH_TYPES);
  const teams = buildTeams(playersPool, matchType);
  const resourceLevel = pick(RESOURCE_LEVELS);
  const racePool = getRacePool(gameType);
  const gameMaps = maps[gameType] || [];
  if (gameMaps.length === 0) return null;
  const chosenMap = gameMaps[Math.floor(Math.random() * gameMaps.length)];
  const mapEntry = { name: chosenMap.name || chosenMap.title || 'Unknown Map', mapId: chosenMap._id, mapType: gameType };

  // Prepare inputs to mmr calculator
  const calcPlayers = teams.map(t => ({
    playerId: t.player._id,
    name: t.player.name,
    mmr: t.player.mmr,
    matchCount: randomInt(0, 40),
    team: t.team,
    placement: t.placement,
    isAI: !!t.player.isAI,
    outcome: 'loss'
  }));

  // Determine outcomes
  if (matchType === 'ffa') {
    calcPlayers.sort((a, b) => a.placement - b.placement);
    if (calcPlayers[0]) calcPlayers[0].outcome = 'win';
  } else if (matchType === 'vsai') {
    // human wins 60% of the time
    const human = calcPlayers.find(p => !p.isAI);
    const ai = calcPlayers.find(p => p.isAI);
    const humanWins = Math.random() < 0.6;
    if (human) human.outcome = humanWins ? 'win' : 'loss';
    if (ai) ai.outcome = humanWins ? 'loss' : 'win';
  } else {
    // team outcome
    const team1Wins = Math.random() < 0.5;
    calcPlayers.forEach(p => { p.outcome = (p.team === 1 && team1Wins) || (p.team === 2 && !team1Wins) ? 'win' : 'loss'; });
  }

  // Compute MMR changes
  const mmrResults = mmr.calculateMatchMmrChanges(calcPlayers, matchType, false);

  // Build match document
  const matchDoc = new Match({
    gameType,
    matchType,
    map: mapEntry,
    resourceLevel,
    players: mmrResults.map(r => ({
      playerId: r.playerId,
      team: r.team,
      placement: r.placement || null,
      race: pick(racePool),
      mmrBefore: r.mmrBefore,
      mmrAfter: r.mmrAfter,
      mmrChange: r.mmrChange,
      rankBefore: r.rankBefore,
      rankAfter: r.rankAfter,
      rankChanged: r.rankChanged
    })),
    winner: matchType === 'ffa' ? mmrResults.find(r => r.placement === 1)?.playerId : (matchType === 'vsai' ? (mmrResults.find(r => !r.isAI && r.mmrChange > 0)?.playerId || null) : (calcPlayers.some(p => p.team === 1 && p.outcome === 'win') ? 1 : 2)),
    date: new Date(Date.now() - randomInt(0, 30) * 24 * 60 * 60 * 1000),
    duration: 10 + randomInt(0, 50),
    verification: { status: 'verified', verifiedBy: reporterUser._id, verifiedAt: new Date() },
    report: { reportedBy: reporterUser._id, reportedAt: new Date(), battleReport: '', youtubeLink: '' },
    mmrCalculated: true,
    countsForLadder: true,
    season: 1
  });

  await matchDoc.save();

  // Update each real player's MMR and stats
  for (const r of mmrResults) {
    const pl = await Player.findById(r.playerId);
    if (!pl) continue;
    // Update base mmr and rank
    pl.mmr = r.mmrAfter;
    const newRank = mmr.getRankByMmr(pl.mmr);
    pl.rank = newRank;
    const chosenRace = pick(racePool);
    // Update stats via model method
    await Player.updatePlayerStats(pl._id, {
      matchType,
      outcome: r.mmrChange > 0 ? 'win' : 'loss',
      mmrAfter: r.mmrAfter,
      rankAfter: newRank.name,
      rankImage: newRank.image,
      rankThreshold: newRank.threshold,
      race: chosenRace,
      map: mapEntry,
      resourceLevel
    });
  }

  return matchDoc;
}

async function main() {
  console.log('⚙️ Connecting to MongoDB:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  const reporter = await ensureReporterUser();

  console.log('🗑️ Clearing Matches and Players…');
  await Match.deleteMany({});
  await Player.deleteMany({});

  console.log('🗺️ Loading maps…');
  const maps = await loadMaps();
  GAME_TYPES.forEach(gt => console.log(`${gt}: ${maps[gt]?.length || 0} maps`));

  console.log('👥 Creating players…');
  const playersByGame = {};
  for (const gt of GAME_TYPES) {
    playersByGame[gt] = await createPlayersPerGame(gt, 40);
  }

  console.log('🎮 Simulating matches…');
  // plan: per gameType, generate ~400 matches across modes
  for (const gt of GAME_TYPES) {
    const pool = playersByGame[gt];
    const totalMatches = 400;
    for (let i = 0; i < totalMatches; i++) {
      await simulateMatch(gt, pool, maps, reporter);
      if ((i + 1) % 50 === 0) console.log(`✓ ${gt} matches: ${i + 1}/${totalMatches}`);
    }
  }

  console.log('✅ Simulation complete.');
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch(err => {
    console.error('Simulation failed:', err);
    process.exit(1);
  });
}
