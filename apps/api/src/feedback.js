/**
 * Genera retroalimentación personalizada a partir de las calificaciones por
 * criterio de la rúbrica. El texto resultante es un borrador editable que el
 * docente puede ajustar antes de publicarlo al alumno.
 */
export function generateFeedback({ studentName, assignmentTitle, details, totalScore, maxScore }) {
  const pct = maxScore ? Math.round((totalScore / maxScore) * 100) : 0;

  const strengths = details.filter((d) => d.max_points && d.score / d.max_points >= 0.8);
  const improvements = details.filter((d) => d.max_points && d.score / d.max_points < 0.6);
  const mid = details.filter(
    (d) => d.max_points && d.score / d.max_points >= 0.6 && d.score / d.max_points < 0.8
  );

  const lines = [];
  lines.push(`Estimado/a ${studentName},`);
  lines.push('');
  lines.push(
    `Con respecto a tu entrega de "${assignmentTitle}", obtuviste una calificación de ` +
      `${totalScore.toFixed(1)} de ${maxScore} puntos (${pct}%). A continuación ` +
      `encontrarás una retroalimentación detallada.`
  );
  lines.push('');

  if (strengths.length) {
    lines.push('Aspectos destacados:');
    for (const d of strengths) {
      lines.push(`- ${d.criterion_name}: demuestra un buen dominio de este requisito.`);
    }
    lines.push('');
  }

  if (mid.length) {
    lines.push('Áreas por reforzar:');
    for (const d of mid) {
      lines.push(
        `- ${d.criterion_name}: tu desempeño es aceptable, pero aún puedes mejorar ` +
          `alcanza el puntaje máximo posible.`
      );
    }
    lines.push('');
  }

  if (improvements.length) {
    lines.push('Recomendaciones prioritarias:');
    for (const d of improvements) {
      lines.push(
        `- ${d.criterion_name}: revisa los requisitos de la rúbrica y los elementos ` +
          `solicitados en la consigna; este fue el criterio con menor calificación.`
      );
    }
    lines.push('');
  }

  lines.push('Sigue practicando y no dudes en consultar cualquier duda.');
  lines.push('Saludos,');
  lines.push('Equipo docente — SISTEMAIA');

  return lines.join('\n');
}
