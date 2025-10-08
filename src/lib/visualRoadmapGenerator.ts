// Visual Roadmap Generator - Creates interactive, visual learning paths
// Transforms text-based roadmaps into engaging visual experiences

export interface RoadmapNode {
  id: string;
  title: string;
  description: string;
  type: "prerequisite" | "core" | "advanced" | "project" | "milestone";
  status: "not-started" | "in-progress" | "completed" | "locked";
  dependencies: string[];
  estimatedTime: string;
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  resources: {
    type: "article" | "video" | "course" | "book" | "practice";
    title: string;
    url?: string;
    description: string;
  }[];
  skills: string[];
  position: { x: number; y: number };
}

export interface VisualRoadmap {
  id: string;
  title: string;
  description: string;
  topic: string;
  totalNodes: number;
  estimatedDuration: string;
  difficulty: string;
  nodes: RoadmapNode[];
  connections: {
    from: string;
    to: string;
    type: "prerequisite" | "recommended" | "optional";
  }[];
  metadata: {
    created: string;
    lastUpdated: string;
    completionRate: number;
    tags: string[];
  };
}

export class VisualRoadmapGenerator {
  /**
   * Convert text-based content into visual roadmap
   */
  static async generateVisualRoadmap(
    topic: string,
    content: string
  ): Promise<VisualRoadmap> {
    console.log(
      `🗺️ [VisualRoadmapGenerator] Creating visual roadmap for: ${topic}`
    );

    // Parse content structure
    const parsedContent = this.parseContentStructure(content);

    // Generate roadmap nodes
    const nodes = this.generateRoadmapNodes(parsedContent, topic);

    // Create connections between nodes
    const connections = this.generateConnections(nodes);

    // Calculate positions for visual layout
    this.calculateNodePositions(nodes, connections);

    return {
      id: `roadmap-${Date.now()}`,
      title: `Learning Roadmap: ${topic}`,
      description: `Interactive visual roadmap for mastering ${topic}`,
      topic,
      totalNodes: nodes.length,
      estimatedDuration: this.calculateTotalDuration(nodes),
      difficulty: this.calculateOverallDifficulty(nodes),
      nodes,
      connections,
      metadata: {
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        completionRate: 0,
        tags: this.extractTags(topic, content),
      },
    };
  }

