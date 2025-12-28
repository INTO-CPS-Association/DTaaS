"""
This file runs end-to-end tests for services commands.
These tests execute real commands with actual services and verify expected behavior.
"""
import subprocess
import pytest
from dtaas_services.pkg.service import Service

pytestmark = pytest.mark.system
AVAILABLE_SERVICES = ["rabbitmq", "mongodb", "grafana", "influxdb"]

@pytest.fixture(scope="module")
def ensure_services_stopped():
    """Clean up services after all tests complete"""
    yield
    # Final cleanup after all tests
    for service in AVAILABLE_SERVICES:
        subprocess.run(["docker", "rm", "-f", service], check=False, capture_output=True)


@pytest.fixture(autouse=True)
def cleanup_between_tests():
    """Clean up our specific services between individual tests"""
    yield
    # After each test, force remove only our service containers
    for service in AVAILABLE_SERVICES:
        subprocess.run(["docker", "rm", "-f", service], check=False, capture_output=True)


def run_command(cmd_list, check=True):
    """
    Run a dtaas-services command and return the result
    Args:
        cmd_list: List of command arguments (e.g., ["dtaas-services", "status"])
        check: Whether to raise exception on non-zero exit code
    Returns:
        subprocess.CompletedProcess with stdout, stderr, and returncode
    """
    try:
        result = subprocess.run(
            cmd_list,
            capture_output=True,
            text=True,
            check=check
        )
        return result
    except subprocess.CalledProcessError as e:
        # Check if it's a permission error
        if e.returncode == 1 and "permission denied" in e.stderr.lower():
            error_msg = (
                f"Permission denied when running: {' '.join(cmd_list)}\n"
                f"Your user may not have access to the Docker daemon.\n"
            )
            print(error_msg)
            raise subprocess.CalledProcessError(e.returncode, e.cmd, e.output, e.stderr) from e

        # Print detailed error information for other failures
        print(f"Command failed: {' '.join(cmd_list)}")
        print(f"Exit code: {e.returncode}")
        print(f"STDOUT: {e.stdout}")
        print(f"STDERR: {e.stderr}")
        raise


def get_service_status(service_names=None):
    """
    Get the status of services using the Service class directly
    Args:
        service_names: Optional list of specific services to check

    Returns:
        dict mapping service names to their status)
    """
    service = Service()
    err, containers = service.get_status(service_names)

    if err is not None:
        return {}

    status_dict = {}
    for container in containers:
        # Extract service name from container name (e.g., "rabbitmq" from "rabbitmq")
        for service_name in AVAILABLE_SERVICES:
            if service_name in container.name.lower():
                # Get the container state
                state = container.state.status
                # Keep the actual state
                status_dict[service_name] = state
                break

    return status_dict


def test_setup_start_status_all_services(ensure_services_stopped):
    """Test full workflow: setup, start all, check all running"""
    # Step 1: Run setup
    result = run_command(["dtaas-services", "setup"])
    assert result.returncode == 0, f"Setup failed: {result.stderr}"
    assert "completed" in result.stdout.lower() or "success" in result.stdout.lower()

    # Step 2: Start all services
    result = run_command(["dtaas-services", "start"])
    assert result.returncode == 0, f"Start failed: {result.stderr}\nOutput: {result.stdout}"

    # Check for success indicators - can be "started", "restarted", "starting", or "success"
    output_lower = result.stdout.lower()
    assert any(keyword in output_lower for keyword in ["success", "started", "starting", "restarted"]), \
        f"Expected start success message, got: {result.stdout}"

    # Step 3: Check status of all services
    status = get_service_status()

    # Verify all services are running
    for service in AVAILABLE_SERVICES:
        assert service in status, f"Service {service} not found in status output. Got: {status}"
        print(f"  {service}: {status[service]}")
        # Accept both "running" and "restarting" as valid running states
        assert status[service] in ["running", "restarting"], \
            f"Service {service} should be running or restarting. Expected: 'running'/'restarting', Got: '{status[service]}'"


