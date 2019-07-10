const rollbar = require('./services/rollbar'),
  aws = require('./services/aws');

exports.notifyOfDeploy = (accessToken, environment, url) => {
  aws.checkIfMasterAndDeployInfo().then(appVersion =>
    rollbar.notifyDeploy({
      accessToken,
      environment,
      user: appVersion.ApplicationName,
      revision: appVersion.VersionLabel,
      comment: `Commit name: ${appVersion.Description}\n Commit sha: ${
        appVersion.VersionLabel.split('-g')[1].split('-')[0]
      }`,
      url
    })
  );
};
