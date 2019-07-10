const request = require('request-promise');

exports.notifyDeploy = ({ accessToken, environment, user, revision, comment, url }) =>
  request({
    method: 'POST',
    uri: `${url || 'https://api.rollbar.com/api/1'}/deploy/`,
    body: {
      access_token: accessToken,
      environment,
      local_username: user,
      revision,
      comment
    },
    json: true
  });
