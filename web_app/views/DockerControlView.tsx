import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { API_OPERATIONS, API_SCHEMAS } from '../constants';
import { dockerControlApi, ApiServiceKey } from '../services/docker-control-api';
import { JsonViewer } from '../components/JsonViewer';
import { ApiOperation, ApiParameter } from '../types';

const groupOperationsByTag = (operations: ApiOperation[]) => {
  const groups: Record<string, ApiOperation[]> = {};
  operations.forEach(op => {
    const tag = op.tags?.[0] || 'General';
    if (!groups[tag]) {
      groups[tag] = [];
    }
    groups[tag].push(op);
  });
  return groups;
};

const HTTP_STATUS_CODES: Record<number, string> = {
    0: 'Network Error',
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    422: 'Validation Error',
    500: 'Internal Server Error',
};


export const DockerControlView: React.FC = () => {
  const [selectedServiceId, setSelectedServiceId] = useState<string>(API_OPERATIONS[0].id);
  const [formState, setFormState] = useState<Record<string, any>>({});
  const [response, setResponse] = useState<string>('');
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const selectedService: ApiOperation | undefined = API_OPERATIONS.find(op => op.id === selectedServiceId);
  const groupedOperations = useMemo(() => groupOperationsByTag(API_OPERATIONS), [API_OPERATIONS]);

  useEffect(() => {
    setFormState({});
    setResponse('');
    setResponseStatus(null);
  }, [selectedServiceId]);

  const handleInputChange = (name: string, value: string, type: string = 'text') => {
    let finalValue: any = value;
    if (type === 'boolean') {
      finalValue = value === 'true';
    } else if (type === 'integer' || type === 'number') {
      // Don't convert to number immediately, as user might be typing
      finalValue = value;
    }
    setFormState(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleCallApi = useCallback(async () => {
    if (!selectedService) return;
    setIsLoading(true);
    setResponse('');
    setResponseStatus(null);
    
    const apiFunction = dockerControlApi[selectedService.id as ApiServiceKey];
    if (typeof apiFunction !== 'function') {
      setResponse(JSON.stringify({ error: `API function for ${selectedService.id} not found.` }, null, 2));
      setResponseStatus(500);
      setIsLoading(false);
      return;
    }
    
    try {
        let params: Record<string, any> = {};
        let body: Record<string, any> | undefined = undefined;
        let finalFormState = { ...formState };

        // Pre-process and parse JSON strings from textareas
        const allParams = selectedService.parameters;
        if(selectedService.requestBody) {
             const ref = selectedService.requestBody.content['application/json'].schema.$ref;
             const schemaName = ref.split('/').pop() || '';
             const schema = API_SCHEMAS[schemaName];
             if(schema && schema.properties) {
                // FIX: Cast propSchema to a known type to avoid errors when accessing its properties like 'type' and 'anyOf'.
                Object.entries(schema.properties).forEach(([name, propSchemaUntyped]) => {
                     const propSchema = propSchemaUntyped as ApiParameter['schema'];
                     const types = Array.isArray(propSchema.type) ? propSchema.type : [propSchema.type];
                     if ((types.includes('object') || types.includes('array') || propSchema.anyOf?.some(t => t.type === 'object' || t.type === 'array')) && typeof finalFormState[name] === 'string' && finalFormState[name]) {
                        try {
                           finalFormState[name] = JSON.parse(finalFormState[name]);
                        } catch (e) {
                           throw new Error(`Invalid JSON in field '${name}': ${(e as Error).message}`);
                        }
                     }
                });
             }
        }
        allParams.forEach(p => {
            const types = Array.isArray(p.schema.type) ? p.schema.type : [p.schema.type];
             if ((types.includes('object') || types.includes('array') || p.schema.anyOf?.some(t => t.type === 'object' || t.type === 'array')) && typeof finalFormState[p.name] === 'string' && finalFormState[p.name]) {
                try {
                    finalFormState[p.name] = JSON.parse(finalFormState[p.name]);
                } catch (e) {
                    throw new Error(`Invalid JSON in field '${p.name}': ${(e as Error).message}`);
                }
            }
        });

        if (selectedService.requestBody) {
            body = {};
            const ref = selectedService.requestBody.content['application/json'].schema.$ref;
            const schemaName = ref.split('/').pop() || '';
            const schema = API_SCHEMAS[schemaName];
            if (schema && schema.properties) {
                Object.keys(schema.properties).forEach(propName => {
                    const value = finalFormState[propName];
                    if (value !== undefined && value !== '') {
                        body![propName] = value;
                    }
                });
            }
        }
        
        selectedService.parameters.forEach(param => {
            const value = finalFormState[param.name];
            if (value !== undefined && value !== '') {
                params[param.name] = param.schema.type === 'integer' ? Number(value) : value;
            }
        });

        const result = body ? await apiFunction(body as any) : await apiFunction(params as any);
        setResponse(JSON.stringify(result.data, null, 2));
        setResponseStatus(result.status);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        setResponse(JSON.stringify({ error: 'Form parsing or API call failed', details: errorMessage }, null, 2));
        setResponseStatus(400); // Assume form error is a bad request
    } finally {
        setIsLoading(false);
    }
  }, [selectedService, formState]);
  
  const renderInputField = (name: string, schema: ApiParameter['schema'], isRequired?: boolean) => {
    const title = schema.title || name;
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const hasObjectOrArray = types.includes('object') || types.includes('array') || schema.anyOf?.some(t => t.type === 'object' || t.type === 'array');
    const baseInputClasses = "w-full bg-input border border-border rounded-md p-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

    if (hasObjectOrArray || (schema.description && schema.description.toLowerCase().includes('json-encoded'))) {
        return (
             <textarea
                name={name}
                id={name}
                placeholder={`Enter JSON for ${title}${isRequired ? ' *' : ''}`}
                value={formState[name] ?? ''}
                onChange={(e) => handleInputChange(name, e.target.value, 'json')}
                className={`${baseInputClasses} h-32 font-mono text-sm`}
            />
        )
    }

    if (types.includes('boolean')) {
        return (
            <select
                name={name}
                id={name}
                value={formState[name] ?? schema.default ?? 'false'}
                onChange={(e) => handleInputChange(name, e.target.value, 'boolean')}
                className={baseInputClasses}
            >
                <option value="true">true</option>
                <option value="false">false</option>
            </select>
        );
    }
    
    const inputType = types.includes('integer') ? 'number' : 'text';

    return (
        <input
            type={inputType}
            name={name}
            id={name}
            placeholder={`${title}${isRequired ? ' *' : ''}`}
            defaultValue={schema.default}
            value={formState[name] ?? ''}
            onChange={(e) => handleInputChange(name, e.target.value, schema.type as string)}
            className={baseInputClasses}
        />
    );
  }

  const renderForm = () => {
    if (!selectedService) return null;

    const pathParams = selectedService.parameters.filter(p => p.in === 'path');
    const queryParams = selectedService.parameters.filter(p => p.in === 'query');
    
    let bodyFields: JSX.Element[] = [];
    if (selectedService.requestBody) {
        const ref = selectedService.requestBody.content['application/json'].schema.$ref;
        const schemaName = ref.split('/').pop() || '';
        const schema = API_SCHEMAS[schemaName];
        if (schema && schema.properties) {
            // FIX: Cast propSchema to a known type to avoid errors when accessing properties like 'title' and 'description'.
            bodyFields = Object.entries(schema.properties).map(([name, propSchemaUntyped]) => {
                const propSchema = propSchemaUntyped as ApiParameter['schema'];
                return (
                    <div key={name} className="mb-4">
                        <label htmlFor={name} className="block text-sm font-medium text-foreground mb-1">{propSchema.title || name} {schema.required?.includes(name) ? '*' : ''}</label>
                         {propSchema.description && <p className="text-xs text-muted-foreground mb-1">{propSchema.description}</p>}
                        {renderInputField(name, propSchema, schema.required?.includes(name))}
                    </div>
                );
            });
        }
    }

    return (
      <div className="space-y-6">
        {[...pathParams, ...queryParams].map(param => (
            <div key={param.name} className="mb-4">
                <label htmlFor={param.name} className="block text-sm font-medium text-foreground mb-1">{param.schema.title || param.name} ({param.in}) {param.required ? '*' : ''}</label>
                {param.schema.description && <p className="text-xs text-muted-foreground mb-1">{param.schema.description}</p>}
                {renderInputField(param.name, param.schema, param.required)}
            </div>
        ))}
        {bodyFields.length > 0 && <div><h3 className="text-lg font-semibold mb-2 border-b border-border pb-1">Request Body</h3>{bodyFields}</div>}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      <div className="bg-card text-card-foreground border border-border p-6 rounded-lg shadow-lg flex flex-col">
        <h1 className="text-3xl font-bold mb-6">Docker API</h1>
        <div className="mb-6">
          <label htmlFor="service-select" className="block text-sm font-medium mb-1">Select an Operation</label>
          <div className="flex items-center gap-2">
            <select
                id="service-select"
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="flex-grow bg-input border border-border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-ring"
            >
            {Object.entries(groupedOperations).map(([tag, operations]) => (
                <optgroup key={tag} label={tag}>
                    {operations.map(op => (
                    <option key={op.id} value={op.id}>{op.summary}</option>
                    ))}
                </optgroup>
                ))}
            </select>
            <button
                onClick={handleCallApi}
                disabled={isLoading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-4 rounded-md transition-colors duration-200 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
            >
                Call
            </button>
          </div>
        </div>
        <div className="flex-grow overflow-y-auto pr-2">
            {renderForm()}
        </div>
        <div className="mt-6">
             <button
                onClick={handleCallApi}
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-4 rounded-md transition-colors duration-200 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed flex items-center justify-center"
            >
                {isLoading && (
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                )}
                {isLoading ? 'Calling...' : 'Call API'}
            </button>
        </div>
      </div>
      <div className="bg-card text-card-foreground border border-border p-6 rounded-lg shadow-lg flex flex-col">
        <div className="flex justify-between items-baseline mb-4">
            <h2 className="text-2xl font-bold">Response</h2>
            {responseStatus !== null && (
                <span className={`text-xs px-2 py-0.5 rounded-md font-mono ${
                    (responseStatus >= 200 && responseStatus < 300) || responseStatus === 0
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                }`}>
                    {responseStatus} {HTTP_STATUS_CODES[responseStatus] || ''}
                </span>
            )}
        </div>
        <div className="flex-grow overflow-y-auto">
          {response ? <JsonViewer jsonString={response} /> : <div className="text-muted-foreground">API response will appear here.</div>}
        </div>
      </div>
    </div>
  );
};