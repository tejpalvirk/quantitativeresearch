#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from "zod";
import { readFileSync, existsSync } from "fs";
// Define memory file path using environment variable with fallback
const defaultMemoryPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'quantitative_research_memory.json');

// If MEMORY_FILE_PATH is just a filename, put it in the same directory as the script
const MEMORY_FILE_PATH = process.env.MEMORY_FILE_PATH
  ? path.isAbsolute(process.env.MEMORY_FILE_PATH)
    ? process.env.MEMORY_FILE_PATH
    : path.join(path.dirname(fileURLToPath(import.meta.url)), process.env.MEMORY_FILE_PATH)
  : defaultMemoryPath;

// Define sessions file path in the same directory as memory file
const SESSIONS_FILE_PATH = process.env.SESSIONS_FILE_PATH || 
  path.join(path.dirname(MEMORY_FILE_PATH), 'quantitative_research_sessions.json');

// Quantitative Research specific entity types
const VALID_ENTITY_TYPES = [
  'project',          // Overall research study
  'dataset',          // Collection of data used for analysis
  'variable',         // Specific measurable attribute in a dataset
  'hypothesis',       // Formal testable statement
  'statisticalTest',  // Analysis method applied to data
  'result',           // Outcome of statistical analysis
  'analysisScript',   // Code used to perform analysis
  'visualization',    // Visual representation of data
  'model',            // Statistical/mathematical model
  'literature',       // Academic sources
  'researchQuestion', // Formal questions guiding the study
  'finding',          // Results or conclusions
  'participant'       // Research subjects
];

// Quantitative Research specific relation types
const VALID_RELATION_TYPES = [
  'correlates_with',  // Statistical correlation between variables
  'predicts',         // Predictive relationship from independent to dependent variable
  'tests',            // Statistical test examines hypothesis
  'analyzes',         // Analysis performed on dataset
  'produces',         // Analysis produces result
  'visualizes',       // Visualization displays data or result
  'contains',         // Hierarchical relationship
  'part_of',          // Entity is part of another entity
  'depends_on',       // Dependency relationship
  'supports',         // Evidence supporting a hypothesis or finding
  'contradicts',      // Evidence contradicting a hypothesis or finding
  'derived_from',     // Entity is derived from another entity
  'controls_for',     // Variable/method controls for confounds
  'moderates',        // Variable moderates a relationship
  'mediates',         // Variable mediates a relationship
  'implements',       // Script implements statistical test/model
  'compares',         // Statistical comparison between groups/variables
  'includes',         // Model includes variables
  'validates',        // Validates a model or result
  'cites'             // References literature
];

// Status values for different entity types in quantitative research
const STATUS_VALUES = {
  project: ['planning', 'data_collection', 'analysis', 'writing', 'complete'],
  dataset: ['raw', 'cleaned', 'transformed', 'analyzed'],
  hypothesis: ['proposed', 'tested', 'supported', 'rejected'],
  statisticalTest: ['planned', 'conducted', 'validated'],
  model: ['specified', 'estimated', 'validated', 'applied'],
  result: ['preliminary', 'verified', 'final'],
  variable: ['defined', 'measured', 'analyzed', 'interpreted']
};

// Basic validation functions
function validateEntityType(entityType: string): boolean {
  return VALID_ENTITY_TYPES.includes(entityType);
}

function validateRelationType(relationType: string): boolean {
  return VALID_RELATION_TYPES.includes(relationType);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Collect tool descriptions from text files
const toolDescriptions: Record<string, string> = {
  'startsession': '',
  'loadcontext': '',
  'deletecontext': '',
  'buildcontext': '',
  'advancedcontext': '',
  'endsession': '',
};
for (const tool of Object.keys(toolDescriptions)) {
  const descriptionFilePath = path.resolve(
    __dirname,
    `quantitativeresearch_${tool}.txt`
  );
  if (existsSync(descriptionFilePath)) {
    toolDescriptions[tool] = readFileSync(descriptionFilePath, 'utf-8');
  }
}

// Session management functions
async function loadSessionStates(): Promise<Map<string, any[]>> {
  try {
    const fileContent = await fs.readFile(SESSIONS_FILE_PATH, 'utf-8');
    const sessions = JSON.parse(fileContent);
    // Convert from object to Map
    const sessionsMap = new Map<string, any[]>();
    for (const [key, value] of Object.entries(sessions)) {
      sessionsMap.set(key, value as any[]);
    }
    return sessionsMap;
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as any).code === "ENOENT") {
      return new Map<string, any[]>();
    }
    throw error;
  }
}

async function saveSessionStates(sessionsMap: Map<string, any[]>): Promise<void> {
  // Convert from Map to object
  const sessions: Record<string, any[]> = {};
  for (const [key, value] of sessionsMap.entries()) {
    sessions[key] = value;
  }
  await fs.writeFile(SESSIONS_FILE_PATH, JSON.stringify(sessions, null, 2), 'utf-8');
}

