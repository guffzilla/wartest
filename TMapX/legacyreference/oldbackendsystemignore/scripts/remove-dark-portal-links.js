const mongoose = require('mongoose');
const DarkPortalLink = require('../models/DarkPortalLink');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/newsite');

    // Remove any Reddit links matching WarcraftCustom or WarcraftCustomGames
    const patterns = [
      /https?:\/\/www\.reddit\.com\/r\/WarcraftCustom\/?$/i,
      /https?:\/\/www\.reddit\.com\/r\/WarcraftCustomGames\/?$/i,
      /https?:\/\/www\.reddit\.com\/r\/WarcraftCustom(\/.*)?$/i,
      /https?:\/\/www\.reddit\.com\/r\/WarcraftCustomGames(\/.*)?$/i
    ];

    let totalRemoved = 0;
    for (const regex of patterns) {
      const res = await DarkPortalLink.deleteMany({ url: { $regex: regex } });
      totalRemoved += res.deletedCount || 0;
    }

    console.log(`Removed ${totalRemoved} Dark Portal link(s) matching the specified Reddit URL(s).`);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error removing links:', err);
    process.exit(1);
  }
})();
