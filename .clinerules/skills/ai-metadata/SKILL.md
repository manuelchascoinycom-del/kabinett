# Skill: Generación Manual de Metadatos por IA

## Propósito
Permitir al usuario enriquecer de forma manual e individual archivos que fueron importados masivamente o sincronizados y que no disponen de metadatos automáticos.

## Pasos de Implementación

1. **Interfaz de Usuario (UI):**
   - Añadir un botón de acción rápida (ej. icono de chispa/IA o texto "Generar IA") en las filas de los elementos que carecen de metadatos.
   - Implementar un estado de carga local (loading spinner) para ese elemento específico para evitar múltiples peticiones concurrentes.

2. **Manejador en el Frontend (`page.tsx`):**
   - Crear una función asíncrona `handleGenerateAiMetadata(itemId: string)`.
   - Activar el estado de carga del elemento.
   - Enviar la petición al servicio correspondiente para procesar la IA de ese archivo en específico.

3. **Manejo de Errores y Notificaciones:**
   - Envolver la llamada en un bloque `try/catch`.
   - Mostrar notificaciones flotantes (Toast) de éxito o error según el resultado de la operación.

4. **Actualización de Estado y Filtros:**
   - Actualizar el array principal de elementos en el estado local con los nuevos metadatos devueltos por el backend.
   - **Crítico:** Recalcular inmediatamente la lista filtrada activa (`filteredItems`) para que el elemento actualizado se posicione correctamente según los filtros aplicados en la interfaz.