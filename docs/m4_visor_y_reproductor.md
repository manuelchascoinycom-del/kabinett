# Módulo 4: Visor de Documentos Optimizado

Este módulo especifica las historias de usuario relacionadas con la renderización fluida de los archivos PDF dentro de la aplicación web y la implementación del Modo Atril, enfocado en maximizar la visibilidad del documento en escenarios de uso intensivo o en tiempo real.

---

## KAB-US-009: Visor nativo de PDF integrado de alto rendimiento

### Narrativa
* **Como** usuario lector/músico  
* **Quiero** un visor nativo de PDF integrado dentro de la aplicación  
* **Para** poder consumir mis documentos directamente sin necesidad de descargarlos al equipo local.

### Criterios de Aceptación

> ⚡ **Caso de renderizado y fluidez**
> * **Dado** que hago clic sobre un documento de la biblioteca,  
> * **Cuando** se abre la vista de detalle,  
> * **Entonces** el visor integrado en el frontend debe renderizar el PDF rápidamente e incorporar controles esenciales de zoom, ajuste a la anchura de la pantalla y paginación secuencial. 
> * **Además**, la navegación o paso de hojas en archivos pesados (grandes colecciones o libros escaneados) debe ser fluida, con una respuesta inferior a 0.5 segundos.

---

## KAB-US-010: Modo Lectura / Rendimiento a pantalla completa (Modo Atril)

### Narrativa
* **Como** músico o lector intensivo en tabletas  
* **Quiero** un Modo Rendimiento / Modo Atril a pantalla completa  
* **Para** maximizar el espacio de lectura y eliminar cualquier distracción visual de la interfaz.

### Criterios de Aceptación

> 🖥️ **Caso de visualización inmersiva**
> * **Dado** que tengo un PDF abierto en el visor integrado,  
> * **Cuando** activo el 'Modo Atril' desde el panel de control,  
> * **Entonces** la interfaz de la aplicación debe colapsar y ocultar de forma animada la barra lateral, menús superiores y botones secundarios, dejando exclusivamente el lienzo del documento visible.
> * **Además**, el cambio de página dentro de este modo se debe poder activar mediante clics/toques en los extremos laterales de la pantalla o a través de las flechas de dirección del teclado.