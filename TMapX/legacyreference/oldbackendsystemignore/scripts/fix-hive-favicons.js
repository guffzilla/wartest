const mongoose = require('mongoose');
const DarkPortalLink = require('../models/DarkPortalLink');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/newsite');

    const regex = /^(https?:\/\/www\.hiveworkshop\.com\/favicon)\.ico$/i;

    const links = await DarkPortalLink.find({ image: { $regex: regex } });
    let updated = 0;

    for (const link of links) {
      link.image = link.image.replace(regex, '$1'); // remove .ico extension
      await link.save();
      updated += 1;
    }

    console.log(`Updated ${updated} link(s) by removing .ico extension from Hive favicon URLs.`);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error fixing Hive favicons:', err);
    process.exit(1);
  }
})();
