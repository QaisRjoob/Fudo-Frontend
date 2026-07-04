import axios, { AxiosInstance } from 'axios';
import StorageService from '../services/StorageService';

export class ApiClient {
  private static instance: ApiClient;
  private axiosInstance: AxiosInstance;
  private baseURL: string = 'https://api.fudo.app'; // Placeholder

  private constructor() {
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        const token = await StorageService.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - logout user
          await StorageService.removeAuthToken();
        }
        return Promise.reject(error);
      }
    );
  }

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  setBaseURL(url: string): void {
    this.baseURL = url;
    this.axiosInstance.defaults.baseURL = url;
  }

  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.axiosInstance.get(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.axiosInstance.post(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.axiosInstance.put(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.axiosInstance.delete(url);
    return response.data;
  }

  async uploadMultipart<T>(url: string, formData: FormData): Promise<T> {
    const response = await this.axiosInstance.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
}

export default ApiClient.getInstance();
