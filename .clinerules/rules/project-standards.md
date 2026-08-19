# Estándares del Proyecto Kabinett

## 1. Arquitectura y Componentes
- Utilizar **Next.js App Router** (`app/` directory).
- Los componentes interactivos deben incluir `'use client';` en la primera línea.
- Modularizar la interfaz separando modales (`components/modals/`) y elementos de UI (`components/ui/`).

## 2. Tipado estricto en TypeScript
- **Prohibido el uso excesivo de `any`**. Definir interfaces claras para las props de los componentes (ej. `CustomFieldsModalProps`, `EditMetadataModalProps`).
- Si una función manejadora puede ser llamada tanto desde un evento de formulario (`React.FormEvent`) como de forma manual mediante un botón, tipar el evento como opcional: `(e?: React.FormEvent) => void` o `() => void`.
- Asegurar la concordancia exacta entre el nombre de las props definidas en la interfaz del componente y cómo se invocan en el archivo padre (`page.tsx`).

## 3. Estilos y Diseño UI
- Utilizar exclusivamente **Tailwind CSS** combinado con las variables CSS personalizadas del tema de la aplicación (ej: `bg-[var(--panel-bg-muted)]`, `border-[color:var(--border-color)]`, `text-[color:var(--text-primary)]`).
- Mantener la paleta de colores coherente (esmeralda para acciones de éxito/guardar, púrpura para campos personalizados, tonos neutros para bordes y fondos).

## 4. Gestión de Estado y Filtros
- Tras cualquier mutación de datos (creación, borrado, sincronización o actualización de metadatos por IA), los estados locales y las listas filtradas deben recalcularse inmediatamente para reflejar los cambios en tiempo real sin recargar la página.

- NEVER use heavy terminal search commands (like `dir /s`, `ls -r`, or complex greps) to find files or code snippets. 
- If a file path is needed, ask the user or look directly into known directories.
- Go straight to reading or editing the specified files without exploratory terminal commands.
- Minimize tool-use steps and be token-efficient.