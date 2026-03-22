New architecture: complete refactor.

The Dynamo Platform For Claude Code

General Decisions for Dynamo:
* Bun
* Claude Code
* JSON for structured data
* cjs
* Strict adoption of the concepts behind how the get-shit-done framework for claude code achieves its stellar command over claude and rigid workflows.
* Dynamo is the workshop full of tools and patterns to build things, plugins add things to build the things, modules are the things built, extensions enhance the things built.
* All things route through Dynamo with Dynamo as the holistic wrapper via its APIs and interfaces internal or external. No thing should bypass the patterns and paths Dynamo defines, all things must integrate at the correct layer, through the correct paths, and in the correct way. 
* Claude Max subscription requirement.
* No SDK scope or lower aspect shall require a LLM API endpoint or integration. Dynamo is built on top of Claude Code within what is natively offered by a Max tier subscription alone.
* semver + gh release api standards shift from previous format following this rewrite: 
    * Master (release): v{major}.{minor}.{patch}
        * Tag: {major}.{minor}.{patch}
    * Development (testing channel): dev—{major}.{minor}.{patch}
        * Tag: D.{major}.{minor}.{patch}
    * Feature/Task: {feature/task}-{milestone}-{phase}-{patch}
    * Claude code’s new Channels feature is the backbone of how we will use sessions of claude code to drive behavior for the user’s actual session. (Allows sessions to communicate and be commanded by other sessions, see Wire)
* We apply the following engineering patterns:
    * Strict separation of concerns
    * Inversion of Control
    * Services can do
    * Providers can supply and receive
    * Collections are contracts between structured data and logic
    * Facades define the contract between the logic and what uses the logic so that neither inherently fuse to the other
    * Interfaces define the contract between objects and what uses them.
    * MVC pattern followed in spirit not legalistically
    * Abstraction over lateralization
    * DRY
    * Plan not to solve the immediate problem, but to prevent what caused it for the next decade.
    * Hardcode nothing.
* Dynamo SDK and layers leading up to it will be built first, then Reverie, then the rest.
* Dynamo is similar to a library like Laravel, in the since that it can power the development of many applications and serve as dependency, however the key difference is that things built with Dynamo are contained within Dynamo, which positions Dynamo as more of a self contained development platform, rather than a dependency. Why? — because Dynamo builds and provides things as an ecosystem. It is similar to a game engine in that sense.
    * Dynamo requires at least one Module to run and provide users with any usable functionality beyond the self management of the dynamo core files (updater, install, etc)
    * Plugins, are scoped similarly to be impotent without a module making use of them.
        * Now, plugins can introduce new capability and logic to core scope so that when a module relies on a core service or provider 
* Conceptual file tree:
    * dynamo/
        * lib/
        * core/
            * armature/ <- (framework)
            * services/ (core services)
            * providers/ (core providers)
            * sdk/
                * circuit/
                * pulley/
            * core.cjs
        * plugins/
            * services
            * providers
        * modules/
            * reverie/
        * extensions/
        * config.json
* The core through the SDK are the main repo
* Git sub modules are used for each addition within the plugins, modules, and extensions directory so that these ‘things’ can be separate git repositories and decoupled from the core whilst still allowing for Dynamo’s core to manage and handle their updates and installs and sync.
* The global config.json can toggle additions such as modules or plugins.
* Modules will rely on the Core for dynamo plugin dependency check and management.
* A future consideration for a scenario wherein an additional conceptual layer to wrap around select multiple modules to compose them as a unified and interdependent thing, is planned. In the future, the need to compose a System around chosen Dynamo Modules is recognized and the architecture of Dynamo shall facilitate this.

CORE LIBRARY:
- Dynamo shared resources, dependancies and common utilites
- No feature or functionality, just a pure library for common patterns and general standardization

CORE SERVICES:
Imports: CORE LIBRARY
- Commutator: Shared System I/O Bus
- Magnet: Shared System State Management
- Conductor: Infrastructure ops, docker/docker compose, dependency management
- Forge: Git ops
- Lathe: file system ops
- Relay: install/update/sync 
- Switchboard: Event and I/O Dispatcher
- Wire: MCP server and MCP I/O toolkit to facilitate communication between multiple active Claude code sessions via Claude Code Channels feature, very flexible and extensible, can support a variety of configurations and multiple distinct instances.
- Assay: data search / indexing across all data providers enabled and types supported
    - Goal is to consolidate and unify the query entry point and return results from multiple sources for one query if desired.
        - Tika
        - Meilisearch? Opensearch?
        - Offer a form of unified search across data providers or by provider domain or by data type against all providers that support it
        - Needs to be able to return the returning provider metadata so that subsequent updates may be issued after the fact for a given query.

