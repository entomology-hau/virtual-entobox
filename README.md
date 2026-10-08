# Virtual Entobox

A photographic insect collection workbench for entomology students at Harper Adams University. It offers an alternative or supplement to a physical specimen collection assignment while retaining identification, collection labels, curation, virtual pinning and scientific reasoning.

**Live site:** https://entomology-hau.github.io/virtual-entobox/

## Student workflow

1. Open the site and add your collection title, name and student number under **Add your details**. There is no account or password.
2. Select **Add specimen** or an empty drawer space. Add a clear JPEG, PNG, WebP or GIF photograph (up to 25 MB). Images are resized in the browser; keep your full-resolution original separately.
3. Optionally use **Prepare image** to frame, rotate and clean up its background. The original resized photograph is retained alongside the prepared version. Avoid erasing diagnostic features.
4. Add a virtual pin if the assignment requires mounting conventions. Its placement is a student decision; the app does not check whether the pin is in an anatomically appropriate position.
5. Record taxonomy, confidence, diagnostic features, the key or reference used, field data, provenance and handling. Up to six supporting photographs can be added.
6. Save the specimen. Drafts can be saved at any stage. Use named drawers, search, order filters and the record table to curate the collection. A specimen can be moved to another drawer from the Photograph tab.
7. **Export → Collection file (.json)** downloads the records and embedded photographs. Keep backups and submit the JSON through the VLE. Opening a file creates a separate editable collection; it does not replace the original.

The assignment brief determines required taxa, specimen numbers, mounting conventions and assessment criteria. Six record checks indicate whether information is present; they do not verify scientific accuracy, ethical practice or grades. Incomplete historical records can still be opened and edited.

## Export formats

- **JSON**: the editable collection, including all stored photographs. Use for backups, transfer to another device and submission.
- **CSV**: metadata table only, suitable for a spreadsheet. Spreadsheet formula prefixes are escaped. A CSV is not a restorable collection.
- **Print / PDF**: a readable portfolio with specimen images, taxonomy, labels, identification evidence, provenance and supporting photographs. Choose Save as PDF in the browser print dialog. A PDF is not a restorable collection.

## Staff review

Select **Review a submission** and open a student JSON file. All editing is disabled for the reviewed collection. Inspect images, labels and evidence, or print/export the submission. **Return to my collection** restores the working collection unchanged. No staff password is required: all records being reviewed are supplied by the person using the browser.

## Storage and privacy

Collections are saved in **IndexedDB in the current browser profile**, without server uploads or central accounts. This gives photographs substantially more room than the previous localStorage implementation. Browser storage can still be cleared or exhausted, so JSON exports remain essential. Save failures display a warning and offer an immediate backup. Anyone using the same browser profile can open its saved collections; a shared computer is not private storage.

The site itself is public on GitHub Pages. Publishing the app does not publish student collections. The app has no cloud sync or automatic submission service. Student and source details are included in exports.

Legacy files with remote HTTPS image links are accepted for compatibility. Opening those images contacts their host, and the image may require CORS permission for preparation. New uploads are embedded and remain local.

## Compatibility with the earlier Entobox

- Imports schema versions 1 and 2 and exports version 3. Legacy single-drawer files are migrated to the current structure.
- Older `collection_<studentId>` entries in the same origin's localStorage are discovered and shown in **Collections**. Their contents are copied to IndexedDB when opened. Original localStorage data is left untouched.
- Old browser-only registration and staff credentials are no longer part of the interface or required to open work. Existing local account records are left untouched; the app never reads or exports their passwords.
- Drawer membership, image data, field photographs, pin coordinates, taxonomy and notes are preserved. Orphaned records are placed in the first drawer; conflicting slot numbers are moved to the next free space, never overwritten.
- The app rejects structurally invalid files, unsupported image schemes and files from newer schema versions. Imports over 150 MB, 1,000 specimens or 100 drawers are rejected with a message.

## Development and deployment

React 19, TypeScript and Vite. Styling and icons are bundled, with no runtime Tailwind or Google Fonts dependency. The application remains entirely static and uses relative asset paths for the existing GitHub Pages address.

```bash
npm ci
npm run dev -- --host 127.0.0.1
npx tsc --noEmit
npm run build
npm run preview
```

The existing workflow in `.github/workflows/deploy.yml` installs the locked dependencies, builds the application and deploys `dist` to GitHub Pages on pushes to `main` or `master`. GitHub Pages uses GitHub Actions as its source.

## Source structure

- `App.tsx`: collection cabinet, search, records, guide, import/export and read-only review.
- `components/Editor.tsx`: specimen photograph, taxonomy, field data and evidence editor.
- `components/ImageEditor.tsx`: framing, rotation, connected background removal, brush erase and undo.
- `components/PinningCanvas.tsx`: pointer and keyboard placement of a virtual pin.
- `components/Dialog.tsx`: native accessible modal with focus containment.
- `services/collection.ts`: data migration, validation, completeness checks and exports.
- `services/storage.ts`: IndexedDB persistence and discovery of legacy collections.
- `services/imageUtils.ts`: local image decoding and resizing.
- `styles.css`: responsive light/dark themes and print portfolio layout.

Photographic evidence cannot replace every diagnostic technique or physical preparation skill. Identification uncertainty and the limits of the available images should form part of the learning exercise.
