import { saveToolConfig, getToolConfig, getAllToolConfigs, deleteToolConfig } from '../toolConfigs';
import { supabase } from '../supabase';

// Mock the Supabase client
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
  },
}));

describe('Tool Configuration Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockUserId = 'test-user-id';
  const mockToolName = 'test-tool';
  const mockConfig = {
    api_key: 'test-api-key',
    settings: { option1: true, option2: false }
  };

  describe('saveToolConfig', () => {
    it('should save a new tool configuration when one does not exist', async () => {
      // Mock the check for existing config
      (supabase.from as jest.Mock).mockReturnThis();
      (supabase.select as jest.Mock).mockReturnThis();
      (supabase.eq as jest.Mock).mockReturnThis();
      (supabase.maybeSingle as jest.Mock).mockResolvedValue({ data: null, error: null });

      // Mock the insert operation
      (supabase.from as jest.Mock).mockReturnThis();
      (supabase.insert as jest.Mock).mockReturnThis();
      (supabase.select as jest.Mock).mockReturnThis();
      (supabase.single as jest.Mock).mockResolvedValue({
        data: {
          id: 'new-id',
          user_id: mockUserId,
          tool_name: mockToolName,
          config_json: mockConfig,
          created_at: new Date().toISOString()
        },
        error: null
      });

      const result = await saveToolConfig({
        user_id: mockUserId,
        tool_name: mockToolName,
        config_json: mockConfig
      });

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data?.tool_name).toBe(mockToolName);
      expect(result.data?.config_json).toEqual(mockConfig);
      expect(supabase.from).toHaveBeenCalledWith('tool_configs');
      expect(supabase.insert).toHaveBeenCalledWith({
        user_id: mockUserId,
        tool_name: mockToolName,
        config_json: mockConfig
      });
    });

    it('should update an existing tool configuration', async () => {
      // Mock the check for existing config
      (supabase.from as jest.Mock).mockReturnThis();
      (supabase.select as jest.Mock).mockReturnThis();
      (supabase.eq as jest.Mock).mockReturnThis();
      (supabase.maybeSingle as jest.Mock).mockResolvedValue({
        data: { id: 'existing-id' },
        error: null
      });

      // Mock the update operation
      (supabase.from as jest.Mock).mockReturnThis();
      (supabase.update as jest.Mock).mockReturnThis();
      (supabase.eq as jest.Mock).mockReturnThis();
      (supabase.select as jest.Mock).mockReturnThis();
      (supabase.single as jest.Mock).mockResolvedValue({
        data: {
          id: 'existing-id',
          user_id: mockUserId,
          tool_name: mockToolName,
          config_json: mockConfig,
          created_at: new Date().toISOString()
        },
        error: null
      });

      const result = await saveToolConfig({
        user_id: mockUserId,
        tool_name: mockToolName,
        config_json: mockConfig
      });

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(supabase.from).toHaveBeenCalledWith('tool_configs');
      expect(supabase.update).toHaveBeenCalledWith({
        config_json: mockConfig
      });
      expect(supabase.eq).toHaveBeenCalledWith('id', 'existing-id');
    });

    it('should handle errors when saving a tool configuration', async () => {
      // Mock the check for existing config to throw an error
      (supabase.from as jest.Mock).mockReturnThis();
      (supabase.select as jest.Mock).mockReturnThis();
      (supabase.eq as jest.Mock).mockReturnThis();
      (supabase.maybeSingle as jest.Mock).mockResolvedValue({
        data: null,
        error: new Error('Database error')
      });

      const result = await saveToolConfig({
        user_id: mockUserId,
        tool_name: mockToolName,
        config_json: mockConfig
      });

      // Check that the result has an error
      expect(result.error).toBeDefined();
    });
  });

  // Additional tests for getToolConfig, getAllToolConfigs, and deleteToolConfig would follow a similar pattern
});
