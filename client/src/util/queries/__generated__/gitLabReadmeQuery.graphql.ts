/**
 * @generated SignedSource<<397382ebf5455f37ad1a12e2925abc93>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest, Query } from 'relay-runtime';
export type gitLabReadmeQuery$variables = {
  groupAndProject: string;
  paths: ReadonlyArray<string>;
};
export type gitLabReadmeQuery$data = {
  readonly project: {
    readonly repository: {
      readonly blobs: {
        readonly nodes: ReadonlyArray<{
          readonly fileType: string | null;
          readonly name: string | null;
          readonly path: string;
          readonly rawTextBlob: string | null;
        } | null> | null;
      } | null;
    } | null;
  } | null;
};
export type gitLabReadmeQuery = {
  response: gitLabReadmeQuery$data;
  variables: gitLabReadmeQuery$variables;
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
  "name": "paths"
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
                "name": "paths",
                "variableName": "paths"
              }
            ],
            "concreteType": "RepositoryBlobConnection",
            "kind": "LinkedField",
            "name": "blobs",
            "plural": false,
            "selections": [
              {
                "alias": null,
                "args": null,
                "concreteType": "RepositoryBlob",
                "kind": "LinkedField",
                "name": "nodes",
                "plural": true,
                "selections": [
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "rawTextBlob",
                    "storageKey": null
                  },
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
                  },
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "fileType",
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
    "name": "gitLabReadmeQuery",
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
    "name": "gitLabReadmeQuery",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "0617c949466a01349b8655b2abaffd7f",
    "id": null,
    "metadata": {},
    "name": "gitLabReadmeQuery",
    "operationKind": "query",
    "text": "query gitLabReadmeQuery(\n  $paths: [String!]!\n  $groupAndProject: ID!\n) {\n  project(fullPath: $groupAndProject) {\n    repository {\n      blobs(paths: $paths) {\n        nodes {\n          rawTextBlob\n          name\n          path\n          fileType\n        }\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "3ad3cdf9ba7f836fa2f31e772320b75a";

export default node;
