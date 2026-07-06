import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Nobisoft Intern API',
      version: '1.0.0',
      description: 'API documentation for Nobisoft Intern project',
    },
    servers: [
      { url: '/api', description: 'API base path' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: ['./src/api/**/*.ts', './src/app.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);