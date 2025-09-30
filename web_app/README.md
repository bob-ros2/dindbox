
# Docker API Client

A modern, responsive web-based UI for interacting with a Docker API server. This application allows users to easily manage Docker containers, images, networks, and volumes by selecting API services from a grouped dropdown, providing the necessary parameters, and viewing the JSON response with syntax highlighting.

## Features

- **Responsive Design**: The UI seamlessly adapts to different screen sizes. The sidebar collapses on tablets and transforms into a select menu on mobile devices.
- **Dynamic API Interaction**: Forms for API endpoints are generated dynamically based on an included OpenAPI specification.
- **Grouped Service Selection**: Users can choose from a list of available Docker API operations, conveniently grouped by resource type (Containers, Images, Networks, etc.).
- **Complex Parameter Input**: The application supports simple inputs as well as text areas for complex JSON objects required by the API.
- **API Call Execution**: A "Call API" button to execute the request, with a clear loading state.
- **Syntax-Highlighted Responses**: The JSON response from the API is displayed in a formatted and color-coded viewer for readability.
- **Two Main Views**: A simple `Dashboard` and the powerful `Docker API` interface for all API interactions.

## Tech Stack

- **React**: A JavaScript library for building user interfaces.
- **TypeScript**: A strongly typed superset of JavaScript that adds static types.
- **Tailwind CSS**: A utility-first CSS framework for rapid UI development.
- **No Build Step**: This project is designed to run directly in a modern browser using ES modules and an import map, without requiring a local build process (like Webpack or Vite).

## How to Run

This application is set up to run in a web-based development environment that supports ES modules.

1.  The main entry point is `index.html`.
2.  It loads Tailwind CSS from a CDN.
3.  An `importmap` is used to resolve module specifiers for `react` and `react-dom`.
4.  The main application logic is loaded via `<script type="module" src="/index.tsx"></script>`.

There is no `npm install` or build step required.

## API Integration

The application communicates with a backend Docker API server.

- The API client is defined in `services/docker-control-api.ts`. It provides typed functions for each API endpoint.
- The entire OpenAPI 3.1 specification is embedded within `constants.tsx`. This file processes the spec to generate a list of `API_OPERATIONS` and `API_SCHEMAS`.
- The `DockerControlView.tsx` component uses this processed data to dynamically render the correct form fields for each selected API operation.

## Project Structure

```
.
├── App.tsx                 # Main app component, handles layout and view switching.
├── components/
│   ├── JsonViewer.tsx      # Component for displaying syntax-highlighted JSON.
│   └── Sidebar.tsx         # The responsive navigation sidebar/menu.
├── constants.tsx           # App constants, menu items, and the processed OpenAPI spec.
├── hooks/
│   └── useWindowSize.ts    # Custom hook to track window dimensions for responsiveness.
├── index.html              # The main HTML file.
├── index.tsx               # The entry point for the React application.
├── metadata.json           # Application metadata.
├── services/
│   └── docker-control-api.ts # The API client for the Docker API.
├── types.ts                # Global TypeScript types and interfaces.
└── views/
    ├── DashboardView.tsx       # The component for the Dashboard screen.
    └── DockerControlView.tsx   # The component for the Docker API interface.
```
