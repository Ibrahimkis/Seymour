# Seymour - World Building Application

## Architecture Overview

**Seymour** is an Electron-based desktop application for world building and manuscript writing. It uses React 19 with TipTap for rich text editing, and features a dual-runtime architecture (both Electron and Tauri configurations exist, though Electron is primary).

### Project Structure
- **Frontend**: React + Vite, HashRouter navigation
- **Backend**: Electron main process ([public/electron.cjs](../public/electron.cjs)) handles native file I/O
- **Bridge**: [public/preload.js](../public/preload.js) exposes `window.electronAPI` to renderer via `contextBridge`
- **Persistence**: IndexedDB via `idb` library ([src/context/projectDb.ts](../src/context/projectDb.ts)) + native `.seymour` (JSON) files
- **State**: Centralized via `ProjectContext` ([src/context/ProjectContext.jsx](../src/context/ProjectContext.jsx)) with refs for performance

## Critical Data Architecture

### Global Project Schema
All project data lives in a single object managed by `ProjectContext`:
```javascript
{
  title: string,
  globalNotes: string,
  settings: { fontSize, zoom, fontFamily, customFonts[] },
  manuscript: { chapters: [{ id, title, content, synopsis, notes }] },
  lore: { characters: [], folders: [] },
  worldMap: [{ id, name, imageSrc, pins: [] }], // Array of maps
  timeline: [{ id, year, displayDate, title, desc, type }],
  relationships: [{ id, name, nodes: [], edges: [] }] // Array of graphs
}
```

**Migration Pattern**: Several features (worldMap, relationships) have migrated from single objects to arrays. Check for both formats:
```javascript
const maps = Array.isArray(rawData) 
  ? rawData 
  : [{ id: 'default', name: 'Global Map', imageSrc: rawData.imageSrc, pins: rawData.pins || [] }];
```

### State Management Philosophy

1. **Ref-Based Performance Pattern**: Avoid re-render cascades by keeping refs in sync:
   ```javascript
   const projectDataRef = useRef(projectData);
   useEffect(() => { projectDataRef.current = projectData; }, [projectData]);
   ```
   Access `projectDataRef.current` in callbacks to avoid stale closures.

2. **Force-Save Events**: Navigation between features triggers saves via custom events:
   - `force-save-all`: Global save (used before switching major features)
   - `force-save-chapter`: Editor-specific save
   - `force-save-lore`: Lore database save
   
   Listen pattern in [EditorLayout.jsx](../src/features/editor/EditorLayout.jsx):
   ```javascript
   useEffect(() => {
     window.addEventListener('force-save-all', handleForceSave);
     return () => window.removeEventListener('force-save-all', handleForceSave);
   }, [setProjectData]);
   ```

3. **Debounced Auto-Save Pipeline**: [ProjectContext.jsx](../src/context/ProjectContext.jsx) implements a sequential save queue with debouncing:
   - `changeSeqRef` tracks dirty state
   - `saveQueueRef` prevents concurrent saves
   - `scheduleDebouncedSave()` debounces (700ms default)
   - `flushSaveNow()` executes immediately

## Feature Modules

### Editor ([src/features/editor/](../src/features/editor/))
- **TipTap Extensions**: Uses `@tiptap/starter-kit` with custom `LoreMark` extension for entity linking
- **Typewriter Mode**: Centers cursor using scroll manipulation in `onTransaction`
- **Chapter Navigation**: URL params `?id=chapterId` via `react-router-dom`
- **Storage**: `editor.storage.currentChapterId` tracks active chapter
- **Title Auto-Save**: Separate debounced timer from content saves ([EditorLayout.jsx](../src/features/editor/EditorLayout.jsx))

