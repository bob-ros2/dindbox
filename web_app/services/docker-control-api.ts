// A simple client to interact with the Docker API.
import { AppConfig } from '../config';

// --- TYPE DEFINITIONS FROM OPENAPI ---

export interface CreateContainerInput {
  image: string;
  detach?: boolean;
  name?: string | null;
  entrypoint?: string | null;
  command?: string | null;
  network?: string | null;
  environment?: { [key: string]: string } | null;
  ports?: { [key: string]: number | (string | number)[] | null } | null;
  volumes?: { [key: string]: { [key: string]: string } } | string[] | null;
  labels?: { [key: string]: string } | string[] | null;
  auto_remove?: boolean;
}

export interface PullPushImageInput {
  repository: string;
  tag?: string | null;
}

export interface BuildImageInput {
  path: string;
  tag: string;
  dockerfile?: string | null;
}

export interface CreateNetworkInput {
  name: string;
  driver?: string | null;
  internal?: boolean;
  labels?: { [key: string]: string } | null;
}

export interface CreateVolumeInput {
  name: string;
  driver?: string | null;
  labels?: { [key: string]: string } | null;
}

// --- HELPER FUNCTION ---
const makeRequest = async (path: string, options: RequestInit) => {
  try {
    // FIX: Replace undefined 'API_BASE' with 'AppConfig.API_BASE_URL' from the imported config.
    const response = await fetch(`${AppConfig.API_BASE_URL}${path}`, options);
    
    let responseData;
    const isNoContent = response.status === 204 || response.headers.get('content-length') === '0';

    if (isNoContent) {
      responseData = { message: 'Request successful with no content.' };
    } else {
      // Gracefully handle non-JSON responses by attempting to read as text if JSON parsing fails.
      const text = await response.text();
      try {
        responseData = JSON.parse(text);
      } catch (e) {
        responseData = text;
      }
    }
    
    if (!response.ok) {
        const errorText = typeof responseData === 'string' ? responseData : JSON.stringify(responseData);
        const error = `HTTP error! status: ${response.status}, message: ${errorText}`;
        return { data: responseData, status: response.status, error: error };
    }
    
    return { data: responseData, status: response.status };
  } catch (error) {
    console.error('API call failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return { data: { error: errorMessage }, status: 0, error: errorMessage };
  }
};


// --- API METHODS ---

export const dockerControlApi = {
  read_root__get: () => makeRequest(`/`, { method: 'GET' }),

  // Containers
  list_containers_containers_get: (params: { all?: boolean; limit?: number; sparse?: boolean; filters?: string | null }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return makeRequest(`/containers?${query}`, { method: 'GET' });
  },
  create_container_containers_post: (body: CreateContainerInput) => {
    return makeRequest('/containers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  },
  run_container_containers_run_post: (body: CreateContainerInput) => {
    return makeRequest('/containers/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  },
  get_container_containers__container_id__get: (params: { container_id: string }) => {
    return makeRequest(`/containers/${params.container_id}`, { method: 'GET' });
  },
  remove_container_containers__container_id__delete: (params: { container_id: string; force?: boolean }) => {
    const query = new URLSearchParams({ force: String(params.force || false) }).toString();
    return makeRequest(`/containers/${params.container_id}?${query}`, { method: 'DELETE' });
  },
  start_container_containers__container_id__start_post: (params: { container_id: string }) => {
    return makeRequest(`/containers/${params.container_id}/start`, { method: 'POST' });
  },
  stop_container_containers__container_id__stop_post: (params: { container_id: string }) => {
    return makeRequest(`/containers/${params.container_id}/stop`, { method: 'POST' });
  },
  fetch_container_logs_containers__container_id__logs_get: (params: { container_id: string; tail?: number }) => {
    const query = new URLSearchParams({ tail: String(params.tail || 100) }).toString();
    return makeRequest(`/containers/${params.container_id}/logs?${query}`, { method: 'GET' });
  },
  
  // Images
  list_images_images_get: (params: { name?: string | null; all?: boolean; filters?: string | null }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return makeRequest(`/images?${query}`, { method: 'GET' });
  },
  pull_image_images_pull_post: (body: PullPushImageInput) => {
    return makeRequest('/images/pull', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  },
  push_image_images_push_post: (body: PullPushImageInput) => {
    return makeRequest('/images/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  },
  build_image_images_build_post: (body: BuildImageInput) => {
    return makeRequest('/images/build', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  },
  remove_image_images__image_id__delete: (params: { image_id: string; force?: boolean }) => {
    const query = new URLSearchParams({ force: String(params.force || false) }).toString();
    return makeRequest(`/images/${params.image_id}?${query}`, { method: 'DELETE' });
  },

  // Networks
  list_networks_networks_get: (params: { names?: string[] | null; ids?: string[] | null; filters?: string | null }) => {
    const query = new URLSearchParams(params as Record<string, any>).toString();
    return makeRequest(`/networks?${query}`, { method: 'GET' });
  },
  create_network_networks_post: (body: CreateNetworkInput) => {
    return makeRequest('/networks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  },
  remove_network_networks__network_id__delete: (params: { network_id: string }) => {
    return makeRequest(`/networks/${params.network_id}`, { method: 'DELETE' });
  },
  
  // Volumes
  list_volumes_volumes_get: (params: { filters?: string | null }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return makeRequest(`/volumes?${query}`, { method: 'GET' });
  },
  create_volume_volumes_post: (body: CreateVolumeInput) => {
    return makeRequest('/volumes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  },
  remove_volume_volumes__volume_name__delete: (params: { volume_name: string, force?: boolean }) => {
    const query = new URLSearchParams({ force: String(params.force || false) }).toString();
    return makeRequest(`/volumes/${params.volume_name}?${query}`, { method: 'DELETE' });
  },
};

export type ApiServiceKey = keyof typeof dockerControlApi;