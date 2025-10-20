"""Constants for DTaaS CLI configuration"""

# Default resource limits for user containers
DefaultResourceLimits = {
    'cpus': '4',
    'memory': '4g',
    'pids': 4000,
    'shm_size': '512m'
}
