# E-commerce Price Tracker (Node.js & Puppeteer)

Herramienta de automatización para la búsqueda, comparación y seguimiento de precios en tiempo real (Adidas/Zalando). El sistema integra persistencia en base de datos para monitorizar fluctuaciones de mercado y detectar ofertas automáticamente.

##  Funcionalidades
- **Búsqueda Dinámica:** Interacción programática con buscadores internos para localizar modelos (ej: "Samba") en múltiples portales.
- **Histórico de Precios:** Comparación automática entre el precio actual y el registro previo en BD para notificar variaciones.
- **Persistencia SQL:** Registro estructurado de cada consulta para generar trazabilidad de precios por producto.
- **JSON Reader:** Módulo para la importación y procesamiento de datasets externos de forma masiva.
- **Arquitectura Contenedorizada:** Despliegue listo para producción mediante Docker.

## Stack
- **Engine:** Node.js
- **Automation:** Puppeteer (Headless Chrome)
- **Base de Datos:** MySQL / MariaDB
- **Infraestructura:** Docker & Docker Compose

##  Notas Técnicas
- **Web Automation:** Gestión de navegación, interacción con `inputs` de búsqueda y manejo de *lazy-loading* mediante scrolls controlados.
- **Lógica de Comparación:** Algoritmo de contraste de precios (`current` vs `last_stored`) previo a la ejecución de sentencias `UPDATE/INSERT`.
- **Evasión de Bloqueos:** Implementación de User-Agents y cabeceras personalizadas para mitigar la detección de bots en sitios con alta seguridad.
- **Dockerización de Puppeteer:** Configuración del contenedor basada en Debian/Alpine con las dependencias necesarias para ejecutar Chromium en entornos Linux *headless*.
- **Data Normalization:** Limpieza de strings y formateo de divisas para asegurar la coherencia de los datos entre diferentes e-commerce.
