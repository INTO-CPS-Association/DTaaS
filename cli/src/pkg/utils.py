import yaml
import tomlkit

LOCALHOST_SERVER = "localhost"

def importYaml(filename):   
    config = {} 
    try:
        with open(filename,'r') as f:
            config = yaml.safe_load(f)
    except FileNotFoundError:
        return {}, None
    except Exception as e:
        return None, Exception(f"Error while getting yaml file: {filename}, " + str(e))
    return config if config!=None else {}, None

def exportYaml(data, filename):
    try:
        with open(filename, 'w') as f:
            yaml.safe_dump(data, f, sort_keys=False)
    except Exception as e:
        return Exception(f"Error while writing yaml to file: {filename}, " + str(e))
    return None

def importToml(filename):
    try:
        with open(filename, 'r') as f:
            config = tomlkit.load(f)
    except Exception as e:
        return None, Exception(f"Error while getting toml file: {filename}, " + str(e))
    return config, None

def replaceAll(obj, mapping):
    if type(obj)==str:
        for key in mapping:
            obj = obj.replace(key, mapping[key])
        return obj
    if type(obj)==list:
        for i in range(len(obj)):
            obj[i] = replaceAll(obj[i], mapping)
        return obj
    if type(obj)==dict:
        for key in obj:
            if type(key)!=str:
                return Exception(f"Config substitution failed: Key is not a string")
            obj[key]= replaceAll(obj[key], mapping)
        return obj
    return Exception("Config substition failed: Object format not valid")