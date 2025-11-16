# Better Potree

A modern, modular WebGL point cloud viewer based on [Potree](https://github.com/potree/potree).

## Overview

Better Potree is a complete rewrite of the Potree point cloud viewer with a focus on:

- **Modern Architecture**: Clean, modular design with clear separation of concerns
- **TypeScript First**: Full type safety with strict mode enabled
- **Monorepo Structure**: Independent, testable packages
- **Performance**: Optimized rendering and loading strategies
- **Extensibility**: Plugin-based architecture for easy customization
- **Developer Experience**: Comprehensive documentation, testing, and tooling

## Features

- High-performance point cloud rendering using Three.js
- Support for massive point cloud datasets
- Octree-based LOD (Level of Detail) management
- Multiple point cloud format support (Potree format initially)
- Interactive measurement and annotation tools
- Flexible camera controls
- Modern build tooling (Rsbuild, TypeScript, Vitest)

## Project Structure

```
better-potree/
├── packages/
│   ├── types/              # Shared TypeScript types
│   ├── core/               # Core point cloud logic
│   ├── rendering-three/    # Three.js rendering implementation
│   ├── loader-potree/      # Potree format loader
│   ├── controls/           # Camera controls
│   ├── tools/              # Measurement and annotation tools
│   ├── viewer/             # High-level viewer API
│   └── playground/         # Development playground
├── docs/                   # Documentation
└── plan.md                 # Development roadmap
```

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/better-potree.git
cd better-potree

# Install dependencies
pnpm install
```

### Development

```bash
# Build all packages
pnpm build

# Run tests
pnpm test

# Start playground development server
pnpm dev

# Lint and format code
pnpm lint
pnpm format
```

### Testing

```bash
# Run tests
pnpm test

# Run tests with UI
pnpm test:ui

# Generate coverage report
pnpm test -- --coverage
```

### Documentation

```bash
# Generate API documentation
pnpm docs
```

## Usage

```typescript
import { Viewer } from '@better-potree/viewer';

// Create a viewer instance
const viewer = new Viewer({
  container: document.getElementById('potree-container'),
  // Additional configuration...
});

// Load a point cloud
await viewer.loadPointCloud('path/to/pointcloud');
```

## Packages

- **@better-potree/types**: Shared TypeScript types and interfaces
- **@better-potree/core**: Core point cloud management (includes event system)
- **@better-potree/rendering-three**: Three.js rendering backend
- **@better-potree/loader-potree**: Potree format loader
- **@better-potree/controls**: Camera control implementations
- **@better-potree/tools**: Measurement and annotation tools
- **@better-potree/viewer**: High-level viewer API

## Development Roadmap

See [plan.md](./plan.md) for the detailed development plan and progress tracking.

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

BSD-2-Clause - See [LICENSE](./LICENSE) for details.

This project is based on [Potree](https://github.com/potree/potree) by Markus Schütz.

## Acknowledgments

- [Potree](https://github.com/potree/potree) - The original point cloud viewer
- [Three.js](https://threejs.org/) - 3D rendering library
- [spark.js](https://github.com/sparkjsdev/spark) - An advanced 3D Gaussian Splatting renderer for THREE.js
- All contributors and supporters of this project
