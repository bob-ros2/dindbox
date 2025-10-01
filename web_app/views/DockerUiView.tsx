
import React, { useState, useEffect, useCallback } from 'react';
import { dockerControlApi } from '../services/docker-control-api';
import { JsonViewer } from '../components/JsonViewer';
import { View } from '../types';

// --- HELPER & UI COMPONENTS (SELF-CONTAINED) ---

const LoadingSpinner = () => (
    <svg className="animate-spin h-5 w-5 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="http://www.w3.org/2000/svg">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-card rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b border-border pb-3 mb-4">
                    <h3 className="text-xl font-semibold text-card-foreground">{title}</h3>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">&times;</button>
                </div>
                <div className="overflow-y-auto pr-2">
                    {children}
                </div>
            </div>
        </div>
    );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const colorClasses = {
        running: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        exited: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
        created: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    }[status.toLowerCase()] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';

    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorClasses}`}>{status}</span>;
};

const ImageName: React.FC<{ name: string | null | undefined }> = ({ name }) => {
    if (!name || typeof name !== 'string') {
        return <span className="text-muted-foreground">unknown</span>;
    }

    let repo = name;
    let tag: string | null = null;

    const lastColonIndex = name.lastIndexOf(':');
    const lastSlashIndex = name.lastIndexOf('/');

    if (lastColonIndex > -1 && lastColonIndex > lastSlashIndex) {
        repo = name.substring(0, lastColonIndex);
        tag = name.substring(lastColonIndex + 1);
    }

    const lastSlash = repo.lastIndexOf('/');
    const path = lastSlash > -1 ? repo.substring(0, lastSlash + 1) : '';
    const imageName = lastSlash > -1 ? repo.substring(lastSlash + 1) : repo;

    return (
        <div className="inline-flex flex-wrap items-baseline leading-tight">
            {path && <span className="text-muted-foreground mr-1 break-all">{path}</span>}
            <span className="font-medium break-all">{imageName}</span>
            {tag && <span className="text-muted-foreground ml-1 break-keep">:{tag}</span>}
        </div>
    );
};


// --- SUB-VIEWS ---

interface SubViewProps {
    setActiveView: (view: View) => void;
}

const STATUS_UPDATE_INTERVAL = 1500; // ms

// 1. CONTAINERS VIEW
const ContainersView: React.FC<SubViewProps> = ({ setActiveView }) => {
    const [containers, setContainers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [logs, setLogs] = useState<{ id: string; content: string } | null>(null);
    const [inspectionData, setInspectionData] = useState<{ id: string; content: string } | null>(null);

    const fetchContainers = useCallback(async (isInitialLoad = false) => {
        if (isInitialLoad) {
            setIsLoading(true);
            setError(null);
        }
        try {
            const response = await dockerControlApi.list_containers_containers_get({ all: true });
            if (response.error) {
                if (isInitialLoad) throw new Error(response.error);
                else {
                    console.error('Failed to fetch container status update:', response.error);
                    return;
                }
            }
            
            const newContainersData = Array.isArray(response.data) ? response.data : [];
            
            setContainers(prevContainers => {
                if (isInitialLoad || prevContainers.length === 0) {
                    return newContainersData;
                }
                
                // If counts are different, or the set of IDs has changed, take the new list.
                if (newContainersData.length !== prevContainers.length) {
                    return newContainersData;
                }

                const newContainersMap = new Map(newContainersData.map(c => [c.id, c]));
                if (!prevContainers.every(p => newContainersMap.has(p.id))) {
                    return newContainersData;
                }
    
                // If the container set is the same, check for status changes to avoid needless re-renders.
                let hasChanged = false;
                const updatedContainers = prevContainers.map(oldC => {
                    const newC = newContainersMap.get(oldC.id)!; 
                    if (oldC.status !== newC.status) {
                        hasChanged = true;
                        return newC;
                    }
                    return oldC;
                });
    
                return hasChanged ? updatedContainers : prevContainers;
            });
        } catch (e) {
            if (isInitialLoad) {
                setError((e as Error).message);
                setContainers([]);
            } else {
                console.error('Failed to fetch container status update:', e);
            }
        } finally {
            if (isInitialLoad) {
                setIsLoading(false);
            }
        }
    }, []);
    
    useEffect(() => {
        fetchContainers(true); // Initial load
        const intervalId = setInterval(() => fetchContainers(false), STATUS_UPDATE_INTERVAL);
        return () => clearInterval(intervalId);
    }, [fetchContainers]);


    const handleAction = async (action: (params: any) => Promise<any>, params: any) => {
        try {
            const response = await action(params);
            if(response.error) throw new Error(response.error);
            fetchContainers();
        } catch (e) {
            alert(`Action failed: ${(e as Error).message}`);
        }
    };
    
    const handleViewLogs = async (containerId: string) => {
        try {
            const response = await dockerControlApi.fetch_container_logs_containers__container_id__logs_get({ container_id: containerId, tail: 200 });
            if(response.error) throw new Error(response.error);
            setLogs({ id: containerId, content: JSON.stringify(response.data, null, 2) });
        } catch (e) {
             alert(`Failed to fetch logs: ${(e as Error).message}`);
        }
    };

    const handleInspect = async (containerId: string) => {
        try {
            const response = await dockerControlApi.get_container_containers__container_id__get({ container_id: containerId });
            if(response.error) throw new Error(response.error);
            setInspectionData({ id: containerId, content: JSON.stringify(response.data, null, 2) });
        } catch (e) {
             alert(`Failed to inspect container: ${(e as Error).message}`);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Containers</h2>
                <button onClick={() => setActiveView(View.DOCKER_CONTROL)} className="px-3 py-2 font-medium text-sm rounded-md transition-colors bg-primary text-primary-foreground">API</button>
            </div>
            {isLoading && <p>Loading...</p>}
            {error && <p className="text-red-500">{error}</p>}
            
            <div>
                {/* Desktop Table */}
                <div className="hidden md:block bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground">
                            <tr>
                                <th className="p-3">Name</th><th className="p-3">Image</th><th className="p-3">Status</th><th className="p-3">Ports</th><th className="p-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {containers.length === 0 && !isLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-4 text-center text-muted-foreground">No containers found.</td>
                                </tr>
                            ) : containers.map((c, index) => (
                                <tr key={c?.id ?? index} className="border-b border-border last:border-0">
                                    <td className="p-3 font-mono text-xs">{c?.name ?? c?.short_id ?? 'unknown'}</td>
                                    <td className="p-3"><ImageName name={c?.image?.tags?.[0] ?? c?.image?.repo_tags?.[0]} /></td>
                                    <td className="p-3"><StatusBadge status={c?.status ?? 'unknown'} /></td>
                                    <td className="p-3 font-mono text-xs">{Object.keys(c?.ports || {}).join(', ')}</td>
                                    <td className="p-3 space-x-2 whitespace-nowrap">
                                        {c?.status === 'running' 
                                          ? <button disabled={!c?.id} onClick={() => c?.id && handleAction(dockerControlApi.stop_container_containers__container_id__stop_post, { container_id: c.id })} className="text-yellow-500 hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed">Stop</button>
                                          : <button disabled={!c?.id} onClick={() => c?.id && handleAction(dockerControlApi.start_container_containers__container_id__start_post, { container_id: c.id })} className="text-green-500 hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed">Start</button>
                                        }
                                        <button disabled={!c?.id} onClick={() => c?.id && handleViewLogs(c.id)} className="text-blue-500 hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed">Logs</button>
                                        <button disabled={!c?.id} onClick={() => c?.id && handleInspect(c.id)} className="text-purple-500 hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed">Inspect</button>
                                        <button disabled={!c?.id} onClick={() => c?.id && handleAction(dockerControlApi.remove_container_containers__container_id__delete, { container_id: c.id, force: true })} className="text-red-500 hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed">Remove</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card List */}
                <div className="md:hidden space-y-3">
                    {containers.length === 0 && !isLoading ? (
                        <div className="bg-card border border-border rounded-lg p-4 text-center text-muted-foreground">
                            No containers found.
                        </div>
                    ) : containers.map((c, index) => (
                        <div key={c?.id ?? index} className="bg-card border border-border rounded-lg p-4 shadow-sm space-y-2 text-sm">
                            <div className="flex justify-between items-start">
                                <span className="font-semibold text-card-foreground">Name</span>
                                <span className="text-right font-mono">{c?.name ?? c?.short_id ?? 'unknown'}</span>
                            </div>
                            <div className="flex justify-between items-start">
                                <span className="font-semibold text-card-foreground">Image</span>
                                <div className="text-right pl-2">
                                    <ImageName name={c?.image?.tags?.[0] ?? c?.image?.repo_tags?.[0]} />
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="font-semibold text-card-foreground">Status</span>
                                <StatusBadge status={c?.status ?? 'unknown'} />
                            </div>
                            <div className="flex justify-between items-start">
                                <span className="font-semibold text-card-foreground">Ports</span>
                                <span className="text-right font-mono">{Object.keys(c?.ports || {}).join(', ') || '-'}</span>
                            </div>
                            <div className="pt-3 mt-2 border-t border-border flex flex-wrap justify-end items-center gap-x-4 gap-y-2">
                                {c?.status === 'running' 
                                  ? <button disabled={!c?.id} onClick={() => c?.id && handleAction(dockerControlApi.stop_container_containers__container_id__stop_post, { container_id: c.id })} className="text-yellow-500 hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed">Stop</button>
                                  : <button disabled={!c?.id} onClick={() => c?.id && handleAction(dockerControlApi.start_container_containers__container_id__start_post, { container_id: c.id })} className="text-green-500 hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed">Start</button>
                                }
                                <button disabled={!c?.id} onClick={() => c?.id && handleViewLogs(c.id)} className="text-blue-500 hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed">Logs</button>
                                <button disabled={!c?.id} onClick={() => c?.id && handleInspect(c.id)} className="text-purple-500 hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed">Inspect</button>
                                <button disabled={!c?.id} onClick={() => c?.id && handleAction(dockerControlApi.remove_container_containers__container_id__delete, { container_id: c.id, force: true })} className="text-red-500 hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed">Remove</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

             <Modal isOpen={!!logs} onClose={() => setLogs(null)} title={`Logs for ${logs?.id.substring(0,12)}`}>
                 <JsonViewer jsonString={logs?.content || ''} />
            </Modal>
             <Modal isOpen={!!inspectionData} onClose={() => setInspectionData(null)} title={`Inspect: ${inspectionData?.id.substring(0,12)}`}>
                 <JsonViewer jsonString={inspectionData?.content || ''} />
            </Modal>
        </div>
    );
};


// 2. IMAGES VIEW
const ImagesView: React.FC<SubViewProps> = ({ setActiveView }) => {
    const [images, setImages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [inspectionData, setInspectionData] = useState<{ id: string; content: string } | null>(null);

    const fetchImages = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await dockerControlApi.list_images_images_get({});
            if (response.error) throw new Error(response.error);
            setImages(Array.isArray(response.data) ? response.data : []);
        } catch (e) {
            setError((e as Error).message);
            setImages([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchImages();
    }, [fetchImages]);
    
    const handleRemove = async (imageId: string) => {
        if(confirm('Are you sure you want to remove this image?')) {
            const response = await dockerControlApi.remove_image_images__image_id__delete({ image_id: imageId, force: true });
            if (response.error) {
                alert(`Failed to remove image: ${response.error}`);
            }
            fetchImages();
        }
    };

    const handleInspect = (image: any) => {
        setInspectionData({ 
            id: image.id, 
            content: JSON.stringify(image, null, 2) 
        });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Images</h2>
                <button onClick={() => setActiveView(View.DOCKER_CONTROL)} className="px-3 py-2 font-medium text-sm rounded-md transition-colors bg-primary text-primary-foreground">API</button>
            </div>
            {isLoading && <p>Loading...</p>}
            {error && <p className="text-red-500">{error}</p>}
            <div>
                 {/* Desktop Table */}
                <div className="hidden md:block bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground">
                            <tr><th className="p-3">ID</th><th className="p-3">Tags</th><th className="p-3">Size</th><th className="p-3">Actions</th></tr>
                        </thead>
                        <tbody>
                            {images.length === 0 && !isLoading ? (
                                <tr>
                                    <td colSpan={4} className="p-4 text-center text-muted-foreground">No images found.</td>
                                </tr>
                            ) : images.map(img => (
                                <tr key={img.id} className="border-b border-border last:border-0">
                                    <td className="p-3 font-mono text-xs">{(img.short_id || img.id || '').replace('sha256:', '').substring(0, 12)}</td>
                                    <td className="p-3">
                                        {(img.repo_tags || img.tags || []).map((tag: string, i: number) => (
                                            <div key={i}><ImageName name={tag} /></div>
                                        ))}
                                    </td>
                                    <td className="p-3">{(img.size / 1024 / 1024).toFixed(2)} MB</td>
                                    <td className="p-3 space-x-2 whitespace-nowrap">
                                        <button onClick={() => handleInspect(img)} className="text-purple-500 hover:underline">Inspect</button>
                                        <button onClick={() => handleRemove(img.id)} className="text-red-500 hover:underline">Remove</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 {/* Mobile Card List */}
                <div className="md:hidden space-y-3">
                    {images.length === 0 && !isLoading ? (
                        <div className="bg-card border border-border rounded-lg p-4 text-center text-muted-foreground">
                            No images found.
                        </div>
                    ) : images.map(img => (
                        <div key={img.id} className="bg-card border border-border rounded-lg p-4 shadow-sm space-y-2 text-sm">
                            <div className="flex justify-between items-start">
                                <span className="font-semibold text-card-foreground">ID</span>
                                <span className="text-right font-mono">{(img.short_id || img.id || '').replace('sha256:', '').substring(0, 12)}</span>
                            </div>
                            <div className="flex justify-between items-start">
                                <span className="font-semibold text-card-foreground">Tags</span>
                                <div className="text-right pl-2">
                                    {(img.repo_tags || img.tags || []).length > 0 ? 
                                        (img.repo_tags || img.tags || []).map((tag: string, i: number) => (
                                            <div key={i}><ImageName name={tag} /></div>
                                        )) : '-'
                                    }
                                </div>
                            </div>
                            <div className="flex justify-between items-start">
                                <span className="font-semibold text-card-foreground">Size</span>
                                <span className="text-right">{(img.size / 1024 / 1024).toFixed(2)} MB</span>
                            </div>
                            <div className="pt-3 mt-2 border-t border-border flex justify-end items-center space-x-4">
                                <button onClick={() => handleInspect(img)} className="text-purple-500 hover:underline">Inspect</button>
                                <button onClick={() => handleRemove(img.id)} className="text-red-500 hover:underline">Remove</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <Modal isOpen={!!inspectionData} onClose={() => setInspectionData(null)} title={`Inspect Image: ${(inspectionData?.id || '').replace('sha256:', '').substring(0,12)}`}>
                 <JsonViewer jsonString={inspectionData?.content || ''} />
            </Modal>
        </div>
    );
};

// 3. VOLUMES VIEW
const VolumesView: React.FC<SubViewProps> = ({ setActiveView }) => {
    const [volumes, setVolumes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [inspectionData, setInspectionData] = useState<{ id: string; content: string } | null>(null);

    const fetchVolumes = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await dockerControlApi.list_volumes_volumes_get({});
            if (response.error) throw new Error(response.error);
            setVolumes(Array.isArray(response.data) ? response.data : []);
        } catch (e) {
            setError((e as Error).message);
            setVolumes([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchVolumes();
    }, [fetchVolumes]);

    const handleRemove = async (volumeName: string) => {
        if(confirm('Are you sure you want to remove this volume?')) {
            const response = await dockerControlApi.remove_volume_volumes__volume_name__delete({ volume_name: volumeName, force: true });
            if (response.error) {
                alert(`Failed to remove volume: ${response.error}`);
            }
            fetchVolumes();
        }
    };
    
    const handleInspect = async (volumeName: string) => {
        try {
            const filters = JSON.stringify({ name: [volumeName] });
            const response = await dockerControlApi.list_volumes_volumes_get({ filters });
            if (response.error) throw new Error(response.error);
            
            const volumeDetails = response.data?.[0];
            if (volumeDetails) {
                 setInspectionData({ id: volumeName, content: JSON.stringify(volumeDetails, null, 2) });
            } else {
                throw new Error("Volume not found.");
            }
        } catch (e) {
             alert(`Failed to inspect volume: ${(e as Error).message}`);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Volumes</h2>
                <button onClick={() => setActiveView(View.DOCKER_CONTROL)} className="px-3 py-2 font-medium text-sm rounded-md transition-colors bg-primary text-primary-foreground">API</button>
            </div>
            {isLoading && <p>Loading...</p>}
            {error && <p className="text-red-500">{error}</p>}
            <div>
                 {/* Desktop Table */}
                <div className="hidden md:block bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground">
                            <tr><th className="p-3">Name</th><th className="p-3">Driver</th><th className="p-3">Actions</th></tr>
                        </thead>
                        <tbody>
                            {volumes.length === 0 && !isLoading ? (
                                <tr>
                                    <td colSpan={3} className="p-4 text-center text-muted-foreground">No volumes found.</td>
                                </tr>
                            ) : volumes.map(vol => (
                                <tr key={vol.name} className="border-b border-border last:border-0">
                                    <td className="p-3">{vol.name}</td>
                                    <td className="p-3">{vol.driver}</td>
                                    <td className="p-3 space-x-2 whitespace-nowrap">
                                        <button onClick={() => handleInspect(vol.name)} className="text-purple-500 hover:underline">Inspect</button>
                                        <button onClick={() => handleRemove(vol.name)} className="text-red-500 hover:underline">Remove</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card List */}
                <div className="md:hidden space-y-3">
                    {volumes.length === 0 && !isLoading ? (
                        <div className="bg-card border border-border rounded-lg p-4 text-center text-muted-foreground">
                            No volumes found.
                        </div>
                    ) : volumes.map(vol => (
                        <div key={vol.name} className="bg-card border border-border rounded-lg p-4 shadow-sm space-y-2 text-sm">
                            <div className="flex justify-between items-start">
                                <span className="font-semibold text-card-foreground">Name</span>
                                <span className="text-right">{vol.name}</span>
                            </div>
                            <div className="flex justify-between items-start">
                                <span className="font-semibold text-card-foreground">Driver</span>
                                <span className="text-right">{vol.driver}</span>
                            </div>
                            <div className="pt-3 mt-2 border-t border-border flex justify-end items-center space-x-4">
                                <button onClick={() => handleInspect(vol.name)} className="text-purple-500 hover:underline">Inspect</button>
                                <button onClick={() => handleRemove(vol.name)} className="text-red-500 hover:underline">Remove</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
             <Modal isOpen={!!inspectionData} onClose={() => setInspectionData(null)} title={`Inspect Volume: ${inspectionData?.id}`}>
                 <JsonViewer jsonString={inspectionData?.content || ''} />
            </Modal>
        </div>
    );
};


// 4. NETWORKS VIEW
const NetworksView: React.FC<SubViewProps> = ({ setActiveView }) => {
    const [networks, setNetworks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [inspectionData, setInspectionData] = useState<{ id: string; content: string } | null>(null);

    const fetchNetworks = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await dockerControlApi.list_networks_networks_get({});
            if (response.error) throw new Error(response.error);
            setNetworks(Array.isArray(response.data) ? response.data : []);
        } catch (e) {
            setError((e as Error).message);
            setNetworks([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNetworks();
    }, [fetchNetworks]);
    
    const handleRemove = async (networkId: string) => {
        if(confirm('Are you sure you want to remove this network?')) {
            const response = await dockerControlApi.remove_network_networks__network_id__delete({ network_id: networkId });
            if (response.error) {
                alert(`Failed to remove network: ${response.error}`);
            }
            fetchNetworks();
        }
    };
    
    const handleInspect = async (networkId: string) => {
        try {
            const response = await dockerControlApi.list_networks_networks_get({ ids: [networkId] });
            if(response.error) throw new Error(response.error);
            // The API returns an array, even when filtering by a single ID
            const networkDetails = response.data?.[0];
            if (networkDetails) {
                 setInspectionData({ id: networkId, content: JSON.stringify(networkDetails, null, 2) });
            } else {
                throw new Error("Network not found.");
            }
        } catch (e) {
             alert(`Failed to inspect network: ${(e as Error).message}`);
        }
    };


    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Networks</h2>
                <button onClick={() => setActiveView(View.DOCKER_CONTROL)} className="px-3 py-2 font-medium text-sm rounded-md transition-colors bg-primary text-primary-foreground">API</button>
            </div>
            {isLoading && <p>Loading...</p>}
            {error && <p className="text-red-500">{error}</p>}
            <div>
                {/* Desktop Table */}
                <div className="hidden md:block bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground">
                            <tr><th className="p-3">ID</th><th className="p-3">Name</th><th className="p-3">Driver</th><th className="p-3">Scope</th><th className="p-3">Actions</th></tr>
                        </thead>
                        <tbody>
                            {networks.length === 0 && !isLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-4 text-center text-muted-foreground">No networks found.</td>
                                </tr>
                            ) : networks.map(net => (
                                <tr key={net.id} className="border-b border-border last:border-0">
                                    <td className="p-3 font-mono text-xs">{net.short_id}</td>
                                    <td className="p-3">{net.name}</td>
                                    <td className="p-3">{net.driver}</td>
                                    <td className="p-3">{net.scope}</td>
                                    <td className="p-3 space-x-2 whitespace-nowrap">
                                        <button onClick={() => handleInspect(net.id)} className="text-purple-500 hover:underline">Inspect</button>
                                        <button onClick={() => handleRemove(net.id)} className="text-red-500 hover:underline">Remove</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Mobile Card List */}
                <div className="md:hidden space-y-3">
                    {networks.length === 0 && !isLoading ? (
                         <div className="bg-card border border-border rounded-lg p-4 text-center text-muted-foreground">
                            No networks found.
                        </div>
                    ) : networks.map(net => (
                         <div key={net.id} className="bg-card border border-border rounded-lg p-4 shadow-sm space-y-2 text-sm">
                            <div className="flex justify-between items-start">
                                <span className="font-semibold text-card-foreground">ID</span>
                                <span className="text-right font-mono">{net.short_id}</span>
                            </div>
                            <div className="flex justify-between items-start">
                                <span className="font-semibold text-card-foreground">Name</span>
                                <span className="text-right">{net.name}</span>
                            </div>
                             <div className="flex justify-between items-start">
                                <span className="font-semibold text-card-foreground">Driver</span>
                                <span className="text-right">{net.driver}</span>
                            </div>
                             <div className="flex justify-between items-start">
                                <span className="font-semibold text-card-foreground">Scope</span>
                                <span className="text-right">{net.scope}</span>
                            </div>
                            <div className="pt-3 mt-2 border-t border-border flex justify-end items-center space-x-4">
                                <button onClick={() => handleInspect(net.id)} className="text-purple-500 hover:underline">Inspect</button>
                                <button onClick={() => handleRemove(net.id)} className="text-red-500 hover:underline">Remove</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            <Modal isOpen={!!inspectionData} onClose={() => setInspectionData(null)} title={`Inspect Network: ${inspectionData?.id.substring(0,12)}`}>
                 <JsonViewer jsonString={inspectionData?.content || ''} />
            </Modal>
        </div>
    );
};


// --- MAIN VIEW COMPONENT ---

interface DockerUiViewProps {
    initialSubViewId: string;
    setActiveView: (view: View) => void;
}

const SUB_VIEWS: { id: string; label: string; component: React.FC<SubViewProps> }[] = [
    { id: 'containers', label: 'Containers', component: ContainersView },
    { id: 'images', label: 'Images', component: ImagesView },
    { id: 'volumes', label: 'Volumes', component: VolumesView },
    { id: 'networks', label: 'Networks', component: NetworksView },
];

export const DockerUiView: React.FC<DockerUiViewProps> = ({ initialSubViewId, setActiveView }) => {
    const [activeSubViewId, setActiveSubViewId] = useState(initialSubViewId);

    useEffect(() => {
        setActiveSubViewId(initialSubViewId);
    }, [initialSubViewId]);

    const ActiveComponent = SUB_VIEWS.find(v => v.id === activeSubViewId)?.component || ContainersView;

    return (
        <div className="h-full flex flex-col">
            <div className="mb-4">
                <nav className="flex flex-wrap gap-2">
                    {SUB_VIEWS.map(view => (
                        <button
                            key={view.id}
                            onClick={() => setActiveSubViewId(view.id)}
                            className={`px-3 py-2 font-medium text-sm rounded-md transition-colors ${activeSubViewId === view.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
                        >
                            {view.label}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="flex-grow">
                <ActiveComponent setActiveView={setActiveView} />
            </div>
        </div>
    );
};
