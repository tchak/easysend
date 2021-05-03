import { Handler } from '@netlify/functions';
import { createTransport } from 'nodemailer';

const AUTH_TOKEN = process.env['AUTH_TOKEN'];

const handler: Handler = async (event, context) => {
  if (event.httpMethod == 'POST') {
    const token = (event.headers['authorization'] ?? '')
      .replace('Bearer', '')
      .trim();
    if (token != AUTH_TOKEN) {
      return {
        statusCode: 403,
        body: 'Forbidden',
      };
    }
    const body = JSON.parse(event.body) as Body;
    const transport = getTransport(body.smtp);
    const ok = await transport.verify();

    if (ok) {
      for (const message of body.messages) {
        await transport.sendMail(message);
      }
      return {
        statusCode: 200,
        body: JSON.stringify({ ok }),
      };
    } else {
      return {
        statusCode: 400,
        body: 'Invalid SMTP config',
      };
    }
  }
  return {
    statusCode: 404,
    body: 'Not Found',
  };
};

type Transport = ReturnType<typeof createTransport>;
type Message = Parameters<Transport['sendMail']>[0];

type SMTPConfig = {
  host: string;
  port: number;
  auth: {
    user: string;
    pass: string;
  };
};

type Body = {
  smtp: SMTPConfig;
  messages: Message[];
};

function getTransport(smtp: SMTPConfig) {
  return createTransport({
    ...smtp,
    secure: true,
    tls: {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
    },
  });
}

export { handler };
