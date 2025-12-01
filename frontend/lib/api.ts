import axios, { AxiosInstance } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('hms_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle 401 errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('hms_token');
          localStorage.removeItem('hms_user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async login(username: string, password: string, role: string) {
    const response = await this.client.post('/auth/login', {
      username,
      password,
      role,
    });
    return response.data;
  }

  async getProfile() {
    const response = await this.client.get('/auth/profile');
    return response.data;
  }

  // Patients
  async getMyQueue() {
    const response = await this.client.get('/patients/queue/my-queue');
    return response.data;
  }

  async getPatientById(patientId: string) {
    const response = await this.client.get(`/patients/${patientId}`);
    return response.data;
  }

  async lockPatient(patientId: string) {
    const response = await this.client.patch(`/patients/${patientId}/lock`);
    return response.data;
  }

  async getQueueStats() {
    const response = await this.client.get('/patients/stats/queue');
    return response.data;
  }

  // Pharmacy
  async searchMedicines(query: string, limit: number = 10) {
    const response = await this.client.get('/pharmacy/medicines/search', {
      params: { q: query, limit },
    });
    return response.data;
  }

  async bulkStockCheck(medicineIds: string[]) {
    const response = await this.client.post('/pharmacy/stock/bulk', {
      medicineIds,
    });
    return response.data;
  }

  async getMedicineStock(medicineId: string) {
    const response = await this.client.get(`/pharmacy/medicines/${medicineId}/stock`);
    return response.data;
  }

  async getLowStockAlerts() {
    const response = await this.client.get('/pharmacy/alerts/low-stock');
    return response.data;
  }

  // Prescriptions
  async createPrescription(data: {
    patientId: string;
    diagnosis?: string;
    notes?: string;
    items: Array<{
      medicineId: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions?: string;
    }>;
  }) {
    const response = await this.client.post('/prescriptions', data);
    return response.data;
  }

  async getPatientPrescriptions(patientId: string) {
    const response = await this.client.get(`/prescriptions/patient/${patientId}`);
    return response.data;
  }

  async repeatPrescription(prescriptionId: string) {
    const response = await this.client.post(`/prescriptions/${prescriptionId}/repeat`);
    return response.data;
  }

  // Lab
  async getAllLabTests() {
    const response = await this.client.get('/lab/tests');
    return response.data;
  }

  async searchLabTests(query: string) {
    const response = await this.client.get('/lab/tests/search', {
      params: { q: query },
    });
    return response.data;
  }

  async createLabOrder(data: {
    patientId: string;
    testIds: string[];
    clinicalNotes?: string;
  }) {
    const response = await this.client.post('/lab/orders', data);
    return response.data;
  }

  async getPatientLabOrders(patientId: string) {
    const response = await this.client.get(`/lab/orders/patient/${patientId}`);
    return response.data;
  }

  // Workflow
  async autoRoutePatient(patientId: string) {
    const response = await this.client.post(`/workflow/patients/${patientId}/auto-route`);
    return response.data;
  }

  async getWorkflowHistory(patientId: string) {
    const response = await this.client.get(`/workflow/patients/${patientId}/history`);
    return response.data;
  }

  // Users
  async getAllDoctors(specialty?: string) {
    const response = await this.client.get('/users/doctors/all', {
      params: specialty ? { specialty } : {},
    });
    return response.data;
  }
}

export const api = new ApiClient();
