/**
 * @generated SignedSource<<0cf99abfba3f2b4d9aa52d37fb4d36a7>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest, Query } from 'relay-runtime';
export type gitLabQueriesgitLabDirectoryListQuery$variables = {
  groupAndProject: string;
  path: string;
};
export type gitLabQueriesgitLabDirectoryListQuery$data = {
  readonly project: {
    readonly path: string;
    readonly repository: {
      readonly paginatedTree: {
        readonly nodes: ReadonlyArray<{
          readonly blobs: {
            readonly nodes: ReadonlyArray<{
              readonly name: string;
              readonly path: string;
            } | null> | null;
          };
          readonly trees: {
            readonly nodes: ReadonlyArray<{
              readonly name: string;
              readonly path: string;
            } | null> | null;
          } | null;
        } | null> | null;
      } | null;
    } | null;
    readonly webUrl: string | null;
  } | null;
};
export type gitLabQueriesgitLabDirectoryListQuery = {
  response: gitLabQueriesgitLabDirectoryListQuery$data;
  variables: gitLabQueriesgitLabDirectoryListQuery$variables;
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
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "path",
  "storageKey": null
},
v3 = [
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "name",
    "storageKey": null
  },
  (v2/*: any*/)
],
v4 = [
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
        "kind": "ScalarField",
        "name": "webUrl",
        "storageKey": null
      },
      (v2/*: any*/),
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
                    "concreteType": "BlobConnection",
                    "kind": "LinkedField",
                    "name": "blobs",
                    "plural": false,
                    "selections": [
                      {
                        "alias": null,
                        "args": null,
                        "concreteType": "Blob",
                        "kind": "LinkedField",
                        "name": "nodes",
                        "plural": true,
                        "selections": (v3/*: any*/),
                        "storageKey": null
                      }
                    ],
                    "storageKey": null
                  },
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
                        "selections": (v3/*: any*/),
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
    "name": "gitLabQueriesgitLabDirectoryListQuery",
    "selections": (v4/*: any*/),
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
    "name": "gitLabQueriesgitLabDirectoryListQuery",
    "selections": (v4/*: any*/)
  },
  "params": {
    "cacheID": "db8142e6c6027316c0a3099bb84f02b9",
    "id": null,
    "metadata": {},
    "name": "gitLabQueriesgitLabDirectoryListQuery",
    "operationKind": "query",
    "text": "query gitLabQueriesgitLabDirectoryListQuery(\n  $path: String!\n  $groupAndProject: ID!\n) {\n  project(fullPath: $groupAndProject) {\n    webUrl\n    path\n    repository {\n      paginatedTree(path: $path, recursive: false) {\n        nodes {\n          blobs {\n            nodes {\n              name\n              path\n            }\n          }\n          trees {\n            nodes {\n              name\n              path\n            }\n          }\n        }\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "9b6f29df561dd41c5ca729894cccaae9";

export default node;
