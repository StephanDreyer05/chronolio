import nodemailer from 'nodemailer';
import { randomBytes } from 'crypto';

// Create a transporter object for sending emails
let transporter: nodemailer.Transporter | null = null;

// Initialize the email transporter
export function initializeEmailService() {
  // Check if we have the necessary environment variables
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email service not configured. Please set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS environment variables.');
    return false;
  }

  try {
    // Log the email configuration for debugging
    console.log('Email configuration:', {
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      user: process.env.EMAIL_USER?.substring(0, 3) + '...',
    });
    
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        // Do not fail on invalid certs
        rejectUnauthorized: false
      }
    });
    console.log('Email service initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize email service:', error);
    return false;
  }
}

// Generate a random verification token
export function generateVerificationToken(): { token: string, expiresAt: Date } {
  const token = randomBytes(32).toString('hex');
  
  // Token expires in 24 hours
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);
  
  return { token, expiresAt };
}

// Send verification email
export async function sendVerificationEmail(email: string, username: string, token: string): Promise<boolean> {
  if (!transporter) {
    console.error('Email service not initialized');
    return false;
  }

  // Determine the base URL based on environment
  const baseUrl = process.env.BASE_URL || 'https://46bfefbe-87e0-47ab-a4cd-257bbfc52f52-00-lgtzqxecujzm.riker.replit.dev';
  const verificationUrl = `${baseUrl}/verify-email?token=${token}`;

  try {
    const info = await transporter.sendMail({
      from: `"Chronolio" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify your email address',
      text: `Hello ${username},\n\nThank you for registering with Chronolio! Please verify your email address by clicking the link below:\n\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you did not create an account, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">Chronolio</h2>
          <p>Hello ${username},</p>
          <p>Thank you for registering with Chronolio! Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #6366f1; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email Address</a>
          </div>
          <p>Alternatively, you can copy and paste the following link in your browser:</p>
          <p style="word-break: break-all; color: #4b5563;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you did not create an account, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="color: #6b7280; font-size: 0.875rem;">© ${new Date().getFullYear()} Chronolio</p>
        </div>
      `
    });

    console.log('Verification email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return false;
  }
}

// Send password reset email
export async function sendPasswordResetEmail(email: string, username: string, token: string): Promise<boolean> {
  if (!transporter) {
    console.error('Email service not initialized');
    return false;
  }

  // Determine the base URL based on environment
  const baseUrl = process.env.BASE_URL || 'https://46bfefbe-87e0-47ab-a4cd-257bbfc52f52-00-lgtzqxecujzm.riker.replit.dev';
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  try {
    const info = await transporter.sendMail({
      from: `"Chronolio" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Reset your password',
      text: `Hello ${username},\n\nWe received a request to reset your password. Please click the link below to set a new password:\n\n${resetUrl}\n\nThis link will expire in 24 hours.\n\nIf you did not request a password reset, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">Chronolio</h2>
          <p>Hello ${username},</p>
          <p>We received a request to reset your password. Please click the button below to set a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #6366f1; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
          </div>
          <p>Alternatively, you can copy and paste the following link in your browser:</p>
          <p style="word-break: break-all; color: #4b5563;">${resetUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you did not request a password reset, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="color: #6b7280; font-size: 0.875rem;">© ${new Date().getFullYear()} Chronolio</p>
        </div>
      `
    });

    console.log('Password reset email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return false;
  }
}

// Send feature suggestion email
export async function sendFeatureSuggestionEmail(
  featureDescription: string,
  userEmail: string | null = null,
  username: string | null = null
): Promise<boolean> {
  if (!transporter) {
    console.error('Email service not initialized');
    return false;
  }

  const adminEmail = 'admin@chronolio.com';
  
  try {
    // Send email to admin
    const adminInfo = await transporter.sendMail({
      from: `"Chronolio" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: adminEmail,
      subject: 'New Feature Suggestion',
      text: `
New Feature Suggestion

Feature Description:
${featureDescription}

${userEmail ? `Submitted by: ${userEmail}` : 'Submitted anonymously'}
${username ? `Username: ${username}` : ''}
Submitted on: ${new Date().toLocaleString()}
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">Chronolio - New Feature Suggestion</h2>
          
          <div style="background-color: #f9fafb; padding: 16px; border-radius: 4px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Feature Description:</h3>
            <p style="white-space: pre-wrap;">${featureDescription}</p>
          </div>
          
          <p><strong>${userEmail ? `Submitted by: ${userEmail}` : 'Submitted anonymously'}</strong></p>
          ${username ? `<p><strong>Username: ${username}</strong></p>` : ''}
          <p><strong>Submitted on: ${new Date().toLocaleString()}</strong></p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="color: #6b7280; font-size: 0.875rem;">© ${new Date().getFullYear()} Chronolio</p>
        </div>
      `
    });
    
    console.log('Feature suggestion email sent to admin:', adminInfo.messageId);
    
    // Send confirmation email to user if email is provided
    if (userEmail) {
      const userInfo = await transporter.sendMail({
        from: `"Chronolio" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: 'Thank you for your feature suggestion!',
        text: `
Hello${username ? ` ${username}` : ''},

Thank you for suggesting a feature for Chronolio! We appreciate your feedback and are constantly looking for ways to improve our application.

Your suggestion:
${featureDescription}

We will review your suggestion and consider it for future updates. If you have any other ideas or feedback, please don't hesitate to share them with us.

Thank you for helping us make Chronolio better!

Best regards,
The Chronolio Team
        `,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #6366f1;">Chronolio</h2>
            <p>Hello${username ? ` ${username}` : ''},</p>
            <p>Thank you for suggesting a feature for Chronolio! We appreciate your feedback and are constantly looking for ways to improve our application.</p>
            
            <div style="background-color: #f9fafb; padding: 16px; border-radius: 4px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Your suggestion:</h3>
              <p style="white-space: pre-wrap;">${featureDescription}</p>
            </div>
            
            <p>We will review your suggestion and consider it for future updates. If you have any other ideas or feedback, please don't hesitate to share them with us.</p>
            <p>Thank you for helping us make Chronolio better!</p>
            <p>Best regards,<br>The Chronolio Team</p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
            <p style="color: #6b7280; font-size: 0.875rem;">© ${new Date().getFullYear()} Chronolio</p>
          </div>
        `
      });
      
      console.log('Feature suggestion confirmation email sent to user:', userInfo.messageId);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to send feature suggestion email:', error);
    return false;
  }
}

// Send timeline share via email
export async function sendTimelineShareEmail(
  recipientEmails: string[],
  shareLink: string,
  customMessage: string,
  timelineTitle: string,
  senderName: string | null = null
): Promise<boolean> {
  if (!transporter) {
    console.error('Email service not initialized');
    return false;
  }
  
  try {
    // Fix the URL - replace /shared/ with /public/timeline/
    const correctedShareLink = shareLink.replace('/shared/', '/public/timeline/');
    
    // Send individual emails to each recipient for privacy
    let allSent = true;
    
    for (const recipientEmail of recipientEmails) {
      try {
        const info = await transporter.sendMail({
          from: `"Chronolio" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
          to: recipientEmail, // Send to individual recipient
          subject: `${senderName || 'Someone'} shared a timeline with you: ${timelineTitle}`,
          text: `
Hello,

${senderName ? `${senderName} has` : 'Someone has'} shared a timeline with you: "${timelineTitle}"

${customMessage}

View the timeline here: ${correctedShareLink}

This is a read-only view of the timeline and does not require an account to access.

Best regards,
The Chronolio Team
          `,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #6366f1;">Chronolio</h2>
              <p>Hello,</p>
              <p>${senderName ? `<strong>${senderName}</strong> has` : 'Someone has'} shared a timeline with you: <strong>"${timelineTitle}"</strong></p>
              
              <div style="background-color: #f9fafb; padding: 16px; border-radius: 4px; margin: 20px 0;">
                <p style="white-space: pre-wrap;">${customMessage}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${correctedShareLink}" style="background-color: #6366f1; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">View Timeline</a>
              </div>
              
              <p>This is a read-only view of the timeline and does not require an account to access.</p>
              <p>Alternatively, you can copy and paste the following link in your browser:</p>
              <p style="word-break: break-all; color: #4b5563;">${correctedShareLink}</p>
              
              <p>Best regards,<br>The Chronolio Team</p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
              <p style="color: #6b7280; font-size: 0.875rem;">© ${new Date().getFullYear()} Chronolio</p>
            </div>
          `
        });
        
        console.log(`Timeline share email sent to ${recipientEmail}:`, info.messageId);
      } catch (err) {
        console.error(`Failed to send email to ${recipientEmail}:`, err);
        allSent = false;
      }
    }
    
    return allSent;
  } catch (error) {
    console.error('Failed to send timeline share email:', error);
    return false;
  }
}