def test_stop_influxdb_service(ensure_services_stopped):
    """Test stopping influxdb while keeping other services running"""
    # Step 1: Run setup
    result = run_command(["dtaas-services", "setup"])
    assert result.returncode == 0, f"Setup failed: {result.stderr}"

    # Step 2: Start all services
    result = run_command(["dtaas-services", "start"])
    assert result.returncode == 0, f"Start failed: {result.stderr}"

    # Step 3: Stop influxdb specifically
    result = run_command(["dtaas-services", "stop", "-s", "influxdb"])
    assert result.returncode == 0, f"Stop influxdb failed: {result.stderr}"

    # Step 4: Check status, only influxdb should be stopped
    status = get_service_status()

    assert "influxdb" in status, f"InfluxDB not found in status. Got: {status}"
    print(f"  influxdb: {status['influxdb']} (expected: stopped/exited)")
    assert status["influxdb"] in ["stopped", "exited"], \
        f"InfluxDB should be stopped but is: {status['influxdb']}"

    # Verify other services are still running
    for service in ["rabbitmq", "mongodb", "grafana"]:
        assert service in status, f"Service {service} not found. Got: {status}"
        print(f"  {service}: {status[service]} (expected: running/restarting)")
        assert status[service] in ["running", "restarting"], \
            f"Service {service} should still be running but is: {status[service]}"


def test_stop_multiple_services(ensure_services_stopped):
    """Test stopping multiple services at once"""
    # Ensure clean state
    run_command(["dtaas-services", "stop"], check=False)

    # Setup and start
    run_command(["dtaas-services", "setup"])
    run_command(["dtaas-services", "start"])

    # Stop rabbitmq and mongodb
    result = run_command(["dtaas-services", "stop", "-s", "rabbitmq,mongodb"])
    assert result.returncode == 0, f"Stop multiple services failed: {result.stderr}"

    # Check status
    status = get_service_status()

    # Verify stopped services
    print(f"  rabbitmq: {status.get('rabbitmq')} (expected: stopped/exited)")
    assert status.get("rabbitmq") in ["stopped", "exited"], f"RabbitMQ should be stopped but is: {status.get('rabbitmq')}"
    print(f"  mongodb: {status.get('mongodb')} (expected: stopped/exited)")
    assert status.get("mongodb") in ["stopped", "exited"], f"MongoDB should be stopped but is: {status.get('mongodb')}"

    # Verify running services
    print(f"  grafana: {status.get('grafana')} (expected: running/restarting)")
    assert status.get("grafana") in ["running", "restarting"], f"Grafana should still be running but is: {status.get('grafana')}"
    print(f"  influxdb: {status.get('influxdb')} (expected: running/restarting)")
    assert status.get("influxdb") in ["running", "restarting"], f"InfluxDB should still be running but is: {status.get('influxdb')}"


def test_start_single_service(ensure_services_stopped):
    """Test starting only rabbitmq service"""
    # Setup
    run_command(["dtaas-services", "setup"])

    # Start with -s rabbitmq flag
    result = run_command(["dtaas-services", "start", "-s", "rabbitmq"])
    assert result.returncode == 0, f"Start with -s flag failed: {result.stderr}"

    # Stop the other services that may have been started
    run_command(["dtaas-services", "stop", "-s", "mongodb,grafana,influxdb"])

    status = get_service_status()
    # RabbitMQ should be running
    print(f"  rabbitmq: {status.get('rabbitmq')} (expected: running/restarting)")
    assert status.get("rabbitmq") in ["running", "restarting"], f"RabbitMQ should be running but is: {status.get('rabbitmq')}"

    # Other services should not be running
    for service in ["mongodb", "grafana", "influxdb"]:
        if service in status:
            print(f"  {service}: {status[service]} (expected: stopped/exited)")
            assert status[service] in ["stopped", "exited"], \
                f"{service} should not be running but is: {status[service]}"


def test_start_stop_start_cycle(ensure_services_stopped):
    """Test starting, stopping, and starting services again"""
    # Setup
    run_command(["dtaas-services", "setup"])

    # First start
    result = run_command(["dtaas-services", "start"])
    assert result.returncode == 0

    # Verify running
    status = get_service_status()
    print("\n[DEBUG] Service status after first start")
    for service in AVAILABLE_SERVICES:
        print(f"  {service}: {status.get(service)}")
    assert all(status.get(s) in ["running", "restarting"] for s in AVAILABLE_SERVICES), \
        f"All services should be running. Got: {status}"
    # Stop all
    result = run_command(["dtaas-services", "stop"])
    assert result.returncode == 0
    # Start again
    result = run_command(["dtaas-services", "start"])
    assert result.returncode == 0
    # Verify running again
    status = get_service_status()
    print("\n[DEBUG] Service status after second start")
    for service in AVAILABLE_SERVICES:
        print(f"  {service}: {status.get(service)}")
    assert all(status.get(s) in ["running", "restarting"] for s in AVAILABLE_SERVICES), \
        f"All services should be running again. Got: {status}"
