const AWS = require('aws-sdk')
var ses = new AWS.SES({
    region: process.env.aws_region
});

const docClient = new AWS.DynamoDB.DocumentClient({
    region: process.env.aws_region
});

exports.handler = (event, context, callback) => {
    var {
        Records = []
    } = event;
    var{
        Sns = {}
    } = Records[0];
    var {
        Message = "",
        MessageId = ""
    } = Sns;
    if (!Message) {
        callback({
            status: 400,
            message: "Message is empty"
        });
        return;
    }
    var user_data = Message.split(":::");
    var uidData = user_data[1] ? user_data[1] : "";
    var emailData = user_data[0] ? user_data[0] : "";

    getRecord(emailData, uidData)
        .then(data =>{
            console.log("getRecord:::",data )
            var {
                Item = {}
            } = data;
            var {
                UId = '',
                TimeD = '',
                Email = ''
            } = Item;

            if(data && UId){
                TimeD = Number(TimeD);
                let difference = Date.now() - TimeD;
                difference = difference / 1000

                if(difference <= 900){
                    console.log("TimeD difference:::", difference )
                    return;
                }else{
                    updateRecord(emailData, uidData)
                        .then(data =>{
                            console.log("updateRecord:::",data )
                            sendEmail(emailData, Date.now().toString(), uidData, context, event)
                                .then(data =>{
                                    console.log("sendEmail:::",data )
                                    return;
                                })
                                .catch( (err)=>{
                                    console.log("sendEmail:::err::::",err )
                                    return;
                                })
                        })
                        .catch( (err)=>{
                            console.log("updateRecord:::err::::",err )
                            return;
                        })
                }
            }else{
                putRecord(emailData, uidData)
                    .then(data =>{
                        console.log("putRecord:::",data )
                        sendEmail(emailData, Date.now().toString(), uidData, context, event)
                            .then(data =>{
                                console.log("sendEmail:::",data )
                                return;
                            })
                            .catch( (err)=>{
                                console.log("sendEmail:::err::::",err )
                                callback({
                                    status: 400,
                                    message: err
                                });
                                return;
                            })
                    })
                    .catch( (err)=>{
                        console.log("putRecord:::err::::",err )
                        callback({
                            status: 400,
                            message: err
                        });
                        return;
                    })
            }
        })
        .catch( (err)=>{
            console.log("getRecord:::err::::",err )
            callback({
                status: 400,
                message: err
            });
        })
}

function getRecord(email, uid){
    var getQuery = {
        TableName: 'csye6225',
        Key: {
            "UUID": uid
        }
    };
    console.log("getQuery:::::",getQuery)
    return new Promise(function (resolve, reject) {
        docClient.get(getQuery, function (err, data) {
            if (err) {
                console.log(err);
                reject(new Error('Something went wrong please try again later'));
            } else {
                resolve(data);
            }
        });
    });
}
function putRecord(email, uid) {
    var putQuery = {
        Item: {
            "UUID": uid,
            "Email": email,
            "TimeD": Date.now().toString()
        },
        TableName: 'csye6225'
    };
    console.log("putRecord:::::",putQuery)
    return new Promise(function (resolve, reject) {
        docClient.put(putQuery, function (err, data) {
            if (err) {
                reject(new Error('Something went wrong please try again later'));
            } else {
                resolve(data);
            }
        });
    });
}
function updateRecord(email, uid) {
    var updateQuery = {
        Key: {
            "UUID": uid
        },
        TableName: 'csye6225',
        UpdateExpression: 'set TimeD = :t',
        ExpressionAttributeValues: {
            ':t' : Date.now().toString()
        }
    };
    console.log("updateRecord:::::",updateQuery)
    return new Promise(function (resolve, reject) {
        docClient.update(updateQuery, function (err, data) {
            if (err) {
                console.log("updateRecord:::ERRR::",err)
                reject(new Error('Something went wrong please try again later'));
            } else {
                resolve(data);
            }
        });
    });
}
function sendEmail(receiver, token, id, context,event ) {
    let sender = "support@prod.neucloudwebapp.me";
    let email_subject = "Reset link for your account on http://prod.cloudwebapp.me"
    let reset_token = `http://prod.neucloudwebapp.me/reset?email:${receiver}&token=${token}&id=${id}`

    console.log("sendEmail:::: " + receiver);

    return new Promise(function (resolve, reject) {
        var eParams = {
            Destination: {
                ToAddresses: [receiver]
            },
            Message: {
                Body: {
                    Html: {
                        Data: '<html><head>'
                            + '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />'
                            + '<title>' + 'Reset Link' + '</title>'
                            + '</head><body>'
                            + `Hi, <br>`
                            + `Reset your password using the following link <br>`
                            + `<a href="${reset_token}">${reset_token}</a>`
                            + '</body></html>'
                    }
                },
                Subject: {
                    Data: email_subject
                }
            },
            Source: sender
        };
        ses.sendEmail(eParams, function (err, data2) {
            if (err) {
                reject(new Error(err));
            } else {
                context.succeed(event);
                resolve(data2);
            }
        });
    });
}