// Generate a unique session ID
function generateSessionId(): string {
  return `quant_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// We are storing our memory using entities, relations, and observations in a graph structure
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

// The KnowledgeGraphManager class contains all operations to interact with the knowledge graph
class KnowledgeGraphManager {
  private async loadGraph(): Promise<KnowledgeGraph> {
    try {
      const fileContent = await fs.readFile(MEMORY_FILE_PATH, 'utf-8');
      return JSON.parse(fileContent);
    } catch (error) {
      // If the file doesn't exist, return an empty graph
      return {
        entities: [],
        relations: []
      };
    }
  }

  private async saveGraph(graph: KnowledgeGraph): Promise<void> {
    await fs.writeFile(MEMORY_FILE_PATH, JSON.stringify(graph, null, 2), 'utf-8');
  }

  async createEntities(entities: Entity[]): Promise<Entity[]> {
    const graph = await this.loadGraph();
    const existingEntityNames = new Set(graph.entities.map(e => e.name));
    
    // Validate entity types
    entities.forEach(entity => {
      if (!validateEntityType(entity.entityType)) {
        throw new Error(`Invalid entity type: ${entity.entityType}. Valid types are: ${VALID_ENTITY_TYPES.join(', ')}`);
      }
    });
    
    const newEntities = entities.filter(entity => !existingEntityNames.has(entity.name));
    graph.entities.push(...newEntities);
    
    await this.saveGraph(graph);
    return newEntities;
  }

  async createRelations(relations: Relation[]): Promise<Relation[]> {
    const graph = await this.loadGraph();
    const existingEntityNames = new Set(graph.entities.map(e => e.name));
    
    // Check that entities exist and validate relation types
    relations.forEach(relation => {
      if (!existingEntityNames.has(relation.from)) {
        throw new Error(`Entity '${relation.from}' not found`);
      }
      if (!existingEntityNames.has(relation.to)) {
        throw new Error(`Entity '${relation.to}' not found`);
      }
      if (!validateRelationType(relation.relationType)) {
        throw new Error(`Invalid relation type: ${relation.relationType}. Valid types are: ${VALID_RELATION_TYPES.join(', ')}`);
      }
    });
    
    // Filter out duplicate relations
    const existingRelations = new Set(
      graph.relations.map(r => `${r.from}:${r.to}:${r.relationType}`)
    );
    
    const newRelations = relations.filter(
      r => !existingRelations.has(`${r.from}:${r.to}:${r.relationType}`)
    );
    
    graph.relations.push(...newRelations);
    
    await this.saveGraph(graph);
    return newRelations;
  }

  async addObservations(observations: { entityName: string; contents: string[] }[]): Promise<{ entityName: string; addedObservations: string[] }[]> {
    const graph = await this.loadGraph();
    const results: { entityName: string; addedObservations: string[] }[] = [];
    
    for (const observation of observations) {
      const entity = graph.entities.find(e => e.name === observation.entityName);
      if (!entity) {
        throw new Error(`Entity '${observation.entityName}' not found`);
      }
      
      // Filter out duplicate observations
      const existingObservations = new Set(entity.observations);
      const newObservations = observation.contents.filter(o => !existingObservations.has(o));
      
      entity.observations.push(...newObservations);
      results.push({
        entityName: observation.entityName,
        addedObservations: newObservations
      });
    }
    
    await this.saveGraph(graph);
    return results;
  }

  async deleteEntities(entityNames: string[]): Promise<void> {
    const graph = await this.loadGraph();
    
    // Remove the entities
    graph.entities = graph.entities.filter(e => !entityNames.includes(e.name));
    
    // Remove relations that involve the deleted entities
    graph.relations = graph.relations.filter(
      r => !entityNames.includes(r.from) && !entityNames.includes(r.to)
    );
    
    await this.saveGraph(graph);
  }

  async deleteObservations(deletions: { entityName: string; observations: string[] }[]): Promise<void> {
    const graph = await this.loadGraph();
    
    for (const deletion of deletions) {
      const entity = graph.entities.find(e => e.name === deletion.entityName);
      if (entity) {
        // Remove the specified observations
        entity.observations = entity.observations.filter(
          o => !deletion.observations.includes(o)
        );
      }
    }
    
    await this.saveGraph(graph);
  }

  async deleteRelations(relations: Relation[]): Promise<void> {
    const graph = await this.loadGraph();
    
    // Remove specified relations
    graph.relations = graph.relations.filter(r => 
      !relations.some(toDelete => 
        r.from === toDelete.from && 
        r.to === toDelete.to && 
        r.relationType === toDelete.relationType
      )
    );
    
    await this.saveGraph(graph);
  }

  async readGraph(): Promise<KnowledgeGraph> {
    return this.loadGraph();
  }

  async searchNodes(query: string): Promise<KnowledgeGraph> {
    const graph = await this.loadGraph();
    
    // Split query into search terms
    const terms = query.toLowerCase().split(/\s+/);
    
    // Find matching entities
    const matchingEntityNames = new Set<string>();
    
    for (const entity of graph.entities) {
      // Check if all terms match
      const matchesAllTerms = terms.every(term => {
        // Check entity name
        if (entity.name.toLowerCase().includes(term)) {
          return true;
        }
        
        // Check entity type
        if (entity.entityType.toLowerCase().includes(term)) {
          return true;
        }
        
        // Check observations
        for (const observation of entity.observations) {
          if (observation.toLowerCase().includes(term)) {
            return true;
          }
        }
        
        return false;
      });
      
      if (matchesAllTerms) {
        matchingEntityNames.add(entity.name);
      }
    }
    
    // Find relations between matching entities
    const matchingRelations = graph.relations.filter(r => 
      matchingEntityNames.has(r.from) && matchingEntityNames.has(r.to)
    );
    
    // Return matching entities and their relations
    return {
      entities: graph.entities.filter(e => matchingEntityNames.has(e.name)),
      relations: matchingRelations
    };
  }

  async openNodes(names: string[]): Promise<KnowledgeGraph> {
    const graph = await this.loadGraph();
    
    // Find the specified entities
    const entities = graph.entities.filter(e => names.includes(e.name));
    
    // Find relations between the specified entities
    const relations = graph.relations.filter(r => 
      names.includes(r.from) && names.includes(r.to)
    );
    
    return {
      entities,
      relations
    };
  }

  // Get project overview including research questions, methodology, datasets
  async getProjectOverview(projectName: string): Promise<any> {
    const graph = await this.loadGraph();
    
    // Find the project
    const project = graph.entities.find(e => e.name === projectName && e.entityType === 'project');
    if (!project) {
      throw new Error(`Project '${projectName}' not found`);
    }
    
    // Find research questions
    const researchQuestions: Entity[] = [];
    for (const relation of graph.relations) {
      if (relation.relationType === 'part_of' && relation.to === projectName) {
        const question = graph.entities.find(
          e => e.name === relation.from && e.entityType === 'researchQuestion'
        );
        if (question) {
          researchQuestions.push(question);
        }
      }
    }
    
    // Find datasets
    const datasets: Entity[] = [];
    for (const relation of graph.relations) {
      if (relation.relationType === 'part_of' && relation.to === projectName) {
        const dataset = graph.entities.find(
          e => e.name === relation.from && e.entityType === 'dataset'
        );
        if (dataset) {
          datasets.push(dataset);
        }
      }
    }
    
    // Find hypotheses
    const hypotheses: Entity[] = [];
    for (const relation of graph.relations) {
      if (relation.relationType === 'part_of' && relation.to === projectName) {
        const hypothesis = graph.entities.find(
          e => e.name === relation.from && e.entityType === 'hypothesis'
        );
        if (hypothesis) {
          hypotheses.push(hypothesis);
        }
      }
    }
    
    // Find statistical models
    const models: Entity[] = [];
    for (const relation of graph.relations) {
      if (relation.relationType === 'part_of' && relation.to === projectName) {
        const model = graph.entities.find(
          e => e.name === relation.from && e.entityType === 'model'
        );
        if (model) {
          models.push(model);
        }
      }
    }
    
    // Find findings
    const findings: Entity[] = [];
    for (const relation of graph.relations) {
      if (relation.relationType === 'part_of' && relation.to === projectName) {
        const finding = graph.entities.find(
          e => e.name === relation.from && e.entityType === 'finding'
        );
        if (finding) {
          findings.push(finding);
        }
      }
    }
    
    // Get methodology info from project observations
    const methodologyObs = project.observations.filter(
      o => o.toLowerCase().includes('method') || 
           o.toLowerCase().includes('approach') ||
           o.toLowerCase().includes('design')
    );
    
    // Get participant information
    const participantInfo = project.observations.filter(
      o => o.toLowerCase().includes('participant') || 
           o.toLowerCase().includes('sample') ||
           o.toLowerCase().includes('subject')
    );
    
    // Count variables across all datasets
    let totalVariables = 0;
    for (const dataset of datasets) {
      const datasetVariables: Entity[] = [];
      for (const relation of graph.relations) {
        if (relation.relationType === 'contains' && relation.from === dataset.name) {
          const variable = graph.entities.find(
            e => e.name === relation.to && e.entityType === 'variable'
          );
          if (variable) {
            datasetVariables.push(variable);
          }
        }
      }
      totalVariables += datasetVariables.length;
    }
    
    return {
      project,
      researchQuestions,
      methodology: methodologyObs,
      participants: participantInfo,
      dataCollection: {
        datasets: datasets.length,
        totalVariables,
        datasetList: datasets
      },
      analysis: {
        hypotheses: hypotheses.length,
        models: models.length,
        hypothesisList: hypotheses,
        modelsList: models
      },
      findings
    };
  }

  // Get all variables, descriptive statistics, and analyses for a dataset
  async getDatasetAnalysis(datasetName: string): Promise<any> {
    const graph = await this.loadGraph();
    
    // Find the dataset
    const dataset = graph.entities.find(e => e.name === datasetName && e.entityType === 'dataset');
    if (!dataset) {
      throw new Error(`Dataset '${datasetName}' not found`);
    }
    
    // Find variables in this dataset
    const variables: Entity[] = [];
    for (const relation of graph.relations) {
      if (relation.relationType === 'contains' && relation.from === datasetName) {
        const variable = graph.entities.find(e => e.name === relation.to && e.entityType === 'variable');
        if (variable) {
          variables.push(variable);
        }
      }
    }
    
    // Find statistical tests performed on this dataset
    const statisticalTests: Entity[] = [];
    for (const relation of graph.relations) {
      if (relation.relationType === 'analyzes' && relation.to === datasetName) {
        const test = graph.entities.find(e => e.name === relation.from && e.entityType === 'statisticalTest');
        if (test) {
          statisticalTests.push(test);
        }
      }
    }
    
    // Find models that use this dataset
    const models: Entity[] = [];
    for (const relation of graph.relations) {
      if (relation.relationType === 'analyzes' && relation.to === datasetName) {
        const model = graph.entities.find(e => e.name === relation.from && e.entityType === 'model');
        if (model) {
          models.push(model);
        }
      }
    }
    
    // Find visualizations of this dataset
    const visualizations: Entity[] = [];
    for (const relation of graph.relations) {
      if (relation.relationType === 'visualizes' && relation.to === datasetName) {
        const visualization = graph.entities.find(e => e.name === relation.from && e.entityType === 'visualization');
        if (visualization) {
          visualizations.push(visualization);
        }
      }
    }
    
    // Extract dataset metadata
    const sizeObs = dataset.observations.find(o => o.startsWith('Size:') || o.startsWith('n=') || o.startsWith('N='));
    const size = sizeObs ? sizeObs.split(':')[1]?.trim() || sizeObs.split('=')[1]?.trim() : 'unknown';
    
    const sourceObs = dataset.observations.find(o => o.startsWith('Source:'));
    const source = sourceObs ? sourceObs.split(':')[1].trim() : 'unknown';
    
    const dateObs = dataset.observations.find(o => o.startsWith('Date:') || o.startsWith('Collected:'));
    const date = dateObs ? dateObs.split(':')[1].trim() : 'unknown';
    
    const statusObs = dataset.observations.find(o => o.startsWith('Status:'));
    const status = statusObs ? statusObs.split(':')[1].trim() : 'unknown';
    
    // Organize variables by type
    const independentVariables = variables.filter(v => 
      v.observations.some(o => o.toLowerCase().includes('independent') || 
                               o.toLowerCase().includes('predictor') ||
                               o.toLowerCase().includes('iv'))
    );
    
    const dependentVariables = variables.filter(v => 
      v.observations.some(o => o.toLowerCase().includes('dependent') || 
                               o.toLowerCase().includes('outcome') ||
                               o.toLowerCase().includes('dv'))
    );
    
    const controlVariables = variables.filter(v => 
      v.observations.some(o => o.toLowerCase().includes('control') || o.toLowerCase().includes('covariate'))
    );
    
    const otherVariables = variables.filter(v => 
      !independentVariables.includes(v) && !dependentVariables.includes(v) && !controlVariables.includes(v)
    );
    
    return {
      dataset,
      metadata: {
        size,
        source,
        date,
        status
      },
      variables: {
        count: variables.length,
        independent: independentVariables,
        dependent: dependentVariables,
        control: controlVariables,
        other: otherVariables
      },
      analysis: {
        statisticalTests,
        models,
        visualizations
      }
    };
  }

  // Get hypotheses with associated tests and results
  async getHypothesisTests(projectName: string, hypothesisName?: string): Promise<any> {
    const graph = await this.loadGraph();
    
    // Find the project
    const project = graph.entities.find(e => e.name === projectName && e.entityType === 'project');
    if (!project) {
      throw new Error(`Project '${projectName}' not found`);
    }
    
    // Get all hypotheses for this project, or a specific one if specified
    let hypotheses: Entity[] = [];
    
    if (hypothesisName) {
      // Find the specific hypothesis
      const hypothesis = graph.entities.find(e => e.name === hypothesisName && e.entityType === 'hypothesis');
      if (!hypothesis) {
        throw new Error(`Hypothesis '${hypothesisName}' not found`);
      }
      hypotheses.push(hypothesis);
    } else {
      // Find all hypotheses for this project
      for (const relation of graph.relations) {
        if (relation.relationType === 'part_of' && relation.to === projectName) {
          const hypothesis = graph.entities.find(e => e.name === relation.from && e.entityType === 'hypothesis');
          if (hypothesis) {
            hypotheses.push(hypothesis);
          }
        }
      }
    }
    
    // For each hypothesis, find tests and results
    const hypothesisAnalyses = hypotheses.map(hypothesis => {
      // Find statistical tests for this hypothesis
      const tests: Entity[] = [];
      for (const relation of graph.relations) {
        if (relation.relationType === 'tests' && relation.to === hypothesis.name) {
          const test = graph.entities.find(e => e.name === relation.from && e.entityType === 'statisticalTest');
          if (test) {
            tests.push(test);
          }
        }
      }
      
      // For each test, find its results
      const testResults = tests.map(test => {
        const results: Entity[] = [];
        for (const relation of graph.relations) {
          if (relation.relationType === 'produces' && relation.from === test.name) {
            const result = graph.entities.find(e => e.name === relation.to && e.entityType === 'result');
            if (result) {
              results.push(result);
            }
          }
        }
        
        return {
          test,
          results
        };
      });
      
      // Extract hypothesis status from observations
      const statusObs = hypothesis.observations.find(o => o.startsWith('Status:'));
      const status = statusObs ? statusObs.split(':')[1].trim() : 'unknown';
      
      // Determine if hypothesis is supported based on results
      const isSupported = status === 'supported';
      
      return {
        hypothesis,
        status,
        isSupported,
        tests: testResults
      };
    });
    
    return {
      project,
      hypotheses: hypothesisAnalyses
    };
  }

  // Get relationships between variables (correlations, predictions, moderations)
  async getVariableRelationships(variableName: string): Promise<any> {
    const graph = await this.loadGraph();
    
    // Find the variable
    const variable = graph.entities.find(e => e.name === variableName && e.entityType === 'variable');
    if (!variable) {
      throw new Error(`Variable '${variableName}' not found`);
    }
    
    // Find which dataset this variable is part of
    const datasets: Entity[] = [];
    for (const relation of graph.relations) {
      if (relation.relationType === 'contains' && relation.to === variableName) {
        const dataset = graph.entities.find(e => e.name === relation.from && e.entityType === 'dataset');
        if (dataset) {
          datasets.push(dataset);
        }
      }
    }
    
    // Find correlations
    const correlations: { variable: Entity; strength: string; direction: string }[] = [];
    for (const relation of graph.relations) {
      if (relation.relationType === 'correlates_with' && 
         (relation.from === variableName || relation.to === variableName)) {
        
        // Get the other variable in the correlation
        const otherVariableName = relation.from === variableName ? relation.to : relation.from;
        const otherVariable = graph.entities.find(e => e.name === otherVariableName && e.entityType === 'variable');
        
        if (otherVariable) {
          // Look for correlation strength and direction in observations
          const strengthObs = otherVariable.observations.find(o => o.includes(`correlation with ${variableName}`));
          let strength = 'unknown';
          let direction = 'unknown';
          
          if (strengthObs) {
            // Try to extract strength (weak, moderate, strong)
            if (strengthObs.toLowerCase().includes('weak')) {
              strength = 'weak';
            } else if (strengthObs.toLowerCase().includes('moderate')) {
              strength = 'moderate';
            } else if (strengthObs.toLowerCase().includes('strong')) {
              strength = 'strong';
            }
            
            // Try to extract direction (positive, negative)
            if (strengthObs.toLowerCase().includes('positive')) {
              direction = 'positive';
            } else if (strengthObs.toLowerCase().includes('negative')) {
              direction = 'negative';
            }
          }
          
          correlations.push({
            variable: otherVariable,
            strength,
            direction
          });
        }
      }
    }
    
    // Find prediction relationships (as predictor)
    const predicts: Entity[] = [];
    for (const relation of graph.relations) {
      if (relation.relationType === 'predicts' && relation.from === variableName) {
        const outcome = graph.entities.find(e => e.name === relation.to && e.entityType === 'variable');
        if (outcome) {
          predicts.push(outcome);
        }
      }
    }
    
    // Find prediction relationships (as outcome)
    const predictedBy: Entity[] = [];
    for (const relation of graph.relations) {
      if (relation.relationType === 'predicts' && relation.to === variableName) {
        const predictor = graph.entities.find(e => e.name === relation.from && e.entityType === 'variable');
        if (predictor) {
          predictedBy.push(predictor);
        }
      }
    }
    
    // Find moderation relationships
    const moderates: Entity[] = [];
    for (const relation of graph.relations) {
      if (relation.relationType === 'moderates' && relation.from === variableName) {
        const relationship = graph.entities.find(e => e.name === relation.to);
        if (relationship) {
          moderates.push(relationship);
        }
      }
    }
    
    // Find mediation relationships
    const mediates: Entity[] = [];
    for (const relation of graph.relations) {
      if (relation.relationType === 'mediates' && relation.from === variableName) {
        const relationship = graph.entities.find(e => e.name === relation.to);
        if (relationship) {
          mediates.push(relationship);
        }
      }
    }
    
    // Find statistical tests involving this variable
    const statisticalTests: Entity[] = [];
    for (const relation of graph.relations) {
      if ((relation.from === variableName || relation.to === variableName) &&
          (relation.relationType === 'analyzes' || relation.relationType === 'tests')) {
        const test = graph.entities.find(e => 
          e.name === (relation.relationType === 'analyzes' ? relation.from : relation.to) && 
          e.entityType === 'statisticalTest'
        );
        if (test) {
          statisticalTests.push(test);
        }
      }
    }
    
    // Get variable metadata
    const typeObs = variable.observations.find(o => o.startsWith('Type:') || o.startsWith('Data Type:'));
    const dataType = typeObs ? typeObs.split(':')[1].trim() : 'unknown';
    
    const roleObs = variable.observations.find(o => o.startsWith('Role:'));
    const role = roleObs ? roleObs.split(':')[1].trim() : 'unknown';
    
    const descriptionObs = variable.observations.find(o => o.startsWith('Description:'));
    const description = descriptionObs ? descriptionObs.split(':')[1].trim() : 'unknown';
    
    return {
      variable,
      datasets,
      metadata: {
        dataType,
        role,
        description
      },
      relationships: {
        correlations,
        predicts,
        predictedBy,
        moderates,
        mediates
      },
      statisticalTests
    };
  }

  // Shows results organized by statistical tests
  async getStatisticalResults(projectName: string, testType?: string): Promise<any> {
    const graph = await this.loadGraph();
    
    // Find the project
    const project = graph.entities.find(e => e.name === projectName && e.entityType === 'project');
    if (!project) {
      throw new Error(`Project '${projectName}' not found`);
    }
    
    // Find all statistical tests for this project
    let statisticalTests: Entity[] = [];
    
    // First, get all tests directly part of the project
    for (const relation of graph.relations) {
      if (relation.relationType === 'part_of' && relation.to === projectName) {
        const test = graph.entities.find(e => e.name === relation.from && e.entityType === 'statisticalTest');
        if (test) {
          statisticalTests.push(test);
        }
      }
    }
    
    // Also include tests associated with project datasets
    const projectDatasets: Entity[] = [];
    for (const relation of graph.relations) {
      if (relation.relationType === 'part_of' && relation.to === projectName) {
        const dataset = graph.entities.find(e => e.name === relation.from && e.entityType === 'dataset');
        if (dataset) {
          projectDatasets.push(dataset);
        }
      }
    }
    
    for (const dataset of projectDatasets) {
      for (const relation of graph.relations) {
        if (relation.relationType === 'analyzes' && relation.to === dataset.name) {
          const test = graph.entities.find(e => e.name === relation.from && e.entityType === 'statisticalTest');
          if (test && !statisticalTests.some(t => t.name === test.name)) {
            statisticalTests.push(test);
          }
        }
      }
    }
    
    // Filter by test type if specified
    if (testType) {
      statisticalTests = statisticalTests.filter(test => 
        test.observations.some(o => o.toLowerCase().includes(testType.toLowerCase()))
      );
    }
    
    // For each test, get its details and results
    const testResults = statisticalTests.map(test => {
      // Find which hypothesis this test is related to, if any
      const hypotheses: Entity[] = [];
      for (const relation of graph.relations) {
        if (relation.relationType === 'tests' && relation.from === test.name) {
          const hypothesis = graph.entities.find(e => e.name === relation.to && e.entityType === 'hypothesis');
          if (hypothesis) {
            hypotheses.push(hypothesis);
          }
        }
      }
      
      // Find which dataset this test analyzes
      const datasets: Entity[] = [];
      for (const relation of graph.relations) {
        if (relation.relationType === 'analyzes' && relation.from === test.name) {
          const dataset = graph.entities.find(e => e.name === relation.to && e.entityType === 'dataset');
          if (dataset) {
            datasets.push(dataset);
          }
        }
      }
      
      // Find which variables are included in this test
      const variables: Entity[] = [];
      for (const relation of graph.relations) {
        if (relation.relationType === 'analyzes' && relation.from === test.name) {
          const variable = graph.entities.find(e => e.name === relation.to && e.entityType === 'variable');
          if (variable) {
            variables.push(variable);
          }
        }
      }
      
      // Find results produced by this test
      const results: Entity[] = [];
      for (const relation of graph.relations) {
        if (relation.relationType === 'produces' && relation.from === test.name) {
          const result = graph.entities.find(e => e.name === relation.to && e.entityType === 'result');
          if (result) {
            results.push(result);
          }
        }
      }
      
      // Extract test metadata
      const typeObs = test.observations.find(o => o.startsWith('Type:'));
      const type = typeObs ? typeObs.split(':')[1].trim() : 'unknown';
      
      const statusObs = test.observations.find(o => o.startsWith('Status:'));
      const status = statusObs ? statusObs.split(':')[1].trim() : 'unknown';
      
      const significanceObs = results.flatMap(r => r.observations).find(o => 
        o.toLowerCase().includes('p value:') || 
        o.toLowerCase().includes('p-value:') || 
        o.toLowerCase().includes('significance:')
      );
      const significance = significanceObs ? significanceObs.split(':')[1].trim() : 'unknown';
      
      // Check if result is significant
      const isSignificant = significance !== 'unknown' && 
                            (significance.toLowerCase().includes('significant') ||
                             (significance.includes('p') && significance.includes('<') && significance.includes('0.05')));
      
      return {
        test,
        type,
        status,
        hypotheses,
        datasets,
        variables,
        results,
        significance,
        isSignificant
      };
    });
    
    // Group tests by type
    const testsByType: { [key: string]: any[] } = {};
    testResults.forEach(result => {
      if (!testsByType[result.type]) {
        testsByType[result.type] = [];
      }
      testsByType[result.type].push(result);
    });
    
    return {
      project,
      testResults,
      testsByType,
      significantResults: testResults.filter(r => r.isSignificant)
    };
  }

  // Returns all visualizations for a project or specific dataset
  async getVisualizationGallery(projectName: string, datasetName?: string): Promise<any> {
    const graph = await this.loadGraph();
    
    // Find the project
    const project = graph.entities.find(e => e.name === projectName && e.entityType === 'project');
    if (!project) {
      throw new Error(`Project '${projectName}' not found`);
    }
    
    // Find dataset if specified
    let dataset: Entity | undefined;
    if (datasetName) {
      dataset = graph.entities.find(e => e.name === datasetName && e.entityType === 'dataset');
      if (!dataset) {
        throw new Error(`Dataset '${datasetName}' not found`);
      }
    }
    
    // Find visualizations for this project or dataset
    const visualizations: Entity[] = [];
    
    // If dataset is specified, get only visualizations for that dataset
    if (dataset) {
      for (const relation of graph.relations) {
        if (relation.relationType === 'visualizes' && relation.to === datasetName) {
          const visualization = graph.entities.find(e => e.name === relation.from && e.entityType === 'visualization');
          if (visualization) {
            visualizations.push(visualization);
          }
        }
      }
    } else {
      // Get visualizations related to any project dataset
      const projectDatasets: Entity[] = [];
      for (const relation of graph.relations) {
        if (relation.relationType === 'part_of' && relation.to === projectName) {
          const dataset = graph.entities.find(e => e.name === relation.from && e.entityType === 'dataset');
          if (dataset) {
            projectDatasets.push(dataset);
          }
        }
      }
      
      for (const dataset of projectDatasets) {
        for (const relation of graph.relations) {
          if (relation.relationType === 'visualizes' && relation.to === dataset.name) {
            const visualization = graph.entities.find(e => e.name === relation.from && e.entityType === 'visualization');
            if (visualization && !visualizations.some(v => v.name === visualization.name)) {
              visualizations.push(visualization);
            }
          }
        }
      }
      
      // Also include visualizations of model results
      const projectModels: Entity[] = [];
      for (const relation of graph.relations) {
        if (relation.relationType === 'part_of' && relation.to === projectName) {
          const model = graph.entities.find(e => e.name === relation.from && e.entityType === 'model');
          if (model) {
            projectModels.push(model);
          }
        }
      }
      
      for (const model of projectModels) {
        for (const relation of graph.relations) {
          if (relation.relationType === 'visualizes' && relation.to === model.name) {
            const visualization = graph.entities.find(e => e.name === relation.from && e.entityType === 'visualization');
            if (visualization && !visualizations.some(v => v.name === visualization.name)) {
              visualizations.push(visualization);
            }
          }
        }
      }
    }
    
    // Group visualizations by type
    const visualizationsByType: { [key: string]: Entity[] } = {};
    
    for (const visualization of visualizations) {
      const typeObs = visualization.observations.find(o => o.startsWith('Type:'));
      const type = typeObs ? typeObs.split(':')[1].trim() : 'Other';
      
      if (!visualizationsByType[type]) {
        visualizationsByType[type] = [];
      }
      
      visualizationsByType[type].push(visualization);
    }
    
    // Get information about what variables are visualized
    const visualizationDetails = visualizations.map(visualization => {
      // Find which variables are visualized
      const variables: Entity[] = [];
      for (const relation of graph.relations) {
        if (relation.relationType === 'visualizes' && relation.from === visualization.name) {
          const variable = graph.entities.find(e => e.name === relation.to && e.entityType === 'variable');
          if (variable) {
            variables.push(variable);
          }
        }
      }
      
      // Extract visualization metadata
      const typeObs = visualization.observations.find(o => o.startsWith('Type:'));
      const type = typeObs ? typeObs.split(':')[1].trim() : 'unknown';
      
      const titleObs = visualization.observations.find(o => o.startsWith('Title:'));
      const title = titleObs ? titleObs.split(':')[1].trim() : visualization.name;
      
      const descriptionObs = visualization.observations.find(o => o.startsWith('Description:'));
      const description = descriptionObs ? descriptionObs.split(':')[1].trim() : '';
      
      return {
        visualization,
        type,
        title,
        description,
        variables
      };
    });
    
    return {
      project,
      dataset,
      visualizations: visualizationDetails,
      visualizationsByType,
      count: visualizations.length
    };
  }

  // Returns performance metrics for statistical models
  async getModelPerformance(modelName: string): Promise<any> {
    const graph = await this.loadGraph();
    
    // Find the model
    const model = graph.entities.find(e => e.name === modelName && e.entityType === 'model');
    if (!model) {
      throw new Error(`Model '${modelName}' not found`);
    }
    
    // Find variables included in the model
    const variables: Entity[] = [];
    for (const relation of graph.relations) {
      if (relation.relationType === 'includes' && relation.from === modelName) {
        const variable = graph.entities.find(e => e.name === relation.to && e.entityType === 'variable');
        if (variable) {
          variables.push(variable);
        }
      }
    }
    
    // Find predictors (independent variables)
    const predictors: Entity[] = [];
    for (const relation of graph.relations) {
      if (relation.relationType === 'predicts' && relation.from === modelName) {
        const variable = graph.entities.find(e => e.name === relation.to && e.entityType === 'variable');
        if (variable) {
          predictors.push(variable);
        }
      }
    }
    
    // Find outcomes (dependent variables)
    const outcomes: Entity[] = [];
    for (const relation of graph.relations) {
      if (relation.relationType === 'contains' && relation.from === modelName) {
        const variable = graph.entities.find(e => 
          e.name === relation.to && 
          e.entityType === 'variable' &&
          e.observations.some(o => 
            o.toLowerCase().includes('dependent') || 
            o.toLowerCase().includes('outcome') ||
            o.toLowerCase().includes('dv')
          )
        );
        
        if (variable) {
          outcomes.push(variable);
        }
      }
    }
    
    // Find datasets this model analyzes
    const datasets: Entity[] = [];
    for (const relation of graph.relations) {
      if (relation.relationType === 'analyzes' && relation.from === modelName) {
        const dataset = graph.entities.find(e => e.name === relation.to && e.entityType === 'dataset');
        if (dataset) {
          datasets.push(dataset);
        }
      }
    }
    
    // Find results produced by this model
    const results: Entity[] = [];
    for (const relation of graph.relations) {
      if (relation.relationType === 'produces' && relation.from === modelName) {
        const result = graph.entities.find(e => e.name === relation.to && e.entityType === 'result');
        if (result) {
          results.push(result);
        }
      }
    }
    
    // Find visualizations of this model
    const visualizations: Entity[] = [];
    for (const relation of graph.relations) {
      if (relation.relationType === 'visualizes' && relation.to === modelName) {
        const visualization = graph.entities.find(e => e.name === relation.from && e.entityType === 'visualization');
        if (visualization) {
          visualizations.push(visualization);
        }
      }
    }
    
    // Extract model type and performance metrics
    const typeObs = model.observations.find(o => o.startsWith('Type:'));
    const modelType = typeObs ? typeObs.split(':')[1].trim() : 'unknown';
    
    // Extract performance metrics
    const performanceMetrics = model.observations.filter(o => 
      o.toLowerCase().includes('r²') || 
      o.toLowerCase().includes('r-squared') ||
      o.toLowerCase().includes('mse') ||
      o.toLowerCase().includes('rmse') ||
      o.toLowerCase().includes('mae') ||
      o.toLowerCase().includes('aic') ||
      o.toLowerCase().includes('bic') ||
      o.toLowerCase().includes('accuracy') ||
      o.toLowerCase().includes('precision') ||
      o.toLowerCase().includes('recall') ||
      o.toLowerCase().includes('f1')
    );
    
    // Look for validation information
    const validationObs = model.observations.filter(o => 
      o.toLowerCase().includes('validation') || 
      o.toLowerCase().includes('cross-validation') ||
      o.toLowerCase().includes('test data')
    );
    
    return {
      model,
      modelType,
      variables,
      predictors,
      outcomes,
      datasets,
      results,
      performanceMetrics,
      validation: validationObs,
      visualizations
    };
  }

  // Shows results organized by research questions
  async getResearchQuestionResults(questionName: string): Promise<any> {
    const graph = await this.loadGraph();
    
    // Find the research question
    const question = graph.entities.find(e => e.name === questionName && e.entityType === 'researchQuestion');
    if (!question) {
      throw new Error(`Research question '${questionName}' not found`);
    }
    
    // Find which project this question is part of
    let project: Entity | undefined;
    for (const relation of graph.relations) {
      if (relation.relationType === 'part_of' && relation.from === questionName) {
        project = graph.entities.find(e => e.name === relation.to && e.entityType === 'project');
        if (project) {
          break;
        }
      }
    }
    
    // Find hypotheses related to this question
    const hypotheses: Entity[] = [];
    for (const relation of graph.relations) {
      if (relation.relationType === 'related_to' && relation.from === questionName) {
        const hypothesis = graph.entities.find(e => e.name === relation.to && e.entityType === 'hypothesis');
        if (hypothesis) {
          hypotheses.push(hypothesis);
        }
      }
    }
    
    // Find direct results that answer this question
    const directResults: Entity[] = [];
    for (const relation of graph.relations) {
      if (relation.relationType === 'answers' && relation.to === questionName) {
        const result = graph.entities.find(e => e.name === relation.from && e.entityType === 'result');
        if (result) {
          directResults.push(result);
        }
      }
    }
    
    // Find findings that answer this question
    const findings: Entity[] = [];
    for (const relation of graph.relations) {
      if (relation.relationType === 'answers' && relation.to === questionName) {
        const finding = graph.entities.find(e => e.name === relation.from && e.entityType === 'finding');
        if (finding) {
          findings.push(finding);
        }
      }
    }
    
    // For each hypothesis, find its tests and results
    const hypothesisResults = hypotheses.map(hypothesis => {
      // Find statistical tests for this hypothesis
      const tests: Entity[] = [];
      for (const relation of graph.relations) {
        if (relation.relationType === 'tests' && relation.to === hypothesis.name) {
          const test = graph.entities.find(e => e.name === relation.from && e.entityType === 'statisticalTest');
          if (test) {
            tests.push(test);
          }
        }
      }
      
      // For each test, find its results
      const testResults = tests.map(test => {
        const results: Entity[] = [];
        for (const relation of graph.relations) {
          if (relation.relationType === 'produces' && relation.from === test.name) {
            const result = graph.entities.find(e => e.name === relation.to && e.entityType === 'result');
            if (result) {
              results.push(result);
            }
          }
        }
        
        return {
          test,
          results
        };
      });
      
      // Extract hypothesis status from observations
      const statusObs = hypothesis.observations.find(o => o.startsWith('Status:'));
      const status = statusObs ? statusObs.split(':')[1].trim() : 'unknown';
      
      // Determine if hypothesis is supported based on results
      const isSupported = status === 'supported';
      
      return {
        hypothesis,
        status,
        isSupported,
        tests: testResults
      };
    });
    
    return {
      question,
      project,
      directResults,
      findings,
      hypotheses: hypothesisResults
    };
  }

  // Returns distributional statistics for variables
  async getVariableDistribution(variableName: string, datasetName?: string): Promise<any> {
    const graph = await this.loadGraph();
    
    // Find the variable
    const variable = graph.entities.find(e => e.name === variableName && e.entityType === 'variable');
    if (!variable) {
      throw new Error(`Variable '${variableName}' not found`);
    }
    
    // Find datasets containing this variable
    let datasets: Entity[] = [];
    
    if (datasetName) {
      // If dataset is specified, verify it contains the variable
      const dataset = graph.entities.find(e => e.name === datasetName && e.entityType === 'dataset');
      if (!dataset) {
        throw new Error(`Dataset '${datasetName}' not found`);
      }
      
      const containsRelation = graph.relations.find(r => 
        r.relationType === 'contains' && r.from === datasetName && r.to === variableName
      );
      
      if (!containsRelation) {
        throw new Error(`Dataset '${datasetName}' does not contain variable '${variableName}'`);
      }
      
      datasets.push(dataset);
    } else {
      // Otherwise find all datasets containing this variable
      for (const relation of graph.relations) {
        if (relation.relationType === 'contains' && relation.to === variableName) {
          const dataset = graph.entities.find(e => e.name === relation.from && e.entityType === 'dataset');
          if (dataset) {
            datasets.push(dataset);
          }
        }
      }
    }
    
    // Extract descriptive statistics from variable observations
    const descriptiveStats: {[key: string]: string} = {};
    
    // Common descriptive statistics to look for
    const statKeys = [
      'Mean:', 'Median:', 'Mode:', 'Range:', 'Minimum:', 'Maximum:', 
      'Standard Deviation:', 'Variance:', 'Skewness:', 'Kurtosis:',
      'n=', 'N='
    ];
    
    for (const key of statKeys) {
      const obs = variable.observations.find(o => o.startsWith(key));
      if (obs) {
        const value = obs.split(':')[1]?.trim() || obs.split('=')[1]?.trim();
        if (value) {
          descriptiveStats[key.replace(':', '')] = value;
        }
      }
    }
    
    // Look for normality test information
    const normalityObs = variable.observations.filter(o => 
      o.toLowerCase().includes('normality') || 
      o.toLowerCase().includes('shapiro') ||
      o.toLowerCase().includes('kolmogorov')
    );
    
    // Find visualizations of this variable
    const visualizations: Entity[] = [];
    for (const relation of graph.relations) {
      if (relation.relationType === 'visualizes' && relation.to === variableName) {
        const visualization = graph.entities.find(e => e.name === relation.from && e.entityType === 'visualization');
        if (visualization) {
          visualizations.push(visualization);
        }
      }
    }
    
    // Extract variable metadata
    const typeObs = variable.observations.find(o => o.startsWith('Type:') || o.startsWith('Data Type:'));
    const dataType = typeObs ? typeObs.split(':')[1].trim() : 'unknown';
    
    const roleObs = variable.observations.find(o => o.startsWith('Role:'));
    const role = roleObs ? roleObs.split(':')[1].trim() : 'unknown';
    
    const scaleObs = variable.observations.find(o => o.startsWith('Scale:') || o.startsWith('Measurement Scale:'));
    const scale = scaleObs ? scaleObs.split(':')[1].trim() : 'unknown';
    
    return {
      variable,
      datasets,
      metadata: {
        dataType,
        role,
        scale
      },
      distribution: {
        descriptiveStats,
        normality: normalityObs
      },
      visualizations
    };
  }
}

// Main function to set up the MCP server
async function main() {
  try {
    const knowledgeGraphManager = new KnowledgeGraphManager();
    
    // Create the MCP server with a name and version
    const server = new McpServer({
      name: "Context Manager",
      version: "1.0.0"
    });
    
    // Define a resource that exposes the entire graph
    server.resource(
      "graph",
      "graph://researcher/quantitative",
      async (uri) => ({
        contents: [{
          uri: uri.href,
          text: JSON.stringify(await knowledgeGraphManager.readGraph(), null, 2)
        }]
      })
    );
    
    // Define tools using zod for parameter validation

    /**
     * Start a new session for quantitative research. Returns session ID, recent sessions, active projects, datasets, research questions, statistical models, and visualizations.
     */
    server.tool(
      "startsession",
      toolDescriptions["startsession"],
      {},
      async () => {
        try {
          // Generate a unique session ID
          const sessionId = generateSessionId();
          
          // Get recent sessions from persistent storage instead of entities
          const sessionStates = await loadSessionStates();
          
          // Convert sessions map to array, sort by date, and take most recent ones
          const recentSessions = Array.from(sessionStates.entries())
            .map(([id, stages]) => {
              // Extract summary data from the first stage (if it exists)
              const summaryStage = stages.find(s => s.stage === "summary");
              return {
                id,
                date: summaryStage?.stageData?.date || "Unknown date",
                project: summaryStage?.stageData?.project || "Unknown project",
                summary: summaryStage?.stageData?.summary || "No summary available"
              };
            })
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 3); // Default to 3 recent sessions
          
          // Get active research projects
          const projectsQuery = await knowledgeGraphManager.searchNodes("entityType:project status:active");
          const projects = projectsQuery.entities;
          
          // Get a sampling of datasets
          const datasetsQuery = await knowledgeGraphManager.searchNodes("entityType:dataset");
          const datasets = datasetsQuery.entities.slice(0, 5); // Limit to 5 for initial display
          
          // Get research questions
          const questionsQuery = await knowledgeGraphManager.searchNodes("entityType:research_question");
          const questions = questionsQuery.entities.slice(0, 5); // Top 5 research questions
          
          // Get statistical models
          const modelsQuery = await knowledgeGraphManager.searchNodes("entityType:model");
          const models = modelsQuery.entities
            .sort((a, b) => {
              const dateA = a.observations.find(o => o.startsWith("created:"))?.substring(8) || "";
              const dateB = b.observations.find(o => o.startsWith("created:"))?.substring(8) || "";
              return dateB.localeCompare(dateA); // Sort by date descending
            })
            .slice(0, 3); // Most recent 3 models
            
          // Get visualizations
          const visualizationsQuery = await knowledgeGraphManager.searchNodes("entityType:visualization");
          const visualizations = visualizationsQuery.entities
            .sort((a, b) => {
              const dateA = a.observations.find(o => o.startsWith("created:"))?.substring(8) || "";
              const dateB = b.observations.find(o => o.startsWith("created:"))?.substring(8) || "";
              return dateB.localeCompare(dateA); // Sort by date descending
            })
            .slice(0, 3); // Most recent 3 visualizations
          
          // Format the data for display
          const projectsText = projects.map(p => {
            const status = p.observations.find(o => o.startsWith("status:"))?.substring(7) || "Unknown";
            const phase = p.observations.find(o => o.startsWith("phase:"))?.substring(6) || "Unknown";
            return `- **${p.name}** (${status}, Phase: ${phase})`;
          }).join("\n");
          
          const datasetsText = datasets.map(d => {
            const size = d.observations.find(o => o.startsWith("size:"))?.substring(5) || "Unknown";
            const lastUpdated = d.observations.find(o => o.startsWith("updated:"))?.substring(8) || "Unknown";
            return `- **${d.name}** (Size: ${size}, Updated: ${lastUpdated})`;
          }).join("\n");
          
          const questionsText = questions.map(q => {
            const status = q.observations.find(o => o.startsWith("status:"))?.substring(7) || "Open";
            return `- **${q.name}** (${status})`;
          }).join("\n");
          
          const modelsText = models.map(m => {
            const type = m.observations.find(o => o.startsWith("type:"))?.substring(5) || "Unknown";
            const accuracy = m.observations.find(o => o.startsWith("accuracy:"))?.substring(9) || "Unknown";
            return `- **${m.name}** (${type}, Accuracy: ${accuracy})`;
          }).join("\n");
          
          const visualizationsText = visualizations.map(v => {
            const type = v.observations.find(o => o.startsWith("type:"))?.substring(5) || "Unknown";
            const dataset = v.observations.find(o => o.startsWith("dataset:"))?.substring(8) || "Unknown";
            return `- **${v.name}** (${type}, Dataset: ${dataset})`;
          }).join("\n");
          
          const sessionsText = recentSessions.map(s => {
            return `- ${s.date}: ${s.project} - ${s.summary.substring(0, 100)}${s.summary.length > 100 ? '...' : ''}`;
          }).join("\n");
          
          const date = new Date().toISOString().split('T')[0];
          
          return {
            content: [{
              type: "text",
              text: `# Ask user to choose what to focus on in this session. Present the following options:

## Recent Research Sessions
${sessionsText || "No recent sessions found."}

## Active Research Projects
${projectsText || "No active projects found."}

## Available Datasets
${datasetsText || "No datasets found."}

## Research Questions
${questionsText || "No research questions found."}

## Recent Statistical Models
${modelsText || "No models found."}

## Recent Visualizations
${visualizationsText || "No visualizations found."}

To load specific context, use the \`loadcontext\` tool with the entity name and session ID - ${sessionId}`
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ 
                success: false,
                error: error instanceof Error ? error.message : String(error)
              }, null, 2)
            }]
          };
        }
      }
    );

    /**
     * Create entities, relations, and observations.
     */
    server.tool(
      "buildcontext",
      toolDescriptions["buildcontext"],
      {
        type: z.enum(["entities", "relations", "observations"]).describe("Type of creation operation: 'entities', 'relations', or 'observations'"),
        data: z.any().describe("Data for the creation operation, structure varies by type")
      },
      async ({ type, data }) => {
        try {
          let result;
          
          switch (type) {
            case "entities":
              // Validate entity types
              for (const entity of data) {
                if (!validateEntityType(entity.entityType)) {
                  throw new Error(`Invalid entity type: ${entity.entityType}`);
                }
              }
              
              // Ensure entities match the Entity interface
              const typedEntities: Entity[] = data.map((e: any) => ({
                name: e.name,
                entityType: e.entityType,
                observations: e.observations
              }));
              result = await knowledgeGraphManager.createEntities(typedEntities);
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ success: true, created: result }, null, 2)
                }]
              };
              
            case "relations":
              // Validate relation types
              for (const relation of data) {
                if (!validateRelationType(relation.relationType)) {
                  throw new Error(`Invalid relation type: ${relation.relationType}`);
                }
              }
              
              // Ensure relations match the Relation interface
              const typedRelations: Relation[] = data.map((r: any) => ({
                from: r.from,
                to: r.to,
                relationType: r.relationType
              }));
              result = await knowledgeGraphManager.createRelations(typedRelations);
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ success: true, created: result }, null, 2)
                }]
              };
              
            case "observations":
              // For quantitative researcher domain, addObservations takes an array
              // Ensure observations match the required interface
              const typedObservations: { entityName: string; contents: string[] }[] = 
                Array.isArray(data) ? data.map((o: any) => ({
                  entityName: o.entityName,
                  contents: Array.isArray(o.contents) ? o.contents : 
                           Array.isArray(o.observations) ? o.observations : []
                })) : [data];
              
              result = await knowledgeGraphManager.addObservations(typedObservations);
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ success: true, added: result }, null, 2)
                }]
              };
              
            default:
              throw new Error(`Invalid type: ${type}. Must be 'entities', 'relations', or 'observations'.`);
          }
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ 
                success: false,
                error: error instanceof Error ? error.message : String(error)
              }, null, 2)
            }]
          };
        }
      }
    );
    
    /**
     * Delete entities, relations, and observations.
     */
    server.tool(
      "deletecontext",
      toolDescriptions["deletecontext"],
      {
        type: z.enum(["entities", "relations", "observations"]).describe("Type of deletion operation: 'entities', 'relations', or 'observations'"),
        data: z.any().describe("Data for the deletion operation, structure varies by type")
      },
      async ({ type, data }) => {
        try {
          switch (type) {
            case "entities":
              await knowledgeGraphManager.deleteEntities(data);
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ success: true, message: `Deleted ${data.length} entities` }, null, 2)
                }]
              };
              
            case "relations":
              // Ensure relations match the Relation interface
              const typedRelations: Relation[] = data.map((r: any) => ({
                from: r.from,
                to: r.to,
                relationType: r.relationType
              }));
              await knowledgeGraphManager.deleteRelations(typedRelations);
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ success: true, message: `Deleted ${data.length} relations` }, null, 2)
                }]
              };
              
            case "observations":
              // Ensure deletions match the required interface
              const typedDeletions: { entityName: string; observations: string[] }[] = data.map((d: any) => ({
                entityName: d.entityName,
                observations: d.observations
              }));
              await knowledgeGraphManager.deleteObservations(typedDeletions);
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ success: true, message: `Deleted observations from ${data.length} entities` }, null, 2)
                }]
              };
              
            default:
              throw new Error(`Invalid type: ${type}. Must be 'entities', 'relations', or 'observations'.`);
          }
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ 
                success: false,
                error: error instanceof Error ? error.message : String(error)
              }, null, 2)
            }]
          };
        }
      }
    );
    
    /**
     * Read the graph, search nodes, open nodes, get project overview, get dataset analysis, get hypothesis tests, get variable relationships, get statistical results, get visualization gallery, get model performance, get research question results, get variable distribution, and get related entities.
     */
    server.tool(
      "advancedcontext",
      toolDescriptions["advancedcontext"],
      {
        type: z.enum([
          "graph", 
          "search", 
          "nodes", 
          "project", 
          "dataset", 
          "hypothesis", 
          "variables", 
          "statistics", 
          "visualizations", 
          "model", 
          "question", 
          "distribution", 
          "related"
        ]).describe("Type of get operation"),
        params: z.any().describe("Parameters for the get operation, structure varies by type")
      },
      async ({ type, params }) => {
        try {
          let result;
          
          switch (type) {
            case "graph":
              result = await knowledgeGraphManager.readGraph();
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ success: true, graph: result }, null, 2)
                }]
              };
              
            case "search":
              result = await knowledgeGraphManager.searchNodes(params.query);
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ success: true, results: result }, null, 2)
                }]
              };
              
            case "nodes":
              result = await knowledgeGraphManager.openNodes(params.names);
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ success: true, nodes: result }, null, 2)
                }]
              };
              
            case "project":
              result = await knowledgeGraphManager.getProjectOverview(params.projectName);
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ success: true, project: result }, null, 2)
                }]
              };
              
            case "dataset":
              result = await knowledgeGraphManager.getDatasetAnalysis(params.datasetName);
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ success: true, dataset: result }, null, 2)
                }]
              };
              
            case "hypothesis":
              result = await knowledgeGraphManager.getHypothesisTests(
                params.projectName,
                params.hypothesisName
              );
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ success: true, hypothesis: result }, null, 2)
                }]
              };
              
            case "variables":
              result = await knowledgeGraphManager.getVariableRelationships(params.variableName);
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ success: true, variables: result }, null, 2)
                }]
              };
              
            case "statistics":
              result = await knowledgeGraphManager.getStatisticalResults(
                params.projectName,
                params.testType
              );
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ success: true, statistics: result }, null, 2)
                }]
              };
              
            case "visualizations":
              result = await knowledgeGraphManager.getVisualizationGallery(
                params.projectName,
                params.datasetName
              );
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ success: true, visualizations: result }, null, 2)
                }]
              };
              
            case "model":
              result = await knowledgeGraphManager.getModelPerformance(params.modelName);
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ success: true, model: result }, null, 2)
                }]
              };
              
            case "question":
              result = await knowledgeGraphManager.getResearchQuestionResults(params.questionName);
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ success: true, question: result }, null, 2)
                }]
              };
              
            case "distribution":
              result = await knowledgeGraphManager.getVariableDistribution(
                params.variableName,
                params.datasetName
              );
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ success: true, distribution: result }, null, 2)
                }]
              };
              
            case "related":
              // For the related case, we don't have a specialized method in the manager
              // So we'll use the generic KnowledgeGraph search capabilities
              const entityGraph = await knowledgeGraphManager.searchNodes(params.entityName);
              const entity = entityGraph.entities.find(e => e.name === params.entityName);
              
              if (!entity) {
                throw new Error(`Entity "${params.entityName}" not found`);
              }
              
              // Find related entities
              const relations = entityGraph.relations.filter(r => 
                r.from === params.entityName || r.to === params.entityName
              );
              
              const relatedNames = relations.map(r => 
                r.from === params.entityName ? r.to : r.from
              );
              
              if (relatedNames.length === 0) {
                return {
                  content: [{
                    type: "text",
                    text: JSON.stringify({ success: true, related: { entity, relatedEntities: [] } }, null, 2)
                  }]
                };
              }
              
              const relatedEntitiesGraph = await knowledgeGraphManager.openNodes(relatedNames);
              
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({
                    success: true,
                    related: {
                      entity,
                      relations,
                      relatedEntities: relatedEntitiesGraph.entities
                    }
                  }, null, 2)
                }]
              };
              
            default:
              throw new Error(`Invalid type: ${type}. Must be one of the supported get operation types.`);
          }
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ 
                success: false,
                error: error instanceof Error ? error.message : String(error)
              }, null, 2)
            }]
          };
        }
      }
    );

    server.tool(
      "loadcontext",
      toolDescriptions["loadcontext"],
      {
        entityName: z.string().describe("Name of the entity to load context for"),
        entityType: z.string().optional().describe("Type of entity to load (project, dataset, variable, etc.), defaults to 'project'"),
        sessionId: z.string().optional().describe("Session ID from startsession to track context loading")
      },
      async ({ entityName, entityType = "project", sessionId }: { entityName: string; entityType?: string; sessionId?: string }) => {
        try {
          // If sessionId is provided, load session state
          if (sessionId) {
            const sessionStates = await loadSessionStates();
            const sessionState = sessionStates.get(sessionId);
          }
          
          // Get the entity
          const entityGraph = await knowledgeGraphManager.searchNodes(entityName);
          if (entityGraph.entities.length === 0) {
            throw new Error(`Entity ${entityName} not found`);
          }
          
          // Find the exact entity by name (case-sensitive match)
          const entity = entityGraph.entities.find((e: Entity) => e.name === entityName);
          if (!entity) {
            throw new Error(`Entity ${entityName} not found`);
          }
          
          // Different context loading based on entity type
          let contextMessage = "";
          
          if (entityType === "project") {
            // Get project overview
            const projectOverview = await knowledgeGraphManager.getProjectOverview(entityName);
            
            // Get hypothesis tests
            let hypothesisTests;
            try {
              hypothesisTests = await knowledgeGraphManager.getHypothesisTests(entityName);
            } catch (error) {
              hypothesisTests = { hypotheses: [] };
            }
            
            // Get statistical results
            let statisticalResults;
            try {
              statisticalResults = await knowledgeGraphManager.getStatisticalResults(entityName);
            } catch (error) {
              statisticalResults = { tests: [] };
            }
            
            // Get visualization gallery
            let visualizations;
            try {
              visualizations = await knowledgeGraphManager.getVisualizationGallery(entityName);
            } catch (error) {
              visualizations = { visualizations: [] };
            }
            
            // Find datasets for this project
            const datasetsRelations = entityGraph.relations.filter((r: Relation) => 
              r.from === entityName && 
              r.relationType === "contains"
            );
            
            const datasetsGraph = await knowledgeGraphManager.searchNodes("entityType:dataset");
            const relatedDatasets = datasetsGraph.entities.filter((d: Entity) => 
              datasetsRelations.some((r: Relation) => r.to === d.name)
            );
            
            // Find models for this project
            const modelsGraph = await knowledgeGraphManager.searchNodes("entityType:model");
            const relatedModels = modelsGraph.entities.filter((m: Entity) => 
              datasetsRelations.some((r: Relation) => r.to === m.name)
            );
            
            // Format project context message
            const status = entity.observations.find((o: string) => o.startsWith("status:"))?.substring(7) || "Unknown";
            const updated = entity.observations.find((o: string) => o.startsWith("updated:"))?.substring(8) || "Unknown";
            const description = entity.observations.find((o: string) => !o.startsWith("status:") && !o.startsWith("updated:"));
            
            // Format datasets info
            const datasetsText = relatedDatasets.map((d: Entity) => {
              const size = d.observations.find((o: string) => o.startsWith("size:"))?.substring(5) || "Unknown size";
              const variables = d.observations.find((o: string) => o.startsWith("variables:"))?.substring(10) || "Unknown variables";
              return `- **${d.name}**: ${size}, ${variables} variables`;
            }).join("\n");
            
            // Format hypotheses
            const hypothesesText = hypothesisTests.hypotheses?.map((h: any) => {
              return `- **${h.name}**: ${h.status} (p-value: ${h.pValue || "N/A"})${h.conclusion ? ` - ${h.conclusion}` : ""}`;
            }).join("\n") || "No hypotheses found";
            
            // Format statistical tests
            const testsText = statisticalResults.tests?.map((t: any) => {
              return `- **${t.name}** (${t.type}): ${t.result || "No result"} - Variables: ${t.variables?.join(", ") || "N/A"}`;
            }).join("\n") || "No statistical tests found";
            
            // Format models
            const modelsText = relatedModels.map((m: Entity) => {
              const type = m.observations.find((o: string) => o.startsWith("type:"))?.substring(5) || "Unknown type";
              const performance = m.observations.find((o: string) => o.startsWith("performance:"))?.substring(12) || "No metrics";
              return `- **${m.name}** (${type}): ${performance}`;
            }).join("\n");
            
            // Format visualizations
            const visualizationsText = visualizations.visualizations?.slice(0, 5).map((v: any) => {
              return `- **${v.name}** (${v.type}): ${v.description || "No description"}`;
            }).join("\n") || "No visualizations found";
            
            contextMessage = `# Quantitative Research Project Context: ${entityName}

## Project Overview
- **Status**: ${status}
- **Last Updated**: ${updated}
- **Description**: ${description || "No description"}

## Datasets
${datasetsText || "No datasets associated with this project"}

## Hypotheses
${hypothesesText}

## Statistical Tests
${testsText}

## Models
${modelsText || "No models associated with this project"}

## Key Visualizations
${visualizationsText}`;
          } 
          else if (entityType === "dataset") {
            // Get dataset analysis
            let datasetAnalysis;
            try {
              datasetAnalysis = await knowledgeGraphManager.getDatasetAnalysis(entityName);
            } catch (error) {
              datasetAnalysis = { variables: [], descriptiveStats: {} };
            }
            
            // Find which project this dataset belongs to
            const projectRel = entityGraph.relations.find((r: Relation) => r.to === entityName && r.relationType === "contains");
            const projectName = projectRel ? projectRel.from : "Unknown project";
            
            // Get visualizations for this dataset
            let visualizations;
            try {
              visualizations = await knowledgeGraphManager.getVisualizationGallery(projectName, entityName);
            } catch (error) {
              visualizations = { visualizations: [] };
            }
            
            // Get models trained on this dataset
            const modelsGraph = await knowledgeGraphManager.searchNodes("entityType:model");
            const trainedModels = modelsGraph.entities.filter((m: Entity) => {
              return modelsGraph.relations.some((r: Relation) => 
                r.from === m.name && 
                r.to === entityName && 
                r.relationType === "trained_on"
              );
            });
            
            // Format dataset context
            const size = entity.observations.find((o: string) => o.startsWith("size:"))?.substring(5) || "Unknown";
            const variablesCount = entity.observations.find((o: string) => o.startsWith("variables:"))?.substring(10) || "Unknown";
            const description = entity.observations.find((o: string) => !o.startsWith("size:") && !o.startsWith("variables:") && !o.startsWith("status:") && !o.startsWith("created:") && !o.startsWith("updated:"));
            
            // Format variables
            const variablesText = datasetAnalysis.variables?.map((v: any) => {
              const dataType = v.metadata?.dataType || "Unknown";
              const scale = v.metadata?.scale || "Unknown";
              const stats = v.distribution?.descriptiveStats || {};
              const statsText = Object.entries(stats)
                .map(([key, value]) => `${key}: ${value}`)
                .join(", ");
              return `- **${v.variable.name}** (${dataType}, ${scale}): ${statsText || "No statistics available"}`;
            }).join("\n") || "No variables found";
            
            // Format models
            const modelsText = trainedModels.map((m: Entity) => {
              const type = m.observations.find((o: string) => o.startsWith("type:"))?.substring(5) || "Unknown type";
              const performance = m.observations.find((o: string) => o.startsWith("performance:"))?.substring(12) || "No metrics";
              return `- **${m.name}** (${type}): ${performance}`;
            }).join("\n");
            
            // Format visualizations
            const visualizationsText = visualizations.visualizations?.slice(0, 5).map((v: any) => {
              return `- **${v.name}** (${v.type}): ${v.description || "No description"}`;
            }).join("\n") || "No visualizations found";
            
            contextMessage = `# Dataset Context: ${entityName}

## Dataset Overview
- **Project**: ${projectName}
- **Size**: ${size}
- **Variables**: ${variablesCount}
- **Description**: ${description || "No description"}

## Variables
${variablesText}

## Visualizations
${visualizationsText}

## Models Trained on this Dataset
${modelsText || "No models have been trained on this dataset"}`;
          }
          else if (entityType === "variable") {
            // Get variable distribution
            let variableDistribution;
            try {
              // First find which dataset this variable belongs to
              const datasetRel = entityGraph.relations.find((r: Relation) => r.to === entityName && r.relationType === "contains");
              const datasetName = datasetRel ? datasetRel.from : undefined;
              
              if (datasetName) {
                variableDistribution = await knowledgeGraphManager.getVariableDistribution(entityName, datasetName);
              } else {
                variableDistribution = await knowledgeGraphManager.getVariableDistribution(entityName, "unknown");
              }
            } catch (error) {
              variableDistribution = { stats: {}, normality: "Unknown", histogram: "N/A" };
            }
            
            // Get variable relationships
            let relationships;
            try {
              relationships = await knowledgeGraphManager.getVariableRelationships(entityName);
            } catch (error) {
              relationships = { correlations: [], dependencies: [] };
            }
            
            // Format variable context
            const dataType = entity.observations.find((o: string) => o.startsWith("Type:"))?.substring(5) || "Unknown type";
            const role = entity.observations.find((o: string) => o.startsWith("Role:"))?.substring(5) || "Unknown role";
            const scale = entity.observations.find((o: string) => o.startsWith("Scale:"))?.substring(6) || "Unknown scale";
            const description = entity.observations.find((o: string) => !o.startsWith("Type:") && !o.startsWith("Role:") && !o.startsWith("Scale:"));
            
            // Format stats
            const statsText = Object.entries(variableDistribution.stats || {})
              .map(([key, value]) => `- **${key}**: ${value}`)
              .join("\n");
            
            // Format correlations
            const correlationsText = relationships.correlations?.map((c: any) => {
              return `- **${c.variable}**: ${c.coefficient} (p-value: ${c.pValue || "N/A"}) - ${c.strength || "Unknown"} ${c.direction || ""}`;
            }).join("\n") || "No correlations found";
            
            contextMessage = `# Variable Context: ${entityName}

## Variable Details
- **Data Type**: ${dataType}
- **Role**: ${role}
- **Scale**: ${scale}
- **Description**: ${description || "No description"}

## Descriptive Statistics
${statsText || "No statistics available"}

## Normality
${variableDistribution.normality || "Not tested"}

## Correlations with Other Variables
${correlationsText}`;
          }
          else if (entityType === "model") {
            // Get model performance
            let modelPerformance;
            try {
              modelPerformance = await knowledgeGraphManager.getModelPerformance(entityName);
            } catch (error) {
              modelPerformance = { metrics: {}, details: {}, confusionMatrix: null };
            }
            
            // Find which dataset this model was trained on
            const datasetRel = entityGraph.relations.find((r: Relation) => r.from === entityName && r.relationType === "trained_on");
            const datasetName = datasetRel ? datasetRel.to : "Unknown dataset";
            
            // Format model context
            const type = entity.observations.find((o: string) => o.startsWith("type:"))?.substring(5) || "Unknown type";
            const created = entity.observations.find((o: string) => o.startsWith("created:"))?.substring(8) || "Unknown";
            const updated = entity.observations.find((o: string) => o.startsWith("updated:"))?.substring(8) || "Unknown";
            const notes = entity.observations.find((o: string) => !o.startsWith("type:") && !o.startsWith("performance:") && !o.startsWith("created:") && !o.startsWith("updated:"));
            
            // Format metrics
            const metricsText = Object.entries(modelPerformance.metrics || {})
              .map(([key, value]) => `- **${key}**: ${value}`)
              .join("\n");
            
            // Format model parameters and hyperparameters
            const paramsText = Object.entries(modelPerformance.details?.parameters || {})
              .map(([key, value]) => `- **${key}**: ${value}`)
              .join("\n");
            
            contextMessage = `# Model Context: ${entityName}

## Model Overview
- **Type**: ${type}
- **Trained on**: ${datasetName}
- **Created**: ${created}
- **Last Updated**: ${updated}
- **Notes**: ${notes || "No notes"}

## Performance Metrics
${metricsText || "No metrics available"}

## Parameters
${paramsText || "No parameters available"}`;
          }
          else if (entityType === "hypothesis") {
            // Get related statistical tests
            const testsGraph = await knowledgeGraphManager.searchNodes("entityType:statistical_test");
            const relatedTests = testsGraph.entities.filter((t: Entity) => {
              return testsGraph.relations.some((r: Relation) => 
                r.from === entityName && 
                r.to === t.name && 
                r.relationType === "tested_by"
              );
            });
            
            // Format hypothesis context
            const status = entity.observations.find((o: string) => o.startsWith("status:"))?.substring(7) || "Unknown";
            const pValue = entity.observations.find((o: string) => o.startsWith("p-value:"))?.substring(8) || "N/A";
            const created = entity.observations.find((o: string) => o.startsWith("created:"))?.substring(8) || "Unknown";
            const updated = entity.observations.find((o: string) => o.startsWith("updated:"))?.substring(8) || "Unknown";
            const projectObs = entity.observations.find((o: string) => o.startsWith("project:"))?.substring(8);
            const notes = entity.observations.find((o: string) => 
              !o.startsWith("status:") && 
              !o.startsWith("p-value:") && 
              !o.startsWith("created:") && 
              !o.startsWith("updated:") && 
              !o.startsWith("project:")
            );
            
            // Format tests
            const testsText = relatedTests.map((t: Entity) => {
              const type = t.observations.find((o: string) => o.startsWith("type:"))?.substring(5) || "Unknown type";
              const result = t.observations.find((o: string) => o.startsWith("result:"))?.substring(7) || "No result";
              return `- **${t.name}** (${type}): ${result}`;
            }).join("\n");
            
            contextMessage = `# Hypothesis Context: ${entityName}

## Hypothesis Details
- **Status**: ${status}
- **P-value**: ${pValue}
- **Created**: ${created}
- **Last Updated**: ${updated}
- **Project**: ${projectObs || "Not associated with a specific project"}
- **Notes**: ${notes || "No notes"}

## Statistical Tests
${testsText || "No statistical tests associated with this hypothesis"}`;
          }
          else if (entityType === "statistical_test") {
            // Format test context
            const type = entity.observations.find((o: string) => o.startsWith("type:"))?.substring(5) || "Unknown type";
            const result = entity.observations.find((o: string) => o.startsWith("result:"))?.substring(7) || "No result";
            const pValue = entity.observations.find((o: string) => o.startsWith("p-value:"))?.substring(8) || "N/A";
            const date = entity.observations.find((o: string) => o.startsWith("date:"))?.substring(5) || "Unknown";
            const projectObs = entity.observations.find((o: string) => o.startsWith("project:"))?.substring(8);
            
            // Get variables analyzed by this test
            const variablesGraph = await knowledgeGraphManager.searchNodes("entityType:variable");
            const analyzedVariables = variablesGraph.entities.filter((v: Entity) => {
              return entityGraph.relations.some((r: Relation) => 
                r.from === entityName && 
                r.to === v.name && 
                r.relationType === "analyzes"
              );
            });
            
            // Get hypotheses tested by this test
            const hypothesesGraph = await knowledgeGraphManager.searchNodes("entityType:hypothesis");
            const relatedHypotheses = hypothesesGraph.entities.filter((h: Entity) => {
              return hypothesesGraph.relations.some((r: Relation) => 
                r.from === h.name && 
                r.to === entityName && 
                r.relationType === "tested_by"
              );
            });
            
            // Format variables
            const variablesText = analyzedVariables.map((v: Entity) => {
              const dataType = v.observations.find((o: string) => o.startsWith("Type:"))?.substring(5) || "Unknown type";
              const scale = v.observations.find((o: string) => o.startsWith("Scale:"))?.substring(6) || "Unknown scale";
              return `- **${v.name}** (${dataType}, ${scale})`;
            }).join("\n");
            
            // Format hypotheses
            const hypothesesText = relatedHypotheses.map((h: Entity) => {
              const status = h.observations.find((o: string) => o.startsWith("status:"))?.substring(7) || "Unknown";
              return `- **${h.name}**: ${status}`;
            }).join("\n");
            
            contextMessage = `# Statistical Test Context: ${entityName}

## Test Details
- **Type**: ${type}
- **Result**: ${result}
- **P-value**: ${pValue}
- **Date**: ${date}
- **Project**: ${projectObs || "Not associated with a specific project"}

## Variables Analyzed
${variablesText || "No variables explicitly associated with this test"}

## Hypotheses Tested
${hypothesesText || "No hypotheses explicitly linked to this test"}`;
          }
          else {
            // Generic entity context
            const observations = entity.observations.join("\n- ");
            
            contextMessage = `# Entity Context: ${entityName}

## Entity Type
${entity.entityType}

## Observations
- ${observations}`;
          }
          
          return {
            content: [{
              type: "text",
              text: contextMessage
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ 
                success: false,
                error: error instanceof Error ? error.message : String(error)
              }, null, 2)
            }]
          };
        }
      }
    );

    /**
     * Process a stage of session analysis based on the current stage type
     */
    async function processStage(params: {
      sessionId: string;
      stage: string;
      stageNumber: number;
      totalStages: number;
      analysis?: string;
      stageData?: any;
      nextStageNeeded: boolean;
      isRevision?: boolean;
      revisesStage?: number;
    }, previousStages: any[]): Promise<any> {
      // Process based on the stage
      switch (params.stage) {
        case "summary":
          // Process summary stage
          return {
            stage: "summary",
            stageNumber: params.stageNumber,
            analysis: params.analysis || "",
            stageData: params.stageData || { 
              summary: "",
              duration: "",
              project: "",
              date: new Date().toISOString().split('T')[0]
            },
            completed: !params.nextStageNeeded
          };
          
        case "datasetUpdates":
          // Process dataset updates stage
          return {
            stage: "datasetUpdates",
            stageNumber: params.stageNumber,
            analysis: params.analysis || "",
            stageData: params.stageData || { datasets: [] },
            completed: !params.nextStageNeeded
          };
          
        case "newAnalyses":
          // Process new analyses stage
          return {
            stage: "newAnalyses",
            stageNumber: params.stageNumber,
            analysis: params.analysis || "",
            stageData: params.stageData || { analyses: [] },
            completed: !params.nextStageNeeded
          };
          
        case "newVisualizations":
          // Process visualizations stage
          return {
            stage: "newVisualizations",
            stageNumber: params.stageNumber,
            analysis: params.analysis || "",
            stageData: params.stageData || { visualizations: [] },
            completed: !params.nextStageNeeded
          };
          
        case "hypothesisResults":
          // Process hypothesis results stage
          return {
            stage: "hypothesisResults",
            stageNumber: params.stageNumber,
            analysis: params.analysis || "",
            stageData: params.stageData || { hypotheses: [] },
            completed: !params.nextStageNeeded
          };
          
        case "modelUpdates":
          // Process model updates stage
          return {
            stage: "modelUpdates",
            stageNumber: params.stageNumber,
            analysis: params.analysis || "",
            stageData: params.stageData || { models: [] },
            completed: !params.nextStageNeeded
          };
          
        case "projectStatus":
          // Process project status stage
          return {
            stage: "projectStatus",
            stageNumber: params.stageNumber,
            analysis: params.analysis || "",
            stageData: params.stageData || { 
              projectStatus: "",
              projectObservation: ""
            },
            completed: !params.nextStageNeeded
          };
          
        case "assembly":
          // Final assembly stage - compile all arguments for end-session
          return {
            stage: "assembly",
            stageNumber: params.stageNumber,
            analysis: "Final assembly of end-session arguments",
            stageData: assembleEndSessionArgs(previousStages),
            completed: true
          };
          
        default:
          throw new Error(`Unknown stage: ${params.stage}`);
      }
    }

    /**
     * Assemble the final end-session arguments from all processed stages
     */
    function assembleEndSessionArgs(stages: any[]): any {
      const summaryStage = stages.find(s => s.stage === "summary");
      const datasetUpdatesStage = stages.find(s => s.stage === "datasetUpdates");
      const newAnalysesStage = stages.find(s => s.stage === "newAnalyses");
      const newVisualizationsStage = stages.find(s => s.stage === "newVisualizations");
      const hypothesisResultsStage = stages.find(s => s.stage === "hypothesisResults");
      const modelUpdatesStage = stages.find(s => s.stage === "modelUpdates");
      const projectStatusStage = stages.find(s => s.stage === "projectStatus");
      
      // Get current date if not already set
      const date = summaryStage?.stageData?.date || new Date().toISOString().split('T')[0];
      
      return {
        date,
        summary: summaryStage?.stageData?.summary || "",
        duration: summaryStage?.stageData?.duration || "unknown",
        project: summaryStage?.stageData?.project || "",
        datasetUpdates: JSON.stringify(datasetUpdatesStage?.stageData?.datasets || []),
        newAnalyses: JSON.stringify(newAnalysesStage?.stageData?.analyses || []),
        newVisualizations: JSON.stringify(newVisualizationsStage?.stageData?.visualizations || []),
        hypothesisResults: JSON.stringify(hypothesisResultsStage?.stageData?.hypotheses || []),
        modelUpdates: JSON.stringify(modelUpdatesStage?.stageData?.models || []),
        projectStatus: projectStatusStage?.stageData?.projectStatus || "",
        projectObservation: projectStatusStage?.stageData?.projectObservation || ""
      };
    }
  
    /**
     * End session by processing all stages and recording the final results.
     * Only use this tool if the user asks for it.
     * 
     * Usage examples:
     * 
     * 1. Starting the end session process with the summary stage:
     * {
     *   "sessionId": "quant_1234567890_abc123",  // From startsession
     *   "stage": "summary",
     *   "stageNumber": 1,
     *   "totalStages": 8, 
     *   "analysis": "Analyzed progress on the multiple regression analysis",
     *   "stageData": {
     *     "summary": "Completed data preparation and initial statistical tests",
     *     "duration": "4 hours",
     *     "project": "Customer Satisfaction Study"  // Project name
     *   },
     *   "nextStageNeeded": true,  // More stages coming
     *   "isRevision": false
     * }
     * 
     * 2. Middle stage for new analyses:
     * {
     *   "sessionId": "quant_1234567890_abc123",
     *   "stage": "newAnalyses",
     *   "stageNumber": 3,
     *   "totalStages": 8,
     *   "analysis": "Conducted statistical tests on prepared data",
     *   "stageData": {
     *     "analyses": [
     *       { 
     *         "name": "Age_Income_Regression", 
     *         "type": "multiple_regression", 
     *         "result": "Significant relationship found", 
     *         "pValue": "0.003",   
     *         "variables": ["age", "income", "satisfaction_score"] 
     *       },
     *       { 
     *         "name": "Gender_Satisfaction_Ttest", 
     *         "type": "t_test", 
     *         "result": "No significant difference", 
     *         "pValue": "0.42", 
     *         "variables": ["gender", "satisfaction_score"] 
     *       }
     *     ]
     *   },
     *   "nextStageNeeded": true,
     *   "isRevision": false
     * }
     * 
     * 3. Final assembly stage:
     * {
     *   "sessionId": "quant_1234567890_abc123",
     *   "stage": "assembly",
     *   "stageNumber": 8,
     *   "totalStages": 8,
     *   "nextStageNeeded": false,  // This completes the session
     *   "isRevision": false
     * }
     */
    server.tool(
      "endsession",
      toolDescriptions["endsession"],
      {
        sessionId: z.string().describe("The unique session identifier obtained from startsession"),
        stage: z.string().describe("Current stage of analysis: 'summary', 'datasetUpdates', 'newAnalyses', 'newVisualizations', 'hypothesisResults', 'modelUpdates', 'projectStatus', or 'assembly'"),
        stageNumber: z.number().int().positive().describe("The sequence number of the current stage (starts at 1)"),
        totalStages: z.number().int().positive().describe("Total number of stages in the workflow (typically 8 for standard workflow)"),
        analysis: z.string().optional().describe("Text analysis or observations for the current stage"),
        stageData: z.any().optional().describe(`Stage-specific data structure - format depends on the stage type:
        - For 'summary' stage: { summary: "Session summary text", duration: "3 hours", project: "Project Name" }
        - For 'datasetUpdates' stage: { datasets: [{ name: "Dataset1", size: "500 rows", variables: "10", status: "cleaned", description: "Dataset description" }] }
        - For 'newAnalyses' stage: { analyses: [{ name: "Analysis1", type: "regression", result: "p<0.05", pValue: "0.03", variables: ["var1", "var2"] }] }
        - For 'newVisualizations' stage: { visualizations: [{ name: "Viz1", type: "scatter", description: "Correlation visualization", datasetName: "Dataset1" }] }
        - For 'hypothesisResults' stage: { hypotheses: [{ name: "H1", status: "confirmed", evidence: "Statistical significance in regression model", pValue: "0.02" }] }
        - For 'modelUpdates' stage: { models: [{ name: "Model1", type: "regression", performance: "R²=0.85", variables: ["var1", "var2"] }] }
        - For 'projectStatus' stage: { projectStatus: "in_progress", projectObservation: "Data analysis phase complete" }
        - For 'assembly' stage: no stageData needed - automatic assembly of previous stages`),
        nextStageNeeded: z.boolean().describe("Whether additional stages are needed after this one (false for final stage)"),
        isRevision: z.boolean().optional().describe("Whether this is revising a previous stage"),
        revisesStage: z.number().int().positive().optional().describe("If revising, which stage number is being revised")
      },
      /* 
       * Usage examples:
       * 
       * 1. Starting the end session process with the summary stage:
       * {
       *   "sessionId": "quant_1234567890_abc123",  // From startsession
       *   "stage": "summary",
       *   "stageNumber": 1,
       *   "totalStages": 8, 
       *   "analysis": "Analyzed progress on the multiple regression analysis",
       *   "stageData": {
       *     "summary": "Completed data preparation and initial statistical tests",
       *     "duration": "4 hours",
       *     "project": "Customer Satisfaction Study"  // Project name
       *   },
       *   "nextStageNeeded": true,  // More stages coming
       *   "isRevision": false
       * }
       * 
       * 2. Middle stage for new analyses:
       * {
       *   "sessionId": "quant_1234567890_abc123",
       *   "stage": "newAnalyses",
       *   "stageNumber": 3,
       *   "totalStages": 8,
       *   "analysis": "Conducted statistical tests on prepared data",
       *   "stageData": {
       *     "analyses": [
       *       { 
       *         "name": "Age_Income_Regression", 
       *         "type": "multiple_regression", 
       *         "result": "Significant relationship found", 
       *         "pValue": "0.003", 
       *         "variables": ["age", "income", "satisfaction_score"] 
       *       },
       *       { 
       *         "name": "Gender_Satisfaction_Ttest", 
       *         "type": "t_test", 
       *         "result": "No significant difference", 
       *         "pValue": "0.42", 
       *         "variables": ["gender", "satisfaction_score"] 
       *       }
       *     ]
       *   },
       *   "nextStageNeeded": true,
       *   "isRevision": false
       * }
       * 
       * 3. Final assembly stage:
       * {
       *   "sessionId": "quant_1234567890_abc123",
       *   "stage": "assembly",
       *   "stageNumber": 8,
       *   "totalStages": 8,
       *   "nextStageNeeded": false,  // This completes the session
       *   "isRevision": false
       * }
       */
      async (params: {
        sessionId: string;
        stage: string;
        stageNumber: number;
        totalStages: number;
        analysis?: string;
        stageData?: any;
        nextStageNeeded: boolean;
        isRevision?: boolean;
        revisesStage?: number;
      }) => {
        try {
          // Get or initialize session state from persistent storage
          const sessionStates = await loadSessionStates();
          
          // Validate session ID
          if (!sessionStates.has(params.sessionId)) {
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ 
                  success: false,
                  error: `Session with ID ${params.sessionId} not found. Please start a new session with startsession.`
                }, null, 2)
              }]
            };
          }
          
          let sessionState = sessionStates.get(params.sessionId) || [];
          
          // Process the current stage
          const stageResult = await processStage(params, sessionState);
          
          // Store updated state
          if (params.isRevision && params.revisesStage) {
            // Find the analysis stages in the session state
            const analysisStages = sessionState.filter(item => item.type === 'analysis_stage') || [];
            
            if (params.revisesStage <= analysisStages.length) {
              // Replace the revised stage
              analysisStages[params.revisesStage - 1] = {
                type: 'analysis_stage',
                ...stageResult
              };
            } else {
              // Add as a new stage
              analysisStages.push({
                type: 'analysis_stage',
                ...stageResult
              });
            }
            
            // Update the session state with the modified analysis stages
            sessionState = [
              ...sessionState.filter(item => item.type !== 'analysis_stage'),
              ...analysisStages
            ];
          } else {
            // Add new stage
            sessionState.push({
              type: 'analysis_stage',
              ...stageResult
            });
          }
          
          // Update persistent storage
          sessionStates.set(params.sessionId, sessionState);
          await saveSessionStates(sessionStates);
          
          
          // If this is the assembly stage and we're done (no next stage needed), perform the end-session operations
          if (params.stage === "assembly" && !params.nextStageNeeded) {
            const endSessionArgs = stageResult.stageData;
            
            try {
              // Parse arguments
              const date = endSessionArgs.date;
              const summary = endSessionArgs.summary;
              const duration = endSessionArgs.duration;
              const project = endSessionArgs.project;
              const datasetUpdates = endSessionArgs.datasetUpdates ? JSON.parse(endSessionArgs.datasetUpdates) : [];
              const newAnalyses = endSessionArgs.newAnalyses ? JSON.parse(endSessionArgs.newAnalyses) : [];
              const newVisualizations = endSessionArgs.newVisualizations ? JSON.parse(endSessionArgs.newVisualizations) : [];
              const hypothesisResults = endSessionArgs.hypothesisResults ? JSON.parse(endSessionArgs.hypothesisResults) : [];
              const modelUpdates = endSessionArgs.modelUpdates ? JSON.parse(endSessionArgs.modelUpdates) : [];
              const projectStatus = endSessionArgs.projectStatus;
              const projectObservation = endSessionArgs.projectObservation;
              
              // No longer need to create session entity since we're using persistent storage
              
              // 2. Update or create dataset entities
              if (datasetUpdates.length > 0) {
                for (const datasetUpdate of datasetUpdates) {
                  // Check if dataset exists
                  const datasetGraph = await knowledgeGraphManager.searchNodes(`name:${datasetUpdate.name}`);
                  
                  if (datasetGraph.entities.length > 0) {
                    // Update existing dataset
                    const datasetEntity = datasetGraph.entities[0];
                    const observations = datasetEntity.observations.filter(o => 
                      !o.startsWith("size:") && 
                      !o.startsWith("variables:") && 
                      !o.startsWith("updated:") &&
                      !o.startsWith("status:")
                    );
                    
                    observations.push(`size:${datasetUpdate.size || "unknown"}`);
                    observations.push(`variables:${datasetUpdate.variables || "unknown"}`);
                    observations.push(`updated:${date}`);
                    
                    if (datasetUpdate.status) {
                      observations.push(`status:${datasetUpdate.status}`);
                    }
                    
                    if (datasetUpdate.description) {
                      observations.push(datasetUpdate.description);
                    }
                    
                    await knowledgeGraphManager.deleteEntities([datasetUpdate.name]);
                    await knowledgeGraphManager.createEntities([{
                      name: datasetUpdate.name,
                      entityType: "dataset",
                      observations
                    }]);
                  } else {
                    // Create new dataset
                    await knowledgeGraphManager.createEntities([{
                      name: datasetUpdate.name,
                      entityType: "dataset",
                      observations: [
                        `size:${datasetUpdate.size || "unknown"}`,
                        `variables:${datasetUpdate.variables || "unknown"}`,
                        `created:${date}`,
                        `status:${datasetUpdate.status || "active"}`,
                        datasetUpdate.description || "No description"
                      ]
                    }]);
                    
                    // Link dataset to project
                    await knowledgeGraphManager.createRelations([{
                      from: project,
                      to: datasetUpdate.name,
                      relationType: "contains"
                    }]);
                  }
                }
              }
              
              // 3. Add new analyses (statistical tests)
              if (newAnalyses.length > 0) {
                const analysisEntities = newAnalyses.map((analysis: {name: string, type: string, result: string, pValue?: string, variables?: string[]}, i: number) => ({
                  name: analysis.name || `Analysis_${date.replace(/-/g, "")}_${i + 1}`,
                  entityType: "statistical_test",
                  observations: [
                    `type:${analysis.type}`,
                    `result:${analysis.result}`,
                    analysis.pValue ? `p-value:${analysis.pValue}` : null,
                    `date:${date}`,
                    `project:${project}`
                  ].filter(Boolean) // Remove null values
                }));
                
                await knowledgeGraphManager.createEntities(analysisEntities);
                
                // Link analyses to project and session
                const analysisRelations = analysisEntities.flatMap((analysis: {name: string}) => [
                  {
                    from: project,
                    to: analysis.name,
                    relationType: "contains"
                  },
                  {
                    from: project,
                    to: analysis.name,
                    relationType: "produced"
                  }
                ]);
                
                await knowledgeGraphManager.createRelations(analysisRelations);
                
                // Link analyses to variables if specified
                for (let i = 0; i < newAnalyses.length; i++) {
                  const analysis = newAnalyses[i];
                  const analysisName = analysisEntities[i].name;
                  
                  if (analysis.variables && analysis.variables.length > 0) {
                    for (const variableName of analysis.variables) {
                      await knowledgeGraphManager.createRelations([{
                        from: analysisName,
                        to: variableName,
                        relationType: "analyzes"
                      }]);
                    }
                  }
                }
              }
              
              // 4. Add new visualizations
              if (newVisualizations.length > 0) {
                const vizEntities = newVisualizations.map((viz: {name: string, type: string, description: string, datasetName?: string}, i: number) => ({
                  name: viz.name || `Visualization_${date.replace(/-/g, "")}_${i + 1}`,
                  entityType: "visualization",
                  observations: [
                    `type:${viz.type}`,
                    viz.description,
                    `date:${date}`,
                    viz.datasetName ? `dataset:${viz.datasetName}` : null,
                    `project:${project}`
                  ].filter(Boolean) // Remove null values
                }));
                
                await knowledgeGraphManager.createEntities(vizEntities);
                
                // Link visualizations to project and session
                const vizRelations = vizEntities.flatMap((viz: {name: string}) => [
                  {
                    from: project,
                    to: viz.name,
                    relationType: "contains"
                  },
                  {
                    from: project,
                    to: viz.name,
                    relationType: "produced"
                  }
                ]);
                
                await knowledgeGraphManager.createRelations(vizRelations);
                
                // Link visualizations to datasets if specified
                for (let i = 0; i < newVisualizations.length; i++) {
                  const viz = newVisualizations[i];
                  const vizName = vizEntities[i].name;
                  
                  if (viz.datasetName) {
                    await knowledgeGraphManager.createRelations([{
                      from: vizName,
                      to: viz.datasetName,
                      relationType: "visualizes"
                    }]);
                  }
                }
              }
              
              // 5. Update hypothesis test results
              if (hypothesisResults.length > 0) {
                for (const hypothesis of hypothesisResults) {
                  // Check if hypothesis exists
                  const hypGraph = await knowledgeGraphManager.searchNodes(`name:${hypothesis.name}`);
                  
                  if (hypGraph.entities.length > 0) {
                    // Update existing hypothesis
                    const hypEntity = hypGraph.entities[0];
                    const observations = hypEntity.observations.filter(o => 
                      !o.startsWith("status:") && 
                      !o.startsWith("p-value:") && 
                      !o.startsWith("updated:")
                    );
                    
                    observations.push(`status:${hypothesis.status}`);
                    observations.push(`updated:${date}`);
                    
                    if (hypothesis.pValue) {
                      observations.push(`p-value:${hypothesis.pValue}`);
                    }
                    
                    if (hypothesis.notes) {
                      observations.push(hypothesis.notes);
                    }
                    
                    await knowledgeGraphManager.deleteEntities([hypothesis.name]);
                    await knowledgeGraphManager.createEntities([{
                      name: hypothesis.name,
                      entityType: "hypothesis",
                      observations
                    }]);
                  } else {
                    // Create new hypothesis
                    await knowledgeGraphManager.createEntities([{
                      name: hypothesis.name,
                      entityType: "hypothesis",
                      observations: [
                        `status:${hypothesis.status}`,
                        `created:${date}`,
                        `updated:${date}`,
                        hypothesis.pValue ? `p-value:${hypothesis.pValue}` : null,
                        hypothesis.notes || "No notes",
                        `project:${project}`
                      ].filter(Boolean) // Remove null values
                    }]);
                    
                    // Link hypothesis to project
                    await knowledgeGraphManager.createRelations([{
                      from: project,
                      to: hypothesis.name,
                      relationType: "contains"
                    }]);
                  }
                  
                  // Link hypothesis to related test if provided
                  if (hypothesis.testName) {
                    await knowledgeGraphManager.createRelations([{
                      from: hypothesis.name,
                      to: hypothesis.testName,
                      relationType: "tested_by"
                    }]);
                  }
                }
              }
              
              // 6. Update model information
              if (modelUpdates.length > 0) {
                for (const modelUpdate of modelUpdates) {
                  // Check if model exists
                  const modelGraph = await knowledgeGraphManager.searchNodes(`name:${modelUpdate.name}`);
                  
                  if (modelGraph.entities.length > 0) {
                    // Update existing model
                    const modelEntity = modelGraph.entities[0];
                    const observations = modelEntity.observations.filter(o => 
                      !o.startsWith("performance:") && 
                      !o.startsWith("updated:")
                    );
                    
                    observations.push(`performance:${JSON.stringify(modelUpdate.metrics)}`);
                    observations.push(`updated:${date}`);
                    
                    if (modelUpdate.notes) {
                      observations.push(modelUpdate.notes);
                    }
                    
                    await knowledgeGraphManager.deleteEntities([modelUpdate.name]);
                    await knowledgeGraphManager.createEntities([{
                      name: modelUpdate.name,
                      entityType: "model",
                      observations
                    }]);
                  } else {
                    // Create new model
                    await knowledgeGraphManager.createEntities([{
                      name: modelUpdate.name,
                      entityType: "model",
                      observations: [
                        `type:${modelUpdate.type || "unknown"}`,
                        `performance:${JSON.stringify(modelUpdate.metrics || {})}`,
                        `created:${date}`,
                        `updated:${date}`,
                        modelUpdate.notes || "No notes",
                        `project:${project}`
                      ]
                    }]);
                    
                    // Link model to project
                    await knowledgeGraphManager.createRelations([{
                      from: project,
                      to: modelUpdate.name,
                      relationType: "contains"
                    }]);
                    
                    // Link model to dataset if provided
                    if (modelUpdate.datasetName) {
                      await knowledgeGraphManager.createRelations([{
                        from: modelUpdate.name,
                        to: modelUpdate.datasetName,
                        relationType: "trained_on"
                      }]);
                    }
                  }
                }
              }
              
              // 7. Update project status
              const projectGraph = await knowledgeGraphManager.searchNodes(`name:${project}`);
              if (projectGraph.entities.length > 0) {
                const projectEntity = projectGraph.entities[0];
                let observations = projectEntity.observations.filter(o => !o.startsWith("status:") && !o.startsWith("updated:"));
                observations.push(`status:${projectStatus}`);
                observations.push(`updated:${date}`);
                
                if (projectObservation) {
                  observations.push(projectObservation);
                }
                
                await knowledgeGraphManager.deleteEntities([project]);
                await knowledgeGraphManager.createEntities([{
                  name: project,
                  entityType: "project",
                  observations
                }]);
              }
              
              // Return a summary message
              return {
                content: [{
                  type: "text",
                  text: `# Quantitative Research Session Recorded

I've recorded your research session from ${date} focusing on the ${project} project.

## Session Summary
${summary}

${datasetUpdates.length > 0 ? `## Dataset Updates
${datasetUpdates.map((d: {name: string, size?: string, variables?: string, status?: string}) => 
  `- ${d.name}${d.size ? ` (${d.size})` : ''}${d.variables ? ` with ${d.variables} variables` : ''}${d.status ? ` - Status: ${d.status}` : ''}`
).join('\n')}` : "No dataset updates were recorded."}

${newAnalyses.length > 0 ? `## New Statistical Analyses
${newAnalyses.map((a: {name: string, type: string, result: string, pValue?: string}) => 
  `- ${a.name}: ${a.type} - Result: ${a.result}${a.pValue ? ` (p-value: ${a.pValue})` : ''}`
).join('\n')}` : "No new analyses were performed."}

${newVisualizations.length > 0 ? `## New Visualizations
${newVisualizations.map((v: {name: string, type: string, description: string}) => 
  `- ${v.name}: ${v.type} - ${v.description}`
).join('\n')}` : "No new visualizations were created."}

${hypothesisResults.length > 0 ? `## Hypothesis Test Results
${hypothesisResults.map((h: {name: string, status: string, pValue?: string}) => 
  `- ${h.name}: ${h.status}${h.pValue ? ` (p-value: ${h.pValue})` : ''}`
).join('\n')}` : "No hypothesis test results were recorded."}

${modelUpdates.length > 0 ? `## Model Updates
${modelUpdates.map((m: {name: string, type?: string, metrics?: any}) => 
  `- ${m.name}${m.type ? ` (${m.type})` : ''}: ${m.metrics ? `Metrics: ${JSON.stringify(m.metrics)}` : 'No metrics provided'}`
).join('\n')}` : "No model updates were recorded."}

## Project Status
Project ${project} has been updated to: ${projectStatus}

Would you like me to perform any additional updates to your quantitative research knowledge graph?`
                }]
              };
            } catch (error) {
              return {
                content: [{
                  type: "text",
                  text: `Error recording quantitative research session: ${error instanceof Error ? error.message : String(error)}`
                }]
              };
            }
          } else {
            // Return normal stage processing result
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  success: true,
                  stageCompleted: params.stage,
                  nextStageNeeded: params.nextStageNeeded,
                  stageResult: stageResult
                }, null, 2)
              }]
            };
          }
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ 
                success: false,
                error: error instanceof Error ? error.message : String(error)
              }, null, 2)
            }]
          };
        }
      }
    );

    // Connect the server to the transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error("Unhandled error:", error);
  process.exit(1);
});

// Export the KnowledgeGraphManager for testing
export { KnowledgeGraphManager, loadSessionStates, saveSessionStates }; 