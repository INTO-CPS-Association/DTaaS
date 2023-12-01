
/*
 * -------------------------------------------------------
 * THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
 * -------------------------------------------------------
 */

/* tslint:disable */
/* eslint-disable */

export interface Node {
    name: string;
    type?: Nullable<string>;
    path?: Nullable<string>;
    rawBlob?: Nullable<string>;
    rawTextBlob?: Nullable<string>;
}

export interface Edge {
    node: Node;
}

export interface Blob {
    edges?: Nullable<Edge[]>;
    nodes?: Nullable<Node[]>;
}

export interface Tree {
    blobs?: Nullable<Blob>;
    trees?: Nullable<Blob>;
}

export interface Repository {
    tree?: Tree;
    blobs?: Blob;
}

export interface Project {
    repository?: Nullable<Repository>;
    fullPath: string;
}

export interface IQuery {
    project(fullPath: string): Project | Promise<Project>;
    listDirectory(path: string): Project | Promise<Project>;
    readFile(path: string): Project | Promise<Project>;
}

type Nullable<T> = T | null;
