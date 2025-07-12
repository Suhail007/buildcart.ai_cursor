const sgMail = require('@sendgrid/mail');
const logger = require('../utils/logger');

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

class EmailService {
  constructor() {
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@buildcart.ai';
    this.fromName = 'Buildcart.ai';
  }

  // Send email with template
  async sendEmail(to, subject, html, text = null) {
    try {
      const msg = {
        to,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject,
        html,
        text: text || this.stripHtml(html)
      };

      const response = await sgMail.send(msg);
      logger.info(`Email sent successfully to ${to}: ${subject}`);
      return response;
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  // Strip HTML tags for text version
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }

  // Welcome email
  async sendWelcomeEmail(user) {
    const subject = 'Welcome to Buildcart.ai!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Welcome to Buildcart.ai!</h1>
        <p>Hi ${user.name},</p>
        <p>Thank you for joining Buildcart.ai! We're excited to help you build your AI-powered e-commerce store.</p>
        <p>Here's what you can do next:</p>
        <ul>
          <li>Create your first store</li>
          <li>Explore our AI-powered features</li>
          <li>Check out our templates</li>
        </ul>
        <p>If you have any questions, feel free to reach out to our support team.</p>
        <p>Best regards,<br>The Buildcart.ai Team</p>
      </div>
    `;

    return this.sendEmail(user.email, subject, html);
  }

  // Email verification
  async sendEmailVerification(user, token) {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
    const subject = 'Verify your email address';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Verify your email address</h1>
        <p>Hi ${user.name},</p>
        <p>Please click the button below to verify your email address:</p>
        <a href="${verificationUrl}" style="display: inline-block; background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Verify Email</a>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p>${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, you can safely ignore this email.</p>
        <p>Best regards,<br>The Buildcart.ai Team</p>
      </div>
    `;

    return this.sendEmail(user.email, subject, html);
  }

  // Password reset
  async sendPasswordResetEmail(user, token) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    const subject = 'Reset your password';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Reset your password</h1>
        <p>Hi ${user.name},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <a href="${resetUrl}" style="display: inline-block; background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Reset Password</a>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p>${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
        <p>Best regards,<br>The Buildcart.ai Team</p>
      </div>
    `;

    return this.sendEmail(user.email, subject, html);
  }

  // Order confirmation
  async sendOrderConfirmation(order) {
    const subject = `Order Confirmation #${order.orderNumber}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Order Confirmation</h1>
        <p>Hi ${order.customer.firstName},</p>
        <p>Thank you for your order! Here are your order details:</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3>Order #${order.orderNumber}</h3>
          <p><strong>Total:</strong> $${order.total}</p>
          <p><strong>Status:</strong> ${order.status}</p>
          <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
        </div>
        <p>We'll send you an update when your order ships.</p>
        <p>Best regards,<br>The ${order.store.name} Team</p>
      </div>
    `;

    return this.sendEmail(order.customer.email, subject, html);
  }

  // Order status update
  async sendOrderStatusUpdate(order, status) {
    const subject = `Order Update #${order.orderNumber}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Order Status Update</h1>
        <p>Hi ${order.customer.firstName},</p>
        <p>Your order status has been updated:</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3>Order #${order.orderNumber}</h3>
          <p><strong>New Status:</strong> ${status}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        <p>Thank you for your patience!</p>
        <p>Best regards,<br>The ${order.store.name} Team</p>
      </div>
    `;

    return this.sendEmail(order.customer.email, subject, html);
  }

  // Store deployment notification
  async sendStoreDeploymentNotification(store, deployment) {
    const subject = `Your store "${store.name}" has been deployed!`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Store Deployed Successfully!</h1>
        <p>Hi ${store.user.name},</p>
        <p>Great news! Your store "${store.name}" has been successfully deployed.</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3>Deployment Details</h3>
          <p><strong>Store:</strong> ${store.name}</p>
          <p><strong>URL:</strong> <a href="${deployment.url}">${deployment.url}</a></p>
          <p><strong>Status:</strong> ${deployment.status}</p>
          <p><strong>Deployed:</strong> ${new Date(deployment.deployedAt).toLocaleString()}</p>
        </div>
        <p>Your store is now live and ready for customers!</p>
        <p>Best regards,<br>The Buildcart.ai Team</p>
      </div>
    `;

    return this.sendEmail(store.user.email, subject, html);
  }

  // Marketing email
  async sendMarketingEmail(campaign, recipients) {
    const subject = campaign.subject;
    const html = campaign.htmlContent;

    // Send to multiple recipients
    const promises = recipients.map(recipient => 
      this.sendEmail(recipient.email, subject, html)
    );

    const results = await Promise.allSettled(promises);
    
    // Log results
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    logger.info(`Marketing email sent: ${successful} successful, ${failed} failed`);
    
    return { successful, failed, results };
  }

  // Invoice email
  async sendInvoice(invoice, customer) {
    const subject = `Invoice #${invoice.number}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Invoice</h1>
        <p>Hi ${customer.firstName},</p>
        <p>Please find your invoice attached.</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3>Invoice Details</h3>
          <p><strong>Invoice #:</strong> ${invoice.number}</p>
          <p><strong>Amount:</strong> $${invoice.amount}</p>
          <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
        </div>
        <p>Thank you for your business!</p>
        <p>Best regards,<br>The Buildcart.ai Team</p>
      </div>
    `;

    return this.sendEmail(customer.email, subject, html);
  }

  // Subscription update
  async sendSubscriptionUpdate(user, subscription) {
    const subject = 'Subscription Update';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Subscription Update</h1>
        <p>Hi ${user.name},</p>
        <p>Your subscription has been updated:</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3>Subscription Details</h3>
          <p><strong>Plan:</strong> ${subscription.plan}</p>
          <p><strong>Status:</strong> ${subscription.status}</p>
          <p><strong>Next Billing:</strong> ${new Date(subscription.nextBillingDate).toLocaleDateString()}</p>
        </div>
        <p>Thank you for choosing Buildcart.ai!</p>
        <p>Best regards,<br>The Buildcart.ai Team</p>
      </div>
    `;

    return this.sendEmail(user.email, subject, html);
  }

  // Account deletion confirmation
  async sendAccountDeletionConfirmation(user) {
    const subject = 'Account Deletion Confirmation';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Account Deletion Confirmation</h1>
        <p>Hi ${user.name},</p>
        <p>We're sorry to see you go. Your account has been successfully deleted.</p>
        <p>All your data has been permanently removed from our systems.</p>
        <p>If you change your mind, you can always create a new account.</p>
        <p>Thank you for using Buildcart.ai!</p>
        <p>Best regards,<br>The Buildcart.ai Team</p>
      </div>
    `;

    return this.sendEmail(user.email, subject, html);
  }

  // Security alert
  async sendSecurityAlert(user, alert) {
    const subject = 'Security Alert';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #EF4444;">Security Alert</h1>
        <p>Hi ${user.name},</p>
        <p>We detected a security event on your account:</p>
        <div style="background-color: #fef2f2; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #EF4444;">
          <h3>Security Event</h3>
          <p><strong>Type:</strong> ${alert.type}</p>
          <p><strong>Time:</strong> ${new Date(alert.timestamp).toLocaleString()}</p>
          <p><strong>IP Address:</strong> ${alert.ipAddress}</p>
          <p><strong>Location:</strong> ${alert.location}</p>
        </div>
        <p>If this wasn't you, please change your password immediately and contact support.</p>
        <p>Best regards,<br>The Buildcart.ai Security Team</p>
      </div>
    `;

    return this.sendEmail(user.email, subject, html);
  }
}

module.exports = new EmailService(); 