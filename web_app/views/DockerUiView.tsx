
import React, { useState, useEffect, useCallback } from 'react';
import { dockerControlApi, CreateContainerInput, PullPushImageInput, BuildImageInput, CreateNetworkInput, CreateVolumeInput } from '../services/docker-control-api';
import { JsonViewer } from '../components/JsonViewer';

// --- HELPER & UI COMPONENTS (SELF-CONTAINED) ---

const LoadingSpinner = () => (
    <svg className="animate-spin h-5 w-5 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

// --- SUB-VIEWS ---

// 1. CONTAINERS VIEW
const ContainersView: React.FC = () => {
    const [containers, setContainers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [logs, setLogs] = useState<{ id: string; content: string } | null>(null);

    const fetchContainers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await dockerControlApi.list_containers_containers_get({ all: true });
            if (response.error) throw new Error(response.error);
            const result = response.data;
            // FIX: Ensure result is an array before setting state to prevent crashes.
            setContainers(Array.isArray(result) ? result : []);
        } catch (e) {
            setError((e as Error).message);
            setContainers([]); // Also clear on error to be safe
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchContainers();
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
    
    const handleCreateContainer = async (data: CreateContainerInput) => {
        await handleAction(dockerControlApi.create_container_containers_post, data);
        setCreateModalOpen(false);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Containers</h2>
                <button onClick={() => setCreateModalOpen(true)} className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90">Create Container</button>
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
                                    <td className="p-3">{c?.image?.tags?.[0] ?? c?.image?.repo_tags?.[0] ?? 'unknown'}</td>
                                    <td className="p-3"><StatusBadge status={c?.status ?? 'unknown'} /></td>
                                    <td className="p-3 font-mono text-xs">{Object.keys(c?.ports || {}).join(', ')}</td>
                                    <td className="p-3 space-x-2">
                                        {c?.status === 'running' 
                                          ? <button disabled={!c?.id} onClick={() => c?.id && handleAction(dockerControlApi.stop_container_containers__container_id__stop_post, { container_id: c.id })} className="text-yellow-500 hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed">Stop</button>
                                          : <button disabled={!c?.id} onClick={() => c?.id && handleAction(dockerControlApi.start_container_containers__container_id__start_post, { container_id: c.id })} className="text-green-500 hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed">Start</button>
                                        }
                                        <button disabled={!c?.id} onClick={() => c?.id && handleViewLogs(c.id)} className="text-blue-500 hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed">Logs</button>
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
                                <span className="text-right">{c?.image?.tags?.[0] ?? c?.image?.repo_tags?.[0] ?? 'unknown'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="font-semibold text-card-foreground">Status</span>
                                <StatusBadge status={c?.status ?? 'unknown'} />
                            </div>
                            <div className="flex justify-between items-start">
                                <span className="font-semibold text-card-foreground">Ports</span>
                                <span className="text-right font-mono">{Object.keys(c?.ports || {}).join(', ') || '-'}</span>
                            </div>
                            <div className="pt-3 mt-2 border-t border-border flex justify-end items-center space-x-4">
                                {c?.status === 'running' 
                                  ? <button disabled={!c?.id} onClick={() => c?.id && handleAction(dockerControlApi.stop_container_containers__container_id__stop_post, { container_id: c.id })} className="text-yellow-500 hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed">Stop</button>
                                  : <button disabled={!c?.id} onClick={() => c?.id && handleAction(dockerControlApi.start_container_containers__container_id__start_post, { container_id: c.id })} className="text-green-500 hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed">Start</button>
                                }
                                <button disabled={!c?.id} onClick={() => c?.id && handleViewLogs(c.id)} className="text-blue-500 hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed">Logs</button>
                                <button disabled={!c?.id} onClick={() => c?.id && handleAction(dockerControlApi.remove_container_containers__container_id__delete, { container_id: c.id, force: true })} className="text-red-500 hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed">Remove</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <Modal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} title="Create New Container">
                 <p>Use the "Docker API" view for advanced creation. This is a simplified form.</p>
                 <button onClick={() => handleCreateContainer({ image: "nginx:latest" })} className="mt-4 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90">Create nginx:latest</button>
            </Modal>
             <Modal isOpen={!!logs} onClose={() => setLogs(null)} title={`Logs for ${logs?.id.substring(0,12)}`}>
                 <JsonViewer jsonString={logs?.content || ''} />
            </Modal>
        </div>
    );
};


// 2. IMAGES VIEW
const ImagesView: React.FC = () => {
    const [images, setImages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Images</h2>
                <p>Pull/Build actions can be done from the "Docker API" view.</p>
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
                                    <td className="p-3">{(img.repo_tags || img.tags || []).join(', ')}</td>
                                    <td className="p-3">{(img.size / 1024 / 1024).toFixed(2)} MB</td>
                                    <td className="p-3">
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
                                <span className="text-right break-all">{(img.repo_tags || img.tags || []).join(', ') || '-'}</span>
                            </div>
                            <div className="flex justify-between items-start">
                                <span className="font-semibold text-card-foreground">Size</span>
                                <span className="text-right">{(img.size / 1024 / 1024).toFixed(2)} MB</span>
                            </div>
                            <div className="pt-3 mt-2 border-t border-border flex justify-end items-center">
                                <button onClick={() => handleRemove(img.id)} className="text-red-500 hover:underline">Remove</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// 3. VOLUMES VIEW
const VolumesView: React.FC = () => {
    const [volumes, setVolumes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
    
    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">Volumes</h2>
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
                                    <td className="p-3">
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
                            <div className="pt-3 mt-2 border-t border-border flex justify-end items-center">
                                <button onClick={() => handleRemove(vol.name)} className="text-red-500 hover:underline">Remove</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


// 4. NETWORKS VIEW
const NetworksView: React.FC = () => {
    const [networks, setNetworks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">Networks</h2>
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
                                    <td className="p-3">
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
                            <div className="pt-3 mt-2 border-t border-border flex justify-end items-center">
                                <button onClick={() => handleRemove(net.id)} className="text-red-500 hover:underline">Remove</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


// --- MAIN VIEW COMPONENT ---

const SUB_VIEWS: { id: string; label: string; component: React.FC }[] = [
    { id: 'containers', label: 'Containers', component: ContainersView },
    { id: 'images', label: 'Images', component: ImagesView },
    { id: 'volumes', label: 'Volumes', component: VolumesView },
    { id: 'networks', label: 'Networks', component: NetworksView },
];

export const DockerUiView: React.FC<{ initialSubViewId: string }> = ({ initialSubViewId }) => {
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
                <ActiveComponent />
            </div>
        </div>
    );
};