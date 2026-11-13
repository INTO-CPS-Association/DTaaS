"""One module per service, each with estimate(ctx) -> int and backup(ctx) -> None.

ORDER is fixed: postgres before thingsboard. To add a service: add <name>.py, add it to ORDER and to
DEFAULT_CONTAINERS, and add restore/<name>.md."""
import importlib

ORDER = ["postgres", "thingsboard", "grafana", "influxdb", "mongodb", "rabbitmq"]
DEFAULT_CONTAINERS = {s: s for s in ORDER}


def load(name: str):
    return importlib.import_module(f"{__name__}.{name}")
