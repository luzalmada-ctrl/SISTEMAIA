import Papa from 'papaparse';
import mammoth from 'mammoth';

export async function parseRubricFile(buffer, mimeType, filename) {
  const ext = filename.split('.').pop().toLowerCase();

  if (ext === 'csv') {
    return parseCSV(buffer);
  } else if (ext === 'doc' || ext === 'docx') {
    return parseDoc(buffer);
  } else {
    throw new Error('Formato de archivo no soportado. Use CSV, DOC o DOCX.');
  }
}

function parseCSV(buffer) {
  return new Promise((resolve, reject) => {
    const text = buffer.toString('utf-8');
    
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const data = extractRubricDataFromCSV(results.data);
          resolve(data);
        } catch (err) {
          reject(err);
        }
      },
      error: (err) => {
        reject(new Error(`Error al parsear CSV: ${err.message}`));
      }
    });
  });
}

function extractRubricDataFromCSV(rows) {
  if (!rows || rows.length === 0) {
    throw new Error('El archivo CSV está vacío');
  }

  const title = rows[0].title || rows[0].titulo || rows[0].Title || rows[0].Título || 'Rúbrica importada';
  const description = rows[0].description || rows[0].descripcion || rows[0].Description || rows[0].Descripción || '';
  
  const criteria = rows
    .map((row, index) => {
      const name = row.criterion || row.criterio || row.name || row.nombre || row.Criteria || row.Criterio || row.Name || row.Nombre;
      const description = row.criterion_description || row.criterio_descripcion || row.description || row.descripcion || '';
      const maxPoints = parseFloat(row.max_points || row.maxpoints || row.puntaje_max || row.maxPoints || row.PuntajeMax || row.max || 10);
      const weight = parseFloat(row.weight || row.peso || row.Weight || row.Peso || 1);

      if (name && name.trim()) {
        return {
          name: name.trim(),
          description: description?.trim() || '',
          max_points: isNaN(maxPoints) ? 10 : maxPoints,
          weight: isNaN(weight) ? 1 : weight
        };
      }
      return null;
    })
    .filter(c => c !== null);

  if (criteria.length === 0) {
    throw new Error('No se encontraron criterios válidos en el CSV. Asegúrese de incluir columnas como "criterion", "criterio", "name" o "nombre".');
  }

  return { title, description, criteria };
}

async function parseDoc(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;
    
    return extractRubricDataFromText(text);
  } catch (err) {
    throw new Error(`Error al parsear documento Word: ${err.message}`);
  }
}

function extractRubricDataFromText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  if (lines.length === 0) {
    throw new Error('El documento está vacío');
  }

  let title = lines[0] || 'Rúbrica importada';
  let description = '';
  const criteria = [];

  let currentCriterion = null;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    const criterionMatch = line.match(/^(criterio|criterion|criteri[oa]|nombre|name):\s*(.+)/i);
    if (criterionMatch) {
      if (currentCriterion && currentCriterion.name) {
        criteria.push(currentCriterion);
      }
      currentCriterion = {
        name: criterionMatch[2].trim(),
        description: '',
        max_points: 10,
        weight: 1
      };
      continue;
    }

    const maxPointsMatch = line.match(/^(puntaje|max|puntos|max_points|maxpoints):\s*(\d+(\.\d+)?)/i);
    if (maxPointsMatch && currentCriterion) {
      currentCriterion.max_points = parseFloat(maxPointsMatch[2]);
      continue;
    }

    const weightMatch = line.match(/^(peso|weight):\s*(\d+(\.\d+)?)/i);
    if (weightMatch && currentCriterion) {
      currentCriterion.weight = parseFloat(weightMatch[2]);
      continue;
    }

    const descMatch = line.match(/^(descripción|description|desc):\s*(.+)/i);
    if (descMatch && currentCriterion) {
      currentCriterion.description = descMatch[2].trim();
      continue;
    }

    if (currentCriterion && !line.match(/^(criterio|criterion|puntaje|max|peso|weight|descripción|description|desc):/i)) {
      if (currentCriterion.description) {
        currentCriterion.description += ' ' + line;
      } else {
        currentCriterion.description = line;
      }
    } else if (!currentCriterion && i === 1) {
      description = line;
    }
  }

  if (currentCriterion && currentCriterion.name) {
    criteria.push(currentCriterion);
  }

  if (criteria.length === 0) {
    throw new Error('No se encontraron criterios válidos en el documento. Use el formato "Criterio: [nombre]" seguido de "Puntaje: [valor]" y "Peso: [valor]".');
  }

  return { title, description, criteria };
}
