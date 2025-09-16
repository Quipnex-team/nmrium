export interface APIConfig {
  baseURL: string;
  token?: string;
  headers?: Record<string, string>;
}

let apiConfig: APIConfig = {
  baseURL: ''
};

export function setAPIConfig(config: APIConfig) {
  apiConfig = { ...config };
}

export function getAPIConfig(): APIConfig {
  return apiConfig;
}