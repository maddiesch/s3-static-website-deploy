## AWS Static Website Deploy

This setup up the resources needed to deploy a static website to S3.

How it works.

1. GitHub notifies the ApiGateway that a push was received

2. ApiGateway triggers a lambda function to start a CodeBuild build

3. CodeBuild fetches the code and builds the site.  It uploads the artifact (the built site) to s3.

4. S3 triggers lambda to deflate the archive and puts the files into the root of the bucket to be served by S3

`GitHub -> ApiGateway -> Lambda -> CodeBuild -> S3 -> Lambda -> S3 -> WWW`

## Setup

### Run the template

Use the AWS CloudFormation template to create the stack.

### Setting up the build trigger

We can't create the S3 `NotificationConfiguration` in the first run of the template [because it creates a circular dependency](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-s3-bucket-notificationconfig.html#cfn-s3-bucket-notificationconfig-lambdaconfig)

The `bin/connect-s3-lambda` script will handle setting up this relationships for you after the template runs.  The `NotificationHookupCommand` can be used as a copy/run command for getting this setup.

If you don't want to use the `default` profile for the aws-cli to authenticate another profile name can be passed using the `-p` flag.

### Configure your project for CodeBuild

There are a few assumptions made by the build system.

1. The code to deploy to s3 will be built into `public/`

2. The build will create a `build-output.zip` file in the root of the project.

Add a `buildspec.yml` file

This example file will install `yarn` and install modules then run the `build` command.

```
version: 0.1
phases:
  install:
    commands:
      - curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
      - echo "deb http://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
      - sudo apt-get update
      - sudo apt-get install -y yarn
      - sudo apt-get install -y zip
  pre_build:
    commands:
      - yarn install
  build:
    commands:
      - yarn run build
  post_build:
    commands:
      # Zip the public folder.
      - zip -r build-output.zip public
artifacts:
  files:
    - build-output.zip
  discard-paths: yes
```

### Enable the WebHook

Head to your GitHub repo.  `Settings -> Webhooks -> Add webhook`

The default config is fine.

For the `Payload URL` paste in the value from `HookURL` in the template outputs.
