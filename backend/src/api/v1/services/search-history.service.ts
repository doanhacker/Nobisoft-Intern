import { prisma } from '../../../config/prisma.js';
import type { Prisma } from '../../../generated/prisma/client.js';
import type {
  CreateImageSearchHistoryInput,
  CreateSearchHistoryInput,
  ImageSearchHistoryQuery,
  SaveSearchClickResult,
  SearchClickInput,
  TextSearchHistoryQuery,
} from '../../../types/search.type.js';
import { deleteImageFromDisk, saveImageToDisk } from '../../../utils/storage.util.js';

type SearchHistoryDb = Pick<Prisma.TransactionClient, 'searchHistory'>;

async function createSearchHistoryRecord(
  db: SearchHistoryDb,
  input: CreateSearchHistoryInput,
) {
  if (input.searchType === 'IMAGE_ONLY') {
    return db.searchHistory.create({
      data: {
        userId: input.userId,
        searchType: input.searchType,
        queryImageId: input.queryImageId,
      },
    });
  }

  return db.searchHistory.create({
    data: {
      userId: input.userId,
      searchType: input.searchType,
      queryText: input.queryText,
    },
  });
}

export function createSearchHistory(input: CreateSearchHistoryInput) {
  return createSearchHistoryRecord(prisma, input);
}

export async function createImageSearchHistory(input: CreateImageSearchHistoryInput) {
  const savedFile = await saveImageToDisk(input.buffer, input.mimetype, 'search');

  try {
    return await prisma.$transaction(async (tx) => {
      const queryImage = await tx.image.create({
        data: {
          path: savedFile.path,
          width: savedFile.width,
          height: savedFile.height,
          fileSize: savedFile.fileSize,
          fileFormat: savedFile.fileFormat,
        },
      });

      const history = await createSearchHistoryRecord(tx, {
        userId: input.userId,
        searchType: 'IMAGE_ONLY',
        queryImageId: queryImage.id,
      });

      return {
        id: history.id,
        queryImageId: queryImage.id,
      };
    });
  } catch (error) {
    await deleteImageFromDisk(savedFile.path);
    throw error;
  }
}

export async function getImageSearchHistory(
  userId: string,
  searchHistoryId: string,
): Promise<ImageSearchHistoryQuery | null> {
  const history = await prisma.searchHistory.findFirst({
    where: {
      id: searchHistoryId,
      userId,
      searchType: 'IMAGE_ONLY',
    },
    select: {
      id: true,
      queryImage: {
        select: {
          path: true,
          fileFormat: true,
        },
      },
    },
  });

  if (!history?.queryImage) {
    return null;
  }

  return {
    id: history.id,
    queryImage: {
      path: history.queryImage.path,
      fileFormat: history.queryImage.fileFormat ?? '',
    }
  };
}

export async function getTextSearchHistory(
  userId: string,
  searchHistoryId: string,
): Promise<TextSearchHistoryQuery | null> {
  const history = await prisma.searchHistory.findFirst({
    where: {
      id: searchHistoryId,
      userId,
      searchType: 'TEXT_SEMANTIC',
    },
    select: {
      id: true,
      queryText: true,
    },
  });

  if (!history?.queryText) {
    return null;
  }

  return {
    id: history.id,
    queryText: history.queryText,
  };
}

export async function getOcrSearchHistory(
  userId: string,
  searchHistoryId: string,
): Promise<TextSearchHistoryQuery | null> {
  const history = await prisma.searchHistory.findFirst({
    where: {
      id: searchHistoryId,
      userId,
      searchType: 'TEXT_OCR',
    },
    select: {
      id: true,
      queryText: true,
    },
  });

  if (!history?.queryText) {
    return null;
  }

  return {
    id: history.id,
    queryText: history.queryText,
  };
}

export async function saveSearchClick(input: SearchClickInput): Promise<SaveSearchClickResult> {
  const history = await prisma.searchHistory.findFirst({
    where: {
      id: input.searchHistoryId,
      userId: input.userId,
    },
    select: { id: true },
  });

  if (!history) {
    return {
      success: false,
      statusCode: 404,
      message: 'Không tìm thấy lịch sử tìm kiếm',
    };
  }

  const clickedImage = await prisma.image.findUnique({
    where: { id: input.clickedImageId },
    select: { id: true },
  });

  if (!clickedImage) {
    return {
      success: false,
      statusCode: 404,
      message: 'Không tìm thấy ảnh được chọn',
    };
  }

  const click = await prisma.searchClick.create({
    data: {
      searchHistoryId: history.id,
      clickedImageId: clickedImage.id,
    },
    select: {
      id: true,
      searchHistoryId: true,
      clickedImageId: true,
      createdAt: true,
    },
  });

  return {
    success: true,
    data: click,
  };
}
