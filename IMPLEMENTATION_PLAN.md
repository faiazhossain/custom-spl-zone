# SPL Custom Zone - Implementation Plan

## Project Overview

A Next.js application with MapLibre GL for drawing, saving, editing, and deleting custom polygon zones on the Saudi Arabia SPL Prime map with a purple theme and responsive design.

**Tech Stack:**

- Next.js 15+ (App Router)
- TypeScript
- MapLibre GL JS
- Tailwind CSS
- React Hook Form + Zod

**API Details:**

- Create: `POST https://api.admin.barikoi.com/api/v2/add-custom-zone-polygon`
- Fetch: `GET https://api.admin.barikoi.com/api/v2/get-custom-zone-polygon`
- Update: `POST https://api.admin.barikoi.com/api/v2/edit-custom-zone-polygon/{id}`
- Delete: `POST https://api.admin.barikoi.com/api/v2/delete-custom-zone-polygon/{id}`
- Map Style: `https://na-maps.vng-solutions.com/styles/spl_prime/style.json`
- Auth: Bearer token from environment variable

**Saudi Arabia Map Configuration:**

- Center (Riyadh): `46.6753, 24.7136` (lng, lat)
- Approximate Bounds:
  - Southwest: `34.0, 16.0` (lng, lat) - near Najran
  - Northeast: `55.0, 32.0` (lng, lat) - near Northern Borders
- Initial Zoom: 5-6 (to view full country)
- Min Zoom: 4
- Max Zoom: 18

---

## Phases

### Phase 1: Project Setup & Configuration

- [x] Initialize Next.js project with TypeScript
- [x] Install dependencies (maplibre-gl, @types/maplibre-gl, tailwindcss, etc.)
- [x] Configure environment variables (.env.local)
- [x] Set up Tailwind CSS with purple theme custom colors
- [x] Configure TypeScript paths
- [x] Verify project builds successfully

### Phase 2: MapLibre Integration

- [x] Create Map component wrapper
- [x] Integrate MapLibre GL with custom style URL
- [x] Configure map initial view (Saudi Arabia coordinates: center ~46.6753, 24.7136)
- [x] Add map controls (zoom, navigation)
- [x] Handle map resize events
- [x] Test map rendering on different screen sizes

### Phase 3: Polygon Drawing System

- [x] Implement drawing mode toggle
- [x] Add click handler for placing polygon vertices
- [x] Visual feedback during drawing (lines between points)
- [x] Complete polygon drawing (close shape)
- [x] Cancel drawing functionality
- [x] Store temporary polygon state

### Phase 4: Zone Management UI

- [x] Create right sidebar panel (responsive - drawer on mobile)
- [x] Zone list display component
- [x] Zone naming dialog/modal after drawing
- [x] Individual zone card with actions
- [x] Delete confirmation modal
- [x] Edit mode for existing zones

### Phase 5: API Integration

- [ ] Create API client with proper error handling
- [ ] Implement save zone mutation
- [ ] Implement fetch zones query
- [ ] Implement edit zone mutation
- [ ] Implement delete zone mutation
- [ ] Add loading states
- [ ] Add error handling with user feedback

### Phase 6: Edit & Delete Functionality

- [ ] Load saved zones from API on mount
- [ ] Render saved polygons on map
- [ ] Highlight selected zone
- [ ] Edit zone name functionality
- [ ] Delete zone with confirmation
- [ ] Sync state changes with API

### Phase 7: Styling & Polish

- [ ] Apply purple theme throughout
- [ ] Add animations and transitions
- [ ] Responsive breakpoints (mobile, tablet, desktop)
- [ ] Hover states and micro-interactions
- [ ] Loading skeletons
- [ ] Toast notifications for actions

### Phase 8: Testing & Accessibility

- [ ] Test all user flows
- [ ] Verify mobile responsiveness
- [ ] Check keyboard navigation
- [ ] Validate ARIA labels
- [ ] Test API error scenarios
- [ ] Cross-browser testing

---

## Design Theme

### Purple Color Palette

```css
--purple-50: #faf5ff;
--purple-100: #f3e8ff;
--purple-200: #e9d5ff;
--purple-300: #d8b4fe;
--purple-400: #c084fc;
--purple-500: #a855f7;
--purple-600: #9333ea;
--purple-700: #7e22ce;
--purple-800: #6b21a8;
--purple-900: #581c87;
```

### Typography

- Display: **Outfit** (modern, geometric)
- Body: **Geist** or **Inter** variant

### Layout

- Desktop: Map (left) + Sidebar (right, 400px)
- Tablet: Map (top) + Sidebar (bottom drawer)
- Mobile: Full map + Floating zone button + Bottom sheet drawer

---

## API Contract

### Request: Create Zone

```bash
POST https://api.admin.barikoi.com/api/v2/add-custom-zone-polygon
Authorization: Bearer {TOKEN}
Content-Type: application/json

{
  "zone_name": "string",
  "zone_geojson": "POLYGON ((lng1 lat1, lng2 lat2, ...))"
}
```

### Request: Fetch Zones

```bash
GET https://api.admin.barikoi.com/api/v2/get-custom-zone-polygon
Authorization: Bearer {TOKEN}
```

### Request: Update Zone

```bash
POST https://api.admin.barikoi.com/api/v2/edit-custom-zone-polygon/{id}
Authorization: Bearer {TOKEN}
Content-Type: application/json

{
  "zone_name": "string",
  "zone_geojson": "POLYGON ((lng1 lat1, lng2 lat2, ...))"
}
```

### Request: Delete Zone

```bash
POST https://api.admin.barikoi.com/api/v2/delete-custom-zone-polygon/{id}
Authorization: Bearer {TOKEN}
Content-Type: application/json

{}
```

### Expected Response

Response shapes are still to be confirmed during implementation and should be handled defensively in the client.

---

## Progress

- [x] Phase 1: Project Setup & Configuration
- [x] Phase 2: MapLibre Integration
- [x] Phase 3: Polygon Drawing System
- [x] Phase 4: Zone Management UI
- [ ] Phase 5: API Integration
- [ ] Phase 6: Edit & Delete Functionality
- [ ] Phase 7: Styling & Polish
- [ ] Phase 8: Testing & Accessibility

**Overall Progress:** 4/8 phases complete
