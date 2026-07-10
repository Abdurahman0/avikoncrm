// @ts-nocheck

import type { ProductService } from '../core/contracts';
import type {
  EntityId,
  PaginatedResult,
  ProductCategoryListParams,
  ProductCategoryMutationInput,
  ProductCategoryPatchInput,
  ProductMutationInput,
  ProductPatchInput,
  Product,
  ProductCategory,
  TableQueryParams,
} from '../../types/domain';
import { apiClient } from '../../lib/api-client';
import {
  mapProductCategoryDtoToModel,
  mapProductCategoryListDtoToItems,
  mapProductDtoToModel,
  mapProductListDtoToItems,
  type ProductCategoryDto,
  type ProductDto,
} from '../adapters/product-adapter';

function isNotFoundError(error: unknown): boolean {
  const status =
    error &&
    typeof error === 'object' &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status;

  return status === 404;
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function mapUnfProductDto(value: unknown): ProductDto {
  const item = toRecord(value) ?? {};
  const code = readString(item.code) || readString(item.id);
  return {
    id: code,
    sku: code,
    name: readString(item.name) || readString(item.full_name),
    description: readString(item.description),
    price: item.price ?? 0,
    stock_quantity: item.stock ?? 0,
    minimal_stock: 0,
    is_active: true,
    image_url: readString(item.imageUrl) || readString(item.image_url),
    category_name: readString(item.group),
    metadata: {
      article: readString(item.article),
      segment: readString(item.segment),
      manufacturer: readString(item.manufacturer),
      country: readString(item.country),
      unit: readString(item.unit),
      source: '1C',
    },
  };
}

function mapUnfProductList(value: unknown): Product[] {
  const payload = toRecord(value);
  const rawItems = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(value)
        ? value
        : [];
  return rawItems.map((item) => mapProductDtoToModel(mapUnfProductDto(item)));
}

function mapUnfCategoryList(value: unknown): ProductCategory[] {
  const payload = toRecord(value);
  const rawItems = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(value)
        ? value
        : [];
  return rawItems.map((item, index) => {
    const record = toRecord(item) ?? {};
    return mapProductCategoryDtoToModel({
      id: readString(record.code) || `unf-group-${index}`,
      code: readString(record.code),
      name: readString(record.name),
      sort_order: index,
      is_active: true,
    });
  });
}

function toPaginatedResult<T>(
  allItems: T[],
  params?: { page?: number; pageSize?: number; page_size?: number },
  totalItemsHint?: number | null,
): PaginatedResult<T> {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.max(1, params?.pageSize ?? params?.page_size ?? 10);
  const start = (page - 1) * pageSize;
  const hasServerPaginationHint = typeof totalItemsHint === 'number' && totalItemsHint >= 0;

  const items = hasServerPaginationHint ? allItems : allItems.slice(start, start + pageSize);
  const totalItems = hasServerPaginationHint ? totalItemsHint : allItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return {
    items,
    meta: {
      page: Math.min(page, totalPages),
      pageSize,
      totalItems,
      totalPages,
    },
  };
}

function toMutationPayload(input: ProductMutationInput | ProductPatchInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (input.name !== undefined) {
    payload.name = input.name;
  }
  if (input.description !== undefined) {
    payload.description = input.description;
  }
  if (input.price !== undefined) {
    payload.price = input.price;
  }
  if (input.stockQuantity !== undefined) {
    payload.stock_quantity = input.stockQuantity;
  }
  if (input.minimalStock !== undefined) {
    payload.minimal_stock = input.minimalStock;
  }
  if (input.isActive !== undefined) {
    payload.is_active = input.isActive;
  }
  if (input.isRecommended !== undefined) {
    payload.is_recommended = input.isRecommended;
  }
  if (input.subsidyEnabled !== undefined) {
    payload.subsidy_enabled = input.subsidyEnabled;
  }
  if (input.categoryId !== undefined) {
    const normalizedCategoryId =
      typeof input.categoryId === 'string' ? input.categoryId.trim() : input.categoryId;
    payload.category = normalizedCategoryId;
  }
  if (input.metadata !== undefined) {
    payload.metadata = input.metadata;
  }
  return payload;
}

function toMutationFormData(input: ProductMutationInput | ProductPatchInput): FormData {
  const payload = toMutationPayload(input);
  const fd = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    if (key === 'metadata' && typeof value === 'object') {
      fd.append(key, JSON.stringify(value));
      return;
    }
    fd.append(key, String(value));
  });

  if (input.image instanceof File) {
    fd.append('image', input.image);
  }
  if (input.imageAltText !== undefined) {
    fd.append('image_alt_text', String(input.imageAltText ?? ''));
  }
  if (input.imageIsPrimary !== undefined) {
    fd.append('image_is_primary', input.imageIsPrimary ? 'true' : 'false');
  }

  return fd;
}

