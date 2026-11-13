# Instrucciones para Extracción Automática de Rúbricas

## Funcionalidad Implementada

Se ha implementado la extracción automática de información de archivos de rúbricas (CSV, DOC, DOCX) para completar los campos del formulario automáticamente.

## Formatos Soportados

### 1. Archivos CSV

El archivo CSV debe tener las siguientes columnas (en español o inglés):

- **Título**: `title`, `titulo`, `Title`, `Título`
- **Descripción**: `description`, `descripcion`, `Description`, `Descripción`
- **Criterio**: `criterion`, `criterio`, `name`, `nombre`, `Criteria`, `Criterio`, `Name`, `Nombre`
- **Puntaje Máximo**: `max_points`, `maxpoints`, `puntaje_max`, `maxPoints`, `PuntajeMax`, `max`
- **Peso**: `weight`, `peso`, `Weight`, `Peso`

**Ejemplo de CSV:**
```csv
title,description,criterion,max_points,weight
Rúbrica de evaluación de SolidWorks,Evaluación de piezas 3D en SolidWorks,Geometría correcta,10,1
Rúbrica de evaluación de SolidWorks,Evaluación de piezas 3D en SolidWorks,Materiales aplicados,5,0.8
Rúbrica de evaluación de SolidWorks,Evaluación de piezas 3D en SolidWorks,Cotizaciones,5,0.7
```

### 2. Archivos DOC/DOCX

El documento Word debe seguir el siguiente formato:

```
[Título de la rúbrica]
[Descripción opcional]

Criterio: [Nombre del criterio]
Puntaje: [Valor numérico]
Peso: [Valor numérico]
Descripción: [Descripción del criterio]
```

**Ejemplo de DOC/DOCX:**
```
Rúbrica de evaluación de Diseño
Evaluación de proyectos de diseño gráfico

Criterio: Composición visual
Puntaje: 10
Peso: 1
Descripción: Evaluación del equilibrio y armonía visual

Criterio: Uso de color
Puntaje: 8
Peso: 0.9
Descripción: Adecuación de la paleta de colores al proyecto

Criterio: Tipografía
Puntaje: 7
Peso: 0.8
Descripción: Legibilidad y coherencia tipográfica
```

## Cómo Usar

1. Ve a la página de **Rúbricas** en la aplicación
2. Haz clic en **"+ Nueva rúbrica"**
3. En el campo "Archivo adjunto", selecciona un archivo CSV, DOC o DOCX
4. Si el archivo es de formato soportado (CSV, DOC, DOCX), aparecerá un botón **"📄 Extraer datos del archivo"**
5. Haz clic en ese botón para procesar el archivo
6. Los campos (título, descripción y criterios) se llenarán automáticamente con la información extraída
7. Revisa y ajusta los datos si es necesario
8. Haz clic en **"Guardar"** para crear la rúbrica

## Archivos de Prueba

Se ha creado un archivo de prueba `test_rubric.csv` en la raíz del proyecto que puedes usar para probar la funcionalidad.

## Notas

- La extracción de datos es opcional. Puedes seguir llenando los campos manualmente como antes.
- Los campos extraídos no sobrescriben los campos que ya tienes llenos (a menos que estén vacíos).
- Si el archivo no tiene el formato correcto, se mostrará un mensaje de error explicando el problema.
- Los valores numéricos (puntaje y peso) deben ser números válidos. Si no se pueden parsear, se usarán valores por defecto (10 para puntaje, 1 para peso).
