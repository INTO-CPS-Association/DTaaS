# Library Microservice

[The Library Microservices](https://github.com/INTO-CPS-Association/DTaaS/tree/feature/distributed-demo/servers/lib#readme) - fulfil the core requirements of the system. The microservices are complementary and composable. 

The service mesh enables discovery of microservices, load balancing and authentication functionalities. There are microservices for catering to author, store, explore, configure, execute and scenario analysis requirements.

## Lib-MS Architecture

### Class Architecture
```mermaid
classDiagram
    class FilesResolver {
    -filesService: IFilesService
    +listDirectory(path: string): Promise<Project>
    +readFile(path: string): Promise<Project>
    }

    class FilesServiceFactory {
    -configService: ConfigService
    -gitlabFilesService: GitlabFilesService
    -localFilesService: LocalFilesService
    +create(): IFilesService
    }

    class GitlabFilesService {
    -configService: ConfigService
    -parseArguments(path: string): Promise<domain: string; parsedPath: string>
    -sendRequest(query: string): Promise<Project>
    -executeQuery(path: string, getQuery: QueryFunction): Promise<Project>
    +listDirectory(path: string): Promise<Project>
    +readFile(path: string): Promise<Project>
    }

    class LocalFilesService {
    -configService: ConfigService
    -getFileStats(fullPath: string, file: string): Promise<Project>
    +listDirectory(path: string): Promise<Project>
    +readFile(path: string): Promise<Project>
    }

    class ConfigService {
    +get(propertyPath: string): any
    }

    class IFilesService{
    listDirectory(path: string): Promise<Project>
    readFile(path: string): Promise<Project>
    }

    IFilesService <|-- FilesResolver: uses
    IFilesService <|.. GitlabFilesService: implements
    IFilesService <|.. LocalFilesService: implements
    IFilesService <|-- FilesServiceFactory: creates
    ConfigService <|-- FilesServiceFactory: uses
    ConfigService <|-- GitlabFilesService: uses
    ConfigService <|-- LocalFilesService: uses
```

### Sequence Architecture

```mermaid
sequenceDiagram
    actor Client
    actor Traefik
    
    box LightGreen RAMS
    participant FR as FilesResolver
    participant FSF as FilesServiceFactory
    participant CS as ConfigService 
    participant IFS as IFilesService
    participant LFS as LocalFilesService
    participant GFS as GitlabFilesService
    end

    participant FS as Local File System DB
    participant GAPI as GitLab API DB

    Client ->> Traefik : HTTP request
    Traefik ->> FR : GraphQL query
    activate FR

    FR ->> FSF : create()
    activate FSF

    FSF ->> CS : getConfiguration("MODE")
    activate CS

    CS -->> FSF : return configuration value
    deactivate CS

    alt MODE = Local
    FSF ->> FR : return filesService (LFS)
    deactivate FSF

    FR ->> IFS : listDirectory(path) or readFile(path)
    activate IFS

    IFS ->> LFS : listDirectory(path) or readFile(path)
    activate LFS

    LFS ->> CS : getConfiguration("LOCAL_PATH")
    activate CS

    CS -->> LFS : return local path
    deactivate CS

    LFS ->> FS : Access filesystem
    alt Filesystem error
        FS -->> LFS : Filesystem error
        LFS ->> LFS : Throw new InternalServerErrorException
        LFS -->> IFS : Error
    else Successful file operation
        FS -->> LFS : Return filesystem data
        LFS ->> IFS : return Promise<Project>
    end
    deactivate LFS
    else MODE = GitLab
        FSF ->> FR : return filesService (GFS)
        %%deactivate FSF

    FR ->> IFS : listDirectory(path) or readFile(path)
    activate IFS

    IFS ->> GFS : listDirectory(path) or readFile(path)
    activate GFS

    GFS ->> GFS : parseArguments(path)
    GFS ->> GFS : executeQuery()

    GFS ->> CS : getConfiguration("GITLAB_API_URL", "GITLAB_TOKEN")
    activate CS

    CS -->> GFS : return GitLab API URL and Token
    deactivate CS

    GFS ->> GAPI : sendRequest()
    alt GitLab API error
        GAPI -->> GFS : API error
        GFS ->> GFS : Throw new Error("Invalid query")
        GFS -->> IFS : Error
    else Successful GitLab API operation
        GAPI -->> GFS : Return API response
        GFS ->> IFS : return Promise<Project>
    end
    deactivate GFS
    end

    alt Error thrown
    IFS ->> FR : return Error
    deactivate IFS
    FR ->> Traefik : return Error
    Traefik ->> Client : HTTP error response
    else Successful operation
    IFS ->> FR : return Promise<Project>
    deactivate IFS
    FR ->> Traefik : return Promise<Project>
    Traefik ->> Client : HTTP response
    end

    deactivate FR

```