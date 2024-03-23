import click
from . import utils

class Config:
    def __init__(self):        
        config, err = utils.importToml('dtaas.toml')
        if err!=None:
            raise click.ClickException("config initialisation failed: "+str(err))
        self.data = config
    
    def getConfig(self):
        if self.data!=None:
            return self.data,None
        return None, Exception("Config not initialised")
    
    def getCommon(self):
        conf, err = self.getConfig()
        if err!=None:
            return None, err
        
        if 'common' not in conf:
            return None, Exception("Config file error: Missing 'common' tag")
        return conf['common'], None
    
    def getUsers(self):
        conf, err = self.getConfig()
        if err!=None:
            return None, err
        
        if 'users' not in conf:
            return None, Exception("Config file error: Missing 'users' tag")
        return conf['users'], None

    
    def getPath(self):
        confCommon, err = self.getCommon()
        if err!=None:
            return None, err
        
        if 'path' not in confCommon or confCommon['path']=="":
            return None, Exception("Config file error: The path for DTaaS directory isn't set in TOML")
        return  str(confCommon['path']), None
    
    def getServerDNS(self):
        confCommon, err = self.getCommon()
        if err!=None:
            return None, err
        
        if 'server-dns' not in confCommon and confCommon['server-dns']=="":
            return None, Exception("Config file error: The server dns isn't set in TOML")
        return str(confCommon['server-dns']), None
    
    def getAddUsersList(self):
        confUsers, err = self.getUsers()
        if err!=None:
            return None, err

        if 'add' not in confUsers:
            return None, Exception("Config file error: No 'add' list in 'users' tag")
        addUsersList = [ str(username) for username in confUsers['add']]
        return addUsersList, None
    
    def getDeleteUsersList(self):
        confUsers, err = self.getUsers()
        if err!=None:
            return None, err

        if 'delete' not in confUsers:
            return None, Exception("Config file error: No 'delete' list in 'users' tag")
        deleteUsersList = [str(username) for username in confUsers['delete']]
        return deleteUsersList, None
        