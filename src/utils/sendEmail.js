const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

// Configure SES Client
const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

/**
 * Send an email using Amazon SES
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - HTML content of the email
 */
const sendEmail = async (to, subject, html) => {
  if (!process.env.AWS_ACCESS_KEY_ID) {
    console.warn('AWS SES credentials not found. Simulating email send.');
    console.log(`[SIMULATED EMAIL to ${to}] Subject: ${subject}\n\n${html}`);
    return;
  }

  const params = {
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: html,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: subject,
      },
    },
    Source: process.env.SES_FROM_EMAIL || 'support@fbapilot.com',
  };

  try {
    const command = new SendEmailCommand(params);
    const result = await sesClient.send(command);
    console.log(`Email sent to ${to}. MessageId: ${result.MessageId}`);
    return result;
  } catch (error) {
    console.error('Error sending email via SES:', error);
    throw error;
  }
};

module.exports = sendEmail;
