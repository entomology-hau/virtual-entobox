# Ethical Entomology Collection

A browser-based teaching tool for ethical virtual insect pinning, specimen curation, labelling, and introductory collection management. It is intended as a non-lethal alternative or supplement to physical insect collection assignments while retaining core learning outcomes: specimen orientation, taxonomic reasoning, label data quality, and curatorial standards.

## What changed in this improved version

- Added an explicit ethical-use registration statement.
- Added specimen-level ethical provenance fields: source/method, handling note, and pinning rationale.
- Added record-quality checks and completion scores for each specimen.
- Added collection-level dashboard cards for total specimens, pinned specimens, ethical documentation, and complete records.
- Added search across order, family, genus, species, common name, collector, site, habitat, and method.
- Improved JSON import/export handling, including safer migration of legacy single-drawer files.
- Fixed an import bug where a declined mismatched student file could still partially overwrite the current state.
- Added automatic client-side image resizing before storing uploads in `localStorage`, reducing quota failures.
- Improved the image studio: initial image fit, pointer/touch support, visible brush cursor, and a connected-component magic wand that removes contiguous background rather than every matching colour in the image.
- Improved the pinning canvas: keyboard adjustment, touch/pointer support, clearer pin styling, and better accessibility labels.
- Improved visual hierarchy, card styling, dark mode contrast, drawer metadata, and specimen badges.

## Overview

The application provides a digital alternative to an insect collection assignment. It avoids requiring students to kill insects for the exercise, while still asking them to practise the conventions of curation, pin placement, label construction, identification, and critical reflection on specimen provenance.

This should not be presented as a full substitute for all taxonomic training. Physical collections, reference specimens, and microscopy remain important in entomology. The tool is best used as a scaffold for discussion: when is collection justified, what metadata are needed, how should uncertainty be recorded, and which diagnostic features should be preserved?

## Key features

- **Virtual pinning studio:** Upload an image and place a virtual pin on the thorax/notum.
- **Ethics-first workflow:** Students document whether the source was live-release, found dead, a teaching image, a museum/reference collection, or another non-lethal source.
- **Image processing:** Crop, rotate, frame, and remove backgrounds using a connected magic-wand selection or manual brush.
- **Record quality checks:** Each specimen is scored for image, pin placement, minimum taxonomy, collection details, and ethical provenance.
- **Taxonomic data entry:** Phylum, class, order, suborder, family, genus, species, authority, common name, identifier, and confidence.
- **Ecological context:** Date, location, collector/observer, habitat, microhabitat/host, life stage, sex/morph, field photos, and notes.
- **Multi-drawer management:** Organise specimens into named drawers with adjustable slot counts.
- **Local persistence:** Data is stored in the browser with JSON export/import for backup and submission.
- **Instructor mode:** Staff can load exported student JSON files in read-only grading mode.

## Student guide

### 1. Create or open an account

1. Open the application in a browser.
2. Register with your name and student number, or sign in if you already registered on the same device.
3. Confirm the ethical-use statement when registering.
4. Remember that the account exists only in the current browser profile unless you export your JSON file.

### 2. Add a specimen

1. Select an empty drawer slot.
2. Upload a clear specimen image.
3. Use **Open Studio** to frame, rotate, and clean the background.
4. Place the virtual pin on the thorax/notum. Use arrow keys for fine adjustment if required.
5. Complete the label data, including source/method and ethical handling note.
6. Add optional field/context photographs and notes.
7. Save the specimen.

### 3. Ethical expectations

Students should prefer images of living insects that were photographed and released, approved teaching images, museum/reference material, or specimens found dead. The exercise should not incentivise collecting protected species, collecting in restricted sites, or killing insects where a digital record would meet the learning objective. Where identification is uncertain, record uncertainty rather than over-claiming.

### 4. Submit your assignment

1. Ensure each specimen is saved.
2. Check the dashboard and specimen completion badges.
3. Click **Save progress** in the header.
4. Submit the downloaded `.json` file to the learning management system.

The JSON file contains embedded image data, so it may be large. Use a reasonable number of field photographs.

## Instructor grading guide

### Accessing admin mode

On the login screen, enter the staff credentials configured in `App.tsx`:

- **ID:** `STAFF_ADMIN`
- **Password:** `admin2024`

The interface switches to read-only instructor grading mode.

### Grading a submission

1. Click **Load student file (.json)**.
2. Select the student export file.
3. Inspect drawers, specimens, completion badges, pin position, taxonomy, ethical provenance, and notes.
4. Use the dashboard to quickly check whether the student documented pinning and ethical provenance consistently.

## Technical documentation

### Stack

- React
- TypeScript
- Vite
- Tailwind CDN styling
- Lucide React icons
- Static deployment compatible with GitHub Pages

### Project structure

```text
/
├── components/
│   ├── Editor.tsx          # Modal workflow for image, pinning, ethics, taxonomy, and notes
│   ├── ImageEditor.tsx     # Canvas-based image framing and background clean-up
│   └── PinningCanvas.tsx   # Coordinate-based virtual pin placement
├── services/
│   ├── geminiService.ts    # Deprecated placeholder retained for compatibility
│   └── imageUtils.ts       # Client-side image resizing helper
├── types.ts                # TypeScript interfaces and legacy image helper
├── App.tsx                 # Main application, auth, persistence, drawers, import/export
├── index.html              # Tailwind CDN config and global styles
└── vite.config.ts          # Static build configuration
```

### Development

```bash
npm install
npm run dev
npm run build
npm run preview
```

### Data privacy and limitations

This application runs entirely client-side. Student data and images are not uploaded to a server by the app. Data persists in browser `localStorage` until the browser profile is cleared or storage is exhausted. Exported JSON files are the mechanism for backup, transfer, and assignment submission.

The simple local login is not secure authentication. It is only a browser-local convenience for a static teaching tool. Do not treat it as a production user-management system.
