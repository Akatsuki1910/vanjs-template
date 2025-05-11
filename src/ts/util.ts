export const getCssStyle = (style: Record<string, unknown>) =>
  Object.entries(style)
    .map((v) => `${v[0]}: ${v[1]}`)
    .join("; ");
