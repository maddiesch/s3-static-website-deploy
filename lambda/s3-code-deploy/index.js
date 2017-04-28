// Unpack the build archive from CodeBuild
//
// Environment variables
//  DEPLOY_BUCKET: The S3 bucket to deploy to.
//  SITE_ROOT: The root folder for the static site.
//  SNS_TOPIC_ARN: The SNS topic to send messages to.
//  SNS_SUBJECT: The deploy succeeded message subject.
//  SNS_MESSAGE: The deploy succeeded message body.
//
var aws = require('aws-sdk')
var s3 = new aws.S3({ apiVersion: '2006-03-01', signatureVersion: 'v4' })
var AdmZip = require('adm-zip')
var mime = require('mime')

var unzipHandler = (data, callback) => {
  var zip = AdmZip(data.Body)
  var entries = zip.getEntries()

  var rootExpr = new RegExp(`^${process.env.SITE_ROOT}\\/`)

  entries.forEach(entry => {
    if (entry.isDirectory) {
      console.log('Skipping: ' + entry.entryName)
      return
    }
    var fileName = entry.entryName.replace(rootExpr, '')
    var file = entry.getData()
    var contentType = mime.lookup(fileName)
    console.log('Uploading: ' + fileName)
    s3.upload(
      {
        Bucket: process.env.DEPLOY_BUCKET,
        Key: fileName,
        Body: file,
        ContentType: contentType,
        ACL: 'public-read'
      },
      err => {
        if (err) {
          console.log('Error: ' + fileName + ' -- ' + err)
        }
      }
    )
  })

  sendConfirm((err, data) => {
    callback(err)
  })
}

var recordHandler = (record, callback) => {
  var zipfile = record.s3.object.key
  var bucketName = record.s3.bucket.name
  s3.getObject({ Bucket: bucketName, Key: zipfile }, function(err, data) {
    if (err) {
      console.log('Get object error: ' + zipfile)
      callback(err)
    } else {
      console.log('Processing: ' + zipfile)
      unzipHandler(data, callback)
    }
  })
}

var sendConfirm = handler => {
  console.log('Sending conformation')
  var sns = new aws.SNS()
  var params = {
    Message: process.env.SNS_MESSAGE,
    Subject: process.env.SNS_SUBJECT,
    TopicArn: process.env.SNS_TOPIC_ARN
  }
  sns.publish(params, handler)
}

exports.handler = (event, context, callback) => {
  console.log(JSON.stringify(event))

  recordHandler(event.Records[0], function(err) {
    callback(err, null)
  })
}
