"""
This file runs end-to-end tests for services commands.
These tests execute real commands with actual services and verify expected behavior.
"""
import subprocess
import pytest
from rich.console import Console
from rich.panel import Panel
from dtaas_services.pkg.service import Service

console = Console()
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
            error_panel = Panel(
                "[bold red]Permission Denied[/bold red]\n\n"
                f"[yellow]Command:[/yellow] {' '.join(cmd_list)}\n\n"
                "[yellow]Cause:[/yellow] Your user may not have access to the Docker daemon.\n\n"
                "[bold]Solutions:[/bold]\n\n"
                "[cyan]1. Recommended - Add user to docker group:[/cyan]\n"
                "   [dim]$ sudo usermod -aG docker $USER[/dim]\n"
                "   [dim]$ newgrp docker[/dim]\n"
                "   Then run without sudo:\n"
                "   [dim]$ {0}[/dim]\n\n"
                "[cyan]2. Alternative - Use sudo:[/cyan]\n"
                "   [dim]$ sudo {0}[/dim]".format(' '.join(cmd_list)),
                title="[bold red]❌ Docker Permission Error[/bold red]",
                border_style="red",
                expand=False
            )
            console.print(error_panel)
            raise subprocess.CalledProcessError(e.returncode, e.cmd, e.output, e.stderr) from e

        # Print detailed error information for other failures
        stdout_text = f"[dim]{e.stdout[:500]}[/dim]" if e.stdout else "[dim]None[/dim]"
        stderr_text = f"[dim]{e.stderr[:500]}[/dim]" if e.stderr else "[dim]None[/dim]"

        error_panel = Panel(
            f"[yellow]Command:[/yellow] {' '.join(cmd_list)}\n"
            f"[yellow]Exit Code:[/yellow] [bold red]{e.returncode}[/bold red]\n\n"
            f"[yellow]STDOUT:[/yellow]\n{stdout_text}\n\n"
            f"[yellow]STDERR:[/yellow]\n{stderr_text}",
            title="[bold red]❌ Command Failed[/bold red]",
            border_style="red",
            expand=False
        )
        console.print(error_panel)
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
        error_panel = Panel(
            "[yellow]Failed to retrieve service status from Service class[/yellow]\n\n"
            f"[yellow]Error:[/yellow] {err}",
            title="[bold red]❌ Service Status Retrieval Failed[/bold red]",
            border_style="red"
        )
        console.print(error_panel)
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


def assert_command_success(result, operation_name):
    """
    Assert command succeeded, with rich output on failure
    Args:
        result: subprocess.CompletedProcess object
        operation_name: Human-readable name of the operation
    """
    if result.returncode != 0:
        stderr_text = f"[dim]{result.stderr[:500]}[/dim]" if result.stderr else "[dim]None[/dim]"
        error_panel = Panel(
            f"[yellow]Operation:[/yellow] {operation_name}\n"
            f"[yellow]Exit Code:[/yellow] [bold red]{result.returncode}[/bold red]\n\n"
            f"[yellow]STDERR:[/yellow]\n{stderr_text}",
            title=f"[bold red]❌ {operation_name} Failed[/bold red]",
            border_style="red"
        )
        console.print(error_panel)
        raise AssertionError(f"{operation_name} failed: {result.stderr}")


def assert_service_states(status, expected_states):
    """
    Assert services are in expected states, with rich output on failure
    Args:
        status: dict of service_name -> state
        expected_states: dict of service_name -> [expected_state_list]
    """
    failures = []
    for service_name, valid_states in expected_states.items():
        if service_name not in status:
            failures.append(
                f"[yellow]{service_name}:[/yellow] [bold red]NOT FOUND[/bold red] "
                f"(expected: {'/'.join(valid_states)})"
            )
        elif status[service_name] not in valid_states:
            failures.append(
                f"[yellow]{service_name}:[/yellow] [bold red]{status[service_name]}[/bold red] "
                f"(expected: {'/'.join(valid_states)})"
            )
    if failures:
        error_panel = Panel(
            "[yellow]Service State Assertion Failed[/yellow]\n\n" + "\n".join(failures),
            title="[bold red]❌ Service State Mismatch[/bold red]",
            border_style="red"
        )
        console.print(error_panel)
        raise AssertionError("Service state assertion failed")


