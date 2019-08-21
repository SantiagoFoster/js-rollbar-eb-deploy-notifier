/* eslint-disable consistent-return */
/* eslint-disable prefer-promise-reject-errors */
const AWS = require('aws-sdk'),
  { getCommitFromLabel, isTwoMinutesApart } = require('../helper');

// change to your region
AWS.config.update({ region: 'us-east-1' });

let elasticbeanstalk = {};
let ec2 = {};
let metadata = {};

exports.checkIfMasterAndDeployInfo = () =>
  new Promise((resolve, reject) => {
    AWS.config.getCredentials(err => {
      if (err) {
        return reject(`Credentials request failed with: ${err}`);
      }
      elasticbeanstalk = new AWS.ElasticBeanstalk({
        credentials: AWS.config.credentials,
        region: 'us-east-1'
      });
      ec2 = new AWS.EC2({ credentials: AWS.config.credentials, region: 'us-east-1' });
      metadata = new AWS.MetadataService({ credentials: AWS.config.credentials, region: 'us-east-1' });
      return resolve('Credentials set correctly');
    });
  }).then(() =>
    new Promise((resolve, reject) => {
      metadata.request('/latest/meta-data/instance-id', (err, InstanceId) => {
        if (err) {
          return reject(`Metadata request failed with: ${err}`);
        }
        return resolve(InstanceId);
      });
    }).then(
      currentInstanceId =>
        new Promise((resolve, reject) => {
          const params = {
            Filters: [
              {
                Name: 'resource-id',
                Values: [currentInstanceId]
              }
            ]
          };

          ec2.describeTags(params, (err, data) => {
            if (err) {
              return reject(`Describe tags failed with: ${err}`);
            }

            const envIdTag = data.Tags.find(t => t.Key === 'elasticbeanstalk:environment-id');
            const applicationNameTag = data.Tags.find(t => t.Key === 'Application');

            if (envIdTag === null) {
              return reject('Failed to find the value of "elasticbeanstalk:environment-id" tag.');
            }

            elasticbeanstalk.describeEnvironmentResources(
              { EnvironmentId: envIdTag.Value },
              (error, ebData) => {
                if (error) {
                  return reject(`Describe environment resourcers failed with ${error}`);
                }
                if (currentInstanceId !== ebData.EnvironmentResources.Instances[0].Id) {
                  return reject('Skipping since not master inscance, dont want to notify of deploy twice');
                }

                elasticbeanstalk.describeApplicationVersions(
                  { ApplicationName: applicationNameTag.Value, MaxRecords: 2 },
                  (appVerError, appData) => {
                    if (appVerError) {
                      return reject(`Describe application versions failed with ${appVerError}`);
                    }
                    if (
                      appData &&
                      appData.ApplicationVersions &&
                      isTwoMinutesApart(appData.ApplicationVersions[0].DateUpdated)
                    ) {
                      return reject('Skipping since it seems not to be a deploy');
                    }
                    if (
                      appData &&
                      appData.ApplicationVersions &&
                      appData.ApplicationVersions.length > 1 &&
                      getCommitFromLabel(appData.ApplicationVersions[0].VersionLabel) ===
                        getCommitFromLabel(appData.ApplicationVersions[1].VersionLabel)
                    ) {
                      return reject(
                        `Skipping since there was no commit changes between ${getCommitFromLabel(
                          appData.ApplicationVersions[0].VersionLabel
                        )} and ${getCommitFromLabel(appData.ApplicationVersions[1].VersionLabel)}`
                      );
                    }
                    return resolve(appData.ApplicationVersions[0]);
                  }
                );
              }
            );
          });
        })
    )
  );
