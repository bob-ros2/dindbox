import React from 'react';
// FIX: Import `ApiOperation` to fix 'Cannot find name' errors.
import { View, MenuItem, ApiOperation, SubMenuItem } from './types';

// --- ICONS ---
const TerminalIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
    </svg>
);

const LayersIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.84l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.84Z"/><path d="m22 17.65-8.58 3.9a2 2 0 0 1-1.66 0L3.2 17.65a1 1 0 0 1 0-1.84l8.58-3.91a2 2 0 0 1 1.66 0l8.58 3.91a1 1 0 0 1 0 1.84Z"/><path d="m22 12.65-8.58 3.9a2 2 0 0 1-1.66 0L3.2 12.65a1 1 0 0 1 0-1.84L11.78 7a2 2 0 0 1 1.66 0l8.58 3.9a1 1 0 0 1 0 1.84Z"/></svg>
);

// --- MENU ITEMS ---
export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'MANAGE',
    text: 'Manage',
    icon: <LayersIcon />,
    view: View.DOCKER_UI,
  },
  {
    id: View.DOCKER_CONTROL,
    text: 'Docker API',
    icon: <TerminalIcon />,
    view: View.DOCKER_CONTROL,
  },
];


// --- SWAGGER/OPENAPI DATA ---
const SWAGGER_DATA = {
    "openapi":"3.1.0","info":{"title":"Docker API Server","version":"0.1.0"},
    "paths":{
        "/":{"get":{"summary":"Read Root","operationId":"read_root__get", "tags": ["General"]}},
        "/containers":{"get":{"tags":["Containers"],"summary":"List Containers","operationId":"list_containers_containers_get","parameters":[{"name":"all","in":"query","required":false,"schema":{"type":"boolean","default":false,"title":"All"}},{"name":"limit","in":"query","required":false,"schema":{"type":"integer","default":-1,"title":"Limit"}},{"name":"sparse","in":"query","required":false,"schema":{"type":"boolean","default":false,"title":"Sparse"}},{"name":"filters","in":"query","required":false,"schema":{"anyOf":[{"type":"string"},{"type":"null"}],"description":"JSON-encoded dictionary of filters. E.g., `{\"status\": \"running\"}`","title":"Filters"}}]},"post":{"tags":["Containers"],"summary":"Create Container","operationId":"create_container_containers_post","requestBody":{"required":true,"content":{"application/json":{"schema":{"$ref":"#/components/schemas/CreateContainerInput"}}}}}},
        "/containers/run":{"post":{"tags":["Containers"],"summary":"Run Container","operationId":"run_container_containers_run_post","requestBody":{"content":{"application/json":{"schema":{"$ref":"#/components/schemas/CreateContainerInput"}}},"required":true}}},
        "/containers/{container_id}":{"get":{"tags":["Containers"],"summary":"Get Container","operationId":"get_container_containers__container_id__get","parameters":[{"name":"container_id","in":"path","required":true,"schema":{"type":"string","title":"Container Id"}}]},"delete":{"tags":["Containers"],"summary":"Remove Container","operationId":"remove_container_containers__container_id__delete","parameters":[{"name":"container_id","in":"path","required":true,"schema":{"type":"string","title":"Container Id"}},{"name":"force","in":"query","required":false,"schema":{"type":"boolean","default":false,"title":"Force"}}]}},
        "/containers/{container_id}/start":{"post":{"tags":["Containers"],"summary":"Start Container","operationId":"start_container_containers__container_id__start_post","parameters":[{"name":"container_id","in":"path","required":true,"schema":{"type":"string","title":"Container Id"}}]}},
        "/containers/{container_id}/stop":{"post":{"tags":["Containers"],"summary":"Stop Container","operationId":"stop_container_containers__container_id__stop_post","parameters":[{"name":"container_id","in":"path","required":true,"schema":{"type":"string","title":"Container Id"}}]}},
        "/containers/{container_id}/logs":{"get":{"tags":["Containers"],"summary":"Fetch Container Logs","operationId":"fetch_container_logs_containers__container_id__logs_get","parameters":[{"name":"container_id","in":"path","required":true,"schema":{"type":"string","title":"Container Id"}},{"name":"tail","in":"query","required":false,"schema":{"type":"integer","default":100,"title":"Tail"}}]}},
        "/images":{"get":{"tags":["Images"],"summary":"List Images","operationId":"list_images_images_get","parameters":[{"name":"name","in":"query","required":false,"schema":{"anyOf":[{"type":"string"},{"type":"null"}],"title":"Name"}},{"name":"all","in":"query","required":false,"schema":{"type":"boolean","default":false,"title":"All"}},{"name":"filters","in":"query","required":false,"schema":{"anyOf":[{"type":"string"},{"type":"null"}],"description":"JSON-encoded dictionary of filters. E.g., `{\"dangling\": \"true\"}`","title":"Filters"}}]}},
        "/images/pull":{"post":{"tags":["Images"],"summary":"Pull Image","operationId":"pull_image_images_pull_post","requestBody":{"content":{"application/json":{"schema":{"$ref":"#/components/schemas/PullPushImageInput"}}},"required":true}}},
        "/images/push":{"post":{"tags":["Images"],"summary":"Push Image","operationId":"push_image_images_push_post","requestBody":{"content":{"application/json":{"schema":{"$ref":"#/components/schemas/PullPushImageInput"}}},"required":true}}},
        "/images/build":{"post":{"tags":["Images"],"summary":"Build Image","operationId":"build_image_images_build_post","requestBody":{"content":{"application/json":{"schema":{"$ref":"#/components/schemas/BuildImageInput"}}},"required":true}}},
        "/images/{image_id}":{"delete":{"tags":["Images"],"summary":"Remove Image","operationId":"remove_image_images__image_id__delete","parameters":[{"name":"image_id","in":"path","required":true,"schema":{"type":"string","title":"Image Id"}},{"name":"force","in":"query","required":false,"schema":{"type":"boolean","default":false,"title":"Force"}}]}},
        "/networks":{"get":{"tags":["Networks"],"summary":"List Networks","operationId":"list_networks_networks_get","parameters":[{"name":"names","in":"query","required":false,"schema":{"anyOf":[{"type":"array","items":{"type":"string"}},{"type":"null"}],"description":"List of network names to filter by.","title":"Names"}},{"name":"ids","in":"query","required":false,"schema":{"anyOf":[{"type":"array","items":{"type":"string"}},{"type":"null"}],"description":"List of network IDs to filter by.","title":"Ids"}},{"name":"filters","in":"query","required":false,"schema":{"anyOf":[{"type":"string"},{"type":"null"}],"description":"JSON-encoded dictionary of filters. E.g., `{\"driver\": \"bridge\"}`","title":"Filters"}}]},"post":{"tags":["Networks"],"summary":"Create Network","operationId":"create_network_networks_post","requestBody":{"required":true,"content":{"application/json":{"schema":{"$ref":"#/components/schemas/CreateNetworkInput"}}}}}},
        "/networks/{network_id}":{"delete":{"tags":["Networks"],"summary":"Remove Network","operationId":"remove_network_networks__network_id__delete","parameters":[{"name":"network_id","in":"path","required":true,"schema":{"type":"string","title":"Network Id"}}]}},
        "/volumes":{"get":{"tags":["Volumes"],"summary":"List Volumes","operationId":"list_volumes_volumes_get","parameters":[{"name":"filters","in":"query","required":false,"schema":{"anyOf":[{"type":"string"},{"type":"null"}],"description":"JSON-encoded dictionary of filters. E.g., `{\"dangling\": \"true\"}`","title":"Filters"}}]},"post":{"tags":["Volumes"],"summary":"Create Volume","operationId":"create_volume_volumes_post","requestBody":{"required":true,"content":{"application/json":{"schema":{"$ref":"#/components/schemas/CreateVolumeInput"}}}}}},
        "/volumes/{volume_name}":{"delete":{"tags":["Volumes"],"summary":"Remove Volume","operationId":"remove_volume_volumes__volume_name__delete","parameters":[{"name":"volume_name","in":"path","required":true,"schema":{"type":"string","title":"Volume Name"}},{"name":"force","in":"query","required":false,"schema":{"type":"boolean","default":false,"title":"Force"}}]}}
    },
    "components":{"schemas":{"BuildImageInput":{"properties":{"path":{"type":"string","title":"Path","description":"Path to build context"},"tag":{"type":"string","title":"Tag","description":"Image tag"},"dockerfile":{"anyOf":[{"type":"string"},{"type":"null"}],"title":"Dockerfile","description":"Path to Dockerfile"}},"type":"object","required":["path","tag"],"title":"BuildImageInput"},"CreateContainerInput":{"properties":{"detach":{"type":"boolean","title":"Detach","description":"Run container in the background. Should be True for long-running containers, can be false for short-lived containers","default":true},"image":{"type":"string","title":"Image","description":"Docker image name"},"name":{"anyOf":[{"type":"string"},{"type":"null"}],"title":"Name","description":"Container name"},"entrypoint":{"anyOf":[{"type":"string"},{"type":"null"}],"title":"Entrypoint","description":"Entrypoint to run in container"},"command":{"anyOf":[{"type":"string"},{"type":"null"}],"title":"Command","description":"Command to run in container"},"network":{"anyOf":[{"type":"string"},{"type":"null"}],"title":"Network","description":"Network to attach the container to"},"environment":{"anyOf":[{"additionalProperties":{"type":"string"},"type":"object"},{"type":"null"}],"title":"Environment","description":"Environment variables dictionary"},"ports":{"anyOf":[{"additionalProperties":{"anyOf":[{"type":"integer"},{"items":{"type":"integer"},"type":"array"},{"prefixItems":[{"type":"string"},{"type":"integer"}],"type":"array","maxItems":2,"minItems":2},{"type":"null"}]},"type":"object"},{"type":"null"}],"title":"Ports","description":"A map whose keys are the container port, and the values are the host port(s) to bind to."},"volumes":{"anyOf":[{"additionalProperties":{"additionalProperties":{"type":"string"},"type":"object"},"type":"object"},{"items":{"type":"string"},"type":"array"},{"type":"null"}],"title":"Volumes","description":"Volume mappings"},"labels":{"anyOf":[{"additionalProperties":{"type":"string"},"type":"object"},{"items":{"type":"string"},"type":"array"},{"type":"null"}],"title":"Labels","description":"Container labels, either as a dictionary or a list of key=value strings"},"auto_remove":{"type":"boolean","title":"Auto Remove","description":"Automatically remove the container","default":false}},"type":"object","required":["image"],"title":"CreateContainerInput","description":"Schema for creating a new container.\n\nThis is passed to the Python Docker SDK directly, so the fields are the same\nas the `docker.containers.create` method."},"CreateNetworkInput":{"properties":{"name":{"type":"string","title":"Name","description":"Network name"},"driver":{"anyOf":[{"type":"string"},{"type":"null"}],"title":"Driver","description":"Network driver","default":"bridge"},"internal":{"type":"boolean","title":"Internal","description":"Create an internal network","default":false},"labels":{"anyOf":[{"additionalProperties":{"type":"string"},"type":"object"},{"type":"null"}],"title":"Labels","description":"Network labels"}},"type":"object","required":["name"],"title":"CreateNetworkInput"},"CreateVolumeInput":{"properties":{"name":{"type":"string","title":"Name","description":"Volume name"},"driver":{"anyOf":[{"type":"string"},{"type":"null"}],"title":"Driver","description":"Volume driver","default":"local"},"labels":{"anyOf":[{"additionalProperties":{"type":"string"},"type":"object"},{"type":"null"}],"title":"Labels","description":"Volume labels"}},"type":"object","required":["name"],"title":"CreateVolumeInput"},"HTTPValidationError":{"properties":{"detail":{"items":{"$ref":"#/components/schemas/ValidationError"},"type":"array","title":"Detail"}},"type":"object","title":"HTTPValidationError"},"PullPushImageInput":{"properties":{"repository":{"type":"string","title":"Repository","description":"Image repository"},"tag":{"anyOf":[{"type":"string"},{"type":"null"}],"title":"Tag","description":"Image tag","default":"latest"}},"type":"object","required":["repository"],"title":"PullPushImageInput"},"ValidationError":{"properties":{"loc":{"items":{"anyOf":[{"type":"string"},{"type":"integer"}]},"type":"array","title":"Location"},"msg":{"type":"string","title":"Message"},"type":{"type":"string","title":"Error Type"}},"type":"object","required":["loc","msg","type"],"title":"ValidationError"}}}
};

// --- PROCESSED API DATA ---
export const API_OPERATIONS: ApiOperation[] = Object.entries(SWAGGER_DATA.paths).flatMap(([path, methods]) => {
    return Object.entries(methods).map(([method, details]) => {
        const op = details as any;
        return {
            id: op.operationId,
            summary: op.summary,
            method: method as ApiOperation['method'],
            path,
            parameters: op.parameters || [],
            requestBody: op.requestBody,
            tags: op.tags || ['General'],
        };
    });
});

export const API_SCHEMAS: any = (SWAGGER_DATA.components.schemas as any);
