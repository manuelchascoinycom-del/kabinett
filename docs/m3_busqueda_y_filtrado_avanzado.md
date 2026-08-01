# Módulo 3: Búsqueda y Filtrado Avanzado

Este módulo define las historias de usuario relacionadas con los mecanismos de localización de información mediante indexación de texto completo (Full-Text Search) y la segmentación reactiva de la biblioteca a través de facetas jerárquicas.

---

## KAB-US-007: Buscador global indexado con soporte Full-Text Search

### Narrativa
* **Como** usuario buscando un documento específico  
* **Quiero** una barra de búsqueda global indexada  
* **Para** rastrear coincidencias tanto en metadatos como en el texto completo del interior de los PDFs de forma instantánea.

### Criterios de Aceptación

> ⚡ **Caso de rendimiento y activación**
> * **Dado** que introduzco un término de búsqueda (ej. un apellido de compositor o una frase exacta extraída del texto interno del documento),  
> * **Cuando** pulso `Enter` o escribo el tercer carácter en la caja de búsqueda,  
> * **Entonces** el sistema debe consultar los índices vectoriales o de texto completo (FTS de PostgreSQL) y listar los resultados coincidentes en menos de 1 segundo.

---

## KAB-US-008: Panel lateral de filtros dinámicos y facetados

### Narrativa
* **Como** usuario explorando mi biblioteca  
* **Quiero** un panel lateral de filtros dinámicos  
* **Para** acotar los resultados por etiquetas, autores o campos personalizados con muy pocos clics.

### Criterios de Aceptación

> 🔄 **Caso acumulativo y reactivo**
> * **Dado** que tengo aplicada una búsqueda o me encuentro en la vista global de la biblioteca,  
> * **Cuando** selecciono múltiples filtros en el panel lateral (ej. *Autor: "Bach"* **AND** *Etiqueta: "#Partitura"*),  
> * **Entonces** la lista central de documentos debe actualizarse de forma reactiva e instantánea aplicando una lógica booleana estricta, mostrando además el conteo dinámico (facetas) disponible para el resto de los filtros.