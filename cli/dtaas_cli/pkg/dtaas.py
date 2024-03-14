from . import helper

def setPath(path):
    config, err = helper.importYaml('config.yml')
    if err!=None:
        return err
    
    config['DTAAS_PATH'] = path

    err = helper.exportYaml(config,'config.yml')
    if err!=None:
        return err
    
    return None

def getPath():
    config, err = helper.importYaml('config.yml')
    if err!=None:
        return None, err
    
    if 'DTAAS_PATH' in config and config['DTAAS_PATH']!="":
        return config['DTAAS_PATH'], None
    return None, ValueError("The directory for DTaaS hasn't been setup.")
