"This file has generic helper functions and variables for dtaas cli"

from pathlib import Path
import yaml
import tomlkit


def find_toml(output_dir):
    """Return path to dtaas.toml, checking output_dir first then cwd, or None."""
    for candidate in [Path(output_dir) / "dtaas.toml", Path("dtaas.toml")]:
        if candidate.is_file():
            return candidate
    return None


def _nested_dict(data, key):
    """Return data[key] when it is a dict, otherwise an empty dict."""
    value = data.get(key, {}) if isinstance(data, dict) else {}
    return value if isinstance(value, dict) else {}


def resolve_certs_src(toml_data):
    """Resolve [common.security].certs-src from dtaas.toml, or '' if unset."""
    security = _nested_dict(_nested_dict(toml_data, "common"), "security")
    certs_src = security.get("certs-src", "")
    return certs_src.strip() if isinstance(certs_src, str) else ""


def import_yaml(filename):
    """This function is used to import a yaml file safely"""
    config = {}
    try:
        with open(filename, "r") as file:
            config = yaml.safe_load(file)
    except FileNotFoundError:
        return {}, None
    except Exception as err:
        return None, Exception(
            f"Error while getting yaml file: {filename}, " + str(err)
        )
    return config if config is not None else {}, None


def export_yaml(data, filename):
    """This function is used to export to a yaml file safely"""
    try:
        with open(filename, "w") as file:
            yaml.safe_dump(
                data,
                file,
                sort_keys=False,
                default_flow_style=False,
                allow_unicode=True,
                indent=2,
            )
    except Exception as err:
        return Exception(f"Error while writing yaml to file: {filename}, " + str(err))
    return None


def import_toml(filename):
    """This function is used to import a toml file safely"""
    try:
        with open(filename, "r") as file:
            config = tomlkit.load(file)
    except Exception as err:
        return None, Exception(
            f"Error while getting toml file: {filename}, " + str(err)
        )
    return config, None


def replace_all(obj, mapping):
    """This function is used to replace all placeholders with values in a nested object"""
    _handlers = {str: replace_string, list: replace_list, dict: replace_dict}
    handler = _handlers.get(type(obj))
    if handler is None:
        return None, Exception("Config substitution failed: Object format not valid")
    return handler(obj, mapping)


def replace_string(s, mapping):
    """Replaces all placeholders in the string with values from the mapping"""
    for key in mapping:
        s = s.replace(key, mapping[key])
    return s, None


def replace_list(arr, mapping):
    """Replaces all placeholders in the list with values from the mapping"""
    for ind, val in enumerate(arr):
        arr[ind], err = replace_all(val, mapping)
        if err is not None:
            return None, err
    return arr, None


def _replace_dict_values(dictionary, mapping):
    """Replace values in a dict whose keys are already validated as strings."""
    for key in dictionary:
        dictionary[key], err = replace_all(dictionary[key], mapping)
        if err is not None:
            return None, err
    return dictionary, None


def replace_dict(dictionary, mapping):
    """Replaces all placeholders in the dictionary with values from the mapping"""
    if not all(isinstance(k, str) for k in dictionary):
        return None, Exception("Config substitution failed: Key is not a string")
    return _replace_dict_values(dictionary, mapping)


def check_error(err):
    """Checks if error is not None and raises it"""
    if err is not None:
        raise err
