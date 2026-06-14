export interface Quota {
  used: number;
  limit: number;
}

export async function getQuota(baseUrl: string): Promise<Quota> {
  const url = `${baseUrl.replace(/\/$/, '')}/quota`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch quota: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}