  /**
   * Parse content structure to identify learning components
   */
  private static parseContentStructure(content: string): any {
    const structure = {
      sections: [],
      prerequisites: [],
      coreTopics: [],
      advancedTopics: [],
      projects: [],
      resources: [],
    };

    // Extract sections (## headings)
    const sectionMatches = content.match(/## ([^#\n]+)/g);
    if (sectionMatches) {
      structure.sections = sectionMatches.map((match) =>
        match.replace("## ", "").trim()
      );
    }

    // Extract bullet points and sub-items
    const bulletMatches = content.match(/\* \*\*([^:*]+):\*\*([^*\n]+)/g);
    if (bulletMatches) {
      bulletMatches.forEach((match) => {
        const [, title, description] =
          match.match(/\* \*\*([^:*]+):\*\*([^*\n]+)/) || [];
        if (title && description) {
          // Categorize based on keywords
          if (this.isPrerequisite(title, description)) {
            structure.prerequisites.push({
              title: title.trim(),
              description: description.trim(),
            });
          } else if (this.isAdvanced(title, description)) {
            structure.advancedTopics.push({
              title: title.trim(),
              description: description.trim(),
            });
          } else if (this.isProject(title, description)) {
            structure.projects.push({
              title: title.trim(),
              description: description.trim(),
            });
          } else {
            structure.coreTopics.push({
              title: title.trim(),
              description: description.trim(),
            });
          }
        }
      });
    }

    // Extract resources
    const resourceMatches = content.match(/\*\*Sources:\*\*([^#\n]+)/);
    if (resourceMatches) {
      structure.resources = resourceMatches[1]
        .split(",")
        .map((r) => r.trim())
        .filter((r) => r.length > 0);
    }

    return structure;
  }

  /**
   * Generate roadmap nodes from parsed content
   */
  private static generateRoadmapNodes(
    structure: any,
    topic: string
  ): RoadmapNode[] {
    const nodes: RoadmapNode[] = [];
    let nodeId = 0;

    // Add start node
    nodes.push({
      id: `start-${nodeId++}`,
      title: `Begin ${topic} Journey`,
      description: "Start your learning adventure!",
      type: "milestone",
      status: "not-started",
      dependencies: [],
      estimatedTime: "1 hour",
      difficulty: "beginner",
      resources: [],
      skills: ["motivation", "goal-setting"],
      position: { x: 0, y: 0 },
    });

    // Add prerequisite nodes
    structure.prerequisites.forEach((item: any) => {
      nodes.push({
        id: `prereq-${nodeId++}`,
        title: item.title,
        description: item.description,
        type: "prerequisite",
        status: "locked",
        dependencies: [`start-0`],
        estimatedTime: this.estimateTime(item.description),
        difficulty: "beginner",
        resources: this.generateResources(item.title, "prerequisite"),
        skills: this.extractSkills(item.description),
        position: { x: 0, y: 0 },
      });
    });

    // Add core topic nodes
    structure.coreTopics.forEach((item: any, index: number) => {
      nodes.push({
        id: `core-${nodeId++}`,
        title: item.title,
        description: item.description,
        type: "core",
        status: "locked",
        dependencies: this.getCoreDependencies(nodes, index),
        estimatedTime: this.estimateTime(item.description),
        difficulty: "intermediate",
        resources: this.generateResources(item.title, "core"),
        skills: this.extractSkills(item.description),
        position: { x: 0, y: 0 },
      });
    });

    // Add project nodes
    structure.projects.forEach((item: any) => {
      nodes.push({
        id: `project-${nodeId++}`,
        title: item.title,
        description: item.description,
        type: "project",
        status: "locked",
        dependencies: this.getProjectDependencies(nodes),
        estimatedTime: this.estimateTime(item.description, "project"),
        difficulty: "intermediate",
        resources: this.generateResources(item.title, "project"),
        skills: this.extractSkills(item.description),
        position: { x: 0, y: 0 },
      });
    });

    // Add advanced topic nodes
    structure.advancedTopics.forEach((item: any) => {
      nodes.push({
        id: `advanced-${nodeId++}`,
        title: item.title,
        description: item.description,
        type: "advanced",
        status: "locked",
        dependencies: this.getAdvancedDependencies(nodes),
        estimatedTime: this.estimateTime(item.description),
        difficulty: "advanced",
        resources: this.generateResources(item.title, "advanced"),
        skills: this.extractSkills(item.description),
        position: { x: 0, y: 0 },
      });
    });

    // Add completion milestone
    nodes.push({
      id: `complete-${nodeId++}`,
      title: `Master ${topic}`,
      description: "Congratulations! You've completed the learning journey!",
      type: "milestone",
      status: "locked",
      dependencies: nodes
        .filter((n) => n.type !== "milestone")
        .map((n) => n.id),
      estimatedTime: "1 hour",
      difficulty: "expert",
      resources: [
        {
          type: "article",
          title: "Next Steps in Your Learning Journey",
          description: "Explore advanced applications and continue growing",
        },
      ],
      skills: ["mastery", "expertise"],
      position: { x: 0, y: 0 },
    });

    return nodes;
  }

  /**
   * Generate connections between nodes
   */
  private static generateConnections(nodes: RoadmapNode[]): any[] {
    const connections: any[] = [];

    nodes.forEach((node) => {
      node.dependencies.forEach((depId) => {
        connections.push({
          from: depId,
          to: node.id,
          type: "prerequisite",
        });
      });
    });

    // Add recommended connections (same level)
    const coreNodes = nodes.filter((n) => n.type === "core");
    for (let i = 0; i < coreNodes.length - 1; i++) {
      connections.push({
        from: coreNodes[i].id,
        to: coreNodes[i + 1].id,
        type: "recommended",
      });
    }

    return connections;
  }

  /**
   * Advanced DAG layout with layering & crossing minimization
   */
  private static calculateNodePositions(
    nodes: RoadmapNode[],
    connections: any[]
  ): void {
    const cfg = { hGap: 320, vGap: 190 };
    const incoming: Record<string, string[]> = {};
    const outgoing: Record<string, string[]> = {};
    connections.forEach((c) => {
      if (!incoming[c.to]) incoming[c.to] = [];
      incoming[c.to].push(c.from);
      if (!outgoing[c.from]) outgoing[c.from] = [];
      outgoing[c.from].push(c.to);
    });
    const depthMemo: Record<string, number> = {};
    const depthOf = (id: string): number => {
      if (depthMemo[id] !== undefined) return depthMemo[id];
      const deps = incoming[id] || [];
      if (!deps.length) return (depthMemo[id] = 0);
      return (depthMemo[id] = Math.max(...deps.map((d) => depthOf(d))) + 1);
    };
    nodes.forEach((n) => depthOf(n.id));
    const maxDepth = Math.max(...Object.values(depthMemo), 0);
    const layers: RoadmapNode[][] = Array.from(
      { length: maxDepth + 1 },
      () => []
    );
    nodes.forEach((n) => layers[depthMemo[n.id]].push(n));
    const typeOrder: Record<string, number> = {
      prerequisite: 0,
      core: 1,
      project: 2,
      advanced: 3,
      milestone: 4,
    };
    layers.forEach((layer) =>
      layer.sort(
        (a, b) =>
          (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9) ||
          a.id.localeCompare(b.id)
      )
    );
    for (let iter = 0; iter < 3; iter++) {
      for (let i = 1; i < layers.length; i++) {
        const prev = layers[i - 1];
        const order: Record<string, number> = {};
        prev.forEach((n, idx) => (order[n.id] = idx));
        layers[i].forEach((n) => {
          const deps = (incoming[n.id] || []).map((d) => order[d]);
          (n as any)._m = deps.length
            ? deps.sort((a, b) => a - b)[Math.floor(deps.length / 2)]
            : 1e9;
        });
        layers[i].sort((a, b) => (a as any)._m - (b as any)._m);
      }
      for (let i = layers.length - 2; i >= 0; i--) {
        const next = layers[i + 1];
        const order: Record<string, number> = {};
        next.forEach((n, idx) => (order[n.id] = idx));
        layers[i].forEach((n) => {
          const outs = (outgoing[n.id] || []).map((o) => order[o]);
          (n as any)._m = outs.length
            ? outs.sort((a, b) => a - b)[Math.floor(outs.length / 2)]
            : 1e9;
        });
        layers[i].sort((a, b) => (a as any)._m - (b as any)._m);
      }
    }
    layers.forEach((layer, depth) => {
      const totalWidth = (layer.length - 1) * cfg.hGap;
      layer.forEach((node, idx) => {
        node.position = {
          x: idx * cfg.hGap - totalWidth / 2,
          y: depth * cfg.vGap,
        };
        delete (node as any)._m;
      });
    });
  }

  /**
   * Layout nodes in a flowing grid pattern
   */
  private static layoutNodesInFlow(
    nodes: RoadmapNode[],
    startX: number,
    startY: number,
    config: any
  ): void {
    nodes.forEach((node, index) => {
      const row = Math.floor(index / config.maxNodesPerRow);
      const col = index % config.maxNodesPerRow;
      const rowWidth = Math.min(
        nodes.length - row * config.maxNodesPerRow,
        config.maxNodesPerRow
      );

      // Center each row
      const rowStartX =
        startX - ((rowWidth - 1) * config.horizontalSpacing) / 2;

      node.position = {
        x: rowStartX + col * config.horizontalSpacing,
        y: startY + row * (config.nodeHeight + config.verticalSpacing),
      };
    });
  }

  /**
   * Layout nodes in alternating left-right pattern for projects
   */
  private static layoutNodesInAlternatingPattern(
    nodes: RoadmapNode[],
    startY: number,
    config: any
  ): void {
    nodes.forEach((node, index) => {
      const isEven = index % 2 === 0;
      const row = Math.floor(index / 2);

      node.position = {
        x: isEven ? -config.horizontalSpacing : config.horizontalSpacing,
        y: startY + row * (config.nodeHeight + config.verticalSpacing),
      };
    });
  }

  /**
   * Calculate node depth (how many dependencies deep)
   */
  private static calculateNodeDepth(
    node: RoadmapNode,
    allNodes: RoadmapNode[],
    connections: any[]
  ): number {
    if (node.dependencies.length === 0) return 0;

    const depthValues = node.dependencies.map((depId) => {
      const depNode = allNodes.find((n) => n.id === depId);
      return depNode
        ? this.calculateNodeDepth(depNode, allNodes, connections) + 1
        : 0;
    });

    return Math.max(...depthValues, 0);
  }

  // Helper methods
  private static isPrerequisite(title: string, description: string): boolean {
    const prereqKeywords = [
      "prerequisite",
      "foundation",
      "basic",
      "fundamental",
      "start",
      "begin",
    ];
    const text = (title + " " + description).toLowerCase();
    return prereqKeywords.some((keyword) => text.includes(keyword));
  }

  private static isAdvanced(title: string, description: string): boolean {
    const advancedKeywords = [
      "advanced",
      "deep",
      "complex",
      "expert",
      "sophisticated",
    ];
    const text = (title + " " + description).toLowerCase();
    return advancedKeywords.some((keyword) => text.includes(keyword));
  }

  private static isProject(title: string, description: string): boolean {
    const projectKeywords = [
      "project",
      "build",
      "create",
      "implement",
      "practice",
      "example",
    ];
    const text = (title + " " + description).toLowerCase();
    return projectKeywords.some((keyword) => text.includes(keyword));
  }

  private static estimateTime(
    description: string,
    type: string = "topic"
  ): string {
    const wordCount = description.split(" ").length;
    const baseTime = type === "project" ? 4 : 2; // hours
    const multiplier = Math.ceil(wordCount / 20);
    return `${baseTime * multiplier} hours`;
  }

  private static extractSkills(description: string): string[] {
    // Extract technical terms and concepts
    const skillPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
    const matches = description.match(skillPattern) || [];
    return [...new Set(matches.slice(0, 3))]; // Limit to 3 unique skills
  }

  private static generateResources(title: string, type: string): any[] {
    const resources = [
      {
        type: "article",
        title: `Learn ${title}: Complete Guide`,
        description: `Comprehensive article covering ${title} fundamentals`,
      },
      {
        type: "video",
        title: `${title} Tutorial`,
        description: `Video walkthrough of ${title} concepts`,
      },
    ];

    if (type === "project") {
      resources.push({
        type: "practice",
        title: `${title} Hands-on Practice`,
        description: `Interactive exercises for ${title}`,
      });
    }

    return resources;
  }

  private static getCoreDependencies(
    nodes: RoadmapNode[],
    index: number
  ): string[] {
    const prereqNodes = nodes.filter((n) => n.type === "prerequisite");
    const previousCore = nodes.filter((n) => n.type === "core").slice(0, index);

    if (index === 0) {
      return prereqNodes.length > 0
        ? [prereqNodes[prereqNodes.length - 1].id]
        : ["start-0"];
    } else {
      return previousCore.length > 0
        ? [previousCore[previousCore.length - 1].id]
        : [];
    }
  }

  private static getProjectDependencies(nodes: RoadmapNode[]): string[] {
    const coreNodes = nodes.filter((n) => n.type === "core");
    return coreNodes.length > 0
      ? [coreNodes[Math.floor(coreNodes.length / 2)].id]
      : [];
  }

  private static getAdvancedDependencies(nodes: RoadmapNode[]): string[] {
    const coreNodes = nodes.filter((n) => n.type === "core");
    const projectNodes = nodes.filter((n) => n.type === "project");

    const dependencies = [];
    if (coreNodes.length > 0)
      dependencies.push(coreNodes[coreNodes.length - 1].id);
    if (projectNodes.length > 0) dependencies.push(projectNodes[0].id);

    return dependencies;
  }

  private static calculateTotalDuration(nodes: RoadmapNode[]): string {
    const totalHours = nodes.reduce((sum, node) => {
      const hours = parseInt(node.estimatedTime.match(/\d+/)?.[0] || "1");
      return sum + hours;
    }, 0);

    return totalHours > 40
      ? `${Math.ceil(totalHours / 40)} weeks`
      : `${totalHours} hours`;
  }

  private static calculateOverallDifficulty(nodes: RoadmapNode[]): string {
    const difficulties = nodes.map((n) => n.difficulty);
    if (difficulties.includes("expert")) return "expert";
    if (difficulties.includes("advanced")) return "advanced";
    if (difficulties.includes("intermediate")) return "intermediate";
    return "beginner";
  }

  private static extractTags(topic: string, content: string): string[] {
    const topicWords = topic.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().match(/\b[a-z]+\b/g);

    if (!contentWords) {
      return [...topicWords, "roadmap", "learning-path"];
    }

    // Get most frequent content words
    const wordCount: { [key: string]: number } = {};
    contentWords.forEach((word) => {
      if (word.length > 3) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });

    const frequentWords = Object.keys(wordCount)
      .sort((a, b) => wordCount[b] - wordCount[a])
      .slice(0, 5);

    return [...topicWords, ...frequentWords, "roadmap", "learning-path"];
  }

  /**
   * Generate interactive HTML for the roadmap
   */
  static generateInteractiveHTML(roadmap: VisualRoadmap): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${roadmap.title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Inter', 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            color: #2d3748;
        }
        
        .roadmap-container {
            background: white;
            border-radius: 24px;
            padding: 40px;
            max-width: 1600px;
            margin: 0 auto;
            box-shadow: 0 25px 50px rgba(0,0,0,0.15);
            backdrop-filter: blur(10px);
        }
        
        .roadmap-header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 30px;
            border-bottom: 2px solid #f7fafc;
        }
        
        .roadmap-header h1 {
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-size: 3rem;
            font-weight: 800;
            margin-bottom: 15px;
            letter-spacing: -0.02em;
        }
        
        .roadmap-header p {
            font-size: 1.1rem;
            color: #718096;
            max-width: 600px;
            margin: 0 auto;
            line-height: 1.6;
        }
        
        .roadmap-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 20px;
            margin: 30px 0;
            max-width: 800px;
            margin-left: auto;
            margin-right: auto;
        }
        
        .stat {
            background: linear-gradient(135deg, #f8faff 0%, #f1f5f9 100%);
            padding: 25px;
            border-radius: 16px;
            text-align: center;
            border: 1px solid #e2e8f0;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .stat:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        
        .stat-value {
            font-size: 2.2rem;
            font-weight: 700;
            color: #667eea;
            display: block;
            margin-bottom: 5px;
        }
        
        .stat-label {
            font-size: 0.9rem;
            color: #64748b;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        .roadmap-canvas {
            position: relative;
            min-height: 1000px;
            background: linear-gradient(145deg, #f8fafc 0%, #f1f5f9 100%);
            border-radius: 20px;
            overflow: hidden;
            padding: 60px 40px;
            border: 1px solid #e2e8f0;
        }
        
        .roadmap-node {
            position: absolute;
            width: 280px;
            min-height: 140px;
            background: white;
            border-radius: 20px;
            padding: 24px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.08);
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border: 2px solid transparent;
            backdrop-filter: blur(10px);
        }
        
        .roadmap-node:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        }
        
        .roadmap-node::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            border-radius: 20px 20px 0 0;
            background: var(--node-color);
        }
        
        .node-prerequisite { 
            --node-color: linear-gradient(135deg, #fc8181, #e53e3e);
            border-color: #fed7d7;
        }
        .node-core { 
            --node-color: linear-gradient(135deg, #63b3ed, #3182ce);
            border-color: #bee3f8;
        }
        .node-advanced { 
            --node-color: linear-gradient(135deg, #b794f6, #805ad5);
            border-color: #e9d8fd;
        }
        .node-project { 
            --node-color: linear-gradient(135deg, #68d391, #38a169);
            border-color: #c6f6d5;
        }
        .node-milestone { 
            --node-color: linear-gradient(135deg, #f6e05e, #d69e2e);
            border-color: #faf089;
        }
        
        .node-title {
            font-size: 1.2rem;
            font-weight: 700;
            margin-bottom: 12px;
            color: #2d3748;
            line-height: 1.3;
        }
        
        .node-description {
            font-size: 0.95rem;
            color: #4a5568;
            margin-bottom: 16px;
            line-height: 1.5;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        
        .node-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.85rem;
            color: #718096;
            margin-top: auto;
        }
        
        .node-time {
            background: #edf2f7;
            padding: 4px 10px;
            border-radius: 12px;
            font-weight: 500;
        }
        
        .node-difficulty {
            background: #f7fafc;
            padding: 4px 10px;
            border-radius: 12px;
            font-weight: 500;
            text-transform: capitalize;
        }
        
        .connection-line {
            position: absolute;
            z-index: 1;
            border-radius: 2px;
        }
        
        .connection-prerequisite { 
            background: linear-gradient(90deg, #667eea, #764ba2);
            height: 3px;
            box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
        }
        .connection-recommended { 
            background: linear-gradient(90deg, #48bb78, #38a169);
            height: 2px;
            opacity: 0.7;
            box-shadow: 0 1px 3px rgba(72, 187, 120, 0.3);
        }
        
        .legend {
            position: fixed;
            top: 30px;
            right: 30px;
            background: white;
            padding: 24px;
            border-radius: 16px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            min-width: 220px;
            backdrop-filter: blur(10px);
            border: 1px solid #e2e8f0;
        }
        
        .legend h3 {
            font-size: 1.1rem;
            font-weight: 700;
            margin-bottom: 16px;
            color: #2d3748;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            margin: 12px 0;
            font-size: 0.9rem;
            color: #4a5568;
        }
        
        .legend-color {
            width: 24px;
            height: 24px;
            border-radius: 8px;
            margin-right: 12px;
            background: var(--legend-color);
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .progress-bar {
            background: #e2e8f0;
            height: 10px;
            border-radius: 6px;
            margin: 25px 0;
            overflow: hidden;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.06);
        }
        
        .progress-fill {
            background: linear-gradient(90deg, #48bb78, #38a169);
            height: 100%;
            width: ${roadmap.metadata.completionRate}%;
            transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
            border-radius: 6px;
            box-shadow: 0 2px 4px rgba(72, 187, 120, 0.3);
        }
        
        @media (max-width: 768px) {
            .roadmap-container { padding: 20px; }
            .roadmap-header h1 { font-size: 2rem; }
            .roadmap-stats { grid-template-columns: repeat(2, 1fr); }
            .roadmap-node { width: 240px; }
            .legend { position: relative; top: auto; right: auto; margin: 20px 0; }
        }
    </style>
</head>
<body>
    <div class="roadmap-container">
        <div class="roadmap-header">
            <h1>${roadmap.title}</h1>
            <p>${roadmap.description}</p>
            
            <div class="roadmap-stats">
                <div class="stat">
                    <div class="stat-value">${roadmap.totalNodes}</div>
                    <div class="stat-label">Learning Nodes</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${roadmap.estimatedDuration}</div>
                    <div class="stat-label">Total Duration</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${roadmap.difficulty}</div>
                    <div class="stat-label">Difficulty Level</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${Math.round(
                      roadmap.metadata.completionRate
                    )}%</div>
                    <div class="stat-label">Progress</div>
                </div>
            </div>
            
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
        </div>
        
        <div class="roadmap-canvas" id="roadmapCanvas">
            ${this.generateNodesHTML(roadmap.nodes)}
            ${this.generateConnectionsHTML(roadmap.connections, roadmap.nodes)}
        </div>
    </div>
    
    <div class="legend">
        <h3>Learning Path Legend</h3>
        <div class="legend-item">
            <div class="legend-color" style="--legend-color: linear-gradient(135deg, #fc8181, #e53e3e);"></div>
            <span>Prerequisites</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="--legend-color: linear-gradient(135deg, #63b3ed, #3182ce);"></div>
            <span>Core Topics</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="--legend-color: linear-gradient(135deg, #68d391, #38a169);"></div>
            <span>Projects</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="--legend-color: linear-gradient(135deg, #b794f6, #805ad5);"></div>
            <span>Advanced</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="--legend-color: linear-gradient(135deg, #f6e05e, #d69e2e);"></div>
            <span>Milestones</span>
        </div>
    </div>
    
    <script>
        // Interactive functionality
        document.querySelectorAll('.roadmap-node').forEach(node => {
            node.addEventListener('click', function() {
                const nodeId = this.dataset.nodeId;
                const nodeData = ${JSON.stringify(
                  roadmap.nodes
                )}.find(n => n.id === nodeId);
                showNodeDetails(nodeData);
            });
        });
        
        function showNodeDetails(node) {
            alert(\`
📚 \${node.title}
            
🎯 \${node.description}

⏱️ Estimated Time: \${node.estimatedTime}
📊 Difficulty: \${node.difficulty}
🏆 Skills: \${node.skills.join(', ')}
🔗 Resources: \${node.resources.length} available

Type: \${node.type}
Status: \${node.status}
            \`);
        }
        
        // Auto-center the roadmap
        const canvas = document.getElementById('roadmapCanvas');
        const nodes = canvas.querySelectorAll('.roadmap-node');
        if (nodes.length > 0) {
            // Find bounds and center
            let minX = Infinity, maxX = -Infinity;
            nodes.forEach(node => {
                const x = parseInt(node.style.left);
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x + 250); // 250px is node width
            });
            
            const totalWidth = maxX - minX;
            const canvasWidth = canvas.clientWidth - 100; // Account for padding
            const offsetX = Math.max(0, (canvasWidth - totalWidth) / 2);
            
            nodes.forEach(node => {
                const currentX = parseInt(node.style.left);
                node.style.left = (currentX - minX + offsetX + 50) + 'px';
            });
        }
    </script>
</body>
</html>`;
  }

  private static generateNodesHTML(nodes: RoadmapNode[]): string {
    return nodes
      .map(
        (node) => `
      <div class="roadmap-node node-${node.type}" 
           data-node-id="${node.id}"
           style="left: ${node.position.x + 800}px; top: ${
          node.position.y + 100
        }px;">
        <div class="node-title">${node.title}</div>
        <div class="node-description">${node.description}</div>
        <div class="node-meta">
          <span class="node-time">${node.estimatedTime}</span>
          <span class="node-difficulty">${node.difficulty}</span>
        </div>
      </div>
    `
      )
      .join("");
  }

  private static generateConnectionsHTML(
    connections: any[],
    nodes: RoadmapNode[]
  ): string {
    const svgEdges: string[] = [];
    const pruned = this.pruneConnections(connections, nodes);
    pruned.forEach((conn) => {
      const from = nodes.find((n) => n.id === conn.from);
      const to = nodes.find((n) => n.id === conn.to);
      if (!from || !to) return;
      const x1 = from.position.x + 1200;
      const y1 = from.position.y + 180;
      const x2 = to.position.x + 1200;
      const y2 = to.position.y + 180;
      const gap = Math.abs(y2 - y1);
      const curvature = Math.min(300, gap + 140);
      const midX = (x1 + x2) / 2;
      const controlY = y1 - curvature / 2;
      const hashShift = ((from.id.length * 37 + to.id.length * 19) % 80) - 40;
      svgEdges.push(
        `<path data-from="${from.id}" data-to="${to.id}" d="M ${x1} ${y1} Q ${
          midX + hashShift
        } ${controlY} ${x2} ${y2}" class="edge ${conn.type}" />`
      );
    });
    return `<svg class="roadmap-edges" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="edgePrereq" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#667eea" /><stop offset="100%" stop-color="#764ba2" /></linearGradient>
        <linearGradient id="edgeRecommended" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#48bb78" /><stop offset="100%" stop-color="#38a169" /></linearGradient>
      </defs>
      ${svgEdges.join("\n")}
    </svg>`;
  }

  // Reduce visual clutter by removing duplicate or long-cross edges
  private static pruneConnections(
    connections: any[],
    nodes: RoadmapNode[]
  ): any[] {
    const byFrom: Record<string, string[]> = {};
    connections.forEach((c) => {
      if (!byFrom[c.from]) byFrom[c.from] = [];
      byFrom[c.from].push(c.to);
    });
    const cache: Record<string, Set<string>> = {};
    const reach = (start: string): Set<string> => {
      if (cache[start]) return cache[start];
      const vis = new Set<string>();
      const stack = [...(byFrom[start] || [])];
      while (stack.length) {
        const n = stack.pop()!;
        if (vis.has(n)) continue;
        vis.add(n);
        (byFrom[n] || []).forEach((ch) => stack.push(ch));
      }
      return (cache[start] = vis);
    };
    const kept: any[] = [];
    const seen = new Set<string>();
    connections.forEach((c) => {
      const key = c.from + "->" + c.to;
      if (seen.has(key)) return;
      seen.add(key);
      // Transitive reduction: if there exists intermediate mid != to with path mid->to and from->mid, drop
      const outs = byFrom[c.from] || [];
      const redundant = outs.some(
        (mid) => mid !== c.to && reach(mid).has(c.to)
      );
      if (!redundant) kept.push(c);
    });
    return kept.slice(0, 160);
  }

  /**
   * Produce a simplified hierarchical structure suitable for roadmap.sh style UI
   */
  static buildHierarchicalModel(roadmap: VisualRoadmap) {
    const groups: Record<string, any> = {
      prerequisites: { title: "Prerequisites", items: [] as any[] },
      core: { title: "Core Concepts", items: [] as any[] },
      projects: { title: "Projects", items: [] as any[] },
      advanced: { title: "Advanced Topics", items: [] as any[] },
      milestone: { title: "Milestone", items: [] as any[] },
    };
    roadmap.nodes.forEach((n) => {
      switch (n.type) {
        case "prerequisite":
          groups.prerequisites.items.push(n);
          break;
        case "core":
          groups.core.items.push(n);
          break;
        case "project":
          groups.projects.items.push(n);
          break;
        case "advanced":
          groups.advanced.items.push(n);
          break;
        case "milestone":
          groups.milestone.items.push(n);
          break;
      }
    });
    return { id: roadmap.id, topic: roadmap.topic, groups };
  }
}
