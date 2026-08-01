# Módulo 2: Organización y Personalización

Este módulo detalla las historias de usuario relacionadas con la organización lógica de los documentos a través de agrupaciones virtuales, la flexibilidad del sistema mediante metadatos dinámicos y la taxonomía transversal por etiquetas.

---

## KAB-US-004: Creación y asignación de Colecciones Virtuales

### Narrativa
* **Como** usuario con una gran biblioteca  
* **Quiero** crear colecciones virtuales para agrupar mis documentos por categorías lógicas  
* **Para** no duplicar los archivos físicamente en el almacenamiento de mi servidor.

### Criterios de Aceptación

> 👍 **Caso de éxito**
> * **Dado** que tengo varios documentos en mi biblioteca,  
> * **Cuando** creo una nueva "Colección" y le asigno archivos,  
> * **Entonces** estos deben vincularse lógicamente a ella en la base de datos (relación muchos a muchos) manteniendo su presencia en la vista global.

> 🔄 **Caso de desasignación**
> * **Dado** que elimino un archivo de una colección específica,  
> * **Cuando** se ejecuta la acción,  
> * **Entonces** el archivo debe desaparecer de esa lista pero permanecer intacto en la biblioteca raíz y en el almacenamiento físico.

---

## KAB-US-005: Configuración de Campos Personalizados dinámicos

### Narrativa
* **Como** usuario con necesidades específicas (ej. músico o investigador)  
* **Quiero** poder definir campos personalizados en mi biblioteca  
* **Para** estructurar la información según el tipo de archivo que gestiono (ej. Época, Dificultad, Instrumento).

### Criterios de Aceptación

> 🛠️ **Caso de creación**
> * **Dado** que accedo a la configuración de la biblioteca,  
> * **Cuando** añado un campo personalizado (ej. *"Dificultad"* de tipo Selección/Dropdown),  
> * **Entonces** este campo debe inyectarse inmediatamente (vía esquema dinámico o JSONB) en la vista de metadatos de todos los documentos existentes y futuros para permitir la carga de sus respectivos valores.

---

## KAB-US-006: Sistema de etiquetado libre (Tags)

### Narrativa
* **Como** usuario organizador  
* **Quiero** poder asignar y desasignar etiquetas independientes a mis documentos  
* **Para** agruparlos bajo taxonomías transversales y sumamente flexibles.

### Criterios de Aceptación

> ⚡ **Caso de entrada rápida y predictivo**
> * **Dado** que estoy editando los metadatos de un documento,  
> * **Cuando** escribo una nueva etiqueta y pulso la tecla `Enter` o `Coma`,  
> * **Entonces** el sistema debe crear la etiqueta visual, guardarla en el repositorio global y asociarla al archivo. 
> * **Además**, debe incluir un buscador predictivo (auto-completado) si los caracteres ingresados coinciden con una etiqueta ya existente en el sistema.