### Lore Database ([src/features/lore/LoreCard.jsx](../src/features/lore/LoreCard.jsx))
- **Two-Pane Layout**: Left "DatabaseExplorer" (folder tree), Right "EntityView" (detailed card)
- **Entity Structure**: `{ id, name, aliases[], folderId, type, imageSrc, biography, sections[] }`
- **Folder System**: Self-referential with `parentId`, default roots: `root_char`, `root_loc`, `root_misc`
- **Navigation**: Query params `?folderId=X` or `?id=Y`

### World Map ([src/features/map/WorldMapPage.jsx](../src/features/map/WorldMapPage.jsx))
- Custom canvas-based map with pin placement
- Multi-map support (tabs for different maps)
- Pins link to lore entities by ID
- Image upload via `compressImage()` utility

### Chronicle/Timeline ([src/features/chronicle/ChronicleLayout.jsx](../src/features/chronicle/ChronicleLayout.jsx))
- Events sorted by `year` (numeric) with `displayDate` (string) for flexible calendars
- Event types: `era`, `war`, `pol`, `bio`, `lore` with color coding

### Relationship Web ([src/features/relationships/RelationshipWeb.jsx](../src/features/relationships/RelationshipWeb.jsx))
- Canvas-based node-edge graph with pan/zoom
- Connection mode for creating edges between nodes
- Multi-graph support (similar to multi-map)

## Development Workflows

### Running the App
```bash
npm run dev                     # Vite dev server only (port 3000)
npm run electron:dev            # Electron + Vite with hot reload
npm run electron:build:win      # Build for Windows (outputs to release/)
```

### File I/O Flow
1. Renderer calls `window.electronAPI.saveProjectToPath(filePath, data)`
2. Main process ([electron.cjs](../public/electron.cjs)) writes JSON + creates `.txt` backup
3. Backup: Plain text export of all chapters to `{projectName}.txt`

### Custom File Association
`.seymour` files registered on Windows via `electron-builder` config in [package.json](../package.json).  
Opening `.seymour` triggers `open-file` IPC event → renderer loads project.

## Conventions & Patterns

### Component Patterns
- **Modals**: Use `CustomModal` component with `{ isOpen, type, title, onConfirm }` state
- **Layout**: Fixed-width panels (left: 220px, right: 250px) with `position: fixed`
- **Responsive Refs**: Always sync state to refs when used in callbacks/effects

### Styling
- **CSS Modules**: Not used—inline styles and scoped classnames
- **Theme**: `data-theme="dark"` or `data-theme="light"` on root
- **Editor CSS**: `.seymour-editor` class targets TipTap content ([App.css](../src/App.css))

### Error Handling
- `ErrorBoundary` component wraps `<App>` in [main.jsx](../src/main.jsx)
- Validation: `isValidProject()` in ProjectContext checks for required fields before loading

### Navigation Guards
- Always emit `force-save-*` event before navigation
- Use `navigate()` after save completes or user confirms unsaved changes

## Key Dependencies
- **Editor**: `@tiptap/react`, `@tiptap/starter-kit`
- **Icons**: `lucide-react`
- **Storage**: `idb` (IndexedDB wrapper)
- **Build**: `electron-builder`, `vite`, `@vitejs/plugin-react`
- **Router**: `react-router-dom` with `HashRouter` for Electron compatibility

## Anti-Patterns to Avoid
- ❌ Using `electron-store` or similar—persistence is manual via IndexedDB + JSON
- ❌ Adding useState for large objects—use refs for non-visual state
- ❌ Direct DOM manipulation—TipTap handles rich text, use Canvas APIs for maps/graphs
- ❌ Removing force-save events—critical for preventing data loss on navigation
- ❌ Forgetting array migration checks—worldMap and relationships must handle legacy format

## Testing & Debugging
- DevTools open by default in dev mode ([electron.cjs](../public/electron.cjs))
- Check `sessionStorage.hasUnsavedChanges` for unsaved state
- IPC communication debuggable via console logs in both main and renderer processes
- Save issues: Check `changeSeqRef` and `saveQueueRef` in ProjectContext
