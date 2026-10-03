/** Error envelope returned by the backend for every non-2xx response. */
export interface ApiError {
  timestamp: string;
  status: string;
  message: string;
  path: string;
  traceID: string;
}

/** Spring-style paginated response. */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}
