const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class EmailService {
    constructor() {
        this.transporter = null;
        this.isConnected = false;
        this.initializeTransporter();
    }

    /**
     * Initialiser le transporteur SMTP
     */
    async initializeTransporter() {
        try {
            if (process.env.SMTP_HOST && process.env.SMTP_USER) {
                this.transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST,
                    port: process.env.SMTP_PORT || 587,
                    secure: process.env.SMTP_SECURE === 'true', // true pour 465, false pour les autres
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS,
                    },
                });

                // Vérifier la connexion
                await this.transporter.verify();
                this.isConnected = true;
                logger.info('Email Service connected to SMTP server');
            } else {
                logger.warn('SMTP not configured. Emails will be logged to console only.');
            }
        } catch (error) {
            logger.error('Failed to initialize Email Service:', error.message);
            this.isConnected = false;
        }
    }

    /**
     * Charger et compiler un template HTML
     * @param {string} templateName - Nom du fichier template (sans .html)
     * @param {object} data - Données à injecter
     */
    async loadTemplate(templateName, data) {
        try {
            const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.html`);

            // Vérifier si le fichier existe
            if (fs.existsSync(templatePath)) {
                const source = fs.readFileSync(templatePath, 'utf8');
                const template = handlebars.compile(source);
                return template(data);
            }

            // Fallback: Template générique simple si le fichier n'existe pas
            return `
        <div style="font-family: sans-serif; padding: 20px;">
          <h1>${data.title || 'Notification'}</h1>
          <p>${data.message || ''}</p>
          ${data.link ? `<a href="${data.link}" style="button">Voir plus</a>` : ''}
          <hr>
          <small>E-Market API</small>
        </div>
      `;
        } catch (error) {
            logger.error(`Error loading template ${templateName}:`, error);
            return `<p>${data.message}</p>`;
        }
    }

    /**
     * Envoyer un email
     * @param {string} to - Email du destinataire
     * @param {string} subject - Sujet
     * @param {string} templateName - Nom du template
     * @param {object} data - Données pour le template
     */
    async sendEmail(to, subject, templateName, data) {
        try {
            const html = await this.loadTemplate(templateName, data);

            const mailOptions = {
                from: `"${process.env.EMAIL_FROM_NAME || 'E-Market'}" <${process.env.EMAIL_FROM_ADDRESS || 'noreply@emarket.com'}>`,
                to,
                subject,
                html,
            };

            if (this.isConnected && this.transporter) {
                const info = await this.transporter.sendMail(mailOptions);
                logger.info(`Email sent to ${to}: ${info.messageId}`);
                return true;
            } else {
                // Mode DEV ou Fallback: Log dans la console
                console.log('---------------------------------------------------');
                console.log(`[TEST EMAIL] To: ${to}`);
                console.log(`Subject: ${subject}`);
                console.log(`Template: ${templateName}`);
                console.log('Data:', JSON.stringify(data, null, 2));
                console.log('---------------------------------------------------');
                return true;
            }
        } catch (error) {
            logger.error(`Error sending email to ${to}:`, error);
            return false;
        }
    }
}

// Singleton
module.exports = new EmailService();
