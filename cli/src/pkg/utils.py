"This file has generic helper functions and variables for dtaas cli"

import yaml
import tomlkit

LOCALHOST_SERVER = "localhost"


def importYaml(filename):
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


def exportYaml(data, filename):
    """This function is used to export to a yaml file safely"""
    try:
        with open(filename, "w") as file:
            yaml.safe_dump(data, file, sort_keys=False)
    except Exception as err:
        return Exception(f"Error while writing yaml to file: {filename}, " + str(err))
    return None


def importToml(filename):
    """This function is used to import a toml file safely"""
    try:
        with open(filename, "r") as file:
            config = tomlkit.load(file)
    except Exception as err:
        return None, Exception(
            f"Error while getting toml file: {filename}, " + str(err)
        )
    return config, None


def replaceAll(obj, mapping):
    """This function is used to replace all placeholders with values in a nested object"""
    if isinstance(obj, str):
        obj, err = replaceString(obj, mapping)
        return obj, err

    if isinstance(obj, list):
        obj, err = replaceList(obj, mapping)
        return obj, err

    if isinstance(obj, dict):
        obj, err = replaceDict(obj, mapping)
        return obj, err

    return None, Exception("Config substition failed: Object format not valid")


def replaceString(s, mapping):
    for key in mapping:
        s = s.replace(key, mapping[key])
    return s, None


def replaceList(arr, mapping):
    for ind, val in enumerate(arr):
        arr[ind], err = replaceAll(val, mapping)
        if err is not None:
            return None, err
    return arr, None


def replaceDict(dictionary, mapping):
    for key in dictionary:
        if not isinstance(key, str):
            return None, Exception("Config substitution failed: Key is not a string")
        dictionary[key], err = replaceAll(dictionary[key], mapping)
        if err is not None:
            return None, err
    return dictionary, None


def checkError(err):
    if err is not None:
        raise err
