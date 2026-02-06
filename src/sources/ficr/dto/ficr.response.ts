export type FicrResponse<T> = {
  code: number;
  status: boolean;
  message: string;
  data: T;
};
