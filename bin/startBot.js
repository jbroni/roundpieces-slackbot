const RoundpiecesBot = require('./../src/roundpiecesbot');

const token = process.env.ROUNDPIECES_API_KEY;
const adminUserName = process.env.ROUNDPIECES_ADMIN_USERNAME;

const roundpiecesBot = new RoundpiecesBot({
  token: token,
  adminUserName: adminUserName
});

roundpiecesBot.run();
