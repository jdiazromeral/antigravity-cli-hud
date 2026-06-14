import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getQuota } from './quota';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('getQuota', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch and return quota data', async () => {
    const mockData = { used: 10, limit: 100 };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as Response);

    const result = await getQuota('http://localhost:8080');
    expect(result).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/quota');
  });

  it('should throw an error if the response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response);

    await expect(getQuota('http://localhost:8080')).rejects.toThrow('Failed to fetch quota: 500 Internal Server Error');
  });
});
