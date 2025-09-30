#!/bin/sh

# start sshd to allow accessing the docker host
/usr/sbin/sshd -D &

# Start the Docker daemon in the background so we can get its PID
rm -rf /var/run/docker.pid 2>/dev/null
dockerd &
DOCKERD_PID=$!

# Wait until the Docker daemon is responsive
echo "Waiting for Docker daemon to start..."
while ! docker info > /dev/null 2>&1; do
  sleep 1
done
echo "Docker daemon started."

# Start the FastAPI application in the background
echo "Starting API server in the background..."
uvicorn src.docker_mcp_server.api_server:app --host 0.0.0.0 --port 8000 &

# Now, wait for the Docker daemon to exit.
# This makes it the "main" process for the container's lifecycle.
# If dockerd crashes, this script will exit, and the container will stop.
wait $DOCKERD_PID
