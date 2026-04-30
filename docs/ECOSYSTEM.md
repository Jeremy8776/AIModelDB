# DataCert AI Ecosystem

DataCert's local AI stack is split across three focused systems:

| System | Role | Owns |
| --- | --- | --- |
| AI Model DB | Registry and directory | Models, providers, capabilities, pricing, benchmarks, MCP servers, skills, install metadata |
| Context Engine | Context control plane | Memory, rules, skills, modes, generated context, cross-tool deployment |
| DRAM | Runtime orchestration layer | API daemons, local models, hosted model calls, process health, routing, logs, queues |

The short version:

> AI Model DB knows what exists. Context Engine decides what context is active. DRAM runs and routes the systems that execute it.

## AI Model DB's Boundary

AI Model DB is the source of registry truth for the ecosystem:

- model metadata
- provider metadata
- local or hosted availability
- pricing and capability fields
- MCP server directory data
- skill and workflow pack metadata

AI Model DB should expose what exists and what it can do. It should not own per-user active context or runtime daemon control.

## Relationship to the Other Repos

Context Engine consumes registry data from AI Model DB to decide what context can reference or install. DRAM consumes registry and runtime metadata to decide what can be launched, routed, monitored, or selected for execution.

```text
AI Model DB -> Context Engine -> DRAM
     |              |              |
 registry      active context   execution
```