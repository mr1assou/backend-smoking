/** Default avatar file under `assets/profiles/`. */
export function defaultProfileFileName(
  sex: string | null | undefined,
): 'profile1.png' | 'profile2.png' {
  if (sex === 'Male') return 'profile1.png';
  return 'profile2.png';
}
