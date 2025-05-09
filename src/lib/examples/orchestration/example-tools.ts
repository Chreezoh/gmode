import { Tool } from '../../orchestration/types';

/**
 * Example weather tool
 */
export const weatherTool: Tool = {
  name: 'get_weather',
  description: 'Get the current weather for a location',
  parameters: {
    location: {
      type: 'string',
      description: 'The city and state, e.g., San Francisco, CA',
    },
    unit: {
      type: 'string',
      enum: ['celsius', 'fahrenheit'],
      description: 'The unit of temperature to use',
      optional: true,
      default: 'celsius',
    },
  },
  execute: async (args: { location: string; unit?: string }) => {
    // This is a mock implementation
    console.log(`Getting weather for ${args.location} in ${args.unit || 'celsius'}`);
    
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    // Return mock data
    return {
      location: args.location,
      temperature: args.unit === 'fahrenheit' ? 72 : 22,
      unit: args.unit || 'celsius',
      condition: 'sunny',
      humidity: 45,
      windSpeed: 10,
    };
  },
};

/**
 * Example calendar tool
 */
export const calendarTool: Tool = {
  name: 'check_calendar',
  description: 'Check the user\'s calendar for events',
  parameters: {
    date: {
      type: 'string',
      description: 'The date to check in ISO format (YYYY-MM-DD)',
    },
    timeZone: {
      type: 'string',
      description: 'The time zone to use',
      optional: true,
      default: 'UTC',
    },
  },
  execute: async (args: { date: string; timeZone?: string }) => {
    // This is a mock implementation
    console.log(`Checking calendar for ${args.date} in ${args.timeZone || 'UTC'}`);
    
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 700));
    
    // Return mock data
    return {
      date: args.date,
      timeZone: args.timeZone || 'UTC',
      events: [
        {
          title: 'Team Meeting',
          startTime: '09:00',
          endTime: '10:00',
          attendees: ['john@example.com', 'jane@example.com'],
        },
        {
          title: 'Lunch with Client',
          startTime: '12:30',
          endTime: '13:30',
          attendees: ['client@example.com'],
        },
      ],
    };
  },
};

/**
 * Example email tool
 */
export const emailTool: Tool = {
  name: 'send_email',
  description: 'Send an email to a recipient',
  parameters: {
    to: {
      type: 'string',
      description: 'The email address of the recipient',
    },
    subject: {
      type: 'string',
      description: 'The subject of the email',
    },
    body: {
      type: 'string',
      description: 'The body of the email',
    },
    cc: {
      type: 'string',
      description: 'Email addresses to CC, comma-separated',
      optional: true,
    },
  },
  execute: async (args: { to: string; subject: string; body: string; cc?: string }) => {
    // This is a mock implementation
    console.log(`Sending email to ${args.to} with subject "${args.subject}"`);
    console.log(`CC: ${args.cc || 'none'}`);
    console.log(`Body: ${args.body}`);
    
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Return mock data
    return {
      success: true,
      messageId: `mock-${Date.now()}`,
      sentAt: new Date().toISOString(),
    };
  },
};

/**
 * Example search tool
 */
export const searchTool: Tool = {
  name: 'search_web',
  description: 'Search the web for information',
  parameters: {
    query: {
      type: 'string',
      description: 'The search query',
    },
    numResults: {
      type: 'number',
      description: 'The number of results to return',
      optional: true,
      default: 5,
    },
  },
  execute: async (args: { query: string; numResults?: number }) => {
    // This is a mock implementation
    console.log(`Searching for "${args.query}" with ${args.numResults || 5} results`);
    
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1200));
    
    // Return mock data
    return {
      query: args.query,
      results: [
        {
          title: 'Example Search Result 1',
          url: 'https://example.com/result1',
          snippet: 'This is an example search result that matches the query.',
        },
        {
          title: 'Example Search Result 2',
          url: 'https://example.com/result2',
          snippet: 'Another example search result with relevant information.',
        },
      ],
    };
  },
};

/**
 * All example tools
 */
export const exampleTools: Tool[] = [
  weatherTool,
  calendarTool,
  emailTool,
  searchTool,
];
