export interface PaginationMeta {
    page: number;
    limit: number;
    totalDocs: number;
    totalPages: number;
}

export interface ErrorDetail {
    field?: string;
    message: string;
}

export type ApiResponse<T = null> =
    | {
        success: true;
        message: string;
        data: T;
        meta?: PaginationMeta;
    }
    | {
        success: false;
        message: string;
        errors?: ErrorDetail[];
    };