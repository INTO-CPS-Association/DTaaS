/**
 * Database configuration
 */
export const DB_CONFIG = {
  name: 'DTaaS',
  version: 2,
  stores: {
    executionHistory: {
      keyPath: 'id',
      indexes: [
        { name: 'dtName', keyPath: 'dtName' },
        { name: 'timestamp', keyPath: 'timestamp' },
      ],
    },
    measurementHistory: {
      keyPath: 'id',
      indexes: [
        { name: 'taskName', keyPath: 'taskName' },
        { name: 'timestamp', keyPath: 'timestamp' },
      ],
    },
  },
};

export default DB_CONFIG;
