import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Social Media App API',
      version: '1.0.0',
      description: 'API documentation for the Social Media App',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 8000}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'User ID',
            },
            username: {
              type: 'string',
              description: 'Username',
            },
            email: {
              type: 'string',
              description: 'Email address',
            },
            avatar: {
              type: 'string',
              description: 'Avatar URL',
            },
          },
        },
        Video: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Video ID',
            },
            title: {
              type: 'string',
              description: 'Video title',
            },
            description: {
              type: 'string',
              description: 'Video description',
            },
            videoFile: {
              type: 'string',
              description: 'Video file URL',
            },
            thumbnail: {
              type: 'string',
              description: 'Thumbnail URL',
            },
            duration: {
              type: 'number',
              description: 'Video duration in seconds',
            },
            views: {
              type: 'number',
              description: 'Number of views',
            },
            isPublished: {
              type: 'boolean',
              description: 'Publication status',
            },
            status: {
              type: 'string',
              enum: ['pending', 'processing', 'ready', 'failed'],
              description: 'Video processing status',
            },
            owner: {
              $ref: '#/components/schemas/User',
            },
            channel: {
              type: 'string',
              description: 'Channel ID',
            },
          },
        },
        Channel: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Channel ID',
            },
            name: {
              type: 'string',
              description: 'Channel name',
            },
            description: {
              type: 'string',
              description: 'Channel description',
            },
            banner: {
              type: 'string',
              description: 'Channel banner URL',
            },
            userId: {
              type: 'string',
              description: 'Owner user ID',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              description: 'Error message',
            },
            errors: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
          },
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              description: 'Response message',
            },
            data: {
              type: 'object',
              description: 'Response data',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'], // Paths to files containing OpenAPI definitions
};

const specs = swaggerJSDoc(options);

export { swaggerUi, specs };