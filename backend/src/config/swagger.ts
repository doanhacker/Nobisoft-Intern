import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Nobisoft Intern API',
      version: '1.0.0',
      description: 'API documentation for Nobisoft Intern — Visual Search Engine project',
    },
    servers: [
      { url: '/', description: 'Default server' },
    ],
    tags: [
      { name: 'Auth', description: 'Authentication (register / login)' },
      { name: 'Admin - Users', description: 'Admin user management' },
      { name: 'Admin - Indexing', description: 'Admin image indexing' },
      { name: 'Admin - Images', description: 'Admin image management' },
      { name: 'Client', description: 'Client-side endpoints' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        // ─── Common ───
        PaginationMeta: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 10 },
            totalDocs: { type: 'integer', example: 50 },
            totalPages: { type: 'integer', example: 5 },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error message' },
          },
        },

        // ─── Auth ───
        RegisterRequest: {
          type: 'object',
          required: ['email', 'name', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            name: { type: 'string', example: 'Nguyễn Văn A' },
            password: {
              type: 'string',
              format: 'password',
              example: 'StrongP@ss1',
              description: 'Mật khẩu phải tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, chữ số, ký tự đặc biệt và không vượt quá độ dài cho phép',
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            password: { type: 'string', format: 'password', example: 'StrongP@ss1' },
          },
        },
        AuthUser: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['USER', 'ADMIN'] },
          },
        },
        RegisterResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Đăng ký thành công' },
            data: {
              type: 'object',
              properties: {
                user: {
                  allOf: [
                    { $ref: '#/components/schemas/AuthUser' },
                    {
                      type: 'object',
                      properties: {
                        createdAt: { type: 'string', format: 'date-time' },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Đăng nhập thành công' },
            data: {
              type: 'object',
              properties: {
                accessToken: { type: 'string', example: 'eyJhbGciOi...' },
                user: { $ref: '#/components/schemas/AuthUser' },
              },
            },
          },
        },

        // ─── Admin - Users ───
        UserListItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['USER', 'ADMIN'] },
            createdAt: { type: 'string', format: 'date-time' },
            _count: {
              type: 'object',
              properties: {
                searchHistories: { type: 'integer', example: 5 },
              },
            },
          },
        },
        SearchHistoryItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            searchType: { type: 'string', enum: ['IMAGE_ONLY', 'TEXT_SEMANTIC', 'TEXT_OCR'] },
            queryImagePath: { type: 'string', nullable: true },
            queryText: { type: 'string', nullable: true },
            clickedImage: {
              nullable: true,
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                path: { type: 'string' },
                width: { type: 'integer' },
                height: { type: 'integer' },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        // ─── Admin - Indexing ───
        IndexingResult: {
          type: 'object',
          properties: {
            filename: { type: 'string', example: 'photo1.jpg' },
            success: { type: 'boolean', example: true },
            imageId: { type: 'string', format: 'uuid', nullable: true },
            error: { type: 'string', nullable: true },
          },
        },

        // ─── Admin - Images ───
        ImageListItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            path: { type: 'string', example: 'storage/images/index/uuid.jpg' },
            width: { type: 'integer', example: 1920 },
            height: { type: 'integer', example: 1080 },
            fileSize: { type: 'integer', example: 245760 },
            fileFormat: { type: 'string', example: 'jpg' },
            createdAt: { type: 'string', format: 'date-time' },
            imageIndex: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string', format: 'uuid' },
                processDurationMs: { type: 'integer', nullable: true, example: 1250 },
                indexedAt: { type: 'string', format: 'date-time' },
                ocrLines: {
                  type: 'array',
                  description: 'Preview (max 3 dòng)',
                  items: { $ref: '#/components/schemas/OcrLinePreview' },
                },
              },
            },
          },
        },
        OcrLinePreview: {
          type: 'object',
          properties: {
            rawText: { type: 'string', example: 'NOBISOFT TECHNOLOGY' },
            confidenceScore: { type: 'number', example: 0.98 },
          },
        },
        OcrLine: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            rawText: { type: 'string' },
            normalizedText: { type: 'string' },
            confidenceScore: { type: 'number' },
            boundingBoxes: { type: 'object', nullable: true },
          },
        },

        // ─── Enum ───
        SearchType: {
          type: 'string',
          enum: ['IMAGE_ONLY', 'TEXT_SEMANTIC', 'TEXT_OCR'],
        },
      },
    },
  },
  apis: ['./src/api/**/*.ts', './src/app.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
