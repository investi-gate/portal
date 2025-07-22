export function buildInsertPlaceholders<Keys extends string>(data: Record<Keys, unknown>) {
  const cols: Keys[] = [];
  const placeholders: string[] = [];
  const values: unknown[] = [];

  let i = 0;
  for (const key in data) {
    cols.push(key);
    placeholders.push(`$${i+1}`);
    values.push(data[key]);
    i+=1
  }

  return {
    cols: cols.join(', '),
    placeholders: placeholders.join(`, `),
    values,
  }
}

export function buildUpdateSetClause<Keys extends string>(
  data: Partial<Record<Keys, unknown>>, 
  startParamIndex = 1
) {
  const setClause: string[] = [];
  const values: unknown[] = [];
  
  let paramIndex = startParamIndex;
  for (const key in data) {
    if (data[key] !== undefined) {
      setClause.push(`${key} = $${paramIndex}`);
      values.push(data[key]);
      paramIndex++;
    }
  }
  
  return {
    setClause: setClause.join(', '),
    values,
    nextParamIndex: paramIndex
  };
}
