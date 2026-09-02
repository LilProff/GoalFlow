#!/usr/bin/env python3
"""Graphify graph querying helper.

Loads the graph from graphify-out/graph.json and provides a minimal CLI
to inspect and explore the graph without re-reading code.

- --summary: print node/edge counts and top nodes by degree
- --start <node> --end <node>: print a shortest path if exists
- --start <node> [--radius <n>]: print a local subgraph around a node
"""
import json
import argparse
from pathlib import Path

import networkx as nx
from networkx.readwrite import json_graph


def load_graph(graph_path: Path) -> nx.Graph:
    with graph_path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    # Try common graph JSON formats robustly
    # 1) node-link format (Graph with 'nodes' and 'links' or 'edges')
    if isinstance(data, dict):
        if 'nodes' in data and ('links' in data or 'edges' in data):
            G = nx.Graph()
            for n in data['nodes']:
                nid = n.get('id') or n.get('name') or n
                G.add_node(nid)
            edge_list = data.get('links') or data.get('edges')
            for e in edge_list:
                src = e.get('source') if isinstance(e, dict) else None
                dst = e.get('target') if isinstance(e, dict) else None
                if src is None or dst is None:
                    continue
                G.add_edge(src, dst, **{k: v for k, v in e.items() if k not in ('source', 'target')})
            return G
        # 2) networkx json-graph node_link format sometimes wrapped differently
        try:
            return json_graph.node_link_graph(data)
        except Exception:
            pass
        # 3) adjacency-like: {node: [neighbors]}
        if all(isinstance(v, list) for v in data.values()):
            G = nx.Graph()
            for n, neigh in data.items():
                G.add_node(n)
                for m in neigh:
                    G.add_edge(n, m)
            return G
    raise ValueError("Unsupported graph.json format for Graphify graph loading.")


def main():
    parser = argparse.ArgumentParser(description="Graphify graph utility")
    parser.add_argument("--graph", default="graphify-out/graph.json", help="Path to graph.json")
    parser.add_argument("--summary", action="store_true", help="Print summary of the graph")
    parser.add_argument("--start", help="Start node for path or neighborhood exploration")
    parser.add_argument("--end", help="End node for path exploration (optional)")
    parser.add_argument("--radius", type=int, default=2, help="Neighborhood radius for start node")
    args = parser.parse_args()

    graph_path = Path(args.graph)
    if not graph_path.exists():
        print(f"Graph file not found at {graph_path}")
        raise SystemExit(1)

    G = load_graph(graph_path)

    if args.summary:
        print(f"Nodes: {G.number_of_nodes()}  Edges: {G.number_of_edges()}")
        # Top nodes by degree
        top = sorted(G.degree, key=lambda x: x[1], reverse=True)[:5]
        print("Top nodes by degree:")
        for n, d in top:
            print(f"  {n}: {d}")

    if args.start:
        if args.end:
            try:
                path = nx.shortest_path(G, source=args.start, target=args.end)
                print(" -> ".join(map(str, path)))
            except nx.NetworkXNoPath:
                print(f"No path between {args.start} and {args.end}")
            except nx.NodeNotFound as e:
                print(f"Node not found: {e}")
        else:
            # Neighborhood around start node
            if args.radius < 0:
                print("Radius must be >= 0")
                return
            if args.start not in G:
                print(f"Node not found: {args.start}")
                return
            sub = nx.ego_graph(G, args.start, radius=args.radius, center=True, undirected=True)
            print(f"Neighborhood around '{args.start}' (radius={args.radius}): {sub.number_of_nodes()} nodes, {sub.number_of_edges()} edges")
            # Show a few edges for quick inspection
            edges = list(sub.edges(data=True))[:10]
            for u, v, d in edges:
                print(f"  {u} -- {v}  {d}")


if __name__ == "__main__":
    main()
