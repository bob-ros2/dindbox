import json
import docker
import docker.errors
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from typing import Any, List, Optional

from .input_schemas import (
    BuildImageInput,
    ContainerActionInput,
    CreateContainerInput,
    CreateNetworkInput,
    CreateVolumeInput,
    FetchContainerLogsInput,
    ListContainersInput,
    ListImagesInput,
    ListNetworksInput,
    ListVolumesInput,
    PullPushImageInput,
    RemoveContainerInput,
    RemoveImageInput,
    RemoveNetworkInput,
    RemoveVolumeInput,
)
from .output_schemas import docker_to_dict

_api_prefix="/api/v1"

app = FastAPI(
    title="Docker API Server",
    docs_url=f"{_api_prefix}/docs",
    openapi_url=f"{_api_prefix}/openapi.json"
)

router = APIRouter()

_docker: docker.DockerClient = docker.from_env()

# Exception handler for docker-py exceptions
@app.exception_handler(docker.errors.DockerException)
async def docker_exception_handler(request, exc):
    status_code = 500
    if isinstance(exc, docker.errors.NotFound):
        status_code = 404
    elif isinstance(exc, docker.errors.APIError) and exc.response.status_code:
        status_code = exc.response.status_code

    return JSONResponse(
        status_code=status_code,
        content={"message": str(exc)},
    )


@router.get("/")
def read_root():
    return {"status": "ok"}


# === Containers ===
@router.get("/containers", response_model=List[dict], tags=["Containers"])
def list_containers(
    all: bool = False,
    limit: int = -1,
    sparse: bool = False,
    filters: Optional[str] = Query(
        None,
        description='JSON-encoded dictionary of filters. E.g., `{"status": "running"}`',
    ),
):
    parsed_filters = None
    if filters:
        try:
            parsed_filters = json.loads(filters)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=400, detail="Invalid JSON format for filters."
            )
    containers = _docker.containers.list(
        all=all, limit=limit, sparse=sparse, filters=parsed_filters
    )
    return [docker_to_dict(c) for c in containers]


@router.post("/containers", response_model=dict, status_code=201, tags=["Containers"])
def create_container(args: CreateContainerInput):
    container = _docker.containers.create(**args.model_dump())
    return docker_to_dict(container)


@router.post("/containers/run", response_model=dict, status_code=201, tags=["Containers"])
def run_container(args: CreateContainerInput):
    container = _docker.containers.run(**args.model_dump())
    return docker_to_dict(container)


@router.get("/containers/{container_id}", response_model=dict, tags=["Containers"])
def get_container(container_id: str):
    container = _docker.containers.get(container_id)
    return docker_to_dict(container)


@router.post("/containers/{container_id}/start", tags=["Containers"])
def start_container(container_id: str):
    container = _docker.containers.get(container_id)
    container.start()
    return {"status": "started", "container_id": container.id}


@router.post("/containers/{container_id}/stop", tags=["Containers"])
def stop_container(container_id: str):
    container = _docker.containers.get(container_id)
    container.stop()
    return {"status": "stopped", "container_id": container.id}


@router.delete("/containers/{container_id}", status_code=204, tags=["Containers"])
def remove_container(container_id: str, force: bool = False):
    container = _docker.containers.get(container_id)
    container.remove(force=force)
    return


@router.get("/containers/{container_id}/logs", tags=["Containers"])
def fetch_container_logs(container_id: str, tail: int = 100):
    container = _docker.containers.get(container_id)
    logs = container.logs(tail=tail).decode("utf-8")
    return {"logs": logs.split("\n")}


# === Images ===
@router.get("/images", response_model=List[dict], tags=["Images"])
def list_images(
    name: Optional[str] = None,
    all: bool = False,
    filters: Optional[str] = Query(
        None,
        description='JSON-encoded dictionary of filters. E.g., `{"dangling": "true"}`',
    ),
):
    parsed_filters = None
    if filters:
        try:
            parsed_filters = json.loads(filters)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=400, detail="Invalid JSON format for filters."
            )
    images = _docker.images.list(name=name, all=all, filters=parsed_filters)
    return [docker_to_dict(img) for img in images]


@router.post("/images/pull", response_model=dict, tags=["Images"])
def pull_image(args: PullPushImageInput):
    model_dump = args.model_dump()
    repository = model_dump.pop("repository")
    image = _docker.images.pull(repository, **model_dump)
    return docker_to_dict(image)


@router.post("/images/push", tags=["Images"])
def push_image(args: PullPushImageInput):
    model_dump = args.model_dump()
    repository = model_dump.pop("repository")
    _docker.images.push(repository, **model_dump)
    return {
        "status": "pushed",
        "repository": args.repository,
        "tag": args.tag,
    }


@router.post("/images/build", response_model=dict, tags=["Images"])
def build_image(args: BuildImageInput):
    image, logs = _docker.images.build(**args.model_dump())
    return {"image": docker_to_dict(image), "logs": [line for line in logs]}


@router.delete("/images/{image_id}", status_code=204, tags=["Images"])
def remove_image(image_id: str, force: bool = False):
    _docker.images.remove(image=image_id, force=force)
    return


# === Networks ===
@router.get("/networks", response_model=List[dict], tags=["Networks"])
def list_networks(
    names: Optional[List[str]] = Query(None, description="List of network names to filter by."),
    ids: Optional[List[str]] = Query(None, description="List of network IDs to filter by."),
    filters: Optional[str] = Query(
        None,
        description='JSON-encoded dictionary of filters. E.g., `{"driver": "bridge"}`',
    ),
):
    parsed_filters = None
    if filters:
        try:
            parsed_filters = json.loads(filters)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=400, detail="Invalid JSON format for filters."
            )
    networks = _docker.networks.list(names=names, ids=ids, filters=parsed_filters)
    return [docker_to_dict(net) for net in networks]


@router.post("/networks", response_model=dict, status_code=201, tags=["Networks"])
def create_network(args: CreateNetworkInput):
    network = _docker.networks.create(**args.model_dump())
    return docker_to_dict(network)


@router.delete("/networks/{network_id}", status_code=204, tags=["Networks"])
def remove_network(network_id: str):
    network = _docker.networks.get(network_id)
    network.remove()
    return


# === Volumes ===
@router.get("/volumes", response_model=List[dict], tags=["Volumes"])
def list_volumes(
    filters: Optional[str] = Query(
        None,
        description='JSON-encoded dictionary of filters. E.g., `{"dangling": "true"}`',
    ),
):
    parsed_filters = None
    if filters:
        try:
            parsed_filters = json.loads(filters)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=400, detail="Invalid JSON format for filters."
            )
    volumes = _docker.volumes.list(filters=parsed_filters)
    return [docker_to_dict(v) for v in volumes]


@router.post("/volumes", response_model=dict, status_code=201, tags=["Volumes"])
def create_volume(args: CreateVolumeInput):
    volume = _docker.volumes.create(**args.model_dump())
    return docker_to_dict(volume)


@router.delete("/volumes/{volume_name}", status_code=204, tags=["Volumes"])
def remove_volume(volume_name: str, force: bool = False):
    volume = _docker.volumes.get(volume_name)
    volume.remove(force=force)
    return


app.include_router(router, prefix=_api_prefix)
# Mount the static directory to serve files from the root path.
# This must come AFTER the API router is included.
app.mount("/", StaticFiles(directory="static", html=True), name="static")