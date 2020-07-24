var aws = require('aws-sdk');
var ses = new aws.SES({region: 'us-east-1'});

exports.handler = (event, context, callback) => {
    
    var params = {
       Destination: {
           ToAddresses: ["ashashokpat@gmail.com"]
       },
       Message: {
           Body: {
               Text: { Data: "Test"
                   
               }
               
           },
           
           Subject: { Data: "Test Email"
               
           }
       },
       Source: "support@prod.neucloudwebapp.me"
   };

   
    ses.sendEmail(params, function (err, data) {
       callback(null, {err: err, data: data});
       if (err) {
           console.log(err);
           context.fail(err);
       } else {
           
           console.log(data);
           context.succeed(event);
       }
   });
};

