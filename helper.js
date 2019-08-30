const moment = require('moment');

exports.getCommitFromLabel = (label = '') => {
  const firstSplit = label.split('-g')[1];
  return firstSplit ? firstSplit.split('-')[0] : '';
};

exports.isTwoMinutesApart = updateDate => Math.abs(moment(updateDate).diff(moment(), 'seconds')) > 120;
