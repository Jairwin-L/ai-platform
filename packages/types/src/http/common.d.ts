declare namespace IHttpCommon {
  interface PaginatedData<T> {
    data: T[];
    page: number;
    pageSize: number;
    total: number;
  }
}
