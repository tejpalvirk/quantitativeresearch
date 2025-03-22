#!/usr/bin/env node
declare function loadSessionStates(): Promise<Map<string, any[]>>;
declare function saveSessionStates(sessionsMap: Map<string, any[]>): Promise<void>;
interface Entity {
    name: string;
    entityType: string;
    observations: string[];
}
interface Relation {
    from: string;
    to: string;
    relationType: string;
}
interface KnowledgeGraph {
    entities: Entity[];
    relations: Relation[];
}
declare class KnowledgeGraphManager {
    private loadGraph;
    private saveGraph;
    createEntities(entities: Entity[]): Promise<Entity[]>;
    createRelations(relations: Relation[]): Promise<Relation[]>;
    addObservations(observations: {
        entityName: string;
        contents: string[];
    }[]): Promise<{
        entityName: string;
        addedObservations: string[];
    }[]>;
    deleteEntities(entityNames: string[]): Promise<void>;
    deleteObservations(deletions: {
        entityName: string;
        observations: string[];
    }[]): Promise<void>;
    deleteRelations(relations: Relation[]): Promise<void>;
    readGraph(): Promise<KnowledgeGraph>;
    searchNodes(query: string): Promise<KnowledgeGraph>;
    openNodes(names: string[]): Promise<KnowledgeGraph>;
    getProjectOverview(projectName: string): Promise<any>;
    getDatasetAnalysis(datasetName: string): Promise<any>;
    getHypothesisTests(projectName: string, hypothesisName?: string): Promise<any>;
    getVariableRelationships(variableName: string): Promise<any>;
    getStatisticalResults(projectName: string, testType?: string): Promise<any>;
    getVisualizationGallery(projectName: string, datasetName?: string): Promise<any>;
    getModelPerformance(modelName: string): Promise<any>;
    getResearchQuestionResults(questionName: string): Promise<any>;
    getVariableDistribution(variableName: string, datasetName?: string): Promise<any>;
}
export { KnowledgeGraphManager, loadSessionStates, saveSessionStates };
