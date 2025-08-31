# NextBrowse Frontend

This is the Next.js 15 frontend application for NextBrowse file browser.

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Environment Variables

Create a `.env.local` file with:
```bash
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_GO_API_URL=http://localhost:9932
```

## Project Structure

- `app/` - Next.js App Router pages and layouts
- `components/` - Reusable React components
- `lib/` - Utility functions and API client
- `hooks/` - Custom React hooks
- `public/` - Static assets

## Key Components

- **FileManager**: Main file browsing interface
- **Toolbar**: File operation controls
- **UploadDropzone**: Drag-and-drop file upload
- **ContextMenu**: Right-click file operations
- **IDE**: Code editor with Monaco

## Technologies

- Next.js 15 with App Router
- React 19
- TypeScript
- TailwindCSS v4
- Monaco Editor