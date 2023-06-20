/**
 * @generated SignedSource<<85b8a42b9b69cfadba1678b7c64d150b>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest, Query } from 'relay-runtime';
export type gitLabDirectoryListQuery$variables = {
  groupAndProject: string;
  path: string;
};
export type gitLabDirectoryListQuery$data = {
  readonly project: {
    readonly repository: {
      readonly paginatedTree: {
        readonly nodes: ReadonlyArray<{
          readonly trees: {
            readonly nodes: ReadonlyArray<{
              readonly name: string;
              readonly path: string;
            } | null> | null;
          };
        } | null> | null;
      };
    } | null;
  } | null;
};
export type gitLabDirectoryListQuery = {
  response: gitLabDirectoryListQuery$data;
  variables: gitLabDirectoryListQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "groupAndProject"
},
v1 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "path"
},
v2 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "fullPath",
        "variableName": "groupAndProject"
      }
    ],
    "concreteType": "Project",
    "kind": "LinkedField",
    "name": "project",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "Repository",
        "kind": "LinkedField",
        "name": "repository",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": [
              {
                "kind": "Variable",
                "name": "path",
                "variableName": "path"
              },
              {
                "kind": "Literal",
                "name": "recursive",
                "value": false
              }
            ],
            "concreteType": "TreeConnection",
            "kind": "LinkedField",
            "name": "paginatedTree",
            "plural": false,
            "selections": [
              {
                "alias": null,
                "args": null,
                "concreteType": "Tree",
                "kind": "LinkedField",
                "name": "nodes",
                "plural": true,
                "selections": [
                  {
                    "alias": null,
                    "args": null,
                    "concreteType": "TreeEntryConnection",
                    "kind": "LinkedField",
                    "name": "trees",
                    "plural": false,
                    "selections": [
                      {
                        "alias": null,
                        "args": null,
                        "concreteType": "TreeEntry",
                        "kind": "LinkedField",
                        "name": "nodes",
                        "plural": true,
                        "selections": [
                          {
                            "alias": null,
                            "args": null,
                            "kind": "ScalarField",
                            "name": "name",
                            "storageKey": null
                          },
                          {
                            "alias": null,
                            "args": null,
                            "kind": "ScalarField",
                            "name": "path",
                            "storageKey": null
                          }
                        ],
                        "storageKey": null
                      }
                    ],
                    "storageKey": null
                  }
                ],
                "storageKey": null
              }
            ],
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": [
      (v0/*: any*/),
      (v1/*: any*/)
    ],
    "kind": "Fragment",
    "metadata": null,
    "name": "gitLabDirectoryListQuery",
    "selections": (v2/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [
      (v1/*: any*/),
      (v0/*: any*/)
    ],
    "kind": "Operation",
    "name": "gitLabDirectoryListQuery",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "6a0a0481647caf243d36569f4b1f53d0",
    "id": null,
    "metadata": {},
    "name": "gitLabDirectoryListQuery",
    "operationKind": "query",
    "text": "query gitLabDirectoryListQuery(\n  $path: String!\n  $groupAndProject: ID!\n) {\n  project(fullPath: $groupAndProject) {\n    repository {\n      paginatedTree(path: $path, recursive: false) {\n        nodes {\n          trees {\n            nodes {\n              name\n              path\n            }\n          }\n        }\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "b6aa5ac24780fe94f572eac3ef741fe9";

export default node;
