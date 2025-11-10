import axios, {
  AxiosHeaders,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';

const DEFAULT_FIPE_API_URL = 'https://fipe.parallelum.com.br/api/v2';
const DEFAULT_TIMEOUT = 15000;
const DEFAULT_USER_AGENT = 'leilaoapp-fipe-sync/1.0';

const baseURL = process.env.FIPE_API_URL ?? DEFAULT_FIPE_API_URL;
const timeout = Number(process.env.FIPE_API_TIMEOUT_MS ?? DEFAULT_TIMEOUT);
const userAgent = process.env.FIPE_API_USER_AGENT ?? DEFAULT_USER_AGENT;

const token = process.env.FIPE_API_TOKEN?.trim();
const tokenHeader = process.env.FIPE_API_TOKEN_HEADER ?? 'X-Subscription-Token';
const tokenPrefix = process.env.FIPE_API_TOKEN_PREFIX ?? '';
const tokenQueryParam = process.env.FIPE_API_TOKEN_QUERY?.trim();

function attachToken(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  if (!token) {
    return config;
  }

  if (tokenQueryParam) {
    const params = { ...(config.params ?? {}) };
    if (params[tokenQueryParam] === undefined) {
      params[tokenQueryParam] = token;
    }
    config.params = params;
    return config;
  }

  const headers = AxiosHeaders.from(config.headers ?? {});
  if (!headers.has(tokenHeader)) {
    const headerValue = tokenPrefix ? `${tokenPrefix}${token}` : token;
    headers.set(tokenHeader, headerValue);
  }
  config.headers = headers;

  return config;
}

export const fipeApi: AxiosInstance = axios.create({
  baseURL,
  timeout,
  headers: {
    'User-Agent': userAgent,
  },
});

fipeApi.interceptors.request.use(attachToken);

export function getFipeApiBaseUrl(): string {
  return baseURL;
}

