import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Visual Search Engine API',
      version: '1.0.0',
    },
    servers: [
      { url: '/' },
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
        // ============================
        // Common
        // ============================

        ErrorResponse: {
          type: 'object',
          required: ['success', 'message'],
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },

        PaginationMeta: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            totalDocs: { type: 'integer', example: 100 },
            totalPages: { type: 'integer', example: 5 },
          },
        },

        // ============================
        // Auth
        // ============================

        RegisterRequest: {
          type: 'object',
          required: ['email', 'name', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            name: { type: 'string', example: 'Nguyễn Văn A' },
            password: { type: 'string', format: 'password', example: 'StrongP@ss1' },
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

        // ============================
        // Upload
        // ============================

        UploadResultItem: {
          type: 'object',
          properties: {
            filename: { type: 'string', example: 'photo1.jpg' },
            success: { type: 'boolean', example: true },
            id: { type: 'string', format: 'uuid', nullable: true },
            path: { type: 'string', nullable: true, example: 'storage/images/index/uuid.jpg' },
            error: { type: 'string', nullable: true, example: 'Lỗi lưu database' },
          },
        },

        BatchStatusResponse: {
          type: 'object',
          properties: {
            batchId: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['UPLOADING', 'PROCESSING', 'COMPLETED'] },
            totalImages: { type: 'integer', example: 12 },
            successCount: { type: 'integer', example: 11 },
            failedCount: { type: 'integer', example: 1 },
            totalDurationMs: { type: 'integer', nullable: true, example: 15234 },
            createdAt: { type: 'string', format: 'date-time' },
            failedImages: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  imageId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },

        // ============================
        // Images
        // ============================

        ImageListItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            imageUrl: { type: 'string', example: 'http://localhost:8000/storage/images/index/uuid.jpg' },
            width: { type: 'integer', nullable: true, example: 1920 },
            height: { type: 'integer', nullable: true, example: 1080 },
            fileSize: { type: 'integer', nullable: true, example: 245760 },
            fileFormat: { type: 'string', nullable: true, example: 'jpg' },
            createdAt: { type: 'string', format: 'date-time' },
            imageIndex: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string', format: 'uuid' },
                status: { type: 'string', enum: ['PENDING', 'SUCCESS', 'FAILED'] },
                indexedAt: { type: 'string', format: 'date-time' },
                ocrLines: {
                  type: 'array',
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

        // ============================
        // Search
        // ============================

        SearchImageResult: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            imageUrl: { type: 'string', example: 'http://localhost:8000/storage/images/index/uuid.jpg' },
            width: { type: 'integer', example: 1920 },
            height: { type: 'integer', example: 1080 },
            fileSize: { type: 'integer', example: 245760 },
            fileFormat: { type: 'string', example: 'jpg' },
            similarityScore: {
              type: 'number',
              format: 'float',
              example: 0.97,
              description: 'Điểm tương đồng, chỉ được trả về cho tài khoản ADMIN',
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        SearchTextOcrResultItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            imageUrl: { type: 'string', example: 'http://localhost:8000/storage/images/index/uuid.jpg' },
            width: { type: 'integer', nullable: true, example: 1920 },
            height: { type: 'integer', nullable: true, example: 1080 },
            fileSize: { type: 'integer', nullable: true, example: 245760 },
            fileFormat: { type: 'string', nullable: true, example: 'jpg' },
            createdAt: { type: 'string', format: 'date-time' },
            ocrMatches: {
              type: 'array',
              items: { $ref: '#/components/schemas/OcrMatchLine' },
            },
          },
        },

        OcrMatchLine: {
          type: 'object',
          properties: {
            rawText: { type: 'string', example: 'cực hài' },
            confidenceScore: { type: 'number', example: 0.95 },
            boundingBoxes: {
              type: 'object',
              nullable: true,
              properties: {
                x: { type: 'number', example: 120 },
                y: { type: 'number', example: 45 },
                width: { type: 'number', example: 200 },
                height: { type: 'number', example: 30 },
              },
            },
          },
        },

        // ============================
        // Admin - Users
        // ============================

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

        SearchType: {
          type: 'string',
          enum: ['IMAGE_ONLY', 'TEXT_SEMANTIC', 'TEXT_OCR', 'TEXT_PROMPT'],
        },

        HistoryQueryImage: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            imageUrl: { type: 'string', example: 'http://localhost:8000/storage/images/search/uuid.jpg' },
            width: { type: 'integer', nullable: true, example: 1200 },
            height: { type: 'integer', nullable: true, example: 800 },
            fileSize: { type: 'integer', nullable: true, example: 245760 },
            fileFormat: { type: 'string', nullable: true, example: 'jpg' },
          },
        },

        UserSearchHistoryItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            searchType: { $ref: '#/components/schemas/SearchType' },
            queryImage: {
              nullable: true,
              allOf: [{ $ref: '#/components/schemas/HistoryQueryImage' }],
            },
            queryText: { type: 'string', nullable: true, example: 'black cat' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
  apis: ['./src/api/**/*.ts', './src/app.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
