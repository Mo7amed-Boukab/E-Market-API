# E-Market API - SaaS Marketplace Platform

> Une plateforme E-commerce Multi-vendeurs (Marketplace) de nouvelle génération, conçue pour la scalabilité, la performance et une expérience utilisateur temps réel.

![Status](https://img.shields.io/badge/Status-Development-blue)
![Node.js](https://img.shields.io/badge/Node.js-v18+-green)
![License](https://img.shields.io/badge/License-Proprietary-red)

## Vision du Projet

E-Market est une solution **SaaS (Software as a Service)** complète permettant de déployer une marketplace de type Amazon ou Etsy en quelques minutes. Elle gère la complexité des paiements, des commissions, et de la logistique numérique pour que vous puissiez vous concentrer sur le business.

---

## Fonctionnalités Clés

### Système de Paiement Hybride (Unique)
Notre architecture de paiement intelligente s'adapte automatiquement :
*   **Stripe Connect** : Pour les vendeurs professionnels, les fonds sont virés directement sur leur compte, et la plateforme prélève sa commission automatiquement.
*   **Mode Simple** : Pour les petits vendeurs, la plateforme encaisse tout et un système de "Payouts" permet de reverser les fonds manuellement ou automatiquement.

### Expérience Temps Réel (Realtime)
*   **WebSockets (Socket.io)** : Notifications instantanées pour les nouvelles commandes, messages et alertes.
*   **Dual-Channel Notifications** : Les utilisateurs sont notifiés par Email (transactionnel) ET via l'interface (In-App).

### Gestion E-commerce Avancée
*   **Produits & Variantes** : Gestion fine des stocks, images optimisées (Sharp), et SEO.
*   **Recherche Intelligente** : Moteur de recherche hybride (Texte + Regex) avec filtres avancés (Prix, Note, Catégorie).
*   **Système d'Avis Vérifiés** : Seuls les acheteurs réels peuvent noter (Verified Purchase badge).
*   **Wishlist** : Gestion des favoris optimisée.

### Sécurité & Performance
*   **Architecture Robuste** : Node.js, Express, MongoDB avec indexation avancée.
*   **Sécurité** : JWT Auth, Hashage Bcrypt, Validation stricte des entrées, **Rate Limiting** (Protection DDoS & Brute-force).
*   **Scalabilité** : Services découplés (Notification, Payment, Socket).

---

## Stack Technique

*   **Backend** : Node.js, Express.js
*   **Base de données** : MongoDB (Mongoose)
*   **Temps Réel** : Socket.io
*   **Paiement** : Stripe API (Intents & Connect)
*   **Emails** : Nodemailer + Handlebars
*   **Traitement Image** : Sharp
*   **Validation** : Express-validator

---

## Installation Rapide

### Prérequis
*   Node.js v16+
*   MongoDB
*   Compte Stripe (pour les paiements)

### Étapes
1.  **Cloner le projet**
    ```bash
    git clone https://github.com/votre-repo/e-market-api.git
    cd e-market-api
    ```

2.  **Installer les dépendances**
    ```bash
    npm install
    ```

3.  **Configuration**
    Copiez `.env.example` vers `.env` et remplissez vos clés API (Stripe, MongoDB, SMTP).

4.  **Lancer le serveur**
    ```bash
    npm run dev
    ```

---

Developed by Mohamed Boukab.
