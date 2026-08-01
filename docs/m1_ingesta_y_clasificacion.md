# Módulo 1: Ingestión y Procesamiento Inteligente

Este módulo describe las historias de usuario necesarias para la carga de documentos, su procesamiento asíncrono utilizando colas de tareas y la extracción inteligente de metadatos mediante IA.

---

## KAB-US-001: Subida de archivos por arrastrar y soltar (Drag & Drop)

### Narrativa
* **Como** usuario de Kabinett  
* **Quiero** poder arrastrar uno o varios archivos PDF a la pantalla principal  
* **Para** cargarlos en mi biblioteca de forma rápida y sin usar menús complejos.

### Criterios de Aceptación

> 👍 **Caso de éxito** > * **Dado** que estoy en el dashboard principal,  
> * **Cuando** arrastro un archivo `.pdf` válido a la zona de soltado (Dropzone),  
> * **Entonces** el sistema debe mostrar un indicador visual de progreso de subida por cada archivo y añadirlo a la cola de procesamiento.

> ⚠️ **Caso alternativo (Formato inválido)** > * **Dado** que intento subir un archivo con extensión no válida (ej. `.exe`, `.mp3`),  
> * **Cuando** lo suelto en la zona,  
> * **Entonces** el sistema debe rechazarlo inmediatamente y mostrar un mensaje de error claro: *"Formato no soportado en esta versión"*.

---

## KAB-US-002: Procesamiento asíncrono y lectura OCR del PDF

### Narrativa
* **Como** sistema de Kabinett  
* **Quiero** procesar los archivos subidos en segundo plano usando OCR  
* **Para** extraer el texto completo de las primeras páginas y prepararlo para el análisis de la IA sin bloquear al usuario.

### Criterios de Aceptación

> 👍 **Caso de éxito** > * **Dado** que un archivo PDF ha terminado de subirse,  
> * **Cuando** entra en la cola de procesamiento asíncrona,  
> * **Entonces** el sistema debe ejecutar una extracción de texto (u OCR si es una partitura/documento escaneado como imagen) de las primeras 3 a 5 páginas de forma transparente.

> ❌ **Caso de error (Archivo corrupto)** > * **Dado** un PDF protegido por contraseña o corrupto,  
> * **Cuando** falla la lectura del flujo,  
> * **Entonces** el sistema debe marcar el estado del archivo como *"Error de lectura"* y notificar al usuario en el panel de carga.

---

## KAB-US-003: Sugerencia e indexación automática de metadatos por IA

### Narrativa
* **Como** usuario administrador  
* **Quiero** que la IA analice el texto extraído del PDF para sugerir campos clave  
* **Para** agilizar la catalogación del documento sin tener que rellenar fichas manualmente.

### Criterios de Aceptación

> 👍 **Caso de éxito** > * **Dado** que el texto de un PDF ha sido extraído,  
> * **Cuando** el módulo de IA (LLM) procese el fragmento,  
> * **Entonces** debe devolver una propuesta estructurada con:
>   * Título
>   * Autor/Compositor
>   * Un *array* de etiquetas iniciales.

> ✏️ **Caso de validación** > * **Dado** que el usuario visualiza el documento recién subido,  
> * **Cuando** revisa las sugerencias de la IA,  
> * **Entonces** debe poder confirmarlas con un botón de *"Aceptar"* o editarlas en el formulario antes de guardarlas definitivamente.