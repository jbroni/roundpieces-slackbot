const RoundpiecesBot = require('./../src/roundpiecesbot');

const token = process.env.ROUNDPIECES_API_KEY;
const adminUserName = process.env.ROUNDPIECES_ADMIN_USERNAME;
const listPath = process.env.ROUNDPIECES_LIST_PATH;

const startSearch = '00 00 9 * * 4'; // 09.00 Thursdays
const endSearch = '00 00 12 * * 4'; // 12.00 Thursdays
const resetSearch = '00 00 9 * * 5'; // 09.00 Fridays

if (token && adminUserName && listPath) {
  const roundpiecesBot = new RoundpiecesBot({
    token: token,
    name: 'Roundpieces Administration Bot',
    adminUserName: adminUserName,
    listPath: listPath,
    cronRanges: {
      start: startSearch,
      end: endSearch,
      reset: resetSearch
    }
  });

  roundpiecesBot.run();
}
else {
  console.error(`Environment is not properly configured. Please make sure you have set\n
      ROUNDPIECES_API_KEY to the slack bot API token
      ROUNDPIECES_ADMIN_USERNAME to the slack username of your roundpieces administrator
      ROUNDPIECES_LIST_PATH to the absolute path to your list of participants`);
}
