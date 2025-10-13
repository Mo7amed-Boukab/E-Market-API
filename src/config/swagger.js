const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'E-Market API',
      version: '1.0.0',
      description: 'API RESTful pour une plateforme e-commerce développée avec Express.js et MongoDB',
      contact: {
        name: 'Mohamed Boukab',
        email: 'contact@emarket.com'
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Serveur de développement'
      }
    ],
    components: {
      schemas: {
        User: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            _id: {
              type: 'string',
              description: 'ID unique de l\'utilisateur'
            },
            name: {
              type: 'string',
              description: 'Nom de l\'utilisateur'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email de l\'utilisateur'
            },
            password: {
              type: 'string',
              description: 'Mot de passe de l\'utilisateur'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Date de création du compte'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Date de dernière mise à jour'
            }
          }
        },
        Category: {
          type: 'object',
          required: ['name'],
          properties: {
            _id: {
              type: 'string',
              description: 'ID unique de la catégorie'
            },
            name: {
              type: 'string',
              description: 'Nom de la catégorie'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Date de création'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Date de dernière mise à jour'
            }
          }
        },
        Product: {
          type: 'object',
          required: ['name', 'price', 'category'],
          properties: {
            _id: {
              type: 'string',
              description: 'ID unique du produit'
            },
            name: {
              type: 'string',
              description: 'Nom du produit'
            },
            description: {
              type: 'string',
              description: 'Description du produit'
            },
            price: {
              type: 'number',
              description: 'Prix du produit'
            },
            category: {
              type: 'string',
              description: 'ID de la catégorie du produit'
            },
            stock: {
              type: 'number',
              description: 'Quantité en stock'
            },
            imageUrl: {
              type: 'string',
              description: 'URL de l\'image du produit'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Date de création'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Date de dernière mise à jour'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Message d\'erreur'
            },
            status: {
              type: 'number',
              description: 'Code de statut HTTP'
            }
          }
        }
      },
      responses: {
        NotFound: {
          description: 'Ressource non trouvée',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        BadRequest: {
          description: 'Requête invalide',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        InternalServerError: {
          description: 'Erreur interne du serveur',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js', './src/app.js'], 
};

const specs = swaggerJsdoc(options);

module.exports = {
  specs,
  swaggerUi
};