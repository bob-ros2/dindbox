# Stage 1: Build the frontend
FROM node:20 as web_builder

WORKDIR /app

# Copy web_app package files and install dependencies
COPY ./web_app/package.json ./web_app/package-lock.json* ./web_app/
RUN cd web_app && npm install

# Copy the rest of the web_app source code
COPY ./web_app ./web_app

# Build the react app
RUN cd web_app && npm run build

# Stage 2: Final image
FROM ubuntu:22.04  

# Install Python, pip, curl ...
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    ca-certificates \
    openssh-server \
    curl \
    sudo \
    gnupg \
    python3 \
    python3-venv \
    python3-pip \
    && apt-get upgrade -y --no-install-recommends

# Install Docker  
RUN curl -fsSL https://get.docker.com | sh  

# Install NVIDIA Container Toolkit for GPU support  
RUN curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg \
    && curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
    sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
    tee /etc/apt/sources.list.d/nvidia-container-toolkit.list \
    && apt-get update \
    && apt-get install -y nvidia-container-toolkit \
    && nvidia-ctk runtime configure --runtime=docker \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* 

# Create a new user for SSH access. Avoid using root for SSH.
RUN adduser --shell /bin/sh dind
RUN echo "dind:dind" | chpasswd
RUN adduser dind docker

# Configure the SSH server
# - PermitRootLogin no: Disables root login via SSH (good security practice)
# - PasswordAuthentication yes: Allows password-based login (for this example)
RUN echo "PermitRootLogin no" >> /etc/ssh/sshd_config && \
    echo "PasswordAuthentication yes" >> /etc/ssh/sshd_config

# Generate SSH host keys. This is crucial for the server to start.
RUN ssh-keygen -A && mkdir -p /var/run/sshd

# setup ssh keys to allow mcp server to control docker
RUN mkdir -p /home/dind/.ssh 
COPY ./authorized_keys /home/dind/.ssh/
RUN chmod -R 700 /home/dind/.ssh \
  && chown -R dind:dind /home/dind/.ssh

# Expose the standard SSH port
EXPOSE 22

# Set the working directory
WORKDIR /app

# Create a virtual environment
RUN python3 -m venv /opt/venv

# Activate the virtual environment by adding it to the PATH.
# This ensures that any subsequent RUN, CMD, or ENTRYPOINT commands
# use the python and pip from this venv.
ENV PATH="/opt/venv/bin:$PATH"

# Copy dependency definitions and the entrypoint script
COPY pyproject.toml ./
COPY entrypoint.sh /usr/local/bin/

# Make the entrypoint script executable
RUN chmod +x /usr/local/bin/entrypoint.sh

# Install project dependencies, plus fastapi and uvicorn for the API server
# This pip command will now use the pip from /opt/venv/bin/pip
RUN pip install . fastapi "uvicorn[standard]"

# Copy the rest of the application's source code and static data
COPY ./src ./src
COPY ./static ./static
COPY --from=web_builder /app/web_app/dist ./static

# Expose the port the app runs on
EXPOSE 8000

# Set the entrypoint to our custom script
ENTRYPOINT ["entrypoint.sh"]
