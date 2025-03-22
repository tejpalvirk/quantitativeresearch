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

## Available Tools

The Quantitative Researcher MCP Server provides these tools for interacting with research knowledge:

### start_session
Starts a new quantitative research session, generating a unique session ID and displaying current research projects, datasets, models, visualizations, and previous sessions.

### load_context
Loads detailed context for a specific entity (project, dataset, variable, etc.), displaying relevant information based on entity type.

### end_session
Records the results of a research session through a structured, multi-stage process:
1. **summary**: Records session summary, duration, and project focus
2. **datasetUpdates**: Documents updates to datasets during the session
3. **newAnalyses**: Records new statistical analyses performed
4. **newVisualizations**: Tracks new data visualizations created
5. **hypothesisResults**: Documents results of hypothesis testing
6. **modelUpdates**: Records updates to statistical models
7. **projectStatus**: Updates overall project status and observations
8. **assembly**: Final assembly of all session data

### create
Creates new entities, relations, or observations in the knowledge graph:
- **entities**: Add new research entities (projects, datasets, variables, etc.)
- **relations**: Create relationships between entities
- **observations**: Add observations to existing entities

### delete
Removes entities, relations, or observations from the knowledge graph:
- **entities**: Remove research entities
- **relations**: Remove relationships between entities
- **observations**: Remove specific observations from entities

### get
Retrieves information from the knowledge graph:
- **graph**: Get the entire knowledge graph
- **search**: Search for nodes based on query criteria
- **nodes**: Get specific nodes by name
- **related**: Find related entities

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
I've just finished analyzing data for my Climate Impact Study. I ran three new regression models to test the relationship between temperature and crop yield, created two visualizations of the correlation patterns, and confirmed our hypothesis about rainfall effects. The model performance improved by 15% after controlling for regional variations.
```

### Managing Research Knowledge
```
Create a new variable called "Annual Precipitation" that's part of the "Climate Measures" dataset with observations noting it's normally distributed with a mean of 34.5 inches.
```

```
Add an observation to the "Regression Model 3" that it explains 78% of the variance in crop yield when controlling for soil quality.
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
        "mcp/researcher-quantitative"
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
docker build -t mcp/researcher-quantitative -f quantitativeresearch/Dockerfile .
```

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.