

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

const ses = new SESClient({ region: "us-east-1" }); // Replace with your SES region

exports.handler = async (event) => {
    const params = {
        Destination: {
            ToAddresses: [event.email],
        },
        Message: {
            Body: {
                Text: {
                    Data: event.body || "Hello from SES!",
                },
            },
            Subject: {
                Data: event.subject || "Test Email",
            },
        },
        Source: "your_verified_email@example.com",
    };

    try {
        await ses.send(new SendEmailCommand(params));
        return { statusCode: 200, body: "Email sent!" };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify(error) };
    }
};

