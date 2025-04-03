# Quantitative Researcher MCP Server

An MCP server implementation that provides tools for managing quantitative research knowledge graphs, enabling structured representation of research projects, datasets, variables, hypotheses, statistical tests, models, and results. This server helps quantitative researchers organize their data, track their analyses, evaluate hypotheses, and generate insights from numerical data.

## Features

- **Persistent Research Context**: Maintain a structured knowledge graph of research entities and relationships across multiple analysis sessions
- **Study Session Management**: Track research analysis sessions with unique IDs and record progress over time
- **Hypothesis Testing**: Track hypotheses, their associated tests, and resulting conclusions
- **Dataset Management**: Organize and track descriptive statistics and variables within datasets
- **Statistical Analysis**: Record statistical tests, models, and their results
- **Variable Relationships**: Track correlations, predictions, and other relationships between variables
- **Research Question Tracking**: Link data analyses to specific research questions
- **Data Visualization**: Document visualizations created from datasets and results
- **Model Performance**: Monitor statistical model performance metrics
- **Research Finding Documentation**: Link findings to supporting statistical evidence
- **Research Methodology Documentation**: Track methodological decisions and approaches

## Entities

The Quantitative Researcher MCP Server recognizes the following entity types:

- **project**: Overall research study
- **dataset**: Collection of data used for analysis
- **variable**: Specific measurable attribute in a dataset
- **hypothesis**: Formal testable statement
- **statisticalTest**: Analysis method applied to data
- **result**: Outcome of statistical analysis
- **analysisScript**: Code used to perform analysis
- **visualization**: Visual representation of data
- **model**: Statistical/mathematical model
- **literature**: Academic sources
- **researchQuestion**: Formal questions guiding the study
- **finding**: Results or conclusions
- **participant**: Research subjects
- **status**: Entity status values (active, completed, pending, abandoned)
- **priority**: Priority level values (high, low)

## Relationships

Entities can be connected through the following relationship types:

- **correlates_with**: Statistical correlation between variables
- **predicts**: Predictive relationship from independent to dependent variable
- **tests**: Statistical test examines hypothesis
- **analyzes**: Analysis performed on dataset
- **produces**: Analysis produces result
- **visualizes**: Visualization displays data or result
- **contains**: Hierarchical relationship
- **part_of**: Entity is part of another entity
- **depends_on**: Dependency relationship
- **supports**: Evidence supporting a hypothesis or finding
- **contradicts**: Evidence contradicting a hypothesis or finding
- **derived_from**: Entity is derived from another entity
- **controls_for**: Variable/method controls for confounds
- **moderates**: Variable moderates a relationship
- **mediates**: Variable mediates a relationship
- **implements**: Script implements statistical test/model
- **compares**: Statistical comparison between groups/variables
- **includes**: Model includes variables
- **validates**: Validates a model or result
- **cites**: References literature
- **has_status**: Links entities to their current status (active, completed, pending, abandoned)
- **has_priority**: Links entities to their priority level (high, low)
- **precedes**: Indicates that one process or activity comes before another in a sequence

## Available Tools

The Quantitative Researcher MCP Server provides these tools for interacting with research knowledge:

### startsession
Starts a new quantitative research session, generating a unique session ID and displaying current research projects, datasets, models, visualizations, and previous sessions. Shows status information via has_status relations, priority levels via has_priority relations, and identifies activities ready to be worked on next based on sequential process relationships.

### loadcontext
Loads detailed context for a specific entity (project, dataset, variable, etc.), displaying relevant information based on entity type. Includes status information, priority levels, and sequential process relationships.

### endsession
Records the results of a research session through a structured, multi-stage process:
1. **summary**: Records session summary, duration, and project focus
2. **datasetUpdates**: Documents updates to datasets during the session
3. **newAnalyses**: Records new statistical analyses performed
4. **newVisualizations**: Tracks new data visualizations created
5. **hypothesisResults**: Documents results of hypothesis testing
6. **modelUpdates**: Records updates to statistical models
7. **statusUpdates**: Records changes to entity status values
8. **projectStatus**: Updates overall project status, priority assignments, and sequential relationships
9. **assembly**: Final assembly of all session data

### buildcontext
Creates new entities, relations, or observations in the knowledge graph:
- **entities**: Add new research entities (projects, datasets, variables, status, priority, etc.)
- **relations**: Create relationships between entities (including has_status, has_priority, precedes)
- **observations**: Add observations to existing entities

### deletecontext
Removes entities, relations, or observations from the knowledge graph:
- **entities**: Remove research entities
- **relations**: Remove relationships between entities (including status, priority, and sequential relations)
- **observations**: Remove specific observations from entities

### advancedcontext
Retrieves information from the knowledge graph:
- **graph**: Get the entire knowledge graph
- **search**: Search for nodes based on query criteria
- **nodes**: Get specific nodes by name
- **related**: Find related entities
- **status**: Find entities with a specific status value (active, completed, pending, abandoned)
- **priority**: Find entities with a specific priority value (high, low)
- **sequence**: Identify sequential relationships for research processes

## Domain-Specific Functions

