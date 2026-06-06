import { MCPServer, Model, Skill } from '../types';

export interface DatabaseExportBundle {
    exportedAt: string;
    schemaVersion: 1;
    counts: {
        models: number;
        mcpServers: number;
        skills: number;
    };
    models: Model[];
    mcpServers: MCPServer[];
    skills: Skill[];
}

export function buildDatabaseExportBundle(
    models: Model[],
    mcpServers: MCPServer[],
    skills: Skill[],
    exportedAt = new Date().toISOString()
): DatabaseExportBundle {
    return {
        exportedAt,
        schemaVersion: 1,
        counts: {
            models: models.length,
            mcpServers: mcpServers.length,
            skills: skills.length,
        },
        models,
        mcpServers,
        skills,
    };
}
