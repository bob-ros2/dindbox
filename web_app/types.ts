
import type { ReactNode } from 'react';

export enum View {
  DOCKER_CONTROL = 'DOCKER_CONTROL',
  DOCKER_UI = 'DOCKER_UI',
}

export interface SubMenuItem {
  id: string; // e.g., 'containers'
  text: string;
}

export interface MenuItem {
  id: View | string;
  text: string;
  // FIX: Use ReactNode to solve "Cannot find namespace 'JSX'" error.
  icon: ReactNode;
  view?: View;
  children?: SubMenuItem[];
}

export interface ApiParameter {
  name: string;
  in: 'query' | 'path' | 'header';
  required?: boolean;
  schema: {
    type?: string | string[];
    default?: any;
    anyOf?: any[];
    title?: string;
    description?: string;
  };
}

export interface ApiRequestBody {
    required?: boolean;
    content: {
        'application/json': {
            schema: {
                $ref: string;
            };
        };
    };
}

export interface ApiOperation {
  id: string;
  summary: string;
  method: 'get' | 'post' | 'delete' | 'put';
  path: string;
  parameters: ApiParameter[];
  requestBody?: ApiRequestBody;
  tags?: string[];
}

export interface ApiSchema {
    [key: string]: {
        properties: {
            [key: string]: {
                type?: string | string[];
                title?: string;
                default?: any;
                anyOf?: any[];
                description?: string;
            };
        };
        required?: string[];
    };
}