The Quantitative Researcher MCP Server includes specialized domain functions for quantitative research:

- **getProjectOverview**: Comprehensive view of a project including research questions, methodology, datasets, variables
- **getDatasetAnalysis**: Analysis of dataset contents including variables, descriptive statistics, and data quality
- **getHypothesisTests**: Review of hypothesis tests and their outcomes
- **getVariableRelationships**: Examine correlations, predictions, and other relationships between variables
- **getStatisticalResults**: Summarize the results of statistical analyses
- **getVisualizationGallery**: View visualizations created for datasets and results
- **getModelPerformance**: Assess performance metrics for statistical models
- **getResearchQuestionResults**: Organize analyses and results by research questions
- **getVariableDistribution**: Examine the distribution and properties of individual variables
- **getStatusOverview**: View all entities with a specific status (active, completed, pending, abandoned)
- **getPriorityItems**: Identify high-priority research tasks and activities
- **getResearchSequence**: Visualize the sequence of research processes based on precedes relations

## Example Prompts

### Starting a Session
```
Let's start a new quantitative research session for my Climate Impact Study project.
```

### Loading Research Context
```
Load the context for the Climate Impact Study project so I can see the current state of my statistical analyses.
```

### Recording Session Results
```
I've just finished analyzing data for my Climate Impact Study. I ran three new regression models to test the relationship between temperature and crop yield, created two visualizations of the correlation patterns, and confirmed our hypothesis about rainfall effects. I've marked the temperature analysis as complete and assigned high priority to the regional variation analysis. The model performance improved by 15% after controlling for regional variations.
```

### Managing Research Knowledge
```
Create a new variable called "Annual Precipitation" that's part of the "Climate Measures" dataset with observations noting it's normally distributed with a mean of 34.5 inches. Set its status to active and make it precede the "Crop Yield Analysis" process.
```

```
Update the status of the "Data Cleaning" process to "completed" and add an observation that all outliers have been properly handled.
```

## Usage

This MCP server enables quantitative researchers to:

- **Maintain Analytical Continuity**: Track analyses and results across multiple research sessions
- **Organize Statistical Evidence**: Link hypotheses to supporting statistical tests and results
- **Document Variable Relationships**: Record how variables correlate, predict, or influence each other
- **Track Model Development**: Document the evolution of statistical models and their performance
- **Support Result Interpretation**: Connect statistical findings to research questions and theoretical frameworks
- **Ensure Methodological Rigor**: Document methodological decisions and analytical approaches
- **Prepare Research Reports**: Organize statistical evidence to support research findings
- **Track Research Progress**: Monitor entity status throughout the research lifecycle
- **Prioritize Research Tasks**: Identify and focus on high-priority research activities
- **Sequence Research Processes**: Plan and visualize the logical order of research and analytical steps

## Configuration

### Usage with Claude Desktop

Add this to your `claude_desktop_config.json`:

#### Install from GitHub and run with npx

```json
{
  "mcpServers": {
    "quantitativeresearch": {
      "command": "npx",
      "args": [
        "-y",
        "github:tejpalvirk/quantitativeresearch"
      ]
    }
  }
}
```

#### Install globally and run directly

First, install the package globally:

```bash
npm install -g github:tejpalvirk/quantitativeresearch
```

Then configure Claude Desktop:

```json
{
  "mcpServers": {
    "quantitativeresearch": {
      "command": "contextmanager-quantitativeresearch"
    }
  }
}
```

#### docker

```json
{
  "mcpServers": {
    "quantitativeresearch": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "mcp/quantitativeresearch"
      ]
    }
  }
}
```

## Building

### From Source

```bash
# Clone the repository
git clone https://github.com/tejpalvirk/contextmanager.git
cd contextmanager

# Install dependencies
npm install

# Build the server
npm run build

# Run the server
cd quantitativeresearch
node quantitativeresearch_index.js
```

### Docker:

```bash
docker build -t mcp/quantitativeresearch -f quantitativeresearch/Dockerfile .
```

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.

## Environment Variables

The Quantitative Research MCP Server supports the following environment variables to customize where data is stored:

- **MEMORY_FILE_PATH**: Path where the knowledge graph data will be stored
  - Can be absolute or relative (relative paths use current working directory)
  - Default: `./quantitativeresearch/memory.json`

- **SESSIONS_FILE_PATH**: Path where session data will be stored
  - Can be absolute or relative (relative paths use current working directory)
  - Default: `./quantitativeresearch/sessions.json`

Example usage:

```bash
# Store data in the current directory
MEMORY_FILE_PATH="./quantitative-memory.json" SESSIONS_FILE_PATH="./quantitative-sessions.json" npx github:tejpalvirk/contextmanager-quantitativeresearch

# Store data in a specific location (absolute path)
MEMORY_FILE_PATH="/path/to/data/quantitative-memory.json" npx github:tejpalvirk/contextmanager-quantitativeresearch

# Store data in user's home directory
MEMORY_FILE_PATH="$HOME/contextmanager/quantitative-memory.json" npx github:tejpalvirk/contextmanager-quantitativeresearch
```