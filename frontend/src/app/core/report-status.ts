export function reportStatus(count: number): { label: string; level: string } {
  return count >= 3
    ? { label: 'Barrera recurrente', level: 'high' }
    : count > 0
      ? { label: 'Barrera reportada', level: 'warning' }
      : { label: 'Sin información', level: 'unknown' };
}
