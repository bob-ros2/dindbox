# Docker DinD API/UI/MCP Server

Manage an isolated Docker-in-Docker (DinD) instance via a REST API, a modern web UI, and a Model Context Protocol (MCP) server for AI agents.

This project runs a sandboxed Docker daemon inside a container, controlled by a FastAPI backend and a React/TypeScript frontend. It's a powerful tool for CI/CD, automated testing, or providing isolated Docker environments. The entire stack is containerized and orchestrated with Docker Compose.

## Key Features

-   **Isolated Docker Environment**: Safely manage Docker resources without affecting the host system.
-   **Dual Control Interfaces**:
    -   A REST API with a responsive React web UI for manual control.
    -   An `stdio`-based MCP server for integration with AI agents and LLMs.
-   **Flexible Deployment**: Includes a standard Ubuntu-based `Dockerfile` with NVIDIA GPU support and a lightweight Alpine-based `Dockerfile.tiny` for CPU-only use.
-   **GPU Acceleration**: Supports NVIDIA GPU passthrough for demanding workloads.
-   **Easy Deployment**: Get running with a single `docker-compose` command.
-   **Persistent Storage**: Inner Docker data (images, containers) is persisted in a volume.
-   **SSH Access**: Direct shell access into the container and its inner Docker CLI.

## Prerequisites

-   Docker Engine
-   Docker Compose
-   **Optional (for GPU support):**
    -   NVIDIA GPU
    -   NVIDIA host drivers
    -   NVIDIA Container Toolkit

## Getting Started

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/bob-ros2/dindbox.git
    cd dindbox
    ```

2.  **(Optional) Configure SSH Access**
    Add your public SSH key to an `authorized_keys` file in the project root for password-less access.

3.  **Build and Run**

    -   **Default (GPU Support):**
        ```bash
        docker compose up --build -d
        ```

    -   **Lightweight (CPU-only):**
        ```bash
        docker compose -f docker-compose.tiny.yaml up --build -d
        ```

4.  **Access the Application**
    -   **Web UI**: `http://localhost:8000`
    -   **API Docs**: `http://localhost:8000/api/v1/docs`
    -   **SSH**: `ssh dind@localhost -p 2223` (password: `dind`)

## Modes of Operation

### 1. Web UI & REST API

The default mode, launched via `docker compose`, runs the FastAPI server and React UI. It's ideal for human users and traditional API integrations, providing a full web interface and Swagger documentation.

### 2. Docker MCP Server (for AI Agents)

The `docker_mcp_server` provides a `stdio` interface for programmatic control, designed for AI agents or LLMs with tool-calling capabilities. It allows an automated system to safely execute Docker commands within the sandboxed environment.

Example tool-calling configuration:
```json
{
  "command": "uvx",
  "args": [
    "/path/to/dindbox/",
    "docker-mcp-server"
  ],
  "env": {
    "DOCKER_HOST": "ssh://dind@thehostname:2223"
  },
  "type": "stdio"
}
```
*This configuration connects to the container's Docker daemon via SSH. Omit `env` to connect to a local Docker daemon.*

## Development

### Frontend (React App - `./web_app`)

```bash
cd web_app
npm install
npm run dev # Starts dev server on port 5173
```

### Backend (FastAPI Server - `./src`)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e . fastapi "uvicorn[standard]"
uvicorn src.docker_mcp_server.api_server:app --host 0.0.0.0 --port 8000 --reload
```

## Security Considerations

-   **AI Agent Control**: This tool grants AI agents significant capabilities. An unconstrained or improperly prompted agent could perform unintended actions. Use with agents that have appropriate safeguards or human oversight.
-   **Network Exposure**: The API (`8000`) and SSH (`2223`) ports are exposed on the host by default. Protect these ports with a firewall, especially on untrusted networks.
-   **DinD Isolation**: DinD is not a perfect security sandbox. A sophisticated attacker who compromises the container could potentially exploit kernel vulnerabilities to access the host. Do not run untrusted images if host security is a critical concern.
