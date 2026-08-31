OpenCode Integration (Graphify)

- Objective: Inject a Graphify memory directive into the OpenCode prompt flow so the assistant navigates the codebase via the graph rather than blindly searching files.
- What you need:
  - Graphify installed in the workspace (graphifyy). The graph data should already be generated at graphify-out/.
  - A dedicated plugin at .opencode/plugins/graphify.js and a registration file at .opencode/opencode.json.
- How it works:
  - Before every tool execution, the OpenCode plugin will (when available) inject a memory cue into the prompt referencing graphify-out/GRAPH_REPORT.md and graphify-out/graph.json.
- Quick start:
  1. Copy the following into your project root:
    - Create a directory named ".opencode" and place within it a folder "plugins" containing graphify.js, and a file opencode.json as described below.
  2. Ensure graphify-paper outputs exist: graphify update .
  3. In OpenCode, enable the OpenCode memory plugin (see platform docs) and verify the hook is loaded.
- Next steps:
  - We will iteratively tune the hook so memory injection is non-disruptive and only occurs when a graph exists.