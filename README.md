# Docker DinD API/UI/MCP Server

This project provides a complete environment for managing an isolated Docker instance through a RESTful API, a modern web interface and a MCP server for AI agents. It runs a true Docker-in-Docker (DinD) daemon inside a container, making it a powerful tool for CI/CD, automated testing, or providing sandboxed Docker environments.

The entire application is containerized and orchestrated with Docker Compose, including a Python FastAPI backend, a React/TypeScript frontend, and support for NVIDIA GPU passthrough.

## Architecture Overview

The system is composed of several key components running within a single Docker container:

-   **Host Machine**: Runs the main Docker service.
-   **Main Container (`server` service)**:
    -   **Docker Daemon (DinD)**: An isolated Docker engine, completely separate from the host's Docker daemon. Its data is persisted in a named volume (`dind-storage`).
    -   **FastAPI Backend**: A Python application that serves a REST API to control the inner Docker daemon. It also serves a basic frontend web application to manage the Docker components like Container, Images ...
    -   **React Frontend**: A responsive web UI for interacting with the API to manage containers, images, etc.
    -   **SSH Server**: Provides direct shell access into the container for advanced management and debugging.

## Key Features

-   **Isolated Docker Environment**: Safely manage Docker resources without affecting the host system.
-   **Dual-Interface Control**: Manage the environment via a REST API (with a web UI) or through the `Docker MCP Server`'s standard I/O interface, designed for integration with AI agents and language models.
-   **Modern Web UI**: A user-friendly interface built with React and TypeScript to visualize and manage Docker resources.
-   **Flexible Deployment Options**: Includes a standard `Dockerfile` based on Ubuntu with NVIDIA GPU support, and an alternative `Dockerfile.tiny` based on Alpine Linux for a lightweight, CPU-only deployment.
-   **GPU Acceleration**: Supports NVIDIA GPU passthrough for running GPU-intensive workloads within the DinD environment (standard Dockerfile only).
-   **Easy Deployment**: Get up and running with a single `docker-compose` command.
-   **Persistent Storage**: The inner Docker daemon's state (images, containers, volumes) is persisted across restarts.
-   **SSH Access**: Direct access to the container's shell and the inner Docker CLI.

## Prerequisites

-   Docker Engine
-   Docker Compose
-   (Optional) For GPU support:
    -   An NVIDIA GPU
    -   NVIDIA drivers installed on the host machine
    -   NVIDIA Container Toolkit installed on the host machine

## Getting Started

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/bob-ros2/dindbox.git
    cd dindbox
    ```

2.  **(Optional) Configure SSH Access**
    To enable password-less SSH access, create a file named `authorized_keys` in the project root and add your SSH public key to it. This file will be copied into the container for the `dind` user.

3.  **Build and Run the Service**
    Use Docker Compose to build the image and start the container in detached mode:
    ```bash
    # This uses the default Dockerfile with GPU support
    docker compose up --build -d
    ```
    This command builds the multi-stage Docker image, which includes building the React frontend and setting up the Python environment, then starts the service.

    ### Alternative: Running the Lightweight Version
    This project also includes a minimal setup for CPU-only environments, which results in a significantly smaller Docker image and faster build times. It uses `Dockerfile.tiny` and is orchestrated by `docker-compose.tiny.yaml`.

    **Key Differences:**
    -   **Base Image**: Uses `docker:latest` (Alpine) instead of `ubuntu:22.04`.
    -   **GPU Support**: Does **not** include the NVIDIA Container Toolkit.
    -   **Size**: Produces a much smaller final image.

    To run the lightweight version, use the following command:
    ```bash
    docker compose -f docker-compose.tiny.yaml up --build -d
    ```

4.  **Access the Application**
    -   **Web UI**: Open your browser and navigate to `http://localhost:8000`
    -   **API Docs**: The interactive Swagger UI is available at `http://localhost:8000/api/v1/docs`
    -   **SSH**: Connect to the container via SSH on port `2223`:
        ```bash
        ssh dind@localhost -p 2223
        ```
        The password is `dind` (as set in the `Dockerfile`), or use your SSH key if you configured `authorized_keys`.

## Modes of Operation

This application provides two primary modes for interacting with the Docker-in-Docker environment:

### 1. Web UI & REST API

The default mode, launched via `docker compose`, runs a FastAPI server that exposes a full REST API for Docker management. This is paired with a responsive React web UI and interactive Swagger documentation, making it ideal for human users and traditional API integrations.

### 2. Docker MCP Server (for AI Agents)

