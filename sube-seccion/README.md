# Subir Secciones

Esta carpeta permite subir nuevas secciones de ejercicios al sistema.

## Formato de Archivo

Cada archivo debe seguir el formato JavaScript actual:

```javascript
export const ejercicios = [
  {
    "seccion": "Nombre de la Sección",
    "tema": "Tema del ejercicio",
    "enunciado": "Enunciado del ejercicio",
    "ejercicio": "Contenido del ejercicio (opcional)",
    "id": "Identificador único"
  },
  // ... más ejercicios
];
```

## Instrucciones

1. Crear un archivo `.js` con el nombre de la sección
2. Usar el formato de exportación mostrado arriba
3. El sistema detectará automáticamente el archivo y cargará los ejercicios
4. Cada archivo puede contener múltiples ejercicios de la misma sección

## Ejemplo

Ver los archivos existentes en `/attached_assets/` como referencia del formato.