// index.js (ui barrel)
/*
  FILE: src/components/ui/index.js
  LAYMAN (Tropang Ex): Isang pintuan para sa lahat ng UI building blocks. Imbes na
  mag-import kada file, isang linya lang: import { Button, Card, Modal, ... } from
  '../components/ui'.

  TECHNICAL: Barrel re-exporting all design-system primitives. Also imports the shared
  ui.css once so any consumer of these components gets the styles. (ui.css is ALSO
  imported in src/index.js to guarantee global availability even before first use.)
*/
import './ui.css';

export { default as Button } from './Button';
export { default as Card, CardHeader } from './Card';
export { default as Badge, StatusPill } from './Badge';
export { default as Field, Input, Select, Textarea } from './Field';
export { default as Modal } from './Modal';
export { default as EmptyState } from './EmptyState';
export { default as Spinner, SpinnerBlock, Skeleton, SkeletonCardGrid, SkeletonRows } from './Feedback';
export { default as DataTable } from './DataTable';
export { default as AppShell, Sidebar } from './AppShell';