The project includes the `Docker MCP Server`, a component designed for programmatic use by automated systems like AI agents or Large Language Models (LLMs) with tool-calling capabilities. The MCP Server is a standalone component that can be run independently of the Docker-in-Docker environment. It is capable of connecting to and managing any accessible Docker daemon.

Instead of a web server, it run in a mode that communicates over standard input/output (`stdio`). It processes structured commands (e.g., JSON) from `stdin` and returns the results to `stdout`. This provides a robust, scriptable interface for an AI model to safely execute Docker operations within the container's sandboxed environment. This functionality is provided by the `run_stdio` function within the `docker_mcp_server` package.

Here is an example configuration for an external tool-calling framework to launch and interact with the MCP server:

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
  "type": "stdio",
  "active": true
}
```

This configuration instructs a tool runner to:
- Execute the `docker_mcp_server` command within its environment.
- Set the `DOCKER_HOST` environment variable to connect to the containerized Docker daemon via SSH. To connect to your local Docker daemon instead, simply omit the env section.
- Communicate with the server using standard I/O (`stdio`).

## Development

You can work on the backend and frontend services separately.

### Frontend (React App)

The frontend source code is in the `./web_app` directory.

1.  **Navigate to the web app directory:**
    ```bash
    cd web_app
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Start the development server:**
    ```bash
    npm run dev
    ```
    This will start a local server (usually on port 5173) with hot-reloading. Note that API calls will need to be proxied to the running backend container on port 8000.

4.  **Build for production:**
    To manually build the frontend assets, run:
    ```bash
    npm run build
    ```
    The output will be placed in `./web_app/dist`. The main `Dockerfile` handles this process automatically during the image build.

### Backend (FastAPI Server)

The backend source code is in the `./src` directory. It's recommended to use a Python virtual environment.

1.  **Create and activate a virtual environment:**
    ```bash
    python3 -m venv .venv
    source .venv/bin/activate
    ```
2.  **Install dependencies:**
    The project is set up as an editable package. Install it along with the server dependencies:
    ```bash
    pip install -e . fastapi "uvicorn[standard]"
    ```
3.  **Run the development server:**
    ```bash
    uvicorn src.docker_mcp_server.api_server:app --host 0.0.0.0 --port 8000 --reload
    ```
    The `--reload` flag enables hot-reloading when source files change. Note that this local server will not have access to a Docker daemon unless you have one running and configured.

## Security Considerations

-   **AI Agent Control**: This project is designed to empower AI agents by giving them the ability to manage Docker containers, which can include executing code. While this enables many powerful applications beyond simple chat responses, it's important to be aware of the responsibility that comes with it. An unconstrained or improperly prompted AI agent could perform unintended actions within the sandboxed environment. It is recommended to use this tool with AI agents that have appropriate safeguards, constraints, or human oversight in place.

-   **Network Exposure**: By default, the API/UI port (`8000`) and the SSH port (`2223`) are exposed on the host. If this host is accessible on a network, these endpoints will be too. It is critical to ensure that these ports are protected by a firewall or only exposed on trusted networks. For production or multi-user environments, you should implement proper authentication and authorization for the API and disable password-based SSH authentication in favor of SSH keys.

-   **Docker-in-Docker (DinD) Isolation**: While DinD provides a separate Docker environment, it is not a perfect security sandbox. The inner Docker daemon runs as root within the main container and shares the host machine's kernel. A sophisticated attacker who achieves root access inside the container could potentially exploit kernel vulnerabilities to gain access to the underlying host system. Do not run untrusted or malicious container images in this environment if host security is a critical concern.

## Project Structure

```
.
├── docker-compose.yaml     # Defines the services, networks, and volumes.
├── Dockerfile              # Main multi-stage Dockerfile for the final image.
├── Dockerfile.tiny         # An alternative, smaller Dockerfile.
├── entrypoint.sh           # Script to start sshd, dockerd, and the API server.
├── pyproject.toml          # Python project and dependency definitions (PEP 621).
├── README.md               # Main project README.
├── requirements.txt        # Additional Python dependencies for the server.
├── src/                    # Python backend source code.
│   └── docker_mcp_server/
│       ├── api_server.py   # FastAPI application definitions.
│       ├── input_schemas.py# Pydantic models for API input validation.
│       └── ...             # Other backend modules.
├── static/                 # Static assets for the backend (hosts the built React app).
└── web_app/                # React/TypeScript frontend source code.
    ├── postcss.config.js   # Configuration for PostCSS.
    ├── tailwind.config.js  # Configuration file for Tailwind CSS.
    ├── package.json        # Frontend dependencies and scripts (npm).
    ├── tsconfig.json       # TypeScript compiler configuration.
    ├── vite.config.ts      # Vite build configuration.
    └── src/                # Frontend component source files.
```