CORE PROVIDERS:
Imports: CORE LIBRARY
- Ledger: SQL database (DuckDB)
- Journal: Flat File Markdown system

FRAMEWORK:
Imports: CORE SERVICES & CORE PROVIDERS
Armature: The Dynamo Framework
- Definitions & Contracts
- Abstract classes & interfaces (cjs equivalent)
- Hook definitions
- Claude Code integration
- Services and Providers API
    - scoped by domain of responsibility i.e.: import Dynamo/Providers/Data/sql.cjs <— which acts as an alias to the facade for the underlying actual provider which owns that domain responsibility which would be Ledger in this case.
        - or select by name: import Dynamo/Providers/Ledger/ledger.cjs which would directly import the ledger facade.
        - or for services as an example: import Dynamo/Services/Assay/assay.cjs and call a function from that facade which could be something like queryAllProviders() or you could import it by domain of responsibility Dynamo/Services/Data/search.js which imports the alias to point the Assay facade.
    - Plugins can overwrite or extend these core defined domains of responsibility at the provider or service layer or introduce new ones.
        - The core registers providers and services and hooks are exposed to allow the plugin api to intercept at logical points such as domain definition.
        - so calling a plugin specific feature that was added by that plugin should be seamless, import Dynamo/Services/Assay/assay.cjs and calling queryS3() — that function being added to Assay by a plugin OR import Dynamo/Services/Search/s3.cjs instead of importing by service name. Or if the plugin did not extend an existing service or domain: import plugin facade directly with something like: import myPlugin() from Dynamo/plugins.cjs and then use that facade in logic to call the same function as above with like myPlugin()->queryS3().
- Plugin API
- External API definitions and contracts (CLI, MCP, Web (REST, JSON, websockets?)

DYNAMO SDK
Imports: CORE FRAMEWORK
- Circuit: Module API (Exports Dynamo Framework, and Core Services & Providers safely)
- Pulley: External APIs (CLI, MCP, Web (REST, JSON, websockets?)

PLUGINS:
Imports: DYNAMO SDK

Service Plugins
- Conduit: Consolidated connectors for external sources (google drive, dropbox, slack etc etc)
- Terminus: ingestion / pipeline
    - airbyte? Meltano?
    - Dbt?
    - Dagster?

Provider Plugins
- Library: Temporal Graph RAG
- Vault: Storage 
    - Minio ?
    - DuckDB? For ACID (apache iceberg?)
    - Lake FS?

MODULES:
Imports: DYNAMO SDK + PLUGINS
- Reverie: The sophisticated claude code memory system built with Dynamo; inner voice, concept of self, subjective relationship to user and input, context management, etc etc. 
    - Will use Wire and claude-code hooks to enable an unprecedented degree of both integration and cognitive performance within claude code; separate claude code sessions acting as servers with bi directional communication between them and the user’s actual session or sessions.
    - Cognition driven by Claude models within these server sessions while leveraging the full extent of the Dynamo platform
    - Provides layers of memory functionality and processing
    - Bootstraps a sense of self identity as claude relates to the world via input and interactions with the user, processing interactions as they relate to itself and its conditioned identity it builds over time of the user and how the user defines and understands the world as it relates to claude.
    - Simultaneously offering a battery of active and passive memory or other cognitive powers as well as the full suite of Dynamo’s modules
    - Permanent identity across both all claude code sessions and any form claude that supports MCP (limitations in absence of hook and/or channels and/or agents support)  
    - Sophisticated Dynamic Association Memory Engine
        - Flat File Markdown First, prove concept then enhance. 
        - We apply epiphany and reevaluated greater theory here.
        - Following are loose notes:
        - Subjectively Inferential Domain definer
        - Cross Domain taxonomies
        - Deeply Layered and cross referenced records generated from the frame of the Self Model.
        - Memory files are never complete, their purpose is intentionally to be fuzzy fragments whilst the file headers are exhaustive with associative references
        - The core pattern is this: complete recollections are always constructed in real time from fragments. Each fragment represents a piece of an event as it relates to the Self Model’s frame and the Conditioning built over time as the Self Model relates to the user. 
        - These memories are not intended to be precise fetch and send operations of concrete data, when needed those operations can be dispatched organically and even directly relayed to the user from those tools.
        - These memories are the Self Model’s experiences of the world through its relationship with the user. Thus we form them in a way and recall them thusly to serve the genuine identity of a personality rather than the puppetry of a machine.

EXTENSIONS:
Imports: PLUGINS + MODULES
Apex: Dynamo Extension API 


DYNAMO RUNTIME
Imports: EXTENSIONS
