"This file has generic helper functions and variables for dtaas cli"

import yaml
import tomlkit

LOCALHOST_SERVER = "localhost"


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
            yaml.safe_dump(data, file, sort_keys=False)
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
    if isinstance(obj, str):
        obj, err = replace_string(obj, mapping)
        return obj, err

    if isinstance(obj, list):
        obj, err = replace_list(obj, mapping)
        return obj, err

    if isinstance(obj, dict):
        obj, err = replace_dict(obj, mapping)
        return obj, err

    return None, Exception("Config substition failed: Object format not valid")


def replace_string(s, mapping):
    for key in mapping:
        s = s.replace(key, mapping[key])
    return s, None


def replace_list(arr, mapping):
    for ind, val in enumerate(arr):
        arr[ind], err = replace_all(val, mapping)
        if err is not None:
            return None, err
    return arr, None


def replace_dict(dictionary, mapping):
    for key in dictionary:
        if not isinstance(key, str):
            return None, Exception("Config substitution failed: Key is not a string")
        dictionary[key], err = replace_all(dictionary[key], mapping)
        if err is not None:
            return None, err
    return dictionary, None


def check_error(err):
    if err is not None:
        raise err
