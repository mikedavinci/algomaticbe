import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as postmark from 'postmark';

@Injectable()
export class EmailService {
  private readonly client: postmark.ServerClient;
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('POSTMARK_API_KEY');
    if (!apiKey) {
      throw new Error('POSTMARK_API_KEY is not configured');
    }

    this.fromEmail =
      this.configService.get<string>('POSTMARK_FROM_EMAIL') || '';
    if (!this.fromEmail) {
      throw new Error('POSTMARK_FROM_EMAIL is not configured');
    }

    this.client = new postmark.ServerClient(apiKey);
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    try {
      await this.client.sendEmail({
        From: this.fromEmail,
        To: to,
        Subject: 'Welcome to Algomatic!',
        HtmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Welcome to Algomatic! 👋</h1>
            <p>Hi ${name},</p>
            <p>We're excited to have you on board! Get started by:</p>
            <ul>
              <li>Setting up your first crypto alert</li>
              <li>Exploring our trading features</li>
              <li>Checking out our documentation</li>
            </ul>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p>Best regards,<br>The Algomatic Team</p>
          </div>
        `,
        TextBody: `
          Welcome to Algomatic! 👋
          
          Hi ${name},
          
          We're excited to have you on board! Get started by:
          - Setting up your first crypto alert
          - Exploring our trading features
          - Checking out our documentation
          
          If you have any questions, feel free to reach out to our support team.
          
          Best regards,
          The Algomatic Team
        `,
        MessageStream: 'outbound',
      });

      this.logger.log(`Welcome email sent to ${to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send welcome email to ${to}: ${error.message}`
      );
      throw error;
    }
  }

  async sendAlertTriggeredEmail(
    to: string,
    alert: {
      symbol: string;
      type: 'take_profit' | 'stop_loss';
      targetPrice: number;
      currentPrice: number;
    }
  ): Promise<void> {
    try {
      const triggerType =
        alert.type === 'take_profit' ? 'Take Profit' : 'Stop Loss';

      await this.client.sendEmail({
        From: this.fromEmail,
        To: to,
        Subject: `${triggerType} Alert Triggered for ${alert.symbol}`,
        HtmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>${triggerType} Alert Triggered! 🔔</h1>
            <p>Your ${triggerType.toLowerCase()} alert for ${alert.symbol} has been triggered.</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Details:</strong></p>
              <ul style="list-style: none; padding: 0;">
                <li>Symbol: ${alert.symbol}</li>
                <li>Target Price: $${alert.targetPrice.toFixed(2)}</li>
                <li>Current Price: $${alert.currentPrice.toFixed(2)}</li>
              </ul>
            </div>
            <p>Log in to your account to manage your alerts and take action.</p>
            <p>Best regards,<br>The Algomatic Team</p>
          </div>
        `,
        TextBody: `
          ${triggerType} Alert Triggered! 🔔
          
          Your ${triggerType.toLowerCase()} alert for ${alert.symbol} has been triggered.
          
          Details:
          - Symbol: ${alert.symbol}
          - Target Price: $${alert.targetPrice.toFixed(2)}
          - Current Price: $${alert.currentPrice.toFixed(2)}
          
          Log in to your account to manage your alerts and take action.
          
          Best regards,
          The Algomatic Team
        `,
        MessageStream: 'outbound',
      });

      this.logger.log(
        `Alert triggered email sent to ${to} for ${alert.symbol}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to send alert triggered email to ${to}: ${error.message}`
      );
      throw error;
    }
  }

  async sendSubscriptionExpiryEmail(
    to: string,
    name: string,
    expiryDate: Date
  ): Promise<void> {
    try {
      const formattedDate = expiryDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      await this.client.sendEmail({
        From: this.fromEmail,
        To: to,
        Subject: 'Your Subscription is Expiring Soon',
        HtmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Subscription Expiring Soon ⚠️</h1>
            <p>Hi ${name},</p>
            <p>This is a friendly reminder that your Algomatic subscription will expire on <strong>${formattedDate}</strong>.</p>
            <p>To ensure uninterrupted access to our premium features:</p>
            <ul>
              <li>Log in to your account</li>
              <li>Visit the subscription settings</li>
              <li>Renew your subscription</li>
            </ul>
            <p>If you have any questions about your subscription, please don't hesitate to contact our support team.</p>
            <p>Best regards,<br>The Algomatic Team</p>
          </div>
        `,
        TextBody: `
          Subscription Expiring Soon ⚠️
          
          Hi ${name},
          
          This is a friendly reminder that your Algomatic subscription will expire on ${formattedDate}.
          
          To ensure uninterrupted access to our premium features:
          - Log in to your account
          - Visit the subscription settings
          - Renew your subscription
          
          If you have any questions about your subscription, please don't hesitate to contact our support team.
          
          Best regards,
          The Algomatic Team
        `,
        MessageStream: 'outbound',
      });

      this.logger.log(`Subscription expiry email sent to ${to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send subscription expiry email to ${to}: ${error.message}`
      );
      throw error;
    }
  }
}
