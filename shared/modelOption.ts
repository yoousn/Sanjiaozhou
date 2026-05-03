export function buildModelOptionValue(providerId: string, model: string) {
  return `${providerId}::${model}`;
}

export function parseModelOptionValue(value: string) {
  const [providerId = '', ...modelParts] = (value || '').split('::');
  return {
    providerId,
    model: modelParts.join('::'),
  };
}