def test_setup_start_status_all_services(ensure_services_stopped):
    """Test full workflow: setup, start all, check all running"""
    # Step 1: Run setup
    result = run_command(["dtaas-services", "setup"])
    assert_command_success(result, "Setup")

    # Step 2: Start all services
    result = run_command(["dtaas-services", "start"])
    assert_command_success(result, "Start all services")

    # Step 3: Check status of all services
    status = get_service_status()
    # Verify all services are running
    expected_states = {service: ["running", "restarting"] for service in AVAILABLE_SERVICES}
    assert_service_states(status, expected_states)


def test_stop_influxdb_service(ensure_services_stopped):
    """Test stopping influxdb while keeping other services running"""
    # Step 1: Run setup
    result = run_command(["dtaas-services", "setup"])
    assert_command_success(result, "Setup")

    # Step 2: Start all services
    result = run_command(["dtaas-services", "start"])
    assert_command_success(result, "Start all services")

    # Step 3: Stop influxdb specifically
    result = run_command(["dtaas-services", "stop", "-s", "influxdb"])
    assert_command_success(result, "Stop influxdb")

    # Step 4: Check status
    status = get_service_status()
    expected_states = {
        "influxdb": ["stopped", "exited"],
        "rabbitmq": ["running", "restarting"],
        "mongodb": ["running", "restarting"],
        "grafana": ["running", "restarting"]
    }
    assert_service_states(status, expected_states)


def test_stop_multiple_services(ensure_services_stopped):
    """Test stopping multiple services at once"""
    # Ensure clean state
    run_command(["dtaas-services", "stop"], check=False)

    # Setup and start
    run_command(["dtaas-services", "setup"])
    run_command(["dtaas-services", "start"])

    # Stop rabbitmq and mongodb
    result = run_command(["dtaas-services", "stop", "-s", "rabbitmq,mongodb"])
    assert_command_success(result, "Stop rabbitmq and mongodb")

    # Check status
    status = get_service_status()
    expected_states = {
        "rabbitmq": ["stopped", "exited"],
        "mongodb": ["stopped", "exited"],
        "grafana": ["running", "restarting"],
        "influxdb": ["running", "restarting"]
    }
    assert_service_states(status, expected_states)


def test_start_single_service(ensure_services_stopped):
    """Test starting only rabbitmq service"""
    # Setup
    run_command(["dtaas-services", "setup"])

    # Start with -s rabbitmq flag
    result = run_command(["dtaas-services", "start", "-s", "rabbitmq"])
    assert_command_success(result, "Start rabbitmq service")

    # Only check and assert for rabbitmq
    status = get_service_status(["rabbitmq"])
    expected_states = {
        "rabbitmq": ["running", "restarting"]
    }
    assert_service_states(status, expected_states)


def test_start_stop_start_cycle(ensure_services_stopped):
    """Test starting, stopping, and starting services again"""
    # Setup
    run_command(["dtaas-services", "setup"])

    # First start
    result = run_command(["dtaas-services", "start"])
    assert_command_success(result, "Start all services")

    # Verify running
    status = get_service_status()
    expected_states = {service: ["running", "restarting"] for service in AVAILABLE_SERVICES}
    assert_service_states(status, expected_states)
    # Stop all
    result = run_command(["dtaas-services", "stop"])
    assert_command_success(result, "Stop all services")
    # Start again
    result = run_command(["dtaas-services", "start"])
    assert_command_success(result, "Start all services (second time)")
    # Verify running again
    status = get_service_status()
    assert_service_states(status, expected_states)
