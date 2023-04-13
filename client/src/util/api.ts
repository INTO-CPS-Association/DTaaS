export default async function fetchProtectedApi(
    url: string
  ): Promise<Response> {
    const accessToken = localStorage.getItem('accessToken');
  
    if (!accessToken) {
      throw new Error('Access token not found');
    }
  
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  
    if (!response.ok) {
      throw new Error(`Request failed: ${response.statusText}`);
    }
  
    return response;
  }