var aws = require('aws-sdk');
var build = new aws.CodeBuild();

exports.handler = (event, context, callback) => {
    console.log(JSON.stringify(event));

    var branch = 'refs/heads/' + process.env.BUILD_BRANCH;
    if (event.ref !== branch) {
        console.log('Skipping build for: ' + event.ref);
        callback(null, {skipped: event.ref});
        return;
    }

    var commit = event.head_commit.id;
    console.log('Starting build for: ' + branch + ' -- ' + commit);

    var artifacts = {
        type:      'S3',
        path:      'build',
        location:  process.env.BUCKET_NAME,
        name:      'artifacts-' + commit,
        packaging: 'NONE'
    };

    var response = {};
    response.branch = process.env.BUILD_BRANCH;
    response.commit = commit;

    console.log('Build: ' + process.env.PROJECT_NAME);
    build.startBuild({projectName: process.env.PROJECT_NAME, artifactsOverride: artifacts}, (err, data) => {
        callback(err, response);
    });
};
