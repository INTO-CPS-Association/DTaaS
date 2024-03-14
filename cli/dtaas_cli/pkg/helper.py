import yaml

def importYaml(filename):   
    config = {} 
    try:
        with open(filename,'r') as f:
            config = yaml.safe_load(f)
    except FileNotFoundError:
        return {}, None
    except Exception as e:
        return None, Exception(f"Error while getting yaml file: {filename}" + str(e))
    return config if config!=None else {}, None

def exportYaml(data, filename):
    try:
        with open(filename, 'w') as f:
            yaml.safe_dump(data, f, sort_keys=False)
    except Exception as e:
        return Exception(f"Error while writing yaml to file: {filename}" + str(e))
    return None
    