export function validateWeekSchema(data) {
  const errors = [];

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return ['Root must be an object'];
  }

  if (typeof data.weekNumber !== 'number') errors.push('weekNumber must be a number');
  if (typeof data.world !== 'number') errors.push('world must be a number');
  if (typeof data.theme !== 'string') errors.push('theme must be a string');

  if (!Array.isArray(data.days)) {
    errors.push('days must be an array');
  } else if (data.days.length === 0) {
    errors.push('days array must not be empty');
  } else {
    data.days.forEach((day, i) => {
      const p = `days[${i}]`;
      if (typeof day.dayNumber !== 'number') errors.push(`${p}.dayNumber must be a number`);
      if (typeof day.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day.date))
        errors.push(`${p}.date must be a string in YYYY-MM-DD format`);
      if (typeof day.label !== 'string') errors.push(`${p}.label must be a string`);
      if (typeof day.objective !== 'string') errors.push(`${p}.objective must be a string`);
      if (!Array.isArray(day.resources)) {
        errors.push(`${p}.resources must be an array`);
      } else {
        day.resources.forEach((r, j) => {
          if (typeof r.name !== 'string') errors.push(`${p}.resources[${j}].name must be a string`);
          if (typeof r.url !== 'string') errors.push(`${p}.resources[${j}].url must be a string`);
        });
      }
      if (typeof day.timeBudgetMinutes !== 'number') errors.push(`${p}.timeBudgetMinutes must be a number`);
      if (!Array.isArray(day.acceptanceCriteria) || day.acceptanceCriteria.length === 0)
        errors.push(`${p}.acceptanceCriteria must be a non-empty array`);
      if (typeof day.xp !== 'number') errors.push(`${p}.xp must be a number`);
    });
  }

  if (!Array.isArray(data.newProblemsSolved)) {
    errors.push('newProblemsSolved must be an array');
  } else {
    data.newProblemsSolved.forEach((p, i) => {
      const pref = `newProblemsSolved[${i}]`;
      if (typeof p.problem !== 'string') errors.push(`${pref}.problem must be a string`);
      if (typeof p.solvedDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(p.solvedDate))
        errors.push(`${pref}.solvedDate must be YYYY-MM-DD`);
    });
  }

  return errors;
}
