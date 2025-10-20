#!/usr/bin/env python3
"""
Verification script to demonstrate resource limits are correctly applied
"""
import sys
import os

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from pkg import config, users

def verify_resource_limits():
    """Verify that resource limits are correctly read and applied"""
    print("=== DTaaS Resource Limits Verification ===\n")
    
    try:
        # Test 1: Read config
        print("1. Testing configuration reading...")
        configObj = config.Config()
        resourceLimits, err = configObj.getResourceLimits()
        if err:
            print(f"   ❌ Error reading config: {err}")
            return False
        
        print(f"   ✓ Resource limits from config:")
        print(f"     - CPUs: {resourceLimits['cpus']}")
        print(f"     - Memory: {resourceLimits['memory']}")
        print(f"     - PIDs: {resourceLimits['pids']}")
        print(f"     - Shared Memory: {resourceLimits['shm_size']}\n")
        
        # Test 2: Generate compose config
        print("2. Testing compose config generation...")
        username = "testuser"
        server = "localhost"
        path = "/test/path"
        
        composeConfig, err = users.getComposeConfig(username, server, path, resourceLimits)
        if err:
            print(f"   ❌ Error generating compose config: {err}")
            return False
        
        print(f"   ✓ Compose config generated for user '{username}'")
        
        # Test 3: Verify resource limits in compose config
        print("3. Verifying resource limits in compose config...")
        if 'deploy' not in composeConfig:
            print("   ❌ No 'deploy' section found")
            return False
        
        if 'resources' not in composeConfig['deploy']:
            print("   ❌ No 'resources' section found")
            return False
        
        if 'limits' not in composeConfig['deploy']['resources']:
            print("   ❌ No 'limits' section found")
            return False
        
        limits = composeConfig['deploy']['resources']['limits']
        print(f"   ✓ Resource limits in compose config:")
        print(f"     - CPUs: {limits['cpus']}")
        print(f"     - Memory: {limits['memory']}")
        print(f"     - PIDs: {limits['pids']}")
        print(f"     - Shared Memory: {composeConfig['shm_size']}\n")
        
        # Test 4: Verify limits match config
        print("4. Verifying limits match configuration...")
        if limits['cpus'] != str(resourceLimits['cpus']):
            print(f"   ❌ CPU mismatch: {limits['cpus']} != {resourceLimits['cpus']}")
            return False
        
        if limits['memory'] != str(resourceLimits['memory']):
            print(f"   ❌ Memory mismatch: {limits['memory']} != {resourceLimits['memory']}")
            return False
        
        if limits['pids'] != str(resourceLimits['pids']):
            print(f"   ❌ PIDs mismatch: {limits['pids']} != {resourceLimits['pids']}")
            return False
        
        if composeConfig['shm_size'] != str(resourceLimits['shm_size']):
            print(f"   ❌ SHM mismatch: {composeConfig['shm_size']} != {resourceLimits['shm_size']}")
            return False
        
        print("   ✓ All limits match configuration\n")
        
        print("=== ✅ All verification tests passed! ===")
        return True
        
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = verify_resource_limits()
    sys.exit(0 if success else 1)
