const rollbar = require('./services/rollbar'),
  { getCommitFromLabel } = require('./helper'),
  aws = require('./services/aws');

exports.notifyOfDeploy = (accessToken, environment, url) => {
  aws.checkIfMasterAndDeployInfo().then(appVersion =>
    rollbar
      .notifyDeploy({
        accessToken,
        environment,
        user: appVersion.ApplicationName,
        revision: appVersion.VersionLabel,
        comment: `Commit name: ${appVersion.Description}\n Commit sha: ${getCommitFromLabel(
          appVersion.VersionLabel
        )}`,
        url
      })
      .catch(console.log)
  );
};