function toCategoryMutationPayload(
  input: ProductCategoryMutationInput | ProductCategoryPatchInput,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (input.name !== undefined) {
    payload.name = input.name;
  }
  if (input.code !== undefined) {
    payload.code = input.code;
  }
  const sortOrderCandidate = (input as ProductCategoryMutationInput).sortOrder;
  if (sortOrderCandidate !== undefined) {
    const parsedSortOrder = Number(sortOrderCandidate);
    if (Number.isFinite(parsedSortOrder)) {
      payload.sort_order = Math.max(0, Math.floor(parsedSortOrder));
    }
  }
  return payload;
}

export const apiProductService: ProductService = {
  async list(params) {
    return apiProductService.listProducts(params);
  },

  async getById(id) {
    return apiProductService.getProductById(id);
  },

  async listProducts(params) {
    const page = Math.max(1, params?.page ?? 1);
    const pageSize = Math.max(1, params?.pageSize ?? params?.page_size ?? 25);
    const { data } = await apiClient.get<unknown>('/api/unf/products/', {
      params: {
        search: params?.search,
        limit: pageSize,
        offset: (page - 1) * pageSize,
        include: 'all',
        sortBy: params?.sortBy,
        sortOrder: params?.sortDirection,
      },
    });
    const responsePayload = toRecord(data)?.data ?? data;
    const items = mapUnfProductList(responsePayload);
    const payload = toRecord(responsePayload);
    return toPaginatedResult(items, { page, pageSize }, readNumber(payload?.totalCount ?? payload?.count));
  },

  async getProductById(id) {
    const { data } = await apiClient.get<unknown>('/api/unf/products/', {
      params: { code: id, limit: 1, include: 'all' },
    });
    const items = mapUnfProductList(toRecord(data)?.data ?? data);
    return items[0] ?? null;
  },

  async create(input) {
    return apiProductService.createProduct(input);
  },

  async createProduct(input) {
    const payload =
      input?.image instanceof File || input?.imageAltText !== undefined || input?.imageIsPrimary !== undefined
        ? toMutationFormData(input)
        : toMutationPayload(input);
    const { data } = await apiClient.post<ProductDto>('/api/products/', payload);
    return mapProductDtoToModel(data);
  },

  async update(id, input) {
    return apiProductService.updateProduct(id, input);
  },

  async updateProduct(id, input) {
    const hasImage = input?.image instanceof File;
    const { data } = await apiClient.patch<ProductDto>(
      `/api/products/${id}/`,
      hasImage ? toMutationFormData(input) : toMutationPayload(input),
    );
    return mapProductDtoToModel(data);
  },

  async patch(id, input) {
    return apiProductService.patchProduct(id, input);
  },

  async patchProduct(id, input) {
    const hasImage = input?.image instanceof File;
    const { data } = await apiClient.patch<ProductDto>(
      `/api/products/${id}/`,
      hasImage ? toMutationFormData(input) : toMutationPayload(input),
    );
    return mapProductDtoToModel(data);
  },

  async delete(id) {
    return apiProductService.deleteProduct(id);
  },

  async deleteProduct(id: EntityId) {
    await apiClient.delete(`/api/products/${id}/`);
    return true;
  },

  async deleteProductImage(productId: EntityId, imageId: EntityId) {
    const { data } = await apiClient.delete<unknown>(
      `/api/products/${productId}/images/${imageId}/`,
    );

    const payload = toRecord(data);
    const nested = payload ? toRecord(payload.data) : null;
    const deletedId = readString(nested?.deleted_image_id) || readString(payload?.deleted_image_id);

    return deletedId || imageId;
  },

  async listProductCategories(params?: ProductCategoryListParams) {
    const { data } = await apiClient.get<unknown>('/api/unf/product-groups/');
    const items = mapUnfCategoryList(toRecord(data)?.data ?? data);
    const query = (params?.search ?? '').trim().toLowerCase();
    const filtered = query
      ? items.filter(item => item.name.toLowerCase().includes(query) || item.code.toLowerCase().includes(query))
      : items;
    return toPaginatedResult(filtered, params, filtered.length);
  },

  async getProductCategoryById(id) {
    const { data } = await apiClient.get<unknown>('/api/unf/product-groups/');
    return mapUnfCategoryList(toRecord(data)?.data ?? data).find(item => item.id === id) ?? null;
  },

  async createProductCategory(input) {
    const { data } = await apiClient.post<ProductCategoryDto>(
      '/api/products/categories/',
      toCategoryMutationPayload(input),
    );
    return mapProductCategoryDtoToModel(data);
  },

  async updateProductCategory(id, input) {
    const { data } = await apiClient.patch<ProductCategoryDto>(
      `/api/products/categories/${id}/`,
      toCategoryMutationPayload(input),
    );
    return mapProductCategoryDtoToModel(data);
  },

  async patchProductCategory(id, input) {
    const { data } = await apiClient.patch<ProductCategoryDto>(
      `/api/products/categories/${id}/`,
      toCategoryMutationPayload(input),
    );
    return mapProductCategoryDtoToModel(data);
  },

  async deleteProductCategory(id: EntityId) {
    await apiClient.delete(`/api/products/categories/${id}/`);
    return true;
  },

};
